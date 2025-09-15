import React from 'react';
import { Card, Typography } from 'antd';

const { Title } = Typography;

const Projects = () => {
  return (
    <Card className="card-shadow">
      <Title level={3}>Projects Management</Title>
      <p>Manage all photo editing projects, assign tasks, track progress, and monitor deadlines.</p>
      <p className="text-gray-600">This page will contain project creation, editing, and management features.</p>
    </Card>
  );
};

export default Projects;