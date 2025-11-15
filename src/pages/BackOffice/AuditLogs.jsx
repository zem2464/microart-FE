import React, { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { 
  Table, 
  Card, 
  Typography,
  Space, 
  Tag, 
  DatePicker, 
  Select, 
  Input, 
  Button, 
  Row, 
  Col,
  Descriptions,
  Modal,
  Alert,
  Tooltip,
  Badge
} from 'antd';
import { 
  EyeOutlined, 
  FilterOutlined, 
  ReloadOutlined,
  SecurityScanOutlined,
  UserOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  LoginOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { GET_AUDIT_LOGS } from '../../gql/auditLogs';

const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const AuditLogs = () => {
  const [filters, setFilters] = useState({});
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const { data, loading, refetch } = useQuery(GET_AUDIT_LOGS, {
    variables: { filters },
    fetchPolicy: 'cache-and-network'
  });

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const getActionColor = (action) => {
    const colors = {
      CREATE: 'green',
      UPDATE: 'blue',
      DELETE: 'red',
      LOGIN: 'orange',
      LOGOUT: 'purple',
      VIEW: 'cyan'
    };
    return colors[action] || 'default';
  };

  const getActionIcon = (action) => {
    const icons = {
      CREATE: <PlusOutlined />,
      UPDATE: <EditOutlined />,
      DELETE: <DeleteOutlined />,
      LOGIN: <LoginOutlined />,
      LOGOUT: <LoginOutlined />,
      VIEW: <EyeOutlined />
    };
    return icons[action] || <SecurityScanOutlined />;
  };

  const getStatusBadge = (status) => {
    const config = {
      SUCCESS: { status: 'success', text: 'Success' },
      FAILED: { status: 'error', text: 'Failed' },
      PARTIAL: { status: 'warning', text: 'Partial' }
    };
    const { status: badgeStatus, text } = config[status] || { status: 'default', text: status };
    return <Badge status={badgeStatus} text={text} />;
  };

  const formatMetadata = (metadata) => {
    if (!metadata) return null;
    try {
      const parsed = JSON.parse(metadata);
      return (
        <Descriptions size="small" column={1}>
          {Object.entries(parsed).map(([key, value]) => (
            <Descriptions.Item key={key} label={key}>
              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
            </Descriptions.Item>
          ))}
        </Descriptions>
      );
    } catch {
      return <span>{metadata}</span>;
    }
  };

  const showLogDetails = (record) => {
    setSelectedLog(record);
    setDetailModalVisible(true);
  };

  const columns = [
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 160,
      render: (timestamp) => dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss'),
      sorter: (a, b) => dayjs(a.timestamp).unix() - dayjs(b.timestamp).unix(),
      defaultSortOrder: 'descend'
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      width: 90,
      render: (action) => (
        <Tag color={getActionColor(action)} icon={getActionIcon(action)}>
          {action}
        </Tag>
      ),
      filters: [
        { text: 'Create', value: 'CREATE' },
        { text: 'Update', value: 'UPDATE' },
        { text: 'Delete', value: 'DELETE' },
        { text: 'Login', value: 'LOGIN' },
        { text: 'Logout', value: 'LOGOUT' },
        { text: 'View', value: 'VIEW' }
      ],
      onFilter: (value, record) => record.action === value
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status) => getStatusBadge(status),
      filters: [
        { text: 'Success', value: 'SUCCESS' },
        { text: 'Failed', value: 'FAILED' },
        { text: 'Partial', value: 'PARTIAL' }
      ],
      onFilter: (value, record) => record.status === value
    },
    {
      title: 'User',
      dataIndex: 'userEmail',
      key: 'userEmail',
      width: 180,
      render: (email, record) => (
        <Space>
          <UserOutlined />
          <div>
            <div style={{ fontSize: '13px' }}>{email}</div>
            <div style={{ fontSize: '11px', color: '#999' }}>{record.userRole}</div>
          </div>
        </Space>
      )
    },
    {
      title: 'Table',
      dataIndex: 'tableName',
      key: 'tableName',
      width: 80,
      filters: [
        { text: 'Users', value: 'Users' },
        { text: 'Projects', value: 'Projects' },
        { text: 'Tasks', value: 'Tasks' },
        { text: 'Roles', value: 'Roles' }
      ],
      onFilter: (value, record) => record.tableName === value
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (description) => (
        <div style={{ 
          wordWrap: 'break-word',
          wordBreak: 'break-word',
          whiteSpace: 'normal',
          maxWidth: '300px'
        }}>
          {description}
        </div>
      )
    },
    {
      title: 'IP',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: 100,
      render: (ip) => ip || 'N/A'
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_, record) => (
        <Button 
          type="link" 
          icon={<EyeOutlined />} 
          onClick={() => showLogDetails(record)}
          size="small"
        >
          View
        </Button>
      )
    }
  ];

  return (
    <Card 
      title={
        <Space>
          <SecurityScanOutlined />
          Audit Logs
        </Space>
      }
      extra={
        <Button 
          icon={<ReloadOutlined />} 
          onClick={() => refetch()}
          loading={loading}
        >
          Refresh
        </Button>
      }
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>

          {/* Filters */}
          <Card size="small" title={<><FilterOutlined /> Filters</>}>
            <Row gutter={16}>
              <Col span={6}>
                <div style={{ marginBottom: 8 }}>Action</div>
                <Select
                  placeholder="Select action"
                  allowClear
                  style={{ width: '100%' }}
                  onChange={(value) => handleFilterChange('action', value)}
                  value={filters.action}
                >
                  <Option value="CREATE">Create</Option>
                  <Option value="UPDATE">Update</Option>
                  <Option value="DELETE">Delete</Option>
                  <Option value="LOGIN">Login</Option>
                  <Option value="LOGOUT">Logout</Option>
                  <Option value="VIEW">View</Option>
                </Select>
              </Col>
              <Col span={6}>
                <div style={{ marginBottom: 8 }}>Table</div>
                <Select
                  placeholder="Select table"
                  allowClear
                  style={{ width: '100%' }}
                  onChange={(value) => handleFilterChange('tableName', value)}
                  value={filters.tableName}
                >
                  <Option value="Users">Users</Option>
                  <Option value="Projects">Projects</Option>
                  <Option value="Tasks">Tasks</Option>
                  <Option value="Roles">Roles</Option>
                </Select>
              </Col>
              <Col span={6}>
                <div style={{ marginBottom: 8 }}>Status</div>
                <Select
                  placeholder="Select status"
                  allowClear
                  style={{ width: '100%' }}
                  onChange={(value) => handleFilterChange('status', value)}
                  value={filters.status}
                >
                  <Option value="SUCCESS">Success</Option>
                  <Option value="FAILED">Failed</Option>
                  <Option value="PARTIAL">Partial</Option>
                </Select>
              </Col>
              <Col span={6}>
                <div style={{ marginBottom: 8 }}>Date Range</div>
                <RangePicker
                  style={{ width: '100%' }}
                  onChange={(dates) => {
                    if (dates) {
                      handleFilterChange('fromDate', dates[0].toISOString());
                      handleFilterChange('toDate', dates[1].toISOString());
                    } else {
                      handleFilterChange('fromDate', undefined);
                      handleFilterChange('toDate', undefined);
                    }
                  }}
                />
              </Col>
            </Row>
            <div style={{ marginTop: 16 }}>
              <Button onClick={clearFilters}>Clear Filters</Button>
            </div>
          </Card>

          {/* Audit Logs Table */}
          <Table
            columns={columns}
            dataSource={data?.auditLogs || []}
            loading={loading}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} of ${total} logs`,
              pageSizeOptions: [10, 25, 50, 100],
            }}
            size="middle"
          />
        </Space>

        {/* Detail Modal */}
        <Modal
          title="Audit Log Details"
          open={detailModalVisible}
          onCancel={() => setDetailModalVisible(false)}
          footer={null}
          width={800}
        >
          {selectedLog && (
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Descriptions title="Basic Information" bordered column={2}>
                <Descriptions.Item label="ID">{selectedLog.id}</Descriptions.Item>
                <Descriptions.Item label="Timestamp">
                  {dayjs(selectedLog.timestamp).format('YYYY-MM-DD HH:mm:ss')}
                </Descriptions.Item>
                <Descriptions.Item label="Action">
                  <Tag color={getActionColor(selectedLog.action)} icon={getActionIcon(selectedLog.action)}>
                    {selectedLog.action}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  {getStatusBadge(selectedLog.status)}
                </Descriptions.Item>
                <Descriptions.Item label="Table">{selectedLog.tableName}</Descriptions.Item>
                <Descriptions.Item label="Record ID">{selectedLog.recordId || 'N/A'}</Descriptions.Item>
                <Descriptions.Item label="User Email">{selectedLog.userEmail}</Descriptions.Item>
                <Descriptions.Item label="User Role">{selectedLog.userRole}</Descriptions.Item>
                <Descriptions.Item label="IP Address">{selectedLog.ipAddress || 'N/A'}</Descriptions.Item>
                <Descriptions.Item label="User Agent" span={2}>
                  {selectedLog.userAgent || 'N/A'}
                </Descriptions.Item>
              </Descriptions>

              <Descriptions title="Description" bordered>
                <Descriptions.Item span={3}>
                  {selectedLog.description}
                </Descriptions.Item>
              </Descriptions>

              {selectedLog.errorMessage && (
                <Alert
                  message="Error"
                  description={selectedLog.errorMessage}
                  type="error"
                  showIcon
                />
              )}

              {selectedLog.oldValues && (
                <div>
                  <Title level={5}>Old Values</Title>
                  <pre style={{ background: '#f5f5f5', padding: '12px', borderRadius: '4px', fontSize: '12px' }}>
                    {JSON.stringify(JSON.parse(selectedLog.oldValues), null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.newValues && (
                <div>
                  <Title level={5}>New Values</Title>
                  <pre style={{ background: '#f5f5f5', padding: '12px', borderRadius: '4px', fontSize: '12px' }}>
                    {JSON.stringify(JSON.parse(selectedLog.newValues), null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.metadata && (
                <div>
                  <Title level={5}>Metadata</Title>
                  {formatMetadata(selectedLog.metadata)}
                </div>
              )}
            </Space>
          )}
        </Modal>
      </Card>
  );
};

export default AuditLogs;