import React from "react";
import { Row, Col, Card, Statistic, Typography, List, Spin, Tag, Progress } from "antd";
import {
  ProjectOutlined,
  UserOutlined,
  DollarOutlined,
  TeamOutlined,
  RiseOutlined,
  FallOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PauseCircleOutlined,
  DeliveredProcedureOutlined,
} from "@ant-design/icons";
import { useQuery } from "@apollo/client";
import { GET_DASHBOARD_STATS } from "../../gql/dashboard";
import dayjs from "dayjs";

const { Title, Text } = Typography;

const Dashboard = () => {
  const { data, loading, error } = useQuery(GET_DASHBOARD_STATS, {
    fetchPolicy: "cache-and-network",
  });

  if (loading) return <Spin size="large" className="flex justify-center mt-20" />;
  if (error) return <Card>Error loading dashboard: {error.message}</Card>;

  const stats = data?.dashboardStats;

  const projectStats = [
    {
      title: "Total Projects",
      value: stats?.totalProjects || 0,
      icon: <ProjectOutlined />,
      color: "#1890ff",
    },
    {
      title: "Projects This Month",
      value: stats?.projectsThisMonth || 0,
      icon: <RiseOutlined />,
      color: "#52c41a",
    },
    {
      title: "New Client Projects",
      value: stats?.newClientProjects || 0,
      icon: <TeamOutlined />,
      color: "#722ed1",
    },
    {
      title: "Recurring Clients",
      value: stats?.recurringClientProjects || 0,
      icon: <TeamOutlined />,
      color: "#13c2c2",
    },
  ];

  const clientStats = [
    {
      title: "Total Clients",
      value: stats?.totalClients || 0,
      icon: <TeamOutlined />,
      color: "#1890ff",
    },
    {
      title: "New This Month",
      value: stats?.newClientsThisMonth || 0,
      icon: <RiseOutlined />,
      color: "#52c41a",
    },
    {
      title: "Active Clients",
      value: stats?.activeClients || 0,
      icon: <CheckCircleOutlined />,
      color: "#722ed1",
    },
  ];

  const userStats = [
    {
      title: "Total Users",
      value: stats?.totalUsers || 0,
      icon: <UserOutlined />,
      color: "#1890ff",
    },
    {
      title: "Active Users",
      value: stats?.activeUsers || 0,
      icon: <CheckCircleOutlined />,
      color: "#52c41a",
    },
  ];

  const financialStats = [
    {
      title: "Payments Received",
      value: stats?.paymentsReceivedThisMonth || 0,
      prefix: "₹",
      icon: <DollarOutlined />,
      color: "#52c41a",
      precision: 2,
    },
    {
      title: "Total Expenses",
      value: stats?.totalExpenseThisMonth || 0,
      prefix: "₹",
      icon: <FallOutlined />,
      color: "#ff4d4f",
      precision: 2,
    },
    {
      title: "Total Income",
      value: stats?.totalIncomeThisMonth || 0,
      prefix: "₹",
      icon: <RiseOutlined />,
      color: "#1890ff",
      precision: 2,
    },
  ];

  const projectStatusStats = [
    {
      title: "Active",
      value: stats?.activeProjects || 0,
      icon: <CheckCircleOutlined />,
      color: "#52c41a",
    },
    {
      title: "Completed",
      value: stats?.completedProjects || 0,
      icon: <CheckCircleOutlined />,
      color: "#1890ff",
    },
    {
      title: "On Hold",
      value: stats?.onHoldProjects || 0,
      icon: <PauseCircleOutlined />,
      color: "#faad14",
    },
    {
      title: "Delivered",
      value: stats?.deliveredProjects || 0,
      icon: <DeliveredProcedureOutlined />,
      color: "#722ed1",
    },
  ];

  const statusColorMap = {
    active: "green",
    in_progress: "blue",
    completed: "purple",
    delivered: "cyan",
    on_hold: "orange",
    draft: "default",
  };

  return (
    <div>
      <Title level={2}>Dashboard Overview</Title>

      {/* Projects Stats */}
      <Title level={4} className="mt-6 mb-3">Projects</Title>
      <Row gutter={[16, 16]} className="mb-6">
        {projectStats.map((stat, index) => (
          <Col xs={24} sm={12} lg={6} key={index}>
            <Card>
              <Statistic
                title={stat.title}
                value={stat.value}
                prefix={stat.icon}
                valueStyle={{ color: stat.color }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Project Status Breakdown */}
      <Title level={4} className="mb-3">Project Status</Title>
      <Row gutter={[16, 16]} className="mb-6">
        {projectStatusStats.map((stat, index) => (
          <Col xs={24} sm={12} lg={6} key={index}>
            <Card>
              <Statistic
                title={stat.title}
                value={stat.value}
                prefix={stat.icon}
                valueStyle={{ color: stat.color }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Financial Stats */}
      <Title level={4} className="mb-3">Financial (This Month)</Title>
      <Row gutter={[16, 16]} className="mb-6">
        {financialStats.map((stat, index) => (
          <Col xs={24} sm={12} lg={8} key={index}>
            <Card>
              <Statistic
                title={stat.title}
                value={stat.value}
                prefix={stat.prefix}
                precision={stat.precision}
                valueStyle={{ color: stat.color }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Clients & Users */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} lg={12}>
          <Card title="Clients" className="h-full">
            <Row gutter={[16, 16]}>
              {clientStats.map((stat, index) => (
                <Col span={8} key={index}>
                  <Statistic
                    title={stat.title}
                    value={stat.value}
                    prefix={stat.icon}
                    valueStyle={{ color: stat.color, fontSize: 20 }}
                  />
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Users" className="h-full">
            <Row gutter={[16, 16]}>
              {userStats.map((stat, index) => (
                <Col span={12} key={index}>
                  <Statistic
                    title={stat.title}
                    value={stat.value}
                    prefix={stat.icon}
                    valueStyle={{ color: stat.color, fontSize: 20 }}
                  />
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Recent Projects & Top Clients */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Recent Projects" className="card-shadow">
            <List
              dataSource={stats?.recentProjects || []}
              locale={{ emptyText: "No recent projects" }}
              renderItem={(project) => (
                <List.Item>
                  <div className="w-full">
                    <div className="flex justify-between items-center mb-1">
                      <div>
                        <Text strong>{project.projectCode}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {project.name || "-"}
                        </Text>
                      </div>
                      <Tag color={statusColorMap[project.status] || "default"}>
                        {project.status?.toUpperCase()}
                      </Tag>
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {project.client?.displayName} • {dayjs(project.createdAt).format("DD MMM YYYY")}
                    </Text>
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Top Clients by Projects" className="card-shadow">
            <List
              dataSource={stats?.topClients || []}
              locale={{ emptyText: "No client data" }}
              renderItem={(client) => (
                <List.Item>
                  <div className="w-full">
                    <div className="flex justify-between items-center">
                      <div>
                        <Text strong>{client.clientName}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {client.projectCount} project{client.projectCount !== 1 ? "s" : ""}
                        </Text>
                      </div>
                      <Text strong style={{ color: "#1890ff" }}>
                        ₹{client.totalRevenue.toLocaleString("en-IN", {
                          maximumFractionDigits: 0,
                        })}
                      </Text>
                    </div>
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
