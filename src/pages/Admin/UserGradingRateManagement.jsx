import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Button,
  Space,
  InputNumber,
  Select,
  message,
  Row,
  Col,
  Typography,
  Divider,
  Table,
  Spin
} from 'antd';
import {
  SaveOutlined,
  DollarOutlined,
  UserOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { useQuery, useMutation } from '@apollo/client';
import {
  GET_USER_GRADING_RATES_BY_FILTER,
  GET_GRADING_TASKS,
  GET_ALL_USERS,
  GET_GRADINGS,
  BULK_SET_USER_GRADING_RATES
} from '../../gql/userGradingRates';

const { Title, Text } = Typography;
const { Option } = Select;

const UserGradingRateManagement = () => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedGrading, setSelectedGrading] = useState(null);
  const [editedRates, setEditedRates] = useState({});

  // Queries
  const { data: gradingsData, loading: gradingsLoading } = useQuery(GET_GRADINGS);
  const { data: usersData, loading: usersLoading } = useQuery(GET_ALL_USERS);
  
  const { data: gradingTasksData, loading: gradingTasksLoading } = useQuery(GET_GRADING_TASKS, {
    variables: { gradingId: selectedGrading },
    skip: !selectedGrading
  });

  const { data: ratesData, loading: ratesLoading, refetch: refetchRates } = useQuery(
    GET_USER_GRADING_RATES_BY_FILTER,
    {
      variables: {
        userId: selectedUser,
        gradingId: selectedGrading
      },
      skip: !selectedUser || !selectedGrading
    }
  );

  // Mutation
  const [bulkSetUserGradingRates, { loading: saving }] = useMutation(BULK_SET_USER_GRADING_RATES, {
    onCompleted: (data) => {
      message.success(data.bulkSetUserGradingRates.message || 'Rates saved successfully');
      setEditedRates({});
      refetchRates();
    },
    onError: (error) => {
      message.error(`Error saving rates: ${error.message}`);
    }
  });

  // Build table data combining task types with existing rates
  const tableData = useMemo(() => {
    if (!gradingTasksData?.gradingTasks) return [];
    
    const existingRates = ratesData?.userGradingRatesByFilter || [];
    
    return gradingTasksData.gradingTasks.map(gradingTask => {
      const taskType = gradingTask.taskType;
      const existingRate = existingRates.find(r => r.taskTypeId === taskType.id);
      const editedRate = editedRates[taskType.id];
      const taskDefaultRate = gradingTask.employeeRate || 0;
      
      return {
        taskTypeId: taskType.id,
        taskTypeName: taskType.name,
        currentRate: editedRate !== undefined ? editedRate : (existingRate?.employeeRate || null),
        defaultRate: taskDefaultRate,
        hasCustomRate: !!existingRate,
        rateId: existingRate?.id
      };
    });
  }, [gradingTasksData, ratesData, editedRates]);

  // Reset edited rates when user or grading changes
  useEffect(() => {
    setEditedRates({});
  }, [selectedUser, selectedGrading]);

  const handleRateChange = (taskTypeId, value) => {
    setEditedRates(prev => ({
      ...prev,
      [taskTypeId]: value
    }));
  };

  const handleSave = async () => {
    if (!selectedUser || !selectedGrading) {
      message.warning('Please select user and grading');
      return;
    }

    // Collect all rates to save (only non-null values)
    const ratesToSave = tableData
      .filter(item => item.currentRate !== null)
      .map(item => ({
        userId: selectedUser,
        taskTypeId: item.taskTypeId,
        gradingId: selectedGrading,
        employeeRate: item.currentRate
      }));

    if (ratesToSave.length === 0) {
      message.warning('No rates to save. Please set at least one rate.');
      return;
    }

    try {
      // Use first taskType for mutation (the mutation signature requires it)
      await bulkSetUserGradingRates({
        variables: {
          taskTypeId: ratesToSave[0].taskTypeId,
          gradingId: selectedGrading,
          rates: ratesToSave
        }
      });
    } catch (error) {
      console.error('Save error:', error);
    }
  };

  const handleReset = () => {
    setEditedRates({});
    message.info('Changes discarded');
  };

  const hasChanges = Object.keys(editedRates).length > 0;

  // Table columns
  const columns = [
    {
      title: 'Task Type',
      dataIndex: 'taskTypeName',
      key: 'taskTypeName',
      width: 250,
      render: (name) => <Text strong>{name}</Text>
    },
    {
      title: 'Default Rate',
      dataIndex: 'defaultRate',
      key: 'defaultRate',
      width: 150,
      render: (rate) => (
        <Text type="secondary">₹{rate?.toFixed(2) || '0.00'}</Text>
      )
    },
    {
      title: 'Custom Rate',
      dataIndex: 'currentRate',
      key: 'currentRate',
      width: 200,
      render: (rate, record) => (
        <InputNumber
          value={rate}
          onChange={(value) => handleRateChange(record.taskTypeId, value)}
          prefix="₹"
          precision={2}
          min={0}
          style={{ width: '100%' }}
          placeholder={`Default: ₹${record.defaultRate.toFixed(2)}`}
          disabled={!selectedUser || !selectedGrading}
        />
      )
    },
    {
      title: 'Difference',
      key: 'difference',
      width: 120,
      render: (_, record) => {
        if (record.currentRate === null) return <Text type="secondary">-</Text>;
        const diff = record.currentRate - record.defaultRate;
        const color = diff > 0 ? 'success' : diff < 0 ? 'error' : 'default';
        return (
          <Text type={color}>
            {diff > 0 ? '+' : ''}₹{diff.toFixed(2)}
          </Text>
        );
      }
    },
    {
      title: 'Status',
      key: 'status',
      width: 100,
      render: (_, record) => {
        if (record.currentRate === null) {
          return <Text type="secondary">Using Default</Text>;
        }
        return record.hasCustomRate ? (
          <Text type="success">Custom</Text>
        ) : (
          <Text type="warning">New</Text>
        );
      }
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Space align="center">
            <DollarOutlined style={{ fontSize: 32, color: '#1890ff' }} />
            <div>
              <Title level={2} style={{ margin: 0 }}>
                User-Specific Employee Rates
              </Title>
              <Text type="secondary">
                Select user and grading to set custom rates for each task type
              </Text>
            </div>
          </Space>
        </Col>
      </Row>

      <Card>
        {/* Selection Section */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={8}>
            <Text strong>User: *</Text>
            <Select
              placeholder="Select User"
              style={{ width: '100%', marginTop: 8 }}
              value={selectedUser}
              onChange={setSelectedUser}
              loading={usersLoading}
              allowClear
              showSearch
              filterOption={(input, option) => {
                const user = usersData?.users?.find(u => u.id === option.value);
                if (!user) return false;
                const searchText = `${user.firstName} ${user.lastName} ${user.role?.name || ''}`.toLowerCase();
                return searchText.includes(input.toLowerCase());
              }}
            >
              {usersData?.users
                ?.filter(u => u.isActive)
                .map(user => (
                  <Option key={user.id} value={user.id}>
                    <Space>
                      <UserOutlined />
                      {user.firstName} {user.lastName} ({user.role?.name})
                    </Space>
                  </Option>
                ))}
            </Select>
          </Col>
          <Col span={8}>
            <Text strong>Grading: *</Text>
            <Select
              placeholder="Select Grading"
              style={{ width: '100%', marginTop: 8 }}
              value={selectedGrading}
              onChange={setSelectedGrading}
              loading={gradingsLoading}
              allowClear
              showSearch
              filterOption={(input, option) => {
                const grading = gradingsData?.gradings?.find(g => g.id === option.value);
                if (!grading) return false;
                const searchText = `${grading.name} ${grading.shortCode}`.toLowerCase();
                return searchText.includes(input.toLowerCase());
              }}
            >
              {gradingsData?.gradings?.map(grading => (
                <Option key={grading.id} value={grading.id}>
                  {grading.name} ({grading.shortCode})
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={8}>
            {selectedUser && selectedGrading && (
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Note: Default rates are task-specific and shown in the table below
                </Text>
              </div>
            )}
          </Col>
        </Row>

        <Divider />

        {/* Action Buttons */}
        {selectedUser && selectedGrading && (
          <Space style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={saving}
              disabled={!hasChanges}
            >
              Save All Changes
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleReset}
              disabled={!hasChanges}
            >
              Discard Changes
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => refetchRates()}
            >
              Refresh
            </Button>
          </Space>
        )}

        {/* Rates Table */}
        {selectedUser && selectedGrading ? (
          <Spin spinning={ratesLoading || gradingTasksLoading}>
            <Table
              columns={columns}
              dataSource={tableData}
              rowKey="taskTypeId"
              pagination={false}
              size="middle"
              locale={{
                emptyText: 'No task types available'
              }}
            />
            {hasChanges && (
              <div style={{ marginTop: 16, padding: 12, background: '#fffbe6', borderRadius: 4 }}>
                <Text type="warning">
                  You have unsaved changes. Click "Save All Changes" to apply them.
                </Text>
              </div>
            )}
          </Spin>
        ) : (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <UserOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
            <div>
              <Text type="secondary" style={{ fontSize: 16 }}>
                Please select a user and grading to view and edit rates
              </Text>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default UserGradingRateManagement;
