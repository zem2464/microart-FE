import React, { useState } from 'react';
import {
  Modal,
  Tabs,
  Card,
  Row,
  Col,
  Descriptions,
  Tag,
  Avatar,
  Button,
  Statistic,
  Timeline,
  Table,
  Empty,
  Space,
  Tooltip,
  Typography,
  Divider
} from 'antd';
import {
  UserOutlined,
  EditOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  GlobalOutlined,
  BankOutlined,
  DollarOutlined,
  CalendarOutlined,
  FileTextOutlined,
  TeamOutlined,
  ToolOutlined
} from '@ant-design/icons';
import { useQuery } from '@apollo/client';
import { 
  GET_CLIENT_WORK_TYPES, 
  GET_CLIENT_SERVICE_PROVIDERS,
  GET_TRANSACTIONS_BY_CLIENT 
} from '../../gql/clients';

const { TabPane } = Tabs;
const { Title, Text } = Typography;

const ClientDetail = ({ client, onClose, onEdit }) => {
  const [activeTab, setActiveTab] = useState('profile');

  // Fetch related data
  const { data: workTypesData, loading: workTypesLoading } = useQuery(GET_CLIENT_WORK_TYPES, {
    variables: { clientId: client.id }
  });

  const { data: serviceProvidersData, loading: serviceProvidersLoading } = useQuery(GET_CLIENT_SERVICE_PROVIDERS, {
    variables: { clientId: client.id }
  });

  const { data: transactionsData, loading: transactionsLoading } = useQuery(GET_TRANSACTIONS_BY_CLIENT, {
    variables: { 
      clientId: client.id,
      filters: { limit: 10 } // Latest 10 transactions
    }
  });

  // Helper functions
  const getStatusColor = (status) => {
    const colors = {
      active: 'green',
      inactive: 'red',
      suspended: 'orange',
      pending: 'blue'
    };
    return colors[status] || 'default';
  };

  const getClientTypeColor = (type) => {
    const colors = {
      project: 'blue',
      'walk-in': 'green',
      corporate: 'purple',
      individual: 'orange'
    };
    return colors[type] || 'default';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount || 0);
  };

  // Transaction table columns
  const transactionColumns = [
    {
      title: 'Date',
      dataIndex: 'paymentDate',
      key: 'date',
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Type',
      dataIndex: 'transactionType',
      key: 'type',
      render: (type) => (
        <Tag color={type === 'credit' ? 'green' : 'orange'}>
          {type?.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => formatCurrency(amount),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'paid' ? 'green' : status === 'pending' ? 'orange' : 'red'}>
          {status?.toUpperCase()}
        </Tag>
      ),
    },
  ];

  // Work types table columns
  const workTypeColumns = [
    {
      title: 'Work Type',
      dataIndex: 'workTypeName',
      key: 'workType',
    },
    {
      title: 'Rate Type',
      dataIndex: 'rateType',
      key: 'rateType',
      render: (type) => (
        <Tag>{type?.replace('_', ' ')?.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Rate',
      dataIndex: 'rate',
      key: 'rate',
      render: (rate, record) => (
        <span>
          {formatCurrency(rate)}
          {record.rateType === 'hourly' && '/hr'}
          {record.rateType === 'daily' && '/day'}
          {record.rateType === 'monthly' && '/month'}
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'status',
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'ACTIVE' : 'INACTIVE'}
        </Tag>
      ),
    },
  ];

  // Service providers table columns
  const serviceProviderColumns = [
    {
      title: 'Service Provider',
      dataIndex: 'serviceProviderName',
      key: 'name',
    },
    {
      title: 'Contact Person',
      dataIndex: 'contactPerson',
      key: 'contact',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'status',
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'ACTIVE' : 'INACTIVE'}
        </Tag>
      ),
    },
  ];

  const renderProfileTab = () => (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card title="Basic Information">
        <Row gutter={[24, 16]}>
          <Col span={24}>
            <div className="flex items-center space-x-4 mb-4">
              <Avatar
                size={80}
                src={client.logo}
                icon={<UserOutlined />}
              />
              <div>
                <Title level={3} className="mb-1">
                  {client.companyName || client.displayName}
                </Title>
                <Text className="text-lg text-gray-500 block">
                  {client.clientCode}
                </Text>
                <Space size="small" className="mt-2">
                  <Tag color={getClientTypeColor(client.clientType)}>
                    {client.clientType?.toUpperCase()}
                  </Tag>
                  <Tag color={getStatusColor(client.status)}>
                    {client.status?.toUpperCase()}
                  </Tag>
                </Space>
              </div>
            </div>
          </Col>
        </Row>

        <Descriptions bordered column={2}>
          <Descriptions.Item label="Contact Person" span={1}>
            {client.displayName}
          </Descriptions.Item>
          <Descriptions.Item label="Designation" span={1}>
            {client.designation || 'N/A'}
          </Descriptions.Item>
          <Descriptions.Item label="Company Name" span={1}>
            {client.companyName || 'N/A'}
          </Descriptions.Item>
          <Descriptions.Item label="Industry" span={1}>
            {client.industry || 'N/A'}
          </Descriptions.Item>
          <Descriptions.Item label="Company Size" span={1}>
            {client.companySize || 'N/A'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Contact Information */}
      <Card title={<><PhoneOutlined /> Contact Information</>}>
        <Descriptions bordered column={2}>
          <Descriptions.Item label="Email" span={1}>
            <div className="flex items-center">
              <MailOutlined className="mr-2" />
              <a href={`mailto:${client.email}`}>{client.email}</a>
            </div>
          </Descriptions.Item>
          <Descriptions.Item label="Phone" span={1}>
            <div className="flex items-center">
              <PhoneOutlined className="mr-2" />
              <a href={`tel:${client.phone}`}>{client.phone}</a>
            </div>
          </Descriptions.Item>
          <Descriptions.Item label="Alternate Phone" span={1}>
            {client.alternatePhone ? (
              <div className="flex items-center">
                <PhoneOutlined className="mr-2" />
                <a href={`tel:${client.alternatePhone}`}>{client.alternatePhone}</a>
              </div>
            ) : 'N/A'}
          </Descriptions.Item>
          <Descriptions.Item label="Website" span={1}>
            {client.website ? (
              <div className="flex items-center">
                <GlobalOutlined className="mr-2" />
                <a href={client.website} target="_blank" rel="noopener noreferrer">
                  {client.website}
                </a>
              </div>
            ) : 'N/A'}
          </Descriptions.Item>
          <Descriptions.Item label="Preferred Contact" span={1}>
            {client.preferredContactMethod || 'Email'}
          </Descriptions.Item>
          <Descriptions.Item label="Source" span={1}>
            {client.source || 'N/A'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Address Information */}
      <Card title={<><EnvironmentOutlined /> Address Information</>}>
        <Descriptions bordered column={1}>
          <Descriptions.Item label="Address">
            {client.address}
          </Descriptions.Item>
          <Descriptions.Item label="Location">
            {[
              client.city?.name,
              client.state?.name,
              client.country?.name
            ].filter(Boolean).join(', ')}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Business Information */}
      <Card title={<><BankOutlined /> Business Information</>}>
        <Descriptions bordered column={2}>
          <Descriptions.Item label="Tax ID" span={1}>
            {client.taxId || 'N/A'}
          </Descriptions.Item>
          <Descriptions.Item label="Registration Number" span={1}>
            {client.registrationNumber || 'N/A'}
          </Descriptions.Item>
          <Descriptions.Item label="Business Description" span={2}>
            {client.businessDescription || 'N/A'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Additional Notes */}
      {client.notes && (
        <Card title={<><FileTextOutlined /> Additional Notes</>}>
          <Text>{client.notes}</Text>
        </Card>
      )}

      {/* Timestamps */}
      <Card title={<><CalendarOutlined /> Record Information</>}>
        <Descriptions bordered column={2}>
          <Descriptions.Item label="Created At">
            {new Date(client.createdAt).toLocaleString()}
          </Descriptions.Item>
          <Descriptions.Item label="Updated At">
            {new Date(client.updatedAt).toLocaleString()}
          </Descriptions.Item>
          <Descriptions.Item label="Created By">
            {client.creator ? `${client.creator.firstName} ${client.creator.lastName}` : 'N/A'}
          </Descriptions.Item>
          <Descriptions.Item label="Updated By">
            {client.updater ? `${client.updater.firstName} ${client.updater.lastName}` : 'N/A'}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );

  const renderWorkTypesTab = () => (
    <Card title={<><ToolOutlined /> Work Types</>}>
      <Table
        columns={workTypeColumns}
        dataSource={workTypesData?.clientWorkTypes || []}
        loading={workTypesLoading}
        rowKey="id"
        pagination={false}
        locale={{
          emptyText: <Empty description="No work types assigned" />
        }}
      />
    </Card>
  );

  const renderServiceProvidersTab = () => (
    <Card title={<><TeamOutlined /> Service Providers</>}>
      <Table
        columns={serviceProviderColumns}
        dataSource={serviceProvidersData?.clientServiceProviders || []}
        loading={serviceProvidersLoading}
        rowKey="id"
        pagination={false}
        locale={{
          emptyText: <Empty description="No service providers assigned" />
        }}
      />
    </Card>
  );

  const renderTransactionsTab = () => (
    <div className="space-y-4">
      {/* Financial Summary */}
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Transactions"
              value={transactionsData?.transactionsByClient?.length || 0}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Invoiced"
              value={transactionsData?.transactionsByClient?.filter(t => t.transactionType === 'debit')?.reduce((sum, t) => sum + t.amount, 0) || 0}
              precision={2}
              prefix="₹"
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Paid"
              value={transactionsData?.transactionsByClient?.filter(t => t.transactionType === 'credit')?.reduce((sum, t) => sum + t.amount, 0) || 0}
              precision={2}
              prefix="₹"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Recent Transactions */}
      <Card title={<><DollarOutlined /> Recent Transactions</>}>
        <Table
          columns={transactionColumns}
          dataSource={transactionsData?.transactionsByClient || []}
          loading={transactionsLoading}
          rowKey="id"
          pagination={false}
          locale={{
            emptyText: <Empty description="No transactions found" />
          }}
        />
      </Card>
    </div>
  );

  return (
    <Modal
      title={
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <UserOutlined />
            <span>Client Details</span>
          </div>
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={onEdit}
          >
            Edit Client
          </Button>
        </div>
      }
      open={true}
      onCancel={onClose}
      width={1200}
      footer={null}
      destroyOnClose
    >
      <div className="py-4">
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="Profile" key="profile">
            {renderProfileTab()}
          </TabPane>
          <TabPane tab="Work Types" key="workTypes">
            {renderWorkTypesTab()}
          </TabPane>
          <TabPane tab="Service Providers" key="serviceProviders">
            {renderServiceProvidersTab()}
          </TabPane>
          <TabPane tab="Transactions" key="transactions">
            {renderTransactionsTab()}
          </TabPane>
        </Tabs>
      </div>
    </Modal>
  );
};

export default ClientDetail;