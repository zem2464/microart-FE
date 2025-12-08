import React, { useState } from 'react';
import {
  Card,
  List,
  Avatar,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  message,
  Tooltip,
  Space,
  Typography,
  Progress,
  Popconfirm,
  Tag
} from 'antd';
import {
  UserAddOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PictureOutlined,
  PlusOutlined,
  MinusOutlined
} from '@ant-design/icons';
import { useMutation, useReactiveVar } from '@apollo/client';
import {
  CREATE_TASK_ASSIGNMENT,
  UPDATE_TASK_ASSIGNMENT,
  DELETE_TASK_ASSIGNMENT,
  createTaskAssignmentInput,
  createTaskAssignmentUpdateInput
} from '../gql/taskAssignments';
import { GET_TASKS } from '../gql/tasks';
import { userCacheVar } from '../cache/userCacheVar';

const { Text } = Typography;
const { Option } = Select;

const TaskAssignmentManager = ({ task, availableUsers, readOnly = false }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [form] = Form.useForm();
  
  // Get the current logged-in user
  const currentUser = useReactiveVar(userCacheVar);

  const [createAssignment, { loading: creating }] = useMutation(CREATE_TASK_ASSIGNMENT, {
    refetchQueries: [{ query: GET_TASKS, variables: { filters: { projectId: task.projectId } } }],
    onCompleted: () => {
      message.success('User assigned successfully');
      setModalVisible(false);
      form.resetFields();
    },
    onError: (error) => {
      message.error(error.message || 'Failed to assign user');
    }
  });

  const [updateAssignment, { loading: updating }] = useMutation(UPDATE_TASK_ASSIGNMENT, {
    refetchQueries: [{ query: GET_TASKS, variables: { filters: { projectId: task.projectId } } }],
    onCompleted: () => {
      message.success('Assignment updated successfully');
      setModalVisible(false);
      setEditingAssignment(null);
      form.resetFields();
    },
    onError: (error) => {
      message.error(error.message || 'Failed to update assignment');
    }
  });

  const [deleteAssignment, { loading: deleting }] = useMutation(DELETE_TASK_ASSIGNMENT, {
    refetchQueries: [{ query: GET_TASKS, variables: { filters: { projectId: task.projectId } } }],
    onCompleted: () => {
      message.success('Assignment removed successfully');
    },
    onError: (error) => {
      message.error(error.message || 'Failed to remove assignment');
    }
  });

  const taskAssignments = task.taskAssignments || [];
  const totalAssigned = taskAssignments.reduce((sum, a) => sum + (a.imageQuantity || 0), 0);
  const totalCompleted = taskAssignments.reduce((sum, a) => sum + (a.completedImageQuantity || 0), 0);
  const availableQuantity = (task.imageQuantity || 0) - totalAssigned;

  const handleOpenModal = (assignment = null) => {
    if (assignment) {
      setEditingAssignment(assignment);
      form.setFieldsValue({
        userId: assignment.userId,
        imageQuantity: assignment.imageQuantity,
        completedImageQuantity: assignment.completedImageQuantity,
        notes: assignment.notes,
        status: assignment.status
      });
    } else {
      setEditingAssignment(null);
      form.resetFields();
    }
    setModalVisible(true);
  };

  const handleSubmit = async (values) => {
    try {
      if (editingAssignment) {
        // Update existing assignment
        const input = createTaskAssignmentUpdateInput(values);
        await updateAssignment({
          variables: {
            id: editingAssignment.id,
            input
          }
        });
      } else {
        // Create new assignment
        const input = createTaskAssignmentInput({
          taskId: task.id,
          ...values
        });
        await createAssignment({
          variables: { input }
        });
      }
    } catch (error) {
      console.error('Error saving assignment:', error);
    }
  };

  const handleDelete = async (assignmentId) => {
    try {
      await deleteAssignment({
        variables: { id: assignmentId }
      });
    } catch (error) {
      console.error('Error deleting assignment:', error);
    }
  };

  const handleQuickUpdate = async (assignment, delta) => {
    try {
      const newCompletedQty = Math.max(0, assignment.completedImageQuantity + delta);
      
      // Validate: completed quantity cannot exceed assigned quantity
      if (newCompletedQty > assignment.imageQuantity) {
        message.warning(`Cannot exceed assigned quantity of ${assignment.imageQuantity} images`);
        return;
      }

      // Validate: total completed across all assignments cannot exceed task quantity
      const otherAssignmentsCompleted = taskAssignments
        .filter(a => a.id !== assignment.id)
        .reduce((sum, a) => sum + a.completedImageQuantity, 0);
      
      if (otherAssignmentsCompleted + newCompletedQty > task.imageQuantity) {
        message.warning(`Total completed images cannot exceed task quantity of ${task.imageQuantity}`);
        return;
      }

      // Determine status based on completion
      let newStatus = assignment.status;
      if (newCompletedQty === 0) {
        newStatus = 'PENDING';
      } else if (newCompletedQty === assignment.imageQuantity) {
        newStatus = 'COMPLETED';
      } else if (newCompletedQty > 0) {
        newStatus = 'IN_PROGRESS';
      }

      await updateAssignment({
        variables: {
          id: assignment.id,
          input: {
            completedImageQuantity: newCompletedQty,
            status: newStatus
          }
        }
      });
    } catch (error) {
      console.error('Error updating completed quantity:', error);
      message.error('Failed to update quantity');
    }
  };

  const getStatusTag = (status) => {
    const statusMap = {
      PENDING: { color: 'default', icon: <ClockCircleOutlined /> },
      IN_PROGRESS: { color: 'processing', icon: <ClockCircleOutlined /> },
      COMPLETED: { color: 'success', icon: <CheckCircleOutlined /> }
    };
    const config = statusMap[status] || statusMap.PENDING;
    return (
      <Tag color={config.color} icon={config.icon}>
        {status}
      </Tag>
    );
  };

  // Filter out users who are already assigned
  const assignedUserIds = taskAssignments.map(a => a.userId);
  const availableUsersFiltered = editingAssignment 
    ? availableUsers 
    : availableUsers.filter(u => !assignedUserIds.includes(u.id));

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <Space>
          <Text strong style={{ fontSize: '14px' }}>
            <UserAddOutlined /> Assigned Users
          </Text>
          <Tag color="blue">
            {totalAssigned} / {task.imageQuantity || 0} images assigned
          </Tag>
          {availableQuantity > 0 && (
            <Tag color="orange">
              {availableQuantity} images available
            </Tag>
          )}
        </Space>
        {!readOnly && (
          <Button
            type="primary"
            size="small"
            icon={<UserAddOutlined />}
            onClick={() => handleOpenModal()}
            disabled={availableQuantity <= 0}
          >
            Add User
          </Button>
        )}
      </div>

      {/* Progress Bar */}
      <div style={{ marginBottom: '12px' }}>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          Overall Progress: {totalCompleted} / {task.imageQuantity || 0} images completed
        </Text>
        <Progress
          percent={task.imageQuantity ? Math.round((totalCompleted / task.imageQuantity) * 100) : 0}
          strokeColor="#52c41a"
          size="small"
        />
      </div>

      {/* Assignment List */}
      {taskAssignments.length > 0 ? (
        <List
          size="small"
          dataSource={taskAssignments}
          renderItem={(assignment) => {
            const progress = assignment.imageQuantity > 0
              ? Math.round((assignment.completedImageQuantity / assignment.imageQuantity) * 100)
              : 0;

            return (
              <List.Item
                actions={!readOnly ? [
                  ...(assignment.userId === currentUser?.id ? [
                    <Tooltip title="Decrease completed images">
                      <Button
                        type="text"
                        size="small"
                        icon={<MinusOutlined />}
                        onClick={() => handleQuickUpdate(assignment, -1)}
                        disabled={assignment.completedImageQuantity === 0}
                      />
                    </Tooltip>,
                    <Tooltip title="Increase completed images">
                      <Button
                        type="text"
                        size="small"
                        icon={<PlusOutlined />}
                        onClick={() => handleQuickUpdate(assignment, 1)}
                        disabled={assignment.completedImageQuantity >= assignment.imageQuantity}
                      />
                    </Tooltip>
                  ] : []),
                  <Tooltip title="Edit">
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => handleOpenModal(assignment)}
                    />
                  </Tooltip>,
                  <Popconfirm
                    title="Remove this user from the task?"
                    onConfirm={() => handleDelete(assignment.id)}
                    okText="Yes"
                    cancelText="No"
                  >
                    <Tooltip title="Remove">
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        loading={deleting}
                      />
                    </Tooltip>
                  </Popconfirm>
                ] : []}
                style={{
                  backgroundColor: assignment.userId === currentUser?.id ? '#f0f5ff' : 'transparent',
                  borderLeft: assignment.userId === currentUser?.id ? '3px solid #1890ff' : 'none',
                  paddingLeft: assignment.userId === currentUser?.id ? '12px' : '16px'
                }}
              >
                <List.Item.Meta
                  avatar={
                    <Avatar style={{ backgroundColor: '#1890ff' }}>
                      {assignment.user?.firstName?.charAt(0)}
                    </Avatar>
                  }
                  title={
                    <Space>
                      <Text strong>
                        {assignment.user?.firstName} {assignment.user?.lastName}
                      </Text>
                      {assignment.userId === currentUser?.id && (
                        <Tag color="blue" style={{ fontSize: '10px', padding: '0 4px' }}>YOU</Tag>
                      )}
                      {getStatusTag(assignment.status)}
                    </Space>
                  }
                  description={
                    <div>
                      <Space split="|" size="small">
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          <PictureOutlined /> {assignment.completedImageQuantity} / {assignment.imageQuantity} images
                        </Text>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {progress}%
                        </Text>
                      </Space>
                      {assignment.notes && (
                        <div style={{ marginTop: '4px' }}>
                          <Text type="secondary" style={{ fontSize: '11px' }}>
                            {assignment.notes}
                          </Text>
                        </div>
                      )}
                      <Progress
                        percent={progress}
                        size="small"
                        showInfo={false}
                        strokeColor={progress === 100 ? '#52c41a' : '#1890ff'}
                        style={{ marginTop: '4px' }}
                      />
                    </div>
                  }
                />
              </List.Item>
            );
          }}
        />
      ) : (
        <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
          <Text type="secondary">No users assigned yet</Text>
        </div>
      )}

      {/* Assignment Modal */}
      <Modal
        title={editingAssignment ? 'Edit Assignment' : 'Assign User to Task'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingAssignment(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={creating || updating}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="userId"
            label="User"
            rules={[{ required: true, message: 'Please select a user' }]}
          >
            <Select
              placeholder="Select user"
              showSearch
              disabled={!!editingAssignment}
              filterOption={(input, option) =>
                option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {availableUsersFiltered.map((user) => (
                <Option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="imageQuantity"
            label="Number of Images"
            rules={[
              { required: true, message: 'Please enter image quantity' },
              {
                validator: (_, value) => {
                  const maxAllowed = editingAssignment 
                    ? availableQuantity + editingAssignment.imageQuantity
                    : availableQuantity;
                  
                  if (value > maxAllowed) {
                    return Promise.reject(
                      new Error(`Cannot assign more than ${maxAllowed} images (${availableQuantity} available)`)
                    );
                  }
                  if (value <= 0) {
                    return Promise.reject(new Error('Image quantity must be greater than 0'));
                  }
                  return Promise.resolve();
                }
              }
            ]}
            extra={
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Available: {editingAssignment ? availableQuantity + editingAssignment.imageQuantity : availableQuantity} images
              </Text>
            }
          >
            <InputNumber
              min={1}
              max={editingAssignment ? availableQuantity + editingAssignment.imageQuantity : availableQuantity}
              style={{ width: '100%' }}
              placeholder="Enter number of images"
            />
          </Form.Item>

          {editingAssignment && (
            <>
              <Form.Item
                name="completedImageQuantity"
                label="Completed Images"
                rules={[
                  {
                    validator: (_, value) => {
                      const assignedQty = form.getFieldValue('imageQuantity');
                      if (value > assignedQty) {
                        return Promise.reject(
                          new Error(`Cannot exceed assigned quantity (${assignedQty})`)
                        );
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  placeholder="Enter completed images"
                />
              </Form.Item>

              <Form.Item
                name="status"
                label="Status"
              >
                <Select>
                  <Option value="PENDING">Pending</Option>
                  <Option value="IN_PROGRESS">In Progress</Option>
                  <Option value="COMPLETED">Completed</Option>
                </Select>
              </Form.Item>
            </>
          )}

          <Form.Item
            name="notes"
            label="Notes"
          >
            <Input.TextArea
              rows={3}
              placeholder="Add any notes for this assignment..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TaskAssignmentManager;
