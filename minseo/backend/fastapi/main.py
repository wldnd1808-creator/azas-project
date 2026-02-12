import os
import re
import threading
from typing import Any, Dict, List, Optional

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI
from pydantic import BaseModel
from sklearn.experimental import enable_iterative_imputer  # noqa: F401
from sklearn.ensemble import IsolationForest
from sklearn.impute import IterativeImputer, SimpleImputer

app = FastAPI()

MODEL_PATH = os.getenv(
    "MODEL_PATH",
    "/home/ubuntu/kimminseo/backend/fastapi/model/model.joblib",
)
MODEL_DIR = os.getenv("MODEL_DIR", "/app/model")
_model = None
_model_mtime = None
_model_path = MODEL_PATH
_model_lock = threading.Lock()


class PredictRequest(BaseModel):
    data: Optional[Dict[str, Any]] = None
    features: Optional[List[float]] = None
    items: Optional[List[Dict[str, Any]]] = None
    model_id: Optional[str] = None


class PreprocessRequest(BaseModel):
    items: List[Dict[str, Any]]
    model_id: Optional[str] = None


def _resolve_model_path(model_id: Optional[str]) -> str:
    if not model_id:
        return MODEL_PATH
    if not re.fullmatch(r"[A-Za-z0-9._-]+", model_id):
        raise ValueError("invalid_model_id")
    return os.path.join(MODEL_DIR, f"{model_id}.joblib")


def load_model(path: Optional[str] = None, force: bool = False) -> Optional[dict]:
    global _model, _model_mtime, _model_path
    target_path = path or MODEL_PATH
    if not os.path.exists(target_path):
        return None
    mtime = os.path.getmtime(target_path)
    with _model_lock:
        if force or _model is None or _model_path != target_path or _model_mtime != mtime:
            try:
                loaded_model = joblib.load(target_path)
            except Exception as exc:
                print(f"Failed to load model from {target_path}: {exc}")
                return _model
            _model = loaded_model
            _model_mtime = mtime
            _model_path = target_path
    return _model


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict")
def predict(payload: PredictRequest):
    try:
        model_path = _resolve_model_path(payload.model_id)
    except ValueError as exc:
        return {"error": str(exc)}

    model_bundle = load_model(model_path)
    if model_bundle is None:
        return {"error": "model_not_loaded"}

    base_features = model_bundle.get("base_features")
    targets_reg = model_bundle.get("targets_reg", [])
    poly = model_bundle.get("poly")
    poly_cols = model_bundle.get("poly_cols", [])
    extra_poly_cols = model_bundle.get("extra_poly_cols", [])
    iso = model_bundle.get("iso")
    scaler = model_bundle.get("scaler")
    model = model_bundle.get("model")
    best_threshold = model_bundle.get("threshold", 0.5)
    x_columns = model_bundle.get("x_columns", [])
    imputer = model_bundle.get("imputer")

    if not all([base_features, poly, iso, scaler, model, x_columns, imputer]):
        return {"error": "model_bundle_missing_keys"}
    if not extra_poly_cols or len(extra_poly_cols) < 4:
        return {"error": "model_bundle_missing_keys", "missing": ["extra_poly_cols"]}

    try:
        required_inputs = list(base_features)
        if payload.items:
            items = payload.items
        elif payload.data:
            items = [payload.data]
        elif payload.features:
            if len(payload.features) != len(required_inputs) + len(targets_reg):
                return {
                    "error": "feature_length_mismatch",
                    "expected": len(required_inputs) + len(targets_reg),
                    "actual": len(payload.features),
                }
            values = payload.features
            items = [
                {**dict(zip(required_inputs, values[: len(required_inputs)])),
                 **dict(zip(targets_reg, values[len(required_inputs) :]))}
            ]
        else:
            return {"error": "no_input_data"}

        df = pd.DataFrame(items)
        missing_base = [c for c in required_inputs if c not in df.columns]
        if missing_base:
            return {"error": "missing_features", "missing": missing_base}
        for col in targets_reg:
            if col not in df.columns:
                df[col] = np.nan

        input_matrix = df[required_inputs + targets_reg].to_numpy(dtype=float)
        try:
            imputed = imputer.transform(input_matrix)
        except Exception:
            imputed = np.nan_to_num(input_matrix, nan=0.0)

        base_array = imputed[:, : len(base_features)]
        target_array = imputed[:, len(base_features) :]
        imputed_targets = [
            dict(zip(targets_reg, target_array[row_idx])) for row_idx in range(len(items))
        ]

        anomaly_depth = iso.decision_function(base_array).astype(float)

        X_poly = poly.transform(base_array)
        runtime_poly_cols = list(poly.get_feature_names_out(base_features))
        df_poly = pd.DataFrame(X_poly, columns=runtime_poly_cols)
        df_poly[extra_poly_cols[0]] = base_array[:, base_features.index("lithium_input")] ** 2
        df_poly[extra_poly_cols[1]] = base_array[:, base_features.index("lithium_input")] ** 3
        df_poly[extra_poly_cols[2]] = (
            base_array[:, base_features.index("lithium_input")] * base_array[:, base_features.index("sintering_temp")]
        )
        df_poly[extra_poly_cols[3]] = (
            base_array[:, base_features.index("lithium_input")] * base_array[:, base_features.index("tank_pressure")]
        )

        feature_frame = pd.concat(
            [
                df_poly.reset_index(drop=True),
                pd.DataFrame(target_array, columns=targets_reg),
                pd.DataFrame({"anomaly_depth": anomaly_depth}),
            ],
            axis=1,
        )

        if list(feature_frame.columns) != list(x_columns):
            feature_frame = feature_frame.reindex(columns=x_columns)
        X_scaled = scaler.transform(feature_frame)

        probs = model.predict_proba(X_scaled)[:, 1].astype(float)
        preds = (probs >= best_threshold).astype(int)

        def _get_value(src: Dict[str, Any], key: str, fallback: float) -> float:
            value = src.get(key)
            if value is None:
                return float(fallback)
            if isinstance(value, float) and np.isnan(value):
                return float(fallback)
            return float(value)

        results = []
        for idx, src in enumerate(items):
            results.append(
                {
                    "prediction": int(preds[idx]),
                    "probability": float(probs[idx]),
                    "predict_availability": float(probs[idx]),
                    "lot_id": src.get("lot_id"),
                    "timestamp": src.get("timestamp"),
                    "operator_id": src.get("operator_id"),
                    "lithium_input": src.get("lithium_input"),
                    "additive_ratio": src.get("additive_ratio"),
                    "process_time": src.get("process_time"),
                    "humidity": src.get("humidity"),
                    "tank_pressure": src.get("tank_pressure"),
                    "sintering_temp": src.get("sintering_temp"),
                    "metal_impurity": _get_value(
                        src, "metal_impurity", imputed_targets[idx]["metal_impurity"]
                    ),
                    "d50": _get_value(src, "d50", imputed_targets[idx]["d50"]),
                }
            )

        if payload.items:
            return {"items": results}
        return results[0]
    except KeyError as exc:
        return {"error": "missing_key", "message": str(exc)}
    except ValueError as exc:
        return {"error": "value_error", "message": str(exc)}
    except ZeroDivisionError:
        return {"error": "zero_division", "message": "division by zero in features"}
    except TypeError as exc:
        return {"error": "type_error", "message": str(exc)}
    except Exception as exc:
        return {"error": "predict_failed", "message": str(exc)}


