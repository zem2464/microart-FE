import React, { useState } from 'react';
import {
  Card,
  Typography,
  Select,
  Space,
  Spin,
  message,
  DatePicker,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  CalendarOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useQuery } from '@apollo/client';
import { GET_LEAVES } from '../../graqhql/leave';
import { GET_HOLIDAYS } from '../../graqhql/holiday';
import LeaveCalendar from '../../components/Leave/LeaveCalendar';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

// Configure dayjs with IST timezone
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.tz.setDefault('Asia/Kolkata');

const { Title } = Typography;

const AllUsersLeaves = () => {
  const currentYear = dayjs().year();
  const currentMonth = dayjs().month();
  
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedStatus, setSelectedStatus] = useState(null);

  // Calculate date range for the selected month
  const startDate = dayjs().year(selectedYear).month(selectedMonth).startOf('month');
  const endDate = dayjs().year(selectedYear).month(selectedMonth).endOf('month');

  // Query all leaves for the selected month
  const { data, loading, error } = useQuery(GET_LEAVES, {
    variables: {
      status: selectedStatus,
      year: selectedYear,
      page: 1,
      limit: 1000, // Get all leaves for the month
    },
    fetchPolicy: 'cache-and-network',
  });

  // Query holidays for the selected year
  const { data: holidaysData } = useQuery(GET_HOLIDAYS, {
    variables: {
      year: selectedYear,
      isActive: true,
    },
    fetchPolicy: 'cache-and-network',
  });

  if (error) {
    message.error(error.message || 'Failed to fetch leaves');
  }

  // Filter leaves by the selected month
  const leaves = data?.leaves?.leaves || [];
  const filteredLeaves = leaves.filter(leave => {
    const leaveStart = dayjs(leave.startDate);
    const leaveEnd = dayjs(leave.endDate);
    
    // Check if leave overlaps with the selected month
    return (
      (leaveStart.isSameOrAfter(startDate) && leaveStart.isSameOrBefore(endDate)) ||
      (leaveEnd.isSameOrAfter(startDate) && leaveEnd.isSameOrBefore(endDate)) ||
      (leaveStart.isBefore(startDate) && leaveEnd.isAfter(endDate))
    );
  });

  // Calculate statistics
  const totalLeaves = filteredLeaves.length;
  const pendingLeaves = filteredLeaves.filter(l => l.status === 'PENDING').length;
  const approvedLeaves = filteredLeaves.filter(l => l.status === 'APPROVED' || l.status === 'AUTO_APPROVED').length;
  const uniqueUsers = new Set(filteredLeaves.map(l => l.userId)).size;

  // Generate year options
  const yearOptions = [];
  for (let year = currentYear - 2; year <= currentYear + 1; year++) {
    yearOptions.push({ label: year, value: year });
  }

  // Month options
  const monthOptions = [
    { label: 'January', value: 0 },
    { label: 'February', value: 1 },
    { label: 'March', value: 2 },
    { label: 'April', value: 3 },
    { label: 'May', value: 4 },
    { label: 'June', value: 5 },
    { label: 'July', value: 6 },
    { label: 'August', value: 7 },
    { label: 'September', value: 8 },
    { label: 'October', value: 9 },
    { label: 'November', value: 10 },
    { label: 'December', value: 11 },
  ];

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      <Card 
        bordered={false}
        style={{ marginBottom: '24px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <Title level={3} style={{ margin: 0 }}>
            <CalendarOutlined /> All Users Leave Calendar
          </Title>
          
          <Space size="middle">
            <Select
              value={selectedMonth}
              onChange={setSelectedMonth}
              style={{ width: 150 }}
              placeholder="Select Month"
              options={monthOptions}
            />
            <Select
              value={selectedYear}
              onChange={setSelectedYear}
              style={{ width: 120 }}
              placeholder="Select Year"
              options={yearOptions}
            />
            <Select
              value={selectedStatus}
              onChange={setSelectedStatus}
              style={{ width: 150 }}
              placeholder="All Statuses"
              allowClear
              options={[
                { label: 'All Statuses', value: null },
                { label: 'Pending', value: 'PENDING' },
                { label: 'Approved', value: 'APPROVED' },
                { label: 'Rejected', value: 'REJECTED' },
                { label: 'Auto Approved', value: 'AUTO_APPROVED' },
              ]}
            />
          </Space>
        </div>

        {/* Statistics Row */}
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="Total Leaves"
                value={totalLeaves}
                prefix={<CalendarOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Users on Leave"
                value={uniqueUsers}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Pending Approvals"
                value={pendingLeaves}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Approved"
                value={approvedLeaves}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      {/* Calendar */}
      <Card bordered={false}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size="large" />
          </div>
        ) : (
          <LeaveCalendar leaves={filteredLeaves} holidays={holidaysData?.holidays || []} />
        )}
      </Card>
    </div>
  );
};

export default AllUsersLeaves;
