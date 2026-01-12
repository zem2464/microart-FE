import React, { useState } from 'react';
import { List, Tag, Typography, Empty, Spin, Input, Button, Drawer, Card, Divider, Row, Col, Statistic } from 'antd';
import {
  SearchOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  ArrowLeftOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useQuery } from '@apollo/client';
import { GET_CLIENTS } from '../../../gql/clients';
import dayjs from 'dayjs';
import './MobileClientsPage.css';

const { Text } = Typography;

/**
 * Mobile-optimized Clients page (Read-only)
 * Shows list of clients with basic information
 * No editing/deletion capabilities
 */
const MobileClientsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [filterActive, setFilterActive] = useState('all'); // 'active', 'inactive', 'all'

  const { data, loading } = useQuery(GET_CLIENTS, {
    variables: {
      filters: {},
      page: 1,
      limit: 1000,
      sortBy: 'displayName',
      sortOrder: 'ASC',
    },
    fetchPolicy: 'cache-and-network',
  });

  const clients = data?.clients?.clients || [];

  // Filter and search clients
  const filteredClients = clients.filter(client => {
    // Filter by active status
    if (filterActive === 'active' && !client.isActive) return false;
    if (filterActive === 'inactive' && client.isActive) return false;

    // Filter by search term
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      client.displayName?.toLowerCase().includes(searchLower) ||
      client.clientCode?.toLowerCase().includes(searchLower) ||
      client.email?.toLowerCase().includes(searchLower) ||
      client.companyName?.toLowerCase().includes(searchLower)
    );
  });

  const getClientDisplayName = (client) => {
    return client.displayName || client.companyName || `${client.firstName} ${client.lastName}`.trim();
  };

  const getClientType = (client) => {
    switch (client.clientType) {
      case 'individual':
        return 'Individual';
      case 'business':
        return 'Business';
      default:
        return client.clientType || 'N/A';
    }
  };

  const getClientBalance = (client) => {
    if (!client.totalBalance && client.totalBalance !== 0) return 'N/A';
    const balance = parseFloat(client.totalBalance);
    return balance >= 0 ? `₹${balance.toFixed(2)}` : `-₹${Math.abs(balance).toFixed(2)}`;
  };

  if (loading) {
    return <div className="mobile-clients-loading"><Spin size="large" /></div>;
  }

  return (
    <div className="mobile-clients-container">
      {!selectedClient ? (
        <>
          {/* Search and filters */}
          <div className="mobile-clients-search">
            <Input
              placeholder="Search clients..."
              prefix={<SearchOutlined />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mobile-clients-search-input"
            />
          </div>

          {/* Filter tabs */}
          <div className="mobile-clients-tabs">
            <Button
              type={filterActive === 'all' ? 'primary' : 'default'}
              onClick={() => setFilterActive('all')}
              className="mobile-clients-tab-btn"
            >
              All
            </Button>
            <Button
              type={filterActive === 'active' ? 'primary' : 'default'}
              onClick={() => setFilterActive('active')}
              className="mobile-clients-tab-btn"
            >
              Active
            </Button>
            <Button
              type={filterActive === 'inactive' ? 'primary' : 'default'}
              onClick={() => setFilterActive('inactive')}
              className="mobile-clients-tab-btn"
            >
              Inactive
            </Button>
          </div>

          {/* Clients list */}
          {filteredClients.length === 0 ? (
            <Empty
              description="No clients found"
              style={{ marginTop: '40px' }}
            />
          ) : (
            <List
              dataSource={filteredClients}
              renderItem={(client) => (
                <div
                  key={client.id}
                  className="mobile-client-item"
                  onClick={() => setSelectedClient(client)}
                >
                  <div className="mobile-client-header">
                    <div className="mobile-client-avatar">
                      <UserOutlined />
                    </div>
                    <div className="mobile-client-info">
                      <div className="mobile-client-name">
                        {getClientDisplayName(client)}
                      </div>
                      <div className="mobile-client-code">
                        {client.clientCode}
                      </div>
                    </div>
                    <Tag color={client.isActive ? 'green' : 'red'}>
                      {client.isActive ? 'Active' : 'Inactive'}
                    </Tag>
                  </div>
                  {client.email && (
                    <div className="mobile-client-meta">
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        <MailOutlined /> {client.email}
                      </Text>
                    </div>
                  )}
                  {client.contactNoWork && (
                    <div className="mobile-client-meta">
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        <PhoneOutlined /> {client.contactNoWork}
                      </Text>
                    </div>
                  )}
                  <div className="mobile-client-balance">
                    <Text strong style={{ fontSize: '13px' }}>
                      {getClientBalance(client)}
                    </Text>
                  </div>
                </div>
              )}
            />
          )}
        </>
      ) : (
        // Client detail view
        <div className="mobile-client-detail">
          <div className="mobile-client-detail-header">
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => setSelectedClient(null)}
              className="mobile-client-detail-back"
            />
            <div className="mobile-client-detail-title">
              {getClientDisplayName(selectedClient)}
            </div>
          </div>

          <div className="mobile-client-detail-content">
            {/* Basic info */}
            <Card size="small" className="mobile-detail-card" title="Basic Information">
              <div className="detail-section">
                <Text type="secondary">Client Code</Text>
                <div className="detail-value">{selectedClient.clientCode}</div>
              </div>
              <Divider style={{ margin: '12px 0' }} />
              <div className="detail-section">
                <Text type="secondary">Client Type</Text>
                <div className="detail-value">{getClientType(selectedClient)}</div>
              </div>
              <Divider style={{ margin: '12px 0' }} />
              <div className="detail-section">
                <Text type="secondary">Status</Text>
                <div className="detail-value">
                  <Tag color={selectedClient.isActive ? 'green' : 'red'}>
                    {selectedClient.isActive ? 'Active' : 'Inactive'}
                  </Tag>
                </div>
              </div>
            </Card>

            {/* Contact info */}
            <Card size="small" className="mobile-detail-card" title="Contact Information">
              {selectedClient.email && (
                <>
                  <div className="detail-section">
                    <Text type="secondary">Email</Text>
                    <div className="detail-value">{selectedClient.email}</div>
                  </div>
                  <Divider style={{ margin: '12px 0' }} />
                </>
              )}
              {selectedClient.contactNoWork && (
                <>
                  <div className="detail-section">
                    <Text type="secondary">Work Phone</Text>
                    <div className="detail-value">{selectedClient.contactNoWork}</div>
                  </div>
                  <Divider style={{ margin: '12px 0' }} />
                </>
              )}
              {selectedClient.contactNoPersonal && (
                <>
                  <div className="detail-section">
                    <Text type="secondary">Personal Phone</Text>
                    <div className="detail-value">{selectedClient.contactNoPersonal}</div>
                  </div>
                  <Divider style={{ margin: '12px 0' }} />
                </>
              )}
              {selectedClient.phone && (
                <div className="detail-section">
                  <Text type="secondary">Phone</Text>
                  <div className="detail-value">{selectedClient.phone}</div>
                </div>
              )}
            </Card>

            {/* Address */}
            {selectedClient.address && (
              <Card size="small" className="mobile-detail-card" title="Address">
                <div className="detail-section">
                  <Text type="secondary">Address</Text>
                  <div className="detail-value">{selectedClient.address}</div>
                </div>
                {selectedClient.pincode && (
                  <>
                    <Divider style={{ margin: '12px 0' }} />
                    <div className="detail-section">
                      <Text type="secondary">Pincode</Text>
                      <div className="detail-value">{selectedClient.pincode}</div>
                    </div>
                  </>
                )}
                {selectedClient.city?.name && (
                  <>
                    <Divider style={{ margin: '12px 0' }} />
                    <div className="detail-section">
                      <Text type="secondary">City</Text>
                      <div className="detail-value">{selectedClient.city.name}</div>
                    </div>
                  </>
                )}
              </Card>
            )}

            {/* Financial info */}
            <Card size="small" className="mobile-detail-card" title="Financial Information">
              <Row gutter={12}>
                <Col span={12}>
                  <Statistic
                    title="Total Balance"
                    value={parseFloat(selectedClient.totalBalance || 0)}
                    precision={2}
                    prefix="₹"
                    valueStyle={{ fontSize: '14px', color: parseFloat(selectedClient.totalBalance || 0) >= 0 ? '#52c41a' : '#ff4d4f' }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Total Paid"
                    value={parseFloat(selectedClient.totalPaid || 0)}
                    precision={2}
                    prefix="₹"
                    valueStyle={{ fontSize: '14px', color: '#1890ff' }}
                  />
                </Col>
              </Row>
              {selectedClient.totalDue && (
                <>
                  <Divider style={{ margin: '12px 0' }} />
                  <Row gutter={12}>
                    <Col span={12}>
                      <Statistic
                        title="Total Due"
                        value={parseFloat(selectedClient.totalDue || 0)}
                        precision={2}
                        prefix="₹"
                        valueStyle={{ fontSize: '14px', color: '#ff4d4f' }}
                      />
                    </Col>
                  </Row>
                </>
              )}
            </Card>

            {/* Company info */}
            {selectedClient.companyName && (
              <Card size="small" className="mobile-detail-card" title="Company Information">
                <div className="detail-section">
                  <Text type="secondary">Company Name</Text>
                  <div className="detail-value">{selectedClient.companyName}</div>
                </div>
                {selectedClient.gstNumber && (
                  <>
                    <Divider style={{ margin: '12px 0' }} />
                    <div className="detail-section">
                      <Text type="secondary">GST Number</Text>
                      <div className="detail-value">{selectedClient.gstNumber}</div>
                    </div>
                  </>
                )}
                {selectedClient.panCard && (
                  <>
                    <Divider style={{ margin: '12px 0' }} />
                    <div className="detail-section">
                      <Text type="secondary">PAN Card</Text>
                      <div className="detail-value">{selectedClient.panCard}</div>
                    </div>
                  </>
                )}
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileClientsPage;
