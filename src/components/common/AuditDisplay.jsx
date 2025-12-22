import React from 'react';
import { 
  Timeline, 
  Tag, 
  Typography, 
  Table, 
  Card, 
  Space, 
  Tooltip,
  Collapse,
  Badge
} from 'antd';
import { 
  UserOutlined, 
  EditOutlined, 
  PlusOutlined, 
  DeleteOutlined,
  HistoryOutlined,
  SwapOutlined,
  CheckCircleOutlined,
  FileImageOutlined,
  TeamOutlined,
  SyncOutlined
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
      case 'AUTO_UPDATE':
        return { icon: <SyncOutlined />, color: 'cyan', text: 'Auto Updated' };
      default:
        return { icon: <HistoryOutlined />, color: 'default', text: action };
    }
  };

  // Helper function to parse metadata and extract task-specific information
  const extractTaskInfo = (log) => {
    if (!log.metadata) return null;
    
    try {
      const metadata = typeof log.metadata === 'string' 
        ? JSON.parse(log.metadata) 
        : log.metadata;
      
      return {
        operationType: metadata.operationType,
        taskCode: metadata.taskCode,
        taskTypeId: metadata.taskTypeId,
        taskTypeName: metadata.taskTypeName,
        gradingId: metadata.gradingId,
        gradingName: metadata.gradingName,
        projectId: metadata.projectId,
        assigneeName: metadata.assigneeName,
        assignedByName: metadata.assignedByName,
        oldAssigneeName: metadata.oldAssigneeName,
        oldStatus: metadata.oldStatus,
        newStatus: metadata.newStatus,
        userName: metadata.userName,
        notes: metadata.notes,
        oldQuantity: metadata.oldQuantity,
        newQuantity: metadata.newQuantity,
        entityType: metadata.entityType,
        entityCode: metadata.entityCode,
        assignedQuantity: metadata.assignedQuantity
      };
    } catch (error) {
      console.error('Error parsing metadata:', error);
      return null;
    }
  };

  // Helper function to render task-specific summary badge
  const renderTaskSummary = (log, taskInfo) => {
    if (!taskInfo) return null;

    const { operationType } = taskInfo;

    // Task Status Change
    if (operationType === 'TASK_STATUS_CHANGE') {
      return (
        <div className="mb-3 p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Space>
              <SwapOutlined className="text-blue-600" />
              <Text strong className="text-blue-800">Task Status Changed</Text>
            </Space>
            <Space wrap size="small">
              <Tag color="default">{taskInfo.taskCode}</Tag>
              {taskInfo.taskTypeName && (
                <Tag color="cyan" icon={<FileImageOutlined />}>{taskInfo.taskTypeName}</Tag>
              )}
              {taskInfo.gradingName && (
                <Tag color="blue">{taskInfo.gradingName}</Tag>
              )}
            </Space>
            <Space split="→" size="small">
              <Tag color="orange">{taskInfo.oldStatus}</Tag>
              <Tag color="green">{taskInfo.newStatus}</Tag>
            </Space>
            {taskInfo.notes && (
              <Text type="secondary" className="text-xs">Note: {taskInfo.notes}</Text>
            )}
          </Space>
        </div>
      );
    }

    // Task Assignment
    if (operationType === 'TASK_ASSIGNMENT') {
      return (
        <div className="mb-3 p-3 bg-purple-50 border-l-4 border-purple-500 rounded">
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Space>
              <TeamOutlined className="text-purple-600" />
              <Text strong className="text-purple-800">Task Assignment</Text>
            </Space>
            <Space wrap size="small">
              <Tag color="default">{taskInfo.taskCode}</Tag>
              {taskInfo.taskTypeName && (
                <Tag color="cyan" icon={<FileImageOutlined />}>{taskInfo.taskTypeName}</Tag>
              )}
              {taskInfo.gradingName && (
                <Tag color="blue">{taskInfo.gradingName}</Tag>
              )}
            </Space>
            <Space wrap>
              {taskInfo.oldAssigneeName && (
                <>
                  <Tag color="red" icon={<UserOutlined />}>{taskInfo.oldAssigneeName}</Tag>
                  <Text type="secondary">→</Text>
                </>
              )}
              <Tag color="green" icon={<UserOutlined />}>{taskInfo.assigneeName}</Tag>
              {taskInfo.assignedQuantity && (
                <Tag color="geekblue" icon={<FileImageOutlined />}>
                  {taskInfo.assignedQuantity} images
                </Tag>
              )}
            </Space>
            {taskInfo.assignedByName && (
              <Text type="secondary" className="text-xs">Assigned by: {taskInfo.assignedByName}</Text>
            )}
          </Space>
        </div>
      );
    }

    // Quantity Change (Image completion tracking)
    if (operationType === 'QUANTITY_CHANGE') {
      const quantityDiff = (taskInfo.newQuantity || 0) - (taskInfo.oldQuantity || 0);
      const isIncrease = quantityDiff > 0;
      
      return (
        <div className="mb-3 p-3 bg-green-50 border-l-4 border-green-500 rounded">
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Space>
              <FileImageOutlined className="text-green-600" />
              <Text strong className="text-green-800">Image Quantity Updated</Text>
            </Space>
            <Space wrap size="small">
              <Tag color="default">{taskInfo.entityCode || taskInfo.taskCode}</Tag>
              {taskInfo.taskTypeName && (
                <Tag color="cyan" icon={<FileImageOutlined />}>{taskInfo.taskTypeName}</Tag>
              )}
              {taskInfo.gradingName && (
                <Tag color="blue">{taskInfo.gradingName}</Tag>
              )}
            </Space>
            <Space>
              <Badge 
                count={taskInfo.oldQuantity || 0} 
                style={{ backgroundColor: '#d9d9d9' }}
                showZero
              />
              <Text type="secondary">→</Text>
              <Badge 
                count={taskInfo.newQuantity || 0} 
                style={{ backgroundColor: isIncrease ? '#52c41a' : '#faad14' }}
                showZero
              />
              <Tag color={isIncrease ? 'success' : 'warning'}>
                {isIncrease ? '+' : ''}{quantityDiff} images
              </Tag>
            </Space>
            {taskInfo.assigneeName && (
              <Text type="secondary" className="text-xs">By: {taskInfo.assigneeName}</Text>
            )}
          </Space>
        </div>
      );
    }

    return null;
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
    if (!field || typeof field !== 'string') return 'Unknown Field';
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
      // Parse changedFields if it's a JSON string
      let changedFields = [];
      if (log.changedFields) {
        try {
          const parsed = parseJsonValue(log.changedFields);
          if (Array.isArray(parsed)) {
            // If it's an array of change objects [{field, from, to}]
            changedFields = parsed.map(change => {
              if (typeof change === 'object' && change !== null && change.field) {
                return change.field;
              }
              // If it's already a string (field name)
              return change;
            }).filter(field => field && typeof field === 'string');
          } else {
            // If it's just an array of field names
            changedFields = parsed;
          }
        } catch (error) {
          console.error('Error parsing changedFields:', error);
          changedFields = Object.keys(newValues);
        }
      } else {
        changedFields = Object.keys(newValues);
      }
      
      // Filter out any invalid field names
      changedFields = changedFields.filter(field => field && typeof field === 'string');
      
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
          const taskInfo = extractTaskInfo(log);
          
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
                      {log.tableName}
                    </Tag>
                    <Tag color="default">
                      {log.status}
                    </Tag>
                  </Space>
                </div>

                {/* Task-Specific Summary (NEW) */}
                {renderTaskSummary(log, taskInfo)}

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
                {(() => {
                  // Parse changedFields safely
                  let changedFieldsList = [];
                  if (log.changedFields) {
                    try {
                      const parsed = parseJsonValue(log.changedFields);
                      if (Array.isArray(parsed)) {
                        // If it's an array of change objects [{field, from, to}]
                        changedFieldsList = parsed.map(change => 
                          change.field || change
                        );
                      }
                    } catch (error) {
                      console.error('Error parsing changedFields:', error);
                    }
                  }
                  
                  return changedFieldsList.length > 0 && (
                    <div className="mb-3">
                      <Text className="text-sm font-medium text-gray-600">
                        Changed Fields: 
                      </Text>
                      <Space wrap className="ml-2">
                        {changedFieldsList.map((field, index) => (
                          <Tag key={index} size="small" color="processing">
                            {formatFieldName(field)}
                          </Tag>
                        ))}
                      </Space>
                    </div>
                  );
                })()}

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