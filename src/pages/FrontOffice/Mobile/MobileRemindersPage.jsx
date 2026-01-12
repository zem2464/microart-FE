import React, { useState } from 'react';
import { Button, List, Tag, Space, Modal, Form, Input, DatePicker, Select, Checkbox, Typography, Empty, Spin, message, Tooltip, Badge, Drawer } from 'antd';
import {
  PlusOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  BellOutlined,
  FlagOutlined,
  FlagFilled,
} from '@ant-design/icons';
import { Avatar } from 'antd';
import { useQuery, useMutation } from '@apollo/client';
import dayjs from 'dayjs';
import {
  GET_MY_REMINDERS,
  CREATE_REMINDER,
  UPDATE_REMINDER,
  DELETE_REMINDER,
  TOGGLE_REMINDER_COMPLETE,
  TOGGLE_REMINDER_FLAG,
  GET_TODAY_PENDING_REMINDERS_COUNT,
} from '../../../gql/reminders';
import { GET_USERS } from '../../../gql/users';
import { ME_QUERY } from '../../../gql/me';
import './MobileRemindersPage.css';

const { Title, Text } = Typography;
const { TextArea } = Input;

/**
 * Mobile-optimized Reminders page
 * Simplified interface for managing reminders on mobile devices
 */
const MobileRemindersPage = () => {
  const [showCompleted, setShowCompleted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [drawerDetail, setDrawerDetail] = useState(null);
  const [form] = Form.useForm();

  // Queries
  const { data, loading, refetch } = useQuery(GET_MY_REMINDERS, {
    variables: {
      completed: showCompleted,
      assignedByMeOnly: false,
      createdByMe: false,
    },
    fetchPolicy: 'cache-and-network',
  });

  const { data: usersData } = useQuery(GET_USERS, {
    fetchPolicy: 'cache-first',
  });

  const { data: meData } = useQuery(ME_QUERY, {
    fetchPolicy: 'cache-first',
  });

  const currentUser = meData?.me;
  const reminders = data?.myReminders?.reminders || [];
  const users = usersData?.users || [];

  // Mutations
  const [createReminder, { loading: creating }] = useMutation(CREATE_REMINDER, {
    onCompleted: () => {
      message.success('Reminder created');
      setIsModalOpen(false);
      form.resetFields();
      refetch();
    },
    onError: (error) => {
      message.error(error.message || 'Failed to create reminder');
    },
    refetchQueries: [{ query: GET_TODAY_PENDING_REMINDERS_COUNT }],
  });

  const [updateReminder, { loading: updating }] = useMutation(UPDATE_REMINDER, {
    onCompleted: () => {
      message.success('Reminder updated');
      setIsModalOpen(false);
      setEditingReminder(null);
      form.resetFields();
      refetch();
    },
    onError: (error) => {
      message.error(error.message || 'Failed to update reminder');
    },
  });

  const [deleteReminder, { loading: deleting }] = useMutation(DELETE_REMINDER, {
    onCompleted: () => {
      message.success('Reminder deleted');
      refetch();
    },
    onError: (error) => {
      message.error(error.message || 'Failed to delete reminder');
    },
    refetchQueries: [{ query: GET_TODAY_PENDING_REMINDERS_COUNT }],
  });

  const [toggleComplete] = useMutation(TOGGLE_REMINDER_COMPLETE, {
    onCompleted: () => {
      refetch(); // Auto-refresh after completion
    },
    onError: (error) => {
      message.error(error.message || 'Failed to update reminder');
    },
    refetchQueries: [{ query: GET_MY_REMINDERS }, { query: GET_TODAY_PENDING_REMINDERS_COUNT }],
  });

  const [toggleFlag] = useMutation(TOGGLE_REMINDER_FLAG, {
    onCompleted: () => {
      refetch(); // Auto-refresh after flag toggle
    },
    onError: (error) => {
      message.error(error.message || 'Failed to update reminder');
    },
  });

  // Handlers
  const handleAddNew = () => {
    setEditingReminder(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (reminder) => {
    setEditingReminder(reminder);
    form.setFieldsValue({
      title: reminder.title,
      description: reminder.description,
      remindDate: dayjs(reminder.remindDate),
      remindTime: reminder.remindTime,
      priority: reminder.priority,
      assigneeIds: reminder.assignees?.map(a => a.id) || [],
    });
    setIsModalOpen(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      const variables = {
        ...values,
        remindDate: values.remindDate.format('YYYY-MM-DD'),
        assigneeIds: values.assigneeIds || [],
      };

      if (editingReminder) {
        await updateReminder({
          variables: {
            id: editingReminder.id,
            ...variables,
          },
        });
      } else {
        await createReminder({
          variables,
        });
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleDelete = (reminder) => {
    Modal.confirm({
      title: 'Delete Reminder',
      content: 'Are you sure you want to delete this reminder?',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        await deleteReminder({
          variables: { id: reminder.id },
        });
      },
    });
  };

  const handleToggleComplete = async (reminder) => {
    const myCompletion = reminder.myAssignment?.isCompleted || false;
    await toggleComplete({
      variables: { id: reminder.id, completed: !myCompletion },
    });
  };

  const handleToggleFlag = async (reminder) => {
    await toggleFlag({
      variables: { id: reminder.id, flagged: !reminder.flagged },
    });
  };

  // Calculate stats for display
  const totalReminders = reminders.length;
  const pendingCount = reminders.filter(r => {
    const myCompletion = r.myAssignment?.isCompleted || false;
    return !myCompletion;
  }).length;
  const completedCount = reminders.filter(r => {
    const myCompletion = r.myAssignment?.isCompleted || false;
    return myCompletion;
  }).length;

  // Sort reminders: flagged first, then by date
  const sortedReminders = [...reminders].sort((a, b) => {
    if (a.flagged !== b.flagged) {
      return a.flagged ? -1 : 1;
    }
    return dayjs(a.dueDate || a.remindDate).diff(dayjs(b.dueDate || b.remindDate));
  });

  const getStatusColor = (reminder) => {
    if (reminder.completed) return 'success';
    if (dayjs(reminder.remindDate).isBefore(dayjs(), 'day')) return 'error';
    if (dayjs(reminder.remindDate).isSame(dayjs(), 'day')) return 'warning';
    return 'processing';
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'HIGH':
        return 'red';
      case 'MEDIUM':
        return 'orange';
      case 'LOW':
        return 'blue';
      default:
        return 'default';
    }
  };

  const getAssigneeDisplay = (reminder) => {
    if (!reminder.assignees?.length) return 'Not assigned';
    return reminder.assignees.map(a => `${a.firstName} ${a.lastName}`).join(', ');
  };

  if (loading) {
    return <div className="mobile-reminders-loading"><Spin size="large" /></div>;
  }

  return (
    <div className="mobile-reminders-container">
      {/* iPhone-style Header */}
      <div className="mobile-reminders-header">
        <div className="mobile-reminders-title">Reminders</div>
        <Button
          type="text"
          icon={<PlusOutlined style={{ fontSize: '20px', color: '#1890ff' }} />}
          onClick={handleAddNew}
          className="mobile-reminders-add-btn"
        />
      </div>

      {/* iPhone-style Filter tabs */}
      <div className="mobile-reminders-tabs">
        <div
          className={`mobile-reminder-tab ${!showCompleted ? 'active' : ''}`}
          onClick={() => setShowCompleted(false)}
        >
          <div className="tab-icon">📋</div>
          <div className="tab-info">
            <div className="tab-title">All</div>
            <div className="tab-count">{pendingCount}</div>
          </div>
        </div>
        <div
          className={`mobile-reminder-tab ${showCompleted ? 'active' : ''}`}
          onClick={() => setShowCompleted(true)}
        >
          <div className="tab-icon">✓</div>
          <div className="tab-info">
            <div className="tab-title">Completed</div>
            <div className="tab-count">{completedCount}</div>
          </div>
        </div>
      </div>

      {/* Stats Display - matching web version */}
      {totalReminders > 0 && (
        <div className="reminder-stats">
          <div className="stat-item">
            <span className="stat-label">Total:</span>
            <span className="stat-value">{totalReminders}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Pending:</span>
            <span className="stat-value pending">{pendingCount}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Completed:</span>
            <span className="stat-value completed">{completedCount}</span>
          </div>
        </div>
      )}

      {/* iPhone-style Reminders list */}
      {sortedReminders.length === 0 ? (
        <Empty
          description={showCompleted ? 'No completed reminders' : 'No reminders'}
          style={{ marginTop: '60px' }}
        />
      ) : (
        <div className="mobile-reminder-list">
          {sortedReminders
            .filter((reminder) => {
              const myCompletion = reminder.myAssignment?.isCompleted || false;
              return showCompleted ? myCompletion : !myCompletion;
            })
            .map((reminder) => {
              const myCompletion = reminder.myAssignment?.isCompleted || false;
              return (
                <div 
                  key={reminder.id} 
                  className={`mobile-reminder-item ${myCompletion ? 'completed' : ''}`}
                  onClick={() => setDrawerDetail(reminder)}
                >
                  {/* Completion circle */}
                  <div 
                    className={`reminder-circle ${myCompletion ? 'checked' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleComplete(reminder);
                    }}
                  >
                    {myCompletion && <span className="check-mark">✓</span>}
                  </div>
                  
                  {/* Content */}
                  <div className="reminder-content">
                    <div className="reminder-title-row">
                      <span className={`reminder-title ${myCompletion ? 'strikethrough' : ''}`}>
                        {reminder.title}
                      </span>
                      {reminder.flagged && (
                        <span className="reminder-flag">🚩</span>
                      )}
                    </div>
                    {reminder.description && (
                      <div className="reminder-description">{reminder.description}</div>
                    )}
                    <div className="reminder-meta">
                      <span className="reminder-date">
                        {dayjs(reminder.dueDate || reminder.remindDate).format('MMM D, YYYY')}
                        {reminder.remindTime && `, ${reminder.remindTime}`}
                      </span>
                    </div>
                  </div>

                  {/* Chevron */}
                  <div className="reminder-chevron">›</div>
                </div>
              );
            })}
        </div>
      )}

      {/* Floating add button for easy access */}
      <button className="floating-add-btn" onClick={handleAddNew}>
        <PlusOutlined style={{ fontSize: '24px' }} />
      </button>

      {/* Create/Edit Modal */}
      <Modal
        title={editingReminder ? 'Edit Reminder' : 'New Reminder'}
        open={isModalOpen}
        onOk={handleModalOk}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingReminder(null);
          form.resetFields();
        }}
        confirmLoading={creating || updating}
        className="mobile-reminder-modal"
      >
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
        >
          <Form.Item
            name="title"
            label="Title"
            rules={[{ required: true, message: 'Please enter reminder title' }]}
          >
            <Input placeholder="Reminder title" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
          >
            <TextArea
              rows={3}
              placeholder="Add description (optional)"
            />
          </Form.Item>

          <Form.Item
            name="remindDate"
            label="Date"
            rules={[{ required: true, message: 'Please select date' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="remindTime"
            label="Time"
          >
            <Input type="time" />
          </Form.Item>

          <Form.Item
            name="priority"
            label="Priority"
            initialValue="MEDIUM"
          >
            <Select>
              <Select.Option value="HIGH">High</Select.Option>
              <Select.Option value="MEDIUM">Medium</Select.Option>
              <Select.Option value="LOW">Low</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="assigneeIds"
            label="Assign to"
          >
            <Select
              mode="multiple"
              placeholder="Select users to assign"
              optionLabelProp="label"
            >
              {users.map(user => (
                <Select.Option
                  key={user.id}
                  value={user.id}
                  label={`${user.firstName} ${user.lastName}`}
                >
                  {user.firstName} {user.lastName}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Reminder Detail Drawer */}
      <Drawer
        title="Reminder Details"
        placement="bottom"
        onClose={() => setDrawerDetail(null)}
        open={!!drawerDetail}
        height="auto"
        className="mobile-reminder-detail-drawer"
      >
        {drawerDetail && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <div>
              <Text strong>Title</Text>
              <div>{drawerDetail.title}</div>
            </div>
            {drawerDetail.description && (
              <div>
                <Text strong>Description</Text>
                <div>{drawerDetail.description}</div>
              </div>
            )}
            <div>
              <Text strong>Date</Text>
              <div>{dayjs(drawerDetail.remindDate).format('DD MMMM YYYY')}</div>
            </div>
            {drawerDetail.remindTime && (
              <div>
                <Text strong>Time</Text>
                <div>{drawerDetail.remindTime}</div>
              </div>
            )}
            <div>
              <Text strong>Priority</Text>
              <div><Tag color={getPriorityColor(drawerDetail.priority)}>{drawerDetail.priority}</Tag></div>
            </div>
            <div>
              <Text strong>Assigned to</Text>
              <div>{getAssigneeDisplay(drawerDetail)}</div>
            </div>
            <Space>
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={() => {
                  setDrawerDetail(null);
                  handleDelete(drawerDetail);
                }}
              >
                Delete
              </Button>
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => {
                  setDrawerDetail(null);
                  handleEdit(drawerDetail);
                }}
              >
                Edit
              </Button>
            </Space>
          </Space>
        )}
      </Drawer>
    </div>
  );
};

export default MobileRemindersPage;
