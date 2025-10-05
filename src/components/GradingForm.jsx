import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Switch,
  message,
  Select,
  Card,
  InputNumber,
  Button,
  Space,
  Divider,
  Typography,
  Empty,
  Tag,
  Row,
  Col,
  Tooltip,
  Alert
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  DollarOutlined,
  InfoCircleOutlined,
  TagsOutlined
} from '@ant-design/icons';
import { useQuery, useMutation } from '@apollo/client';
import { CREATE_GRADING, UPDATE_GRADING, GET_GRADINGS } from '../gql/gradings';
import { GET_WORK_TYPES } from '../gql/workTypes';
import { GET_TASK_TYPES } from '../gql/taskTypes';

const { Option } = Select;
const { Title, Text } = Typography;
const { TextArea } = Input;

const GradingForm = ({ grading, mode, onSuccess, onCancel, submitting, onSubmitChange }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [selectedWorkType, setSelectedWorkType] = useState(null);
  const [taskTypePricings, setTaskTypePricings] = useState([]);

  // GraphQL queries
  const { data: workTypesData, loading: workTypesLoading } = useQuery(GET_WORK_TYPES);
  const { data: taskTypesData, loading: taskTypesLoading } = useQuery(GET_TASK_TYPES);

  // GraphQL mutations
  const [createGrading] = useMutation(CREATE_GRADING, {
    refetchQueries: [{ query: GET_GRADINGS }],
    onCompleted: () => {
      message.success('Grading created successfully');
      onSuccess?.();
    },
    onError: (error) => {
      message.error(`Failed to create grading: ${error.message}`);
    },
  });

  const [updateGrading] = useMutation(UPDATE_GRADING, {
    refetchQueries: [{ query: GET_GRADINGS }],
    onCompleted: () => {
      message.success('Grading updated successfully');
      onSuccess?.();
    },
    onError: (error) => {
      message.error(`Failed to update grading: ${error.message}`);
    },
  });

  // Initialize form data
  useEffect(() => {
    if (mode === 'edit' && grading) {
      form.setFieldsValue({
        name: grading.name,
        description: grading.description,
        workTypeId: grading.workTypeId,
        defaultRate: grading.defaultRate || 0,
        currency: grading.currency || 'INR',
        unit: grading.unit || 'image',
        isActive: grading.isActive ?? true,
      });

      setSelectedWorkType(grading.workType);

      // Initialize task type pricings from existing data
      const initialPricings = grading.taskTypes?.map(taskType => ({
        taskTypeId: taskType.id,
        taskTypeName: taskType.name,
        taskTypeDescription: taskType.description || 'No description',
        taskTypeColor: taskType.color,
        taskTypeIcon: taskType.icon,
        employeeRate: taskType.gradingTask?.employeeRate || 0,
        currency: taskType.gradingTask?.currency || 'INR',
        unit: taskType.gradingTask?.unit || 'image',
        isActive: taskType.gradingTask?.isActive ?? true,
      })) || [];

      setTaskTypePricings(initialPricings);
    } else {
      // Set default values for create mode
      form.setFieldsValue({
        isActive: true,
        defaultRate: 0,
        currency: 'INR',
        unit: 'image',
      });
      setTaskTypePricings([]);
      setSelectedWorkType(null);
    }
  }, [grading, mode, form]);

  // Handle work type selection
  const handleWorkTypeChange = (workTypeId) => {
    const workType = workTypesData?.workTypes?.find(wt => wt.id === workTypeId);
    setSelectedWorkType(workType);
    
    // Auto-populate all TaskTypes associated with this WorkType
    if (workType?.taskTypes && mode === 'create') {
      const autoTaskTypePricings = workType.taskTypes
        .filter(taskType => taskType.isActive)
        .map(taskType => ({
          taskTypeId: taskType.id,
          taskTypeName: taskType.name,
          taskTypeDescription: taskType.description || 'No description',
          taskTypeColor: taskType.color,
          taskTypeIcon: taskType.icon,
          employeeRate: 0,
          currency: 'INR', // Default currency, no user selection needed
          unit: 'image', // Fixed to image only
          isActive: true,
        }));
      setTaskTypePricings(autoTaskTypePricings);
    } else if (mode === 'create') {
      setTaskTypePricings([]);
    }
  };

  // Task types are now auto-populated when work type is selected
  // No need for manual add task type functionality

  // Update task type pricing
  const updateTaskTypePricing = (taskTypeId, field, value) => {
    setTaskTypePricings(pricings =>
      pricings.map(pricing =>
        pricing.taskTypeId === taskTypeId
          ? { ...pricing, [field]: value }
          : pricing
      )
    );
  };

  // Task types can only be enabled/disabled, not removed
  // since they are auto-loaded from the work type

  // Handle form submission
  const handleSubmit = async (values) => {
    try {
      // Validate that at least one task type with pricing is added
      const activePricings = taskTypePricings.filter(tp => tp.isActive && tp.employeeRate > 0);
      if (activePricings.length === 0) {
        message.error('Please add at least one task type with valid employee rate');
        return;
      }

      setLoading(true);
      onSubmitChange?.(true);

      const input = {
        name: values.name,
        description: values.description,
        workTypeId: values.workTypeId,
        defaultRate: parseFloat(values.defaultRate),
        currency: values.currency || 'INR',
        unit: values.unit || 'image',
        isActive: values.isActive,
        taskTypeRates: taskTypePricings.map(tp => ({
          taskTypeId: tp.taskTypeId,
          employeeRate: parseFloat(tp.employeeRate),
          currency: tp.currency,
          unit: tp.unit,
          isActive: tp.isActive,
        })),
      };

      if (mode === 'edit') {
        await updateGrading({
          variables: {
            id: grading.id,
            input,
          },
        });
      } else {
        await createGrading({
          variables: { input },
        });
      }
    } catch (error) {
      console.error('Submit error:', error);
      message.error('An unexpected error occurred');
    } finally {
      setLoading(false);
      onSubmitChange?.(false);
    }
  };

  // Task types are now managed automatically based on work type selection

  return (
    <div className="p-4">
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        size="middle"
      >
        {/* Basic Information */}
        <Card size="small" className="mb-4">
          <Title level={5} className="mb-4 flex items-center">
            <InfoCircleOutlined className="mr-2" />
            Basic Information
          </Title>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Grading Name"
                name="name"
                rules={[
                  { required: true, message: 'Please enter grading name' },
                  { min: 2, message: 'Name must be at least 2 characters' },
                ]}
              >
                <Input 
                  placeholder="e.g., Premium Culling Package"
                  maxLength={100}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Work Type"
                name="workTypeId"
                rules={[{ required: true, message: 'Please select a work type' }]}
              >
                <Select
                  placeholder="Select work type"
                  loading={workTypesLoading}
                  onChange={handleWorkTypeChange}
                >
                  {workTypesData?.workTypes?.filter(wt => wt.isActive).map(workType => (
                    <Option key={workType.id} value={workType.id}>
                      {workType.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Description"
            name="description"
          >
            <TextArea
              placeholder="Describe this grading package..."
              rows={3}
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label={<span><span style={{ color: 'red' }}>* </span>Default Rate (Client Price per Image)</span>}
                name="defaultRate"
                rules={[
                  { required: true, message: 'Please enter default rate' },
                  { type: 'number', min: 0, message: 'Rate must be positive' },
                ]}
              >
                <InputNumber
                  placeholder="0.00"
                  min={0}
                  precision={2}
                  prefix="₹"
                  style={{ width: '100%' }}
                  controls={true}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Active Status"
                name="isActive"
                valuePropName="checked"
              >
                <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Task Employee Rates Configuration */}
        <Card size="small" className="mb-4">
          <Title level={5} className="mb-4 flex items-center">
            <DollarOutlined className="mr-2" />
            Employee Rates per Task
          </Title>
          <Alert
            message="Employee Rates"
            description="Set the amount paid to employees for completing each task. These rates are separate from the client price."
            type="info"
            showIcon
            className="mb-4"
          />

          {/* Task Pricing List */}
          {!selectedWorkType ? (
            <Text type="secondary" className="block text-center py-8">
              Please select a work type above to see available tasks
            </Text>
          ) : taskTypePricings.length === 0 ? (
            <Text type="secondary" className="block text-center py-8">
              No tasks found for this work type
            </Text>
          ) : (
            <div className="space-y-4">
              {taskTypePricings.map((pricing, index) => (
                <Card key={pricing.taskTypeId} size="small" className="border-l-4" style={{ borderLeftColor: pricing.taskTypeColor }}>
                  <Row gutter={24} align="middle">
                    <Col span={14}>
                      <Space size="middle">
                        <div 
                          className="w-5 h-5 rounded-full"
                          style={{ backgroundColor: pricing.taskTypeColor }}
                        />
                        <div>
                          <Text strong className="text-lg block">{pricing.taskTypeName}</Text>
                          <Text type="secondary" className="text-sm block">TaskType: {pricing.taskTypeName}</Text>
                          <Text type="secondary" className="text-xs">per image</Text>
                        </div>
                      </Space>
                    </Col>
                    <Col span={6}>
                      <div className="relative">
                        <Text type="secondary" className="text-xs block mb-1">Employee Rate (₹)</Text>
                        <InputNumber
                          placeholder="0.00"
                          value={pricing.employeeRate}
                          onChange={(value) => updateTaskTypePricing(pricing.taskTypeId, 'employeeRate', value)}
                          min={0}
                          precision={2}
                          prefix="₹"
                          style={{ 
                            width: '100%', 
                            fontSize: '18px',
                            height: '45px'
                          }}
                          controls={false}
                        />
                      </div>
                    </Col>
                    <Col span={4}>
                      <div className="text-center">
                        <Text type="secondary" className="text-xs block mb-2">Status</Text>
                        <Switch
                          checked={pricing.isActive}
                          onChange={(checked) => updateTaskTypePricing(pricing.taskTypeId, 'isActive', checked)}
                          size="default"
                        />
                        <br />
                        <Text type="secondary" className="text-xs">
                          {pricing.isActive ? 'Included' : 'Excluded'}
                        </Text>
                      </div>
                    </Col>
                  </Row>
                </Card>
              ))}
            </div>
          )}

          {taskTypePricings.length > 0 && (
            <div className="mt-4 text-center">
              <Text type="secondary" className="text-sm">
                {taskTypePricings.filter(tp => tp.isActive).length} of {taskTypePricings.length} tasks included
              </Text>
            </div>
          )}
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button onClick={onCancel} disabled={loading || submitting}>
            Cancel
          </Button>
          <Button 
            type="primary" 
            htmlType="submit" 
            loading={loading || submitting}
            disabled={taskTypePricings.filter(tp => tp.isActive && tp.employeeRate > 0).length === 0}
          >
            {mode === 'edit' ? 'Update Grading' : 'Create Grading'}
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default GradingForm;