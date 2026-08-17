// hooks/useSocketEvents.ts

import { useEffect, useState, useCallback } from 'react';
import { getSocket, onSocketMessage, onConnectionChange, sendSocketMessage } from '@/lib/socket-service';

interface SocketEvent {
  event: string;
  data: any;
}

export function useSocketEvents() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<SocketEvent | null>(null);
  const [events, setEvents] = useState<SocketEvent[]>([]);

  useEffect(() => {
    const socket = getSocket();
    setIsConnected(socket?.connected || false);

    // Listen for connection changes
    const unsubscribeConnection = onConnectionChange((connected) => {
      setIsConnected(connected);
    });

    // Listen for messages
    const unsubscribeMessages = onSocketMessage((event, data) => {
      const socketEvent = { event, data };
      setLastEvent(socketEvent);
      setEvents(prev => [socketEvent, ...prev].slice(0, 100)); // Keep last 100 events
    });

    return () => {
      unsubscribeConnection();
      unsubscribeMessages();
    };
  }, []);

  const sendMessage = useCallback((event: string, data: any) => {
    sendSocketMessage(event, data);
  }, []);

  return {
    isConnected,
    lastEvent,
    events,
    sendMessage
  };
}