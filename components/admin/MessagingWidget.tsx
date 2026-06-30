// components/admin/MessagingWidget.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/use-toast';
import { io, Socket } from 'socket.io-client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  RefreshCw,
  MessageSquare,
  Users,
  User,
  Mail,
  Clock,
  CheckCircle,
  Send,
  MoreVertical,
  Paperclip,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
  Eye,
  Maximize2,
  Minimize2,
  UserCog,
  UserCircle,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Helper function to validate UUID
const isValidUUID = (id: string): boolean => {
  return UUID_REGEX.test(id);
};

interface Conversation {
  agentId: string;
  agentName: string;
  agentEmail: string;
  lastMessage: {
    id: string;
    text: string;
    timestamp: string;
    fromMe: boolean;
    fromName: string;
  } | null;
  unreadCount: number;
  online: boolean;
  lastActive: string;
  hasLocation: boolean;
  role?: string;
}

interface Message {
  id: string;
  message: string;
  fromId: string;
  fromName: string;
  fromRole: string;
  toId: string;
  toName: string;
  toRole: string;
  read: boolean;
  readAt: string | null;
  timestamp: string;
  isFromAdmin: boolean;
}

interface MessagingWidgetProps {
  initialContactId?: string;
  initialContactName?: string;
  onSelectConversation?: (agentId: string) => void;
  className?: string;
  maxHeight?: string;
  showHeader?: boolean;
  compact?: boolean;
}

