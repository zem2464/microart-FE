import React, { useState } from 'react';
import { Card, List, Tag, Space, Typography, Progress, Empty, Spin, Input, Button, Drawer, Row, Col, Statistic, Divider } from 'antd';
import {
  EyeOutlined,
  SearchOutlined,
  ProjectOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { useQuery } from '@apollo/client';
import { GET_PROJECTS, GET_PROJECT_STATS } from '../../../graphql/projectQueries';
import { useReactiveVar } from '@apollo/client';
import { userCacheVar } from '../../../cache/userCacheVar';
import dayjs from 'dayjs';
import './MobileProjectsPage.css';

const { Text } = Typography;

/**
 * Mobile-optimized Projects page (Read-only)
 * Shows list of projects with basic details
 * No editing/deletion capabilities
 */
const MobileProjectsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);
  const [filterStatus, setFilterStatus] = useState('active'); // 'active', 'completed', 'all'

  const user = useReactiveVar(userCacheVar);

  const { data, loading } = useQuery(GET_PROJECTS, {
    variables: {
      filters: {},
      page: 1,
      limit: 1000,
      sortBy: 'createdAt',
      sortOrder: 'DESC',
    },
    fetchPolicy: 'cache-and-network',
  });

  const { data: statsData } = useQuery(GET_PROJECT_STATS, {
    fetchPolicy: 'cache-and-network',
  });

  const projects = data?.projects?.projects || [];
  const stats = statsData?.projectStats || {};

  // Filter and search projects
  const filteredProjects = projects.filter(project => {
    // Filter by status
    if (filterStatus === 'active' && project.status !== 'active') return false;
    if (filterStatus === 'completed' && project.status !== 'completed') return false;

    // Filter by search term
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      project.projectCode.toLowerCase().includes(searchLower) ||
      project.projectName.toLowerCase().includes(searchLower) ||
      project.client?.displayName?.toLowerCase().includes(searchLower)
    );
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'processing';
      case 'completed':
        return 'success';
      case 'on-hold':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getProgressPercentage = (project) => {
    if (!project.totalTaskQty) return 0;
    const completed = project.completedTaskQty || 0;
    return Math.round((completed / project.totalTaskQty) * 100);
  };

  if (loading) {
    return <div className="mobile-projects-loading"><Spin size="large" /></div>;
  }

  return (
    <div className="mobile-projects-container">
      {!selectedProject ? (
        <>
          {/* Stats Summary */}
          <div className="mobile-projects-stats">
            <div className="mobile-stat-card">
              <div className="mobile-stat-value">{stats.totalProjects || 0}</div>
              <div className="mobile-stat-label">Total</div>
            </div>
            <div className="mobile-stat-card">
              <div className="mobile-stat-value">{stats.activeProjects || 0}</div>
              <div className="mobile-stat-label">Active</div>
            </div>
            <div className="mobile-stat-card">
              <div className="mobile-stat-value">{stats.completedProjects || 0}</div>
              <div className="mobile-stat-label">Completed</div>
            </div>
          </div>

          {/* Search and filters */}
          <div className="mobile-projects-search">
            <Input
              placeholder="Search projects..."
              prefix={<SearchOutlined />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mobile-projects-search-input"
            />
          </div>

          {/* Filter tabs */}
          <div className="mobile-projects-tabs">
            <Button
              type={filterStatus === 'active' ? 'primary' : 'default'}
              onClick={() => setFilterStatus('active')}
              className="mobile-projects-tab-btn"
            >
              Active
            </Button>
            <Button
              type={filterStatus === 'completed' ? 'primary' : 'default'}
              onClick={() => setFilterStatus('completed')}
              className="mobile-projects-tab-btn"
            >
              Completed
            </Button>
            <Button
              type={filterStatus === 'all' ? 'primary' : 'default'}
              onClick={() => setFilterStatus('all')}
              className="mobile-projects-tab-btn"
            >
              All
            </Button>
          </div>

          {/* Projects list */}
          {filteredProjects.length === 0 ? (
            <Empty
              description="No projects found"
              style={{ marginTop: '40px' }}
            />
          ) : (
            <List
              dataSource={filteredProjects}
              renderItem={(project) => (
                <div
                  key={project.id}
                  className="mobile-project-item"
                  onClick={() => setSelectedProject(project)}
                >
                  <div className="mobile-project-header">
                    <div className="mobile-project-code">
                      {project.projectCode}
                    </div>
                    <Tag color={getStatusColor(project.status)}>
                      {project.status?.toUpperCase()}
                    </Tag>
                  </div>
                  <div className="mobile-project-name">
                    {project.projectName}
                  </div>
                  <div className="mobile-project-client">
                    {project.client?.displayName || 'N/A'}
                  </div>
                  <div className="mobile-project-progress">
                    <Progress
                      percent={getProgressPercentage(project)}
                      size="small"
                      status={getProgressPercentage(project) === 100 ? 'success' : 'active'}
                    />
                    <Text type="secondary" className="mobile-project-progress-text">
                      {project.completedTaskQty || 0}/{project.totalTaskQty || 0}
                    </Text>
                  </div>
                  <div className="mobile-project-dates">
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {dayjs(project.createdAt).format('DD MMM YYYY')}
                    </Text>
                  </div>
                </div>
              )}
            />
          )}
        </>
      ) : (
        // Project detail view
        <div className="mobile-project-detail">
          <div className="mobile-project-detail-header">
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => setSelectedProject(null)}
              className="mobile-project-detail-back"
            />
            <div className="mobile-project-detail-title">
              {selectedProject.projectCode}
            </div>
          </div>

          <div className="mobile-project-detail-content">
            {/* Basic info */}
            <Card size="small" className="mobile-detail-card">
              <div className="detail-section">
                <Text strong>Project Name</Text>
                <div className="detail-value">{selectedProject.projectName}</div>
              </div>
              <Divider style={{ margin: '12px 0' }} />
              <div className="detail-section">
                <Text strong>Client</Text>
                <div className="detail-value">{selectedProject.client?.displayName || 'N/A'}</div>
              </div>
              <Divider style={{ margin: '12px 0' }} />
              <div className="detail-section">
                <Text strong>Status</Text>
                <div className="detail-value">
                  <Tag color={getStatusColor(selectedProject.status)}>
                    {selectedProject.status?.toUpperCase()}
                  </Tag>
                </div>
              </div>
            </Card>

            {/* Progress */}
            <Card size="small" className="mobile-detail-card" title="Progress">
              <Progress
                percent={getProgressPercentage(selectedProject)}
                status={getProgressPercentage(selectedProject) === 100 ? 'success' : 'active'}
              />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {selectedProject.completedTaskQty || 0} of {selectedProject.totalTaskQty || 0} tasks completed
              </Text>
            </Card>

            {/* Dates */}
            <Card size="small" className="mobile-detail-card" title="Dates">
              <div className="detail-section">
                <Text type="secondary">Created</Text>
                <div className="detail-value">
                  {dayjs(selectedProject.createdAt).format('DD MMM YYYY')}
                </div>
              </div>
              {selectedProject.completedAt && (
                <>
                  <Divider style={{ margin: '12px 0' }} />
                  <div className="detail-section">
                    <Text type="secondary">Completed</Text>
                    <div className="detail-value">
                      {dayjs(selectedProject.completedAt).format('DD MMM YYYY')}
                    </div>
                  </div>
                </>
              )}
            </Card>

            {/* Description */}
            {selectedProject.description && (
              <Card size="small" className="mobile-detail-card" title="Description">
                <div className="detail-section">
                  <div className="detail-value">{selectedProject.description}</div>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileProjectsPage;
