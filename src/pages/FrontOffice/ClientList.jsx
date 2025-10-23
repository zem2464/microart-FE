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
  Modal,
  InputNumber,
  Switch,
  Tooltip 
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
  ExclamationCircleOutlined,
  CheckOutlined,
  CloseOutlined,
  SaveOutlined
} from '@ant-design/icons';
import { useQuery, useMutation } from '@apollo/client';
import { GET_CLIENTS, DELETE_CLIENT, UPDATE_CLIENT } from '../../gql/clients';
import CommonTable from '../../components/common/CommonTable';
import { useAppDrawer } from '../../contexts/DrawerContext';

const { Title, Text } = Typography;

const ClientList = () => {
  const [filters, setFilters] = useState({});
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [editingCredit, setEditingCredit] = useState({}); // Track which credit limits are being edited
  const [editingStatus, setEditingStatus] = useState({}); // Track which statuses are being edited
  const [tempValues, setTempValues] = useState({}); // Store temporary edit values
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, record: null });
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
      message.error(`Failed to delete client: ${error.message}`);
    }
  });

  const [updateClient] = useMutation(UPDATE_CLIENT, {
    onCompleted: () => {
      message.success('Client updated successfully');
      refetch();
    },
    onError: (error) => {
      message.error(`Failed to update client: ${error.message}`);
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

  // Inline editing handlers
  const handleEditCredit = useCallback((clientId, currentValue) => {
    setEditingCredit(prev => ({ ...prev, [clientId]: true }));
    setTempValues(prev => ({ ...prev, [`credit_${clientId}`]: currentValue || 0 }));
  }, []);

  const handleCancelCreditEdit = useCallback((clientId) => {
    setEditingCredit(prev => ({ ...prev, [clientId]: false }));
    setTempValues(prev => {
      const newValues = { ...prev };
      delete newValues[`credit_${clientId}`];
      return newValues;
    });
  }, []);

  const handleSaveCreditEdit = useCallback(async (clientId) => {
    const newValue = tempValues[`credit_${clientId}`];
    if (newValue < 0) {
      message.error('Credit limit cannot be negative');
      return;
    }

    try {
      await updateClient({
        variables: {
          id: clientId,
          input: {
            creditAmountLimit: parseFloat(newValue || 0)
          }
        }
      });
      setEditingCredit(prev => ({ ...prev, [clientId]: false }));
      setTempValues(prev => {
        const newValues = { ...prev };
        delete newValues[`credit_${clientId}`];
        return newValues;
      });
    } catch (error) {
      message.error('Failed to update credit limit');
    }
  }, [tempValues, updateClient]);

  const handleEditStatus = useCallback((clientId, currentValue) => {
    setEditingStatus(prev => ({ ...prev, [clientId]: true }));
    setTempValues(prev => ({ ...prev, [`status_${clientId}`]: currentValue }));
  }, []);

  const handleCancelStatusEdit = useCallback((clientId) => {
    setEditingStatus(prev => ({ ...prev, [clientId]: false }));
    setTempValues(prev => {
      const newValues = { ...prev };
      delete newValues[`status_${clientId}`];
      return newValues;
    });
  }, []);

  const handleSaveStatusEdit = useCallback(async (clientId) => {
    const newValue = tempValues[`status_${clientId}`];
    
    try {
      await updateClient({
        variables: {
          id: clientId,
          input: {
            isActive: newValue
          }
        }
      });
      setEditingStatus(prev => ({ ...prev, [clientId]: false }));
      setTempValues(prev => {
        const newValues = { ...prev };
        delete newValues[`status_${clientId}`];
        return newValues;
      });
    } catch (error) {
      message.error('Failed to update client status');
    }
  }, [tempValues, updateClient]);

  // Context menu handlers
  const handleRowRightClick = useCallback((event, record) => {
    console.log('Right click detected', record); // Debug log
    event.preventDefault();
    event.stopPropagation();
    
    // Calculate position to ensure menu stays within viewport
    const menuWidth = 160;
    const menuHeight = 120;
    let x = event.clientX;
    let y = event.clientY;
    
    // Adjust position if menu would go off screen
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10;
    }
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 10;
    }
    
    setContextMenu({
      visible: true,
      x: x,
      y: y,
      record: record
    });
  }, []);

  const handleContextMenuClose = useCallback(() => {
    console.log('Context menu closing'); // Debug log
    setContextMenu({ visible: false, x: 0, y: 0, record: null });
  }, []);

  const handleContextMenuAction = useCallback((action, record) => {
    console.log('Context menu action:', action, record); // Debug log
    handleContextMenuClose();
    
    switch (action) {
      case 'view':
        handleViewClient(record);
        break;
      case 'edit':
        handleEditClient(record);
        break;
      case 'delete':
        handleDeleteClient(record);
        break;
      default:
        break;
    }
  }, [handleViewClient, handleEditClient, handleDeleteClient, handleContextMenuClose]);

  // Close context menu when clicking elsewhere
  React.useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.visible) {
        handleContextMenuClose();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [contextMenu.visible, handleContextMenuClose]);

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
      filterMultiple: false,
      onFilter: (value, record) => {
        console.log('Filter applied:', value, 'Record type:', record.clientType); // Debug log
        return record.clientType === value;
      },
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
      title: 'Credit Limit',
      dataIndex: 'creditAmountLimit',
      key: 'creditLimit',
      width: 180,
      render: (creditLimit, record) => {
        const limit = parseFloat(creditLimit || 0);
        const currentBalance = parseFloat(record.totalBalance || 0);
        const available = limit + currentBalance;
        const isEditing = editingCredit[record.id];
        const tempValue = tempValues[`credit_${record.id}`];
        
        if (isEditing) {
          return (
            <div className="text-right">
              <div className="flex items-center justify-end space-x-1">
                <InputNumber
                  size="small"
                  value={tempValue}
                  onChange={(value) => setTempValues(prev => ({ 
                    ...prev, 
                    [`credit_${record.id}`]: value 
                  }))}
                  min={0}
                  precision={2}
                  style={{ width: 100 }}
                  prefix="₹"
                />
                <Tooltip title="Save">
                  <Button 
                    type="text" 
                    size="small" 
                    icon={<CheckOutlined />}
                    onClick={() => handleSaveCreditEdit(record.id)}
                    style={{ color: '#52c41a' }}
                  />
                </Tooltip>
                <Tooltip title="Cancel">
                  <Button 
                    type="text" 
                    size="small" 
                    icon={<CloseOutlined />}
                    onClick={() => handleCancelCreditEdit(record.id)}
                    style={{ color: '#ff4d4f' }}
                  />
                </Tooltip>
              </div>
            </div>
          );
        }
        
        return (
          <div className="text-right group">
            <div 
              className="font-medium text-gray-900 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded flex items-center justify-end"
              onClick={() => handleEditCredit(record.id, limit)}
              title="Click to edit credit limit"
            >
              ₹{limit.toLocaleString('en-IN', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
              })}
              <EditOutlined className="ml-1 opacity-0 group-hover:opacity-100 text-xs" />
            </div>
            <div className="text-xs text-gray-500">
              Limit
            </div>
            {limit > 0 && (
              <div className={`text-xs ${available >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ₹{Math.abs(available).toLocaleString('en-IN', { 
                  minimumFractionDigits: 0, 
                  maximumFractionDigits: 0 
                })} {available >= 0 ? 'available' : 'over limit'}
              </div>
            )}
          </div>
        );
      },
      sorter: (a, b) => (parseFloat(a.creditAmountLimit || 0) - parseFloat(b.creditAmountLimit || 0)),
      filters: [
        { text: 'Has Credit Limit', value: 'hasLimit' },
        { text: 'No Credit Limit', value: 'noLimit' },
        { text: 'Over Limit', value: 'overLimit' },
      ],
      onFilter: (value, record) => {
        const limit = parseFloat(record.creditAmountLimit || 0);
        const currentBalance = parseFloat(record.totalBalance || 0);
        const available = limit + currentBalance;
        
        if (value === 'hasLimit') return limit > 0;
        if (value === 'noLimit') return limit === 0;
        if (value === 'overLimit') return limit > 0 && available < 0;
        return false;
      },
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority) => {
        const getPriorityConfig = (prio) => {
          const upperPrio = prio?.toUpperCase();
          switch (upperPrio) {
            case 'A':
            case 'HIGH':
              return { color: 'red', text: 'A', label: 'High Priority' };
            case 'B':
            case 'MEDIUM':
              return { color: 'orange', text: 'B', label: 'Medium Priority' };
            case 'C':
            case 'LOW':
              return { color: 'green', text: 'C', label: 'Low Priority' };
            default:
              return { color: 'default', text: prio || '-', label: 'Unknown' };
          }
        };

        const config = getPriorityConfig(priority);
        
        return priority ? (
          <Tag 
            color={config.color}
            title={config.label}
            style={{ fontWeight: 'bold', minWidth: '24px', textAlign: 'center' }}
          >
            {config.text}
          </Tag>
        ) : '-';
      },
      filters: [
        { text: 'A - High Priority', value: 'HIGH' },
        { text: 'A - High Priority', value: 'A' },
        { text: 'B - Medium Priority', value: 'MEDIUM' },
        { text: 'B - Medium Priority', value: 'B' },
        { text: 'C - Low Priority', value: 'LOW' },
        { text: 'C - Low Priority', value: 'C' },
      ],
      onFilter: (value, record) => {
        const recordPriority = record.priority?.toUpperCase();
        const filterValue = value?.toUpperCase();
        
        // Handle both old format (HIGH/MEDIUM/LOW) and new format (A/B/C)
        if (filterValue === 'HIGH' || filterValue === 'A') {
          return recordPriority === 'HIGH' || recordPriority === 'A';
        }
        if (filterValue === 'MEDIUM' || filterValue === 'B') {
          return recordPriority === 'MEDIUM' || recordPriority === 'B';
        }
        if (filterValue === 'LOW' || filterValue === 'C') {
          return recordPriority === 'LOW' || recordPriority === 'C';
        }
        return record.priority === value;
      },
      sorter: (a, b) => {
        const getPriorityValue = (prio) => {
          const upperPrio = prio?.toUpperCase();
          switch (upperPrio) {
            case 'A':
            case 'HIGH':
              return 3;
            case 'B':
            case 'MEDIUM':
              return 2;
            case 'C':
            case 'LOW':
              return 1;
            default:
              return 0;
          }
        };
        
        return getPriorityValue(a.priority) - getPriorityValue(b.priority);
      },
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 130,
      render: (isActive, record) => {
        const isEditing = editingStatus[record.id];
        const tempValue = tempValues[`status_${record.id}`];
        
        if (isEditing) {
          return (
            <div className="flex items-center space-x-2">
              <Switch
                checked={tempValue}
                onChange={(checked) => setTempValues(prev => ({ 
                  ...prev, 
                  [`status_${record.id}`]: checked 
                }))}
                size="small"
                checkedChildren="Active"
                unCheckedChildren="Inactive"
              />
              <div className="flex space-x-1">
                <Tooltip title="Save">
                  <Button 
                    type="text" 
                    size="small" 
                    icon={<CheckOutlined />}
                    onClick={() => handleSaveStatusEdit(record.id)}
                    style={{ color: '#52c41a' }}
                  />
                </Tooltip>
                <Tooltip title="Cancel">
                  <Button 
                    type="text" 
                    size="small" 
                    icon={<CloseOutlined />}
                    onClick={() => handleCancelStatusEdit(record.id)}
                    style={{ color: '#ff4d4f' }}
                  />
                </Tooltip>
              </div>
            </div>
          );
        }
        
        return (
          <div className="group">
            <div 
              className="cursor-pointer hover:bg-gray-50 px-2 py-1 rounded flex items-center justify-between"
              onClick={() => handleEditStatus(record.id, isActive)}
              title="Click to edit status"
            >
              <Tag color={isActive ? 'green' : 'red'}>
                {isActive ? 'ACTIVE' : 'INACTIVE'}
              </Tag>
              <EditOutlined className="opacity-0 group-hover:opacity-100 text-xs ml-1" />
            </div>
          </div>
        );
      },
      filters: [
        { text: 'Active', value: true },
        { text: 'Inactive', value: false },
      ],
      onFilter: (value, record) => record.isActive === value,
      sorter: (a, b) => (a.isActive === b.isActive ? 0 : a.isActive ? -1 : 1),
    },
    // Actions column with direct action buttons
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="View Details">
            <Button 
              type="text" 
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewClient(record)}
            />
          </Tooltip>
          <Tooltip title="Edit Client">
            <Button 
              type="text" 
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditClient(record)}
            />
          </Tooltip>
          <Tooltip title="Delete Client">
            <Button 
              type="text" 
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteClient(record)}
              danger
            />
          </Tooltip>
        </Space>
      ),
    },
  ], [
    getClientTypeColor, 
    handleViewClient, 
    handleEditClient, 
    handleDeleteClient,
    editingCredit,
    editingStatus,
    tempValues,
    setTempValues,
    handleEditCredit,
    handleCancelCreditEdit,
    handleSaveCreditEdit,
    handleEditStatus,
    handleCancelStatusEdit,
    handleSaveStatusEdit
  ]);

  // Search handler - memoized
  const handleSearch = useCallback((value) => {
    setFilters(prev => ({ ...prev, search: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  // Summary statistics
  const summaryStats = useMemo(() => {
    const activeClients = clients.filter(c => c.isActive === true).length;
    
    // Calculate current balances
    const totalCreditBalance = clients.reduce((sum, client) => {
      const balance = parseFloat(client.totalBalance || 0);
      return sum + (balance > 0 ? balance : 0);
    }, 0);
    
    const totalAmountDue = clients.reduce((sum, client) => {
      const balance = parseFloat(client.totalBalance || 0);
      return sum + (balance < 0 ? Math.abs(balance) : 0);
    }, 0);
    
    // Calculate credit limits
    const totalCreditLimits = clients.reduce((sum, client) => {
      const limit = parseFloat(client.creditAmountLimit || 0);
      return sum + limit;
    }, 0);
    
    const clientsWithCreditLimit = clients.filter(c => parseFloat(c.creditAmountLimit || 0) > 0).length;
    const clientsOverLimit = clients.filter(c => {
      const limit = parseFloat(c.creditAmountLimit || 0);
      const balance = parseFloat(c.totalBalance || 0);
      return limit > 0 && (limit + balance) < 0;
    }).length;
    
    const clientsWithCredit = clients.filter(c => parseFloat(c.totalBalance || 0) > 0).length;
    const clientsWithDue = clients.filter(c => parseFloat(c.totalBalance || 0) < 0).length;
    
    return {
      total: totalCount,
      active: activeClients,
      totalCreditBalance,
      totalAmountDue,
      totalCreditLimits,
      clientsWithCreditLimit,
      clientsOverLimit,
      clientsWithCredit,
      clientsWithDue
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
          <Col xs={24} sm={6} lg={4}>
            <Card>
              <Statistic
                title="Total Clients"
                value={summaryStats.total}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6} lg={4}>
            <Card>
              <Statistic
                title="Active Clients"
                value={summaryStats.active}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6} lg={4}>
            <Card>
              <Statistic
                title="Total Credit Limits"
                value={summaryStats.totalCreditLimits}
                prefix="₹"
                precision={0}
                valueStyle={{ color: '#1890ff' }}
              />
              <div className="text-xs text-gray-500 mt-1">
                {summaryStats.clientsWithCreditLimit} clients with limits
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={6} lg={4}>
            <Card>
              <Statistic
                title="Credit Available"
                value={summaryStats.totalCreditBalance}
                prefix="₹"
                precision={2}
                valueStyle={{ color: '#52c41a' }}
              />
              <div className="text-xs text-gray-500 mt-1">
                {summaryStats.clientsWithCredit} clients with credit
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={6} lg={4}>
            <Card>
              <Statistic
                title="Amount Due"
                value={summaryStats.totalAmountDue}
                prefix="₹"
                precision={2}
                valueStyle={{ color: '#ff4d4f' }}
              />
              <div className="text-xs text-gray-500 mt-1">
                {summaryStats.clientsWithDue} clients with dues
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={6} lg={4}>
            <Card>
              <Statistic
                title="Over Limit"
                value={summaryStats.clientsOverLimit}
                valueStyle={{ color: '#ff4d4f' }}
              />
              <div className="text-xs text-gray-500 mt-1">
                Clients exceeding limits
              </div>
            </Card>
          </Col>
        </Row>
      </div>

      {/* Main Table */}
      <CommonTable
        className="client-table"
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