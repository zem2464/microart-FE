import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  Descriptions,
  Spin,
  Alert,
  Typography,
  Tag,
  Table,
  Button,
  DatePicker,
  InputNumber,
  message,
  Space,
  Empty,
  Card,
  Row,
  Col,
  Statistic,
  Timeline,
  Input,
  Avatar,
  Divider,
  List,
  Form,
} from 'antd';
import {
  UserOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  FileImageOutlined,
  ReloadOutlined,
  CommentOutlined,
  SendOutlined,
  FolderOutlined,
  CodeOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { GET_TASK } from '../gql/tasks';
import {
  UPDATE_TASK_STATUS,
  UPDATE_TASK,
  UPDATE_TASK_IMAGE_QUANTITY,
} from '../gql/tasks';
import { UPDATE_CLIENT } from '../gql/clients';
import { UPDATE_PROJECT } from '../graphql/projectQueries';
import {
  GET_TASK_COMMENTS,
  CREATE_TASK_COMMENT,
} from '../gql/taskComments';
import TaskImageQuantityTracker from './TaskImageQuantityTracker';
import TaskAssignmentManager from './TaskAssignmentManager';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const TaskDetailDrawer = ({ taskId }) => {
  const [form] = Form.useForm();
  const [isAddingComment, setIsAddingComment] = useState(false);

  // Fetch task details
  const { data, loading, error, refetch } = useQuery(GET_TASK, {
    variables: {
      id: taskId,
    },
    skip: !taskId,
    fetchPolicy: 'cache-and-network',
  });

  // Fetch task comments
  const { data: commentsData, refetch: refetchComments } = useQuery(GET_TASK_COMMENTS, {
    variables: { taskId },
    skip: !taskId,
  });

  // Mutations
  const [updateTaskStatus] = useMutation(UPDATE_TASK_STATUS);
  const [updateTask] = useMutation(UPDATE_TASK);
  const [updateTaskImageQuantity] = useMutation(UPDATE_TASK_IMAGE_QUANTITY);
  const [createComment] = useMutation(CREATE_TASK_COMMENT);
  const [updateClientMutation] = useMutation(UPDATE_CLIENT);
  const [updateProjectMutation] = useMutation(UPDATE_PROJECT);

  const task = data?.task;
  const comments = commentsData?.taskComments || [];

  const [projectNotesInput, setProjectNotesInput] = useState(task?.project?.notes || '');
  const [clientNotesInput, setClientNotesInput] = useState(task?.project?.client?.clientNotes || task?.clientNotes || '');

  // keep inputs in sync when task loads/refetches
  React.useEffect(() => {
    setProjectNotesInput(task?.project?.notes || '');
    setClientNotesInput(task?.project?.client?.clientNotes || task?.clientNotes || '');
  }, [task?.project?.notes, task?.project?.client?.clientNotes, task?.clientNotes]);

  const handleUpdateNotes = async () => {
    try {
      const updates = [];
      if (task?.project?.id) {
        updates.push(
          updateProjectMutation({
            variables: { id: task.project.id, input: { notes: projectNotesInput } },
          })
        );
      }
      const clientId = task?.project?.client?.id || task?.clientId;
      if (clientId) {
        updates.push(
          updateClientMutation({
            variables: { id: clientId, input: { clientNotes: clientNotesInput } },
          })
        );
      }
      await Promise.all(updates);
      message.success('Notes updated successfully');
      refetch();
    } catch (err) {
      message.error(`Failed to update notes: ${err.message}`);
    }
  };

  // Status options
  const taskStatusOptions = [
    { value: 'PENDING', label: 'Pending', color: 'default' },
    { value: 'ASSIGNED', label: 'Assigned', color: 'blue' },
    { value: 'IN_PROGRESS', label: 'In Progress', color: 'processing' },
    { value: 'REVIEW', label: 'Ready QC', color: 'purple' },
    { value: 'REVISION', label: 'Re-Open', color: 'orange' },
    { value: 'COMPLETED', label: 'Completed', color: 'success' },
    { value: 'ON_HOLD', label: 'On Hold', color: 'warning' },
    { value: 'CANCELLED', label: 'Cancelled', color: 'error' },
  ];

  // Priority options
  const priorityOptions = [
    { value: 'A', label: 'High', color: 'red' },
    { value: 'B', label: 'Medium', color: 'orange' },
    { value: 'C', label: 'Low', color: 'green' },
  ];

  const getStatusColor = (status) => {
    const statusObj = taskStatusOptions.find((s) => s.value === status);
    return statusObj?.color || 'default';
  };

  const getPriorityColor = (priority) => {
    const priorityObj = priorityOptions.find((p) => p.value === priority);
    return priorityObj?.color || 'default';
  };

  // Handlers
  const handleStatusChange = async (newStatus) => {
    try {
      await updateTaskStatus({
        variables: { id: taskId, status: newStatus },
      });
      message.success('Task status updated successfully');
      refetch();
    } catch (err) {
      message.error(`Failed to update status: ${err.message}`);
    }
  };

  const handleDueDateChange = async (newDate) => {
    try {
      await updateTask({
        variables: {
          id: taskId,
          input: { dueDate: newDate ? newDate.format('YYYY-MM-DD') : null },
        },
      });
      message.success('Due date updated successfully');
      refetch();
    } catch (err) {
      message.error(`Failed to update due date: ${err.message}`);
    }
  };

  const handleImageQuantityChange = async (quantity) => {
    try {
      await updateTaskImageQuantity({
        variables: { id: taskId, completedQuantity: quantity },
      });
      message.success('Completed image quantity updated successfully');
      refetch();
    } catch (err) {
      message.error(`Failed to update quantity: ${err.message}`);
    }
  };

  const handleAddComment = async (values) => {
    try {
      await createComment({
        variables: {
          input: {
            taskId,
            content: values.comment,
          },
        },
      });
      message.success('Comment added successfully');
      form.resetFields();
      setIsAddingComment(false);
      refetchComments();
    } catch (err) {
      message.error(`Failed to add comment: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error Loading Task"
        description={error.message}
        type="error"
        showIcon
      />
    );
  }

  if (!task) {
    return <Empty description="Task not found" />;
  }

  // Calculate progress
  const completedPercentage = task.imageQuantity
    ? Math.round((task.completedImageQuantity / task.imageQuantity) * 100)
    : 0;

  return (
    <div style={{ padding: '0' }}>
      {/* Header with Refresh Button */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Tag color={getStatusColor(task.status)} style={{ fontSize: 14, padding: '4px 12px' }}>
            {task.status}
          </Tag>
          <Tag color={getPriorityColor(task.priority)} style={{ fontSize: 14, padding: '4px 12px' }}>
            Priority: {task.priority || 'B'}
          </Tag>
        </Space>
        <Button icon={<ReloadOutlined />} onClick={() => refetch()} size="small">
          Refresh
        </Button>
      </div>

      {/* Task Statistics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="Progress"
              value={completedPercentage}
              suffix="%"
              valueStyle={{ color: completedPercentage === 100 ? '#3f8600' : '#1890ff' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="Completed Images"
              value={task.completedImageQuantity || 0}
              suffix={`/ ${task.imageQuantity || 0}`}
              prefix={<FileImageOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="Estimated Hours"
              value={task.estimatedHours || 0}
              suffix="hrs"
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Task Information */}
      <Card title={<Title level={4}>Task Information</Title>} size="small" style={{ marginBottom: 16 }}>
        <Descriptions bordered size="small" column={2}>
          <Descriptions.Item label="Task Code" span={2}>
            <Space>
              <CodeOutlined />
              <Text code strong>
                {task.taskCode}
              </Text>
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="Title" span={2}>
            <Text strong>{task.title}</Text>
          </Descriptions.Item>
          {task.description && (
            <Descriptions.Item label="Description" span={2}>
              {task.description}
            </Descriptions.Item>
          )}
          {task.instructions && (
            <Descriptions.Item label="Instructions" span={2}>
              <Paragraph>{task.instructions}</Paragraph>
            </Descriptions.Item>
          )}
          <Descriptions.Item label="Status">
            <Tag color={getStatusColor(task.status)}>{task.status}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Priority">
            <Tag color={getPriorityColor(task.priority)}>{task.priority || 'Medium'}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Due Date">
            <Space>
              <CalendarOutlined />
              {task.dueDate ? (
                <Text>{dayjs(task.dueDate).format('YYYY-MM-DD')}</Text>
              ) : (
                <Text type="secondary">No due date</Text>
              )}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="Deadline">
            {task.deadlineDate ? (
              <Text>{dayjs(task.deadlineDate).format('YYYY-MM-DD')}</Text>
            ) : (
              <Text type="secondary">No deadline</Text>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Created">
            {dayjs(task.createdAt).format('YYYY-MM-DD HH:mm')}
          </Descriptions.Item>
          <Descriptions.Item label="Updated">
            {task.updatedAt ? dayjs(task.updatedAt).format('YYYY-MM-DD HH:mm') : '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Project & Client Information */}
      {task.project && (
        <Card title={<Title level={4}>Project & Client</Title>} size="small" style={{ marginBottom: 16 }}>
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="Project Code">
              <Space>
                <FolderOutlined />
                <Text code>{task.project.projectCode}</Text>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Project Name">
              {task.project.name || '-'}
            </Descriptions.Item>
            {task.project.description && (
              <Descriptions.Item label="Project Description" span={2}>
                <Paragraph>{task.project.description}</Paragraph>
              </Descriptions.Item>
            )}
            {task.project.notes && (
              <Descriptions.Item label="Project Internal Notes" span={2}>
                <Paragraph>{task.project.notes}</Paragraph>
              </Descriptions.Item>
            )}
            {task.project.client && (
              <>
                <Descriptions.Item label="Client Code">
                  {task.project.client.clientCode}
                </Descriptions.Item>
                <Descriptions.Item label="Client Name">
                  {task.project.client.displayName || task.project.client.companyName}
                </Descriptions.Item>
                {task.project.client.clientNotes && (
                  <Descriptions.Item label="Client Note" span={2}>
                    <Paragraph>{task.project.client.clientNotes}</Paragraph>
                  </Descriptions.Item>
                )}
              </>
            )}
            {task.project.workType && (
              <Descriptions.Item label="Work Type">
                {task.project.workType.name}
              </Descriptions.Item>
            )}
            {task.grading && (
              <Descriptions.Item label="Grading">
                {task.grading.name} ({task.grading.shortCode})
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>
      )}

      {/* Quick Actions */}
      <Card title={<Title level={4}>Quick Actions</Title>} size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <div style={{ marginBottom: 8 }}>
              <Text strong>Change Status:</Text>
            </div>
            <Button.Group style={{ width: '100%' }}>
              {taskStatusOptions.slice(0, 4).map((option) => (
                <Button
                  key={option.value}
                  size="small"
                  type={task.status === option.value ? 'primary' : 'default'}
                  onClick={() => handleStatusChange(option.value)}
                  style={{ flex: 1 }}
                >
                  {option.label}
                </Button>
              ))}
            </Button.Group>
          </Col>
          <Col span={8}>
            <div style={{ marginBottom: 8 }}>
              <Text strong>Update Due Date:</Text>
            </div>
            <DatePicker
              value={task.dueDate ? dayjs(task.dueDate) : null}
              onChange={handleDueDateChange}
              format="YYYY-MM-DD"
              style={{ width: '100%' }}
            />
          </Col>
          <Col span={8}>
            <div style={{ marginBottom: 8 }}>
              <Text strong>Completed Images:</Text>
            </div>
            <InputNumber
              value={task.completedImageQuantity || 0}
              min={0}
              max={task.imageQuantity || 999999}
              onChange={handleImageQuantityChange}
              style={{ width: '100%' }}
            />
          </Col>
        </Row>
      </Card>

      {/* Task Assignments */}
      {task.taskAssignments && task.taskAssignments.length > 0 && (
        <Card title={<Title level={4}>Assignments</Title>} size="small" style={{ marginBottom: 16 }}>
          <List
            dataSource={task.taskAssignments}
            renderItem={(assignment) => (
              <List.Item>
                <List.Item.Meta
                  avatar={<Avatar icon={<UserOutlined />} />}
                  title={`${assignment.user?.firstName} ${assignment.user?.lastName}`}
                  description={
                    <Space>
                      <Text type="secondary">{assignment.user?.email}</Text>
                      {assignment.imageQuantity && (
                        <Text>
                          • Images: {assignment.completedImageQuantity || 0} / {assignment.imageQuantity}
                        </Text>
                      )}
                      {assignment.status && <Tag>{assignment.status}</Tag>}
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      )}

      {/* Task Timeline/Activity */}
      <Card title={<Title level={4}>Activity Timeline</Title>} size="small" style={{ marginBottom: 16 }}>
        <Timeline>
          {task.createdAt && (
            <Timeline.Item color="green">
              <Text>Task created on {dayjs(task.createdAt).format('YYYY-MM-DD HH:mm')}</Text>
              {task.creator && (
                <Text type="secondary">
                  {' '}
                  by {task.creator.firstName} {task.creator.lastName}
                </Text>
              )}
            </Timeline.Item>
          )}
          {task.startDate && (
            <Timeline.Item color="blue">
              <Text>Started on {dayjs(task.startDate).format('YYYY-MM-DD HH:mm')}</Text>
            </Timeline.Item>
          )}
          {task.completedDate && (
            <Timeline.Item color="green">
              <Text>Completed on {dayjs(task.completedDate).format('YYYY-MM-DD HH:mm')}</Text>
            </Timeline.Item>
          )}
          {task.updatedAt && task.updater && (
            <Timeline.Item>
              <Text type="secondary">
                Last updated by {task.updater.firstName} {task.updater.lastName} on{' '}
                {dayjs(task.updatedAt).format('YYYY-MM-DD HH:mm')}
              </Text>
            </Timeline.Item>
          )}
        </Timeline>
      </Card>

      {/* Comments Section */}
      <Card
        title={<Title level={4}>Comments ({comments.length})</Title>}
        size="small"
        extra={
          <Button
            type="primary"
            size="small"
            icon={<CommentOutlined />}
            onClick={() => setIsAddingComment(!isAddingComment)}
          >
            {isAddingComment ? 'Cancel' : 'Add Comment'}
          </Button>
        }
      >
        {isAddingComment && (
          <Form form={form} onFinish={handleAddComment} style={{ marginBottom: 16 }}>
            <Form.Item name="comment" rules={[{ required: true, message: 'Please enter a comment' }]}>
              <TextArea rows={3} placeholder="Enter your comment..." />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0 }}>
              <Button type="primary" htmlType="submit" icon={<SendOutlined />}>
                Post Comment
              </Button>
            </Form.Item>
          </Form>
        )}

        <List
          dataSource={comments}
          locale={{ emptyText: 'No comments yet' }}
          renderItem={(comment) => (
            <List.Item>
              <List.Item.Meta
                avatar={<Avatar icon={<UserOutlined />} />}
                title={
                  <Space>
                    <Text strong>
                      {comment.user?.firstName} {comment.user?.lastName}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {dayjs(comment.createdAt).fromNow()}
                    </Text>
                  </Space>
                }
                description={comment.content}
              />
            </List.Item>
          )}
        />
      </Card>

      {/* Notes Section */}
      {(task.notes || task.project?.client?.clientNotes || task.internalNotes) && (
        <Card title={<Title level={4}>Notes</Title>} size="small" style={{ marginTop: 16 }}>
          {task.notes && (
            <>
              <Text strong>General Notes:</Text>
              <Paragraph>{task.notes}</Paragraph>
              <Divider style={{ margin: '12px 0' }} />
            </>
          )}
          {task.project?.client?.clientNotes && (
            <>
              <Text strong>Client Notes:</Text>
              <Paragraph>{task.project.client.clientNotes}</Paragraph>
              <Divider style={{ margin: '12px 0' }} />
            </>
          )}
          {task.internalNotes && (
            <>
              <Text strong>Internal Notes:</Text>
              <Paragraph>{task.internalNotes}</Paragraph>
            </>
          )}
        </Card>
      )}
    </div>
  );
};

export default TaskDetailDrawer;
