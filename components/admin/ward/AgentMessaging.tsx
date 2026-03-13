"use client";

import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, X, Minimize2, Maximize2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

interface Message {
  id: string;
  from: string;
  fromId: string;
  message: string;
  timestamp: string;
  type: 'admin' | 'agent';
  fromRole?: 'admin' | 'agent';
  toId?: string;
  toRole?: string;
}

interface Agent {
  id: string;
  name: string;
  email: string;
  status: 'Online' | 'Offline';
}

interface AgentMessagingProps {
  agent: Agent;
  onClose: () => void;
  getInitials: (name: string) => string;
}

export function AgentMessaging({ agent, onClose, getInitials }: AgentMessagingProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isSending, setIsSending] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load message history
  const loadMessageHistory = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      
      const response = await fetch(`${API_BASE_URL}/admin/messages/history?agentId=${agent.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📜 Loaded message history:', data);
        
        // Handle different response structures
        let historyMessages = [];
        
        // Case 1: Direct array response
        if (Array.isArray(data)) {
          historyMessages = data;
        }
        // Case 2: Response with messages array
        else if (data.messages && Array.isArray(data.messages)) {
          historyMessages = data.messages;
        }
        // Case 3: Response with data property
        else if (data.data && Array.isArray(data.data)) {
          historyMessages = data.data;
        }
        
        // Convert messages to frontend format
        const formattedMessages = historyMessages.map((msg: any) => ({
          id: msg.id,
          from: msg.from || msg.sender?.name || 'Unknown',
          fromId: msg.fromId || msg.sender?.id,
          message: msg.message,
          timestamp: msg.timestamp || msg.createdAt,
          type: msg.fromRole === 'admin' ? 'admin' : 'agent',
          fromRole: msg.fromRole,
          toId: msg.toId,
          toRole: msg.toRole
        }));
        
        setMessages(formattedMessages);
      } else {
        console.error('Failed to load message history:', response.status);
      }
    } catch (error) {
      console.error('Failed to load message history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
    
    console.log('🔌 Connecting to socket for messaging...');
    
    const socketInstance = io(SOCKET_URL, {
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect', () => {
      console.log('✅ Messaging socket connected', socketInstance.id);
      setIsConnected(true);
      
      // Authenticate with the server
      if (user?.id && user?.wardId) {
        console.log('🔐 Authenticating admin:', user.id);
        socketInstance.emit('authenticate', {
          userId: user.id,
          pollingUnitId: '',
          wardId: user.wardId,
          role: user.role,
          userName: user.name
        });
      }
    });

    socketInstance.on('authenticated', (data) => {
      console.log('✅ Authenticated successfully:', data);
      
      // Request message history for this agent
      socketInstance.emit('get-message-history', {
        userId: user?.id,
        withUser: agent.id
      });
      
      // Load history from REST API as well
      loadMessageHistory();
    });

    // Listen for message history
    socketInstance.on('message-history', (data) => {
      console.log('📜 Received message history:', data);
      if (data.messages && Array.isArray(data.messages)) {
        const historyMessages = data.messages.map((msg: any) => ({
          id: msg.id,
          from: msg.from,
          fromId: msg.fromId,
          message: msg.message,
          timestamp: msg.timestamp,
          type: msg.fromRole === 'admin' ? 'admin' : 'agent',
          fromRole: msg.fromRole,
          toId: msg.toId,
          toRole: msg.toRole
        }));
        setMessages(prev => {
          // Combine with existing messages, remove duplicates
          const allMessages = [...historyMessages, ...prev];
          const uniqueMessages = allMessages.filter((msg, index, self) => 
            index === self.findIndex(m => m.id === msg.id)
          );
          return uniqueMessages.sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
        });
      }
    });

    socketInstance.on('message-sent', (data) => {
      console.log('✅ Message sent confirmation:', data);
      setIsSending(false);
    });

    socketInstance.on('message-error', (error) => {
      console.error('❌ Message error:', error);
      toast({
        title: "Error",
        description: error.error || "Failed to send message",
        variant: "destructive",
      });
      setIsSending(false);
      
      // Remove the optimistic message if it failed
      setMessages(prev => prev.filter(m => !m.id.startsWith('temp-')));
    });

    // Listen for agent replies - both event types
    const handleAgentMessage = (message: Message) => {
      console.log('📨 Received agent message:', message);
      
      // Only add messages for this agent
      if (message.fromId === agent.id) {
        setMessages(prev => {
          if (prev.some(m => m.id === message.id)) return prev;
          return [...prev, { ...message, type: 'agent' }];
        });
      }
    };

    socketInstance.on('agent-message', handleAgentMessage);
    socketInstance.on('agent-message-to-admin', handleAgentMessage);
    socketInstance.on('agent-reply', handleAgentMessage);

    // Listen for pending messages
    socketInstance.on('pending-messages', (data) => {
      console.log('📨 Pending messages received:', data);
      if (data.messages && Array.isArray(data.messages)) {
        data.messages.forEach((message: Message) => {
          if (message.fromId === agent.id) {
            setMessages(prev => {
              if (prev.some(m => m.id === message.id)) return prev;
              return [...prev, { ...message, type: 'agent' }];
            });
          }
        });
      }
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('🔌 Messaging socket disconnected:', reason);
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
      setIsConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      console.log('🧹 Cleaning up messaging socket');
      socketInstance.disconnect();
    };
  }, [user, agent.id]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !socket || !isConnected) return;

    setIsSending(true);
    
    // Validate required data
    if (!user?.id || !user?.name || !agent.id) {
      console.error('❌ Missing required user data:', { userId: user?.id, userName: user?.name, agentId: agent.id });
      toast({
        title: "Error",
        description: "Missing user information",
        variant: "destructive",
      });
      setIsSending(false);
      return;
    }

    const messageData = {
      agentId: agent.id,
      message: newMessage,
      adminId: user.id,
      adminName: user.name,
      wardId: user.wardId,
      timestamp: new Date().toISOString()
    };

    console.log('📤 Sending message:', messageData);

    // Optimistically add message to UI
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      from: user.name,
      fromId: user.id,
      message: newMessage,
      timestamp: new Date().toISOString(),
      type: 'admin',
      fromRole: 'admin',
      toId: agent.id,
      toRole: 'agent'
    };
    setMessages(prev => [...prev, tempMessage]);
    
    const messageText = newMessage;
    setNewMessage('');

    // Send the message using both event names for compatibility
    socket.emit('send-message-to-agent', messageData);
    socket.emit('admin-message', {
      ...messageData,
      from: user.name,
      fromId: user.id,
      fromRole: 'admin'
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const refreshMessages = () => {
    if (socket && isConnected) {
      socket.emit('get-message-history', {
        userId: user?.id,
        withUser: agent.id
      });
    }
    loadMessageHistory();
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
        <div className="flex items-center justify-between p-3 bg-primary text-primary-foreground rounded-t-lg">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs bg-primary-foreground text-primary">
                {getInitials(agent.name)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{agent.name}</span>
            <Badge variant="outline" className="ml-2 text-xs bg-primary-foreground/20">
              {agent.status}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsMinimized(false)}>
              <Maximize2 className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col z-50" style={{ height: '600px', maxHeight: '90vh' }}>
      {/* Header - Fixed at top */}
      <div className="flex items-center justify-between p-3 bg-primary text-primary-foreground rounded-t-lg flex-shrink-0">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary-foreground text-primary">
              {getInitials(agent.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium">{agent.name}</h3>
            <div className="flex items-center gap-2 text-xs opacity-90">
              <span>{agent.email}</span>
              <Badge variant="outline" className="text-[10px] bg-primary-foreground/20">
                {agent.status}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7" 
            onClick={refreshMessages}
            title="Refresh messages"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsMinimized(true)}>
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Connection Status */}
      {!isConnected && (
        <div className="bg-yellow-50 p-2 text-xs text-yellow-700 text-center flex-shrink-0">
          Connecting to server...
        </div>
      )}

      {/* Messages Area - Scrollable */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Loading messages...</p>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-full p-4">
            <div className="space-y-4 pb-2">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500">No messages yet</p>
                  <p className="text-xs text-gray-400 mt-1">Send a message to start the conversation</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex",
                      msg.type === 'admin' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg p-3 break-words",
                        msg.type === 'admin'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-gray-100 text-gray-900'
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      <div className="flex items-center justify-end gap-2 mt-1">
                        <p className="text-[10px] opacity-70">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {msg.id.startsWith('temp-') && (
                          <span className="text-[10px] opacity-70">Sending...</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className="p-3 border-t bg-white flex-shrink-0">
        <div className="flex gap-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type your message..."
            className="min-h-[60px] max-h-[120px] resize-none"
            disabled={!isConnected || isSending || isLoading}
          />
          <Button
            size="icon"
            onClick={sendMessage}
            disabled={!newMessage.trim() || !isConnected || isSending || isLoading}
            className="self-end flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {!isConnected && (
          <p className="text-xs text-red-500 mt-2">Disconnected from server</p>
        )}
      </div>
    </div>
  );
}