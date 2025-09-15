import React from 'react';
import { Card, Typography } from 'antd';

const { Title } = Typography;

const ProjectView = () => {
  return (
    <Card className="card-shadow">
      <Title level={3}>Project View</Title>
      <p>View project details, timeline, and collaborate with team members on photo editing projects.</p>
      <p className="text-gray-600">This page will show detailed project information, task assignments, and progress tracking.</p>
    </Card>
  );
};

export default ProjectView;