import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Filter, MoreVertical, Send, Phone, Star, Archive, Paperclip, X, Image, FileText, Music, Video } from 'lucide-react';
import { whatsappService } from '../../services/whatsappService';
import { useSocket } from '../../contexts/SocketContext';
import { usePollingFallback } from '../../hooks/usePollingFallback';
import WhatsAppStats from './WhatsAppStats';
import MessageBubble from './MessageBubble';
import ConversationItem from './ConversationItem';
import SocketDebugPanel from './SocketDebugPanel';

// TypeScript interfaces
interface WhatsAppConversation {
  _id: string;
  phoneNumber: string;
  customerName?: string;
  lastMessage?: string;
  lastMessageTimestamp: Date | string;
  lastMessageDirection?: 'incoming' | 'outgoing';
  unreadCount: number;
  isVip?: boolean;
  isArchived?: boolean;
}

interface WhatsAppMessage {
  _id: string;
  messageId?: string;
  conversationId: string;
  message: string;
  direction: 'incoming' | 'outgoing';
  timestamp: Date | string;
  status?: 'sent' | 'delivered' | 'read' | 'failed';
  messageType?: 'text' | 'image' | 'audio' | 'video' | 'document';
  metadata?: {
    media_id?: string;
    media_url?: string;
    mime_type?: string;
    file_size?: number;
    caption?: string;
    filename?: string;
    cloudinary_public_id?: string;
    location?: {
      latitude: number;
      longitude: number;
      name?: string;
      address?: string;
    };
    contact?: {
      name?: string;
      phone?: string;
    };
  };
  attachments?: Array<{
    url: string;
    type: string;
    filename?: string;
    size?: number;
  }>;
}

interface WhatsAppStatsInterface {
  totalConversations: number;
  unreadConversations: number;
  totalMessages: number;
  pendingReplies: number;
  [key: string]: any; // Allow additional properties
}

interface Pagination {
  page: number;
  total: number;
  totalPages?: number;
  limit?: number;
}

interface PollingData {
  timestamp: number;
  updates: Array<{
    type: 'new_message' | 'conversation_update' | 'status_update';
    data: any;
  }>;
}

