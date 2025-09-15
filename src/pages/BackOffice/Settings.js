import React from 'react';
import { Card, Typography } from 'antd';

const { Title } = Typography;

const Settings = () => {
  return (
    <Card className="card-shadow">
      <Title level={3}>System Settings</Title>
      <p>Configure system settings, integrations, and workflow preferences.</p>
      <p className="text-gray-600">This page will contain system configuration options and integration settings.</p>
    </Card>
  );
};

export default Settings;