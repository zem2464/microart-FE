// Example usage of the enhanced TaskCard with real-time functionality
import React from 'react';
import { useQuery } from '@apollo/client';
import { Card, Row, Col, Spin, Alert } from 'antd';
import TaskCard from './TaskCard';
import { GET_TASKS } from '../gql/tasks';
import { GET_USERS } from '../gql/users'; // Assuming this exists

const TaskDashboard = () => {
  // Fetch tasks
  const { data: tasksData, loading: tasksLoading, error: tasksError, refetch } = useQuery(GET_TASKS, {
    variables: {
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'DESC'
    },
    fetchPolicy: 'cache-and-network'
  });

  // Fetch available users for assignment
  const { data: usersData, loading: usersLoading } = useQuery(GET_USERS);

  // Handle task updates
  const handleTaskUpdate = (updatedTask) => {
    console.log('Task updated:', updatedTask);
    // The cache will automatically update thanks to Apollo Client's normalization
    // You can perform additional actions here like analytics tracking
  };

  if (tasksLoading || usersLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (tasksError) {
    return (
      <Alert
        message="Error loading tasks"
        description={tasksError.message}
        type="error"
        showIcon
      />
    );
  }

  const tasks = tasksData?.tasks?.tasks || [];
  const users = usersData?.users || [];

  return (
    <div style={{ padding: '24px' }}>
      <h1>Task Dashboard</h1>
      <p>Real-time collaborative task management with live comments and updates</p>
      
      <Row gutter={[16, 16]}>
        {tasks.map((task) => (
          <Col xs={24} sm={12} md={8} lg={6} key={task.id}>
            <TaskCard
              task={task}
              availableUsers={users}
              onTaskUpdate={handleTaskUpdate}
              layout="grid"
              // Real-time subscriptions are automatically enabled
              // The TaskCard will show live updates and comments
            />
          </Col>
        ))}
      </Row>

      {tasks.length === 0 && (
        <Card style={{ textAlign: 'center', marginTop: '50px' }}>
          <p>No tasks found</p>
        </Card>
      )}
    </div>
  );
};

export default TaskDashboard;