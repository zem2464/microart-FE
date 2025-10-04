import React, { useState, useMemo } from 'react';
import { 
  Card, 
  Button, 
  Space, 
  Tag, 
  Avatar, 
  Typography, 
  Row, 
  Col, 
  Statistic,
  Dropdown,
  message,
  Modal 
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  MoreOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  DollarOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useQuery, useMutation } from '@apollo/client';
import { GET_CLIENTS, DELETE_CLIENT } from '../../gql/clients';
import CommonTable from '../../components/common/CommonTable';
import { useAppDrawer } from '../../contexts/DrawerContext';

const { Title, Text } = Typography;

const ClientList = () => {
  const [filters, setFilters] = useState({});
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const { showClientFormDrawer, showClientDetailDrawer } = useAppDrawer();

  const { data, loading, error, refetch } = useQuery(GET_CLIENTS, {
    variables: { 
      filters,
      pagination: {
        page: pagination.current,
        limit: pagination.pageSize
      }
    }
  });

  const [deleteClient] = useMutation(DELETE_CLIENT, {
    onCompleted: () => {
      message.success('Client deleted successfully');
      refetch();
    },
    onError: (error) => {
      message.error(error.message);
    }
  });

  const clients = data?.clients || [];
  const totalCount = data?.clientsCount || 0;

  // Client type colors
  const getClientTypeColor = (type) => {
    const colors = {
      'project': 'blue',
      'walk-in': 'green',
      'corporate': 'purple',
      'individual': 'orange'
    };
    return colors[type] || 'default';
  };

  // Status colors
  const getStatusColor = (status) => {
    const colors = {
      'active': 'green',
      'inactive': 'red',
      'suspended': 'orange',
      'pending': 'blue'
    };
    return colors[status] || 'default';
  };

  // Table columns configuration
  const columns = [
    {
      title: 'Client',
      dataIndex: 'companyName',
      key: 'client',
      width: 250,
      render: (text, record) => (
        <div className="flex items-center space-x-3">
          <Avatar 
            src={record.logo} 
            icon={<UserOutlined />} 
            size="default"
          />
          <div>
            <div className="font-medium text-gray-900">
              {record.companyName || record.displayName}
            </div>
            <div className="text-sm text-gray-500">
              {record.clientCode}
            </div>
            {record.displayName && record.companyName && (
              <div className="text-xs text-gray-400">
                Contact: {record.displayName}
              </div>
            )}
          </div>
        </div>
      ),
      sorter: true,
    },
    {
      title: 'Type',
      dataIndex: 'clientType',
      key: 'clientType',
      width: 120,
      render: (type) => (
        <Tag color={getClientTypeColor(type)}>
          {type?.toUpperCase()}
        </Tag>
      ),
      filters: [
        { text: 'Project Client', value: 'project' },
        { text: 'Walk-in Client', value: 'walk-in' },
        { text: 'Corporate', value: 'corporate' },
        { text: 'Individual', value: 'individual' },
      ],
    },
    {
      title: 'Contact Info',
      key: 'contact',
      width: 200,
      render: (_, record) => (
        <div className="space-y-1">
          {record.email && (
            <div className="flex items-center text-sm text-gray-600">
              <MailOutlined className="mr-2" />
              {record.email}
            </div>
          )}
          {record.phone && (
            <div className="flex items-center text-sm text-gray-600">
              <PhoneOutlined className="mr-2" />
              {record.phone}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Location',
      key: 'location',
      width: 150,
      render: (_, record) => (
        <div className="flex items-center text-sm text-gray-600">
          <EnvironmentOutlined className="mr-2" />
          <div>
            {record.city?.name && (
              <div>{record.city.name}</div>
            )}
            {record.state?.name && (
              <div className="text-xs text-gray-400">
                {record.state.name}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {status?.toUpperCase()}
        </Tag>
      ),
      filters: [
        { text: 'Active', value: 'active' },
        { text: 'Inactive', value: 'inactive' },
        { text: 'Suspended', value: 'suspended' },
        { text: 'Pending', value: 'pending' },
      ],
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date) => new Date(date).toLocaleDateString(),
      sorter: true,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => {
        const menuItems = [
          {
            key: 'view',
            icon: <EyeOutlined />,
            label: 'View Details',
            onClick: () => handleViewClient(record),
          },
          {
            key: 'edit',
            icon: <EditOutlined />,
            label: 'Edit Client',
            onClick: () => handleEditClient(record),
          },
          {
            type: 'divider',
          },
          {
            key: 'delete',
            icon: <DeleteOutlined />,
            label: 'Delete Client',
            danger: true,
            onClick: () => handleDeleteClient(record),
          },
        ];

        return (
          <Dropdown
            menu={{ items: menuItems }}
            trigger={['click']}
            placement="bottomRight"
          >
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        );
      },
    },
  ];

  // Search configuration
  const searchConfig = {
    placeholder: "Search by company name, contact person, email, phone, or client code...",
    allowClear: true,
    onSearch: (value) => {
      setFilters(prev => ({ ...prev, search: value }));
      setPagination(prev => ({ ...prev, current: 1 }));
    },
  };

  // Filter configuration
  const filterConfig = [
    {
      key: 'clientType',
      label: 'Client Type',
      type: 'select',
      options: [
        { label: 'Project Client', value: 'project' },
        { label: 'Walk-in Client', value: 'walk-in' },
        { label: 'Corporate', value: 'corporate' },
        { label: 'Individual', value: 'individual' },
      ],
    },
    {
      key: 'isActive',
      label: 'Status',
      type: 'select',
      options: [
        { label: 'Active', value: true },
        { label: 'Inactive', value: false },
      ],
    },
    {
      key: 'countryId',
      label: 'Country',
      type: 'select',
      // You'll need to add countries query
      options: [],
    },
    {
      key: 'stateId',
      label: 'State',
      type: 'select',
      // You'll need to add states query based on selected country
      options: [],
    },
    {
      key: 'balanceRange',
      label: 'Balance Range',
      type: 'range',
    },
  ];

  // Action handlers
  const handleAddClient = () => {
    showClientFormDrawer(null, 'create', refetch);
  };

  const handleEditClient = (client) => {
    showClientFormDrawer(client, 'edit', refetch);
  };

  const handleViewClient = (client) => {
    showClientDetailDrawer(client);
  };

  const handleDeleteClient = (client) => {
    Modal.confirm({
      title: 'Delete Client',
      content: `Are you sure you want to delete ${client.companyName || client.displayName || `${client.firstName} ${client.lastName}`}?`,
      icon: <ExclamationCircleOutlined />,
      okText: 'Yes, Delete',
      okType: 'danger',
      onOk: () => {
        deleteClient({ variables: { id: client.id } });
      }
    });
  };

  // Summary statistics
  const summaryStats = useMemo(() => {
    const activeClients = clients.filter(c => c.isActive === true).length;
    
    return {
      total: totalCount,
      active: activeClients,
    };
  }, [clients, totalCount]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <Title level={2} className="mb-2">Client Management</Title>
            <Text type="secondary">
              Manage your clients, track their information and financial status
            </Text>
          </div>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={handleAddClient}
            size="large"
          >
            Add New Client
          </Button>
        </div>

        {/* Summary Cards */}
        <Row gutter={16} className="mb-6">
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Total Clients"
                value={summaryStats.total}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Active Clients"
                value={summaryStats.active}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>


        </Row>
      </div>

      {/* Main Table */}
      <CommonTable
        columns={columns}
        dataSource={clients}
        loading={loading}
        pagination={{
          ...pagination,
          total: totalCount,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} of ${total} clients`,
        }}
        onChange={(pagination, filters, sorter) => {
          setPagination(pagination);
          setFilters(prev => ({ ...prev, ...filters }));
        }}
        searchConfig={searchConfig}
        filterConfig={filterConfig}
        onFiltersChange={setFilters}
        scroll={{ x: 1200 }}
        size="middle"
      />
    </div>
  );
};

export default ClientList;