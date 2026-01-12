import React, { useState } from 'react';
import { Popover, Badge, Table, Empty, Space, Tag, Button, message, Tooltip, Spin } from 'antd';
import { BellOutlined, CheckOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useReactiveVar } from '@apollo/client';
import { GET_PROJECT_REMINDER_NOTES, MARK_REMINDER_NOTE_AS_SEEN, DELETE_PROJECT_REMINDER_NOTE } from '../gql/projectReminderNotes';
import { userCacheVar } from '../cache/userCacheVar';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const ProjectReminderNotesPopover = ({ projectId }) => {
  const [visible, setVisible] = useState(false);
  const currentUser = useReactiveVar(userCacheVar);
  
  const { data, loading, refetch } = useQuery(GET_PROJECT_REMINDER_NOTES, {
    variables: { projectId },
    skip: !projectId,
    fetchPolicy: 'cache-and-network'
  });

  const [markAsSeen] = useMutation(MARK_REMINDER_NOTE_AS_SEEN);
  const [deleteNote] = useMutation(DELETE_PROJECT_REMINDER_NOTE);

  const notes = data?.projectReminderNotes || [];

  const handleMarkAsSeen = async (noteId) => {
    try {
      await markAsSeen({
        variables: {
          input: { noteId }
        }
      });
      message.success('Note marked as seen');
      refetch();
    } catch (error) {
      message.error('Failed to mark note as seen');
      console.error('Error marking note as seen:', error);
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await deleteNote({
        variables: { id: noteId }
      });
      message.success('Note deleted successfully');
      refetch();
    } catch (error) {
      message.error('Failed to delete note');
      console.error('Error deleting note:', error);
    }
  };

  const unreadNotes = notes.filter(note => !note.seenBy?.some(s => s.user?.id === currentUser?.id));
  const hasUnread = unreadNotes.length > 0;

  const columns = [
    {
      title: 'Status',
      key: 'status',
      width: 80,
      render: (_, record) => {
        const hasSeenByUser = record.seenBy?.some(s => s.user?.id === currentUser?.id);
        return (
          <Tag color={hasSeenByUser ? 'green' : 'orange'}>
            {hasSeenByUser ? 'Read' : 'Unread'}
          </Tag>
        );
      }
    },
    {
      title: 'Note',
      dataIndex: 'content',
      key: 'content',
      render: (text, record) => (
        <div>
          <p style={{ margin: '0 0 4px 0', wordBreak: 'break-word' }}>{text}</p>
          <div style={{ fontSize: 11, color: '#999' }}>
            <span>By: {record.creator?.firstName} {record.creator?.lastName}</span>
            <span style={{ marginLeft: 8 }}>
              • {dayjs(record.createdAt).fromNow()}
            </span>
          </div>
        </div>
      )
    },
    {
      title: 'Seen By',
      key: 'seenBy',
      width: 100,
      render: (_, record) => (
        <span style={{ fontSize: 11 }}>
          {record.seenBy?.length || 0} {record.seenBy?.length === 1 ? 'person' : 'people'}
        </span>
      )
    },
    {
      title: 'Action',
      key: 'action',
      width: 120,
      render: (_, record) => {
        const hasSeenByUser = record.seenBy?.some(s => s.user?.id === currentUser?.id);
        const isCreator = record.createdBy === currentUser?.id;

        return (
          <Space size="small">
            {!hasSeenByUser && (
              <Tooltip title="Mark as Read">
                <Button
                  type="link"
                  size="small"
                  icon={<CheckOutlined />}
                  onClick={() => handleMarkAsSeen(record.id)}
                />
              </Tooltip>
            )}
            {isCreator && (
              <Tooltip title="Delete">
                <Button
                  type="link"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => handleDeleteNote(record.id)}
                />
              </Tooltip>
            )}
          </Space>
        );
      }
    }
  ];

  const content = (
    <div style={{ width: 600 }}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 20 }}>
          <Spin />
        </div>
      ) : notes.length === 0 ? (
        <Empty description="No reminder notes" style={{ marginTop: 20 }} />
      ) : (
        <Table
          columns={columns}
          dataSource={notes}
          rowKey="id"
          pagination={false}
          size="small"
          scroll={{ y: 400 }}
        />
      )}
    </div>
  );

  // Don't show badge if no notes
  if (!loading && notes.length === 0) {
    return null;
  }

  return (
    <Popover
      content={content}
      title={`Reminder Notes (${notes.length})`}
      trigger="click"
      open={visible}
      onOpenChange={setVisible}
      placement="bottomLeft"
    >
      <Badge count={unreadNotes.length} size="small" offset={[-5, 6]}>
        <Button
          type="link"
          icon={<BellOutlined />}
          size="small"
          style={{ color: hasUnread ? '#ff4d4f' : '#1890ff' }}
        />
      </Badge>
    </Popover>
  );
};

export default ProjectReminderNotesPopover;
