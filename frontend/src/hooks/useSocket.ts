import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api', '')
  : 'http://localhost:3000';

export function useSocket(events: Record<string, (data: any) => void>) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    Object.entries(events).forEach(([eventName, handler]) => {
      socket.on(eventName, handler);
    });

    return () => {
      Object.entries(events).forEach(([eventName, handler]) => {
        socket.off(eventName, handler);
      });
      socket.disconnect();
    };
    // Reconnect only when the set of listened event names changes.
    // `events` is a new object each render, so we stabilize on its keys.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(Object.keys(events))]);

  return socketRef;
}
