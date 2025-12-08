import React, { useState, useMemo } from 'react';
import { Typography, Avatar, Dropdown, Modal } from 'antd';
import { UserOutlined, MoreOutlined, RetweetOutlined, EditOutlined, DeleteOutlined, CheckOutlined } from '@ant-design/icons';
import { useReactiveVar, useMutation } from '@apollo/client';
import { userCacheVar } from '../../cache/userCacheVar';
import { DELETE_MESSAGE } from '../../graphql/chat';

const { Text } = Typography;

const Message = ({ message, onReply, onEdit, members }) => {
    const currentUser = useReactiveVar(userCacheVar);
    const [showActions, setShowActions] = useState(false);
    const isOwn = message.sender.id === currentUser?.id || message.sender.firstName === 'You';

    const [deleteMessage] = useMutation(DELETE_MESSAGE, {
        onError: (error) => {
            console.error('Error deleting message:', error);
        },
    });

    // Calculate read status
    const isRead = useMemo(() => {
        if (!members || members.length === 0 || !isOwn) return false;

        // Filter out current user
        const otherMembers = members.filter(m => m.user.id !== currentUser?.id);

        if (otherMembers.length === 0) return false;

        // Check if all other members have read this message
        // using lastReadAt timestamp comparison
        return otherMembers.every(member => {
            if (!member.lastReadAt) return false;
            return new Date(member.lastReadAt) >= new Date(message.createdAt);
        });
    }, [members, message.createdAt, isOwn, currentUser?.id]);

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    const handleDelete = () => {
        Modal.confirm({
            title: 'Delete message?',
            content: 'This message will be deleted for everyone.',
            okText: 'Delete',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: () => {
                deleteMessage({
                    variables: { messageId: message.id }
                });
            },
        });
    };

    const menuItems = [
        {
            key: 'reply',
            label: 'Reply',
            icon: <RetweetOutlined />,
            onClick: () => onReply(message),
        },
        ...(isOwn ? [
            {
                key: 'edit',
                label: 'Edit',
                icon: <EditOutlined />,
                onClick: () => onEdit(message),
            },
            {
                type: 'divider',
            },
            {
                key: 'delete',
                label: 'Delete',
                icon: <DeleteOutlined />,
                danger: true,
                onClick: handleDelete,
            },
        ] : []),
    ];

    // Check if message is deleted
    if (message.isDeleted) {
        return (
            <div
                style={{
                    display: 'flex',
                    gap: '8px',
                    marginBottom: '16px',
                    flexDirection: isOwn ? 'row-reverse' : 'row',
                    alignItems: 'flex-start',
                    opacity: 0.6
                }}
            >
                {!isOwn && (
                    <Avatar
                        size={32}
                        icon={<UserOutlined />}
                        style={{
                            backgroundColor: '#bbb',
                            flexShrink: 0
                        }}
                    />
                )}

                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        maxWidth: '75%',
                        alignItems: isOwn ? 'flex-end' : 'flex-start'
                    }}
                >
                    <div
                        style={{
                            padding: '10px 14px',
                            borderRadius: '12px',
                            backgroundColor: '#f0f0f0',
                            color: '#999',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                            fontStyle: 'italic'
                        }}
                    >
                        <DeleteOutlined style={{ marginRight: 8 }} />
                        <Text type="secondary">This message was deleted</Text>
                    </div>

                    <Text
                        type="secondary"
                        style={{
                            fontSize: '11px',
                            marginTop: '4px',
                            marginLeft: isOwn ? 0 : '8px',
                            marginRight: isOwn ? '8px' : 0
                        }}
                    >
                        {formatTime(message.createdAt)}
                    </Text>
                </div>
            </div>
        );
    }

    return (
        <div
            style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '16px',
                flexDirection: isOwn ? 'row-reverse' : 'row',
                alignItems: 'flex-start'
            }}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            {!isOwn && (
                <Avatar
                    size={32}
                    icon={<UserOutlined />}
                    style={{
                        backgroundColor: '#1890ff',
                        flexShrink: 0
                    }}
                />
            )}

            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    maxWidth: '75%',
                    alignItems: isOwn ? 'flex-end' : 'flex-start',
                    position: 'relative'
                }}
            >
                {!isOwn && (
                    <Text
                        type="secondary"
                        style={{
                            fontSize: '12px',
                            marginBottom: '4px',
                            marginLeft: '8px'
                        }}
                    >
                        {message.sender.firstName} {message.sender.lastName}
                    </Text>
                )}

                {/* Reply Preview */}
                {message.parentMessage && (
                    <div
                        style={{
                            padding: '6px 10px',
                            marginBottom: '4px',
                            borderLeft: `3px solid ${isOwn ? '#1890ff' : '#52c41a'}`,
                            backgroundColor: isOwn ? 'rgba(24,144,255,0.1)' : 'rgba(0,0,0,0.05)',
                            borderRadius: '6px',
                            fontSize: '12px'
                        }}
                    >
                        <Text type="secondary" style={{ fontSize: '11px', fontWeight: 600 }}>
                            {message.parentMessage.sender?.firstName}
                        </Text>
                        <div
                            style={{
                                color: 'rgba(0,0,0,0.65)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '200px'
                            }}
                        >
                            {message.parentMessage.content}
                        </div>
                    </div>
                )}

                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div
                        style={{
                            padding: '10px 14px',
                            borderRadius: '12px',
                            backgroundColor: isOwn ? '#1890ff' : 'white',
                            color: isOwn ? 'white' : 'rgba(0, 0, 0, 0.85)',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                            wordBreak: 'break-word'
                        }}
                    >
                        <Text style={{ color: isOwn ? 'white' : 'inherit' }}>
                            {message.content}
                        </Text>
                        {message.isEdited && (
                            <Text
                                type="secondary"
                                style={{
                                    fontSize: '11px',
                                    marginLeft: '8px',
                                    color: isOwn ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.45)',
                                    fontStyle: 'italic'
                                }}
                            >
                                (edited)
                            </Text>
                        )}
                    </div>

                    {/* Action Dropdown */}
                    {showActions && (
                        <Dropdown
                            menu={{ items: menuItems }}
                            trigger={['click']}
                            placement={isOwn ? 'bottomLeft' : 'bottomRight'}
                        >
                            <div
                                style={{
                                    cursor: 'pointer',
                                    padding: '4px',
                                    borderRadius: '4px',
                                    backgroundColor: 'rgba(0,0,0,0.05)',
                                    display: 'flex',
                                    alignItems: 'center'
                                }}
                            >
                                <MoreOutlined style={{ fontSize: 16 }} />
                            </div>
                        </Dropdown>
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <Text
                        type="secondary"
                        style={{
                            fontSize: '11px',
                            marginLeft: isOwn ? 0 : '8px',
                            marginRight: isOwn ? '8px' : 0
                        }}
                    >
                        {formatTime(message.createdAt)}
                    </Text>

                    {/* Read Receipt - Show for own messages only */}
                    {isOwn && (
                        <span style={{ fontSize: 14, color: isRead ? '#1890ff' : '#bfbfbf' }}>
                            <CheckOutlined />
                            <CheckOutlined style={{ marginLeft: -6 }} />
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Message;
