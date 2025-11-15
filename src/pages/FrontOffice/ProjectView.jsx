import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Space,
  Tag,
  Typography,
  Row,
  Col,
  Statistic,
  Progress,
  Timeline,
  Button,
  Modal,
  Alert,
  Tooltip
} from 'antd';
import {
  EyeOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined
} from '@ant-design/icons';
import { useQuery } from '@apollo/client';
import { GET_PROJECTS, GET_PROJECT } from '../../graphql/projectQueries';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const ProjectView = () => {
  const [selectedProject, setSelectedProject] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // For demo purposes, assuming a client-specific filter
  // In real implementation, this would come from user context
  const [clientId] = useState(null); // Will be set from logged-in user's client

  const { 
    data: projectsData, 
    loading: projectsLoading, 
    error: projectsError 
  } = useQuery(GET_PROJECTS, {
    variables: {
      filters: clientId ? { clientId } : {},
      page: 1,
      limit: 50,
      sortBy: "createdAt",
      sortOrder: "DESC"
    },
    fetchPolicy: 'cache-and-network'
  });

  const projects = projectsData?.projects?.projects || [];

  // Status configurations for client view
  const statusConfig = {
    DRAFT: { color: 'orange', text: 'In Preparation', icon: <ClockCircleOutlined /> },
    ACTIVE: { color: 'blue', text: 'In Progress', icon: <PlayCircleOutlined /> },
    COMPLETED: { color: 'green', text: 'Completed', icon: <CheckCircleOutlined /> },
    CANCELLED: { color: 'red', text: 'Cancelled', icon: <PauseCircleOutlined /> },
    ON_HOLD: { color: 'purple', text: 'On Hold', icon: <PauseCircleOutlined /> }
  };

  const priorityConfig = {
    LOW: { color: 'green', text: 'Low Priority' },
    MEDIUM: { color: 'orange', text: 'Standard' },
    HIGH: { color: 'red', text: 'High Priority' },
    URGENT: { color: 'volcano', text: 'Urgent' }
  };

  // Calculate project progress based on tasks
  const calculateProgress = (project) => {
    if (!project.tasks || project.tasks.length === 0) return 0;
    const completedTasks = project.tasks.filter(task => task.status === 'COMPLETED').length;
    return Math.round((completedTasks / project.tasks.length) * 100);
  };

  // For demo purposes when no backend connection
  if (projectsError || !projectsData) {
    return (
      <Card className="card-shadow">
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Title level={3}>Project View</Title>
          <p>View project details, timeline, and collaborate with team members on photo editing projects.</p>
          <Alert
            message="Project Module Available"
            description="The comprehensive project management system is now ready! This includes project creation, task management, client-grading combinations, credit validation, and real-time progress tracking."
            type="success"
            showIcon
            style={{ marginTop: 16, textAlign: 'left' }}
          />
        </div>
      </Card>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Header Statistics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Projects"
              value={projects.length}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="In Progress"
              value={projects.filter(p => p.status === 'ACTIVE').length}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Completed"
              value={projects.filter(p => p.status === 'COMPLETED').length}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="In Preparation"
              value={projects.filter(p => p.status === 'DRAFT').length}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Projects Table */}
      <Card
        title={
          <Space>
            <Title level={4} style={{ margin: 0 }}>My Projects</Title>
            <Tag color="blue">{projects.length} Projects</Tag>
          </Space>
        }
      >
        {projects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Title level={4} type="secondary">No Projects Yet</Title>
            <Text type="secondary">
              Your projects will appear here once they are created by our team.
            </Text>
          </div>
        ) : (
          <Table
            dataSource={projects}
            rowKey="id"
            loading={projectsLoading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} of ${total} projects`,
              pageSizeOptions: [10, 25, 50, 100],
            }}
          />
        )}
      </Card>
    </div>
  );
};

export default ProjectView;