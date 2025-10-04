import React from 'react';
import { Card, Row, Col, Tag, Typography, Space, Button, Divider } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

const ClientDetail = ({ client, onEdit, onDelete, onClose }) => {
  if (!client) {
    return <div>No client data available</div>;
  }

  const getClientTypeColor = (type) => {
    return type === 'permanent' ? 'blue' : 'green';
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'A': return 'red';
      case 'B': return 'orange';
      case 'C': return 'green';
      default: return 'default';
    }
  };

  const getPriorityText = (priority) => {
    switch (priority) {
      case 'A': return 'High Priority';
      case 'B': return 'Normal Priority';
      case 'C': return 'Low Priority';
      default: return priority;
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>
          {client.displayName || `${client.firstName} ${client.lastName}`.trim()}
        </Title>
        <Space>
          <Button 
            type="primary" 
            icon={<EditOutlined />} 
            onClick={() => onEdit?.(client)}
            size="small"
          >
            Edit
          </Button>
          <Button 
            danger 
            icon={<DeleteOutlined />} 
            onClick={() => onDelete?.(client)}
            size="small"
          >
            Delete
          </Button>
        </Space>
      </div>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Text strong>Client Code:</Text><br />
            <Text>{client.clientCode}</Text>
          </Col>
          <Col span={12}>
            <Text strong>Client Type:</Text><br />
            <Tag color={getClientTypeColor(client.clientType)}>
              {client.clientType === 'permanent' ? 'Permanent' : 'Walk-in'}
            </Tag>
          </Col>
          <Col span={12}>
            <Text strong>First Name:</Text><br />
            <Text>{client.firstName}</Text>
          </Col>
          <Col span={12}>
            <Text strong>Last Name:</Text><br />
            <Text>{client.lastName || '-'}</Text>
          </Col>
          {client.companyName && (
            <Col span={24}>
              <Text strong>Company Name:</Text><br />
              <Text>{client.companyName}</Text>
            </Col>
          )}
          <Col span={12}>
            <Text strong>Email:</Text><br />
            <Text>{client.email || '-'}</Text>
          </Col>
          <Col span={12}>
            <Text strong>Work Phone:</Text><br />
            <Text>{client.contactNoWork || '-'}</Text>
          </Col>
          {client.contactNoPersonal && (
            <Col span={12}>
              <Text strong>Personal Phone:</Text><br />
              <Text>{client.contactNoPersonal}</Text>
            </Col>
          )}
          <Col span={12}>
            <Text strong>Priority:</Text><br />
            <Tag color={getPriorityColor(client.priority)}>
              {getPriorityText(client.priority)}
            </Tag>
          </Col>
          <Col span={12}>
            <Text strong>Status:</Text><br />
            <Tag color={client.isActive ? 'success' : 'error'}>
              {client.isActive ? 'Active' : 'Inactive'}
            </Tag>
          </Col>
        </Row>
      </Card>

      {/* Location Information */}
      {(client.country || client.state || client.city || client.address || client.pincode) && (
        <Card title="Location Details" size="small" style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]}>
            {client.country && (
              <Col span={8}>
                <Text strong>Country:</Text><br />
                <Text>{client.country.name}</Text>
              </Col>
            )}
            {client.state && (
              <Col span={8}>
                <Text strong>State:</Text><br />
                <Text>{client.state.name}</Text>
              </Col>
            )}
            {client.city && (
              <Col span={8}>
                <Text strong>City:</Text><br />
                <Text>{client.city.name}</Text>
              </Col>
            )}
            {client.address && (
              <Col span={16}>
                <Text strong>Address:</Text><br />
                <Text>{client.address}</Text>
              </Col>
            )}
            {client.pincode && (
              <Col span={8}>
                <Text strong>Pincode:</Text><br />
                <Text>{client.pincode}</Text>
              </Col>
            )}
          </Row>
        </Card>
      )}

      {/* Notes */}
      {client.clientNotes && (
        <Card title="Notes" size="small" style={{ marginBottom: 16 }}>
          <Text>{client.clientNotes}</Text>
        </Card>
      )}

      {/* Audit Information */}
      <Card title="Audit Information" size="small">
        <Row gutter={[16, 8]}>
          <Col span={12}>
            <Text strong>Created:</Text><br />
            <Text type="secondary">
              {client.createdAt ? dayjs(client.createdAt).format('DD/MM/YYYY HH:mm') : '-'}
            </Text>
          </Col>
          <Col span={12}>
            <Text strong>Updated:</Text><br />
            <Text type="secondary">
              {client.updatedAt ? dayjs(client.updatedAt).format('DD/MM/YYYY HH:mm') : '-'}
            </Text>
          </Col>
          {client.creator && (
            <Col span={12}>
              <Text strong>Created By:</Text><br />
              <Text type="secondary">
                {`${client.creator.firstName} ${client.creator.lastName}`.trim()}
              </Text>
            </Col>
          )}
        </Row>
      </Card>
    </div>
  );
};

export default ClientDetail;