'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';

const HUMIDITY_THRESHOLD = 72;

// 센서 타입 정의
export type Sensor = { id: string; name: string; humidity: number; temperature: number };

// 공정 단계 데이터 (센서 구역 매핑 포함)
const processSteps = [
  { name: '원재료 투입', position: [-8, 0, 0], zoneId: 'A1' },
  { name: '혼합/배합', position: [-6, 0, 0], zoneId: 'A1' },
  { name: '성형', position: [-4, 0, 0], zoneId: 'A2' },
  { name: '건조/경화', position: [-2, 0, 0], zoneId: 'A2' },
  { name: '검사', position: [0, 0, 0], zoneId: 'B1' },
  { name: '표면처리', position: [2, 0, 0], zoneId: 'B1' },
  { name: '조립', position: [4, 0, 0], zoneId: 'B2' },
  { name: '최종검사', position: [6, 0, 0], zoneId: 'B2' },
  { name: '포장', position: [8, 0, 0], zoneId: 'B2' },
];

// 공정 박스 컴포넌트 (센서 데이터 연동)
function ProcessBox({ 
  name, 
  position, 
  zoneId,
  sensors 
}: { 
  name: string; 
  position: [number, number, number];
  zoneId: string;
  sensors?: Sensor[];
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [isOverThreshold, setIsOverThreshold] = useState(false);
  const [opacity, setOpacity] = useState(1);

  // 해당 구역의 센서 데이터 찾기
  const sensor = sensors?.find(s => s.id === zoneId);
  const overThreshold = sensor ? sensor.humidity >= HUMIDITY_THRESHOLD : false;

  useEffect(() => {
    setIsOverThreshold(overThreshold);
  }, [overThreshold]);

  // 깜빡이는 애니메이션
  useFrame((state) => {
    if (meshRef.current && isOverThreshold) {
      const blinkSpeed = 2;
      const opacity = 0.5 + Math.sin(state.clock.elapsedTime * blinkSpeed) * 0.5;
      setOpacity(opacity);
    } else {
      setOpacity(1);
    }
  });

  const boxColor = isOverThreshold ? '#ff4d4f' : '#888888';

  return (
    <group position={position}>
      {/* 공정 박스 */}
      <mesh ref={meshRef} position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.2, 1, 1.2]} />
        <meshStandardMaterial 
          color={boxColor} 
          metalness={0.3} 
          roughness={0.7}
          opacity={opacity}
          transparent
        />
      </mesh>
      
      {/* 공정 명칭 라벨 */}
      <Html
        position={[0, 1.8, 0]}
        center
        style={{
          color: 'white',
          fontSize: '14px',
          fontWeight: 'bold',
          textAlign: 'center',
          background: 'rgba(0, 0, 0, 0.7)',
          padding: '4px 8px',
          borderRadius: '4px',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}
      >
        {name}
      </Html>

      {/* 센서 상태 표시 (기준 초과 시) */}
      {isOverThreshold && sensor && (
        <Html
          position={[0, -0.8, 0]}
          center
          style={{
            color: '#ff4d4f',
            fontSize: '12px',
            fontWeight: 'bold',
            textAlign: 'center',
            background: 'rgba(255, 77, 79, 0.2)',
            padding: '2px 6px',
            borderRadius: '4px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            border: '1px solid #ff4d4f',
          }}
        >
          기준 초과 ({sensor.humidity}%)
        </Html>
      )}
    </group>
  );
}

// LOT 컴포넌트 (이동 애니메이션)
function LOT() {
  const lotRef = useRef<THREE.Group>(null);
  const startTimeRef = useRef(0);
  const [isAnimating, setIsAnimating] = useState(true);
  
  // 전체 라인 길이: -8부터 8까지 = 16
  const startX = -8;
  const endX = 8;
  const duration = 10; // 10초

  useFrame((state) => {
    if (!lotRef.current) return;

    if (startTimeRef.current === 0) {
      startTimeRef.current = state.clock.elapsedTime;
    }

    const elapsed = state.clock.elapsedTime - startTimeRef.current;
    let progress = (elapsed % duration) / duration;
    
    // 부드러운 이동을 위한 easing
    progress = progress < 0.5 
      ? 2 * progress * progress 
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    const currentX = startX + (endX - startX) * progress;
    lotRef.current.position.x = currentX;
  });

  return (
    <group ref={lotRef} position={[startX, 0.3, 0]}>
      {/* LOT 박스 */}
      <mesh castShadow>
        <boxGeometry args={[0.4, 0.4, 0.4]} />
        <meshStandardMaterial color="#4a90e2" metalness={0.5} roughness={0.3} />
      </mesh>
      
      {/* LOT 라벨 */}
      <Html
        position={[0, 0.5, 0]}
        center
        style={{
          color: 'white',
          fontSize: '10px',
          fontWeight: 'bold',
          textAlign: 'center',
          background: 'rgba(74, 144, 226, 0.8)',
          padding: '2px 4px',
          borderRadius: '2px',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}
      >
        LOT
      </Html>
    </group>
  );
}

// 컨베이어 벨트 컴포넌트
function ConveyorBelt({ startPos, endPos }: { startPos: [number, number, number]; endPos: [number, number, number] }) {
  const length = Math.abs(endPos[0] - startPos[0]);
  const centerX = (startPos[0] + endPos[0]) / 2;
  
  return (
    <mesh position={[centerX, 0.1, 0]} receiveShadow>
      <boxGeometry args={[length, 0.05, 0.8]} />
      <meshStandardMaterial color="#666666" metalness={0.2} roughness={0.8} />
    </mesh>
  );
}

// 3D 공정 시각화 메인 컴포넌트
export default function ThreeDProcess({ sensors }: { sensors?: Sensor[] }) {
  return (
    <div className="w-full h-full bg-black rounded-lg overflow-hidden">
      <Canvas
        camera={{ position: [0, 8, 15], fov: 50 }}
        gl={{ antialias: true }}
        shadows
      >
        {/* 조명 */}
        <ambientLight intensity={0.6} />
        <directionalLight 
          position={[10, 10, 5]} 
          intensity={1} 
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <pointLight position={[-10, 5, -5]} intensity={0.3} />

        {/* 카메라 컨트롤 */}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={8}
          maxDistance={30}
          target={[0, 0, 0]}
        />

        {/* 바닥 */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
          <planeGeometry args={[20, 10]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>

        {/* 공정 박스들 (센서 데이터 연동) */}
        {processSteps.map((step, index) => (
          <ProcessBox 
            key={index} 
            name={step.name} 
            position={step.position}
            zoneId={step.zoneId}
            sensors={sensors}
          />
        ))}

        {/* 컨베이어 벨트들 */}
        {processSteps.slice(0, -1).map((step, index) => (
          <ConveyorBelt
            key={index}
            startPos={[step.position[0] + 0.6, 0.1, 0]}
            endPos={[processSteps[index + 1].position[0] - 0.6, 0.1, 0]}
          />
        ))}

        {/* LOT 이동 애니메이션 */}
        <LOT />
      </Canvas>
    </div>
  );
}
