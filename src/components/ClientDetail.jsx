import React from 'react';
import { Card, Row, Col, Tag, Typography, Space, Button, Divider, Spin } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery } from '@apollo/client';
import { GET_CLIENT } from '../gql/clients';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

const ClientDetail = ({ client: clientProp, onEdit, onDelete, onClose }) => {
  // Fetch full client data with all associations
  const { data, loading, error } = useQuery(GET_CLIENT, {
    variables: { id: clientProp?.id },
    skip: !clientProp?.id,
    fetchPolicy: 'network-only' // Always fetch fresh data
  });

  // Use fetched data if available, otherwise use prop
  const client = data?.client || clientProp;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return <div>Error loading client details: {error.message}</div>;
  }

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

      {/* Business Details */}
      {(client.isGstEnabled || client.panCard || client.creditDays || client.creditAmountLimit || 
        client.openingBalance || client.accountMessage) && (
        <Card title="Business Details" size="small" style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]}>
            {client.isGstEnabled && (
              <>
                <Col span={8}>
                  <Text strong>GST Enabled:</Text><br />
                  <Tag color="success">Yes</Tag>
                </Col>
                {client.gstNumber && (
                  <Col span={8}>
                    <Text strong>GST Number:</Text><br />
                    <Text>{client.gstNumber}</Text>
                  </Col>
                )}
                {client.gstRate !== null && client.gstRate !== undefined && (
                  <Col span={8}>
                    <Text strong>GST Rate:</Text><br />
                    <Text>{client.gstRate}%</Text>
                  </Col>
                )}
              </>
            )}
            {client.panCard && (
              <Col span={8}>
                <Text strong>PAN Card:</Text><br />
                <Text>{client.panCard}</Text>
              </Col>
            )}
            {client.creditDays !== null && client.creditDays !== undefined && (
              <Col span={8}>
                <Text strong>Credit Days:</Text><br />
                <Text>{client.creditDays} days</Text>
              </Col>
            )}
            {client.creditAmountLimit !== null && client.creditAmountLimit !== undefined && (
              <Col span={8}>
                <Text strong>Credit Limit:</Text><br />
                <Text>₹{parseFloat(client.creditAmountLimit).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
              </Col>
            )}
            {client.openingBalance !== null && client.openingBalance !== undefined && (
              <Col span={8}>
                <Text strong>Opening Balance:</Text><br />
                <Text style={{ color: client.openingBalance >= 0 ? 'green' : 'red' }}>
                  ₹{parseFloat(client.openingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </Col>
            )}
            {client.accountMessage && (
              <Col span={24}>
                <Text strong>Account Message:</Text><br />
                <Text>{client.accountMessage}</Text>
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

      {/* Work Types */}
      {client.workTypeAssociations && client.workTypeAssociations.length > 0 && (
        <Card title="Work Types" size="small" style={{ marginBottom: 16 }}>
          <Space wrap>
            {client.workTypeAssociations.map(wta => (
              <Tag key={wta.id} color="blue" style={{ marginBottom: 8 }}>
                {wta.workType?.name || 'Unknown'}
              </Tag>
            ))}
          </Space>
        </Card>
      )}

      {/* Gradings & Pricing */}
      {client.gradings && client.gradings.length > 0 && (
        <Card title="Gradings & Pricing" size="small" style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]}>
            {client.gradings.map(grading => (
              <Col span={24} key={grading.id}>
                <Card 
                  size="small" 
                  style={{ 
                    backgroundColor: '#f5f5f5',
                    marginBottom: 8
                  }}
                >
                  <Row gutter={[16, 8]}>
                    <Col span={12}>
                      <Text strong>{grading.grading?.name || 'Unknown Grading'}</Text>
                      {grading.grading?.workType && (
                        <>
                          <br />
                          <Tag color="blue" style={{ marginTop: 4 }}>
                            {grading.grading.workType.name}
                          </Tag>
                        </>
                      )}
                      {grading.grading?.description && (
                        <>
                          <br />
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {grading.grading.description}
                          </Text>
                        </>
                      )}
                    </Col>
                    <Col span={6}>
                      <Text type="secondary">Default Rate:</Text><br />
                      <Text strong>
                        ₹{grading.grading?.defaultRate || 0}/{grading.grading?.unit || 'unit'}
                      </Text>
                    </Col>
                    <Col span={6}>
                      {grading.customRate ? (
                        <>
                          <Text type="secondary">Custom Rate:</Text><br />
                          <Text strong style={{ color: '#1890ff' }}>
                            ₹{grading.customRate}/{grading.unit || 'unit'}
                          </Text>
                          <Tag color="orange" style={{ marginLeft: 8 }}>Custom</Tag>
                        </>
                      ) : (
                        <>
                          <Text type="secondary">Effective Rate:</Text><br />
                          <Text strong>
                            ₹{grading.effectiveRate || grading.grading?.defaultRate || 0}/{grading.unit || 'unit'}
                          </Text>
                        </>
                      )}
                    </Col>
                  </Row>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* Task Preferences */}
      {client.taskPreferences && client.taskPreferences.length > 0 && (
        <Card title="Task Preferences (Preferred Employees)" size="small" style={{ marginBottom: 16 }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
            These employees will be auto-assigned when creating projects for this client.
          </Text>
          {/* Group task preferences by grading */}
          {(() => {
            // Group preferences by gradingId
            const groupedPreferences = {};
            client.taskPreferences.forEach(pref => {
              if (!groupedPreferences[pref.gradingId]) {
                groupedPreferences[pref.gradingId] = [];
              }
              groupedPreferences[pref.gradingId].push(pref);
            });

            return Object.entries(groupedPreferences).map(([gradingId, prefs]) => {
              // Find the grading name
              const grading = client.gradings?.find(g => g.gradingId === gradingId);
              const gradingName = grading?.grading?.name || `Grading ${gradingId}`;

              return (
                <Card 
                  key={gradingId}
                  size="small" 
                  title={gradingName}
                  style={{ 
                    backgroundColor: '#fafafa',
                    marginBottom: 12
                  }}
                >
                  {prefs.map(pref => (
                    <Row key={pref.id} gutter={16} style={{ marginBottom: 8 }}>
                      <Col span={8}>
                        <Text strong>{pref.task?.name || 'Unknown Task'}</Text>
                      </Col>
                      <Col span={16}>
                        <Space wrap size="small">
                          {pref.preferredUsers && pref.preferredUsers.length > 0 ? (
                            // Use preferredUsers field from the query
                            pref.preferredUsers.map(user => (
                              <Tag key={user.id} color="green">
                                {user.firstName} {user.lastName}
                              </Tag>
                            ))
                          ) : pref.preferredUserIds && pref.preferredUserIds.length > 0 ? (
                            // Fallback: try to find in serviceProviders
                            (() => {
                              const users = pref.preferredUserIds.map(userId => {
                                const sp = client.serviceProviders?.find(s => s.serviceProvider?.id === userId);
                                return sp?.serviceProvider;
                              }).filter(Boolean);

                              return users.length > 0 ? (
                                users.map(user => (
                                  <Tag key={user.id} color="green">
                                    {user.firstName} {user.lastName}
                                  </Tag>
                                ))
                              ) : (
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                  {pref.preferredUserIds.length} employee(s) assigned
                                </Text>
                              );
                            })()
                          ) : (
                            <Text type="secondary">No preferred employees</Text>
                          )}
                        </Space>
                      </Col>
                    </Row>
                  ))}
                </Card>
              );
            });
          })()}
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