const WhatsAppInbox = () => {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<WhatsAppConversation | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [sendingMessage, setSendingMessage] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  const [pagination, setPagination] = useState<Pagination>({ page: 1, total: 0 });
  const [messagePagination, setMessagePagination] = useState<Pagination>({ page: 1, total: 0 });
  const [stats, setStats] = useState<WhatsAppStatsInterface | null>(null);  // Attachment state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showAttachmentPreview, setShowAttachmentPreview] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Suppress unused variable warnings temporarily
  void pagination;
  void messagePagination;  const { socket, isConnected, connectionAttempts } = useSocket();
  const { pollingData } = usePollingFallback(isConnected, 10000) as { pollingData: PollingData | null }; // Poll every 10 seconds when socket is not connected
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const lastPollingTimestampRef = useRef<number>(0);

  // Load conversations
  const loadConversations = useCallback(async (page: number = 1, reset: boolean = false) => {
    try {
      if (reset) setLoading(true);

      const params = {
        page,
        limit: 20,
        search: searchTerm,
        filter: filterType,
        sortBy: 'lastMessageTimestamp',
        sortOrder: 'desc'
      };

      const data = await whatsappService.getConversations(params);

      if (reset || page === 1) {
        setConversations(data.conversations);
      } else {
        setConversations(prev => [...prev, ...data.conversations]);
      }

      setPagination(data.pagination);
      setStats(data.stats);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filterType]);

  // Load messages for selected conversation
  const loadMessages = async (phone: string, page: number = 1, reset: boolean = false) => {
    try {
      if (reset) setLoadingMessages(true);

      const data = await whatsappService.getMessages(phone, { page, limit: 50 });

      if (reset || page === 1) {
        setMessages(data.messages);
        setSelectedConversation(data.conversation);
      } else {
        setMessages(prev => [...data.messages, ...prev]);
      }

      setMessagePagination(data.pagination);

      // Mark conversation as read
      if (data.conversation.unreadCount > 0) {
        await whatsappService.markConversationAsRead(data.conversation._id);
        updateConversationUnreadCount(data.conversation._id, 0);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Send message
  const sendMessage = async () => {
    if ((!newMessage.trim() && !selectedFile) || !selectedConversation || sendingMessage) return;    try {
      setSendingMessage(true);

      let response: any;

      if (selectedFile) {
        // Send message with attachment
        response = await whatsappService.sendReplyWithAttachment(
          selectedConversation.phoneNumber,
          newMessage.trim(),
          selectedFile
        );
      } else {
        // Send text message only
        response = await whatsappService.sendReply(
          selectedConversation.phoneNumber,
          newMessage.trim()
        );
      }      if (response.success) {
        // Handle different response formats
        const messageData = response.data?.message || response.message;        if (messageData) {
          // Check if message already exists to prevent duplicates
          setMessages(prev => {
            // Check for exact ID matches first
            if (messageData._id && prev.some(msg => msg._id === messageData._id)) {
              return prev;
            }

            if (messageData.messageId && prev.some(msg => msg.messageId === messageData.messageId)) {
              return prev;
            }

            // For messages without IDs, check by content, direction, and timestamp
            const exists = prev.some(msg => {
              const sameDirection = msg.direction === messageData.direction;
              const sameTimestamp = Math.abs(new Date(msg.timestamp).getTime() - new Date(messageData.timestamp).getTime()) < 5000; // 5 second window

              // For text messages, compare message content
              if (messageData.message && msg.message) {
                return sameDirection && sameTimestamp && msg.message === messageData.message;
              }
                // For attachment messages, compare attachment info
              if (messageData.attachments?.length > 0 && msg.attachments && msg.attachments.length > 0) {
                const sameAttachment = messageData.attachments[0].filename === msg.attachments[0].filename &&
                                     messageData.attachments[0].url === msg.attachments[0].url;
                return sameDirection && sameTimestamp && sameAttachment;
              }

              // For mixed content (text + attachment), compare both
              if (messageData.message && messageData.attachments?.length > 0 &&
                  msg.message && msg.attachments && msg.attachments.length > 0) {
                const sameText = msg.message === messageData.message;
                const sameAttachment = messageData.attachments[0].filename === msg.attachments[0].filename;
                return sameDirection && sameTimestamp && sameText && sameAttachment;
              }

              return false;
            });

            if (exists) {
              return prev;
            }

            return [...prev, messageData];
          });

          setNewMessage('');
          setSelectedFile(null);
          setShowAttachmentPreview(false);

          // Update conversation in list
          updateConversationLastMessage(
            selectedConversation._id,
            messageData.message,
            new Date(),
            'outgoing'
          );

          scrollToBottom();
        } else {
          console.error('Invalid response format:', response);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  // Update conversation unread count
  const updateConversationUnreadCount = (conversationId: string, newCount: number) => {
    setConversations(prev =>
      prev.map(conv =>
        conv._id === conversationId
          ? { ...conv, unreadCount: newCount }
          : conv
      )
    );
  };

  // Update conversation last message
  const updateConversationLastMessage = (conversationId: string, message: string, timestamp: Date | string, direction: 'incoming' | 'outgoing') => {
    setConversations(prev => {
      const updated = prev.map(conv =>
        conv._id === conversationId
          ? {
              ...conv,
              lastMessage: message,
              lastMessageTimestamp: timestamp,
              lastMessageDirection: direction
            }
          : conv
      );
      // Sort by timestamp
      return updated.sort((a, b) => new Date(b.lastMessageTimestamp).getTime() - new Date(a.lastMessageTimestamp).getTime());
    });
  };

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Handle key press in message input
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (16MB limit for WhatsApp)
      if (file.size > 16 * 1024 * 1024) {
        alert('File size must be less than 16MB');
        return;
      }

      setSelectedFile(file);
      setShowAttachmentPreview(true);
    }
  };

  // Remove selected file
  const removeSelectedFile = () => {
    setSelectedFile(null);
    setShowAttachmentPreview(false);
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];

      // Check file size
      if (file.size > 16 * 1024 * 1024) {
        alert('File size must be less than 16MB');
        return;
      }

      setSelectedFile(file);
      setShowAttachmentPreview(true);
    }
  };

  // Get file type icon
  const getFileTypeIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image size={20} className="text-blue-500" />;
    if (file.type.startsWith('video/')) return <Video size={20} className="text-purple-500" />;
    if (file.type.startsWith('audio/')) return <Music size={20} className="text-green-500" />;
    return <FileText size={20} className="text-gray-500" />;
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Socket event handlers
  useEffect(() => {
    if (!socket) {
      console.warn('⚠️ Socket not available - event listeners not set up');
      return;
    }

    if (!isConnected) {
      console.warn('⚠️ Socket not connected - waiting for connection...');
      return;
    }


    // New message received
    const handleNewMessage = (data: any) => {
      try {

        if (!data || !data.message || !data.conversation) {
          console.error('❌ Invalid message data received:', data);
          return;
        }

        const { message, conversation } = data;

        // Update conversations list
        setConversations(prev => {
          const existingIndex = prev.findIndex(conv => conv._id === conversation._id);
          const updatedConversation = {
            ...conversation,
            lastMessage: message.message,
            lastMessageTimestamp: message.timestamp,
            lastMessageDirection: message.direction,
            // Only increment unread count for incoming messages
            unreadCount: message.direction === 'incoming' ? conversation.unreadCount : prev[existingIndex]?.unreadCount || 0
          };

          let newConversations;
          if (existingIndex >= 0) {
            newConversations = [...prev];
            newConversations[existingIndex] = updatedConversation;
          } else {
            newConversations = [updatedConversation, ...prev];
          }
          // Sort by timestamp
          return newConversations.sort((a, b) =>
            new Date(b.lastMessageTimestamp).getTime() - new Date(a.lastMessageTimestamp).getTime()
          );
        });

        // Add message to current conversation if it's selected
        if (selectedConversation && message.conversationId === selectedConversation._id) {
          setMessages(prev => {
            // Check if message already exists
            const exists = prev.some(msg => msg._id === message._id || msg.messageId === message.messageId);
            if (exists) {
              return prev;
            }

            const newMessages = [...prev, message];
            scrollToBottom();
            return newMessages;
          });

          // Mark as read immediately for incoming messages if conversation is selected
          if (message.direction === 'incoming') {
            setTimeout(() => {
              whatsappService.markConversationAsRead(selectedConversation._id)
                .then(() => {
                  updateConversationUnreadCount(selectedConversation._id, 0);
                })
                .catch(err => console.error('Error marking as read:', err));
            }, 500);
          }
        }

        // Show notification for new incoming messages
        if (
          message.direction === 'incoming' &&
          Notification.permission === 'granted' &&
          (!selectedConversation || message.conversationId !== selectedConversation._id)
        ) {
          new Notification(`New WhatsApp Message`, {
            body: `${conversation.customerName || conversation.phoneNumber}: ${message.message}`,
            icon: '/logo192.png'
          });
        }

      } catch (error) {
        console.error('❌ Error handling new message:', error);
      }
    };

    // Message status update
    const handleStatusUpdate = (data: any) => {
      try {

        setMessages(prev =>
          prev.map(msg =>
            msg.messageId === data.messageId
              ? { ...msg, status: data.status }
              : msg
          )
        );
      } catch (error) {
        console.error('❌ Error handling status update:', error);
      }
    };

    // Reply sent confirmation
    const handleReplySent = (data: any) => {
      try {

        if (!data || !data.message || !data.conversation) {
          console.error('❌ Invalid reply data received:', data);
          return;
        }

        const { message, conversation } = data;

        // Update conversation in list
        updateConversationLastMessage(
          conversation._id,
          message.message,
          message.timestamp,
          'outgoing'
        );
      } catch (error) {
        console.error('❌ Error handling reply sent:', error);
      }
    };

    // Conversation update
    const handleConversationUpdate = (data: any) => {
      try {

        setConversations(prev =>
          prev.map(conv =>
            conv._id === data.conversationId
              ? {
                  ...conv,
                  unreadCount: data.unreadCount,
                  lastMessage: data.lastMessage,
                  lastMessageAt: data.lastMessageAt,
                  lastMessageDirection: data.lastMessageDirection
                }
              : conv
          )
        );
      } catch (error) {
        console.error('❌ Error handling conversation update:', error);
      }
    };

    // Attach event listeners
    socket.on('new_whatsapp_message', handleNewMessage);
    socket.on('whatsapp_message_status_update', handleStatusUpdate);
    socket.on('whatsapp_reply_sent', handleReplySent);
    socket.on('whatsapp_conversation_updated', handleConversationUpdate);

    // Cleanup function
    return () => {
      socket.off('new_whatsapp_message', handleNewMessage);
      socket.off('whatsapp_message_status_update', handleStatusUpdate);
      socket.off('whatsapp_reply_sent', handleReplySent);
      socket.off('whatsapp_conversation_updated', handleConversationUpdate);
    };
  }, [socket, isConnected, selectedConversation]);

  // Load initial data
  useEffect(() => {
    loadConversations(1, true);
  }, [loadConversations]);

  // Request notification permission
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);  // Handle polling fallback data
  useEffect(() => {
    if (!pollingData || !pollingData.updates || pollingData.updates.length === 0 || isConnected) {
      return;
    }

    // Prevent processing the same polling data multiple times
    if (lastPollingTimestampRef.current === pollingData.timestamp) {
      return;
    }
    lastPollingTimestampRef.current = pollingData.timestamp;


    pollingData.updates.forEach((update: any) => {
      try {
        if (update.type === 'new_message') {
          const { message, conversation } = update.data;

          // Update conversations list
          setConversations(prev => {
            const existingIndex = prev.findIndex(conv => conv._id === conversation._id);
            const updatedConversation = {
              ...conversation,
              lastMessage: message.message,
              lastMessageTimestamp: message.timestamp,
              lastMessageDirection: message.direction
            };

            let newConversations;
            if (existingIndex >= 0) {
              newConversations = [...prev];
              newConversations[existingIndex] = updatedConversation;
            } else {
              newConversations = [updatedConversation, ...prev];
            }
            return newConversations.sort((a, b) =>
              new Date(b.lastMessageTimestamp).getTime() - new Date(a.lastMessageTimestamp).getTime()
            );
          });

          // Add message to current conversation if it's selected
          if (selectedConversation && message.conversationId === selectedConversation._id) {
            setMessages(prev => {
              const exists = prev.some(msg => msg._id === message._id || msg.messageId === message.messageId);
              if (exists) return prev;

              const newMessages = [...prev, message];
              scrollToBottom();
              return newMessages;
            });

            // Mark as read immediately for incoming messages if conversation is selected
            if (message.direction === 'incoming') {
              setTimeout(() => {
                whatsappService.markConversationAsRead(selectedConversation._id)
                  .then(() => {
                    updateConversationUnreadCount(selectedConversation._id, 0);
                  })
                  .catch(err => console.error('Error marking as read:', err));
              }, 500);
            }
          }

          // Show notification for new incoming messages
          if (
            message.direction === 'incoming' &&
            Notification.permission === 'granted' &&
            (!selectedConversation || message.conversationId !== selectedConversation._id)
          ) {
            new Notification(`New WhatsApp Message`, {
              body: `${conversation.customerName || conversation.phoneNumber}: ${message.message}`,
              icon: '/logo192.png'
            });
          }
        } else if (update.type === 'conversation_update') {
          const { conversation } = update.data;

          setConversations(prev =>
            prev.map(conv =>
              conv._id === conversation._id
                ? { ...conv, ...conversation }
                : conv
            )
          );
        }
      } catch (error) {
        console.error('❌ Error processing polling update:', error);
      }
    });
  }, [pollingData, isConnected, selectedConversation]);

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Sidebar - Conversations List */}
      <div className="w-full lg:w-1/3 bg-white/80 backdrop-blur-xl border-r border-white/20 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 lg:p-6 border-b border-gray-200/50 bg-gradient-to-r from-green-50/30 to-emerald-50/30">
          <div className="flex items-center justify-between mb-4 lg:mb-6">
            <div className="flex items-center space-x-3 lg:space-x-4">
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
                <div className="w-5 h-5 lg:w-6 lg:h-6 text-white">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.531 3.506z"/>
                  </svg>
                </div>
              </div>
              <div className="hidden lg:block">
                <h2 className="text-lg font-bold text-gray-900">WhatsApp Business</h2>
                <p className="text-sm text-gray-600">Customer Support</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 lg:space-x-3">
              {/* Connection Status */}
              <div className="flex items-center space-x-2 bg-white/60 backdrop-blur-sm px-2 lg:px-3 py-1 lg:py-2 rounded-xl border border-white/30 shadow-lg">
                <div
                  className={`w-2 h-2 lg:w-3 lg:h-3 rounded-full ${
                    isConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500 animate-bounce'
                  }`}
                  title={
                    isConnected
                      ? 'Connected via Socket.io'
                      : connectionAttempts > 0
                        ? 'Reconnecting...'
                        : 'Using polling fallback'
                  }
                ></div>
                <span className="text-xs font-semibold text-gray-700">
                  {isConnected
                    ? 'Live'
                    : connectionAttempts > 0
                      ? 'Reconnecting...'
                      : 'Polling'
                  }
                </span>
              </div>
              <button className="p-2 lg:p-3 text-gray-500 hover:text-green-600 rounded-xl hover:bg-green-50/50 transition-all duration-300 shadow-lg bg-white/60 backdrop-blur-sm border border-white/30">
                <Filter size={16} className="lg:w-5 lg:h-5" />
              </button>
              <button className="p-2 lg:p-3 text-gray-500 hover:text-green-600 rounded-xl hover:bg-green-50/50 transition-all duration-300 shadow-lg bg-white/60 backdrop-blur-sm border border-white/30">
                <MoreVertical size={16} className="lg:w-5 lg:h-5" />
              </button>
            </div>
          </div>

          {/* Stats */}
          {stats && <WhatsAppStats stats={stats} />}

          {/* Search */}
          <div className="relative mb-4 lg:mb-6 group">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
            <div className="relative bg-white/80 backdrop-blur-xl border border-white/30 rounded-2xl shadow-lg">
              <div className="flex items-center">
                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center ml-2">
                  <Search className="text-white" size={16} />
                </div>
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 lg:px-4 py-2 lg:py-3 bg-transparent border-0 focus:outline-none focus:ring-0 text-gray-700 placeholder-gray-500 font-medium text-sm lg:text-base"
                />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex space-x-2 lg:space-x-3 mb-4 overflow-x-auto">
            {['all', 'unread', 'vip', 'archived'].map((filter, index) => {
              const gradients = [
                'from-blue-500 to-cyan-500',
                'from-amber-500 to-orange-500',
                'from-purple-500 to-pink-500',
                'from-gray-500 to-slate-500'
              ];
              const isActive = filterType === filter;

              return (
                <button
                  key={filter}
                  onClick={() => setFilterType(filter)}
                  className={`px-3 lg:px-4 py-1 lg:py-2 rounded-xl text-xs lg:text-sm font-semibold capitalize transition-all duration-300 transform hover:scale-105 whitespace-nowrap ${
                    isActive
                      ? `bg-gradient-to-r ${gradients[index]} text-white shadow-lg`
                      : 'bg-white/60 backdrop-blur-sm text-gray-600 hover:bg-white/80 border border-white/30 shadow-md'
                  }`}
                >
                  {filter}
                </button>
              );
            })}
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto bg-gradient-to-b from-transparent to-white/20">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="relative">
                <div className="animate-spin rounded-full h-8 w-8 lg:h-12 lg:w-12 border-4 border-green-200"></div>
                <div className="animate-spin rounded-full h-8 w-8 lg:h-12 lg:w-12 border-t-4 border-green-600 absolute top-0 left-0"></div>
              </div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 lg:py-12 px-4 lg:px-6">
              <div className="w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl">
                <Phone size={24} className="lg:w-8 lg:h-8 text-white" />
              </div>
              <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-2">No conversations found</h3>
              <p className="text-sm lg:text-base text-gray-500">Start a new conversation or check your filters</p>
            </div>
          ) : (
            conversations.map((conversation) => (
              <ConversationItem
                key={conversation._id}
                conversation={conversation}
                isSelected={selectedConversation?._id === conversation._id}
                onClick={() => loadMessages(conversation.phoneNumber, 1, true)}
              />
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area - Hidden on mobile when conversation list is shown */}
      <div className={`${selectedConversation ? 'flex' : 'hidden lg:flex'} flex-1 flex-col bg-white/70 backdrop-blur-xl border-l border-white/20 shadow-2xl`}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="bg-gradient-to-r from-green-50/50 to-emerald-50/50 backdrop-blur-xl border-b border-white/30 p-4 lg:p-6 flex items-center justify-between shadow-lg">
              <div className="flex items-center space-x-3 lg:space-x-4">
                {/* Back button for mobile */}
                <button
                  className="lg:hidden p-2 text-gray-500 hover:text-gray-700 rounded-xl hover:bg-white/80 transition-all duration-300"
                  onClick={() => setSelectedConversation(null)}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <div className="relative">
                  <div className="w-10 h-10 lg:w-14 lg:h-14 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full flex items-center justify-center text-white font-bold shadow-xl ring-4 ring-green-100">
                    {selectedConversation.customerName ?
                      selectedConversation.customerName.charAt(0).toUpperCase() :
                      selectedConversation.phoneNumber.slice(-2)
                    }
                  </div>
                  {/* Online indicator */}
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 lg:w-5 lg:h-5 bg-green-400 border-2 lg:border-3 border-white rounded-full"></div>
                </div>
                <div>
                  <h3 className="text-base lg:text-lg font-bold text-gray-900">
                    {selectedConversation.customerName || 'Unknown Customer'}
                  </h3>
                  <p className="text-sm text-gray-600 font-medium">{selectedConversation.phoneNumber}</p>
                  <div className="flex items-center mt-1">
                    <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                    <span className="text-xs text-green-600 font-semibold">Online</span>
                  </div>
                </div>
                {selectedConversation.isVip && (
                  <div className="bg-gradient-to-r from-yellow-400 to-amber-400 px-2 lg:px-3 py-1 rounded-full flex items-center space-x-1 shadow-lg">
                    <Star className="text-white" size={12} fill="currentColor" />
                    <span className="text-xs font-bold text-white">VIP</span>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2 lg:space-x-3">
                <button
                  onClick={() => whatsappService.toggleVip(selectedConversation._id)}
                  className={`p-2 lg:p-3 rounded-xl transition-all duration-300 shadow-lg ${
                    selectedConversation.isVip
                      ? 'bg-gradient-to-r from-yellow-400 to-amber-400 text-white'
                      : 'bg-white/60 backdrop-blur-sm text-gray-500 hover:text-yellow-500 border border-white/30'
                  }`}
                  title="Toggle VIP"
                >
                  <Star size={16} className="lg:w-5 lg:h-5" fill={selectedConversation.isVip ? "currentColor" : "none"} />
                </button>
                <button
                  onClick={() => whatsappService.toggleArchive(selectedConversation._id)}
                  className="p-2 lg:p-3 text-gray-500 hover:text-gray-700 rounded-xl hover:bg-white/80 transition-all duration-300 shadow-lg bg-white/60 backdrop-blur-sm border border-white/30"
                  title="Archive"
                >
                  <Archive size={16} className="lg:w-5 lg:h-5" />
                </button>
                <button className="p-2 lg:p-3 text-gray-500 hover:text-gray-700 rounded-xl hover:bg-white/80 transition-all duration-300 shadow-lg bg-white/60 backdrop-blur-sm border border-white/30">
                  <MoreVertical size={16} className="lg:w-5 lg:h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-3 lg:space-y-4 bg-gradient-to-b from-gray-50/30 to-white/30">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-40">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-12 w-12 lg:h-16 lg:w-16 border-4 border-green-200"></div>
                    <div className="animate-spin rounded-full h-12 w-12 lg:h-16 lg:w-16 border-t-4 border-green-600 absolute top-0 left-0"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-5 h-5 lg:w-6 lg:h-6 text-green-600">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.531 3.506z"/>
                        </svg>
                      </div>
                    </div>
                  </div>                </div>
              ) : (
                messages.map((message, index) => (
                  <MessageBubble
                    key={message._id || index}
                    message={message}
                    isOwn={message.direction === 'outgoing'}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>            {/* Message Input */}
            <div
              className={`bg-gradient-to-r from-green-50/30 to-emerald-50/30 backdrop-blur-xl border-t border-white/30 p-4 lg:p-6 shadow-lg transition-all duration-300 ${
                isDragOver ? 'bg-gradient-to-r from-blue-50/50 to-green-50/50 border-blue-300' : ''
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {/* Attachment Preview */}
              {showAttachmentPreview && selectedFile && (
                <div className="mb-4 p-3 bg-white/90 backdrop-blur-sm rounded-xl border border-white/30 shadow-md">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-gray-900 flex items-center">
                      <Paperclip size={14} className="mr-2 text-green-600" />
                      Attachment
                    </h4>
                    <button
                      onClick={removeSelectedFile}
                      className="p-1 text-gray-500 hover:text-red-600 rounded-lg hover:bg-red-50 transition-all duration-300"
                      title="Remove attachment"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {getFileTypeIcon(selectedFile)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Drag & Drop Overlay */}
              {isDragOver && (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-green-500/20 backdrop-blur-sm rounded-xl border-2 border-dashed border-blue-400 flex items-center justify-center z-10">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-green-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl">
                      <Paperclip size={24} className="text-white" />
                    </div>
                    <p className="text-lg font-semibold text-gray-900">Drop file here to attach</p>
                    <p className="text-sm text-gray-600">Images, documents, audio, and video files supported</p>
                  </div>
                </div>
              )}

              <div className="flex items-end space-x-3 lg:space-x-4">
                {/* Attachment Button */}
                <div className="relative">
                  <input
                    type="file"
                    id="attachment-input"
                    onChange={handleFileSelect}
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                    className="hidden"
                  />
                  <label
                    htmlFor="attachment-input"
                    className="cursor-pointer p-3 lg:p-4 text-gray-500 hover:text-green-600 rounded-xl hover:bg-green-50/50 transition-all duration-300 shadow-lg bg-white/60 backdrop-blur-sm border border-white/30 flex items-center justify-center"
                    title="Attach file"
                  >
                    <Paperclip size={18} className="lg:w-5 lg:h-5" />
                  </label>
                </div>

                {/* Message Input */}
                <div className="flex-1 relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-2xl blur-xl group-focus-within:blur-2xl transition-all duration-300"></div>
                  <textarea
                    ref={messageInputRef}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={selectedFile ? "Add a caption (optional)..." : "Type a message..."}
                    rows={1}
                    className="relative w-full px-4 lg:px-6 py-3 lg:py-4 bg-white/80 backdrop-blur-xl border border-white/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 resize-none shadow-lg font-medium text-gray-700 placeholder-gray-500 transition-all duration-300 text-sm lg:text-base"
                    style={{ minHeight: '48px', maxHeight: '120px' }}
                  />
                </div>

                {/* Send Button */}
                <button
                  onClick={sendMessage}
                  disabled={(!newMessage.trim() && !selectedFile) || sendingMessage}
                  className="w-12 h-12 lg:w-14 lg:h-14 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl flex items-center justify-center shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 disabled:hover:scale-100"
                >
                  {sendingMessage ? (
                    <div className="animate-spin rounded-full h-5 w-5 lg:h-6 lg:w-6 border-2 border-white border-t-transparent"></div>
                  ) : (
                    <Send size={16} className="lg:w-5 lg:h-5" />
                  )}
                </button>
              </div>            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50/30 to-white/30">
            <div className="text-center max-w-md mx-auto p-6 lg:p-8">
              <div className="w-24 h-24 lg:w-32 lg:h-32 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 lg:mb-8 shadow-2xl">
                <div className="w-12 h-12 lg:w-16 lg:h-16 text-white">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.531 3.506z"/>
                  </svg>
                </div>
              </div>
              <h3 className="text-xl lg:text-2xl font-bold text-gray-900 mb-3 lg:mb-4">Select a conversation</h3>
              <p className="text-gray-600 text-base lg:text-lg leading-relaxed">Choose a conversation from the sidebar to start messaging with your customers</p>
              <div className="mt-6 lg:mt-8 flex justify-center space-x-2">
                <div className="w-2 h-2 lg:w-3 lg:h-3 bg-green-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 lg:w-3 lg:h-3 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 lg:w-3 lg:h-3 bg-teal-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Debug Panel */}
      {process.env.NODE_ENV === 'development' && <SocketDebugPanel />}
    </div>
  );
};

export default WhatsAppInbox;
