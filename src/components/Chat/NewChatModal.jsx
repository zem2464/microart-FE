import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Modal, Input, List, Avatar, Spin, message, Badge, Typography } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { SEARCH_USERS_FOR_CHAT, CREATE_DIRECT_ROOM } from '../../graphql/chat';
import { useChatContext } from '../../contexts/ChatContext';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Text } = Typography;

const NewChatModal = ({ visible, onClose }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const { openChatWindow } = useChatContext();

    const { data, loading } = useQuery(SEARCH_USERS_FOR_CHAT, {
        variables: { query: searchQuery },
        skip: searchQuery.length < 2,
    });

    const [createDirectRoom, { loading: creating }] = useMutation(CREATE_DIRECT_ROOM, {
        onCompleted: (data) => {
            const room = data.createDirectRoom;
            const otherMember = room.members?.find(m => m.user)?.user;

            openChatWindow({
                roomId: room.id,
                name: otherMember ? `${otherMember.firstName} ${otherMember.lastName}` : room.name || 'Chat',
                type: room.type,
            });

            message.success('Chat started!');
            onClose();
            setSearchQuery('');
        },
        onError: (error) => {
            message.error(`Error starting chat: ${error.message}`);
        },
    });

    const handleUserSelect = async (userId) => {
        await createDirectRoom({
            variables: {
                input: { otherUserId: userId },
            },
        });
    };

    return (
        <Modal
            title="Start New Chat"
            open={visible}
            onCancel={onClose}
            footer={null}
            width={400}
        >
            <div className="space-y-4">
                <Input
                    placeholder="Search users by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    size="large"
                />

                {loading && (
                    <div className="flex justify-center py-4">
                        <Spin />
                    </div>
                )}

                {data?.searchUsersForChat && data.searchUsersForChat.length > 0 && (
                    <List
                        dataSource={data.searchUsersForChat}
                        renderItem={(user) => {
                            const isOnline = user.isOnline;
                            const lastSeenText = !isOnline && user.lastSeen 
                                ? `Last seen ${dayjs(user.lastSeen).fromNow()}` 
                                : user.email;
                            
                            return (
                                <List.Item
                                    key={user.id}
                                    onClick={() => !creating && handleUserSelect(user.id)}
                                    className="cursor-pointer hover:bg-gray-50 px-4 py-2 rounded transition-colors"
                                    style={{ cursor: creating ? 'wait' : 'pointer' }}
                                >
                                    <List.Item.Meta
                                        avatar={
                                            <Badge 
                                                dot 
                                                status={isOnline ? 'success' : 'default'}
                                                offset={[-5, 35]}
                                                style={{ 
                                                    backgroundColor: isOnline ? '#52c41a' : '#d9d9d9',
                                                    width: 10,
                                                    height: 10
                                                }}
                                            >
                                                <Avatar icon={<UserOutlined />} />
                                            </Badge>
                                        }
                                        title={
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <span>{`${user.firstName} ${user.lastName}`}</span>
                                                {isOnline && (
                                                    <Text type="success" style={{ fontSize: '12px' }}>
                                                        • Online
                                                    </Text>
                                                )}
                                            </div>
                                        }
                                        description={lastSeenText}
                                    />
                                </List.Item>
                            );
                        }}
                    />
                )}

                {searchQuery.length >= 2 && !loading && data?.searchUsersForChat?.length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                        No users found
                    </div>
                )}

                {searchQuery.length > 0 && searchQuery.length < 2 && (
                    <div className="text-center py-4 text-gray-400 text-sm">
                        Type at least 2 characters to search
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default NewChatModal;
