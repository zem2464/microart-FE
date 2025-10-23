import React, { useState, useContext } from "react";
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
  Tooltip,
  Input,
  Select,
  message,
  Tabs,
  Badge,
  Descriptions,
  Divider,
  Empty,
} from "antd";
import {
  EyeOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ProjectOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  PauseCircleOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation } from "@apollo/client";
import {
  GET_PROJECTS,
  DELETE_PROJECT,
  ACTIVATE_PROJECT,
} from "../../graphql/projectQueries";
import { GET_CLIENTS } from "../../graphql/clientQueries";
import { GET_TASKS } from "../../graphql/taskQueries";
import { AppDrawerContext } from "../../contexts/DrawerContext";
import dayjs from "dayjs";

const { Text } = Typography;
const { Option } = Select;

// Helper function to get client display name
const getClientDisplayName = (client) => {
  if (client.displayName) return client.displayName;
  if (client.companyName) return client.companyName;
  return `${client.firstName} ${client.lastName || ""}`.trim();
};

const ProjectManagement = () => {
  const { showProjectFormDrawer } = useContext(AppDrawerContext);
  const [activeTab, setActiveTab] = useState("list");
  const [selectedProject, setSelectedProject] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");

  // GraphQL Queries
  const {
    data: projectsData,
    loading: projectsLoading,
    error: projectsError,
    refetch: refetchProjects,
  } = useQuery(GET_PROJECTS, {
    variables: {
      filters: {},
      page: 1,
      limit: 100,
      sortBy: "createdAt",
      sortOrder: "DESC",
    },
    fetchPolicy: "cache-and-network",
  });

  const { data: clientsData } = useQuery(GET_CLIENTS, {
    variables: {
      filters: {},
      page: 1,
      limit: 100,
      sortBy: "name",
      sortOrder: "ASC",
    },
    fetchPolicy: "cache-and-network",
  });

  const { data: projectTasksData, loading: tasksLoading } = useQuery(
    GET_TASKS,
    {
      variables: {
        filters: selectedProject ? { projectId: selectedProject.id } : {},
        page: 1,
        limit: 50,
        sortBy: "createdAt",
        sortOrder: "DESC",
      },
      skip: !selectedProject,
      fetchPolicy: "cache-and-network",
    }
  );

  // GraphQL Mutations
  const [deleteProject] = useMutation(DELETE_PROJECT, {
    onCompleted: () => {
      message.success("Project deleted successfully!");
      refetchProjects();
    },
    onError: (error) => {
      message.error(`Error deleting project: ${error.message}`);
    },
  });

  const [activateProject] = useMutation(ACTIVATE_PROJECT, {
    onCompleted: () => {
      message.success("Project activated successfully!");
      refetchProjects();
    },
    onError: (error) => {
      message.error(`Error activating project: ${error.message}`);
    },
  });

  // Filter projects based on search and filters
  const filteredProjects =
    projectsData?.projects?.data?.filter((project) => {
      const matchesSearch =
        project.projectCode.toLowerCase().includes(searchText.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchText.toLowerCase()) ||
        project.projectNumber.toLowerCase().includes(searchText.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || project.status === statusFilter;
      const matchesClient =
        clientFilter === "all" || project.clientId === parseInt(clientFilter);

      return matchesSearch && matchesStatus && matchesClient;
    }) || [];

  // Calculate statistics
  const stats = {
    total: filteredProjects.length,
    active: filteredProjects.filter((p) => p.status === "ACTIVE").length,
    draft: filteredProjects.filter((p) => p.status === "DRAFT").length,
    completed: filteredProjects.filter((p) => p.status === "COMPLETED").length,
  };

  // Handle project actions
  const handleViewProject = (project) => {
    setSelectedProject(project);
    setActiveTab("details");
  };

  const handleEditProject = (project) => {
    showProjectFormDrawer(project, "edit", () => {
      refetchProjects();
    });
  };

  const handleDeleteProject = (project) => {
    Modal.confirm({
      title: "Are you sure you want to delete this project?",
      content: `This will permanently delete "${project.projectCode}" and all associated data.`,
      okText: "Yes, Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: () => {
        deleteProject({
          variables: { id: project.id },
        });
      },
    });
  };

  const handleActivateProject = (project) => {
    Modal.confirm({
      title: "Activate Project",
      content: `Are you sure you want to activate "${project.projectCode}"? This will create tasks and start the project.`,
      okText: "Yes, Activate",
      cancelText: "Cancel",
      onOk: () => {
        activateProject({
          variables: { id: project.id },
        });
      },
    });
  };

  // Table columns
  const columns = [
    {
      title: "Project Number",
      dataIndex: "projectNumber",
      key: "projectNumber",
      width: 150,
      render: (text) => <Text code>{text}</Text>,
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          <Text type="secondary" style={{ fontSize: "12px" }}>
            {record.description?.length > 50
              ? `${record.description.substring(0, 50)}...`
              : record.description}
          </Text>
        </Space>
      ),
    },
    {
      title: "Client",
      dataIndex: "client",
      key: "client",
      width: 150,
      render: (client) => (client ? getClientDisplayName(client) : "N/A"),
    },
    {
      title: "Work Type",
      dataIndex: ["workType", "name"],
      key: "workType",
      width: 120,
    },
    {
      title: "Grading",
      dataIndex: ["grading", "name"],
      key: "grading",
      width: 100,
      render: (text, record) => (
        <Tag color="gold">
          {text} - ${record.grading?.defaultRate || 0}
        </Tag>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status) => {
        const statusConfig = {
          DRAFT: { color: "orange", icon: <EditOutlined /> },
          ACTIVE: { color: "green", icon: <PlayCircleOutlined /> },
          COMPLETED: { color: "blue", icon: <CheckCircleOutlined /> },
          CANCELLED: { color: "red", icon: <PauseCircleOutlined /> },
        };
        const config = statusConfig[status] || { color: "default", icon: null };
        return (
          <Tag color={config.color} icon={config.icon}>
            {status}
          </Tag>
        );
      },
    },
    {
      title: "Deadline",
      dataIndex: "deadline",
      key: "deadline",
      width: 120,
      render: (date) =>
        date ? dayjs(date).format("MMM DD, YYYY") : "No deadline",
    },
    {
      title: "Budget",
      dataIndex: "budget",
      key: "budget",
      width: 100,
      render: (budget) => (budget ? `$${budget.toLocaleString()}` : "N/A"),
    },
    {
      title: "Actions",
      key: "actions",
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleViewProject(record)}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEditProject(record)}
            />
          </Tooltip>
          {record.status === "DRAFT" && (
            <Tooltip title="Activate Project">
              <Button
                type="text"
                icon={<PlayCircleOutlined />}
                onClick={() => handleActivateProject(record)}
              />
            </Tooltip>
          )}
          <Tooltip title="Delete">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteProject(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  if (projectsError) {
    return (
      <Alert
        message="Error Loading Projects"
        description={projectsError.message}
        type="error"
        showIcon
      />
    );
  }

  return (
    <div className="project-management">
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: "list",
            label: (
              <span>
                <ProjectOutlined />
                Projects List
                <Badge count={stats.total} showZero style={{ marginLeft: 8 }} />
              </span>
            ),
            children: (
              <div>
                {/* Statistics Cards */}
                <Row gutter={16} style={{ marginBottom: 24 }}>
                  <Col span={6}>
                    <Card>
                      <Statistic
                        title="Total Projects"
                        value={stats.total}
                        prefix={<ProjectOutlined />}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card>
                      <Statistic
                        title="Active"
                        value={stats.active}
                        prefix={<PlayCircleOutlined />}
                        valueStyle={{ color: "#3f8600" }}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card>
                      <Statistic
                        title="Draft"
                        value={stats.draft}
                        prefix={<EditOutlined />}
                        valueStyle={{ color: "#cf1322" }}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card>
                      <Statistic
                        title="Completed"
                        value={stats.completed}
                        prefix={<CheckCircleOutlined />}
                        valueStyle={{ color: "#1890ff" }}
                      />
                    </Card>
                  </Col>
                </Row>

                {/* Filters and Actions */}
                <Card style={{ marginBottom: 16 }}>
                  <Row gutter={16} align="middle">
                    <Col span={8}>
                      <Input
                        placeholder="Search projects..."
                        prefix={<SearchOutlined />}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        allowClear
                      />
                    </Col>
                    <Col span={4}>
                      <Select
                        placeholder="Status"
                        value={statusFilter}
                        onChange={setStatusFilter}
                        style={{ width: "100%" }}
                      >
                        <Option value="all">All Status</Option>
                        <Option value="DRAFT">Draft</Option>
                        <Option value="ACTIVE">Active</Option>
                        <Option value="COMPLETED">Completed</Option>
                        <Option value="CANCELLED">Cancelled</Option>
                      </Select>
                    </Col>
                    <Col span={4}>
                      <Select
                        placeholder="Client"
                        value={clientFilter}
                        onChange={setClientFilter}
                        style={{ width: "100%" }}
                      >
                        <Option value="all">All Clients</Option>
                        {clientsData?.clients?.data?.map((client) => (
                          <Option key={client.id} value={client.id}>
                            {getClientDisplayName(client)}
                          </Option>
                        ))}
                      </Select>
                    </Col>
                    <Col span={8} style={{ textAlign: "right" }}>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() =>
                          showProjectFormDrawer(null, "create", refetchProjects)
                        }
                      >
                        Create Project
                      </Button>
                    </Col>
                  </Row>
                </Card>

                {/* Projects Table */}
                <Card>
                  <Table
                    columns={columns}
                    dataSource={filteredProjects}
                    rowKey="id"
                    loading={projectsLoading}
                    pagination={{
                      total: filteredProjects.length,
                      pageSize: 10,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total, range) =>
                        `${range[0]}-${range[1]} of ${total} projects`,
                    }}
                    scroll={{ x: 1200 }}
                  />
                </Card>
              </div>
            ),
          },
          {
            key: "details",
            label: (
              <span>
                <EyeOutlined />
                Project Details
              </span>
            ),
            children: selectedProject ? (
              <ProjectDetails
                project={selectedProject}
                tasks={projectTasksData?.tasks?.data || []}
                tasksLoading={tasksLoading}
                onBack={() => setActiveTab("list")}
              />
            ) : (
              <Empty
                description="Select a project from the list to view details"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ),
          },
        ]}
      />
    </div>
  );
};