export function MessagingWidget({
  initialContactId,
  initialContactName,
  onSelectConversation,
  className = '',
  maxHeight = '600px',
  showHeader = true,
  compact = false,
}: MessagingWidgetProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(
    initialContactId && isValidUUID(initialContactId) ? initialContactId : null
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [apiAvailable, setApiAvailable] = useState(true);
  const [initialContactLoaded, setInitialContactLoaded] = useState(false);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize Socket.IO connection
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
    
    if (!token || !user) return;

    const socketInstance = io(SOCKET_URL, {
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect', () => {
      console.log('🔌 Messaging socket connected');
      setIsConnected(true);
      
      if (user?.id) {
        socketInstance.emit('authenticate', {
          userId: user.id,
          role: user.role,
          wardId: user.wardId,
          zoneId: user.zoneId,
          userName: user.name
        });
      }
    });

    socketInstance.on('disconnect', () => {
      console.log('🔌 Messaging socket disconnected');
      setIsConnected(false);
    });

    socketInstance.on('new-message', (data) => {
      console.log('📨 New message received:', data);
      
      if (data.toId === user?.id) {
        const newMessage: Message = {
          id: data.id || `msg-${Date.now()}`,
          message: data.message,
          fromId: data.fromId,
          fromName: data.fromName,
          fromRole: data.fromRole,
          toId: data.toId,
          toName: data.toName || 'Unknown',
          toRole: data.toRole,
          read: false,
          readAt: null,
          timestamp: data.timestamp || new Date().toISOString(),
          isFromAdmin: false,
        };
        
        if (selectedAgentId === data.fromId || selectedAgentId === data.toId) {
          setMessages(prev => [...prev, newMessage]);
        }
        
        fetchConversations(false);
        
        toast({
          title: `New message from ${data.fromName}`,
          description: data.message.substring(0, 50) + (data.message.length > 50 ? '...' : ''),
          duration: 5000,
        });
      }
    });

    socketInstance.on('message-notification', (data) => {
      console.log('🔔 Message notification:', data);
      toast({
        title: `📨 New message from ${data.fromName}`,
        description: data.message.substring(0, 50) + (data.message.length > 50 ? '...' : ''),
        duration: 5000,
      });
    });

    socketInstance.on('message-sent', (data) => {
      console.log('✅ Message sent confirmation:', data);
    });

    socketInstance.on('message-error', (data) => {
      console.error('❌ Message error:', data);
      const errorMessage = data?.error || data?.message || 'Failed to send message. Please try again.';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      setMessages(prev => prev.filter(msg => !msg.id.startsWith('temp-')));
    });

    socketInstance.on('agent-status-update', (data) => {
      console.log('🔄 Agent status update:', data);
      fetchConversations(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [user, toast]);

  // Fetch conversations with error handling
  const fetchConversations = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const response = await apiClient.get<{ success: boolean; conversations: Conversation[] }>(
        '/admin/conversations'
      );

      if (response.success && response.conversations) {
        // ✅ FIX: Filter out conversations where the current user is the sender
        // Only show conversations from OTHER users (Ward Admins, other Admins, Agents)
        // NOT the current user's own conversations
        const validConversations = response.conversations.filter(conv => {
          // Validate UUID
          if (!conv.agentId || !isValidUUID(conv.agentId)) return false;
          
          // ✅ CRITICAL FIX: Filter out conversations where the current user is the agent
          // This prevents showing "c" (the Zone Admin) in the conversation list
          // Since the current user is the Zone Admin, we don't want to show their own conversations
          const isCurrentUser = conv.agentId === user?.id;
          
          // Also filter out conversations where the agent name matches the current user's name
          const isSelf = conv.agentName?.toLowerCase() === user?.name?.toLowerCase();
          
          // Return true only if it's NOT the current user
          return !isCurrentUser && !isSelf;
        });
        
        setConversations(validConversations);
        setApiAvailable(true);

        // If initialContactId is provided and valid, select that conversation
        if (initialContactId && !initialContactLoaded) {
          if (isValidUUID(initialContactId)) {
            const found = validConversations.find(c => c.agentId === initialContactId);
            if (found) {
              console.log('✅ Found initial contact:', found.agentName);
              setSelectedAgentId(initialContactId);
              await fetchMessages(initialContactId);
              setInitialContactLoaded(true);
            } else {
              console.log('⚠️ Initial contact not found in conversations');
              setSelectedAgentId(initialContactId);
              await fetchMessages(initialContactId);
              setInitialContactLoaded(true);
            }
          } else {
            console.warn('⚠️ Invalid initialContactId format:', initialContactId);
            setInitialContactLoaded(true);
          }
        } else if (validConversations.length > 0 && !selectedAgentId) {
          const first = validConversations[0];
          setSelectedAgentId(first.agentId);
          await fetchMessages(first.agentId);
        }
      }
    } catch (error: any) {
      console.log('📡 Conversations endpoint not available:', error.message);
      setApiAvailable(false);
      setConversations([]);
      
      // Only try to fetch for initial contact if it's a valid UUID
      if (initialContactId && !initialContactLoaded) {
        if (isValidUUID(initialContactId)) {
          console.log('🔍 Attempting to fetch messages for initial contact despite conversation error');
          setSelectedAgentId(initialContactId);
          await fetchMessages(initialContactId);
          setInitialContactLoaded(true);
        }
      }
      
      if (!error.message?.includes('404')) {
        toast({
          title: "Error",
          description: "Failed to load conversations",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [initialContactId, initialContactLoaded, toast, user]);

  // Fetch messages for a specific agent with error handling
  const fetchMessages = async (agentId: string) => {
    // Validate UUID before making API call
    if (!isValidUUID(agentId)) {
      console.warn('⚠️ Invalid UUID format for agentId:', agentId);
      setMessages([]);
      setLoadingMessages(false);
      toast({
        title: "Invalid Contact",
        description: "Unable to load messages for this contact.",
        variant: "destructive",
      });
      return;
    }

    setLoadingMessages(true);
    try {
      console.log('📡 Fetching messages for user:', agentId);
      const response = await apiClient.get<{ success: boolean; messages: Message[]; agent: any }>(
        `/admin/messages/history?agentId=${agentId}`
      );

      console.log('📡 Messages response:', response);

      if (response.success && response.messages) {
        setMessages(response.messages);
      } else {
        setMessages([]);
      }
    } catch (error: any) {
      console.log('📡 Messages endpoint not available:', error.message);
      setMessages([]);
      // Don't show toast for 404 or invalid input syntax errors
      if (!error.message?.includes('404') && !error.message?.includes('invalid input syntax')) {
        toast({
          title: "Error",
          description: "Failed to load messages",
          variant: "destructive",
        });
      }
    } finally {
      setLoadingMessages(false);
    }
  };

  // Send a message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedAgentId || isSending) return;

    // Validate UUID before sending
    if (!isValidUUID(selectedAgentId)) {
      toast({
        title: "Invalid Contact",
        description: "Unable to send message to this contact.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    const messageText = newMessage.trim();

    const recipient = conversations.find(c => c.agentId === selectedAgentId);
    const recipientName = recipient?.agentName || initialContactName || 'Unknown';
    const recipientRole = recipient?.role || 'agent';

    // Optimistically add message
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      message: messageText,
      fromId: user?.id || '',
      fromName: user?.name || 'You',
      fromRole: user?.role || 'admin',
      toId: selectedAgentId,
      toName: recipientName,
      toRole: recipientRole,
      read: false,
      readAt: null,
      timestamp: new Date().toISOString(),
      isFromAdmin: true,
    };
    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');

    try {
      console.log('📤 Sending message to:', selectedAgentId, 'Role:', recipientRole);
      
      // Send via REST API
      const response = await apiClient.post<{
          message: string; success: boolean; data: { id: string; message: string; timestamp: string } 
}>(
        '/admin/messages/send',
        {
          agentId: selectedAgentId,
          message: messageText,
        }
      );

      if (response.success) {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === tempMessage.id
              ? {
                  ...msg,
                  id: response.data.id,
                  timestamp: response.data.timestamp,
                }
              : msg
          )
        );
        await fetchConversations(false);
      } else {
        throw new Error(response.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  // Handle key press (Enter to send)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Select a conversation
  const handleSelectConversation = async (agentId: string) => {
    if (!isValidUUID(agentId)) {
      toast({
        title: "Invalid Contact",
        description: "Unable to select this conversation.",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedAgentId(agentId);
    await fetchMessages(agentId);
    await markMessagesAsRead(agentId);
    if (onSelectConversation) {
      onSelectConversation(agentId);
    }
  };

  // Mark messages as read
  const markMessagesAsRead = async (agentId: string) => {
    if (!isValidUUID(agentId)) return;
    
    try {
      const unreadMessages = messages.filter(
        msg => msg.toId === user?.id && !msg.read && msg.fromId === agentId
      );

      if (unreadMessages.length === 0) return;

      const messageIds = unreadMessages.map(msg => msg.id);
      
      try {
        await apiClient.post('/admin/messages/mark-read', { messageIds });
      } catch (apiError: any) {
        console.log('📡 Mark read endpoint not available');
      }

      setMessages(prev =>
        prev.map(msg =>
          messageIds.includes(msg.id)
            ? { ...msg, read: true, readAt: new Date().toISOString() }
            : msg
        )
      );

      await fetchConversations(false);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  // Get initials
  const getInitials = (name: string) => {
    if (!name) return 'C';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Format time
  const formatTime = (timestamp: string) => {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return '';
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
      return format(date, 'MMM d, h:mm a');
    } catch {
      return '';
    }
  };

  // Get status color
  const getStatusColor = (online: boolean) => {
    return online ? 'bg-green-500' : 'bg-gray-400';
  };

  // Get status text
  const getStatusText = (online: boolean, lastActive: string) => {
    if (online) return 'Online';
    if (lastActive && lastActive !== 'Offline' && lastActive !== 'Unknown') {
      return `Last seen ${lastActive}`;
    }
    return 'Offline';
  };

  // Get role icon
  const getRoleIcon = (role?: string) => {
    if (role === 'admin' || role === 'Zone Admin' || role === 'Ward Admin' || role === 'System Admin') {
      return <UserCog className="h-3 w-3 text-blue-500" />;
    }
    return <UserCircle className="h-3 w-3 text-green-500" />;
  };

  // Filter conversations
  const filteredConversations = conversations.filter(conv => {
    const matchesSearch =
      conv.agentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.agentEmail?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'online' && conv.online) ||
      (filterStatus === 'offline' && !conv.online) ||
      (filterStatus === 'unread' && conv.unreadCount > 0);

    const matchesRole = filterRole === 'all' ||
      (filterRole === 'admin' && (conv.role === 'admin' || conv.role === 'Zone Admin' || conv.role === 'Ward Admin' || conv.role === 'System Admin')) ||
      (filterRole === 'agent' && (conv.role === 'agent' || conv.role === 'Polling Agent'));

    return matchesSearch && matchesStatus && matchesRole;
  });

  // Clear filters
  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setFilterRole('all');
  };

  // Handle initial contact
  useEffect(() => {
    if (initialContactId && !initialContactLoaded) {
      console.log('🔍 MessagingWidget: Initial contact provided:', initialContactId, initialContactName);
      
      if (isValidUUID(initialContactId)) {
        setSelectedAgentId(initialContactId);
        
        if (conversations.length > 0) {
          const found = conversations.find(c => c.agentId === initialContactId);
          if (found) {
            console.log('✅ Found contact in conversations:', found.agentName);
            fetchMessages(initialContactId);
            setInitialContactLoaded(true);
          } else {
            console.log('⚠️ Contact not in conversations list, fetching messages anyway');
            fetchMessages(initialContactId);
            setInitialContactLoaded(true);
          }
        }
      } else {
        console.warn('⚠️ Invalid initialContactId format:', initialContactId);
        setInitialContactLoaded(true);
        toast({
          title: "Invalid Contact",
          description: "The contact ID provided is invalid.",
          variant: "destructive",
        });
      }
    }
  }, [initialContactId, conversations, initialContactLoaded]);

  // Initial load
  useEffect(() => {
    fetchConversations(true);
  }, []);

  // Get selected conversation details
  const selectedConv = conversations.find(c => c.agentId === selectedAgentId);

  // If minimized, show compact view
  if (isMinimized) {
    return (
      <Card className={`${className} fixed bottom-4 right-4 w-72 shadow-lg z-50`}>
        <div className="flex items-center justify-between p-3 bg-primary text-primary-foreground rounded-t-lg">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="text-sm font-medium">Messages</span>
            {conversations.filter(c => c.unreadCount > 0).length > 0 && (
              <Badge className="bg-red-500 text-white text-xs">
                {conversations.reduce((sum, c) => sum + c.unreadCount, 0)}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsMinimized(false)}>
              <Maximize2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Loading skeleton
  if (loading) {
    return (
      <Card className={`${className}`}>
        <CardContent className="p-4">
          <Skeleton className="h-10 w-full mb-4" />
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full mb-2" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className} flex flex-col overflow-hidden`}>
      {showHeader && (
        <CardHeader className="pb-2 flex flex-row items-center justify-between flex-shrink-0">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Messages
              {!isConnected && (
                <Badge variant="outline" className="text-xs text-yellow-500 border-yellow-500">
                  Offline
                </Badge>
              )}
              {!apiAvailable && (
                <Badge variant="outline" className="text-xs text-orange-500 border-orange-500">
                  Limited Mode
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Chat with ward admins, zonal admins, and agents
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => router.push('/admin/messages')}
              title="Open full messaging center"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => fetchConversations(false)}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsMinimized(true)}
              title="Minimize"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
      )}

      <CardContent className="flex-1 overflow-hidden p-0 min-h-0">
        <div className="grid grid-cols-1 md:grid-cols-3 h-full" style={{ maxHeight }}>
          {/* Conversations List - Left Sidebar */}
          <div className="md:col-span-1 border-r flex flex-col h-full overflow-hidden">
            <div className="p-3 border-b flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 h-8 text-sm"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
              {showFilters && (
                <div className="flex flex-wrap gap-1 mt-2">
                  <div className="flex gap-1">
                    <Button
                      variant={filterStatus === 'all' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setFilterStatus('all')}
                      className="h-6 text-xs px-2"
                    >
                      All
                    </Button>
                    <Button
                      variant={filterStatus === 'online' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setFilterStatus('online')}
                      className="h-6 text-xs px-2"
                    >
                      Online
                    </Button>
                    <Button
                      variant={filterStatus === 'offline' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setFilterStatus('offline')}
                      className="h-6 text-xs px-2"
                    >
                      Offline
                    </Button>
                    <Button
                      variant={filterStatus === 'unread' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setFilterStatus('unread')}
                      className="h-6 text-xs px-2"
                    >
                      Unread
                    </Button>
                  </div>
                  <div className="flex gap-1 ml-1 border-l pl-1 border-border">
                    <Button
                      variant={filterRole === 'all' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setFilterRole('all')}
                      className="h-6 text-xs px-2"
                    >
                      All Roles
                    </Button>
                    <Button
                      variant={filterRole === 'admin' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setFilterRole('admin')}
                      className="h-6 text-xs px-2"
                    >
                      Admins
                    </Button>
                    <Button
                      variant={filterRole === 'agent' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setFilterRole('agent')}
                      className="h-6 text-xs px-2"
                    >
                      Agents
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <ScrollArea className="flex-1">
              {filteredConversations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No conversations</p>
                  {!apiAvailable && (
                    <p className="text-xs mt-1 text-orange-500">
                      Using limited mode - some features may be unavailable
                    </p>
                  )}
                  {initialContactId && !initialContactLoaded && (
                    <p className="text-xs mt-2 text-blue-500">
                      Loading conversation with {initialContactName || 'contact'}...
                    </p>
                  )}
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isAdmin = conv.role === 'admin' || conv.role === 'Zone Admin' || conv.role === 'Ward Admin' || conv.role === 'System Admin';
                  return (
                    <div
                      key={conv.agentId}
                      className={`flex items-center gap-2 p-2 cursor-pointer hover:bg-muted transition-colors border-b ${
                        selectedAgentId === conv.agentId ? 'bg-muted' : ''
                      } ${isAdmin ? 'border-l-2 border-l-blue-400' : ''}`}
                      onClick={() => handleSelectConversation(conv.agentId)}
                    >
                      <div className="relative">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">{getInitials(conv.agentName)}</AvatarFallback>
                        </Avatar>
                        <span
                          className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background ${getStatusColor(
                            conv.online
                          )}`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <p className="font-medium text-xs truncate">{conv.agentName}</p>
                            {isAdmin && (
                              <Badge variant="outline" className="text-[8px] px-1 py-0 text-blue-600 border-blue-200 bg-blue-50">
                                Admin
                              </Badge>
                            )}
                          </div>
                          {conv.lastMessage && (
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {formatTime(conv.lastMessage.timestamp)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                            {conv.lastMessage ? conv.lastMessage.text : 'No messages'}
                          </p>
                          {conv.unreadCount > 0 && (
                            <Badge className="bg-primary text-primary-foreground h-4 min-w-4 px-1 text-[10px]">
                              {conv.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </ScrollArea>
          </div>

          {/* Chat Area - Right Side */}
          <div className="md:col-span-2 flex flex-col h-full overflow-hidden">
            {selectedAgentId ? (
              <>
                {/* Chat Header - Fixed at top */}
                <div className="flex items-center justify-between p-3 border-b flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {getInitials(selectedConv?.agentName || initialContactName || 'Contact')}
                        </AvatarFallback>
                      </Avatar>
                      {selectedConv && (
                        <span
                          className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background ${getStatusColor(
                            selectedConv.online
                          )}`}
                        />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">
                          {selectedConv?.agentName || initialContactName || 'Contact'}
                        </p>
                        {selectedConv && (selectedConv.role === 'admin' || selectedConv.role === 'Zone Admin' || selectedConv.role === 'Ward Admin' || selectedConv.role === 'System Admin') && (
                          <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-200 bg-blue-50">
                            Admin
                          </Badge>
                        )}
                        {selectedConv && (selectedConv.role === 'agent' || selectedConv.role === 'Polling Agent') && (
                          <Badge variant="outline" className="text-[10px] text-green-600 border-green-200 bg-green-50">
                            Agent
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        {selectedConv ? (
                          <>
                            <span className={`h-1.5 w-1.5 rounded-full ${selectedConv.online ? 'bg-green-500' : 'bg-gray-400'}`} />
                            {getStatusText(selectedConv.online, selectedConv.lastActive)}
                          </>
                        ) : (
                          <span className="text-muted-foreground">Loading contact information...</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {isConnected && (
                      <Badge variant="outline" className="text-xs text-green-500 border-green-500">
                        Live
                      </Badge>
                    )}
                    {selectedConv && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setSelectedConversation(selectedConv);
                          setIsViewDialogOpen(true);
                        }}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Messages - Scrollable middle */}
                <div className="flex-1 overflow-y-auto p-3 min-h-0">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-20" />
                      <p className="text-sm font-medium">No messages yet</p>
                      <p className="text-xs">Send a message to start the conversation</p>
                      {!isConnected && (
                        <p className="text-xs text-yellow-500 mt-2">Connecting to server...</p>
                      )}
                      <div className="mt-4 p-2 bg-muted/50 rounded-lg">
                        <p className="text-[10px] text-muted-foreground">
                          💡 Type a message below and press Enter to send
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.isFromAdmin ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-lg p-2 ${
                              msg.isFromAdmin
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            {!msg.isFromAdmin && (
                              <p className="text-[10px] font-medium mb-0.5">{msg.fromName}</p>
                            )}
                            <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                            <div className="flex items-center justify-end gap-1 mt-0.5">
                              <p className="text-[10px] opacity-70">
                                {formatTime(msg.timestamp)}
                              </p>
                              {msg.isFromAdmin && msg.read && (
                                <CheckCircle className="h-2.5 w-2.5 opacity-70" />
                              )}
                              {msg.id.startsWith('temp-') && (
                                <Loader2 className="h-2.5 w-2.5 animate-spin opacity-70" />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Message Input - Fixed at bottom */}
                <div className="p-2 border-t flex-shrink-0">
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder={isConnected ? "Type a message..." : "Connecting..."}
                      className="h-8 text-sm flex-1"
                      disabled={!isConnected || isSending}
                    />
                    <Button
                      size="icon"
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || !isConnected || isSending}
                      className="h-8 w-8 shrink-0"
                    >
                      {isSending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {!isConnected && (
                    <p className="text-xs text-yellow-500 mt-1 text-center">
                      Connecting to messaging server...
                    </p>
                  )}
                  {!apiAvailable && (
                    <p className="text-xs text-orange-500 mt-1 text-center">
                      Limited mode - messages may not be saved
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-medium">Select a conversation</p>
                  <p className="text-xs">Choose a contact to start chatting</p>
                  {initialContactId && !initialContactLoaded && (
                    <p className="text-xs mt-2 text-blue-500">
                      Loading conversation with {initialContactName || 'contact'}...
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>

      {/* View Conversation Dialog */}
      <Dialog open={isViewDialogOpen && selectedConversation !== null} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Conversation Details
            </DialogTitle>
            <DialogDescription>
              {selectedConversation?.agentName}
            </DialogDescription>
          </DialogHeader>

          {selectedConversation && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback>{getInitials(selectedConversation.agentName)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedConversation.agentName}</p>
                  <p className="text-sm text-muted-foreground">{selectedConversation.agentEmail}</p>
                  {selectedConversation.role && (
                    <Badge variant="outline" className="text-xs mt-1">
                      {selectedConversation.role}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`h-2 w-2 rounded-full ${getStatusColor(
                        selectedConversation.online
                      )}`}
                    />
                    <span>{getStatusText(selectedConversation.online, selectedConversation.lastActive)}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Unread</Label>
                  <p className="font-medium">{selectedConversation.unreadCount}</p>
                </div>
              </div>

              {selectedConversation.lastMessage && (
                <div>
                  <Label className="text-muted-foreground">Last Message</Label>
                  <p className="text-sm mt-1 p-3 bg-muted rounded-lg">
                    {selectedConversation.lastMessage.text}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatTime(selectedConversation.lastMessage.timestamp)}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}