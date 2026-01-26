import React from 'react';
import {
  Timeline,
  Tag,
  Typography,
  Card,
  Space,
  Tooltip,
  Badge,
  Spin,
  Avatar
} from 'antd';
import {
  UserOutlined,
  EditOutlined,
  PlusOutlined,
  DeleteOutlined,
  HistoryOutlined,
  SwapOutlined,
  FileImageOutlined,
  TeamOutlined,
  SyncOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;

const AuditDisplay = ({ auditLogs, loading = false }) => {

  const getActionInfo = (action) => {
    switch (action) {
      case 'CREATE': return { icon: <PlusOutlined />, color: 'green', text: 'Created' };
      case 'UPDATE': return { icon: <EditOutlined />, color: 'blue', text: 'Updated' };
      case 'DELETE': return { icon: <DeleteOutlined />, color: 'red', text: 'Deleted' };
      case 'AUTO_UPDATE': return { icon: <SyncOutlined />, color: 'cyan', text: 'Auto Updated' };
      case 'ASSIGN': return { icon: <TeamOutlined />, color: 'purple', text: 'Assigned' };
      default: return { icon: <HistoryOutlined />, color: 'default', text: action };
    }
  };

  const getMetadata = (log) => {
    if (!log.metadata) return {};
    try {
      return typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata;
    } catch (e) { return {}; }
  };

  const renderOperationDetails = (log) => {
    const metadata = getMetadata(log);
    const { operationType } = metadata;

    if (operationType === 'TASK_STATUS_CHANGE') {
      return (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-2 rounded-r mb-2">
          <Space>
            <SwapOutlined className="text-blue-500" />
            <Text strong size="small">{metadata.taskTypeName || 'Task'}: {metadata.oldStatus} → {metadata.newStatus}</Text>
          </Space>
          {metadata.notes && <div className="text-xs text-gray-500 mt-1 italic">"{metadata.notes}"</div>}
        </div>
      );
    }

    if (operationType === 'TASK_ASSIGNMENT') {
      return (
        <div className="bg-purple-50 border-l-4 border-purple-400 p-2 rounded-r mb-2">
          <Space wrap>
            <TeamOutlined className="text-purple-500" />
            <Text strong size="small">{metadata.taskTypeName || 'Task'}:</Text>
            {metadata.oldAssigneeName ? (
              <>
                <Text delete type="secondary">{metadata.oldAssigneeName}</Text>
                <Text type="secondary">→</Text>
              </>
            ) : (
              <span className="text-xs text-gray-400">assigned to</span>
            )}
            <Tag color="purple" icon={<UserOutlined />}>{metadata.assigneeName}</Tag>
            {metadata.assignedQuantity > 0 && (
              <Tag color="cyan" className="ml-1">
                {metadata.assignedQuantity} images
              </Tag>
            )}
            {metadata.description && <Text type="secondary" className="text-xs">({metadata.description})</Text>}
          </Space>
        </div>
      );
    }

    if (operationType === 'TASK_ASSIGNMENT_UPDATE') {
      return (
        <div className="bg-purple-50 border-l-4 border-purple-400 p-2 rounded-r mb-2">
          <Space wrap>
            <TeamOutlined className="text-purple-500" />
            <Text strong size="small">{metadata.taskTypeName || 'Task'}:</Text>
            <Tag color="purple" icon={<UserOutlined />}>{metadata.assigneeName}</Tag>
            {metadata.oldQuantity !== undefined && metadata.newQuantity !== undefined && (
              <>
                <Text type="secondary">Image Quantity:</Text>
                <Text delete type="secondary">{metadata.oldQuantity}</Text>
                <SwapOutlined className="text-[10px] text-gray-400" />
                <Text strong>{metadata.newQuantity}</Text>
              </>
            )}
            {metadata.description && <Text type="secondary" className="text-xs">({metadata.description})</Text>}
          </Space>
        </div>
      );
    }

    if (operationType === 'PROJECT_STATUS_CHANGE' || operationType === 'PROJECT_STATUS_AUTO_UPDATE') {
      const isAuto = operationType === 'PROJECT_STATUS_AUTO_UPDATE';
      return (
        <div className={`${isAuto ? 'bg-cyan-50 border-cyan-400' : 'bg-orange-50 border-orange-400'} border-l-4 p-2 rounded-r mb-2`}>
          <Space>
            {isAuto ? <SyncOutlined className="text-cyan-500" /> : <SwapOutlined className="text-orange-500" />}
            <Text strong>{metadata.oldStatus} → {metadata.newStatus}</Text>
            {isAuto && <Text type="secondary" size="small" className="text-[10px] uppercase">(Auto)</Text>}
          </Space>
        </div>
      );
    }

    if (operationType === 'PROJECT_CREATION_CONSOLIDATED' || operationType === 'PROJECT_ACTIVATION_CONSOLIDATED') {
      const isCreation = operationType === 'PROJECT_CREATION_CONSOLIDATED';
      return (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-3 rounded-r mb-2">
          <Space direction="vertical" size={0}>
            <Text strong className="text-emerald-800">
              {isCreation ? '✨ Project Created' : '🚀 Project Activated'}
            </Text>
            {metadata.taskCount > 0 && (
              <Text type="secondary" className="text-xs">
                Included {metadata.taskCount} tasks: {metadata.taskTypeNames?.slice(0, 5).join(', ')}{metadata.taskTypeNames?.length > 5 ? '...' : ''}
              </Text>
            )}
          </Space>
        </div>
      );
    }

    if (operationType === 'TASKS_ADDED_TO_PROJECT') {
      return (
        <div className="bg-cyan-50 border-l-4 border-cyan-400 p-2 rounded-r mb-2">
          <Space>
            <PlusOutlined className="text-cyan-500" />
            <Text strong>Added {metadata.taskCount} Tasks</Text>
          </Space>
        </div>
      );
    }

    if (operationType === 'PROJECT_DETAIL_CHANGE') {
      return (
        <div className="bg-blue-50 border-l-4 border-blue-300 p-2 rounded-r mb-2">
          <Space wrap>
            <EditOutlined className="text-blue-400" />
            <Text strong>Changed:</Text>
            {(metadata.changedFields || []).map(field => (
              <Tag key={field} size="small" className="text-[10px]">{field.replace(/([A-Z])/g, ' $1').trim()}</Tag>
            ))}
          </Space>
        </div>
      );
    }

    if (operationType === 'QUANTITY_CHANGE') {
      const diff = metadata.newQuantity - metadata.oldQuantity;
      const entityLabel = metadata.entityTypeName || (metadata.entityType === 'Task' ? 'Task' : 'Project');
      return (
        <div className="bg-green-50 border-l-4 border-green-400 p-2 rounded-r mb-2">
          <Space wrap>
            <FileImageOutlined className="text-green-500" />
            <Text strong>{entityLabel}: {metadata.oldQuantity} → {metadata.newQuantity} ({diff > 0 ? '+' : ''}{diff})</Text>
            {metadata.gradingName && <Tag color="green" size="small">{metadata.gradingName}</Tag>}
          </Space>
        </div>
      );
    }

    // Generic Field Changes (Fallback)
    const oldValues = getMetadata(log).oldValues || log.oldValues;
    const newValues = getMetadata(log).newValues || log.newValues;
    const changedFields = getMetadata(log).changedFields || log.changedFields;

    if (changedFields) {
      try {
        const fields = typeof changedFields === 'string' ? JSON.parse(changedFields) : changedFields;
        const oldValObj = typeof oldValues === 'string' ? JSON.parse(oldValues) : oldValues;
        const newValObj = typeof newValues === 'string' ? JSON.parse(newValues) : newValues;

        if (Array.isArray(fields) && fields.length > 0) {
          return (
            <div className="space-y-1 mb-2">
              {fields.map((f, idx) => {
                const fieldName = typeof f === 'object' ? f.field : f;
                const from = typeof f === 'object' ? f.from : (oldValObj ? oldValObj[fieldName] : null);
                const to = typeof f === 'object' ? f.to : (newValObj ? newValObj[fieldName] : null);

                return (
                  <div key={`${fieldName}-${idx}`} className="flex items-center space-x-2 text-xs">
                    <Text type="secondary" className="font-medium min-w-[80px]">
                      {fieldName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim()}:
                    </Text>
                    <Text delete type="secondary" className="opacity-60">{String(from !== null && from !== undefined ? from : 'empty')}</Text>
                    <SwapOutlined className="text-[10px] opacity-30" />
                    <Text strong className="text-blue-600">{String(to !== null && to !== undefined ? to : 'empty')}</Text>
                  </div>
                );
              })}
            </div>
          );
        }
      } catch (e) { }
    }

    if (log.action === 'CREDIT_BLOCKED' || log.action === 'INVOICE_GENERATED' || log.action === 'PAYMENT_RECORDED') {
      return (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-2 rounded-r mb-2">
          <Text strong className="text-xs">{log.description}</Text>
        </div>
      );
    }

    return (
      <div className="text-sm text-gray-700 font-medium mb-1">
        {log.description}
      </div>
    );
  };

  if (loading) return <div className="flex justify-center py-12"><Spin tip="Loading..." /></div>;
  if (!auditLogs || auditLogs.length === 0) return <div className="text-center py-12 text-gray-400">No history available</div>;

  return (
    <div className="audit-timeline-container max-w-4xl mx-auto px-4">
      <Timeline mode="left">
        {auditLogs.map((log) => {
          const actionInfo = getActionInfo(log.action);
          return (
            <Timeline.Item
              key={log.id}
              color={actionInfo.color}
              label={
                <div className="text-right pr-4">
                  <div className="text-xs font-bold text-gray-800">{dayjs(log.timestamp).format('DD MMM YYYY')}</div>
                  <div className="text-[10px] text-gray-400 uppercase">{dayjs(log.timestamp).format('h:mm A')}</div>
                </div>
              }
            >
              <div className="mb-6">
                {renderOperationDetails(log)}
                <div className="flex items-center space-x-2 text-[11px] text-gray-500">
                  <Avatar size={16} icon={<UserOutlined />} style={{ backgroundColor: '#f0f0f0', color: '#8c8c8c' }} />
                  <span className="font-semibold text-gray-600">
                    {log.user ? `${log.user.firstName} ${log.user.lastName}` : (log.userEmail || 'System')}
                  </span>
                  <span className="opacity-40">•</span>
                  <Tag color="default" className="text-[9px] px-1 py-0 m-0 border-none bg-gray-100 rounded">{log.userRole || 'Admin'}</Tag>
                </div>
              </div>
            </Timeline.Item>
          );
        })}
      </Timeline>
    </div>
  );
};

export default AuditDisplay;