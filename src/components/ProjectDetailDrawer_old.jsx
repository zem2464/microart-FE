import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  Spin,
  Alert,
  Typography,
  Tag,
  Tabs,
  Table,
  Select,
  DatePicker,
  InputNumber,
  message,
  Space,
  Button,
  Tooltip,
  Empty,
  Statistic,
  Row,
  Col,
  Card,
  Badge,
  Progress,
} from 'antd';
import {
  FolderOutlined,
  CodeOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  FileImageOutlined,
  ReloadOutlined,
  SaveOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { GET_PROJECT_DETAIL } from '../graphql/projectQueries';
import {
  UPDATE_TASK_STATUS,
  UPDATE_TASK,
} from '../gql/tasks';
import {
  BULK_CREATE_TASK_ASSIGNMENTS,
  DELETE_TASK_ASSIGNMENT,
  UPDATE_TASK_ASSIGNMENT,
} from '../gql/taskAssignments';
import { GET_AVAILABLE_USERS } from '../graphql/projectQueries';

const { Title, Text } = Typography;
const { Option } = Select;

// Status configuration matching TaskTable
const TASK_STATUS = {
  TODO: { label: 'To Do', color: 'default', icon: <ClockCircleOutlined /> },
  IN_PROGRESS: { label: 'In Progress', color: 'blue', icon: <SyncOutlined spin /> },
  REVIEW: { label: 'Ready QC', color: 'purple', icon: <ExclamationCircleOutlined /> },
  COMPLETED: { label: 'Completed', color: 'green', icon: <CheckCircleOutlined /> },
  REVISION: { label: 'Re-Open', color: 'orange', icon: <ExclamationCircleOutlined /> },
};

const ProjectDetailDrawer = ({ projectId }) => {
  const [activeTab, setActiveTab] = useState('0');
  const [editingCell, setEditingCell] = useState({
    gradingId: null,
    taskTypeId: null,
    field: null,
  });
  const [editedData, setEditedData] = useState({});

  // Fetch project details with all related data
  const { data, loading, error, refetch } = useQuery(GET_PROJECT_DETAIL, {
    variables: { id: projectId },
    skip: !projectId,
    fetchPolicy: 'cache-and-network',
  });

  // Mutations
  const [updateTaskStatus] = useMutation(UPDATE_TASK_STATUS);
  const [updateTask] = useMutation(UPDATE_TASK);
  const [updateTaskImageQuantity] = useMutation(UPDATE_TASK_IMAGE_QUANTITY);

  const project = data?.project;

  // Task status update handler
  const handleStatusChange = async (taskId, newStatus) => {
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

  // Due date update handler
  const handleDueDateChange = async (taskId, newDate) => {
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

  // Completed image quantity update handler
  const handleImageQuantityChange = async (taskId, quantity) => {
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
        message="Error Loading Project"
        description={error.message}
        type="error"
        showIcon
      />
    );
  }

  if (!project) {
    return (
      <Empty description="Project not found" />
    );
  }

  // Task status options
  const taskStatusOptions = [
    { value: 'PENDING', label: 'Pending', color: 'default' },
    { value: 'ASSIGNED', label: 'Assigned', color: 'blue' },
    { value: 'IN_PROGRESS', label: 'In Progress', color: 'processing' },
    { value: 'COMPLETED', label: 'Completed', color: 'success' },
    { value: 'ON_HOLD', label: 'On Hold', color: 'warning' },
    { value: 'CANCELLED', label: 'Cancelled', color: 'error' },
  ];

  // Get task status color
  const getStatusColor = (status) => {
    const statusObj = taskStatusOptions.find((s) => s.value === status);
    return statusObj?.color || 'default';
  };

  // Task columns for table
  const getTaskColumns = () => [
    {
      title: 'Task Code',
      dataIndex: 'taskCode',
      key: 'taskCode',
      width: 120,
      fixed: 'left',
      render: (code) => <Text strong>{code}</Text>,
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      ellipsis: true,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (status, record) => (
        <Select
          value={status}
          onChange={(value) => handleStatusChange(record.id, value)}
          style={{ width: '100%' }}
          size="small"
        >
          {taskStatusOptions.map((option) => (
            <Select.Option key={option.value} value={option.value}>
              <Tag color={option.color}>{option.label}</Tag>
            </Select.Option>
          ))}
        </Select>
      ),
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 150,
      render: (date, record) => (
        <DatePicker
          value={date ? dayjs(date) : null}
          onChange={(value) => handleDueDateChange(record.id, value)}
          format="YYYY-MM-DD"
          size="small"
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Image Qty',
      dataIndex: 'imageQuantity',
      key: 'imageQuantity',
      width: 100,
      align: 'center',
      render: (qty) => qty || 0,
    },
    {
      title: 'Completed Qty',
      dataIndex: 'completedImageQuantity',
      key: 'completedImageQuantity',
      width: 150,
      render: (completed, record) => (
        <InputNumber
          value={completed || 0}
          min={0}
          max={record.imageQuantity || 999999}
          onChange={(value) => handleImageQuantityChange(record.id, value)}
          size="small"
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Assignee',
      dataIndex: 'taskAssignments',
      key: 'assignee',
      width: 150,
      render: (assignments) => {
        if (!assignments || assignments.length === 0) {
          return <Text type="secondary">Unassigned</Text>;
        }
        return assignments.map((assignment) => (
          <Tag key={assignment.id}>
            {assignment.user?.firstName} {assignment.user?.lastName}
          </Tag>
        ));
      },
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority) => {
        const colorMap = {
          LOW: 'default',
          MEDIUM: 'blue',
          HIGH: 'orange',
          URGENT: 'red',
        };
        return <Tag color={colorMap[priority] || 'default'}>{priority || 'MEDIUM'}</Tag>;
      },
    },
  ];

  // Group tasks by worktype -> gradings structure for tab display
  const getWorkTypeTabsData = () => {
    const workTypeMap = new Map();

    // Get all project gradings
    const projectGradings = project.projectGradings || [];
    
    if (projectGradings.length === 0) {
      return [];
    }

    // Group gradings by work type
    projectGradings.forEach((projectGrading) => {
      const grading = projectGrading.grading;
      if (!grading) return;

      const workType = grading.workType;
      const workTypeId = workType?.id || 'unknown';
      const workTypeName = workType?.name || 'Unknown Work Type';

      if (!workTypeMap.has(workTypeId)) {
        workTypeMap.set(workTypeId, {
          workTypeId,
          workTypeName,
          gradings: [],
        });
      }

      // Filter tasks that belong to this grading
      const tasks = (project.tasks || []).filter((task) => {
        const taskGradingId = task.gradingTask?.grading?.id || task.gradingTask?.gradingId;
        return taskGradingId === grading.id;
      });

      workTypeMap.get(workTypeId).gradings.push({
        gradingId: grading.id,
        gradingName: grading.name,
        gradingShortCode: grading.shortCode,
        imageQuantity: projectGrading.imageQuantity,
        estimatedCost: projectGrading.estimatedCost,
        actualCost: projectGrading.actualCost,
        customRate: projectGrading.customRate,
        tasks,
      });
    });

    return Array.from(workTypeMap.values());
  };

  const workTypeTabs = getWorkTypeTabsData();

  // Calculate statistics
  const totalTasks = project.tasks?.length || 0;
  const completedTasks = (project.tasks || []).filter(
    (task) => task.status === 'COMPLETED'
  ).length;
  const totalImages = project.totalImageQuantity || project.imageQuantity || 0;
  const completedImages = (project.tasks || []).reduce(
    (sum, task) => sum + (task.completedImageQuantity || 0),
    0
  );

  return (
    <div style={{ padding: '0' }}>
      {/* Header with Refresh Button */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => refetch()}
          size="small"
        >
          Refresh
        </Button>
      </div>

      {/* Project Statistics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Total Tasks"
              value={totalTasks}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Completed"
              value={completedTasks}
              suffix={`/ ${totalTasks}`}
              valueStyle={{ color: '#3f8600' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Total Images"
              value={totalImages}
              prefix={<FileImageOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Completed Images"
              value={completedImages}
              suffix={`/ ${totalImages}`}
              valueStyle={{ color: '#3f8600' }}
              prefix={<FileImageOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Quick Info Bar */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space split={<span style={{ color: '#d9d9d9' }}>|</span>} size="large">
          <Space>
            <CodeOutlined />
            <Text strong>Project:</Text>
            <Text code>{project.projectCode}</Text>
          </Space>
          <Space>
            <FolderOutlined />
            <Text strong>Folder:</Text>
            <Text>{project.projectCode}</Text>
          </Space>
          <Space>
            <Text strong>Client:</Text>
            <Text>{project.client?.displayName} ({project.client?.clientCode})</Text>
          </Space>
          <Space>
            <CalendarOutlined />
            <Text strong>Deadline:</Text>
            <Text>{project.deadlineDate ? dayjs(project.deadlineDate).format('YYYY-MM-DD') : 'No deadline'}</Text>
          </Space>
          <Space>
            <Text strong>Status:</Text>
            <Tag color="blue">{project.status}</Tag>
          </Space>
        </Space>
      </Card>

      {/* Invoice & Payment Information */}
      <Card
        title={<Title level={4}>Invoice & Payment</Title>}
        size="small"
        style={{ marginBottom: 16 }}
      >
        {project.invoice ? (
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="Invoice Number">
              <Text code>{project.invoice.invoiceNumber}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Invoice Status">
              <Tag color={project.invoice.status === 'FULLY_PAID' || project.invoice.status === 'PAID' ? 'green' : 'orange'}>
                {project.invoice.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Invoice Date">
              {project.invoice.invoiceDate ? dayjs(project.invoice.invoiceDate).format('YYYY-MM-DD') : 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Due Date">
              {project.invoice.dueDate ? dayjs(project.invoice.dueDate).format('YYYY-MM-DD') : 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Total Amount">
              <Space>
                <DollarOutlined />
                <Text strong>₹{project.invoice.totalAmount?.toFixed(2)}</Text>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Paid Amount">
              <Text strong style={{ color: '#52c41a' }}>₹{project.invoice.paidAmount?.toFixed(2) || '0.00'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Balance">
              <Text strong style={{ color: project.invoice.balanceAmount > 0 ? '#fa8c16' : '#52c41a' }}>
                ₹{project.invoice.balanceAmount?.toFixed(2) || '0.00'}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Tax Amount">
              <Text>₹{project.invoice.taxAmount?.toFixed(2) || '0.00'}</Text>
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <Empty description="No invoice generated yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </Card>

      {/* Work Types -> Gradings -> Tasks in Tab View */}
      <Card
        title={<Title level={4}>Tasks by Work Type & Grading</Title>}
        size="small"
      >
        {workTypeTabs.length === 0 ? (
          <Empty description="No tasks found for this project" />
        ) : (
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={workTypeTabs.map((workType, index) => ({
              key: String(index),
              label: (
                <Badge count={workType.gradings.reduce((sum, g) => sum + g.tasks.length, 0)} offset={[10, 0]}>
                  <span>{workType.workTypeName}</span>
                </Badge>
              ),
              children: (
                <Table
                  dataSource={workType.gradings}
                  rowKey="gradingId"
                  pagination={false}
                  size="small"
                  expandable={{
                    expandedRowRender: (grading) => (
                      <div style={{ margin: 0 }}>
                        {grading.tasks.length === 0 ? (
                          <Empty description="No tasks in this grading" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        ) : (
                          <Table
                            columns={getTaskColumns()}
                            dataSource={grading.tasks}
                            rowKey="id"
                            pagination={false}
                            size="small"
                            scroll={{ x: 1200 }}
                          />
                        )}
                      </div>
                    ),
                    rowExpandable: (grading) => grading.tasks.length > 0,
                  }}
                  columns={[
                    {
                      title: 'Grading',
                      dataIndex: 'gradingName',
                      key: 'grading',
                      width: 200,
                      render: (name, record) => (
                        <Space>
                          <Text strong>{name}</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>({record.gradingShortCode})</Text>
                        </Space>
                      ),
                    },
                    {
                      title: 'Image Qty',
                      dataIndex: 'imageQuantity',
                      key: 'imageQuantity',
                      width: 120,
                      align: 'center',
                      render: (qty) => (
                        <Tag color="blue">
                          <FileImageOutlined /> {qty || 0}
                        </Tag>
                      ),
                    },
                    {
                      title: 'Est. Cost',
                      dataIndex: 'estimatedCost',
                      key: 'estimatedCost',
                      width: 120,
                      align: 'right',
                      render: (cost) => (
                        <Text>₹{cost ? cost.toFixed(2) : '0.00'}</Text>
                      ),
                    },
                    {
                      title: 'Actual Cost',
                      dataIndex: 'actualCost',
                      key: 'actualCost',
                      width: 120,
                      align: 'right',
                      render: (cost) => (
                        <Text>{cost ? `₹${cost.toFixed(2)}` : '-'}</Text>
                      ),
                    },
                    {
                      title: 'Tasks',
                      key: 'taskCount',
                      width: 100,
                      align: 'center',
                      render: (_, record) => {
                        const completed = record.tasks.filter(t => t.status === 'COMPLETED').length;
                        const total = record.tasks.length;
                        return (
                          <Space>
                            <Badge count={total} showZero color="blue" />
                            <Text type="secondary" style={{ fontSize: 12 }}>({completed} done)</Text>
                          </Space>
                        );
                      },
                    },
                    {
                      title: 'Progress',
                      key: 'progress',
                      width: 150,
                      render: (_, record) => {
                        const totalImages = record.imageQuantity || 0;
                        const completedImages = record.tasks.reduce(
                          (sum, task) => sum + (task.completedImageQuantity || 0),
                          0
                        );
                        const percent = totalImages > 0 ? Math.round((completedImages / totalImages) * 100) : 0;
                        return (
                          <Space direction="vertical" size={0} style={{ width: '100%' }}>
                            <Text style={{ fontSize: 12 }}>{completedImages} / {totalImages} images</Text>
                            <div style={{ width: '100%', height: 4, background: '#f0f0f0', borderRadius: 2 }}>
                              <div 
                                style={{ 
                                  width: `${percent}%`, 
                                  height: '100%', 
                                  background: percent === 100 ? '#52c41a' : '#1890ff',
                                  borderRadius: 2,
                                  transition: 'width 0.3s'
                                }} 
                              />
                            </div>
                          </Space>
                        );
                      },
                    },
                  ]}
                />
              ),
            }))}
          />
        )}
      </Card>
    </div>
  );
};

export default ProjectDetailDrawer;
