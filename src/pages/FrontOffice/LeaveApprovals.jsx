import React, { useState } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Tooltip,
  Card,
  Typography,
  message,
  Modal,
  Input,
  Descriptions,
  Avatar,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation } from '@apollo/client';
import {
  GET_PENDING_LEAVE_APPROVALS,
  APPROVE_LEAVE,
  REJECT_LEAVE,
} from '../../graqhql/leave';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

const LeaveApprovals = () => {
  const [page, setPage] = useState(1);
  const limit = 25;
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Query
  const { data, loading, refetch } = useQuery(GET_PENDING_LEAVE_APPROVALS, {
    variables: {
      page,
      limit,
    },
    fetchPolicy: 'cache-and-network',
  });

  // Mutations
  const [approveLeave, { loading: approving }] = useMutation(APPROVE_LEAVE, {
    onCompleted: () => {
      message.success('Leave approved successfully');
      refetch();
      setDetailModalVisible(false);
    },
    onError: (error) => {
      message.error(error.message || 'Failed to approve leave');
    },
  });

  const [rejectLeave, { loading: rejecting }] = useMutation(REJECT_LEAVE, {
    onCompleted: () => {
      message.success('Leave rejected successfully');
      refetch();
      setRejectModalVisible(false);
      setDetailModalVisible(false);
      setRejectionReason('');
    },
    onError: (error) => {
      message.error(error.message || 'Failed to reject leave');
    },
  });

  // Handlers
  const handleApprove = (leaveId) => {
    approveLeave({
      variables: {
        input: { leaveId },
      },
    });
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      message.error('Please provide a rejection reason');
      return;
    }

    rejectLeave({
      variables: {
        input: {
          leaveId: selectedLeave.id,
          rejectionReason: rejectionReason.trim(),
        },
      },
    });
  };

  const handleViewDetails = (record) => {
    setSelectedLeave(record);
    setDetailModalVisible(true);
  };

  const showRejectModal = (record) => {
    setSelectedLeave(record);
    setRejectModalVisible(true);
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
        {status?.replace('_', ' ')}
      </Tag>
    );
  };

  // Leave type rendering
  const getLeaveTypeTag = (leaveType, durationType) => {
    const typeColor = leaveType === 'SHORT' ? 'blue' : 'purple';
    const durationText = durationType === 'HOURS' ? 'Hours' : durationType?.replace('_', ' ');
    
    return (
      <Space direction="vertical" size={0}>
        <Tag color={typeColor}>{leaveType}</Tag>
        <Text type="secondary" style={{ fontSize: 11 }}>
          {durationText}
        </Text>
      </Space>
    );
  };

  // Columns
  const columns = [
    {
      title: 'Employee',
      dataIndex: 'user',
      key: 'user',
      render: (user) => (
        <Space>
          <Avatar icon={<UserOutlined />} size="small" />
          <Space direction="vertical" size={0}>
            <Text strong>{user?.firstName} {user?.lastName}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {user?.email}
            </Text>
          </Space>
        </Space>
      ),
    },
    {
      title: 'Leave Type',
      key: 'leaveType',
      render: (_, record) => getLeaveTypeTag(record.leaveType, record.durationType),
    },
    {
      title: 'Start Date',
      dataIndex: 'startDate',
      key: 'startDate',
      render: (date) => dayjs(date).format('MMM DD, YYYY HH:mm'),
    },
    {
      title: 'End Date',
      dataIndex: 'endDate',
      key: 'endDate',
      render: (date) => dayjs(date).format('MMM DD, YYYY HH:mm'),
    },
    {
      title: 'Duration',
      key: 'duration',
      render: (_, record) => {
        if (record.hours) {
          return `${record.hours} hours`;
        }
        const days = dayjs(record.endDate).diff(dayjs(record.startDate), 'day') + 1;
        return `${days} day${days > 1 ? 's' : ''}`;
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusTag(status),
    },
    {
      title: 'Applied On',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => dayjs(date).format('MMM DD, YYYY'),
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
          <Button
            type="primary"
            size="small"
            icon={<CheckCircleOutlined />}
            onClick={() => handleApprove(record.id)}
            loading={approving}
          >
            Approve
          </Button>
          <Button
            danger
            size="small"
            icon={<CloseCircleOutlined />}
            onClick={() => showRejectModal(record)}
            loading={rejecting}
          >
            Reject
          </Button>
        </Space>
      ),
    },
  ];

  const leaves = data?.pendingLeaveApprovals?.leaves || [];
  const totalCount = data?.pendingLeaveApprovals?.totalCount || 0;

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ marginBottom: 24 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Title level={4}>Pending Leave Approvals</Title>
            <Text type="secondary">
              Review and approve/reject leave requests from employees
            </Text>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={leaves}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize: limit,
            total: totalCount,
            onChange: (newPage) => setPage(newPage),
            showSizeChanger: false,
            showTotal: (total) => `Total ${total} pending leave requests`,
          }}
        />
      </Card>

      {/* Detail Modal */}
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
          <Button
            key="reject"
            danger
            icon={<CloseCircleOutlined />}
            onClick={() => {
              setDetailModalVisible(false);
              showRejectModal(selectedLeave);
            }}
            loading={rejecting}
          >
            Reject
          </Button>,
          <Button
            key="approve"
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={() => handleApprove(selectedLeave?.id)}
            loading={approving}
          >
            Approve
          </Button>,
        ]}
        width={700}
      >
        {selectedLeave && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="Employee">
              <Space>
                <Avatar icon={<UserOutlined />} />
                <Space direction="vertical" size={0}>
                  <Text strong>
                    {selectedLeave.user?.firstName} {selectedLeave.user?.lastName}
                  </Text>
                  <Text type="secondary">{selectedLeave.user?.email}</Text>
                </Space>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Leave Type">
              {getLeaveTypeTag(selectedLeave.leaveType, selectedLeave.durationType)}
            </Descriptions.Item>
            <Descriptions.Item label="Start Date">
              {dayjs(selectedLeave.startDate).format('MMMM DD, YYYY HH:mm')}
            </Descriptions.Item>
            <Descriptions.Item label="End Date">
              {dayjs(selectedLeave.endDate).format('MMMM DD, YYYY HH:mm')}
            </Descriptions.Item>
            {selectedLeave.hours && (
              <Descriptions.Item label="Hours">{selectedLeave.hours}</Descriptions.Item>
            )}
            <Descriptions.Item label="Duration">
              {selectedLeave.hours
                ? `${selectedLeave.hours} hours`
                : `${dayjs(selectedLeave.endDate).diff(dayjs(selectedLeave.startDate), 'day') + 1} days`}
            </Descriptions.Item>
            <Descriptions.Item label="Reason">{selectedLeave.reason}</Descriptions.Item>
            <Descriptions.Item label="Status">
              {getStatusTag(selectedLeave.status)}
            </Descriptions.Item>
            {selectedLeave.isBackDated && (
              <Descriptions.Item label="Back-dated">
                <Tag color="warning">Yes</Tag>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Applied On">
              {dayjs(selectedLeave.createdAt).format('MMMM DD, YYYY HH:mm')}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal
        title="Reject Leave Request"
        open={rejectModalVisible}
        onCancel={() => {
          setRejectModalVisible(false);
          setRejectionReason('');
        }}
        onOk={handleReject}
        okText="Reject Leave"
        okButtonProps={{
          danger: true,
          loading: rejecting,
          icon: <CloseCircleOutlined />,
        }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {selectedLeave && (
            <div>
              <Text strong>Employee: </Text>
              <Text>
                {selectedLeave.user?.firstName} {selectedLeave.user?.lastName}
              </Text>
              <br />
              <Text strong>Dates: </Text>
              <Text>
                {dayjs(selectedLeave.startDate).format('MMM DD, YYYY')} -{' '}
                {dayjs(selectedLeave.endDate).format('MMM DD, YYYY')}
              </Text>
            </div>
          )}
          <div>
            <Text strong>Rejection Reason *</Text>
            <TextArea
              rows={4}
              placeholder="Please provide a reason for rejecting this leave request..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              style={{ marginTop: 8 }}
            />
          </div>
        </Space>
      </Modal>
    </div>
  );
};

export default LeaveApprovals;
