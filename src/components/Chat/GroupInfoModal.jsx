import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  Modal,
  List,
  Avatar,
  Button,
  Input,
  Spin,
  message,
  Divider,
  Tag,
  Empty,
  Space,
  Badge,
  Tooltip,
  Popconfirm,
  Form,
  Tabs,
} from 'antd';
import { UserOutlined, DeleteOutlined, UserAddOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { getInitials, getAvatarColor, getFullName } from '../../utils/avatarUtils';
import {
  GET_CHAT_ROOM,
  GET_CHAT_ROOM_ACTIVITY_LOGS,
  SEARCH_USERS_FOR_CHAT,
  ADD_CHAT_MEMBERS,
  REMOVE_CHAT_MEMBER,
  GET_MY_CHAT_ROOMS,
} from '../../graphql/chat';

dayjs.extend(relativeTime);

const GroupInfoModal = ({ roomId, visible, onClose, isOwner }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsersToAdd, setSelectedUsersToAdd] = useState([]);

  // Query for room info
  const { data: roomData, loading: roomLoading, refetch: refetchRoom } = useQuery(GET_CHAT_ROOM, {
    variables: { id: roomId },
    skip: !visible || !roomId,
  });

  // Query for activity logs
  const { data: logsData, loading: logsLoading, refetch: refetchLogs } = useQuery(
    GET_CHAT_ROOM_ACTIVITY_LOGS,
    {
      variables: { roomId, limit: 50 },
      skip: !visible || !roomId,
    }
  );

  // Search for users to add
  const { data: searchData, loading: searchLoading } = useQuery(SEARCH_USERS_FOR_CHAT, {
    variables: { query: searchQuery },
    skip: !searchQuery || searchQuery.length < 2,
  });

  // Mutations
  const [addChatMembers, { loading: addingMembers }] = useMutation(ADD_CHAT_MEMBERS, {
    refetchQueries: [
      { query: GET_CHAT_ROOM, variables: { id: roomId } },
      { query: GET_CHAT_ROOM_ACTIVITY_LOGS, variables: { roomId, limit: 50 } },
      { query: GET_MY_CHAT_ROOMS },
    ],
    onCompleted: () => {
      message.success('Members added successfully');
      setSearchQuery('');
      setSelectedUsersToAdd([]);
      refetchRoom();
      refetchLogs();
    },
    onError: (error) => {
      message.error(`Error: ${error.message}`);
    },
  });

  const [removeChatMember, { loading: removingMember }] = useMutation(REMOVE_CHAT_MEMBER, {
    refetchQueries: [
      { query: GET_CHAT_ROOM, variables: { id: roomId } },
      { query: GET_CHAT_ROOM_ACTIVITY_LOGS, variables: { roomId, limit: 50 } },
      { query: GET_MY_CHAT_ROOMS },
    ],
    onCompleted: () => {
      message.success('Member removed successfully');
      refetchRoom();
      refetchLogs();
    },
    onError: (error) => {
      message.error(`Error: ${error.message}`);
    },
  });

  const room = roomData?.chatRoom;
  const activityLogs = logsData?.chatRoomActivityLogs || [];
  const searchUsers = searchData?.searchUsersForChat || [];

  const handleAddMembers = async () => {
    if (selectedUsersToAdd.length === 0) {
      message.error('Please select at least one member');
      return;
    }

    await addChatMembers({
      variables: {
        roomId,
        userIds: selectedUsersToAdd,
      },
    });
  };

  const handleRemoveMember = async (userId) => {
    await removeChatMember({
      variables: {
        roomId,
        userId,
      },
    });
  };

  const getActivityLogDescription = (log) => {
    const actionType = log.metadata?.action;
    const changedUserName = log.metadata?.addedUserId || log.metadata?.removedUserId;

    if (actionType === 'USER_ADDED_TO_CHAT') {
      return (
        <>
          <span style={{ fontWeight: 500 }}>{log.userEmail}</span>
          <span> added a new member to the group</span>
        </>
      );
    } else if (actionType === 'USER_REMOVED_FROM_CHAT') {
      return (
        <>
          <span style={{ fontWeight: 500 }}>{log.userEmail}</span>
          <span> removed a member from the group</span>
        </>
      );
    }

    return log.description || 'Group updated';
  };

  const existingMemberIds = room?.members?.map(m => m.user.id) || [];
  const availableUsers = searchUsers.filter(u => !existingMemberIds.includes(u.id));

  return (
    <Modal
      title={room?.name ? `Group Info - ${room.name}` : 'Group Info'}
      open={visible}
      onCancel={onClose}
      width={700}
      footer={null}
    >
      {roomLoading ? (
        <div className="flex justify-center py-8">
          <Spin />
        </div>
      ) : room ? (
        <Tabs
          items={[
            {
              key: 'members',
              label: `Members (${room.members?.length || 0})`,
              children: (
                <div className="space-y-4">
                  {/* Add Members Section - Only show if owner */}
                  {isOwner && (
                    <>
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h4 className="font-semibold mb-2">Add New Members</h4>
                        <div className="space-y-2">
                          <Input
                            placeholder="Search users by name or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            size="large"
                          />

                          {searchLoading && (
                            <div className="flex justify-center py-2">
                              <Spin size="small" />
                            </div>
                          )}

                          {availableUsers.length > 0 && (
                            <List
                              dataSource={availableUsers}
                              renderItem={(user) => {
                                const isSelected = selectedUsersToAdd.includes(user.id);
                                return (
                                  <List.Item
                                    key={user.id}
                                    onClick={() => {
                                      setSelectedUsersToAdd(prev =>
                                        prev.includes(user.id)
                                          ? prev.filter(id => id !== user.id)
                                          : [...prev, user.id]
                                      );
                                    }}
                                    className="cursor-pointer hover:bg-blue-100 px-3 py-2 rounded transition-colors"
                                    style={{
                                      backgroundColor: isSelected ? '#dbeafe' : 'transparent',
                                    }}
                                  >
                                    <List.Item.Meta
                                      avatar={
                                        <Avatar
                                          style={{ backgroundColor: getAvatarColor(user.firstName, user.lastName) }}
                                        >
                                          {getInitials(user.firstName, user.lastName)}
                                        </Avatar>
                                      }
                                      title={getFullName(user.firstName, user.lastName)}
                                      description={user.email}
                                    />
                                    {isSelected && <Tag color="blue">Selected</Tag>}
                                  </List.Item>
                                );
                              }}
                            />
                          )}

                          {searchQuery.length >= 2 && availableUsers.length === 0 && !searchLoading && (
                            <div className="text-center py-2 text-gray-500 text-sm">
                              No available users found
                            </div>
                          )}

                          {selectedUsersToAdd.length > 0 && (
                            <div className="flex justify-between items-center pt-2 border-t">
                              <span className="text-sm text-gray-600">
                                {selectedUsersToAdd.length} user{selectedUsersToAdd.length !== 1 ? 's' : ''} selected
                              </span>
                              <Button
                                type="primary"
                                icon={<UserAddOutlined />}
                                onClick={handleAddMembers}
                                loading={addingMembers}
                              >
                                Add Members
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      <Divider />
                    </>
                  )}

                  {/* Current Members List */}
                  <div>
                    <h4 className="font-semibold mb-3">Current Members</h4>
                    {room.members && room.members.length > 0 ? (
                      <List
                        dataSource={room.members}
                        renderItem={(member) => (
                          <List.Item
                            key={member.id}
                            actions={[
                              <Tag color={member.role === 'owner' ? 'gold' : 'blue'}>
                                {member.role}
                              </Tag>,
                              isOwner && member.role !== 'owner' ? (
                                <Popconfirm
                                  title="Remove Member"
                                  description="Are you sure you want to remove this member from the group?"
                                  onConfirm={() => handleRemoveMember(member.user.id)}
                                  okText="Yes"
                                  cancelText="No"
                                >
                                  <Button
                                    danger
                                    size="small"
                                    icon={<DeleteOutlined />}
                                    loading={removingMember}
                                  >
                                    Remove
                                  </Button>
                                </Popconfirm>
                              ) : null,
                            ]}
                          >
                            <List.Item.Meta
                              avatar={
                                <Badge
                                  dot
                                  status={member.user.isOnline ? 'success' : 'default'}
                                  offset={[-5, 35]}
                                >
                                  <Avatar
                                    style={{ backgroundColor: getAvatarColor(member.user.firstName, member.user.lastName) }}
                                  >
                                    {getInitials(member.user.firstName, member.user.lastName)}
                                  </Avatar>
                                </Badge>
                              }
                              title={
                                <div className="flex items-center gap-2">
                                  {getFullName(member.user.firstName, member.user.lastName)}
                                  {member.user.isOnline && (
                                    <span style={{ fontSize: '12px', color: '#52c41a' }}>● Online</span>
                                  )}
                                </div>
                              }
                              description={member.user.email}
                            />
                          </List.Item>
                        )}
                      />
                    ) : (
                      <Empty description="No members" />
                    )}
                  </div>
                </div>
              ),
            },
            {
              key: 'activity',
              label: 'Activity Log',
              children: (
                <div className="space-y-2">
                  {logsLoading ? (
                    <div className="flex justify-center py-8">
                      <Spin />
                    </div>
                  ) : activityLogs.length > 0 ? (
                    <List
                      dataSource={activityLogs}
                      renderItem={(log) => (
                        <List.Item key={log.id} className="pb-3">
                          <List.Item.Meta
                            avatar={
                              <Avatar
                                style={{
                                  backgroundColor: getAvatarColor(
                                    log.userEmail?.split('@')[0]?.split('.')[0] || '',
                                    log.userEmail?.split('@')[0]?.split('.')[1] || ''
                                  ),
                                }}
                              >
                                {getInitials(
                                  log.userEmail?.split('@')[0]?.split('.')[0] || '',
                                  log.userEmail?.split('@')[0]?.split('.')[1] || ''
                                )}
                              </Avatar>
                            }
                            title={getActivityLogDescription(log)}
                            description={
                              <div className="text-xs text-gray-500">
                                {dayjs(log.timestamp).fromNow()}
                              </div>
                            }
                          />
                        </List.Item>
                      )}
                    />
                  ) : (
                    <Empty description="No activity logs" />
                  )}
                </div>
              ),
            },
            {
              key: 'info',
              label: 'Group Details',
              children: (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Group Name</label>
                    <p className="text-base font-medium">{room.name}</p>
                  </div>
                  {room.description && (
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Description</label>
                      <p className="text-base">{room.description}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Group Type</label>
                    <Tag color={room.isPrivate ? 'red' : 'green'}>
                      {room.isPrivate ? 'Private' : 'Public'}
                    </Tag>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Created</label>
                    <p className="text-base">{dayjs(room.createdAt).format('MMMM D, YYYY h:mm A')}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Total Members</label>
                    <p className="text-base">{room.members?.length || 0}</p>
                  </div>
                </div>
              ),
            },
          ]}
        />
      ) : (
        <Empty description="Room not found" />
      )}
    </Modal>
  );
};

export default GroupInfoModal;
