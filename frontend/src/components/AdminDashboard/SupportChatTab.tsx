import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { chatAPI, SupportChat, ChatMessage } from '../../services/chatService';

const SupportChatTab: React.FC = () => {
    const { t } = useTranslation('admin');
    const [chats, setChats] = useState<SupportChat[]>([]);
    const [activeChat, setActiveChat] = useState<SupportChat | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [reply, setReply] = useState('');
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadChats();
    }, [statusFilter]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Poll for new messages every 10 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            loadChats();
            if (activeChat) {
                loadMessages(activeChat._id);
            }
        }, 10000);
        return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeChat]);

    const loadChats = async () => {
        try {
            setLoading(true);
            const response = await chatAPI.adminGetChats(statusFilter !== 'all' ? statusFilter : undefined);
            if (response.success) {
                setChats(response.data.chats);
            }
        } catch (error) {
            console.error('Failed to load support chats:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadMessages = async (chatId: string) => {
        try {
            const response = await chatAPI.adminGetMessages(chatId);
            if (response.success) {
                setMessages(response.data.messages);
                setActiveChat(response.data.chat);
            }
        } catch (error) {
            console.error('Failed to load messages:', error);
        }
    };

    const openChat = async (chat: SupportChat) => {
        setActiveChat(chat);
        await loadMessages(chat._id);
    };

    const handleSendReply = async () => {
        if (!reply.trim() || !activeChat || sending) return;
        const replyText = reply.trim();
        setReply('');
        setSending(true);
        try {
            const response = await chatAPI.adminSendMessage(activeChat._id, replyText);
            if (response.success) {
                setMessages(prev => [...prev, response.data]);
                loadChats(); // Refresh chat list
            }
        } catch (error) {
            console.error('Failed to send reply:', error);
            setReply(replyText);
        } finally {
            setSending(false);
        }
    };

    const handleAssign = async (chatId: string) => {
        try {
            await chatAPI.adminAssign(chatId);
            loadChats();
            if (activeChat?._id === chatId) {
                loadMessages(chatId);
            }
        } catch (error) {
            console.error('Failed to assign chat:', error);
        }
    };

    const handleResolve = async (chatId: string) => {
        try {
            await chatAPI.adminResolve(chatId);
            loadChats();
            if (activeChat?._id === chatId) {
                setActiveChat(prev => prev ? { ...prev, status: 'resolved' } : null);
            }
        } catch (error) {
            console.error('Failed to resolve chat:', error);
        }
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'open': return '#2563eb';
            case 'assigned': return '#d97706';
            case 'resolved': return '#059669';
            case 'closed': return '#6b7280';
            default: return '#6b7280';
        }
    };

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 80px)', gap: '0' }}>
            {/* Chat List Sidebar */}
            <div style={{
                width: '380px',
                borderRight: '1px solid #e5e7eb',
                display: 'flex',
                flexDirection: 'column',
                background: '#fff',
                flexShrink: 0
            }}>
                {/* Filters */}
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {['all', 'open', 'assigned', 'resolved', 'closed'].map(status => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            style={{
                                padding: '4px 12px',
                                borderRadius: '16px',
                                border: '1px solid',
                                borderColor: statusFilter === status ? '#f97316' : '#d1d5db',
                                background: statusFilter === status ? '#fff7ed' : '#fff',
                                color: statusFilter === status ? '#f97316' : '#6b7280',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                textTransform: 'capitalize'
                            }}
                        >
                            {status}
                        </button>
                    ))}
                </div>

                {/* Chat List */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {loading && chats.length === 0 ? (
                        <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>Loading...</div>
                    ) : chats.length === 0 ? (
                        <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>
                            No support chats found
                        </div>
                    ) : (
                        chats.map(chat => (
                            <div
                                key={chat._id}
                                onClick={() => openChat(chat)}
                                style={{
                                    padding: '12px 16px',
                                    borderBottom: '1px solid #f3f4f6',
                                    cursor: 'pointer',
                                    background: activeChat?._id === chat._id ? '#fff7ed' : chat.unreadByAdmin > 0 ? '#fffbeb' : '#fff',
                                    transition: 'background 0.15s'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                                    <span style={{ fontWeight: 600, fontSize: '14px', color: '#1f2937' }}>
                                        {chat.subject}
                                    </span>
                                    <span style={{
                                        fontSize: '10px',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        fontWeight: 600,
                                        color: getStatusColor(chat.status),
                                        background: `${getStatusColor(chat.status)}15`,
                                        textTransform: 'uppercase'
                                    }}>
                                        {chat.status}
                                    </span>
                                </div>
                                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                                    {typeof chat.userId === 'object' && chat.userId ? (chat.userId.name || chat.userId.email) : (chat.guestName ? `👤 ${chat.guestName} (Guest)` : 'Guest')}
                                    {' · '}{chat.topic}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '12px', color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                                        {chat.lastMessagePreview}
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '11px', color: '#9ca3af' }}>{formatTime(chat.lastMessageAt)}</span>
                                        {chat.unreadByAdmin > 0 && (
                                            <span style={{
                                                background: '#f97316',
                                                color: '#fff',
                                                fontSize: '10px',
                                                fontWeight: 700,
                                                minWidth: '18px',
                                                height: '18px',
                                                borderRadius: '9px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                {chat.unreadByAdmin}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fafafa' }}>
                {!activeChat ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '48px', marginBottom: '12px' }}>💬</div>
                            <p>Select a conversation to view</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Chat Header */}
                        <div style={{
                            padding: '12px 20px',
                            borderBottom: '1px solid #e5e7eb',
                            background: '#fff',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '15px' }}>{activeChat.subject}</div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                    {typeof activeChat.userId === 'object' && activeChat.userId ? `${activeChat.userId.name} · ${activeChat.userId.email}` : (activeChat.guestName ? `👤 ${activeChat.guestName} (Guest)` : 'Guest')}
                                    {' · '}{activeChat.topic}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {activeChat.status === 'open' && (
                                    <button
                                        onClick={() => handleAssign(activeChat._id)}
                                        style={{
                                            padding: '6px 14px',
                                            borderRadius: '6px',
                                            border: '1px solid #d1d5db',
                                            background: '#fff',
                                            color: '#374151',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Assign to Me
                                    </button>
                                )}
                                {(activeChat.status === 'open' || activeChat.status === 'assigned') && (
                                    <button
                                        onClick={() => handleResolve(activeChat._id)}
                                        style={{
                                            padding: '6px 14px',
                                            borderRadius: '6px',
                                            border: 'none',
                                            background: '#059669',
                                            color: '#fff',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ✓ Resolve
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Messages */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {messages.map(msg => (
                                <div
                                    key={msg._id}
                                    style={{
                                        alignSelf: msg.sender === 'admin' ? 'flex-end' : 'flex-start',
                                        maxWidth: '70%',
                                        padding: '10px 14px',
                                        borderRadius: msg.sender === 'admin' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                                        background: msg.sender === 'admin' ? 'linear-gradient(135deg, #f97316, #ea580c)' : '#fff',
                                        color: msg.sender === 'admin' ? '#fff' : '#1f2937',
                                        border: msg.sender === 'user' ? '1px solid #e5e7eb' : 'none',
                                        fontSize: '13px',
                                        lineHeight: '1.4'
                                    }}
                                >
                                    <div style={{ fontWeight: 600, fontSize: '11px', marginBottom: '4px', opacity: 0.8 }}>
                                        {typeof msg.senderUserId === 'object' && msg.senderUserId ? msg.senderUserId.name : (msg.sender === 'user' ? 'Guest' : msg.sender)}
                                    </div>
                                    <div>{msg.message}</div>
                                    <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.7 }}>
                                        {formatTime(msg.createdAt)}
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Reply Input */}
                        {activeChat.status !== 'closed' && activeChat.status !== 'resolved' && (
                            <div style={{
                                padding: '12px 20px',
                                borderTop: '1px solid #e5e7eb',
                                background: '#fff',
                                display: 'flex',
                                gap: '8px',
                                alignItems: 'flex-end'
                            }}>
                                <textarea
                                    value={reply}
                                    onChange={e => setReply(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendReply();
                                        }
                                    }}
                                    placeholder="Type a reply..."
                                    rows={1}
                                    style={{
                                        flex: 1,
                                        border: '1px solid #d1d5db',
                                        borderRadius: '10px',
                                        padding: '8px 12px',
                                        fontSize: '13px',
                                        resize: 'none',
                                        outline: 'none',
                                        fontFamily: 'inherit',
                                        maxHeight: '80px'
                                    }}
                                />
                                <button
                                    onClick={handleSendReply}
                                    disabled={!reply.trim() || sending}
                                    style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #f97316, #ea580c)',
                                        border: 'none',
                                        color: '#fff',
                                        cursor: reply.trim() && !sending ? 'pointer' : 'not-allowed',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        opacity: reply.trim() && !sending ? 1 : 0.5,
                                        flexShrink: 0
                                    }}
                                >
                                    ➤
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default SupportChatTab;
