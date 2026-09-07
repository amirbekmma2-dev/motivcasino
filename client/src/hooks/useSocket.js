import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || '';

export function useSocket(namespace, initData) {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!initData) return;

    const socket = io(`${API_URL}/${namespace}`, {
      auth: { initData },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect_error', (err) => {
      console.error(`Socket /${namespace} error:`, err.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [namespace, initData]);

  const emit = useCallback((event, data) => {
    socketRef.current?.emit(event, data);
  }, []);

  const on = useCallback((event, handler) => {
    socketRef.current?.on(event, handler);
    return () => socketRef.current?.off(event, handler);
  }, []);

  return { socket: socketRef, emit, on };
}
