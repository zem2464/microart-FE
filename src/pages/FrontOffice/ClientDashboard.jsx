import React, { useState, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Select,
  DatePicker,
  Space,
  Button,
  Table,
  Tag,
  Avatar,
  Progress,
  Empty,
  Spin
} from 'antd';
import {
  UserOutlined,
  DollarOutlined,
  TrendingUpOutlined,
  TrendingDownOutlined,
  CalendarOutlined,
  FileTextOutlined,
  TeamOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { useQuery } from '@apollo/client';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { GET_CLIENTS, GET_TRANSACTIONS_SUMMARY } from '../../gql/clients';
import { GET_PENDING_PAYMENTS, GET_OVERDUE_PAYMENTS } from '../../gql/clientTransactions';
import { useAppDrawer } from '../../contexts/DrawerContext';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const ClientDashboard = () => {
  const [dateRange, setDateRange] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const { showClientFormDrawer } = useAppDrawer();

  // Queries
  const { data: clientsData, loading: clientsLoading, refetch } = useQuery(GET_CLIENTS, {
    variables: {
      filters: { isActive: true },
      pagination: { page: 1, limit: 100 }
    },
    fetchPolicy: 'cache-and-network'
  });

  const { data: summaryData, loading: summaryLoading } = useQuery(GET_TRANSACTIONS_SUMMARY, {
    fetchPolicy: 'cache-and-network',
    variables: {
      clientId: selectedClient,
      dateFrom: dateRange?.[0]?.format('YYYY-MM-DD'),
      dateTo: dateRange?.[1]?.format('YYYY-MM-DD')
    }
  });

  const { data: pendingData, loading: pendingLoading } = useQuery(GET_PENDING_PAYMENTS, {
    fetchPolicy: 'cache-and-network'
  });
  const { data: overdueData, loading: overdueLoading } = useQuery(GET_OVERDUE_PAYMENTS, {
    fetchPolicy: 'cache-and-network'
  });

  const clients = clientsData?.clients || [];
  const pendingPayments = pendingData?.pendingPayments || [];
  const overduePayments = overdueData?.overduePayments || [];

  // Handler functions
  const handleAddClient = () => {
    showClientFormDrawer(null, 'create', refetch);
  };

  // Calculate dashboard statistics
  const dashboardStats = useMemo(() => {
    const totalClients = clients.length;
    const activeClients = clients.filter(c => c.isActive === true).length;

    const pendingAmount = pendingPayments.reduce((sum, p) => sum + p.amount, 0);
    const overdueAmount = overduePayments.reduce((sum, p) => sum + p.amount, 0);

    return {
      totalClients,
      activeClients,
      pendingAmount,
      overdueAmount,
      pendingCount: pendingPayments.length,
      overdueCount: overduePayments.length
    };
  }, [clients, pendingPayments, overduePayments]);

  // Helper function for colors - must be defined before useMemo hooks that use it
  const getClientTypeColor = (type) => {
    const colors = {
      permanent: '#1890ff',
      walkIn: '#52c41a',
      project: '#722ed1',
      individual: '#fa8c16',
      unknown: '#d9d9d9'
    };
    return colors[type] || '#d9d9d9';
  };

  // Client type distribution for pie chart
  const clientTypeData = useMemo(() => {
    const distribution = clients.reduce((acc, client) => {
      const type = client.clientType || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(distribution).map(([type, count]) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: count,
      color: getClientTypeColor(type)
    }));
  }, [clients]);

  // Balance distribution data
  const balanceDistribution = useMemo(() => {
    const ranges = [
      { name: 'Negative', min: -Infinity, max: 0, color: '#ff4d4f' },
      { name: '$0', min: 0, max: 0, color: '#d9d9d9' },
      { name: '$1-$1000', min: 1, max: 1000, color: '#faad14' },
      { name: '$1K-$5K', min: 1001, max: 5000, color: '#1890ff' },
      { name: '$5K+', min: 5001, max: Infinity, color: '#52c41a' }
    ];

    return [];
  }, [clients]);

  // Payment methods from summary
  const paymentMethodsData = summaryData?.transactionsSummary?.paymentMethods || [];

  // Recent activities (top clients - removed balance sorting)
  const topClientsByBalance = useMemo(() => {
    return [];
  }, [clients]);

  // Recent clients (by creation date)
  const recentClients = useMemo(() => {
    return [...clients]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);
  }, [clients]);

  // Table columns for pending/overdue payments
  const paymentColumns = [
    {
      title: 'Client',
      dataIndex: 'client',
      key: 'client',
      render: (client) => (
        <div className="flex items-center space-x-2">
          <Avatar size="small" icon={<UserOutlined />} />
          <div>
            <div className="font-medium">{client.companyName || client.displayName}</div>
            <div className="text-xs text-gray-500">{client.clientCode}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => (
        <Statistic
          value={amount}
          precision={2}
          prefix="₹"
          valueStyle={{ fontSize: '14px' }}
        />
      ),
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Days Overdue',
      key: 'daysOverdue',
      render: (_, record) => {
        const today = new Date();
        const dueDate = new Date(record.dueDate);
        const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
        
        if (daysOverdue > 0) {
          return <Tag color="red">{daysOverdue} days</Tag>;
        }
        return <Tag color="green">On time</Tag>;
      },
    },
  ];

  const loading = clientsLoading || summaryLoading;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <Title level={2} className="mb-2">Client Dashboard</Title>
            <Text type="secondary">
              Overview of client metrics, financial status, and recent activities
            </Text>
          </div>
          <Space>
            <Select
              placeholder="Select client"
              style={{ width: 200 }}
              allowClear
              showSearch
              optionFilterProp="children"
              onChange={setSelectedClient}
            >
              {clients.map(client => (
                <Option key={client.id} value={client.id}>
                  {client.companyName || client.contactPersonName}
                </Option>
              ))}
            </Select>
            <RangePicker onChange={setDateRange} />
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={handleAddClient}
            >
              Add Client
            </Button>
          </Space>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Spin size="large" />
        </div>
      ) : (
        <>
          {/* Summary Statistics */}
          <Row gutter={16} className="mb-6">
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Total Clients"
                  value={dashboardStats.totalClients}
                  prefix={<UserOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Active Clients"
                  value={dashboardStats.activeClients}
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                  suffix={
                    <span className="text-sm text-gray-400">
                      / {dashboardStats.totalClients}
                    </span>
                  }
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Total Balance"
                  value={dashboardStats.totalBalance}
                  precision={2}
                  prefix="₹"
                  valueStyle={{ 
                    color: dashboardStats.totalBalance >= 0 ? '#52c41a' : '#f5222d' 
                  }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Average Balance"
                  value={dashboardStats.avgBalance}
                  precision={2}
                  prefix="₹"
                  valueStyle={{ color: '#722ed1' }}
                />
              </Card>
            </Col>
          </Row>

          {/* Alert Cards */}
          <Row gutter={16} className="mb-6">
            <Col xs={24} lg={12}>
              <Card className="border-orange-200 bg-orange-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <WarningOutlined className="text-orange-500 text-2xl" />
                    <div>
                      <Title level={4} className="mb-1 text-orange-700">
                        Pending Payments
                      </Title>
                      <Text className="text-orange-600">
                        {dashboardStats.pendingCount} payments totaling{' '}
                        <strong>${dashboardStats.pendingAmount.toFixed(2)}</strong>
                      </Text>
                    </div>
                  </div>
                  <Button type="link" className="text-orange-600">
                    View All
                  </Button>
                </div>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card className="border-red-200 bg-red-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <WarningOutlined className="text-red-500 text-2xl" />
                    <div>
                      <Title level={4} className="mb-1 text-red-700">
                        Overdue Payments
                      </Title>
                      <Text className="text-red-600">
                        {dashboardStats.overdueCount} payments totaling{' '}
                        <strong>${dashboardStats.overdueAmount.toFixed(2)}</strong>
                      </Text>
                    </div>
                  </div>
                  <Button type="link" className="text-red-600">
                    View All
                  </Button>
                </div>
              </Card>
            </Col>
          </Row>

          {/* Charts Row */}
          <Row gutter={16} className="mb-6">
            <Col xs={24} lg={12}>
              <Card title="Client Type Distribution">
                {clientTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={clientTypeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value, percent }) => 
                          `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                        }
                      >
                        {clientTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <Empty description="No client data available" />
                )}
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="Balance Distribution">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={balanceDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#1890ff" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>

          {/* Data Tables Row */}
          <Row gutter={16} className="mb-6">
            <Col xs={24} lg={12}>
              <Card 
                title="Top Clients by Balance" 
                extra={<Button type="link">View All</Button>}
              >
                <div className="space-y-3">
                  {topClientsByBalance.slice(0, 5).map((client, index) => (
                    <div key={client.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-600">
                          {index + 1}
                        </div>
                        <Avatar size="small" icon={<UserOutlined />} />
                        <div>
                          <div className="font-medium">
                            {client.companyName || client.contactPersonName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {client.clientCode}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card 
                title="Recent Clients" 
                extra={<Button type="link">View All</Button>}
              >
                <div className="space-y-3">
                  {recentClients.map((client) => (
                    <div key={client.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Avatar size="small" icon={<UserOutlined />} />
                        <div>
                          <div className="font-medium">
                            {client.companyName || client.contactPersonName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {client.clientCode} • {new Date(client.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <Tag color={client.isActive ? 'green' : 'orange'}>
                        {client.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </Tag>
                    </div>
                  ))}
                </div>
              </Card>
            </Col>
          </Row>

          {/* Payment Tables */}
          <Row gutter={16}>
            <Col xs={24} lg={12}>
              <Card title="Pending Payments" extra={<Button type="link">View All</Button>}>
                <Table
                  columns={paymentColumns}
                  dataSource={pendingPayments.slice(0, 5)}
                  loading={pendingLoading}
                  pagination={false}
                  size="small"
                  rowKey="id"
                  locale={{
                    emptyText: <Empty description="No pending payments" />
                  }}
                />
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="Overdue Payments" extra={<Button type="link">View All</Button>}>
                <Table
                  columns={paymentColumns}
                  dataSource={overduePayments.slice(0, 5)}
                  loading={overdueLoading}
                  pagination={false}
                  size="small"
                  rowKey="id"
                  locale={{
                    emptyText: <Empty description="No overdue payments" />
                  }}
                />
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
};

export default ClientDashboard;