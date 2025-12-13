import React, { useState } from 'react';
import { InputNumber, Progress, Space, Typography, Button, Tooltip, message, Row, Col } from 'antd';
import { CheckCircleOutlined, MinusOutlined, PlusOutlined } from '@ant-design/icons';
import { useMutation } from '@apollo/client';
import { UPDATE_TASK_IMAGE_QUANTITY, GET_TASK } from '../gql/tasks';

const { Text } = Typography;

const TaskImageQuantityTracker = ({ task, onUpdate, readOnly = false }) => {
  const [editMode, setEditMode] = useState(false);
  const [localCompletedQty, setLocalCompletedQty] = useState(task.completedImageQuantity || 0);

  const [updateQuantity, { loading }] = useMutation(UPDATE_TASK_IMAGE_QUANTITY, {
    refetchQueries: [
      { query: GET_TASK, variables: { id: task.id } }
    ],
    onCompleted: (data) => {
      message.success('Image quantity updated successfully');
      setEditMode(false);
      onUpdate?.(data.updateTaskImageQuantity);
    },
    onError: (error) => {
      message.error(`Failed to update: ${error.message}`);
    }
  });

  if (!task.imageQuantity) {
    return (
      <div style={{ padding: '8px 0' }}>
        <Text type="secondary">No image quantity assigned to this task</Text>
      </div>
    );
  }

  const totalImages = task.imageQuantity;
  const completedImages = task.completedImageQuantity || 0;
  const percentage = totalImages > 0 ? Math.round((completedImages / totalImages) * 100) : 0;
  const remainingImages = totalImages - completedImages;

  const handleIncrement = () => {
    const newQty = Math.min(completedImages + 1, totalImages);
    setLocalCompletedQty(newQty);
    handleUpdate(newQty);
  };

  const handleDecrement = () => {
    const newQty = Math.max(completedImages - 1, 0);
    setLocalCompletedQty(newQty);
    handleUpdate(newQty);
  };

  const handleUpdate = (newQty) => {
    if (newQty === completedImages) {
      setEditMode(false);
      return;
    }

    if (newQty < 0 || newQty > totalImages) {
      message.error(`Completed quantity must be between 0 and ${totalImages}`);
      return;
    }

    updateQuantity({
      variables: {
        id: task.id,
        completedQuantity: newQty
      }
    });
  };

  const handleCancel = () => {
    setLocalCompletedQty(completedImages);
    setEditMode(false);
  };

  const getProgressStatus = () => {
    if (percentage === 100) return 'success';
    if (percentage >= 75) return 'active';
    if (percentage >= 50) return 'normal';
    return 'exception';
  };

  return (
    <div style={{ 
      padding: '16px', 
      background: '#fafafa', 
      borderRadius: '8px',
      border: '1px solid #f0f0f0'
    }}>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Space align="center" style={{ justifyContent: 'space-between', width: '100%' }}>
              <Text strong style={{ fontSize: '14px' }}>
                Image Progress
              </Text>
              {!readOnly && !editMode && (
                <Button 
                  type="link" 
                  size="small"
                  onClick={() => setEditMode(true)}
                >
                  Edit
                </Button>
              )}
            </Space>

            <Space align="center" style={{ width: '100%' }}>
              {!editMode ? (
                <>
                  <Text style={{ fontSize: '24px', fontWeight: 600 }}>
                    {completedImages}
                  </Text>
                  <Text style={{ fontSize: '16px', color: '#8c8c8c' }}>
                    / {totalImages}
                  </Text>
                  <Text type="secondary" style={{ fontSize: '14px' }}>
                    images
                  </Text>
                  {percentage === 100 && (
                    <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '20px' }} />
                  )}
                </>
              ) : (
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <Space size="middle" style={{ width: '100%' }}>
                    <Button
                      icon={<MinusOutlined />}
                      size="small"
                      onClick={handleDecrement}
                      disabled={loading || localCompletedQty === 0}
                    />
                    <Tooltip title="Enter your total completed images (current + newly completed today)">
                      <InputNumber
                        min={0}
                        max={totalImages}
                        value={localCompletedQty}
                        onChange={setLocalCompletedQty}
                        disabled={loading}
                        style={{ width: '80px' }}
                        size="large"
                      />
                    </Tooltip>
                    <Button
                      icon={<PlusOutlined />}
                      size="small"
                      onClick={handleIncrement}
                      disabled={loading || localCompletedQty === totalImages}
                    />
                    <Text type="secondary">/ {totalImages}</Text>
                  </Space>
                  <Text type="secondary" style={{ fontSize: '11px', fontStyle: 'italic' }}>
                    💡 Update with your cumulative total, not just today's additions
                  </Text>
                </Space>
              )}
            </Space>

            {editMode && (
              <Space>
                <Button
                  type="primary"
                  size="small"
                  loading={loading}
                  onClick={() => handleUpdate(localCompletedQty)}
                >
                  Save
                </Button>
                <Button
                  size="small"
                  onClick={handleCancel}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </Space>
            )}

            <Progress
              percent={percentage}
              status={getProgressStatus()}
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
            />

            <Space align="center" style={{ justifyContent: 'space-between', width: '100%' }}>
              <Tooltip title="Images remaining to complete">
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Remaining: <Text strong>{remainingImages}</Text>
                </Text>
              </Tooltip>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {percentage}% Complete
              </Text>
            </Space>

            {percentage === 100 && task.status !== 'completed' && (
              <div style={{ 
                marginTop: '8px', 
                padding: '8px', 
                background: '#f6ffed', 
                borderRadius: '4px',
                border: '1px solid #b7eb8f'
              }}>
                <Text style={{ color: '#52c41a', fontSize: '12px' }}>
                  ✓ All images completed! Task will be moved to review automatically.
                </Text>
              </div>
            )}
          </Space>
        </Col>
      </Row>
    </div>
  );
};

export default TaskImageQuantityTracker;