// Project Details Component
const ProjectDetails = ({ project, tasks, tasksLoading, onBack }) => {
  const completedTasks = tasks.filter(
    (task) => task.status === "COMPLETED"
  ).length;
  const totalTasks = tasks.length;
  const progressPercent =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button onClick={onBack}>← Back to Projects</Button>
      </div>

      <Row gutter={16}>
        <Col span={16}>
          <Card title={project.projectCode} style={{ marginBottom: 16 }}>
            <Descriptions column={2}>
              <Descriptions.Item label="Project Number">
                <Text code>{project.projectNumber}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={project.status === "ACTIVE" ? "green" : "orange"}>
                  {project.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Client">
                {project.client ? getClientDisplayName(project.client) : "N/A"}
              </Descriptions.Item>
              <Descriptions.Item label="Work Type">
                {project.workType?.name || "N/A"}
              </Descriptions.Item>
              <Descriptions.Item label="Grading">
                {project.grading?.name || "N/A"} - $
                {project.grading?.defaultRate || 0}
              </Descriptions.Item>
              <Descriptions.Item label="Budget">
                {project.budget ? `$${project.budget.toLocaleString()}` : "N/A"}
              </Descriptions.Item>
              <Descriptions.Item label="Deadline">
                {project.deadline
                  ? dayjs(project.deadline).format("MMMM DD, YYYY")
                  : "No deadline"}
              </Descriptions.Item>
              <Descriptions.Item label="Created">
                {dayjs(project.createdAt).format("MMMM DD, YYYY")}
              </Descriptions.Item>
            </Descriptions>

            {project.description && (
              <>
                <Divider />
                <Text strong>Description:</Text>
                <div style={{ marginTop: 8 }}>
                  <Text>{project.description}</Text>
                </div>
              </>
            )}
          </Card>

          <Card title="Project Tasks" loading={tasksLoading}>
            {tasks.length > 0 ? (
              <Table
                dataSource={tasks}
                rowKey="id"
                pagination={false}
                size="small"
                columns={[
                  {
                    title: "Task Number",
                    dataIndex: "taskNumber",
                    key: "taskNumber",
                    render: (text) => <Text code>{text}</Text>,
                  },
                  {
                    title: "Description",
                    dataIndex: "description",
                    key: "description",
                  },
                  {
                    title: "Status",
                    dataIndex: "status",
                    key: "status",
                    render: (status) => (
                      <Tag
                        color={
                          status === "COMPLETED"
                            ? "green"
                            : status === "IN_PROGRESS"
                            ? "blue"
                            : "orange"
                        }
                      >
                        {status}
                      </Tag>
                    ),
                  },
                  {
                    title: "Assigned To",
                    dataIndex: ["assignedTo", "firstName"],
                    key: "assignedTo",
                    render: (firstName, record) =>
                      firstName
                        ? `${firstName} ${record.assignedTo?.lastName || ""}`
                        : "Unassigned",
                  },
                  {
                    title: "Created",
                    dataIndex: "createdAt",
                    key: "createdAt",
                    render: (date) => dayjs(date).format("MMM DD, YYYY"),
                  },
                ]}
              />
            ) : (
              <Empty description="No tasks created yet" />
            )}
          </Card>
        </Col>

        <Col span={8}>
          <Card title="Project Progress" style={{ marginBottom: 16 }}>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <Progress
                type="circle"
                percent={progressPercent}
                format={() => `${completedTasks}/${totalTasks}`}
              />
            </div>
            <Statistic
              title="Tasks Completed"
              value={completedTasks}
              suffix={`/ ${totalTasks}`}
            />
          </Card>

          <Card title="Project Timeline">
            <Timeline
              items={[
                {
                  children: `Created on ${dayjs(project.createdAt).format(
                    "MMM DD, YYYY"
                  )}`,
                  color: "blue",
                },
                project.status === "ACTIVE" && {
                  children: "Project activated",
                  color: "green",
                },
                project.deadline && {
                  children: `Deadline: ${dayjs(project.deadline).format(
                    "MMM DD, YYYY"
                  )}`,
                  color: dayjs(project.deadline).isAfter(dayjs())
                    ? "orange"
                    : "red",
                },
              ].filter(Boolean)}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ProjectManagement;
