import React, { createContext, useContext, useEffect, useState } from 'react';
import { socketService } from '../services/socket';
import { useAuth } from './AuthContext';

interface SocketContextType {
  isConnected: boolean;
  socketService: typeof socketService;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    socketService.connect();

    const unsub = socketService.subscribe('connection', (connected: boolean) => {
      setIsConnected(connected);
    });

    return () => {
      unsub();
      socketService.disconnect();
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ isConnected, socketService }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
