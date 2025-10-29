import React, { useState } from 'react';
import { 
  Form, 
  Input, 
  Select, 
  Switch, 
  Button, 
  Card, 
  Typography, 
  Space, 
  Divider,
  Modal,
  message,
  Popconfirm,
  Tag,
  Tooltip
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  DragOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons';
import { useMutation, useQuery } from '@apollo/client';
import {
  GET_WORK_TYPE_FIELDS,
  CREATE_WORK_TYPE_FIELD,
  UPDATE_WORK_TYPE_FIELD,
  DELETE_WORK_TYPE_FIELD,
  REORDER_WORK_TYPE_FIELDS
} from '../graphql/workTypeQueries';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const fieldTypeOptions = [
  { value: 'text', label: 'Text', description: 'Single line text input' },
  { value: 'textarea', label: 'Text Area', description: 'Multi-line text input' },
  { value: 'number', label: 'Number', description: 'Numeric input with validation' },
  { value: 'email', label: 'Email', description: 'Email address with validation' },
  { value: 'url', label: 'URL', description: 'Website URL with validation' },
  { value: 'tel', label: 'Phone', description: 'Phone number input' },
  { value: 'date', label: 'Date', description: 'Date picker' },
  { value: 'datetime', label: 'Date & Time', description: 'Date and time picker' },
  { value: 'select', label: 'Dropdown', description: 'Single selection from options' },
  { value: 'multiselect', label: 'Multi-Select', description: 'Multiple selections from options' },
  { value: 'checkbox', label: 'Checkbox', description: 'True/false checkbox' }
];

const CustomFieldsManager = ({ workTypeId, disabled = false }) => {
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [optionsText, setOptionsText] = useState('');

  // Fetch custom fields for the work type
  const { data: fieldsData, loading: fieldsLoading, refetch: refetchFields } = useQuery(GET_WORK_TYPE_FIELDS, {
    variables: { workTypeId },
    skip: !workTypeId,
    fetchPolicy: 'cache-and-network'
  });

  // GraphQL mutations
  const [createField] = useMutation(CREATE_WORK_TYPE_FIELD, {
    onCompleted: () => {
      message.success('Custom field created successfully');
      handleCloseModal();
      refetchFields();
    },
    onError: (error) => {
      message.error(`Failed to create field: ${error.message}`);
    }
  });

  const [updateField] = useMutation(UPDATE_WORK_TYPE_FIELD, {
    onCompleted: () => {
      message.success('Custom field updated successfully');
      handleCloseModal();
      refetchFields();
    },
    onError: (error) => {
      message.error(`Failed to update field: ${error.message}`);
    }
  });

  const [deleteField] = useMutation(DELETE_WORK_TYPE_FIELD, {
    onCompleted: () => {
      message.success('Custom field deleted successfully');
      refetchFields();
    },
    onError: (error) => {
      message.error(`Failed to delete field: ${error.message}`);
    }
  });

  const [reorderFields] = useMutation(REORDER_WORK_TYPE_FIELDS, {
    onCompleted: () => {
      message.success('Fields reordered successfully');
      refetchFields();
    },
    onError: (error) => {
      message.error(`Failed to reorder fields: ${error.message}`);
    }
  });

  const fields = fieldsData?.workTypeFields || [];

  // Handle opening modal for create/edit
  const handleOpenModal = (field = null) => {
    setEditingField(field);
    setIsModalVisible(true);
    
    if (field) {
      // Populate form for editing
      const optionsStr = field.options?.map(opt => `${opt.value}:${opt.label}`).join('\n') || '';
      setOptionsText(optionsStr);
      
      form.setFieldsValue({
        fieldName: field.fieldName,
        fieldKey: field.fieldKey,
        fieldType: field.fieldType,
        isRequired: field.isRequired,
        defaultValue: field.defaultValue,
        placeholder: field.placeholder,
        helpText: field.helpText,
        isActive: field.isActive
      });
    } else {
      form.resetFields();
      setOptionsText('');
    }
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setEditingField(null);
    form.resetFields();
    setOptionsText('');
  };

  // Generate field key from field name
  const generateFieldKey = (fieldName) => {
    return fieldName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  };

  // Parse options from text
  const parseOptions = (optionsText) => {
    if (!optionsText.trim()) return [];
    
    return optionsText
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [value, label] = line.split(':').map(s => s.trim());
        return {
          value: value || label,
          label: label || value,
          description: null
        };
      })
      .filter(option => option.value);
  };

  // Handle form submission
  const handleSubmit = async (values) => {
    try {
      const fieldKey = values.fieldKey || generateFieldKey(values.fieldName);
      const options = ['select', 'multiselect'].includes(values.fieldType) 
        ? parseOptions(optionsText) 
        : [];

      // Validation for select fields
      if (['select', 'multiselect'].includes(values.fieldType) && options.length === 0) {
        message.error('Please provide at least one option for select fields');
        return;
      }

      const input = {
        fieldName: values.fieldName,
        fieldKey,
        fieldType: values.fieldType,
        isRequired: values.isRequired || false,
        defaultValue: values.defaultValue || null,
        placeholder: values.placeholder || null,
        helpText: values.helpText || null,
        options: options.length > 0 ? options : null,
        isActive: values.isActive ?? true
      };

      if (editingField) {
        await updateField({
          variables: { id: editingField.id, input }
        });
      } else {
        await createField({
          variables: { workTypeId, input }
        });
      }
    } catch (error) {
      console.error('Error saving field:', error);
    }
  };

  // Handle delete field
  const handleDeleteField = async (fieldId) => {
    try {
      await deleteField({ variables: { id: fieldId } });
    } catch (error) {
      console.error('Error deleting field:', error);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e, index) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = 'move';
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
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault();
    setDragOverIndex(null);
    
    if (draggedItem === null || draggedItem === dropIndex) {
      setDraggedItem(null);
      return;
    }

    const newFields = [...fields];
    const draggedField = newFields[draggedItem];
    
    // Remove dragged item and insert at new position
    newFields.splice(draggedItem, 1);
    newFields.splice(dropIndex, 0, draggedField);
    
    // Create array of field IDs in new order
    const fieldIds = newFields.map(field => field.id);
    
    try {
      await reorderFields({
        variables: { workTypeId, fieldIds }
      });
    } catch (error) {
      console.error('Error reordering fields:', error);
    }
    
    setDraggedItem(null);
  };

  const handleDragEnd = (e) => {
    setDraggedItem(null);
    setDragOverIndex(null);
    e.target.style.opacity = '1';
  };

  if (!workTypeId) {
    return (
      <Card>
        <div style={{ textAlign: 'center', color: '#999', padding: '24px' }}>
          <Text>Save the work type first to manage custom fields</Text>
        </div>
      </Card>
    );
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Custom Fields</Title>
          <Text type="secondary" style={{ fontSize: '14px' }}>
            Create custom fields that will be available when creating projects of this work type
          </Text>
        </div>
        <Button 
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => handleOpenModal()}
          disabled={disabled}
          size="middle"
        >
          Add Field
        </Button>
      </div>

      {fieldsLoading ? (
        <Card loading={true} />
      ) : fields.length === 0 ? (
        <Card>
          <div style={{ 
            textAlign: 'center', 
            padding: '32px 16px',
            color: '#999'
          }}>
            <Text type="secondary">No custom fields defined yet</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Click "Add Field" to create your first custom field
            </Text>
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {fields.map((field, index) => (
            <Card
              key={field.id}
              size="small"
              draggable={!disabled}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnter={(e) => handleDragEnter(e, index)}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              style={{
                borderLeft: dragOverIndex === index ? '4px solid #52c41a' : '4px solid #1890ff',
                backgroundColor: draggedItem === index ? '#f0f0f0' : dragOverIndex === index ? '#f6ffed' : '#fafafa',
                cursor: disabled ? 'default' : 'move',
                transition: 'all 0.2s ease',
                transform: draggedItem === index ? 'scale(0.98)' : 'scale(1)',
                boxShadow: dragOverIndex === index ? '0 4px 12px rgba(0, 0, 0, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  {!disabled && (
                    <div style={{ color: '#999', cursor: 'move' }}>
                      <DragOutlined />
                    </div>
                  )}
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <Text strong>{field.fieldName}</Text>
                      <Tag color="blue">{field.fieldType}</Tag>
                      {field.isRequired && <Tag color="red">Required</Tag>}
                      {!field.isActive && <Tag color="gray">Inactive</Tag>}
                    </div>
                    
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      <div>Key: <code>{field.fieldKey}</code></div>
                      {field.placeholder && <div>Placeholder: {field.placeholder}</div>}
                      {field.helpText && <div>Help: {field.helpText}</div>}
                      {field.defaultValue && <div>Default: {field.defaultValue}</div>}
                      {field.options && field.options.length > 0 && (
                        <div>
                          Options: {field.options.map(opt => opt.label).join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {!disabled && (
                  <Space>
                    <Button
                      type="text"
                      icon={<EditOutlined />}
                      onClick={() => handleOpenModal(field)}
                      size="small"
                    />
                    <Popconfirm
                      title="Delete Field"
                      description="Are you sure you want to delete this custom field? This action cannot be undone."
                      onConfirm={() => handleDeleteField(field.id)}
                      okText="Delete"
                      cancelText="Cancel"
                      okButtonProps={{ danger: true }}
                    >
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        size="small"
                      />
                    </Popconfirm>
                  </Space>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Field Creation/Edit Modal */}
      <Modal
        title={editingField ? 'Edit Custom Field' : 'Add Custom Field'}
        open={isModalVisible}
        onCancel={handleCloseModal}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            isRequired: false,
            isActive: true
          }}
        >
          <Form.Item
            name="fieldName"
            label="Field Name"
            rules={[
              { required: true, message: 'Please enter field name' },
              { min: 2, max: 100, message: 'Field name must be between 2 and 100 characters' }
            ]}
          >
            <Input 
              placeholder="Enter field name" 
              onChange={(e) => {
                const fieldKey = generateFieldKey(e.target.value);
                form.setFieldValue('fieldKey', fieldKey);
              }}
            />
          </Form.Item>

          <Form.Item
            name="fieldKey"
            label={
              <span>
                Field Key 
                <Tooltip title="Unique identifier used in the API and database">
                  <QuestionCircleOutlined style={{ marginLeft: 4 }} />
                </Tooltip>
              </span>
            }
            rules={[
              { required: true, message: 'Please enter field key' },
              { pattern: /^[a-z0-9_]+$/, message: 'Field key can only contain lowercase letters, numbers, and underscores' }
            ]}
          >
            <Input placeholder="Auto-generated from field name" />
          </Form.Item>

          <Form.Item
            name="fieldType"
            label="Field Type"
            rules={[{ required: true, message: 'Please select field type' }]}
          >
            <Select placeholder="Select field type">
              {fieldTypeOptions.map(option => (
                <Option key={option.value} value={option.value}>
                  <div>
                    <div>{option.label}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{option.description}</div>
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>

          {/* Show options input for select/multiselect fields */}
          <Form.Item shouldUpdate={(prevValues, currentValues) => 
            prevValues.fieldType !== currentValues.fieldType
          }>
            {({ getFieldValue }) => {
              const fieldType = getFieldValue('fieldType');
              return ['select', 'multiselect'].includes(fieldType) ? (
                <Form.Item
                  label="Options"
                  required
                  tooltip="Enter each option on a new line. Use format 'value:label' or just 'value'"
                >
                  <TextArea
                    rows={4}
                    placeholder={`option1:Option 1
option2:Option 2
option3:Option 3`}
                    value={optionsText}
                    onChange={(e) => setOptionsText(e.target.value)}
                  />
                </Form.Item>
              ) : null;
            }}
          </Form.Item>

          <Form.Item
            name="placeholder"
            label="Placeholder Text"
          >
            <Input placeholder="Enter placeholder text (optional)" />
          </Form.Item>

          <Form.Item
            name="helpText"
            label="Help Text"
          >
            <TextArea rows={2} placeholder="Enter help text (optional)" />
          </Form.Item>

          <Form.Item
            name="defaultValue"
            label="Default Value"
          >
            <Input placeholder="Enter default value (optional)" />
          </Form.Item>

          <div style={{ display: 'flex', gap: '24px' }}>
            <Form.Item
              name="isRequired"
              label="Required Field"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              name="isActive"
              label="Active"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </div>

          <Divider />

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <Button onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit">
              {editingField ? 'Update Field' : 'Create Field'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default CustomFieldsManager;