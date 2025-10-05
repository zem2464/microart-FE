import React from 'react';
import {
  Descriptions,
  Tag,
  Space,
  Card,
  Typography,
  Empty,
  Row,
  Col,
  Statistic,
  Divider,
  Badge,
  Tooltip
} from 'antd';
import {
  CalendarOutlined,
  UserOutlined,
  DollarOutlined,
  TagsOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { formatDate } from '../utils/dateUtils';

const { Title, Text } = Typography;

const GradingDetail = ({ grading }) => {
  if (!grading) {
    return <Empty description="No grading data available" />;
  }

  // Calculate statistics
  const totalTaskTypes = grading.taskTypes?.length || 0;
  const activeTaskTypes = grading.taskTypes?.filter(tt => tt.gradingTask?.isActive)?.length || 0;
  
  // Calculate total employee rates (what we pay employees)
  const totalEmployeeRate = grading.taskTypes?.reduce((sum, tt) => {
    return sum + (tt.gradingTask?.employeeRate || 0);
  }, 0) || 0;

  // Get total INR pricing only for employee rates
  const totalEmployeeRateINR = grading.taskTypes?.reduce((acc, tt) => {
    if (tt.gradingTask?.isActive && (tt.gradingTask.currency || 'INR') === 'INR') {
      acc += tt.gradingTask.employeeRate || 0;
    }
    return acc;
  }, 0) || 0;

  // Client price per image
  const clientRate = grading.defaultRate || 0;
  
  // Profit margin per image
  const profitMargin = clientRate - totalEmployeeRateINR;

  return (
    <div className="p-4 space-y-6">
      {/* Header Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <Title level={4} className="mb-0 flex items-center">
            <DollarOutlined className="mr-2 text-blue-500" />
            {grading.name}
          </Title>
          <Space>
            <Tag color={grading.isActive ? 'green' : 'red'}>
              {grading.isActive ? 'Active' : 'Inactive'}
            </Tag>
          </Space>
        </div>
        
        {grading.description && (
          <Text type="secondary" className="text-base">
            {grading.description}
          </Text>
        )}
      </div>

      {/* Statistics Cards */}
      <Row gutter={16}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Client Rate (per image)"
              value={clientRate}
              precision={2}
              prefix="₹"
              valueStyle={{ color: '#1890ff', fontSize: '18px' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Total Employee Cost"
              value={totalEmployeeRateINR}
              precision={2}
              prefix="₹"
              valueStyle={{ color: '#faad14', fontSize: '18px' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Profit Margin"
              value={profitMargin}
              precision={2}
              prefix="₹"
              valueStyle={{ color: profitMargin >= 0 ? '#52c41a' : '#ff4d4f', fontSize: '18px' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Active Tasks"
              value={activeTaskTypes}
              suffix={`/ ${totalTaskTypes}`}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Basic Information */}
      <Card size="small">
        <Title level={5} className="mb-4 flex items-center">
          <InfoCircleOutlined className="mr-2" />
          Basic Information
        </Title>
        
        <Descriptions column={2} size="small">
          <Descriptions.Item label="Grading ID">
            <Text copyable={{ text: grading.id }} className="font-mono text-xs">
              {grading.id}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="Work Type">
            <Tag color="blue">{grading.workType?.name}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Client Rate">
            <Text strong style={{ fontSize: '16px', color: '#1890ff' }}>
              ₹{(grading.defaultRate || 0).toFixed(2)}
            </Text>
            <Text type="secondary"> per {grading.unit || 'image'}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Currency">
            <Tag>{grading.currency || 'INR'}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Status">
            <Badge 
              status={grading.isActive ? 'success' : 'error'} 
              text={grading.isActive ? 'Active' : 'Inactive'} 
            />
          </Descriptions.Item>
          <Descriptions.Item label="Total Task Types">
            {totalTaskTypes} ({activeTaskTypes} active)
          </Descriptions.Item>
          <Descriptions.Item label="Created">
            <Space>
              <CalendarOutlined />
              {formatDate(grading.createdAt)}
              {grading.creator && (
                <Text type="secondary">
                  by {grading.creator.firstName} {grading.creator.lastName}
                </Text>
              )}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="Last Updated">
            <Space>
              <CalendarOutlined />
              {formatDate(grading.updatedAt)}
              {grading.updater && (
                <Text type="secondary">
                  by {grading.updater.firstName} {grading.updater.lastName}
                </Text>
              )}
            </Space>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Task Types & Employee Rates */}
      <Card size="small">
        <Title level={5} className="mb-4 flex items-center">
          <TagsOutlined className="mr-2" />
          Task Types & Employee Rates
        </Title>

        {(!grading.taskTypes || grading.taskTypes.length === 0) ? (
          <Empty 
            description="No task types configured"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <div className="space-y-3">
            {grading.taskTypes.map((taskType) => {
              const pricingInfo = taskType.gradingTask;
              const isActive = pricingInfo?.isActive ?? true;
              
              return (
                <Card 
                  key={taskType.id} 
                  size="small" 
                  className={`border-l-4 ${isActive ? 'bg-white' : 'bg-gray-50'}`}
                  style={{ borderLeftColor: taskType.color }}
                >
                  <Row gutter={16} align="middle">
                    <Col span={8}>
                      <Space>
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: taskType.color }}
                        />
                        <div>
                          <Text strong className={isActive ? '' : 'text-gray-500'}>
                            {taskType.name}
                          </Text>
                          {taskType.description && (
                            <div>
                              <Text type="secondary" className="text-sm">
                                {taskType.description}
                              </Text>
                            </div>
                          )}
                        </div>
                      </Space>
                    </Col>
                    
                    <Col span={4}>
                      <div className="text-center">
                        <Text type="secondary" className="text-xs block">Employee Rate</Text>
                        <Text strong className="text-lg">
                          {pricingInfo?.employeeRate?.toFixed(2) || '0.00'}
                        </Text>
                        <div>
                          <Text type="secondary" className="text-sm">
                            {pricingInfo?.currency || 'INR'}
                          </Text>
                        </div>
                      </div>
                    </Col>

                    <Col span={4}>
                      <div className="text-center">
                        <Tag color="default">
                          {pricingInfo?.unit || 'image'}
                        </Tag>
                      </div>
                    </Col>

                    <Col span={4}>
                      <div className="text-center">
                        <Badge 
                          status={isActive ? 'success' : 'default'} 
                          text={isActive ? 'Active' : 'Inactive'}
                        />
                      </div>
                    </Col>

                    <Col span={4}>
                      <div className="text-center">
                        {pricingInfo?.createdAt && (
                          <Tooltip title={`Added on ${formatDate(pricingInfo.createdAt)}`}>
                            <Text type="secondary" className="text-sm">
                              <CalendarOutlined className="mr-1" />
                              {new Date(pricingInfo.createdAt).toLocaleDateString()}
                            </Text>
                          </Tooltip>
                        )}
                      </div>
                    </Col>
                  </Row>
                </Card>
              );
            })}

            <Divider />
            
            {/* Pricing Summary */}
            <div className="bg-gray-50 p-4 rounded">
              <Title level={5} className="mb-3">Pricing Breakdown</Title>
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic
                    title="Client Rate (per image)"
                    value={clientRate}
                    precision={2}
                    prefix="₹"
                    valueStyle={{ color: '#1890ff', fontSize: '18px' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Total Employee Cost"
                    value={totalEmployeeRateINR}
                    precision={2}
                    prefix="₹"
                    valueStyle={{ color: '#faad14', fontSize: '18px' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Profit Margin"
                    value={profitMargin}
                    precision={2}
                    prefix="₹"
                    valueStyle={{ color: profitMargin >= 0 ? '#52c41a' : '#ff4d4f', fontSize: '18px' }}
                  />
                </Col>
              </Row>
              
              {profitMargin < 0 && (
                <div className="text-center py-4 mt-3">
                  <ExclamationCircleOutlined className="text-red-500 text-2xl mb-2" />
                  <div>
                    <Text type="danger">Warning: Employee costs exceed client rate!</Text>
                  </div>
                </div>
              )}
              
              {totalEmployeeRateINR === 0 && (
                <div className="text-center py-4 mt-3">
                  <ExclamationCircleOutlined className="text-orange-500 text-2xl mb-2" />
                  <div>
                    <Text type="secondary">No active employee rates configured</Text>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Work Type Information */}
      {grading.workType && (
        <Card size="small">
          <Title level={5} className="mb-4">Work Type Details</Title>
          <Descriptions column={1} size="small">
            <Descriptions.Item label="Work Type Name">
              {grading.workType.name}
            </Descriptions.Item>
            {grading.workType.description && (
              <Descriptions.Item label="Description">
                {grading.workType.description}
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>
      )}
    </div>
  );
};

export default GradingDetail;