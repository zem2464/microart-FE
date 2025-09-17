import React from "react";
import { Row, Col, Card, Statistic, Typography, List, Progress } from "antd";
import {
  ProjectOutlined,
  UserOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";

const { Title } = Typography;

const Dashboard = () => {
  const stats = [
    {
      title: "Total Projects",
      value: 12,
      icon: <ProjectOutlined className="text-blue-500" />,
      color: "blue",
    },
    {
      title: "Active Users",
      value: 24,
      icon: <UserOutlined className="text-green-500" />,
      color: "green",
    },
    {
      title: "Completed Tasks",
      value: 156,
      icon: <CheckCircleOutlined className="text-purple-500" />,
      color: "purple",
    },
    {
      title: "Pending Tasks",
      value: 23,
      icon: <ClockCircleOutlined className="text-orange-500" />,
      color: "orange",
    },
  ];

  const recentProjects = [
    { name: "Wedding Photography Edit", progress: 85, status: "In Progress" },
    { name: "Corporate Headshots", progress: 100, status: "Completed" },
    { name: "Product Catalog Shoot", progress: 45, status: "In Progress" },
    { name: "Fashion Portfolio", progress: 30, status: "Planning" },
  ];

  return (
    <div>
      <Row gutter={[16, 16]} className="mb-6">
        {stats.map((stat, index) => (
          <Col xs={24} sm={12} lg={6} key={index}>
            <Card>
              <Statistic
                title={stat.title}
                value={stat.value}
                prefix={stat.icon}
                valueStyle={{ color: `var(--${stat.color}-500)` }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Recent Projects" className="card-shadow">
            <List
              dataSource={recentProjects}
              renderItem={(project) => (
                <List.Item>
                  <div className="w-full">
                    <div className="flex justify-between items-center mb-2">
                      <Title level={5} className="mb-0">
                        {project.name}
                      </Title>
                      <span
                        className={`status-badge ${project.status
                          .toLowerCase()
                          .replace(" ", "-")}`}
                      >
                        {project.status}
                      </span>
                    </div>
                    <Progress percent={project.progress} size="small" />
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="System Overview" className="card-shadow">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span>Server Performance</span>
                  <span>92%</span>
                </div>
                <Progress percent={92} status="active" />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span>Storage Used</span>
                  <span>68%</span>
                </div>
                <Progress percent={68} />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span>Active Sessions</span>
                  <span>24/50</span>
                </div>
                <Progress percent={48} />
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
