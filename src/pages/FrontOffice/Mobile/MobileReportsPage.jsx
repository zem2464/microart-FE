import React, { useState } from 'react';
import { Card, List, Tag, Typography, Empty, Spin, Button, Drawer, Row, Col, Statistic, Divider } from 'antd';
import {
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
  FileTextOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { useQuery } from '@apollo/client';
import { GET_PROJECT_STATS } from '../../../graphql/projectQueries';
import { useReactiveVar } from '@apollo/client';
import { userCacheVar } from '../../../cache/userCacheVar';
import dayjs from 'dayjs';
import './MobileReportsPage.css';

const { Text } = Typography;

/**
 * Mobile-optimized Reports page (Read-only)
 * Shows available reports in a mobile-friendly format
 */
const MobileReportsPage = () => {
  const [selectedReport, setSelectedReport] = useState(null);
  const user = useReactiveVar(userCacheVar);

  const { data: statsData, loading: statsLoading } = useQuery(GET_PROJECT_STATS, {
    fetchPolicy: 'cache-and-network',
  });

  const stats = statsData?.projectStats || {};

  // Available reports
  const reports = [
    {
      id: 'projects',
      title: 'Projects Report',
      description: 'Overview of all projects',
      icon: <BarChartOutlined />,
      type: 'summary',
      content: {
        metrics: [
          { label: 'Total Projects', value: stats.totalProjects || 0 },
          { label: 'Active Projects', value: stats.activeProjects || 0 },
          { label: 'Completed Projects', value: stats.completedProjects || 0 },
          { label: 'On Hold', value: stats.onHoldProjects || 0 },
        ],
      },
    },
    {
      id: 'tasks',
      title: 'Tasks Report',
      description: 'Task completion overview',
      icon: <LineChartOutlined />,
      type: 'summary',
      content: {
        metrics: [
          { label: 'Total Tasks', value: stats.totalTasks || 0 },
          { label: 'Completed Tasks', value: stats.completedTasks || 0 },
          { label: 'Pending Tasks', value: (stats.totalTasks || 0) - (stats.completedTasks || 0) },
          { label: 'Completion Rate', value: stats.totalTasks ? Math.round(((stats.completedTasks || 0) / stats.totalTasks) * 100) + '%' : 'N/A' },
        ],
      },
    },
    {
      id: 'revenue',
      title: 'Revenue Report',
      description: 'Financial overview',
      icon: <PieChartOutlined />,
      type: 'financial',
      content: {
        metrics: [
          { label: 'Total Revenue', value: '₹' + (stats.totalRevenue ? parseFloat(stats.totalRevenue).toFixed(2) : '0.00') },
          { label: 'Outstanding Amount', value: '₹' + (stats.outstandingAmount ? parseFloat(stats.outstandingAmount).toFixed(2) : '0.00') },
          { label: 'Paid Amount', value: '₹' + (stats.paidAmount ? parseFloat(stats.paidAmount).toFixed(2) : '0.00') },
        ],
      },
    },
    {
      id: 'timeline',
      title: 'Timeline Report',
      description: 'Project timeline analysis',
      icon: <FileTextOutlined />,
      type: 'timeline',
      content: {
        note: 'Projects are tracked by creation date. Use detailed reports for more information.',
      },
    },
  ];

  if (statsLoading) {
    return <div className="mobile-reports-loading"><Spin size="large" /></div>;
  }

  return (
    <div className="mobile-reports-container">
      {!selectedReport ? (
        <>
          {/* Title */}
          <div className="mobile-reports-header">
            <div className="mobile-reports-title">Reports</div>
          </div>

          {/* Reports grid */}
          {reports.length === 0 ? (
            <Empty
              description="No reports available"
              style={{ marginTop: '40px' }}
            />
          ) : (
            <div className="mobile-reports-list">
              {reports.map((report) => (
                <Card
                  key={report.id}
                  className="mobile-report-card"
                  onClick={() => setSelectedReport(report)}
                >
                  <div className="mobile-report-card-content">
                    <div className="mobile-report-icon">
                      {report.icon}
                    </div>
                    <div className="mobile-report-info">
                      <div className="mobile-report-name">
                        {report.title}
                      </div>
                      <div className="mobile-report-description">
                        {report.description}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : (
        // Report detail view
        <div className="mobile-report-detail">
          <div className="mobile-report-detail-header">
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => setSelectedReport(null)}
              className="mobile-report-detail-back"
            />
            <div className="mobile-report-detail-title">
              {selectedReport.title}
            </div>
          </div>

          <div className="mobile-report-detail-content">
            {/* Report description */}
            <Card size="small" className="mobile-detail-card">
              <Text type="secondary">{selectedReport.description}</Text>
            </Card>

            {/* Metrics */}
            {selectedReport.content?.metrics && (
              <Card size="small" className="mobile-detail-card" title="Key Metrics">
                <div className="metrics-grid">
                  {selectedReport.content.metrics.map((metric, idx) => (
                    <div key={idx} className="metric-item">
                      <div className="metric-label">{metric.label}</div>
                      <div className="metric-value">{metric.value}</div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Generated at */}
            <Card size="small" className="mobile-detail-card">
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Generated: {dayjs().format('DD MMM YYYY, HH:mm')}
              </Text>
            </Card>

            {/* Additional notes */}
            {selectedReport.content?.note && (
              <Card size="small" className="mobile-detail-card">
                <Text type="secondary">{selectedReport.content.note}</Text>
              </Card>
            )}

            {/* Info message */}
            <div className="mobile-report-info-message">
              <Text type="secondary" style={{ fontSize: '12px' }}>
                For detailed reports and exports, please use the web version of the application.
              </Text>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileReportsPage;
