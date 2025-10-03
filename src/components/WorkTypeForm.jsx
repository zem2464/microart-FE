import React, { useState, useEffect } from 'react';
import { Form, Input, Switch, Select, Button, Space, Card, Typography, Tag, InputNumber, message } from 'antd';
import { DeleteOutlined, DragOutlined } from '@ant-design/icons';
import { useMutation, useQuery } from '@apollo/client';
import { useReactiveVar } from '@apollo/client';
import { userCacheVar } from '../cache/userCacheVar';
import { CREATE_WORK_TYPE, UPDATE_WORK_TYPE, GET_WORK_TYPES } from '../gql/workTypes';
import { GET_ACTIVE_TASK_TYPES } from '../gql/taskTypes';
import { hasPermission, MODULES, generatePermission } from '../config/permissions';

const { TextArea } = Input;
const { Title, Text } = Typography;
const { Option } = Select;

const WorkTypeForm = ({ workType, mode, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [selectedTaskTypes, setSelectedTaskTypes] = useState([]);
  const userData = useReactiveVar(userCacheVar);

  // Permission checks
  const canCreate = hasPermission(userData, generatePermission(MODULES.WORK_TYPES, 'create'));
  const canUpdate = hasPermission(userData, generatePermission(MODULES.WORK_TYPES, 'update'));

  // Check if user has permission for the current action
  const hasCurrentPermission = mode === 'create' ? canCreate : canUpdate;  // Get active task types for selection
  const { data: taskTypesData, loading: taskTypesLoading } = useQuery(GET_ACTIVE_TASK_TYPES, {
    fetchPolicy: 'cache-and-network',
  });

  // GraphQL mutations
  const [createWorkType] = useMutation(CREATE_WORK_TYPE, {
    refetchQueries: [{ query: GET_WORK_TYPES }],
    onCompleted: () => {
      message.success('Work type created successfully');
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      // Loading state is managed by form handler
    },
  });

  const [updateWorkType] = useMutation(UPDATE_WORK_TYPE, {
    refetchQueries: [{ query: GET_WORK_TYPES }],
    onCompleted: () => {
      message.success('Work type updated successfully');
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      // Loading state is managed by form handler
    },
  });

  // Initialize form when workType or taskTypes data changes
  useEffect(() => {
    if (mode === 'edit' && workType) {
      // Set basic form values
      form.setFieldsValue({
        name: workType.name,
        description: workType.description,
        isActive: workType.isActive,
      });

      // Set selected task types with their configuration
      const taskTypeConfigs = workType.taskTypes?.map((taskType) => ({
        taskTypeId: taskType.id,
        order: taskType.WorkTypeTask?.order || 0,
        isRequired: taskType.WorkTypeTask?.isRequired ?? true,
      })) || [];

      setSelectedTaskTypes(taskTypeConfigs);
    } else {
      // Reset form for create mode
      form.resetFields();
      setSelectedTaskTypes([]);
    }
  }, [workType, mode, form]);

  // Handle form submission
  const handleSubmit = async (values) => {
    if (!hasCurrentPermission) {
      return;
    }    if (selectedTaskTypes.length === 0) {
      message.error('At least one task type must be selected');
      return;
    }

    setLoading(true);

    try {
      const input = {
        name: values.name,
        description: values.description?.trim() || null,
        isActive: values.isActive ?? true,
        taskTypes: selectedTaskTypes.map((config) => ({
          taskTypeId: config.taskTypeId,
          order: config.order,
          isRequired: config.isRequired,
        })),
      };

      let result;
      if (mode === 'create') {
        result = await createWorkType({ variables: { input } });
      } else {
        result = await updateWorkType({ variables: { id: workType.id, input } });
      }

      // Note: Success message, onSuccess callback, and onClose are handled by Apollo onCompleted

    } catch (error) {
      
      // Extract meaningful error message
      let errorMessage = 'An unexpected error occurred';
      
      if (error.graphQLErrors?.length > 0) {
        errorMessage = error.graphQLErrors[0].message;
      } else if (error.networkError) {
        if (error.networkError.statusCode === 400) {
          errorMessage = 'Invalid input data. Please check your entries.';
        } else if (error.networkError.statusCode === 401) {
          errorMessage = 'You are not authorized to perform this action.';
        } else if (error.networkError.statusCode === 403) {
          errorMessage = 'You do not have permission to perform this action.';
        } else {
          errorMessage = `Network error: ${error.networkError.message}`;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      message.error(`Failed to ${mode} work type: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle adding task type
  const handleAddTaskType = (taskTypeId) => {
    if (!taskTypeId || selectedTaskTypes.some(config => config.taskTypeId === taskTypeId)) {
      return;
    }

    const newConfig = {
      taskTypeId,
      order: selectedTaskTypes.length,
      isRequired: true,
    };

    setSelectedTaskTypes([...selectedTaskTypes, newConfig]);
  };

  // Handle removing task type
  const handleRemoveTaskType = (taskTypeId) => {
    setSelectedTaskTypes(selectedTaskTypes.filter(config => config.taskTypeId !== taskTypeId));
  };

  // Handle updating task type configuration
  const handleUpdateTaskTypeConfig = (taskTypeId, field, value) => {
    setSelectedTaskTypes(selectedTaskTypes.map(config =>
      config.taskTypeId === taskTypeId
        ? { ...config, [field]: value }
        : config
    ));
  };

  // Handle drag and drop for reordering
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const handleDragStart = (e, index) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = 'move';
    // Add some visual feedback
    e.target.style.opacity = '0.5';
  };

  const handleDragEnter = (e, index) => {
    e.preventDefault();
    if (draggedItem !== null && draggedItem !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragLeave = (e) => {
    // Only clear if we're leaving the entire card area
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    setDragOverIndex(null);
    
    if (draggedItem === null || draggedItem === dropIndex) {
      setDraggedItem(null);
      return;
    }

    const newTaskTypes = [...selectedTaskTypes];
    const draggedConfig = newTaskTypes[draggedItem];
    
    // Remove the dragged item
    newTaskTypes.splice(draggedItem, 1);
    
    // Insert at new position
    newTaskTypes.splice(dropIndex, 0, draggedConfig);
    
    // Update order values
    const updatedTaskTypes = newTaskTypes.map((config, index) => ({
      ...config,
      order: index
    }));
    
    setSelectedTaskTypes(updatedTaskTypes);
    setDraggedItem(null);
    
    // Show success message
    message.success('Task type order updated');
  };

  const handleDragEnd = (e) => {
    setDraggedItem(null);
    setDragOverIndex(null);
    // Reset opacity
    e.target.style.opacity = '1';
  };

  // Get available task types (not already selected)
  const availableTaskTypes = taskTypesData?.activeTaskTypes?.filter(
    taskType => !selectedTaskTypes.some(config => config.taskTypeId === taskType.id)
  ) || [];

  // Get task type by ID
  const getTaskTypeById = (id) => {
    return taskTypesData?.activeTaskTypes?.find(taskType => taskType.id === id);
  };

  if (!hasCurrentPermission) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Title level={4}>Access Denied</Title>
        <Text>You don't have permission to {mode} work types.</Text>
        <div style={{ marginTop: '16px', fontSize: '12px', color: '#999' }}>
          <div>Mode: {mode}</div>
          <div>Can Create: {canCreate?.toString()}</div>
          <div>Can Update: {canUpdate?.toString()}</div>
          <div>Has Permission: {hasCurrentPermission?.toString()}</div>
        </div>
      </div>
    );
  }

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      style={{ maxWidth: 600 }}
      initialValues={{
        isActive: true,
      }}
    >
      {/* Basic Information */}
      <div style={{ marginBottom: 24 }}>
        <h4 style={{ marginBottom: 16, fontWeight: 600 }}>Basic Information</h4>
        <Form.Item
          name="name"
          label="Name"
          rules={[
            { required: true, message: 'Please enter work type name' },
            { min: 2, max: 100, message: 'Name must be between 2 and 100 characters' },
          ]}
        >
          <Input placeholder="Enter work type name" size="middle" maxLength={100} />
        </Form.Item>

        <Form.Item
          name="description"
          label="Description (Optional)"
          rules={[
            { max: 1000, message: 'Description cannot exceed 1000 characters' },
          ]}
        >
          <TextArea 
            rows={3}
            placeholder="Enter description (optional)"
            showCount
            maxLength={1000}
            size="middle"
          />
        </Form.Item>

        <Form.Item
          name="isActive"
          label="Status"
          valuePropName="checked"
        >
          <Switch 
            checkedChildren="Active" 
            unCheckedChildren="Inactive"
          />
        </Form.Item>
      </div>

      {/* Task Types Configuration */}
      <div style={{ marginBottom: 24 }}>
        <h4 style={{ marginBottom: 16, fontWeight: 600 }}>Task Types Configuration</h4>
        <p style={{ marginBottom: 16, color: '#666', fontSize: '14px' }}>
          Select and configure the task types included in this work type. At least one task type is required.
          You can drag and drop the cards below to reorder them.
        </p>
        
        {/* Add Task Type Selector */}
        <div style={{ marginBottom: 16 }}>
          <Select
            placeholder="Add a task type"
            style={{ width: '100%', maxWidth: 350 }}
            size="middle"
            loading={taskTypesLoading}
            onSelect={handleAddTaskType}
            value={undefined}
            showSearch
            optionFilterProp="children"
          >
              {availableTaskTypes.map(taskType => (
                <Option key={taskType.id} value={taskType.id}>
                  <Space>
                    <Tag color={taskType.color}>{taskType.name}</Tag>
                    {taskType.description && (
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {taskType.description}
                      </Text>
                    )}
                  </Space>
                </Option>
              ))}
            </Select>
          </div>

        {/* Selected Task Types Configuration */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {selectedTaskTypes.map((config, index) => {
            const taskType = getTaskTypeById(config.taskTypeId);
            if (!taskType) return null;

            return (
              <Card 
                key={config.taskTypeId}
                size="small"
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnter={(e) => handleDragEnter(e, index)}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                style={{ 
                  borderLeft: dragOverIndex === index ? '4px solid #52c41a' : '4px solid #1890ff',
                  backgroundColor: draggedItem === index ? '#f0f0f0' : dragOverIndex === index ? '#f6ffed' : '#fafafa',
                  cursor: 'move',
                  transition: 'all 0.2s ease',
                  transform: draggedItem === index ? 'scale(0.98)' : 'scale(1)',
                  boxShadow: dragOverIndex === index ? '0 4px 12px rgba(0, 0, 0, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.1)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div 
                      title="Drag to reorder"
                      style={{ 
                        color: '#999', 
                        cursor: 'move',
                        padding: '4px',
                        borderRadius: '4px',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f0f0'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      <DragOutlined />
                    </div>
                    <Tag color={taskType.color}>{taskType.name}</Tag>
                    <Text type="secondary">{taskType.description}</Text>
                  </div>
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleRemoveTaskType(config.taskTypeId)}
                    size="small"
                  />
                </div>
                
                <div style={{ marginTop: 12, display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <Text strong style={{ fontSize: '12px' }}>Order:</Text>
                    <InputNumber
                      size="small"
                      style={{ width: '80px' }}
                      min={0}
                      value={index}
                      readOnly
                      title="Order is automatically updated when you drag and drop"
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <Text strong style={{ fontSize: '12px' }}>Required:</Text>
                    <Switch
                      size="small"
                      checked={config.isRequired}
                      onChange={(value) => handleUpdateTaskTypeConfig(config.taskTypeId, 'isRequired', value)}
                    />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {selectedTaskTypes.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: '32px 16px',
            color: '#999',
            backgroundColor: '#f9f9f9',
            borderRadius: '8px',
            border: '1px dashed #d9d9d9'
          }}>
            <Text type="secondary">No task types selected. Please add at least one task type.</Text>
          </div>
        )}
      </div>
    </Form>
  );
};

export default WorkTypeForm;