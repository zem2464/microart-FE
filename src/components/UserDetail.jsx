import React from "react";
import { Descriptions, Tag, Typography, Divider, Card } from "antd";
import dayjs from "dayjs";

const { Title, Text } = Typography;

const UserDetail = ({ user, onClose }) => {
  if (!user) return null;

  const formatDate = (date) => {
    return date ? dayjs(date).format('YYYY-MM-DD') : 'Not set';
  };

  const formatCurrency = (amount, type) => {
    if (!amount) return '₹0.00';
    return `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${type})`;
  };

  const formatPayType = (payType, salaryAmount, salaryType, hourlyRate) => {
    if (!payType) return 'Not specified';
    
    if (payType === 'fixed') {
      return formatCurrency(salaryAmount, salaryType);
    } else if (payType === 'hourly') {
      return `₹${Number(hourlyRate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per hour`;
    }
    
    return 'Not specified';
  };

  const calculateHourlyRate = (salaryAmount, monthlyHours) => {
    if (!salaryAmount || !monthlyHours || monthlyHours === 0) return null;
    return (salaryAmount / monthlyHours).toFixed(2);
  };

  return (
    <div style={{ padding: '0 8px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>
          {user.firstName} {user.lastName}
        </Title>
        <Text type="secondary">{user.email}</Text>
        <div style={{ marginTop: 8 }}>
          {user.isActive ? (
            <Tag color="green">Active</Tag>
          ) : (
            <Tag color="red">Inactive</Tag>
          )}
          {user.canLogin && <Tag color="blue">Can Login</Tag>}
          {user.isEmployee && <Tag color="purple">Employee</Tag>}
          {user.isSystemDefine && <Tag color="orange">System Defined</Tag>}
        </div>
      </div>

      {/* Personal Information */}
      <Card size="small" title="Personal Information" style={{ marginBottom: 16 }}>
        <Descriptions column={1} size="small">
          <Descriptions.Item label="Full Name">
            {user.firstName} {user.lastName}
          </Descriptions.Item>
          <Descriptions.Item label="Email">
            {user.email}
          </Descriptions.Item>
          <Descriptions.Item label="Date of Birth">
            {formatDate(user.dateOfBirth)}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Contact Information */}
      <Card size="small" title="Contact Information" style={{ marginBottom: 16 }}>
        <Descriptions column={1} size="small">
          <Descriptions.Item label="Personal Phone">
            {user.contactPersonal || 'Not provided'}
          </Descriptions.Item>
          <Descriptions.Item label="Home Phone">
            {user.contactHome || 'Not provided'}
          </Descriptions.Item>
          <Descriptions.Item label="Address">
            {user.address || 'Not provided'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Role Information */}
      <Card size="small" title="Role & Permissions" style={{ marginBottom: 16 }}>
        <Descriptions column={1} size="small">
          <Descriptions.Item label="Role">
            {user.role ? (
              <div>
                <Tag color="blue">{user.role.name}</Tag>
                <Text type="secondary">({user.role.roleType})</Text>
              </div>
            ) : (
              'No role assigned'
            )}
          </Descriptions.Item>
          {user.role?.permissions && (
            <Descriptions.Item label="Permissions">
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {Object.entries(user.role.permissions).map(([module, actions]) => (
                  <div key={module} style={{ marginBottom: 8 }}>
                    <Text strong>{module.charAt(0).toUpperCase() + module.slice(1)}: </Text>
                    {Object.entries(actions)
                      .filter(([action, allowed]) => allowed)
                      .map(([action]) => (
                        <Tag key={action} size="small" color="green">
                          {action}
                        </Tag>
                      ))
                    }
                  </div>
                ))}
              </div>
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      {/* Work Types */}
      <Card size="small" title="Work Types" style={{ marginBottom: 16 }}>
        <Descriptions column={1} size="small">
          <Descriptions.Item label="Assigned Work Types">
            {user.workTypes && user.workTypes.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {user.workTypes.map((workType) => (
                  <Tag key={workType.id} color="blue">
                    {workType.name}
                  </Tag>
                ))}
              </div>
            ) : (
              <Text type="secondary">No work types assigned</Text>
            )}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Employment Information */}
      <Card size="small" title="Employment Information" style={{ marginBottom: 16 }}>
        <Descriptions column={1} size="small">
          <Descriptions.Item label="Joining Date">
            {formatDate(user.joiningDate)}
          </Descriptions.Item>
          <Descriptions.Item label="Employee Status">
            {user.isEmployee ? (
              <Tag color="green">Employee</Tag>
            ) : (
              <Tag color="default">Non-Employee</Tag>
            )}
          </Descriptions.Item>
          {user.isEmployee && (
            <>
              <Descriptions.Item label="Pay Type">
                <Tag color={user.payType === 'fixed' ? 'blue' : 'green'}>
                  {user.payType === 'fixed' ? 'Fixed Salary' : 'Hourly Rate'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Compensation">
                {formatPayType(user.payType, user.salaryAmount, user.salaryType, user.hourlyRate)}
              </Descriptions.Item>
              <Descriptions.Item label="Monthly Hours">
                {user.monthlyHours ? `${Number(user.monthlyHours).toFixed(2)} hours` : 'Not set'}
              </Descriptions.Item>
              {user.payType === 'fixed' && user.salaryAmount && user.monthlyHours && (
                <Descriptions.Item label="Equivalent Hourly Rate">
                  ₹{calculateHourlyRate(user.salaryAmount, user.monthlyHours)} per hour
                </Descriptions.Item>
              )}
            </>
          )}
        </Descriptions>
      </Card>

      {/* System Information */}
      <Card size="small" title="System Information" style={{ marginBottom: 16 }}>
        <Descriptions column={1} size="small">
          <Descriptions.Item label="Can Login">
            {user.canLogin ? (
              <Tag color="green">Yes</Tag>
            ) : (
              <Tag color="red">No</Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Password Set">
            {user.hasSetInitialPassword ? (
              <Tag color="green">Yes</Tag>
            ) : (
              <Tag color="orange">Pending</Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Status">
            {user.isActive ? (
              <Tag color="green">Active</Tag>
            ) : (
              <Tag color="red">Inactive</Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Account Type">
            {user.isSystemDefine ? 'System Account' : 'Regular Account'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Audit Information */}
      <Card size="small" title="Audit Information">
        <Descriptions column={1} size="small">
          <Descriptions.Item label="Created">
            {formatDate(user.createdAt)}
          </Descriptions.Item>
          <Descriptions.Item label="Last Updated">
            {formatDate(user.updatedAt)}
          </Descriptions.Item>
          {user.deletedAt && (
            <Descriptions.Item label="Deleted">
              {formatDate(user.deletedAt)}
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>
    </div>
  );
};

export default UserDetail;