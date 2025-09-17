import React from 'react';
import { 
  Form, 
  Input, 
  Switch, 
  ColorPicker, 
  Select, 
  InputNumber,
  message,
  Space,
  Typography
} from 'antd';
import { useMutation } from '@apollo/client';
import { CREATE_TASK_TYPE, UPDATE_TASK_TYPE, GET_TASK_TYPES } from '../gql/taskTypes';
import { 
  CleanFormSection
} from './common/CleanDrawer';
import { 
  FileTextOutlined,
  SettingOutlined,
  BgColorsOutlined
} from '@ant-design/icons';

const { Option } = Select;
const { Text } = Typography;

// Available icons for task types
const TASK_TYPE_ICONS = [
  { value: 'camera', label: 'Camera' },
  { value: 'design', label: 'Design' },
  { value: 'edit', label: 'Edit' },
  { value: 'custom', label: 'Custom' },
  { value: 'filter', label: 'Filter' },
  { value: 'color', label: 'Color' },
  { value: 'crop', label: 'Crop' },
  { value: 'resize', label: 'Resize' },
  { value: 'enhance', label: 'Enhance' },
  { value: 'retouch', label: 'Retouch' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'text', label: 'Text' },
  { value: 'frame', label: 'Frame' },
  { value: 'shadow', label: 'Shadow' },
  { value: 'blur', label: 'Blur' },
];

const EnhancedTaskTypeForm = ({ 
  open, 
  onClose, 
  taskType, 
  onSuccess
}) => {
  const [form] = Form.useForm();
  const isEditing = !!taskType;

  // GraphQL mutations
  const [createTaskType] = useMutation(CREATE_TASK_TYPE, {
    refetchQueries: [{ query: GET_TASK_TYPES }],
    onCompleted: () => {
      message.success('Task type created successfully!');
      form.resetFields();
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      console.error('Create error:', error);
      message.error(`Failed to create task type: ${error.message}`);
    }
  });

  const [updateTaskType] = useMutation(UPDATE_TASK_TYPE, {
    refetchQueries: [{ query: GET_TASK_TYPES }],
    onCompleted: () => {
      message.success('Task type updated successfully!');
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      console.error('Update error:', error);
      message.error(`Failed to update task type: ${error.message}`);
    }
  });

  // const loading = createLoading || updateLoading;

  // Initialize form with taskType data when editing
  React.useEffect(() => {
    if (open && taskType) {
      form.setFieldsValue({
        name: taskType.name,
        description: taskType.description,
        color: taskType.color,
        icon: taskType.icon,
        sortOrder: taskType.sortOrder,
        isActive: taskType.isActive
      });
    } else if (open) {
      // Set default values for new task type
      form.setFieldsValue({
        isActive: true,
        sortOrder: 0,
        color: '#1890ff'
      });
    }
  }, [open, taskType, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      // Convert color to hex string if it's a Color object
      const formattedValues = {
        ...values,
        color: typeof values.color === 'object' ? values.color.toHexString() : values.color
      };

      if (isEditing) {
        await updateTaskType({
          variables: {
            id: taskType.id,
            input: formattedValues
          }
        });
      } else {
        await createTaskType({
          variables: {
            input: formattedValues
          }
        });
      }
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  // Form content
  const formContent = (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      className="space-y-6"
    >
        
        {/* Basic Information Section */}
        <CleanFormSection
          title="Basic Information"
          className="form-section"
          extra={<FileTextOutlined />}
        >
          <Form.Item
            name="name"
            label="Task Type Name"
            rules={[
              { required: true, message: 'Please enter a task type name' },
              { min: 2, message: 'Name must be at least 2 characters' },
              { max: 50, message: 'Name must not exceed 50 characters' }
            ]}
          >
            <Input 
              placeholder="Enter task type name (e.g., Photo Editing, Retouching)" 
              showCount
              maxLength={50}
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[
              { max: 200, message: 'Description must not exceed 200 characters' }
            ]}
          >
            <Input.TextArea 
              placeholder="Describe what this task type involves..."
              showCount
              maxLength={200}
              rows={3}
            />
          </Form.Item>
        </CleanFormSection>

        {/* Visual Configuration Section */}
        <CleanFormSection
          title="Visual Configuration"
          className="form-section"
          extra={<BgColorsOutlined />}
        >
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Form.Item
              name="color"
              label="Color Theme"
              rules={[{ required: true, message: 'Please select a color' }]}
            >
              <ColorPicker 
                showText={(color) => (
                  <span style={{ marginLeft: 8 }}>
                    {color.toHexString()}
                  </span>
                )}
                size="large"
                presets={[
                  {
                    label: 'Recommended',
                    colors: [
                      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
                      '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'
                    ]
                  }
                ]}
              />
            </Form.Item>

            <Form.Item
              name="icon"
              label="Icon"
              rules={[{ required: true, message: 'Please select an icon' }]}
            >
              <Select 
                placeholder="Choose an icon for this task type"
                size="large"
                showSearch
                filterOption={(input, option) =>
                  option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
              >
                {TASK_TYPE_ICONS.map(icon => (
                  <Option key={icon.value} value={icon.value}>
                    <Space>
                      <span>{icon.label}</span>
                      <Text type="secondary">({icon.value})</Text>
                    </Space>
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Space>
        </CleanFormSection>

        {/* System Configuration Section */}
        <CleanFormSection
          title="System Configuration"
          className="form-section"
          extra={<SettingOutlined />}
        >
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Form.Item
              name="sortOrder"
              label="Sort Order"
              rules={[
                { required: true, message: 'Please enter a sort order' },
                { type: 'number', min: 0, message: 'Sort order must be 0 or greater' }
              ]}
            >
              <InputNumber 
                placeholder="Enter display order (0 = first)"
                min={0}
                max={9999}
                style={{ width: '100%' }}
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="isActive"
              label="Active Status"
              valuePropName="checked"
            >
              <Switch 
                checkedChildren="Active" 
                unCheckedChildren="Inactive"
                size="default"
              />
            </Form.Item>
          </Space>
        </CleanFormSection>

    </Form>
  );

  return formContent;
};

export default EnhancedTaskTypeForm;
export { EnhancedTaskTypeForm as TaskTypeForm };