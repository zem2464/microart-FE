import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout, Input, List, Avatar, Badge, Typography, Empty, Spin, Divider, Button } from 'antd';
import { SearchOutlined, UserOutlined, TeamOutlined, PlusOutlined, InfoOutlined } from '@ant-design/icons';
import { useQuery, useSubscription } from '@apollo/client';
import { GET_MY_CHAT_ROOMS, CHAT_READ_UPDATED } from '../../graphql/chat';
import { getInitials, getAvatarColor } from '../../utils/avatarUtils';
import MessageList from '../../components/Chat/MessageList';
import MessageInput from '../../components/Chat/MessageInput';
import NewChatModal from '../../components/Chat/NewChatModal';
import GroupInfoModal from '../../components/Chat/GroupInfoModal';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Sider, Content } = Layout;
const { Text } = Typography;

const Messages = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [replyingTo, setReplyingTo] = useState(null);
    const [editingMessage, setEditingMessage] = useState(null);
    const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
    const [isGroupInfoModalOpen, setIsGroupInfoModalOpen] = useState(false);

    const { data, loading, refetch } = useQuery(GET_MY_CHAT_ROOMS, {
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first',
    });

    const chatRooms = data?.myChatRooms || [];
    const currentUser = data?.me;

    // Subscribe to read receipt updates for selected room
    useSubscription(CHAT_READ_UPDATED, {
        variables: { roomId: selectedRoom?.id },
        skip: !selectedRoom?.id,
        onData: ({ client }) => {
            // Update cache directly instead of refetch to avoid loader flashing
            client.cache.updateQuery({ query: GET_MY_CHAT_ROOMS }, (existingData) => {
                if (!existingData) return existingData;
                return { ...existingData };
            });
        },
    });

    // Set selected room based on URL param
    useEffect(() => {
        if (roomId && chatRooms.length > 0) {
            const room = chatRooms.find(r => r.id === roomId);
            if (room) {
                setSelectedRoom(room);
            }
        } else if (!roomId && chatRooms.length > 0) {
            // No room selected, optionally auto-select first room
            // setSelectedRoom(chatRooms[0]);
            // navigate(`/messages/${chatRooms[0].id}`);
        }
    }, [roomId, chatRooms, navigate]);

    // Filter rooms based on search
    const filteredRooms = chatRooms.filter(room => {
        if (!searchTerm) return true;
        const searchLower = searchTerm.toLowerCase();
        
        if (room.name) {
            return room.name.toLowerCase().includes(searchLower);
        }
        
        // For direct chats, search by member names
        if (room.type === 'direct' && room.members) {
            return room.members.some(member => {
                const fullName = `${member.user?.firstName || ''} ${member.user?.lastName || ''}`.toLowerCase();
                return fullName.includes(searchLower);
            });
        }
        
        return false;
    });

    const handleRoomSelect = (room) => {
        setSelectedRoom(room);
        navigate(`/messages/${room.id}`);
    };

    const getOtherUser = (room) => {
        if (room.type === 'direct' && room.members && currentUser) {
            // Find the member who is NOT the current user
            const otherMember = room.members.find(m => m.user && m.user.id !== currentUser.id);
            return otherMember?.user;
        }
        return null;
    };

    const getRoomDisplayName = (room) => {
        if (room.name) return room.name;
        
        const otherUser = getOtherUser(room);
        if (otherUser) {
            return `${otherUser.firstName} ${otherUser.lastName}`;
        }
        
        return 'Chat';
    };

    const getRoomAvatar = (room) => {
        if (room.type === 'group') {
            return <Avatar icon={<TeamOutlined />} style={{ backgroundColor: '#1890ff' }} />;
        }
        
        const otherUser = getOtherUser(room);
        const isOnline = otherUser?.isOnline;
        
        const avatar = otherUser?.profilePicture 
            ? <Avatar src={otherUser.profilePicture} />
            : (
                <Avatar 
                  style={{ backgroundColor: getAvatarColor(otherUser?.firstName, otherUser?.lastName) }}
                >
                  {getInitials(otherUser?.firstName, otherUser?.lastName)}
                </Avatar>
              );
        
        // Add online status badge for direct chats
        return (
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
                {avatar}
            </Badge>
        );
    };

    const getLastMessagePreview = (room) => {
        if (room.lastMessage) {
            const text = room.lastMessage.content || 'File';
            return text.length > 50 ? text.substring(0, 50) + '...' : text;
        }
        return 'No messages yet';
    };

    const getLastMessageTime = (room) => {
        if (room.lastMessage?.createdAt) {
            return dayjs(room.lastMessage.createdAt).fromNow();
        }
        return '';
    };

    return (
        <>
            <style>{`
                .messages-layout.ant-layout {
                    min-height: auto !important;
                }
                .messages-layout .ant-layout-sider {
                    padding: 0 !important;
                    margin: 0 !important;
                }
                .messages-layout .ant-layout-content {
                    padding: 0 !important;
                    margin: 0 !important;
                }
            `}</style>
            <Layout className="messages-layout" style={{ height: '100%', background: '#fff', overflow: 'hidden', minHeight: 'auto' }}>
            {/* Left Sidebar - Chat List */}
            <Sider
                width={350}
                style={{
                    background: '#f5f5f5',
                    borderRight: '1px solid #e0e0e0',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: 0,
                    margin: 0
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '16px',
                    background: '#fff',
                    borderBottom: '1px solid #e0e0e0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <Text style={{ fontSize: '20px', fontWeight: 600 }}>Messages</Text>
                    <Button 
                        type="primary" 
                        icon={<PlusOutlined />}
                        onClick={() => setIsNewChatModalOpen(true)}
                        size="small"
                    >
                        New Chat
                    </Button>
                </div>

                {/* Search */}
                <div style={{ padding: '12px' }}>
                    <Input
                        placeholder="Search conversations"
                        prefix={<SearchOutlined />}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ borderRadius: '20px' }}
                    />
                </div>

                {/* Chat List */}
                <div style={{ flex: 1, overflow: 'auto' }}>
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>
                            <Spin size="large" />
                        </div>
                    ) : filteredRooms.length === 0 ? (
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description="No conversations"
                            style={{ marginTop: '50px' }}
                        />
                    ) : (
                        <List
                            dataSource={filteredRooms}
                            renderItem={(room) => {
                                const isSelected = selectedRoom?.id === room.id;
                                const unreadCount = room.unreadCount || 0;

                                return (
                                    <List.Item
                                        onClick={() => handleRoomSelect(room)}
                                        style={{
                                            padding: '12px 16px',
                                            cursor: 'pointer',
                                            backgroundColor: isSelected ? '#e6f7ff' : 'transparent',
                                            borderLeft: isSelected ? '3px solid #1890ff' : '3px solid transparent',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isSelected) {
                                                e.currentTarget.style.backgroundColor = '#fafafa';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isSelected) {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                            }
                                        }}
                                    >
                                        <List.Item.Meta
                                            avatar={getRoomAvatar(room)}
                                            title={
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Text strong style={{ fontSize: '15px' }}>
                                                        {getRoomDisplayName(room)}
                                                    </Text>
                                                    <Text type="secondary" style={{ fontSize: '12px' }}>
                                                        {getLastMessageTime(room)}
                                                    </Text>
                                                </div>
                                            }
                                            description={
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                                    <Text
                                                        type="secondary"
                                                        ellipsis
                                                        style={{
                                                            fontSize: '13px',
                                                            fontWeight: unreadCount > 0 ? 600 : 400,
                                                            color: unreadCount > 0 ? '#000' : undefined,
                                                            flex: 1
                                                        }}
                                                    >
                                                        {getLastMessagePreview(room)}
                                                    </Text>
                                                    {unreadCount > 0 && (
                                                        <Badge 
                                                            count={unreadCount} 
                                                            style={{ 
                                                                backgroundColor: '#52c41a',
                                                                flexShrink: 0
                                                            }} 
                                                        />
                                                    )}
                                                </div>
                                            }
                                        />
                                    </List.Item>
                                );
                            }}
                        />
                    )}
                </div>
            </Sider>

            {/* Right Content - Chat Window */}
            <Content style={{ background: '#e5ddd5', position: 'relative', padding: '0 !important', margin: 0, overflow: 'hidden' }}>
                {selectedRoom ? (
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
                        {/* Chat Header */}
                        <div style={{
                            padding: '12px 16px',
                            background: '#f0f0f0',
                            borderBottom: '1px solid #d9d9d9',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            justifyContent: 'space-between',
                            flexShrink: 0,
                            boxSizing: 'border-box'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                {getRoomAvatar(selectedRoom)}
                                <div style={{ flex: 1 }}>
                                    <Text strong style={{ fontSize: '16px', display: 'block' }}>
                                        {getRoomDisplayName(selectedRoom)}
                                    </Text>
                                    {selectedRoom.type === 'direct' && (() => {
                                        const otherUser = getOtherUser(selectedRoom);
                                        const isOnline = otherUser?.isOnline;
                                        const lastSeen = otherUser?.lastSeen;
                                        
                                        if (isOnline) {
                                            return (
                                                <Text type="success" style={{ fontSize: '12px' }}>
                                                    Online
                                                </Text>
                                            );
                                        } else if (lastSeen) {
                                            return (
                                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                                    Last seen {dayjs(lastSeen).fromNow()}
                                                </Text>
                                            );
                                        } else {
                                            return (
                                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                                    Offline
                                                </Text>
                                            );
                                        }
                                    })()}
                                </div>
                            </div>
                            {selectedRoom.type === 'group' && (
                                <Button
                                    type="text"
                                    icon={<InfoOutlined />}
                                    onClick={() => setIsGroupInfoModalOpen(true)}
                                    title="Group Info"
                                />
                            )}
                        </div>

                        {/* Chat Messages */}
                        <div style={{ 
                            flex: 1, 
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            boxSizing: 'border-box',
                            minHeight: 0
                        }}>
                            <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
                                <MessageList
                                    roomId={selectedRoom.id}
                                    members={selectedRoom.members || []}
                                    onReply={(message) => {
                                        setReplyingTo(message);
                                        setEditingMessage(null);
                                    }}
                                    onEdit={(message) => {
                                        setEditingMessage(message);
                                        setReplyingTo(null);
                                    }}
                                />
                            </div>
                            <Divider style={{ margin: 0, padding: 0, minHeight: '1px' }} />
                            <div style={{ flexShrink: 0, boxSizing: 'border-box' }}>
                                <MessageInput
                                    roomId={selectedRoom.id}
                                    replyingTo={replyingTo}
                                    onCancelReply={() => setReplyingTo(null)}
                                    editingMessage={editingMessage}
                                    onCancelEdit={() => setEditingMessage(null)}
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{
                        height: '100%',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        background: '#f5f5f5'
                    }}>
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={
                                <div>
                                    <Text type="secondary" style={{ fontSize: '16px' }}>
                                        Select a conversation to start messaging
                                    </Text>
                                </div>
                            }
                        />
                    </div>
                )}
            </Content>
            
            {/* New Chat Modal */}
            <NewChatModal 
                visible={isNewChatModalOpen} 
                onClose={() => {
                    setIsNewChatModalOpen(false);
                    // Refetch chat rooms to show the newly created room
                    refetch();
                }}
            />

            {/* Group Info Modal */}
            {selectedRoom && (
                <GroupInfoModal 
                    roomId={selectedRoom.id}
                    visible={isGroupInfoModalOpen}
                    onClose={() => setIsGroupInfoModalOpen(false)}
                    isOwner={selectedRoom.membership?.role === 'owner'}
                />
            )}
        </Layout>
        </>
    );
};

export default Messages;
