import React from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Button, Dropdown, Badge, Spin } from 'antd';
import { MessageOutlined, UserOutlined, TeamOutlined, FolderOutlined } from '@ant-design/icons';
import { useChatContext } from '../../contexts/ChatContext';
import { GET_MY_CHAT_ROOMS } from '../../graphql/chat';

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
    const navigate = useNavigate();

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
        // Navigate to the full chat page with the specific room
        navigate(`/messages/${room.id}`);
    };

    const handleChatSmallWindow = (room) => {
        const otherMember = room.type === 'direct'
            ? room.members?.find(m => m.user.id !== currentUser?.id)?.user
            : null;

        openChatWindow({
            roomId: room.id,
            name: room.name || (otherMember ? `${otherMember.firstName} ${otherMember.lastName}` : 'Chat'),
            type: room.type,
            isSmallWindow: true,
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
                label: (
                    <div className="flex items-center justify-between w-full gap-4">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            {getIcon(room.type)}
                            <span className="flex-1 truncate">{displayName}</span>
                            {(unreadCounts[room.id] || 0) > 0 && (
                                <Badge
                                    count={unreadCounts[room.id]}
                                    overflowCount={99}
                                />
                            )}
                        </div>
                    </div>
                ),
                children: [
                    {
                        key: `${room.id}-full`,
                        label: 'Open',
                        onClick: () => handleChatClick(room),
                    },
                    {
                        key: `${room.id}-small`,
                        label: 'Small Window',
                        onClick: () => handleChatSmallWindow(room),
                    },
                ],
            };
        }),
        ...(chatRooms?.length > 0 ? [{ type: 'divider' }] : []),
        {
            key: 'all-chats',
            icon: <MessageOutlined />,
            label: 'All Chats',
            onClick: () => navigate('/messages'),
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
        </>
    );
};

export default ChatTrigger;
