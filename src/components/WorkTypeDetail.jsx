import React, { useState } from 'react';
import { Card, Typography, Space, Tag, Descriptions, Switch, Button, Table, message } from 'antd';
import { EditOutlined, TagsOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useMutation, useReactiveVar } from '@apollo/client';
import { userCacheVar } from '../cache/userCacheVar';
import { UPDATE_WORK_TYPE, GET_WORK_TYPES } from '../gql/workTypes';
import { hasPermission, MODULES, generatePermission } from '../config/permissions';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

const WorkTypeDetail = ({ workType, onEdit, onClose }) => {
  const [loading, setLoading] = useState(false);
  const userData = useReactiveVar(userCacheVar);

  // Permission checks
  const canUpdate = hasPermission(userData?.me, generatePermission(MODULES.WORK_TYPES, 'update'));
  // const auditReadPermission = generatePermission(MODULES.AUDIT_LOGS, 'read');
  // const hasAuditPermission = hasPermission(userData?.me, auditReadPermission);

  // Update mutation
  const [updateWorkType] = useMutation(UPDATE_WORK_TYPE, {
    refetchQueries: [{ query: GET_WORK_TYPES }],
    onCompleted: () => {
      message.success('Work type updated successfully');
    },
    onError: (error) => {
      message.error(`Failed to update work type: ${error.message}`);
      setLoading(false);
    },
  });

  // Handle toggle active status
  const handleToggleActive = async () => {
    if (!canUpdate) {
      message.error("You don't have permission to update work types");
      return;
    }

    setLoading(true);
    try {
      await updateWorkType({
        variables: {
          id: workType.id,
          input: {
            isActive: !workType.isActive,
          },
        },
      });
    } catch (error) {
      console.error('Toggle active error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Task types table columns
  const taskTypeColumns = [
    {
      title: 'Task Type',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <Tag color={record.color}>{text}</Tag>
        </Space>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text) => text || <Text type="secondary">No description</Text>,
    },
    {
      title: 'Order',
      dataIndex: ['WorkTypeTask', 'order'],
      key: 'order',
      width: 80,
      sorter: (a, b) => (a.WorkTypeTask?.order || 0) - (b.WorkTypeTask?.order || 0),
    },
    {
      title: 'Required',
      dataIndex: ['WorkTypeTask', 'isRequired'],
      key: 'isRequired',
      width: 100,
      render: (isRequired) => (
        isRequired ? (
          <CheckCircleOutlined className="text-green-500" />
        ) : (
          <ExclamationCircleOutlined className="text-orange-500" />
        )
      ),
    },
  ];

  // Sort task types by order
  const sortedTaskTypes = [...(workType.taskTypes || [])].sort(
    (a, b) => (a.WorkTypeTask?.order || 0) - (b.WorkTypeTask?.order || 0)
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <TagsOutlined className="text-blue-500 text-xl" />
          <div>
            <Title level={3} className="mb-1">
              {workType.name}
            </Title>
            <Space>
              <Tag color={workType.isActive ? 'green' : 'red'}>
                {workType.isActive ? 'Active' : 'Inactive'}
              </Tag>
              <Text type="secondary">
                Created {dayjs(workType.createdAt).format('MMM DD, YYYY')}
              </Text>
            </Space>
          </div>
        </div>
        
        {canUpdate && (
          <Space>
            <Button
              icon={<EditOutlined />}
              onClick={onEdit}
            >
              Edit
            </Button>
            <Button
              type={workType.isActive ? 'default' : 'primary'}
              loading={loading}
              onClick={handleToggleActive}
            >
              {workType.isActive ? 'Deactivate' : 'Activate'}
            </Button>
          </Space>
        )}
      </div>

      {/* Basic Information */}
      <Card title="Basic Information">
        <Descriptions column={2} size="small">
          <Descriptions.Item label="Name" span={2}>
            <Text strong>{workType.name}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Description" span={2}>
            {workType.description ? (
              <Paragraph>{workType.description}</Paragraph>
            ) : (
              <Text type="secondary">No description provided</Text>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Status">
            <Switch
              checked={workType.isActive}
              disabled={!canUpdate}
              loading={loading}
              onChange={handleToggleActive}
              checkedChildren="Active"
              unCheckedChildren="Inactive"
            />
          </Descriptions.Item>
          <Descriptions.Item label="Total Task Types">
            <Text strong>{workType.taskTypes?.length || 0}</Text>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Task Types Configuration */}
      <Card 
        title={
          <Space>
            <TagsOutlined />
            <span>Task Types Configuration</span>
            <Tag color="blue">{workType.taskTypes?.length || 0} types</Tag>
          </Space>
        }
      >
        {sortedTaskTypes.length > 0 ? (
          <Table
            dataSource={sortedTaskTypes}
            columns={taskTypeColumns}
            rowKey="id"
            pagination={false}
            size="small"
          />
        ) : (
          <div className="text-center py-8 text-gray-500">
            <TagsOutlined className="text-4xl mb-2" />
            <div>No task types configured</div>
          </div>
        )}
      </Card>

      {/* Audit Trail - TODO: Implement when AuditDisplay component is available */}
      {/* {hasAuditPermission && (
        <Card title="Audit Trail">
          <AuditDisplay
            entityType="WorkType"
            entityId={workType.id}
            showTitle={false}
          />
        </Card>
      )} */}

      {/* Creation and Update Information */}
      <Card title="Record Information">
        <Descriptions column={2} size="small">
          <Descriptions.Item label="Created By">
            <Space>
              <Text strong>
                {workType.creator 
                  ? `${workType.creator.firstName} ${workType.creator.lastName}`
                  : 'Unknown'
                }
              </Text>
              {workType.creator?.email && (
                <Text type="secondary">({workType.creator.email})</Text>
              )}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="Created At">
            <Text>{dayjs(workType.createdAt).format('MMM DD, YYYY HH:mm')}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Last Updated By">
            <Space>
              <Text strong>
                {workType.updater 
                  ? `${workType.updater.firstName} ${workType.updater.lastName}`
                  : 'Unknown'
                }
              </Text>
              {workType.updater?.email && (
                <Text type="secondary">({workType.updater.email})</Text>
              )}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="Last Updated At">
            <Text>{dayjs(workType.updatedAt).format('MMM DD, YYYY HH:mm')}</Text>
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
};

export default WorkTypeDetail;