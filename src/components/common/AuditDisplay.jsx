import React from 'react';
import { 
  Timeline, 
  Tag, 
  Typography, 
  Table, 
  Card, 
  Space, 
  Tooltip,
  Collapse
} from 'antd';
import { 
  UserOutlined, 
  EditOutlined, 
  PlusOutlined, 
  DeleteOutlined,
  HistoryOutlined 
} from '@ant-design/icons';

const { Text } = Typography;
const { Panel } = Collapse;

// Helper function for date formatting
const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleString();
  } catch (error) {
    return 'Invalid Date';
  }
};

const formatSmartDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  } catch (error) {
    return 'Invalid Date';
  }
};

// Enhanced Audit Display Component
const AuditDisplay = ({ auditLogs, loading = false }) => {
  
  // Helper function to get action icon and color
  const getActionInfo = (action) => {
    switch (action) {
      case 'CREATE':
        return { icon: <PlusOutlined />, color: 'green', text: 'Created' };
      case 'UPDATE':
        return { icon: <EditOutlined />, color: 'blue', text: 'Updated' };
      case 'DELETE':
        return { icon: <DeleteOutlined />, color: 'red', text: 'Deleted' };
      default:
        return { icon: <HistoryOutlined />, color: 'default', text: action };
    }
  };

  // Helper function to parse JSON values safely
  const parseJsonValue = (value) => {
    if (!value) return null;
    try {
      return typeof value === 'string' ? JSON.parse(value) : value;
    } catch (error) {
      return value;
    }
  };

  // Helper function to format field names nicely
  const formatFieldName = (field) => {
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  // Helper function to format field values
  const formatFieldValue = (value) => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  // Generate comparison table for old vs new values
  const generateChangeTable = (log) => {
    const oldValues = parseJsonValue(log.oldValues);
    const newValues = parseJsonValue(log.newValues);
    
    if (!oldValues && !newValues) return null;

    // For CREATE operations, show only new values
    if (log.action === 'CREATE' && newValues) {
      const columns = [
        { title: 'Field', dataIndex: 'field', key: 'field', width: '30%' },
        { title: 'Value', dataIndex: 'value', key: 'value', width: '70%' }
      ];

      const data = Object.entries(newValues).map(([key, value], index) => ({
        key: index,
        field: formatFieldName(key),
        value: formatFieldValue(value)
      }));

      return (
        <Table
          columns={columns}
          dataSource={data}
          pagination={false}
          size="small"
          bordered
          className="mt-3"
        />
      );
    }

    // For UPDATE operations, show old vs new comparison
    if (log.action === 'UPDATE' && oldValues && newValues) {
      const columns = [
        { title: 'Field', dataIndex: 'field', key: 'field', width: '25%' },
        { 
          title: 'Old Value', 
          dataIndex: 'oldValue', 
          key: 'oldValue', 
          width: '35%',
          render: (text) => (
            <span className="text-red-600 bg-red-50 px-2 py-1 rounded">
              {text}
            </span>
          )
        },
        { 
          title: 'New Value', 
          dataIndex: 'newValue', 
          key: 'newValue', 
          width: '35%',
          render: (text) => (
            <span className="text-green-600 bg-green-50 px-2 py-1 rounded">
              {text}
            </span>
          )
        }
      ];

      // Get changed fields or all fields from newValues
      const changedFields = log.changedFields || Object.keys(newValues);
      
      const data = changedFields.map((field, index) => ({
        key: index,
        field: formatFieldName(field),
        oldValue: formatFieldValue(oldValues[field]),
        newValue: formatFieldValue(newValues[field])
      }));

      return (
        <Table
          columns={columns}
          dataSource={data}
          pagination={false}
          size="small"
          bordered
          className="mt-3"
        />
      );
    }

    return null;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-gray-500">Loading audit information...</div>
      </div>
    );
  }

  if (!auditLogs || auditLogs.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <HistoryOutlined className="text-4xl mb-4" />
        <div>No audit history available</div>
      </div>
    );
  }

  return (
    <div className="audit-display">
      <Timeline mode="left" className="mt-4">
        {auditLogs.map((log) => {
          const actionInfo = getActionInfo(log.action);
          
          return (
            <Timeline.Item
              key={log.id}
              color={actionInfo.color}
              label={
                <div className="text-xs text-gray-500 text-right">
                  <Tooltip title={formatDateTime(log.timestamp)}>
                    <div className="font-medium">
                      {formatSmartDate(log.timestamp)}
                    </div>
                    <div className="text-xs">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </div>
                  </Tooltip>
                </div>
              }
            >
              <Card 
                size="small" 
                className="ml-4 shadow-sm"
                bodyStyle={{ padding: '12px 16px' }}
              >
                {/* Action Header */}
                <div className="flex items-center justify-between mb-3">
                  <Space>
                    <Tag 
                      color={actionInfo.color} 
                      icon={actionInfo.icon}
                      className="px-2 py-1"
                    >
                      {actionInfo.text}
                    </Tag>
                    <Tag color="default">
                      {log.status}
                    </Tag>
                  </Space>
                </div>

                {/* Description */}
                {log.description && (
                  <div className="mb-3">
                    <Text className="text-gray-700">{log.description}</Text>
                  </div>
                )}

                {/* User Information */}
                <div className="flex items-center space-x-2 mb-3 text-sm text-gray-600">
                  <UserOutlined />
                  <span>
                    {log.user ? 
                      `${log.user.firstName} ${log.user.lastName}` : 
                      log.userEmail
                    }
                  </span>
                  {log.userRole && (
                    <Tag size="small" color="geekblue">{log.userRole}</Tag>
                  )}
                </div>

                {/* Changed Fields Summary */}
                {log.changedFields && log.changedFields.length > 0 && (
                  <div className="mb-3">
                    <Text className="text-sm font-medium text-gray-600">
                      Changed Fields: 
                    </Text>
                    <Space wrap className="ml-2">
                      {log.changedFields.map((field, index) => (
                        <Tag key={index} size="small" color="processing">
                          {formatFieldName(field)}
                        </Tag>
                      ))}
                    </Space>
                  </div>
                )}

                {/* Value Changes Table */}
                <Collapse ghost>
                  <Panel 
                    header={
                      <span className="text-sm font-medium text-blue-600">
                        View Details
                      </span>
                    } 
                    key="1"
                  >
                    {generateChangeTable(log)}
                    
                    {/* Metadata */}
                    {log.metadata && (
                      <div className="mt-3">
                        <Text className="text-xs text-gray-500 block mb-1">
                          Additional Information:
                        </Text>
                        <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto max-h-32">
                          {typeof log.metadata === 'string' ? 
                            log.metadata : 
                            JSON.stringify(parseJsonValue(log.metadata), null, 2)
                          }
                        </pre>
                      </div>
                    )}
                  </Panel>
                </Collapse>
              </Card>
            </Timeline.Item>
          );
        })}
      </Timeline>
    </div>
  );
};

export default AuditDisplay;