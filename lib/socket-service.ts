import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
let connectionListeners: Array<(connected: boolean) => void> = [];

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
      timeout: 20000,
      autoConnect: true,
    });
    
    // Log connection events
    socket.on('connect', () => {
      console.log('✅ Shared socket connected:', socket?.id);
      connectionListeners.forEach(listener => listener(true));
    });
    
    socket.on('disconnect', (reason) => {
      console.log('🔌 Shared socket disconnected:', reason);
      connectionListeners.forEach(listener => listener(false));
    });
    
    socket.on('connect_error', (error) => {
      console.error('❌ Shared socket connection error:', error.message);
      connectionListeners.forEach(listener => listener(false));
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

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};