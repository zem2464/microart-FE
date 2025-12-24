import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout, Input, List, Avatar, Badge, Typography, Empty, Spin, Divider } from 'antd';
import { SearchOutlined, UserOutlined, TeamOutlined } from '@ant-design/icons';
import { useQuery, useSubscription } from '@apollo/client';
import { GET_MY_CHAT_ROOMS, CHAT_READ_UPDATED } from '../../graphql/chat';
import MessageList from '../../components/Chat/MessageList';
import MessageInput from '../../components/Chat/MessageInput';
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

    const { data, loading, refetch } = useQuery(GET_MY_CHAT_ROOMS, {
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first',
    });

    const chatRooms = data?.myChatRooms || [];

    // Subscribe to read receipt updates for selected room
    useSubscription(CHAT_READ_UPDATED, {
        variables: { roomId: selectedRoom?.id },
        skip: !selectedRoom?.id,
        onData: () => {
            refetch();
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
        if (room.type === 'direct' && room.members) {
            const otherMember = room.members.find(m => m.user);
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
        if (otherUser?.profilePicture) {
            return <Avatar src={otherUser.profilePicture} />;
        }
        
        return <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#87d068' }} />;
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
        <Layout style={{ height: 'calc(100vh - 64px)', background: '#fff' }}>
            {/* Left Sidebar - Chat List */}
            <Sider
                width={350}
                style={{
                    background: '#f5f5f5',
                    borderRight: '1px solid #e0e0e0',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '16px',
                    background: '#fff',
                    borderBottom: '1px solid #e0e0e0'
                }}>
                    <Text style={{ fontSize: '20px', fontWeight: 600 }}>Messages</Text>
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
                                            avatar={
                                                <Badge count={unreadCount} size="small" offset={[-5, 5]}>
                                                    {getRoomAvatar(room)}
                                                </Badge>
                                            }
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
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Text
                                                        type="secondary"
                                                        style={{
                                                            fontSize: '13px',
                                                            fontWeight: unreadCount > 0 ? 600 : 400,
                                                            color: unreadCount > 0 ? '#000' : undefined
                                                        }}
                                                    >
                                                        {getLastMessagePreview(room)}
                                                    </Text>
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
            <Content style={{ background: '#e5ddd5', position: 'relative' }}>
                {selectedRoom ? (
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        {/* Chat Header */}
                        <div style={{
                            padding: '12px 16px',
                            background: '#f0f0f0',
                            borderBottom: '1px solid #d9d9d9',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                        }}>
                            {getRoomAvatar(selectedRoom)}
                            <div style={{ flex: 1 }}>
                                <Text strong style={{ fontSize: '16px', display: 'block' }}>
                                    {getRoomDisplayName(selectedRoom)}
                                </Text>
                                {selectedRoom.type === 'direct' && (
                                    <Text type="secondary" style={{ fontSize: '12px' }}>
                                        {getOtherUser(selectedRoom)?.isOnline ? 'Online' : 'Offline'}
                                    </Text>
                                )}
                            </div>
                        </div>

                        {/* Chat Messages */}
                        <div style={{ 
                            flex: 1, 
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column'
                        }}>
                            <div style={{ flex: 1, overflow: 'hidden' }}>
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
                            <Divider style={{ margin: 0 }} />
                            <MessageInput
                                roomId={selectedRoom.id}
                                replyingTo={replyingTo}
                                onCancelReply={() => setReplyingTo(null)}
                                editingMessage={editingMessage}
                                onCancelEdit={() => setEditingMessage(null)}
                            />
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
        </Layout>
    );
};

export default Messages;
