import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Input, List, Avatar, Empty, Spin, Button, Drawer, Divider, Typography } from 'antd';
import { SearchOutlined, UserOutlined, TeamOutlined, PlusOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useQuery } from '@apollo/client';
import { GET_MY_CHAT_ROOMS } from '../../../graphql/chat';
import { getInitials, getAvatarColor } from '../../../utils/avatarUtils';
import MessageList from '../../../components/Chat/MessageList';
import MessageInput from '../../../components/Chat/MessageInput';
import NewChatModal from '../../../components/Chat/NewChatModal';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import './MobileChatPage.css';

dayjs.extend(relativeTime);

const { Text } = Typography;

/**
 * Mobile-optimized Chat page
 * Single-column layout suitable for mobile devices
 */
const MobileChatPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [showRoomsList, setShowRoomsList] = useState(!roomId);

  const { data, loading, refetch } = useQuery(GET_MY_CHAT_ROOMS, {
    fetchPolicy: 'cache-and-network',
    nextFetchPolicy: 'cache-first',
  });

  const chatRooms = data?.myChatRooms || [];
  const currentUser = data?.me;

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

  const getRoomDisplayName = (room) => {
    if (room.name) return room.name;
    if (room.type === 'direct' && room.members) {
      const otherMembers = room.members.filter(m => m.user?.id !== currentUser?.id);
      return otherMembers.map(m => `${m.user?.firstName || ''} ${m.user?.lastName || ''}`.trim()).join(', ');
    }
    return 'Chat';
  };

  const getRoomAvatar = (room) => {
    if (room.avatar) return room.avatar;
    
    if (room.type === 'group') {
      return <TeamOutlined />;
    }
    
    if (room.type === 'direct' && room.members) {
      const otherMember = room.members.find(m => m.user?.id !== currentUser?.id);
      if (otherMember?.user) {
        return getInitials(`${otherMember.user.firstName || ''} ${otherMember.user.lastName || ''}`.trim());
      }
    }
    
    return <UserOutlined />;
  };

  const getLastMessagePreview = (room) => {
    if (!room.lastMessage) return 'No messages yet';
    
    const message = room.lastMessage;
    const isCurrentUser = message.sender?.id === currentUser?.id;
    const prefix = isCurrentUser ? 'You: ' : '';
    
    if (message.type === 'text') {
      return prefix + (message.content || '');
    }
    return prefix + '[Attachment]';
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
            renderItem={(room) => (
              <List.Item
                className="mobile-chat-item"
                onClick={() => handleRoomSelect(room)}
              >
                <div className="mobile-chat-item-content">
                  <Avatar
                    size="large"
                    style={{ backgroundColor: getAvatarColor(room.id) }}
                    icon={getRoomAvatar(room)}
                  >
                    {typeof getRoomAvatar(room) === 'string' && getRoomAvatar(room)}
                  </Avatar>
                  <div className="mobile-chat-item-info">
                    <div className="mobile-chat-room-name">
                      {getRoomDisplayName(room)}
                    </div>
                    <div className="mobile-chat-last-message">
                      {getLastMessagePreview(room)}
                    </div>
                  </div>
                  <div className="mobile-chat-item-time">
                    {room.lastMessage?.createdAt && (
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {dayjs(room.lastMessage.createdAt).fromNow()}
                      </Text>
                    )}
                  </div>
                </div>
              </List.Item>
            )}
          />
        )}

        {/* New Chat Modal */}
        <NewChatModal
          open={isNewChatModalOpen}
          onClose={() => setIsNewChatModalOpen(false)}
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
          <Avatar
            size="small"
            style={{ backgroundColor: getAvatarColor(selectedRoom.id) }}
            icon={getRoomAvatar(selectedRoom)}
          >
            {typeof getRoomAvatar(selectedRoom) === 'string' && getRoomAvatar(selectedRoom)}
          </Avatar>
          <span className="mobile-chat-header-title">
            {getRoomDisplayName(selectedRoom)}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="mobile-chat-messages">
        <MessageList
          room={selectedRoom}
          currentUser={currentUser}
          replyingTo={replyingTo}
          editingMessage={editingMessage}
          onReply={setReplyingTo}
          onEdit={setEditingMessage}
        />
      </div>

      {/* Message input */}
      <div className="mobile-chat-input">
        <MessageInput
          room={selectedRoom}
          replyingTo={replyingTo}
          editingMessage={editingMessage}
          onMessageSent={() => {
            setReplyingTo(null);
            setEditingMessage(null);
          }}
          onReplyCancel={() => setReplyingTo(null)}
          onEditCancel={() => setEditingMessage(null)}
        />
      </div>
    </div>
  );
};

export default MobileChatPage;
