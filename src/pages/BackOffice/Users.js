import React from 'react';
import { Card, Typography } from 'antd';

const { Title } = Typography;

const Users = () => {
  return (
    <Card className="card-shadow">
      <Title level={3}>User Management</Title>
      <p>Manage user accounts, roles, and permissions for the workflow system.</p>
      <p className="text-gray-600">This page will contain user creation, role assignment, and permission management features.</p>
    </Card>
  );
};

export default Users;