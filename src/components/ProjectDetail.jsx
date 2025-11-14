import React, { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { Card, Row, Col, Descriptions, Divider, Timeline, Empty, Typography, Progress } from 'antd';
import dayjs from 'dayjs';
import { GET_TASKS } from '../gql/tasks';
import { GET_AVAILABLE_USERS } from '../graphql/projectQueries';
import TaskCard from './TaskCard';

// Updated to use standardized TaskManager component for consistent task display across the app
// This replaces the previous basic table implementation with the same component used in project creation

const { Text } = Typography;

const ProjectDetail = ({ project, onClose }) => {
  const [tasks, setTasks] = useState(project?.tasks || []);
  const [availableUsers, setAvailableUsers] = useState([]);

  // Fetch tasks if not present in project
  const { data: tasksData, loading: tasksLoading } = useQuery(GET_TASKS, {
    variables: {
      filters: project ? { projectId: project.id } : {},
      page: 1,
      limit: 200,
      sortBy: 'createdAt',
      sortOrder: 'DESC'
    },
    // Skip fetching tasks if project is not provided, if tasks are already included,
    // or if the project is in Draft or Requested status (tasks should remain hidden until approved/started)
    skip: !project || (project.tasks && project.tasks.length > 0) || ['DRAFT', 'REQUESTED'].includes((project.status || '').toString().toUpperCase()),
    fetchPolicy: 'cache-and-network'
  });

  // Fetch available users for TaskManager
  const { data: usersData } = useQuery(GET_AVAILABLE_USERS, {
    fetchPolicy: 'cache-first'
  });

  useEffect(() => {
    if (tasksData?.tasks?.tasks) {
      console.log('ProjectDetail received tasks data:', tasksData.tasks.tasks);
      setTasks(tasksData.tasks.tasks);
    }
  }, [tasksData]);

  useEffect(() => {
    if (usersData?.availableUsers) {
      setAvailableUsers(usersData.availableUsers);
    }
  }, [usersData]);

  // Handle task updates from TaskManager
  const handleTaskUpdate = (updatedTask) => {
    // Update the local tasks state with the updated task
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === updatedTask.id ? { ...task, ...updatedTask } : task
      )
    );
  };

  const completedTasks = tasks.filter(t => (t.status || '').toString().toUpperCase() === 'COMPLETED').length;
  const totalTasks = tasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div>
      <Row gutter={16}>
        <Col span={16}>
          <Card title={project.projectCode || project.projectNumber || 'Project'} style={{ marginBottom: 16 }}>
            <Descriptions column={1}>
              <Descriptions.Item label="Project Code"><Text code>{project.projectCode || project.projectNumber || project.id}</Text></Descriptions.Item>
              <Descriptions.Item label="Client">{project.client ? project.client.clientCode : 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Work Type">{project.workType?.name || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Grading">{project.grading?.name || 'N/A'} {project.grading?.defaultRate ? `(₹${project.grading.defaultRate})` : ''}</Descriptions.Item>
              <Descriptions.Item label="Budget">{project.estimatedCost ? `₹${project.estimatedCost.toLocaleString()}` : 'Not set'}</Descriptions.Item>
              <Descriptions.Item label="Priority">{project.priority || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Deadline">{project.deadlineDate ? dayjs(project.deadlineDate).format('YYYY-MM-DD') : 'Not set'}</Descriptions.Item>
            </Descriptions>

            {project.description && (
              <div style={{ marginTop: 12 }}>
                <Divider />
                <Text strong>Description:</Text>
                <div style={{ marginTop: 8 }}>{project.description}</div>
              </div>
            )}
          </Card>

          <Card title={`Tasks (${totalTasks})`} loading={tasksLoading}>
            {/* If project is a draft or pending approval, do not show tasks and explain why */}
            {['DRAFT', 'REQUESTED'].includes((project.status || '').toString().toUpperCase()) ? (
              <Empty description={<span>Project is in {project.status === 'REQUESTED' ? 'Pending Approval' : 'Draft'} — tasks are hidden until the project is {project.status === 'REQUESTED' ? 'approved' : 'started'}.</span>} />
            ) : (
              totalTasks > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      availableUsers={availableUsers}
                      workType={project.workType}
                      grading={project.grading}
                      readOnly={false}
                      layout="list"
                      onTaskUpdate={(updatedTask) => {
                        console.log('Task updated in ProjectDetail:', updatedTask);
                        handleTaskUpdate(updatedTask);
                      }}
                    />
                  ))}
                </div>
              ) : (
                <Empty description="No tasks for this project" />
              )
            )}
          </Card>
        </Col>

        <Col span={8}>
          <Card title="Progress" style={{ marginBottom: 16 }}>
            <div style={{ textAlign: 'center' }}>
              <Progress type="circle" percent={progressPercent} format={() => `${completedTasks}/${totalTasks}`} />
            </div>
            <div style={{ marginTop: 12 }}>
              <Text>Completed: {completedTasks}</Text>
            </div>
          </Card>

          <Card title="Timeline">
            <Timeline items={[
              { children: `Created At: ${project.createdAt ? dayjs(project.createdAt).format('MMM DD, YYYY') : 'N/A'}`, color: 'blue' },
              project.deadlineDate && { children: `Deadline: ${dayjs(project.deadlineDate).format('MMM DD, YYYY')}`, color: dayjs(project.deadlineDate).isAfter(dayjs()) ? 'orange' : 'red' }
            ].filter(Boolean)} />
          </Card>
        </Col>
      </Row>


    </div>
  );
};

export default ProjectDetail;
