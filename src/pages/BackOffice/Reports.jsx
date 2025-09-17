import React from 'react';
import { Card, Typography } from 'antd';

const { Title } = Typography;

const Reports = () => {
  return (
    <Card className="card-shadow">
      <Title level={3}>Reports & Analytics</Title>
      <p>View detailed reports on project performance, team productivity, and business metrics.</p>
      <p className="text-gray-600">This page will contain charts, graphs, and detailed analytics for business insights.</p>
    </Card>
  );
};

export default Reports;