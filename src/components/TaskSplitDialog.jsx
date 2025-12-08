import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  InputNumber,
  Select,
  Input,
  Button,
  Space,
  Card,
  Typography,
  Alert,
  Row,
  Col,
  Divider,
  message,
  Tooltip
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  SplitCellsOutlined,
  WarningOutlined,
  UserOutlined
} from '@ant-design/icons';
import { useMutation } from '@apollo/client';
import { SPLIT_TASK, GET_TASKS } from '../gql/tasks';

const { Text, Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const TaskSplitDialog = ({ 
  visible, 
  task, 
  users = [], 
  onClose, 
  onSuccess 
}) => {
  const [form] = Form.useForm();
  const [splits, setSplits] = useState([
    { id: 1, imageQuantity: null, assigneeId: null, notes: '' }
  ]);

  const [splitTask, { loading }] = useMutation(SPLIT_TASK, {
    refetchQueries: [{ query: GET_TASKS }],
    onCompleted: (data) => {
      message.success(`Task successfully split into ${data.splitTask.length} tasks`);
      onSuccess?.(data.splitTask);
      handleClose();
    },
    onError: (error) => {
      message.error(`Failed to split task: ${error.message}`);
    }
  });

  useEffect(() => {
    if (visible && task) {
      // Reset form when dialog opens
      setSplits([
        { id: 1, imageQuantity: null, assigneeId: null, notes: '' }
      ]);
      form.resetFields();
    }
  }, [visible, task, form]);

  if (!task) return null;

  const totalImages = task.imageQuantity || 0;
  const remainingImages = task.imageQuantity - (task.completedImageQuantity || 0);
  
  const allocatedImages = splits.reduce((sum, split) => {
    return sum + (split.imageQuantity || 0);
  }, 0);

  const unallocatedImages = remainingImages - allocatedImages;
  const isValid = allocatedImages > 0 && allocatedImages <= remainingImages;

  const addSplit = () => {
    const newId = Math.max(...splits.map(s => s.id), 0) + 1;
    setSplits([...splits, { id: newId, imageQuantity: null, assigneeId: null, notes: '' }]);
  };

  const removeSplit = (id) => {
    if (splits.length === 1) {
      message.warning('At least one split is required');
      return;
    }
    setSplits(splits.filter(s => s.id !== id));
  };

  const updateSplit = (id, field, value) => {
    setSplits(splits.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    ));
  };

  const handleClose = () => {
    setSplits([{ id: 1, imageQuantity: null, assigneeId: null, notes: '' }]);
    form.resetFields();
    onClose?.();
  };

  const handleSubmit = () => {
    // Validate splits
    const validSplits = splits.filter(s => s.imageQuantity && s.imageQuantity > 0);
    
    if (validSplits.length === 0) {
      message.error('Please specify image quantity for at least one split');
      return;
    }

    if (allocatedImages > remainingImages) {
      message.error('Total allocated images exceed remaining images');
      return;
    }

    if (allocatedImages === 0) {
      message.error('Please allocate at least some images to splits');
      return;
    }

    splitTask({
      variables: {
        input: {
          taskId: task.id,
          splits: validSplits.map(s => ({
            imageQuantity: s.imageQuantity,
            assigneeId: s.assigneeId || null,
            notes: s.notes || null
          }))
        }
      }
    });
  };

  const autoDistribute = () => {
    const numSplits = splits.length;
    const imagesPerSplit = Math.floor(remainingImages / numSplits);
    const remainder = remainingImages % numSplits;

    const newSplits = splits.map((split, index) => ({
      ...split,
      imageQuantity: imagesPerSplit + (index < remainder ? 1 : 0)
    }));

    setSplits(newSplits);
    message.success('Images distributed equally across splits');
  };

  return (
    <Modal
      title={
        <Space>
          <SplitCellsOutlined />
          <span>Split Task</span>
        </Space>
      }
      open={visible}
      onCancel={handleClose}
      width={800}
      footer={[
        <Button key="cancel" onClick={handleClose} disabled={loading}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          onClick={handleSubmit}
          loading={loading}
          disabled={!isValid}
        >
          Split Task
        </Button>
      ]}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Task Info */}
        <Card size="small" style={{ background: '#fafafa' }}>
          <Row gutter={16}>
            <Col span={12}>
              <Text type="secondary">Task Code:</Text>
              <br />
              <Text strong code>{task.taskCode}</Text>
            </Col>
            <Col span={12}>
              <Text type="secondary">Total Images:</Text>
              <br />
              <Text strong style={{ fontSize: '16px' }}>{totalImages}</Text>
            </Col>
            <Col span={12}>
              <Text type="secondary">Completed:</Text>
              <br />
              <Text>{task.completedImageQuantity || 0}</Text>
            </Col>
            <Col span={12}>
              <Text type="secondary">Remaining:</Text>
              <br />
              <Text strong style={{ color: '#1890ff' }}>{remainingImages}</Text>
            </Col>
          </Row>
        </Card>

        {/* Allocation Status */}
        <Card
          size="small"
          style={{
            borderColor: unallocatedImages < 0 ? '#ff4d4f' : unallocatedImages === 0 ? '#52c41a' : '#1890ff'
          }}
        >
          <Row gutter={16} align="middle">
            <Col span={8}>
              <Space direction="vertical" size={0}>
                <Text type="secondary" style={{ fontSize: '12px' }}>Allocated</Text>
                <Text strong style={{ fontSize: '18px', color: '#1890ff' }}>
                  {allocatedImages}
                </Text>
              </Space>
            </Col>
            <Col span={8}>
              <Space direction="vertical" size={0}>
                <Text type="secondary" style={{ fontSize: '12px' }}>Unallocated</Text>
                <Text 
                  strong 
                  style={{ 
                    fontSize: '18px',
                    color: unallocatedImages < 0 ? '#ff4d4f' : unallocatedImages > 0 ? '#faad14' : '#52c41a'
                  }}
                >
                  {unallocatedImages}
                </Text>
              </Space>
            </Col>
            <Col span={8}>
              <Button
                type="dashed"
                size="small"
                onClick={autoDistribute}
                disabled={splits.length === 0}
                block
              >
                Auto Distribute
              </Button>
            </Col>
          </Row>
        </Card>

        {unallocatedImages < 0 && (
          <Alert
            message="Over-allocated!"
            description={`You've allocated ${Math.abs(unallocatedImages)} more images than available. Please adjust the quantities.`}
            type="error"
            showIcon
            icon={<WarningOutlined />}
          />
        )}

        <Divider orientation="left">Split Configuration</Divider>

        {/* Splits */}
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {splits.map((split, index) => (
            <Card
              key={split.id}
              size="small"
              title={`Split ${index + 1}`}
              extra={
                splits.length > 1 && (
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => removeSplit(split.id)}
                  />
                )
              }
            >
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    label="Image Quantity"
                    required
                    validateStatus={split.imageQuantity && split.imageQuantity > 0 ? '' : 'error'}
                  >
                    <InputNumber
                      min={1}
                      max={remainingImages}
                      value={split.imageQuantity}
                      onChange={(value) => updateSplit(split.id, 'imageQuantity', value)}
                      placeholder="Qty"
                      style={{ width: '100%' }}
                      size="large"
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="Assign To">
                    <Select
                      placeholder="Select user"
                      value={split.assigneeId}
                      onChange={(value) => updateSplit(split.id, 'assigneeId', value)}
                      allowClear
                      showSearch
                      optionFilterProp="children"
                      size="large"
                    >
                      {users.map(user => (
                        <Option key={user.id} value={user.id}>
                          <Space>
                            <UserOutlined />
                            {user.firstName} {user.lastName}
                          </Space>
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="Estimated Cost">
                    <Tooltip title="Calculated proportionally from original task">
                      <Text type="secondary">
                        ₹{split.imageQuantity && task.estimatedCost ? 
                          (task.estimatedCost * split.imageQuantity / totalImages).toFixed(2) : 
                          '0.00'
                        }
                      </Text>
                    </Tooltip>
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item label="Notes">
                    <TextArea
                      value={split.notes}
                      onChange={(e) => updateSplit(split.id, 'notes', e.target.value)}
                      placeholder="Optional notes for this split..."
                      rows={2}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          ))}

          <Button
            type="dashed"
            onClick={addSplit}
            block
            icon={<PlusOutlined />}
          >
            Add Another Split
          </Button>
        </Space>

        {/* Summary */}
        {unallocatedImages === 0 && allocatedImages > 0 && (
          <Alert
            message="Ready to split!"
            description={`This task will be split into ${splits.length} new tasks. The original task will ${unallocatedImages === 0 ? 'be set to on-hold as all images are allocated' : 'retain the remaining images'}.`}
            type="success"
            showIcon
          />
        )}

        {unallocatedImages > 0 && allocatedImages > 0 && (
          <Alert
            message="Partial allocation"
            description={`${unallocatedImages} images will remain in the original task after splitting.`}
            type="info"
            showIcon
          />
        )}
      </Space>
    </Modal>
  );
};

export default TaskSplitDialog;
