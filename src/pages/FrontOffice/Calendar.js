import React from 'react';
import { Card, Typography } from 'antd';

const { Title } = Typography;

const Calendar = () => {
  return (
    <Card className="card-shadow">
      <Title level={3}>Calendar</Title>
      <p>View project deadlines, task due dates, and schedule meetings with team members.</p>
      <p className="text-gray-600">This page will contain a calendar view with project milestones and deadlines.</p>
    </Card>
  );
};

export default Calendar;