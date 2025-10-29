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
  InputNumber,
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
  UPDATE_PROJECT,
} from "../../graphql/projectQueries";
import { GET_CLIENTS } from "../../graphql/clientQueries";
// tasks are loaded in ProjectDetail drawer when needed
import { AppDrawerContext } from "../../contexts/DrawerContext";
import dayjs from "dayjs";

const { Text } = Typography;
const { Option } = Select;

// Status display map for labels and colors
const STATUS_MAP = {
  DRAFT: { label: 'Draft', color: 'orange' },
  ACTIVE: { label: 'Active', color: 'green' },
  IN_PROGRESS: { label: 'In Progress', color: 'blue' },
  COMPLETED: { label: 'Completed', color: 'blue' },
  CANCELLED: { label: 'Cancelled', color: 'red' }
};

// Helper function to get client display name
const getClientDisplayName = (client) => {
  return client.clientCode || 'Unknown Client';
};

const ProjectManagement = () => {
  const { showProjectFormDrawer, showProjectDetailDrawer } = useContext(AppDrawerContext);
  const [activeTab, setActiveTab] = useState("list");
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  
  // Project completion modal state
  const [completeModalVisible, setCompleteModalVisible] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [actualImageCount, setActualImageCount] = useState(0);

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

  // project tasks are loaded inside the ProjectDetail drawer when opened
  const tasksLoading = false;

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

  const [completeProject] = useMutation(UPDATE_PROJECT, {
    onCompleted: () => {
      message.success("Project completed successfully!");
      refetchProjects();
      setCompleteModalVisible(false);
      setSelectedProject(null);
      setActualImageCount(0);
    },
    onError: (error) => {
      message.error(`Error completing project: ${error.message}`);
    },
  });

  // Normalize projects array from GraphQL response (supports projects.projects or legacy projects.data)
  const allProjects =
    projectsData?.projects?.projects || projectsData?.projects?.data || [];

  // Filter projects based on search and filters
  const filteredProjects =
    allProjects.filter((project) => {
      const code = (project.projectCode || project.projectNumber || project.name || '').toString();
      const desc = (project.description || '').toString();
      const searchLower = searchText.toString().toLowerCase();

      const matchesSearch =
        code.toLowerCase().includes(searchLower) ||
        desc.toLowerCase().includes(searchLower);

      const projStatus = (project.status || '').toString().toUpperCase();
      const matchesStatus =
        statusFilter === 'all' || projStatus === (statusFilter || '').toString().toUpperCase();

      const projClientId = project.clientId || project.client?.id;
      const matchesClient = clientFilter === 'all' || projClientId === clientFilter || projClientId === parseInt(clientFilter);

      return matchesSearch && matchesStatus && matchesClient;
    }) || [];

  // Calculate statistics
  const stats = {
    total: filteredProjects.length,
    active: filteredProjects.filter((p) => (p.status || '').toString().toUpperCase() === 'ACTIVE').length,
    draft: filteredProjects.filter((p) => (p.status || '').toString().toUpperCase() === 'DRAFT').length,
    completed: filteredProjects.filter((p) => (p.status || '').toString().toUpperCase() === 'COMPLETED').length,
  };

  // Handle project actions
  const handleViewProject = (project) => {
    // Open project details in the shared drawer
    showProjectDetailDrawer(project);
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

  const handleCompleteProject = (project) => {
    setSelectedProject(project);
    setActualImageCount(project.imageQuantity || 0); // Default to original quantity
    setCompleteModalVisible(true);
  };

  const handleCompleteSubmit = () => {
    if (!selectedProject || actualImageCount <= 0) {
      message.error("Please enter a valid image count");
      return;
    }

    // Calculate actual cost based on actual image count
    const rate = selectedProject.grading?.defaultRate || 0;
    const actualCost = rate * actualImageCount;

    completeProject({
      variables: {
        id: selectedProject.id,
        input: {
          status: "COMPLETED",
          actualCost: actualCost,
          imageQuantity: actualImageCount, // Update with actual count
        },
      },
    });
  };

  // Table columns
  const columns = [
    {
      title: 'Project Code',
      dataIndex: 'projectCode',
      key: 'projectCode',
      width: 180,
      render: (text, record) => (
        <Text code>{text || record.projectNumber || record.id}</Text>
      ),
    },
    {
      title: 'Title / Description',
      dataIndex: 'description',
      key: 'description',
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.name || record.projectCode || record.projectNumber || 'Untitled'}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {text?.length > 80 ? `${text.substring(0, 80)}...` : text}
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
          {text} - ₹{record.grading?.defaultRate || 0}
        </Tag>
      ),
    },
    {
      title: 'Tasks',
      dataIndex: 'tasks',
      key: 'tasks',
      width: 160,
      sorter: (a, b) => ((a.tasks && a.tasks.length) || a.taskCount || 0) - ((b.tasks && b.tasks.length) || b.taskCount || 0),
      render: (tasks, record) => {
        // If project is a draft, tasks should remain hidden / not visible
        const status = (record.status || '').toString().toUpperCase();
        if (status === 'DRAFT') {
          return <div style={{ minWidth: 140, color: '#fa8c16' }}>Draft — tasks hidden</div>;
        }

        const all = tasks || record.tasks || [];
        const total = all.length || record.taskCount || 0;
        const completed = (all.filter ? all.filter(t => (t.status || '').toString().toUpperCase() === 'COMPLETED').length : 0) || record.completedTaskCount || 0;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
        return (
          <div style={{ minWidth: 140 }}>
            <div style={{ marginBottom: 6 }}>{total} task{total !== 1 ? 's' : ''}</div>
            <Progress percent={percent} size="small" />
          </div>
        );
      }
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 100,
      filters: Object.keys(STATUS_MAP).map(key => ({ text: STATUS_MAP[key].label, value: key })),
      sorter: (a, b) => ('' + (a.status || '')).localeCompare('' + (b.status || '')),
      render: (status) => {
        const key = (status || '').toString().toUpperCase();
        const cfg = STATUS_MAP[key] || { label: status || 'Unknown', color: 'default' };
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      }
    },
    {
      title: "Deadline",
      dataIndex: "deadlineDate",
      key: "deadlineDate",
      width: 120,
      render: (date) =>
        date ? dayjs(date).format("MMM DD, YYYY") : "No deadline",
    },
    {
      title: "Budget",
      dataIndex: "estimatedCost",
      key: "estimatedCost",
      width: 100,
      render: (budget) => (budget ? `₹${budget.toLocaleString()}` : "N/A"),
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
          {record.status === "ACTIVE" && record.taskCount > 0 && record.completedTaskCount === record.taskCount && (
            <Tooltip title="Complete Project">
              <Button
                type="text"
                icon={<CheckCircleOutlined />}
                style={{ color: '#52c41a' }}
                onClick={() => handleCompleteProject(record)}
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
      
        ]}
      />

      {/* Project Completion Modal */}
      <Modal
        title="Complete Project"
        open={completeModalVisible}
        onOk={handleCompleteSubmit}
        onCancel={() => {
          setCompleteModalVisible(false);
          setSelectedProject(null);
          setActualImageCount(0);
        }}
        okText="Complete Project"
        okButtonProps={{ type: 'primary', danger: false, style: { backgroundColor: '#52c41a', borderColor: '#52c41a' } }}
        width={600}
      >
        {selectedProject && (
          <div>
            <Alert
              message="Project Completion"
              description="All tasks have been completed. Please enter the actual number of images processed to calculate the final cost."
              type="info"
              showIcon
              style={{ marginBottom: 20 }}
            />
            
            <Descriptions title="Project Details" column={1} bordered size="small" style={{ marginBottom: 20 }}>
              <Descriptions.Item label="Project Code">{selectedProject.projectCode}</Descriptions.Item>
              <Descriptions.Item label="Client">{selectedProject.client?.clientCode}</Descriptions.Item>
              <Descriptions.Item label="Estimated Images">{selectedProject.imageQuantity}</Descriptions.Item>
              <Descriptions.Item label="Estimated Cost">₹{selectedProject.estimatedCost?.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="Rate per Image">₹{selectedProject.grading?.defaultRate?.toLocaleString()}</Descriptions.Item>
            </Descriptions>

            <Row gutter={16}>
              <Col span={12}>
                <div style={{ marginBottom: 8 }}>
                  <strong>Actual Images Processed *</strong>
                </div>
                <InputNumber
                  value={actualImageCount}
                  onChange={setActualImageCount}
                  min={1}
                  style={{ width: '100%' }}
                  placeholder="Enter actual image count"
                />
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 8 }}>
                  <strong>Calculated Actual Cost</strong>
                </div>
                <div style={{ 
                  padding: '4px 11px', 
                  backgroundColor: '#f5f5f5', 
                  border: '1px solid #d9d9d9',
                  borderRadius: '6px',
                  minHeight: '32px',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <span style={{ color: '#595959', fontWeight: 'bold', fontSize: '16px' }}>
                    ₹{((selectedProject.grading?.defaultRate || 0) * actualImageCount)?.toLocaleString()}
                  </span>
                </div>
              </Col>
            </Row>

            <Alert
              message="Note"
              description={`The actual cost will be calculated as: ${actualImageCount} images × ₹${selectedProject.grading?.defaultRate?.toLocaleString()} = ₹${((selectedProject.grading?.defaultRate || 0) * actualImageCount)?.toLocaleString()}`}
              type="warning"
              showIcon
              style={{ marginTop: 16 }}
            />
          </div>
        )}
      </Modal>
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
                {project.grading?.name || "N/A"} - ₹
                {project.grading?.defaultRate || 0}
              </Descriptions.Item>
              <Descriptions.Item label="Budget">
                {project.estimatedCost ? `₹${project.estimatedCost.toLocaleString()}` : "N/A"}
              </Descriptions.Item>
              <Descriptions.Item label="Deadline">
                {project.deadlineDate
                  ? dayjs(project.deadlineDate).format("MMMM DD, YYYY")
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
                project.deadlineDate && {
                  children: `Deadline: ${dayjs(project.deadlineDate).format(
                    "MMM DD, YYYY"
                  )}`,
                  color: dayjs(project.deadlineDate).isAfter(dayjs())
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
