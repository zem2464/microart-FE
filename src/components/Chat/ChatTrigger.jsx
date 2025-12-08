import React, { useState } from 'react';
import { useQuery } from '@apollo/client';
import { Button, Dropdown, Badge, Spin } from 'antd';
import { MessageOutlined, UserOutlined, TeamOutlined, FolderOutlined } from '@ant-design/icons';
import { useChatContext } from '../../contexts/ChatContext';
import { GET_MY_CHAT_ROOMS } from '../../graphql/chat';
import NewChatModal from './NewChatModal';

const ChatTrigger = () => {
    const {
        openChatWindow,
        chatRooms,
        totalUnreadCount,
        unreadCounts,
        openChats,
        chatLoading,
        currentUser
    } = useChatContext();
    const [showNewChatModal, setShowNewChatModal] = useState(false);

    const getIcon = (type) => {
        switch (type) {
            case 'direct':
                return <UserOutlined />;
            case 'group':
                return <TeamOutlined />;
            case 'project':
                return <FolderOutlined />;
            default:
                return <MessageOutlined />;
        }
    };

    const handleChatClick = (room) => {
        const otherMember = room.type === 'direct'
            ? room.members?.find(m => m.user.id !== currentUser?.id)?.user
            : null;

        openChatWindow({
            roomId: room.id,
            name: room.name || (otherMember ? `${otherMember.firstName} ${otherMember.lastName}` : 'Chat'),
            type: room.type,
        });
    };

    const menuItems = [
        ...(chatRooms || []).slice(0, 5).map((room) => {
            const otherMember = room.type === 'direct'
                ? room.members?.find(m => m.user.id !== currentUser?.id)?.user
                : null;

            const displayName = room.name || (otherMember
                ? `${otherMember.firstName} ${otherMember.lastName}`
                : 'Unknown');

            return {
                key: room.id,
                icon: getIcon(room.type),
                label: (
                    <div className="flex items-center justify-between w-full">
                        <span className="flex-1 truncate">{displayName}</span>
                        {(unreadCounts[room.id] || 0) > 0 && (
                            <Badge
                                count={unreadCounts[room.id]}
                                style={{ marginLeft: 8 }}
                                overflowCount={99}
                            />
                        )}
                    </div>
                ),
                onClick: () => handleChatClick(room),
            };
        }),
        ...(chatRooms?.length > 0 ? [{ type: 'divider' }] : []),
        {
            key: 'new-chat',
            icon: <MessageOutlined />,
            label: 'New Chat',
            onClick: () => setShowNewChatModal(true),
        },
    ];

    return (
        <>
            <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
                <Badge
                    count={totalUnreadCount}
                    size="small"
                    overflowCount={99}
                >
                    <Button
                        type="text"
                        icon={chatLoading ? <Spin size="small" /> : <MessageOutlined />}
                        className="flex items-center justify-center"
                        style={{ fontSize: '18px' }}
                    />
                </Badge>
            </Dropdown>
            <NewChatModal
                visible={showNewChatModal}
                onClose={() => setShowNewChatModal(false)}
            />
        </>
    );
};

export default ChatTrigger;
