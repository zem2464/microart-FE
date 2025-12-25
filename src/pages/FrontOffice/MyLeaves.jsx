import React, { useState } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Tooltip,
  Card,
  Select,
  Typography,
  Popconfirm,
  message,
  Modal,
} from 'antd';
import {
  PlusOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation } from '@apollo/client';
import { GET_MY_LEAVES, CANCEL_LEAVE } from '../../graqhql/leave';
import ApplyLeaveModal from '../../components/Leave/ApplyLeaveModal';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const MyLeaves = () => {
  const currentYear = dayjs().year();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [applyModalVisible, setApplyModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [page, setPage] = useState(1);
  const limit = 25;

  // Query
  const { data, loading, refetch } = useQuery(GET_MY_LEAVES, {
    variables: {
      status: selectedStatus,
      year: selectedYear,
      page,
      limit,
    },
    fetchPolicy: 'cache-and-network',
  });

  // Mutation
  const [cancelLeave, { loading: cancelling }] = useMutation(CANCEL_LEAVE, {
    onCompleted: () => {
      message.success('Leave cancelled successfully');
      refetch();
    },
    onError: (error) => {
      message.error(error.message || 'Failed to cancel leave');
    },
  });

  // Handlers
  const handleCancel = (id) => {
    cancelLeave({ variables: { id } });
  };

  const handleViewDetails = (record) => {
    setSelectedLeave(record);
    setDetailModalVisible(true);
  };

  // Status rendering
  const getStatusTag = (status) => {
    const statusConfig = {
      PENDING: { color: 'orange', icon: <ClockCircleOutlined /> },
      APPROVED: { color: 'green', icon: <CheckCircleOutlined /> },
      REJECTED: { color: 'red', icon: <CloseCircleOutlined /> },
      AUTO_APPROVED: { color: 'blue', icon: <CheckCircleOutlined /> },
    };

    const config = statusConfig[status] || {};
    return (
      <Tag color={config.color} icon={config.icon}>
        {status.replace('_', ' ')}
      </Tag>
    );
  };

  // Leave type rendering
  const getLeaveTypeTag = (leaveType, durationType) => {
    if (leaveType === 'SHORT') {
      return (
        <Tag color="blue" icon={<ClockCircleOutlined />}>
          Short Leave
        </Tag>
      );
    }
    
    const durationText = durationType === 'FULL_DAY' ? 'Full Day' : 'Half Day';
    return (
      <Tag color="purple" icon={<CalendarOutlined />}>
        {durationText}
      </Tag>
    );
  };

  // Generate year options
  const yearOptions = [];
  for (let i = currentYear - 2; i <= currentYear + 1; i++) {
    yearOptions.push({ label: i.toString(), value: i });
  }

  const statusOptions = [
    { label: 'All', value: null },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Auto Approved', value: 'AUTO_APPROVED' },
    { label: 'Rejected', value: 'REJECTED' },
  ];

  // Table columns
  const columns = [
    {
      title: 'Type',
      key: 'type',
      render: (_, record) => getLeaveTypeTag(record.leaveType, record.durationType),
      width: 150,
    },
    {
      title: 'Period',
      key: 'period',
      render: (_, record) => {
        const start = dayjs(record.startDate);
        const end = dayjs(record.endDate);
        
        if (record.leaveType === 'SHORT') {
          return (
            <div>
              <div>{start.format('DD MMM YYYY')}</div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {start.format('HH:mm')} - {end.format('HH:mm')} ({record.hours}h)
              </Text>
            </div>
          );
        }
        
        if (record.durationType === 'HALF_DAY') {
          return start.format('DD MMM YYYY (ddd)');
        }
        
        return (
          <div>
            <div>{start.format('DD MMM YYYY')}</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              to {end.format('DD MMM YYYY')}
            </Text>
          </div>
        );
      },
      width: 180,
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
      render: (text) => (
        <Tooltip title={text}>
          <Text ellipsis style={{ maxWidth: 300 }}>
            {text}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusTag(status),
      width: 150,
      filters: [
        { text: 'Pending', value: 'PENDING' },
        { text: 'Approved', value: 'APPROVED' },
        { text: 'Auto Approved', value: 'AUTO_APPROVED' },
        { text: 'Rejected', value: 'REJECTED' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Applied On',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => dayjs(date).format('DD MMM YYYY HH:mm'),
      width: 150,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="View Details">
            <Button
              type="link"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetails(record)}
            />
          </Tooltip>
          
          {(record.status === 'PENDING' || record.status === 'AUTO_APPROVED') && (
            <Popconfirm
              title="Are you sure you want to cancel this leave?"
              onConfirm={() => handleCancel(record.id)}
              okText="Yes"
              cancelText="No"
            >
              <Tooltip title="Cancel Leave">
                <Button
                  type="link"
                  danger
                  icon={<DeleteOutlined />}
                  loading={cancelling}
                />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
      width: 100,
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}
        >
          <Title level={3}>
            <CalendarOutlined /> My Leaves
          </Title>
          <Space>
            <Select
              value={selectedYear}
              onChange={setSelectedYear}
              options={yearOptions}
              style={{ width: 120 }}
            />
            <Select
              value={selectedStatus}
              onChange={setSelectedStatus}
              options={statusOptions}
              style={{ width: 150 }}
              placeholder="Filter by status"
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setApplyModalVisible(true)}
            >
              Apply Leave
            </Button>
          </Space>
        </div>

        <Table
          dataSource={data?.myLeaves?.leaves || []}
          columns={columns}
          loading={loading}
          rowKey="id"
          pagination={{
            current: page,
            pageSize: limit,
            total: data?.myLeaves?.totalCount || 0,
            onChange: (newPage) => setPage(newPage),
            showSizeChanger: false,
            showTotal: (total) => `Total ${total} leaves`,
          }}
        />
      </Card>

      {/* Apply Leave Modal */}
      <ApplyLeaveModal
        visible={applyModalVisible}
        onClose={() => setApplyModalVisible(false)}
        onSuccess={refetch}
      />

      {/* Leave Details Modal */}
      <Modal
        title="Leave Details"
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedLeave(null);
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setDetailModalVisible(false);
              setSelectedLeave(null);
            }}
          >
            Close
          </Button>,
        ]}
        width={600}
      >
        {selectedLeave && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <div>
              <Text strong>Type:</Text>{' '}
              {getLeaveTypeTag(selectedLeave.leaveType, selectedLeave.durationType)}
            </div>
            
            <div>
              <Text strong>Period:</Text>
              <br />
              <Text>
                {dayjs(selectedLeave.startDate).format('DD MMM YYYY HH:mm')} -{' '}
                {dayjs(selectedLeave.endDate).format('DD MMM YYYY HH:mm')}
              </Text>
              {selectedLeave.hours && (
                <Text type="secondary"> ({selectedLeave.hours} hours)</Text>
              )}
            </div>

            <div>
              <Text strong>Reason:</Text>
              <br />
              <Text>{selectedLeave.reason}</Text>
            </div>

            <div>
              <Text strong>Status:</Text> {getStatusTag(selectedLeave.status)}
            </div>

            {selectedLeave.approver && (
              <div>
                <Text strong>
                  {selectedLeave.status === 'REJECTED' ? 'Rejected' : 'Approved'} By:
                </Text>
                <br />
                <Text>{selectedLeave.approver.name}</Text>
              </div>
            )}

            {selectedLeave.approvedAt && (
              <div>
                <Text strong>
                  {selectedLeave.status === 'REJECTED' ? 'Rejected' : 'Approved'} On:
                </Text>
                <br />
                <Text>{dayjs(selectedLeave.approvedAt).format('DD MMM YYYY HH:mm')}</Text>
              </div>
            )}

            {selectedLeave.rejectionReason && (
              <div>
                <Text strong>Rejection Reason:</Text>
                <br />
                <Text type="danger">{selectedLeave.rejectionReason}</Text>
              </div>
            )}

            {selectedLeave.isBackDated && (
              <div>
                <Tag color="orange">Back-dated Leave</Tag>
              </div>
            )}

            <div>
              <Text strong>Applied On:</Text>
              <br />
              <Text>{dayjs(selectedLeave.createdAt).format('DD MMM YYYY HH:mm')}</Text>
            </div>
          </Space>
        )}
      </Modal>
    </div>
  );
};

export default MyLeaves;
