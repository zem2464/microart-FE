import React, { useState, useEffect } from 'react';
import { Modal, Space, Button, InputNumber, Progress, Typography, Tooltip, message, Tag } from 'antd';
import { 
  CheckCircleOutlined, 
  PictureOutlined,
  CloseOutlined,
  SaveOutlined
} from '@ant-design/icons';
import { useMutation } from '@apollo/client';
import { UPDATE_TASK_IMAGE_QUANTITY } from '../gql/tasks';

const { Text, Title } = Typography;

/**
 * TaskImageActions - Modal for updating image quantities and splitting tasks
 * Opens when clicking on the Images column in TaskTable
 */
const TaskImageActions = ({ 
  task, 
  visible, 
  onClose, 
  onUpdate,
  availableUsers = [] 
}) => {
  const [completedQty, setCompletedQty] = useState(task?.completedImageQuantity || 0);
  const [loading, setLoading] = useState(false);

  // Update completedQty when task changes or modal opens
  useEffect(() => {
    if (task && visible) {
      setCompletedQty(task.completedImageQuantity || 0);
    }
  }, [task, visible]);

  const [updateImageQuantity] = useMutation(UPDATE_TASK_IMAGE_QUANTITY, {
    onCompleted: () => {
      message.success('Image quantity updated successfully');
      if (onUpdate) onUpdate();
    },
    onError: (error) => {
      message.error(`Failed to update: ${error.message}`);
    }
  });

  if (!task) return null;

  const imageQuantity = task.imageQuantity || 0;
  const percentage = imageQuantity > 0 ? Math.round((completedQty / imageQuantity) * 100) : 0;
  const hasChanged = completedQty !== (task.completedImageQuantity || 0);

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateImageQuantity({
        variables: {
          id: task.id,
          completedQuantity: completedQty
        }
      });
      onClose();
    } catch (error) {
      console.error('Error updating image quantity:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleIncrement = () => {
    if (completedQty < imageQuantity) {
      setCompletedQty(completedQty + 1);
    }
  };

  const handleDecrement = () => {
    if (completedQty > 0) {
      setCompletedQty(completedQty - 1);
    }
  };

  return (
    <>
      <Modal
        title={
          <Space>
            <PictureOutlined />
            <span>Task Image Progress</span>
          </Space>
        }
        open={visible}
        onCancel={onClose}
        width={500}
        footer={[
          <Button key="close" onClick={onClose}>
            Close
          </Button>,
          hasChanged && (
            <Button
              key="save"
              type="primary"
              icon={<SaveOutlined />}
              loading={loading}
              onClick={handleSave}
            >
              Save Changes
            </Button>
          )
        ]}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Task Info */}
          <div>
            <Text type="secondary">Task: </Text>
            <Text strong>{task.taskType?.name}</Text>
            {task.taskCode && (
              <>
                <Text type="secondary"> • </Text>
                <Text code>{task.taskCode}</Text>
              </>
            )}
          </div>

          {/* Image Progress */}
          <div>
            <div style={{ marginBottom: 8 }}>
              <Text strong>Image Progress</Text>
              {task._gradingImageQty && !task.imageQuantity && (
                <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>
                  (from grading: {task._gradingImageQty} images)
                </Text>
              )}
              {task._projectImageQty && !task.imageQuantity && !task._gradingImageQty && (
                <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>
                  (from project: {task._projectImageQty} images)
                </Text>
              )}
            </div>
            <Progress 
              percent={percentage}
              status={percentage === 100 ? 'success' : 'active'}
              strokeColor={percentage === 100 ? '#52c41a' : '#1890ff'}
            />
            <div style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 24, fontWeight: 600 }}>
                {completedQty}
              </Text>
              <Text type="secondary" style={{ fontSize: 16 }}>
                {' '} / {imageQuantity} images
              </Text>
            </div>
          </div>

          {/* Update Controls */}
          <div>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              Update Completed Images
            </Text>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16, fontSize: 12 }}>
              💡 Enter your cumulative total completed images (not just today's additions)
            </Text>
            <Space size="large">
              <Button 
                size="large"
                onClick={handleDecrement}
                disabled={completedQty <= 0}
              >
                -
              </Button>
              <Tooltip title="Enter total completed images including previously completed">
                <InputNumber
                  size="large"
                  min={0}
                  max={imageQuantity}
                  value={completedQty}
                  onChange={(value) => setCompletedQty(value || 0)}
                  style={{ width: 120 }}
                />
              </Tooltip>
              <Button
                size="large"
                onClick={handleIncrement}
                disabled={completedQty >= imageQuantity}
              >
                +
              </Button>
            </Space>
          </div>
        </Space>
      </Modal>
    </>
  );
};

export default TaskImageActions;
