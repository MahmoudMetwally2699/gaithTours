import React, { useState, useEffect, useRef } from 'react';
import { Search, Filter, MoreVertical, Send, Phone, Star, Archive, UserPlus } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { whatsappService } from '../../services/whatsappService';
import { useSocket } from '../../contexts/SocketContext';
import WhatsAppStats from './WhatsAppStats';
import MessageBubble from './MessageBubble';
import ConversationItem from './ConversationItem';
import SocketDebugPanel from './SocketDebugPanel';

const WhatsAppInbox = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [pagination, setPagination] = useState({ page: 1, total: 0 });
  const [messagePagination, setMessagePagination] = useState({ page: 1, total: 0 });
  const [stats, setStats] = useState(null);

  const { socket, isConnected, connectionAttempts } = useSocket();
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);

  // Load conversations
  const loadConversations = async (page = 1, reset = false) => {
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
  };

  // Load messages for selected conversation
  const loadMessages = async (phone, page = 1, reset = false) => {
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
    if (!newMessage.trim() || !selectedConversation || sendingMessage) return;

    try {
      setSendingMessage(true);

      const response = await whatsappService.sendReply(
        selectedConversation.phoneNumber,
        newMessage.trim()
      );

      if (response.success) {
        setMessages(prev => [...prev, response.message]);
        setNewMessage('');

        // Update conversation in list
        updateConversationLastMessage(
          selectedConversation._id,
          newMessage.trim(),
          new Date(),
          'outgoing'
        );

        scrollToBottom();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  // Update conversation unread count
  const updateConversationUnreadCount = (conversationId, newCount) => {
    setConversations(prev =>
      prev.map(conv =>
        conv._id === conversationId
          ? { ...conv, unreadCount: newCount }
          : conv
      )
    );
  };

  // Update conversation last message
  const updateConversationLastMessage = (conversationId, message, timestamp, direction) => {
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
      return updated.sort((a, b) => new Date(b.lastMessageTimestamp) - new Date(a.lastMessageTimestamp));
    });
  };

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Handle key press in message input
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };  // Socket event handlers
  useEffect(() => {
    if (!socket) {
      console.warn('⚠️ Socket not available - event listeners not set up');
      return;
    }

    if (!isConnected) {
      console.warn('⚠️ Socket not connected - waiting for connection...');
      return;
    }

    console.log('🔔 Setting up WhatsApp socket event listeners');

    // New message received
    const handleNewMessage = (data) => {
      try {
        console.log('🔔 Received new_whatsapp_message event:', data);

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
            new Date(b.lastMessageTimestamp) - new Date(a.lastMessageTimestamp)
          );
        });

        // Add message to current conversation if it's selected
        if (selectedConversation && message.conversationId === selectedConversation._id) {
          setMessages(prev => {
            // Check if message already exists
            const exists = prev.some(msg => msg._id === message._id || msg.messageId === message.messageId);
            if (exists) {
              console.log('🔄 Message already exists, skipping');
              return prev;
            }

            console.log('📝 Adding message to current conversation');
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

        console.log('✅ New message processed successfully');
      } catch (error) {
        console.error('❌ Error handling new message:', error);
      }
    };

    // Message status update
    const handleStatusUpdate = (data) => {
      try {
        console.log('🔔 Received status update:', data);

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
    const handleReplySent = (data) => {
      try {
        console.log('🔔 Received reply sent confirmation:', data);

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

        console.log('✅ Reply confirmation processed successfully');
      } catch (error) {
        console.error('❌ Error handling reply sent:', error);
      }
    };

    // Conversation update
    const handleConversationUpdate = (data) => {
      try {
        console.log('🔔 Received conversation update:', data);

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
      console.log('🧹 Cleaning up WhatsApp socket event listeners');
      socket.off('new_whatsapp_message', handleNewMessage);
      socket.off('whatsapp_message_status_update', handleStatusUpdate);
      socket.off('whatsapp_reply_sent', handleReplySent);
      socket.off('whatsapp_conversation_updated', handleConversationUpdate);
    };
  }, [socket, isConnected, selectedConversation]);

  // Load initial data
  useEffect(() => {
    loadConversations(1, true);
  }, [searchTerm, filterType]);

  // Request notification permission
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex h-full bg-gray-50">
      {/* Sidebar - Conversations List */}
      <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold text-gray-900">WhatsApp Messages</h1>
            <div className="flex items-center space-x-2">
              {/* Connection Status */}
              <div className="flex items-center space-x-1">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  title={isConnected ? 'Connected' : connectionAttempts > 0 ? 'Reconnecting...' : 'Disconnected'}
                ></div>
                <span className="text-xs text-gray-500">
                  {isConnected ? 'Live' : connectionAttempts > 0 ? 'Reconnecting...' : 'Offline'}
                </span>
              </div>
              <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <Filter size={18} />
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <MoreVertical size={18} />
              </button>
            </div>
          </div>

          {/* Stats */}
          {stats && <WhatsAppStats stats={stats} />}

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filters */}
          <div className="flex space-x-2">
            {['all', 'unread', 'vip', 'archived'].map((filter) => (
              <button
                key={filter}
                onClick={() => setFilterType(filter)}
                className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
                  filterType === filter
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Phone size={48} className="mx-auto mb-4 text-gray-400" />
              <p>No conversations found</p>
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

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold">
                  {selectedConversation.customerName ?
                    selectedConversation.customerName.charAt(0).toUpperCase() :
                    selectedConversation.phoneNumber.slice(-2)
                  }
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {selectedConversation.customerName || 'Unknown Customer'}
                  </h3>
                  <p className="text-sm text-gray-500">{selectedConversation.phoneNumber}</p>
                </div>
                {selectedConversation.isVip && (
                  <Star className="text-yellow-500" size={16} fill="currentColor" />
                )}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => whatsappService.toggleVip(selectedConversation._id)}
                  className="p-2 text-gray-400 hover:text-yellow-500 rounded-lg hover:bg-gray-100"
                  title="Toggle VIP"
                >
                  <Star size={18} fill={selectedConversation.isVip ? "currentColor" : "none"} />
                </button>
                <button
                  onClick={() => whatsappService.toggleArchive(selectedConversation._id)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  title="Archive"
                >
                  <Archive size={18} />
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                  <MoreVertical size={18} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
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
            </div>

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex items-end space-x-3">
                <div className="flex-1">
                  <textarea
                    ref={messageInputRef}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    rows={1}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    style={{ minHeight: '40px', maxHeight: '120px' }}
                  />
                </div>
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sendingMessage}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingMessage ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <Phone size={64} className="mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
              <p className="text-gray-500">Choose a conversation from the sidebar to start messaging</p>
            </div>
          </div>        )}
      </div>

      {/* Debug Panel */}
      {process.env.NODE_ENV === 'development' && <SocketDebugPanel />}
    </div>
  );
};

export default WhatsAppInbox;