@app.post("/preprocess")
def preprocess(payload: PreprocessRequest):
    base_features = [
        "lithium_input",
        "additive_ratio",
        "process_time",
        "humidity",
        "tank_pressure",
        "sintering_temp",
    ]
    targets_reg = ["metal_impurity", "d50"]
    target_cls = "quality_defect"

    if not payload.items:
        return {"error": "no_items"}

    model_bundle = None
    try:
        model_path = _resolve_model_path(payload.model_id)
    except ValueError as exc:
        return {"error": str(exc)}
    model_bundle = load_model(model_path)

    present_targets = [c for c in targets_reg if any(c in row for row in payload.items)]
    mice_cols = base_features + present_targets

    df = pd.DataFrame(payload.items)
    if target_cls not in df.columns:
        df[target_cls] = 0

    for col in base_features:
        if col not in df.columns:
            df[col] = np.nan

    for col in base_features:
        if df[col].isna().all():
            continue
        Q1, Q3 = df[col].quantile(0.25), df[col].quantile(0.75)
        IQR = Q3 - Q1
        ext_mask = (df[target_cls] == 0) & (
            (df[col] < Q1 - 3 * IQR) | (df[col] > Q3 + 3 * IQR)
        )
        df.loc[ext_mask, col] = np.nan
        df[col] = df[col].ffill()
        mild_mask = (df[target_cls] == 0) & (
            (df[col] < Q1 - 1.98 * IQR) | (df[col] > Q3 + 1.98 * IQR)
        )
        df.loc[mild_mask, col] = np.nan

    data_matrix = []
    for _, row in df.iterrows():
        values = []
        for col in mice_cols:
            value = row.get(col, None)
            values.append(float(value) if value is not None else np.nan)
        data_matrix.append(values)

    matrix = np.array(data_matrix, dtype=float)
    imputer = None
    if model_bundle:
        saved_imputer = model_bundle.get("imputer")
        if saved_imputer is not None:
            imputer = saved_imputer
    if imputer is None:
        if len(payload.items) < 2:
            imputer = SimpleImputer(strategy="median")
        else:
            imputer = IterativeImputer(random_state=42)

    try:
        if hasattr(imputer, "transform") and model_bundle and imputer is model_bundle.get("imputer"):
            imputed = imputer.transform(matrix)
        else:
            imputed = imputer.fit_transform(matrix)
    except Exception:
        imputed = np.nan_to_num(matrix, nan=0.0)

    cleaned = []
    for row_idx, row in enumerate(payload.items):
        cleaned_row = {col: float(imputed[row_idx, col_idx]) for col_idx, col in enumerate(mice_cols)}
        if target_cls in row:
            cleaned_row[target_cls] = row[target_cls]
        if "lot_id" in row:
            cleaned_row["lot_id"] = row["lot_id"]
        if "timestamp" in row:
            cleaned_row["timestamp"] = row["timestamp"]
        cleaned.append(cleaned_row)

    base_matrix = np.array(
        [[r.get(col, np.nan) for col in base_features] for r in cleaned], dtype=float
    )
    if model_bundle and model_bundle.get("iso") is not None:
        iso = model_bundle["iso"]
        anomaly_depth = iso.decision_function(base_matrix).astype(float)
    else:
        iso = IsolationForest(contamination=0.05, random_state=42)
        anomaly_depth = iso.fit(base_matrix).decision_function(base_matrix).astype(float)

    for idx, row in enumerate(cleaned):
        row["anomaly_depth"] = float(anomaly_depth[idx])

    return {"items": cleaned}


load_model()
