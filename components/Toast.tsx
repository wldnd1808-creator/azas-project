'use client';

import { useEffect } from 'react';

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, isVisible, onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    if (!isVisible || !message) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [isVisible, message, duration, onClose]);

  if (!isVisible) return null;
  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 bg-slate-900 text-white text-sm font-medium rounded-lg shadow-lg transition-opacity duration-300"
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  );
}
