"use client";

import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Bell, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

interface Notification {
  id: string;
  event: string;
  severity: 'critical' | 'warning' | 'info' | 'good';
  message: string;
  timestamp: string;
  agent: {
    id: string;
    name: string;
    email: string;
  };
  location: {
    pollingUnit: {
      id: string;
      name: string;
    };
    distance: string;
    withinRange: boolean;
    status: string;
  };
}

interface NotificationsPanelProps {
  wardId: string;
}

export function NotificationsPanel({ wardId }: NotificationsPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    if (!wardId) {
      console.log('❌ No wardId provided');
      return;
    }

    // Use direct localhost URL without relying on env var
    const SOCKET_URL = 'http://localhost:5000';
    console.log('🔌 Attempting to connect to socket at:', SOCKET_URL);

    // Create socket with explicit configuration
    const socket = io(SOCKET_URL, {
      path: '/socket.io',
      transports: ['polling'], // Force polling first
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
      forceNew: true,
      autoConnect: true
    });

    // Connection event handlers
    socket.on('connect', () => {
      console.log('✅ Socket connected successfully!');
      console.log('🆔 Socket ID:', socket.id);
      console.log('🚌 Transport:', socket.io.engine.transport.name);
      setIsConnected(true);
      setConnectionError(null);
      
      // Join ward room
      console.log('📢 Attempting to join ward:', wardId);
      socket.emit('join-ward', wardId);
    });

    socket.on('joined-ward', (data) => {
      console.log('✅ Successfully joined ward:', data);
    });

    socket.on('agent-location-alert', (notification: Notification) => {
      console.log('📨 Received agent alert:', notification);
      
      const newNotification = {
        ...notification,
        id: `${Date.now()}-${Math.random()}`,
        timestamp: new Date().toISOString()
      };
      
      setNotifications(prev => [newNotification, ...prev].slice(0, 50));
      setUnreadCount(prev => prev + 1);
      
      if (notification.severity === 'critical') {
        toast({
          title: "🚨 Critical Alert",
          description: notification.message,
          variant: "destructive",
        });
      } else if (notification.severity === 'warning') {
        toast({
          title: "⚠️ Warning",
          description: notification.message,
        });
      }
    });

    // Error handlers
    socket.on('connect_error', (error) => {
      console.error('❌ Connection error - Full error:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error description:', error.description);
      console.error('❌ Error type:', error.type);
      setConnectionError(error.message || 'Connection failed');
      setIsConnected(false);
    });

    socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected:', reason);
      setIsConnected(false);
    });

    // Also listen for transport-level events
    socket.io.on('error', (error) => {
      console.error('❌ Transport error:', error);
    });

    socket.io.on('reconnect', (attempt) => {
      console.log('🔄 Reconnected after', attempt, 'attempts');
    });

    socket.io.on('reconnect_attempt', (attempt) => {
      console.log('🔄 Reconnection attempt', attempt);
    });

    socket.io.on('reconnect_error', (error) => {
      console.error('❌ Reconnection error:', error);
    });

    socket.io.on('reconnect_failed', () => {
      console.error('❌ Reconnection failed');
      setConnectionError('Failed to reconnect');
    });

    // Cleanup
    return () => {
      console.log('🧹 Cleaning up socket connection');
      if (socket.connected) {
        socket.emit('leave-ward', wardId);
      }
      socket.disconnect();
    };
  }, [wardId, toast]);

  const markAsRead = () => {
    setUnreadCount(0);
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      case 'good':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50';
      case 'warning':
        return 'bg-orange-50';
      case 'info':
        return 'bg-blue-50';
      case 'good':
        return 'bg-green-50';
      default:
        return '';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  return (
    <DropdownMenu onOpenChange={(open) => open && markAsRead()}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {isConnected && unreadCount > 0 && (
            <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-destructive">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
          {isConnected && unreadCount === 0 && (
            <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-green-500" />
          )}
          {!isConnected && (
            <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-gray-400 animate-pulse" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          <Badge variant="outline" className={isConnected ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-700'}>
            {isConnected ? 'Live' : 'Offline'}
          </Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {notifications.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
            <p>No notifications</p>
            {connectionError ? (
              <p className="text-xs mt-2 text-red-600">Error: {connectionError}</p>
            ) : !isConnected ? (
              <p className="text-xs mt-2 text-yellow-600">Connecting to server...</p>
            ) : (
              <p className="text-xs mt-2 text-green-600">Connected - waiting for alerts</p>
            )}
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={cn(
                  "flex flex-col items-start gap-1 p-3 cursor-default",
                  getSeverityBg(notification.severity)
                )}
              >
                <div className="flex items-start gap-2 w-full">
                  {getSeverityIcon(notification.severity)}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{notification.message}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{notification.agent.name}</span>
                      <span>•</span>
                      <span>{notification.location.pollingUnit.name}</span>
                      <span>•</span>
                      <span>{notification.location.distance}m</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTime(notification.timestamp)}
                    </p>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-center justify-center text-primary">
          View all notifications
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}