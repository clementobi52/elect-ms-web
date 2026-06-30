// components/admin/NotificationsPanel.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSocket, onConnectionChange } from '@/lib/socket-service';
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
import { Bell, AlertTriangle, Info, CheckCircle, MessageSquare, Mail, User, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

interface LocationNotification {
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

interface MessageNotification {
  id: string;
  type: 'message';
  fromId: string;
  fromName: string;
  fromRole: string;
  toId: string;
  toRole: string;
  message: string;
  timestamp: string;
  read: boolean;
}

type Notification = LocationNotification | MessageNotification;

interface NotificationsPanelProps {
  wardId?: string;
  userId?: string;
  userRole?: string;
}

export function NotificationsPanel({ wardId, userId, userRole }: NotificationsPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [hasJoinedWard, setHasJoinedWard] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    const currentUserId = userId || user?.id;
    const currentWardId = wardId || user?.wardId;
    const currentUserRole = userRole || user?.role;
    
    // Listen to connection status changes
    const unsubscribe = onConnectionChange((connected) => {
      setIsConnected(connected);
      if (connected && currentWardId && !hasJoinedWard) {
        console.log('📢 Re-joining ward on reconnect:', currentWardId);
        socket.emit('join-ward', currentWardId);
      }
    });

    // Check current connection status
    setIsConnected(socket.connected);
    
    // Set up event handlers
    const handleJoinedWard = (data: any) => {
      console.log('✅ Successfully joined ward:', data);
      setHasJoinedWard(true);
      setConnectionError(null);
    };
    
    const handleAgentAlert = (notification: LocationNotification) => {
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
          duration: 10000,
        });
      } else if (notification.severity === 'warning') {
        toast({
          title: "⚠️ Warning",
          description: notification.message,
          duration: 8000,
        });
      } else if (notification.severity === 'good') {
        toast({
          title: "✅ Agent Check-in",
          description: notification.message,
          duration: 5000,
        });
      }
    };

    // Handle new messages from Socket.IO
    const handleNewMessage = (data: any) => {
      console.log('📨 New message notification:', data);
      
      // Check if message is for the current user
      if (data.toId === currentUserId) {
        const newNotification: MessageNotification = {
          id: data.id || `msg-${Date.now()}`,
          type: 'message',
          fromId: data.fromId,
          fromName: data.fromName,
          fromRole: data.fromRole,
          toId: data.toId,
          toRole: data.toRole,
          message: data.message,
          timestamp: data.timestamp || new Date().toISOString(),
          read: false,
        };
        
        setNotifications(prev => [newNotification, ...prev].slice(0, 50));
        setUnreadCount(prev => prev + 1);
        
        toast({
          title: `📨 New message from ${data.fromName}`,
          description: data.message.substring(0, 50) + (data.message.length > 50 ? '...' : ''),
          duration: 8000,
          action: (
            <Button variant="ghost" size="sm" onClick={() => {
              router.push(`/admin/messages?contact=${data.fromId}&name=${data.fromName}`);
            }}>
              View
            </Button>
          ),
        });
      }
    };

    // Handle message notifications
    const handleMessageNotification = (data: any) => {
      console.log('🔔 Message notification:', data);
      
      if (data.toId === currentUserId) {
        const newNotification: MessageNotification = {
          id: `notif-${Date.now()}`,
          type: 'message',
          fromId: data.fromId,
          fromName: data.fromName,
          fromRole: data.fromRole,
          toId: data.toId,
          toRole: data.toRole,
          message: data.message,
          timestamp: new Date().toISOString(),
          read: false,
        };
        
        setNotifications(prev => [newNotification, ...prev].slice(0, 50));
        setUnreadCount(prev => prev + 1);
        
        toast({
          title: `📨 New message from ${data.fromName}`,
          description: data.message.substring(0, 50) + (data.message.length > 50 ? '...' : ''),
          duration: 8000,
        });
      }
    };
    
    const handleConnectError = (error: any) => {
      console.error('❌ Connection error:', error.message);
      setConnectionError(error.message);
      setIsConnected(false);
    };
    
    // Register event listeners
    socket.on('joined-ward', handleJoinedWard);
    socket.on('agent-location-alert', handleAgentAlert);
    socket.on('new-message', handleNewMessage);
    socket.on('message-notification', handleMessageNotification);
    socket.on('connect_error', handleConnectError);
    
    // Join ward if already connected and wardId exists
    if (socket.connected && currentWardId) {
      console.log('📢 Joining ward:', currentWardId);
      socket.emit('join-ward', currentWardId);
    }
    
    // Load initial notifications from API
    loadNotifications();
    
    // Cleanup
    return () => {
      socket.off('joined-ward', handleJoinedWard);
      socket.off('agent-location-alert', handleAgentAlert);
      socket.off('new-message', handleNewMessage);
      socket.off('message-notification', handleMessageNotification);
      socket.off('connect_error', handleConnectError);
      unsubscribe();
      
      // Leave ward on cleanup
      if (socket.connected && currentWardId) {
        socket.emit('leave-ward', currentWardId);
      }
    };
  }, [wardId, userId, userRole, user, toast, router]);

  // Load notifications from API
  const loadNotifications = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      
      const response = await fetch(`${API_BASE_URL}/admin/notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.notifications) {
          setNotifications(data.notifications);
          setUnreadCount(data.unreadCount || 0);
        }
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  // Mark notifications as read
  const markAsRead = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      
      await fetch(`${API_BASE_URL}/admin/notifications/mark-read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ markAll: true }),
      });
      
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
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

  const getNotificationIcon = (notification: Notification) => {
    if ('type' in notification && notification.type === 'message') {
      return <MessageSquare className="h-4 w-4 text-blue-500" />;
    }
    if ('event' in notification) {
      switch (notification.event) {
        case 'agent-checkin':
          return <MapPin className="h-4 w-4 text-green-500" />;
        case 'agent-warning':
          return <AlertTriangle className="h-4 w-4 text-orange-500" />;
        case 'agent-critical':
          return <AlertTriangle className="h-4 w-4 text-red-500" />;
        default:
          return <Info className="h-4 w-4 text-blue-500" />;
      }
    }
    return <Bell className="h-4 w-4" />;
  };

  const getNotificationBg = (notification: Notification) => {
    if ('type' in notification && notification.type === 'message') {
      return 'bg-blue-50';
    }
    if ('severity' in notification) {
      return getSeverityBg(notification.severity);
    }
    return '';
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

  const getNotificationMessage = (notification: Notification): string => {
    if ('type' in notification && notification.type === 'message') {
      return `${notification.fromName}: ${notification.message}`;
    }
    if ('message' in notification) {
      return notification.message;
    }
    return 'New notification';
  };

  const getNotificationTitle = (notification: Notification): string => {
    if ('type' in notification && notification.type === 'message') {
      return `Message from ${notification.fromName}`;
    }
    if ('event' in notification) {
      switch (notification.event) {
        case 'agent-checkin':
          return 'Agent Check-in';
        case 'agent-warning':
          return 'Agent Warning';
        case 'agent-critical':
          return 'Critical Alert';
        default:
          return 'Alert';
      }
    }
    return 'Notification';
  };

  const handleNotificationClick = (notification: Notification) => {
    if ('type' in notification && notification.type === 'message') {
      router.push(`/admin/messages?contact=${notification.fromId}&name=${notification.fromName}`);
    } else if ('agent' in notification && notification.agent?.id) {
      router.push(`/admin/agents/${notification.agent.id}`);
    }
  };

  return (
    <DropdownMenu onOpenChange={(open) => open && markAsRead()}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {isConnected && unreadCount > 0 && (
            <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-destructive text-white text-xs">
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
      <DropdownMenuContent align="end" className="w-96 max-h-[500px] overflow-hidden flex flex-col">
        <DropdownMenuLabel className="flex items-center justify-between sticky top-0 bg-white z-10">
          <span>Notifications</span>
          <Badge variant="outline" className={isConnected ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-700'}>
            {isConnected ? 'Live' : 'Offline'}
          </Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <div className="flex-1 overflow-y-auto">
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
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={cn(
                  "flex flex-col items-start gap-1 p-3 cursor-pointer hover:bg-muted",
                  getNotificationBg(notification),
                  'border-b last:border-b-0'
                )}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-2 w-full">
                  {getNotificationIcon(notification)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate">{getNotificationTitle(notification)}</p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {formatTime(notification.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {getNotificationMessage(notification)}
                    </p>
                    {'agent' in notification && notification.agent && (
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>{notification.agent.name}</span>
                        {'location' in notification && notification.location && (
                          <>
                            <span>•</span>
                            <MapPin className="h-3 w-3" />
                            <span>{notification.location.pollingUnit.name}</span>
                            <span>•</span>
                            <span>{notification.location.distance}m</span>
                          </>
                        )}
                      </div>
                    )}
                    {'message' in notification && 'fromName' in notification && (
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span>From: {notification.fromName}</span>
                        {'fromRole' in notification && (
                          <Badge variant="outline" className="text-xs">
                            {notification.fromRole}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
        
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-center justify-center text-primary sticky bottom-0 bg-white">
          View all notifications
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}