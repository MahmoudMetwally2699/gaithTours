import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { chatAPI, SupportChat, ChatMessage, getGuestId } from '../services/chatService';
import io, { Socket } from 'socket.io-client';
import './ChatWidget.css';

const ChatWidget: React.FC = () => {
    const { t } = useTranslation('common');
    const { user, isAuthenticated } = useAuth();

    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState<'list' | 'chat' | 'new'>('list');
    const [chats, setChats] = useState<SupportChat[]>([]);
    const [activeChat, setActiveChat] = useState<SupportChat | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(false);

    // New chat form
    const [newSubject, setNewSubject] = useState('');
    const [newTopic, setNewTopic] = useState('general');
    const [newFirstMessage, setNewFirstMessage] = useState('');
    const [guestName, setGuestName] = useState('');

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const socketRef = useRef<Socket | null>(null);

    const totalUnread = chats.reduce((sum, c) => sum + c.unreadByUser, 0);

    // Don't show for admins
    const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'sub_admin';

    // Connect to support socket (for both authenticated users and guests)
    useEffect(() => {
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
        const url = new URL(apiUrl);
        const socketUrl = url.origin;

        const authOptions: any = {};
        if (isAuthenticated && user) {
            const token = localStorage.getItem('token');
            if (token) authOptions.token = token;
        } else {
            authOptions.guestId = getGuestId();
        }

        const socket = io(`${socketUrl}/support`, {
            auth: authOptions,
            transports: ['polling'],
            timeout: 30000,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 2000,
            upgrade: false,
        });

        socket.on('connect', () => {
            console.log('💬 Support chat socket connected');
        });

        socket.on('new_support_message', (data: { chatId: string; message: ChatMessage }) => {
            // Update message list if viewing this chat
            setMessages(prev => {
                if (prev.length > 0 && prev[0]?.chatId === data.chatId) {
                    return [...prev, data.message];
                }
                return prev;
            });

            // Update chat list
            setChats(prev => prev.map(c => {
                if (c._id === data.chatId) {
                    return {
                        ...c,
                        lastMessagePreview: data.message.message.substring(0, 100),
                        lastMessageAt: data.message.createdAt,
                        unreadByUser: activeChat?._id === data.chatId ? c.unreadByUser : c.unreadByUser + 1
                    };
                }
                return c;
            }));
        });

        socket.on('support_chat_resolved', (data: { chatId: string }) => {
            setChats(prev => prev.map(c => c._id === data.chatId ? { ...c, status: 'resolved' } : c));
            setActiveChat(prev => prev && prev._id === data.chatId ? { ...prev, status: 'resolved' } : prev);
        });

        socket.on('connect_error', (err) => {
            console.log('Support socket connect error:', err.message);
        });

        socketRef.current = socket;

        return () => {
            socket.close();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, user]);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Load chats when widget opens
    const loadChats = useCallback(async () => {
        try {
            setLoading(true);
            const response = await chatAPI.getMyChats(isAuthenticated);
            if (response.success) {
                setChats(response.data);
            }
        } catch (error) {
            console.error('Failed to load chats:', error);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        if (isOpen) {
            loadChats();
        }
    }, [isOpen, loadChats]);

    // Open a chat
    const openChat = async (chat: SupportChat) => {
        setActiveChat(chat);
        setView('chat');
        try {
            const response = await chatAPI.getChatMessages(chat._id, isAuthenticated);
            if (response.success) {
                setMessages(response.data.messages);
                // Mark as read locally
                setChats(prev => prev.map(c => c._id === chat._id ? { ...c, unreadByUser: 0 } : c));
            }
        } catch (error) {
            console.error('Failed to load messages:', error);
        }
    };

    // Send a message
    const handleSend = async () => {
        if (!newMessage.trim() || !activeChat || sending) return;
        const msgText = newMessage.trim();
        setNewMessage('');
        setSending(true);

        try {
            const response = await chatAPI.sendMessage(activeChat._id, msgText, isAuthenticated);
            if (response.success) {
                setMessages(prev => [...prev, response.data]);
                setChats(prev => prev.map(c => c._id === activeChat._id ? {
                    ...c,
                    lastMessagePreview: msgText.substring(0, 100),
                    lastMessageAt: new Date().toISOString()
                } : c));
            }
        } catch (error) {
            console.error('Failed to send message:', error);
            setNewMessage(msgText); // Restore message on error
        } finally {
            setSending(false);
        }
    };

    // Create new chat
    const handleCreateChat = async () => {
        if (!newSubject.trim() || !newFirstMessage.trim() || sending) return;
        // Guest users need a name
        if (!isAuthenticated && !guestName.trim()) return;
        setSending(true);
        try {
            const response = await chatAPI.createChat(
                newSubject.trim(),
                newTopic,
                newFirstMessage.trim(),
                isAuthenticated,
                !isAuthenticated ? guestName.trim() : undefined
            );
            if (response.success) {
                setChats(prev => [response.data.chat, ...prev]);
                setActiveChat(response.data.chat);
                setMessages([response.data.message]);
                setView('chat');
                setNewSubject('');
                setNewFirstMessage('');
                setNewTopic('general');
                setGuestName('');
            }
        } catch (error) {
            console.error('Failed to create chat:', error);
        } finally {
            setSending(false);
        }
    };

    // Close chat
    const handleCloseChat = async () => {
        if (!activeChat) return;
        try {
            await chatAPI.closeChat(activeChat._id, isAuthenticated);
            setChats(prev => prev.map(c => c._id === activeChat._id ? { ...c, status: 'closed' } : c));
            setActiveChat(prev => prev ? { ...prev, status: 'closed' } : null);
        } catch (error) {
            console.error('Failed to close chat:', error);
        }
    };

    // Key press handler
    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Format time
    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return t('chat.justNow', 'Just now');
        if (diffMins < 60) return `${diffMins}m`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h`;
        return date.toLocaleDateString();
    };

    // Hide for admins only
    if (isAdmin) return null;

    return (
        <>
            {/* Floating Trigger Button */}
            <button
                className="chat-widget-trigger"
                onClick={() => setIsOpen(!isOpen)}
                aria-label={t('supportChat.title', 'Support Chat')}
            >
                {isOpen ? '✕' : '💬'}
                {totalUnread > 0 && !isOpen && (
                    <span className="chat-badge">{totalUnread}</span>
                )}
            </button>

            {/* Chat Panel */}
            {isOpen && (
                <div className="chat-widget-panel">
                    {/* Header */}
                    <div className="chat-widget-header">
                        <h3>
                            {view === 'new'
                                ? t('supportChat.newChat', 'New Conversation')
                                : view === 'chat' && activeChat
                                    ? activeChat.subject
                                    : t('supportChat.title', 'Support Chat')
                            }
                        </h3>
                        <div className="chat-widget-header-actions">
                            {view !== 'list' && (
                                <button onClick={() => { setView('list'); setActiveChat(null); setMessages([]); }}>
                                    ←
                                </button>
                            )}
                            {view === 'chat' && activeChat && activeChat.status !== 'closed' && activeChat.status !== 'resolved' && (
                                <button onClick={handleCloseChat} title={t('supportChat.closeChat', 'Close Chat')}>
                                    ✓
                                </button>
                            )}
                            <button
                                onClick={() => setIsOpen(false)}
                                className="chat-close-btn"
                                title={t('supportChat.closeChat', 'Close')}
                            >
                                ✕
                            </button>
                        </div>
                    </div>

                    {/* View: Chat List */}
                    {view === 'list' && (
                        <>
                            <div className="chat-list">
                                {loading ? (
                                    <div className="chat-empty">
                                        <p>⏳</p>
                                    </div>
                                ) : chats.length === 0 ? (
                                    <div className="chat-empty">
                                        <div className="chat-empty-icon">💬</div>
                                        <p>{t('supportChat.noChats', 'No conversations yet')}</p>
                                        <button onClick={() => setView('new')}>
                                            {t('supportChat.start', 'Start Chat')}
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        {chats.map(chat => (
                                            <div
                                                key={chat._id}
                                                className={`chat-list-item ${chat.unreadByUser > 0 ? 'has-unread' : ''}`}
                                                onClick={() => openChat(chat)}
                                            >
                                                <div className="chat-list-item-content">
                                                    <div className="chat-list-subject">{chat.subject}</div>
                                                    <div className="chat-list-preview">{chat.lastMessagePreview}</div>
                                                </div>
                                                <div className="chat-list-meta">
                                                    <span className="chat-list-time">{formatTime(chat.lastMessageAt)}</span>
                                                    {chat.unreadByUser > 0 && (
                                                        <span className="chat-list-unread">{chat.unreadByUser}</span>
                                                    )}
                                                    <span className={`chat-list-status ${chat.status}`}>
                                                        {t(`supportChat.status.${chat.status}`, chat.status)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                        <div style={{ padding: '8px', textAlign: 'center' }}>
                                            <button
                                                className="chat-new-form-submit"
                                                style={{ width: '100%' }}
                                                onClick={() => setView('new')}
                                            >
                                                + {t('supportChat.start', 'Start Chat')}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </>
                    )}

                    {/* View: New Chat */}
                    {view === 'new' && (
                        <div className="chat-new-form">
                            {/* Guest name field - only shown when not logged in */}
                            {!isAuthenticated && (
                                <div>
                                    <label>{t('supportChat.guestName', 'Your Name')}</label>
                                    <input
                                        type="text"
                                        value={guestName}
                                        onChange={e => setGuestName(e.target.value)}
                                        placeholder={t('supportChat.guestNamePlaceholder', 'Enter your name')}
                                        maxLength={100}
                                    />
                                </div>
                            )}
                            {/* Topic selector - only for logged-in users */}
                            {isAuthenticated && (
                            <div>
                                <label>{t('supportChat.topic', 'Topic')}</label>
                                <select value={newTopic} onChange={e => setNewTopic(e.target.value)}>
                                    <option value="general">{t('supportChat.topics.general', 'General')}</option>
                                    <option value="booking">{t('supportChat.topics.booking', 'Booking')}</option>
                                    <option value="payment">{t('supportChat.topics.payment', 'Payment')}</option>
                                    <option value="technical">{t('supportChat.topics.technical', 'Technical Support')}</option>
                                    <option value="other">{t('supportChat.topics.other', 'Other')}</option>
                                </select>
                            </div>
                            )}
                            <div>
                                <label>{t('supportChat.subject', 'Subject')}</label>
                                <input
                                    type="text"
                                    value={newSubject}
                                    onChange={e => setNewSubject(e.target.value)}
                                    placeholder={t('supportChat.subjectPlaceholder', 'Brief description of your issue')}
                                    maxLength={200}
                                />
                            </div>
                            <div>
                                <label>{t('supportChat.message', 'Message')}</label>
                                <textarea
                                    value={newFirstMessage}
                                    onChange={e => setNewFirstMessage(e.target.value)}
                                    placeholder={t('supportChat.messagePlaceholder', 'How can we help you?')}
                                    maxLength={2000}
                                />
                            </div>
                            <button
                                className="chat-new-form-submit"
                                onClick={handleCreateChat}
                                disabled={
                                    !newSubject.trim() || !newFirstMessage.trim() || sending ||
                                    (!isAuthenticated && !guestName.trim())
                                }
                            >
                                {sending ? '...' : t('supportChat.send', 'Send')}
                            </button>
                        </div>
                    )}

                    {/* View: Chat Conversation */}
                    {view === 'chat' && activeChat && (
                        <>
                            {(activeChat.status === 'resolved' || activeChat.status === 'closed') && (
                                <div className="chat-resolved-banner">
                                    {t(`supportChat.status.${activeChat.status}`, activeChat.status === 'resolved' ? 'Resolved' : 'Closed')}
                                </div>
                            )}
                            <div className="chat-messages">
                                {messages.map(msg => (
                                    <div key={msg._id} className={`chat-message ${msg.sender}`}>
                                        <div>{msg.message}</div>
                                        <span className="chat-message-time">{formatTime(msg.createdAt)}</span>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>
                            {activeChat.status !== 'closed' && (
                                <div className="chat-input-area">
                                    <textarea
                                        value={newMessage}
                                        onChange={e => setNewMessage(e.target.value)}
                                        onKeyDown={handleKeyPress}
                                        placeholder={t('supportChat.messagePlaceholder', 'Type a message...')}
                                        rows={1}
                                        maxLength={2000}
                                    />
                                    <button
                                        className="chat-input-send"
                                        onClick={handleSend}
                                        disabled={!newMessage.trim() || sending}
                                        title={t('supportChat.send', 'Send')}
                                    >
                                        ➤
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </>
    );
};

export default ChatWidget;
