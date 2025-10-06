import React, { useState, useMemo, useCallback } from 'react';
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
    },
    fetchPolicy: 'cache-and-network'
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

  // Client type colors - memoized
  const getClientTypeColor = useCallback((type) => {
    const colors = {
      'permanent': 'blue',
      'walkIn': 'green'
    };
    return colors[type] || 'default';
  }, []);

  // Action handlers - memoized to prevent re-renders (defined before columns to avoid TDZ)
  const handleAddClient = useCallback(() => {
    showClientFormDrawer(null, 'create', refetch);
  }, [showClientFormDrawer, refetch]);

  const handleEditClient = useCallback((client) => {
    showClientFormDrawer(client, 'edit', refetch);
  }, [showClientFormDrawer, refetch]);

  const handleViewClient = useCallback((client) => {
    showClientDetailDrawer(client);
  }, [showClientDetailDrawer]);

  const handleDeleteClient = useCallback((client) => {
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
  }, [deleteClient]);

  // Table columns configuration - memoized to prevent re-renders
  const columns = useMemo(() => [
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
          {type === 'permanent' ? 'PERMANENT' : type === 'walkIn' ? 'WALK-IN' : type?.toUpperCase()}
        </Tag>
      ),
      filters: [
        { text: 'Permanent Client', value: 'permanent' },
        { text: 'Walk-in Client', value: 'walkIn' },
      ],
      onFilter: (value, record) => record.clientType === value,
      sorter: (a, b) => (a.clientType || '').localeCompare(b.clientType || ''),
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
              <span className="truncate" title={record.email}>{record.email}</span>
            </div>
          )}
          {(record.contactNoWork || record.contactNoPersonal) && (
            <div className="flex items-center text-sm text-gray-600">
              <PhoneOutlined className="mr-2" />
              {record.contactNoWork || record.contactNoPersonal}
            </div>
          )}
        </div>
      ),
      sorter: (a, b) => (a.email || '').localeCompare(b.email || ''),
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
            {record.country?.name && !record.state && !record.city && (
              <div className="text-xs text-gray-400">
                {record.country.name}
              </div>
            )}
          </div>
        </div>
      ),
      sorter: (a, b) => {
        const aLoc = a.city?.name || a.state?.name || a.country?.name || '';
        const bLoc = b.city?.name || b.state?.name || b.country?.name || '';
        return aLoc.localeCompare(bLoc);
      },
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority) => {
        const color = priority === 'HIGH' ? 'red' : priority === 'MEDIUM' ? 'orange' : 'green';
        return priority ? (
          <Tag color={color}>
            {priority}
          </Tag>
        ) : '-';
      },
      filters: [
        { text: 'High', value: 'HIGH' },
        { text: 'Medium', value: 'MEDIUM' },
        { text: 'Low', value: 'LOW' },
      ],
      onFilter: (value, record) => record.priority === value,
      sorter: (a, b) => {
        const priorityOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
        return (priorityOrder[a.priority] || 0) - (priorityOrder[b.priority] || 0);
      },
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'ACTIVE' : 'INACTIVE'}
        </Tag>
      ),
      filters: [
        { text: 'Active', value: true },
        { text: 'Inactive', value: false },
      ],
      onFilter: (value, record) => record.isActive === value,
      sorter: (a, b) => (a.isActive === b.isActive ? 0 : a.isActive ? -1 : 1),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date) => {
        if (!date) return '-';
        const parsedDate = new Date(date);
        // Check if date is valid
        if (isNaN(parsedDate.getTime())) return '-';
        
        // Format date properly
        return parsedDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      },
      sorter: (a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateA - dateB;
      },
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
  ], [getClientTypeColor, handleViewClient, handleEditClient, handleDeleteClient]);

  // Search handler - memoized
  const handleSearch = useCallback((value) => {
    setFilters(prev => ({ ...prev, search: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  // Summary statistics
  const summaryStats = useMemo(() => {
    const activeClients = clients.filter(c => c.isActive === true).length;
    
    return {
      total: totalCount,
      active: activeClients,
    };
  }, [clients, totalCount]);

  // Memoize pagination config to prevent re-renders
  const paginationConfig = useMemo(() => ({
    current: pagination.current,
    pageSize: pagination.pageSize,
    total: totalCount,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total, range) => 
      `${range[0]}-${range[1]} of ${total} clients`,
  }), [pagination.current, pagination.pageSize, totalCount]);

  // Memoize scroll config
  const scrollConfig = useMemo(() => ({ x: 1200 }), []);

  // Memoize onChange handler
  const handleTableChange = useCallback((pagination, filters, sorter) => {
    setPagination(pagination);
    setFilters(prev => ({ ...prev, ...filters }));
  }, []);

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
        pagination={paginationConfig}
        onChange={handleTableChange}
        onSearch={handleSearch}
        searchPlaceholder="Search by company name, contact person, email, phone, or client code..."
        scroll={scrollConfig}
        size="middle"
      />
    </div>
  );
};

export default ClientList;