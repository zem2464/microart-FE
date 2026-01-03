import React, { useEffect, useState } from 'react';
import { useSubscription } from '@apollo/client';
import { Card, Avatar, Typography, Button, Divider, Badge } from 'antd';
import { CloseOutlined, MinusOutlined, ExpandOutlined } from '@ant-design/icons';
import { useChatContext } from '../../contexts/ChatContext';
import { CHAT_READ_UPDATED } from '../../graphql/chat';
import { getInitials, getAvatarColor } from '../../utils/avatarUtils';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

const { Text } = Typography;

const formatRelativeTime = (date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
};

const ChatWindow = ({ roomId, name, type, isMinimized }) => {
    const { closeChatWindow, toggleMinimize, unreadCounts, clearUnreadCount, chatRooms, currentUser, refetchChats } = useChatContext();
    const unreadCount = unreadCounts[roomId] || 0;

    // Subscribe to read receipt updates for this room
    useSubscription(CHAT_READ_UPDATED, {
        variables: { roomId },
        skip: !roomId,
        onData: () => {
            // When someone reads the chat, refetch the member data to update "lastReadAt"
            refetchChats();
        },
        onError: (err) => {
            console.error("Read receipt subscription error:", err);
        }
    });

    // State for reply and edit
    const [replyingTo, setReplyingTo] = useState(null);
    const [editingMessage, setEditingMessage] = useState(null);

    // Find current room and members
    const currentRoom = chatRooms.find(r => r.id === roomId);
    const members = currentRoom?.members || [];

    let statusText = '';
    let isOnline = false;
    let otherMemberName = { firstName: '', lastName: '' };

    if (type === 'direct' && currentRoom) {
        const otherMember = currentRoom.members?.find(m => m.user.id !== currentUser?.id)?.user;
        if (otherMember) {
            otherMemberName = { firstName: otherMember.firstName, lastName: otherMember.lastName };
            if (otherMember.isOnline) {
                isOnline = true;
                statusText = 'Online';
            } else if (otherMember.lastSeen) {
                statusText = `Last seen ${formatRelativeTime(new Date(otherMember.lastSeen))}`;
            }
        }
    }

    // Clear unread count when chat window is opened and not minimized
    useEffect(() => {
        if (!isMinimized && roomId) {
            clearUnreadCount(roomId);
        }
    }, [isMinimized, roomId, clearUnreadCount]);

    const handleMinimize = (e) => {
        e.stopPropagation();
        toggleMinimize(roomId);
    };

    const handleClose = (e) => {
        e.stopPropagation();
        closeChatWindow(roomId);
    };

    const handleReply = (message) => {
        setReplyingTo(message);
        setEditingMessage(null); // Clear edit mode
    };

    const handleEdit = (message) => {
        setEditingMessage(message);
        setReplyingTo(null); // Clear reply mode
    };

    const handleCancelReply = () => {
        setReplyingTo(null);
    };

    const handleCancelEdit = () => {
        setEditingMessage(null);
    };

    return (
        <Card
            className="chat-window"
            style={{
                width: 320,
                height: isMinimized ? 'auto' : 450,
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                borderRadius: '8px 8px 0 0',
                overflow: 'hidden',
            }}
            bodyStyle={isMinimized ? { display: 'none' } : {
                padding: 0,
                height: 'calc(100% - 56px)',
                display: 'flex',
                flexDirection: 'column'
            }}
            title={
                <div
                    className="flex items-center justify-between cursor-pointer select-none"
                    onClick={() => toggleMinimize(roomId)}
                    style={{ padding: '12px 0' }}
                >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="relative">
                            <Avatar 
                                size="small" 
                                style={{
                                    backgroundColor: getAvatarColor(otherMemberName.firstName, otherMemberName.lastName),
                                    flexShrink: 0,
                                    fontSize: '11px',
                                    fontWeight: 600,
                                }}
                            >
                                {getInitials(otherMemberName.firstName, otherMemberName.lastName)}
                            </Avatar>
                            {type === 'direct' && (
                                <span
                                    style={{
                                        position: 'absolute',
                                        bottom: -2,
                                        right: -2,
                                        width: 10,
                                        height: 10,
                                        borderRadius: '50%',
                                        backgroundColor: isOnline ? '#52c41a' : '#d9d9d9',
                                        border: '2px solid #1890ff'
                                    }}
                                />
                            )}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <Text strong className="text-white truncate" style={{ color: 'white', lineHeight: '1.2' }}>{name}</Text>
                            {statusText && !isMinimized && (
                                <Text className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.8)', fontSize: '10px' }}>
                                    {statusText}
                                </Text>
                            )}
                        </div>
                        {unreadCount > 0 && (
                            <Badge
                                count={unreadCount}
                                style={{
                                    backgroundColor: '#ff4d4f',
                                    boxShadow: '0 0 0 1px #fff'
                                }}
                                overflowCount={99}
                            />
                        )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                            type="text"
                            size="small"
                            icon={isMinimized ? <ExpandOutlined /> : <MinusOutlined />}
                            onClick={handleMinimize}
                            style={{ color: 'white' }}
                        />
                        <Button
                            type="text"
                            size="small"
                            icon={<CloseOutlined />}
                            onClick={handleClose}
                            style={{ color: 'white' }}
                        />
                    </div>
                </div>
            }
            headStyle={{
                backgroundColor: '#1890ff',
                color: 'white',
                padding: '0 16px',
                minHeight: 56,
                borderRadius: '8px 8px 0 0'
            }}
        >
            <div style={{
                flex: 1,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                height: '100%'
            }}>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                    <MessageList
                        roomId={roomId}
                        members={members}
                        onReply={handleReply}
                        onEdit={handleEdit}
                    />
                </div>
                <Divider style={{ margin: 0 }} />
                <MessageInput
                    roomId={roomId}
                    replyingTo={replyingTo}
                    onCancelReply={handleCancelReply}
                    editingMessage={editingMessage}
                    onCancelEdit={handleCancelEdit}
                />
            </div>
        </Card>
    );
};

export default ChatWindow;
