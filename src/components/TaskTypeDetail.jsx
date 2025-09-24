import React from 'react';
import { 
  Tag, 
  Spin,
  Empty,
  Alert,
  Badge,
  Space,
  Typography,
  Timeline
} from 'antd';
import { 
  EyeOutlined, 
  EyeInvisibleOutlined,
  CalendarOutlined,
  UserOutlined,
  HistoryOutlined,
  InfoCircleOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { useQuery } from '@apollo/client';
import { formatDateTime, formatSmartDate } from '../utils/dateUtils';
import { GET_RECORD_AUDIT_LOGS } from '../gql/auditLogs';
import { ME_QUERY } from '../gql/me';
import { hasPermission, MODULES, MODULE_ACTIONS, generatePermission } from '../config/permissions';
import { 
  CleanDescriptionsSection,
  CleanCollapsibleSection
} from './common/CleanDrawer';

const { Text } = Typography;

// Audit Log Timeline Component (lazy-loaded)
const AuditLogTimeline = ({ taskTypeId, expanded }) => {
  // Get current user info for permission checks
  const { data: userData } = useQuery(ME_QUERY, {
    fetchPolicy: 'cache-and-network'
  });
  
  const { data, loading, error } = useQuery(GET_RECORD_AUDIT_LOGS, {
    variables: {
      tableName: 'TaskTypes',
      recordId: taskTypeId
    },
    skip: !taskTypeId || !expanded, // Only load when expanded
    errorPolicy: 'all',
    fetchPolicy: 'cache-and-network'
  });

  if (!expanded) {
    return (
      <div className="text-center text-gray-500 py-4">
        <HistoryOutlined className="text-lg mb-2" />
        <p>Expand to view audit history</p>
      </div>
    );
  }

  if (loading) return <Spin />;
  
  if (error) {
    console.error('Audit log error details:', error);
    const isAuthError = error.message.includes('Authentication') || error.message.includes('token');
    
    return (
      <Alert 
        message={isAuthError ? "Authentication Required" : "Unable to Load Audit Logs"} 
        description={isAuthError ? "Please log in as an admin to view audit history." : error.message}
        type="warning" 
        showIcon 
      />
    );
  }
  
  if (!data?.recordAuditLogs?.length) {
    const currentUserRole = userData?.me?.role?.name;
    const auditReadPermission = generatePermission(MODULES.AUDIT_LOGS, 'read');
    const hasAuditPermission = hasPermission(userData?.me, auditReadPermission);

    return (
      <Empty 
        description={
          <div>
            <p>No audit history found</p>
            <div className="text-sm text-gray-500 mt-2">
              <p><strong>Current User:</strong> {userData?.me?.email || 'Not logged in'}</p>
              <p><strong>Role:</strong> {currentUserRole || 'Unknown'}</p>
              <p><strong>Has Audit Permission:</strong> {hasAuditPermission ? 'Yes' : 'No'}</p>
              {!hasAuditPermission && (
                <p className="text-orange-600 mt-2">
                  ⚠️ You need admin permissions to view audit logs. Please log in as admin@microart.com
                </p>
              )}
            </div>
          </div>
        } 
      />
    );
  }

  const getActionIcon = (action) => {
    switch (action) {
      case 'CREATE': return { color: 'green', text: 'Created' };
      case 'UPDATE': return { color: 'blue', text: 'Updated' };
      case 'DELETE': return { color: 'red', text: 'Deleted' };
      default: return { color: 'gray', text: action };
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'SUCCESS': return 'success';
      case 'FAILED': return 'error';
      case 'PARTIAL': return 'warning';
      default: return 'default';
    }
  };

  const formatChangedFields = (changedFields) => {
    if (!changedFields || !Array.isArray(changedFields)) return null;
    return changedFields.join(', ');
  };

  return (
    <div className="drawer-timeline">
      <Timeline mode="left">
        {data.recordAuditLogs.map((log, index) => {
          const actionInfo = getActionIcon(log.action);
          
          return (
            <Timeline.Item
              key={log.id}
              color={actionInfo.color}
              label={
                <div className="text-xs text-gray-500">
                  <div>{formatSmartDate(log.createdAt)}</div>
                  <div>{formatDateTime(log.createdAt).split(' ')[1]}</div>
                </div>
              }
            >
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Tag color={actionInfo.color}>{actionInfo.text}</Tag>
                  <Tag color={getStatusColor(log.status)}>{log.status}</Tag>
                </div>
                
                <div className="text-sm">
                  <div className="flex items-center space-x-1 text-gray-600">
                    <UserOutlined />
                    <span>{log.user?.firstName} {log.user?.lastName}</span>
                    <span className="text-gray-400">({log.user?.email})</span>
                  </div>
                </div>

                {log.changedFields && (
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">Changed fields: </span>
                    <span className="text-blue-600">{formatChangedFields(log.changedFields)}</span>
                  </div>
                )}

                {log.changes && (
                  <div className="text-xs bg-gray-50 p-2 rounded border">
                    <pre className="whitespace-pre-wrap text-gray-600">
                      {JSON.stringify(log.changes, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </Timeline.Item>
          );
        })}
      </Timeline>
    </div>
  );
};

const EnhancedTaskTypeDetail = ({ 
  open,
  onClose,
  taskType, 
  onEdit, 
  onToggleStatus,
  loading = false
}) => {
  const formatUser = (user) => {
    if (!user) return 'Unknown';
    return `${user.firstName} ${user.lastName}`;
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  if (!taskType) {
    return (
      <div className="text-center py-8">
        <Empty description="No task type data available" />
      </div>
    );
  }

  // Basic info data for descriptions
  const basicInfoItems = [
    {
      key: 'name',
      label: 'Name',
      children: <Text strong>{taskType.name}</Text>
    },
    {
      key: 'description',
      label: 'Description',
      children: <Text>{taskType.description || 'No description provided'}</Text>
    },
    {
      key: 'color',
      label: 'Color',
      children: (
        <Space>
          <div 
            style={{ 
              backgroundColor: taskType.color,
              width: 20,
              height: 20,
              borderRadius: 4,
              border: '1px solid #d9d9d9'
            }} 
          />
          <Text code>{taskType.color}</Text>
        </Space>
      )
    },
    {
      key: 'icon',
      label: 'Icon',
      children: <Text code>{taskType.icon}</Text>
    },
    {
      key: 'sortOrder',
      label: 'Sort Order',
      children: <Badge count={taskType.sortOrder} color="blue" />
    },
    {
      key: 'status',
      label: 'Status',
      children: (
        <Tag 
          color={taskType.isActive ? 'success' : 'default'}
          icon={taskType.isActive ? <EyeOutlined /> : <EyeInvisibleOutlined />}
        >
          {taskType.isActive ? 'Active' : 'Inactive'}
        </Tag>
      )
    }
  ];

  // System info data for descriptions
  const systemInfoItems = [
    {
      key: 'createdBy',
      label: 'Created By',
      children: (
        <Space>
          <UserOutlined />
          <Text>{formatUser(taskType.creator)}</Text>
        </Space>
      )
    },
    {
      key: 'updatedBy',
      label: 'Updated By', 
      children: (
        <Space>
          <UserOutlined />
          <Text>{formatUser(taskType.updater)}</Text>
        </Space>
      )
    },
    {
      key: 'createdAt',
      label: 'Created At',
      children: (
        <Space>
          <CalendarOutlined />
          <Text>{formatDateTime(taskType.createdAt)}</Text>
        </Space>
      )
    },
    {
      key: 'updatedAt',
      label: 'Updated At',
      children: (
        <Space>
          <CalendarOutlined />
          <Text>{formatDateTime(taskType.updatedAt)}</Text>
        </Space>
      )
    }
  ];

  const detailContent = (
    <>
      {/* Basic Information */}
      <CleanDescriptionsSection
        title="Basic Information"
        items={basicInfoItems}
        column={1}
        bordered={true}
        layout="horizontal"
        size="default"
        extra={<InfoCircleOutlined />}
      />

      {/* System Information */}
      <CleanDescriptionsSection
        title="System Information"
        items={systemInfoItems}
        column={1}
        bordered={true}
        layout="horizontal"
        size="default"
        extra={<SettingOutlined />}
      />

      {/* Audit History */}
      <CleanCollapsibleSection
        title="Audit History"
        defaultExpanded={false}
        extra={<HistoryOutlined />}
      >
        <AuditLogTimeline taskTypeId={taskType.id} expanded={true} />
      </CleanCollapsibleSection>
    </>
  );

  return detailContent;
};

export default EnhancedTaskTypeDetail;
export { EnhancedTaskTypeDetail as TaskTypeDetail };