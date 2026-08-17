// lib/socket-service.ts

import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
let connectionListeners: Array<(connected: boolean) => void> = [];
let messageListeners: Array<(event: string, data: any) => void> = [];

export const getSocket = () => {
  if (!socket) {
    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
    
    console.log('🔌 Creating shared socket connection to:', SOCKET_URL);
    
    socket = io(SOCKET_URL, {
      path: '/socket.io',
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: true,
    });
    
    // Log all connection events for debugging
    socket.on('connect', () => {
      console.log('✅ Socket connected! ID:', socket?.id);
      connectionListeners.forEach(listener => listener(true));
    });
    
    socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
      connectionListeners.forEach(listener => listener(false));
    });
    
    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      connectionListeners.forEach(listener => listener(false));
    });
    
    socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Socket reconnected after ${attemptNumber} attempts`);
      connectionListeners.forEach(listener => listener(true));
    });
    
    socket.on('reconnect_error', (error) => {
      console.error('❌ Socket reconnect error:', error.message);
    });
    
    // Listen for all events for debugging
    socket.onAny((event, ...args) => {
      console.log(`📨 Socket event received: ${event}`, args[0]);
      messageListeners.forEach(listener => listener(event, args[0]));
    });
  }
  
  return socket;
};

export const onConnectionChange = (listener: (connected: boolean) => void) => {
  connectionListeners.push(listener);
  return () => {
    connectionListeners = connectionListeners.filter(l => l !== listener);
  };
};

export const onSocketMessage = (listener: (event: string, data: any) => void) => {
  messageListeners.push(listener);
  return () => {
    messageListeners = messageListeners.filter(l => l !== listener);
  };
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  connectionListeners = [];
  messageListeners = [];
};

export const sendSocketMessage = (event: string, data: any) => {
  if (socket && socket.connected) {
    socket.emit(event, data);
  } else {
    console.warn('Socket not connected, message not sent');
  }
};