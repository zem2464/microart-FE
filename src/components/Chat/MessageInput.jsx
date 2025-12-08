import React, { useState, useRef, useEffect } from 'react';
import { useMutation } from '@apollo/client';
import { Input, Button, Tag, Space } from 'antd';
import { SendOutlined, CloseOutlined } from '@ant-design/icons';
import { SEND_MESSAGE, EDIT_MESSAGE, GET_CHAT_MESSAGES } from '../../graphql/chat';

const { TextArea } = Input;

const MessageInput = ({ roomId, replyingTo, onCancelReply, editingMessage, onCancelEdit }) => {
    const [message, setMessage] = useState('');
    const inputRef = useRef(null);

    // Populate input when editing
    useEffect(() => {
        if (editingMessage) {
            setMessage(editingMessage.content);
            inputRef.current?.focus();
        }
    }, [editingMessage]);

    const [sendMessage, { loading: sending }] = useMutation(SEND_MESSAGE, {
        update(cache, { data: { sendMessage: newMessage } }) {
            try {
                const existing = cache.readQuery({
                    query: GET_CHAT_MESSAGES,
                    variables: { roomId, limit: 50 }
                });

                if (existing?.chatMessages) {
                    cache.writeQuery({
                        query: GET_CHAT_MESSAGES,
                        variables: { roomId, limit: 50 },
                        data: {
                            chatMessages: [...existing.chatMessages, newMessage]
                        }
                    });
                }
            } catch (e) {
                console.log('Chat messages not in cache yet');
            }
        },
        onCompleted: () => {
            setMessage('');
            onCancelReply?.();
            // Fix: Maintain focus after sending
            setTimeout(() => inputRef.current?.focus(), 0);
        },
        onError: (error) => {
            console.error('Error sending message:', error);
        },
    });

    const [editMessage, { loading: editing }] = useMutation(EDIT_MESSAGE, {
        onCompleted: () => {
            setMessage('');
            onCancelEdit?.();
            setTimeout(() => inputRef.current?.focus(), 0);
        },
        onError: (error) => {
            console.error('Error editing message:', error);
        },
    });

    const handleSend = () => {
        if (!message.trim() || !roomId) return;

        if (editingMessage) {
            // Edit existing message
            editMessage({
                variables: {
                    input: {
                        messageId: editingMessage.id,
                        content: message.trim(),
                    },
                },
            });
        } else {
            // Send new message
            sendMessage({
                variables: {
                    input: {
                        roomId,
                        content: message.trim(),
                        parentMessageId: replyingTo?.id || null,
                    },
                },
            });
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        } else if (e.key === 'Escape') {
            if (editingMessage) {
                onCancelEdit?.();
            } else if (replyingTo) {
                onCancelReply?.();
            }
        }
    };

    const handleCancel = () => {
        if (editingMessage) {
            setMessage('');
            onCancelEdit?.();
        } else if (replyingTo) {
            onCancelReply?.();
        }
    };

    const loading = sending || editing;

    return (
        <div className="border-t bg-white">
            {/* Reply/Edit Preview */}
            {(replyingTo || editingMessage) && (
                <div className="px-3 pt-2 pb-1 bg-gray-50 border-b">
                    <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                            <Space direction="vertical" size={0} className="w-full">
                                <Tag color={editingMessage ? 'blue' : 'green'} className="mb-1">
                                    {editingMessage ? 'Editing message' : `Replying to ${replyingTo?.sender?.firstName}`}
                                </Tag>
                                <div className="text-sm text-gray-600 truncate">
                                    {editingMessage?.content || replyingTo?.content}
                                </div>
                            </Space>
                        </div>
                        <Button
                            type="text"
                            size="small"
                            icon={<CloseOutlined />}
                            onClick={handleCancel}
                        />
                    </div>
                </div>
            )}

            {/* Input Area */}
            <div className="p-3">
                <div className="flex items-end gap-2">
                    <TextArea
                        ref={inputRef}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={editingMessage ? 'Edit message...' : 'Type a message...'}
                        autoSize={{ minRows: 1, maxRows: 3 }}
                        className="flex-1"
                        disabled={loading}
                        autoFocus
                    />
                    <Button
                        type="primary"
                        icon={<SendOutlined />}
                        onClick={handleSend}
                        disabled={!message.trim() || loading}
                        loading={loading}
                    >
                        {editingMessage ? 'Update' : 'Send'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default MessageInput;
