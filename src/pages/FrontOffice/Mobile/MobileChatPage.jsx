import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Input, List, Avatar, Empty, Spin, Button, Typography, Badge, Divider, Space } from 'antd';
import { SearchOutlined, UserOutlined, TeamOutlined, PlusOutlined, ArrowLeftOutlined, InfoOutlined } from '@ant-design/icons';
import { useQuery, useSubscription } from '@apollo/client';
import { GET_MY_CHAT_ROOMS, CHAT_READ_UPDATED } from '../../../graphql/chat';
import { getInitials, getAvatarColor } from '../../../utils/avatarUtils';
import MessageList from '../../../components/Chat/MessageList';
import MessageInput from '../../../components/Chat/MessageInput';
import NewChatModal from '../../../components/Chat/NewChatModal';
import GroupInfoModal from '../../../components/Chat/GroupInfoModal';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import './MobileChatPage.css';

dayjs.extend(relativeTime);

const { Text } = Typography;

/**
 * Mobile-optimized Chat page
 * Single-column layout suitable for mobile devices
 * Feature parity with desktop Messages page
 */
const MobileChatPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isGroupInfoModalOpen, setIsGroupInfoModalOpen] = useState(false);
  const [showRoomsList, setShowRoomsList] = useState(!roomId);

  const { data, loading, refetch } = useQuery(GET_MY_CHAT_ROOMS, {
    fetchPolicy: 'cache-and-network',
    nextFetchPolicy: 'cache-first',
  });

  const chatRooms = data?.myChatRooms || [];
  const currentUser = data?.me;

  // Subscribe to read receipt updates for live refresh (like desktop)
  useSubscription(CHAT_READ_UPDATED, {
    variables: { roomId: selectedRoom?.id },
    skip: !selectedRoom?.id,
    onData: ({ client }) => {
      // Update cache to refresh UI without full refetch
      client.cache.updateQuery({ query: GET_MY_CHAT_ROOMS }, (existingData) => {
        if (!existingData) return existingData;
        return { ...existingData };
      });
    },
  });

  // Hard refresh chat rooms when component mounts
  useEffect(() => {
    refetch();
  }, [refetch]);

  // Set selected room based on URL param
  useEffect(() => {
    if (roomId && chatRooms.length > 0) {
      const room = chatRooms.find(r => r.id === roomId);
      if (room) {
        setSelectedRoom(room);
        setShowRoomsList(false);
      }
    }
  }, [roomId, chatRooms]);

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
    setShowRoomsList(false);
    navigate(`/mobile/chat/${room.id}`);
  };

  const handleBackToRooms = () => {
    setShowRoomsList(true);
    navigate('/mobile/chat');
  };

  const getOtherUser = (room) => {
    if (room.type === 'direct' && room.members && currentUser) {
      const otherMember = room.members.find(m => m.user?.id !== currentUser.id);
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

  if (loading && !chatRooms.length) {
    return (
      <div className="mobile-chat-loading">
        <Spin size="large" />
      </div>
    );
  }

  // Rooms list view
  if (showRoomsList) {
    return (
      <div className="mobile-chat-container">
        {/* Search bar */}
        <div className="mobile-chat-search">
          <Input
            placeholder="Search chats..."
            prefix={<SearchOutlined />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mobile-chat-search-input"
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsNewChatModalOpen(true)}
            className="mobile-chat-new-btn"
          />
        </div>

        {/* Chats list */}
        {filteredRooms.length === 0 ? (
          <Empty
            description={searchTerm ? 'No chats found' : 'No chats yet'}
            style={{ marginTop: '40px' }}
          />
        ) : (
          <List
            dataSource={filteredRooms}
            renderItem={(room) => {
              const unreadCount = room.unreadCount || 0;
              
              return (
                <List.Item
                  className="mobile-chat-item"
                  onClick={() => handleRoomSelect(room)}
                >
                  <div className="mobile-chat-item-content">
                    {getRoomAvatar(room)}
                    <div className="mobile-chat-item-info">
                      <div className="mobile-chat-room-name">
                        {getRoomDisplayName(room)}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                        <Text
                          type="secondary"
                          ellipsis
                          style={{
                            fontSize: '12px',
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
                    </div>
                    <div className="mobile-chat-item-time">
                      {room.lastMessage?.createdAt && (
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {getLastMessageTime(room)}
                        </Text>
                      )}
                    </div>
                  </div>
                </List.Item>
              );
            }}
          />
        )}

        {/* New Chat Modal */}
        <NewChatModal
          open={isNewChatModalOpen}
          onClose={() => {
            setIsNewChatModalOpen(false);
            refetch();
          }}
          onChatCreated={(room) => {
            setIsNewChatModalOpen(false);
            refetch();
            handleRoomSelect(room);
          }}
        />
      </div>
    );
  }

  // Chat view
  if (!selectedRoom) {
    return (
      <Empty
        description="Select a chat"
        style={{ marginTop: '40px' }}
      />
    );
  }

  return (
    <div className="mobile-chat-view">
      {/* Chat header */}
      <div className="mobile-chat-header">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={handleBackToRooms}
          className="mobile-chat-back-btn"
        />
        <div className="mobile-chat-header-info">
          {getRoomAvatar(selectedRoom)}
          <div style={{ flex: 1, minWidth: 0 }}>
            <span className="mobile-chat-header-title">
              {getRoomDisplayName(selectedRoom)}
            </span>
            {selectedRoom.type === 'direct' && (() => {
              const otherUser = getOtherUser(selectedRoom);
              const isOnline = otherUser?.isOnline;
              const lastSeen = otherUser?.lastSeen;
              
              if (isOnline) {
                return (
                  <Text type="success" style={{ fontSize: '11px', display: 'block' }}>
                    Online
                  </Text>
                );
              } else if (lastSeen) {
                return (
                  <Text type="secondary" style={{ fontSize: '11px', display: 'block' }}>
                    Last seen {dayjs(lastSeen).fromNow()}
                  </Text>
                );
              } else {
                return (
                  <Text type="secondary" style={{ fontSize: '11px', display: 'block' }}>
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
            size="small"
            title="Group Info"
          />
        )}
      </div>

      {/* Messages */}
      <div className="mobile-chat-messages">
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

      {/* Message input */}
      <div className="mobile-chat-input">
        <MessageInput
          roomId={selectedRoom.id}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
          editingMessage={editingMessage}
          onCancelEdit={() => setEditingMessage(null)}
        />
      </div>

      {/* Group Info Modal */}
      {selectedRoom && (
        <GroupInfoModal 
          roomId={selectedRoom.id}
          visible={isGroupInfoModalOpen}
          onClose={() => setIsGroupInfoModalOpen(false)}
          isOwner={selectedRoom.membership?.role === 'owner'}
        />
      )}
    </div>
  );
};

export default MobileChatPage;

