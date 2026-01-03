import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Modal, Input, List, Avatar, Spin, message, Badge, Typography, Tabs, Button, Checkbox, Form } from 'antd';
import { SEARCH_USERS_FOR_CHAT, CREATE_DIRECT_ROOM, CREATE_GROUP_ROOM, GET_MY_CHAT_ROOMS } from '../../graphql/chat';
import { getInitials, getAvatarColor } from '../../utils/avatarUtils';
import { useChatContext } from '../../contexts/ChatContext';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Text } = Typography;
const { TextArea } = Input;

const NewChatModal = ({ visible, onClose }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('direct'); // 'direct' or 'group'
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [groupName, setGroupName] = useState('');
    const [groupDescription, setGroupDescription] = useState('');
    const { openChatWindow } = useChatContext();

    const { data, loading } = useQuery(SEARCH_USERS_FOR_CHAT, {
        variables: { query: searchQuery },
        skip: searchQuery.length < 2,
    });

    const [createDirectRoom, { loading: creatingDirect }] = useMutation(CREATE_DIRECT_ROOM, {
        refetchQueries: [{ query: GET_MY_CHAT_ROOMS }],
        onCompleted: (data) => {
            const room = data.createDirectRoom;
            const otherMember = room.members?.find(m => m.user)?.user;

            openChatWindow({
                roomId: room.id,
                name: otherMember ? `${otherMember.firstName} ${otherMember.lastName}` : room.name || 'Chat',
                type: room.type,
            });

            message.success('Chat started!');
            handleClose();
        },
        onError: (error) => {
            message.error(`Error starting chat: ${error.message}`);
        },
    });

    const [createGroupRoom, { loading: creatingGroup }] = useMutation(CREATE_GROUP_ROOM, {
        refetchQueries: [{ query: GET_MY_CHAT_ROOMS }],
        onCompleted: (data) => {
            const room = data.createGroupRoom;

            openChatWindow({
                roomId: room.id,
                name: room.name || 'Group Chat',
                type: room.type,
            });

            message.success('Group chat created!');
            handleClose();
        },
        onError: (error) => {
            message.error(`Error creating group: ${error.message}`);
        },
    });

    const handleClose = () => {
        onClose();
        setSearchQuery('');
        setActiveTab('direct');
        setSelectedUsers([]);
        setGroupName('');
        setGroupDescription('');
    };

    const handleUserSelect = async (userId) => {
        if (activeTab === 'direct') {
            await createDirectRoom({
                variables: {
                    input: { otherUserId: userId },
                },
            });
        } else {
            // Toggle user selection for group chat
            setSelectedUsers(prev => 
                prev.includes(userId) 
                    ? prev.filter(id => id !== userId)
                    : [...prev, userId]
            );
        }
    };

    const handleCreateGroup = async () => {
        if (!groupName.trim()) {
            message.error('Please enter a group name');
            return;
        }
        if (selectedUsers.length === 0) {
            message.error('Please select at least one member');
            return;
        }

        await createGroupRoom({
            variables: {
                input: {
                    name: groupName.trim(),
                    description: groupDescription.trim() || null,
                    memberUserIds: selectedUsers,
                },
            },
        });
    };

    const renderUserList = () => {
        if (loading) {
            return (
                <div className="flex justify-center py-4">
                    <Spin />
                </div>
            );
        }

        if (data?.searchUsersForChat && data.searchUsersForChat.length > 0) {
            return (
                <List
                    dataSource={data.searchUsersForChat}
                    renderItem={(user) => {
                        const isOnline = user.isOnline;
                        const lastSeenText = !isOnline && user.lastSeen 
                            ? `Last seen ${dayjs(user.lastSeen).fromNow()}` 
                            : user.email;
                        const isSelected = selectedUsers.includes(user.id);
                        const isCreating = creatingDirect || creatingGroup;
                        
                        return (
                            <List.Item
                                key={user.id}
                                onClick={() => !isCreating && handleUserSelect(user.id)}
                                className="cursor-pointer hover:bg-gray-50 px-4 py-2 rounded transition-colors"
                                style={{ 
                                    cursor: isCreating ? 'wait' : 'pointer',
                                    backgroundColor: isSelected ? '#e6f7ff' : undefined,
                                }}
                            >
                                {activeTab === 'group' && (
                                    <Checkbox 
                                        checked={isSelected} 
                                        style={{ marginRight: 8 }}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                )}
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
                                            <Avatar 
                                                style={{
                                                    backgroundColor: getAvatarColor(user.firstName, user.lastName),
                                                    fontSize: '12px',
                                                    fontWeight: 600,
                                                }}
                                            >
                                                {getInitials(user.firstName, user.lastName)}
                                            </Avatar>
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
            );
        }

        if (searchQuery.length >= 2 && !loading && data?.searchUsersForChat?.length === 0) {
            return (
                <div className="text-center py-4 text-gray-500">
                    No users found
                </div>
            );
        }

        if (searchQuery.length > 0 && searchQuery.length < 2) {
            return (
                <div className="text-center py-4 text-gray-400 text-sm">
                    Type at least 2 characters to search
                </div>
            );
        }

        return null;
    };

    const directChatContent = (
        <div className="space-y-4">
            <Input
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                size="large"
            />
            {renderUserList()}
        </div>
    );

    const groupChatContent = (
        <div className="space-y-4">
            <Form layout="vertical">
                <Form.Item label="Group Name" required>
                    <Input
                        placeholder="Enter group name..."
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        size="large"
                    />
                </Form.Item>
                <Form.Item label="Description (Optional)">
                    <TextArea
                        placeholder="Enter group description..."
                        value={groupDescription}
                        onChange={(e) => setGroupDescription(e.target.value)}
                        rows={2}
                    />
                </Form.Item>
            </Form>

            <div>
                <Text strong>Add Members</Text>
                <Input
                    placeholder="Search users by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    size="large"
                    style={{ marginTop: 8 }}
                />
            </div>

            {selectedUsers.length > 0 && (
                <div>
                    <Text type="secondary">
                        {selectedUsers.length} member{selectedUsers.length !== 1 ? 's' : ''} selected
                    </Text>
                </div>
            )}

            {renderUserList()}

            <Button
                type="primary"
                block
                size="large"
                onClick={handleCreateGroup}
                loading={creatingGroup}
                disabled={!groupName.trim() || selectedUsers.length === 0}
            >
                Create Group Chat
            </Button>
        </div>
    );

    return (
        <Modal
            title="Start New Chat"
            open={visible}
            onCancel={handleClose}
            footer={null}
            width={500}
        >
            <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={[
                    {
                        key: 'direct',
                        label: 'Direct Message',
                        children: directChatContent,
                    },
                    {
                        key: 'group',
                        label: 'Create Group',
                        children: groupChatContent,
                    },
                ]}
            />
        </Modal>
    );
};

export default NewChatModal;
