import { useState, useEffect, useMemo } from "react";
import {
  Table,
  Card,
  Button,
  Space,
  Tag,
  Typography,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  DatePicker,
  message,
  Tooltip,
  Popconfirm,
  Row,
  Col,
  Statistic,
  Alert,
  Checkbox,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useReactiveVar } from "@apollo/client";
import {
  GET_PROJECTS,
  CREATE_PROJECT,
  UPDATE_PROJECT,
  DELETE_PROJECT,
  ACTIVATE_PROJECT,
} from "../../graphql/projectQueries";
import { GET_CLIENTS } from "../../graphql/clientQueries";
import { GET_WORK_TYPES } from "../../graphql/workTypeQueries";
import { GET_GRADINGS } from "../../graphql/gradingQueries";
import { useAppDrawer } from "../../contexts/DrawerContext";
import dayjs from "dayjs";
import { userCacheVar } from "../../cache/userCacheVar";
import {
  getMyClientsFilterFromCookie,
  saveMyClientsFilterToCookie,
} from "../../utils/myClientsFilterUtils";

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// Status and Priority configurations (shared across components)
// Map backend status codes to display label and color
const STATUS_MAP = {
  draft: { label: "Draft", color: "orange" },
  in_progress: { label: "In Progress", color: "blue" },
  completed: { label: "Completed", color: "green" },
  cancelled: { label: "Cancelled", color: "red" },
  active: { label: "Active", color: "green" },
  on_hold: { label: "On Hold", color: "purple" },
  requested: { label: "Pending Approval", color: "purple" },
};

// Map backend priority codes (A/B/C) to labels/colors
const PRIORITY_MAP = {
  A: { label: "High", color: "red" },
  B: { label: "Medium", color: "orange" },
  C: { label: "Low", color: "green" },
  URGENT: { label: "Urgent", color: "volcano" },
};

const ProjectList = () => {
  // Drawer context
  const { showProjectDetailDrawerV2 } = useAppDrawer();
  const currentUser = useReactiveVar(userCacheVar);
  
  // State management
  const [projects, setProjects] = useState([]);
  const [filters, setFilters] = useState({});
  const [searchText, setSearchText] = useState("");
  const [selectedProject, setSelectedProject] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState("view"); // 'view', 'create', 'edit'
  const [form] = Form.useForm();
  const [myClientsOnly, setMyClientsOnly] = useState(
    getMyClientsFilterFromCookie(currentUser?.isServiceProvider === true)
  );

  // Save myClientsOnly filter to cookie whenever it changes
  useEffect(() => {
    saveMyClientsFilterToCookie(myClientsOnly);
  }, [myClientsOnly]);

  // Pagination state
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
  });

  // GraphQL Queries
  const {
    data: projectsData,
    loading: projectsLoading,
    error: projectsError,
    refetch: refetchProjects,
  } = useQuery(GET_PROJECTS, {
    variables: {
      search: searchText,
      filters,
    },
    fetchPolicy: "cache-and-network",
  });

  const { data: clientsData } = useQuery(GET_CLIENTS);
  const { data: workTypesData } = useQuery(GET_WORK_TYPES);
  const { data: gradingsData } = useQuery(GET_GRADINGS);

  // GraphQL Mutations
  const [createProject, { loading: createLoading }] = useMutation(
    CREATE_PROJECT,
    {
      onCompleted: (data) => {
        message.success(
          `Project ${data.createProject.projectCode} created successfully`
        );
        setModalVisible(false);
        form.resetFields();
        refetchProjects();
      },
      onError: (error) => {
        message.error(`Failed to create project: ${error.message}`);
      },
    }
  );

  const [updateProject, { loading: updateLoading }] = useMutation(
    UPDATE_PROJECT,
    {
      onCompleted: (data) => {
        message.success(
          `Project ${data.updateProject.projectCode} updated successfully`
        );
        setModalVisible(false);
        form.resetFields();
        refetchProjects();
      },
      onError: (error) => {
        message.error(`Failed to update project: ${error.message}`);
      },
    }
  );

  const [deleteProject] = useMutation(DELETE_PROJECT, {
    onCompleted: () => {
      message.success("Project deleted successfully");
      refetchProjects();
    },
    onError: (error) => {
      message.error(`Failed to delete project: ${error.message}`);
    },
  });

  const [activateProject] = useMutation(ACTIVATE_PROJECT, {
    onCompleted: (data) => {
      message.success(
        `Project activated successfully. ${
          data.activateProject.tasks?.length || 0
        } tasks created.`
      );
      refetchProjects();
    },
    onError: (error) => {
      message.error(`Failed to activate project: ${error.message}`);
    },
  });

  // Effects
  useEffect(() => {
    // Debug: log GraphQL response to help diagnose empty table
    if (projectsData) console.debug("GET_PROJECTS response:", projectsData);

    if (projectsData?.projects) {
      setProjects(projectsData.projects.projects || projectsData.projects);
    }
  }, [projectsData]);

  // Default "My Clients" filter for service providers
  useEffect(() => {
    const roleType = currentUser?.role?.roleType?.toString()?.toUpperCase();
    if (roleType && roleType.includes("SERVICE_PROVIDER")) {
      setMyClientsOnly(true);
    }
  }, [currentUser]);

  // Update filters when myClientsOnly changes
  useEffect(() => {
    if (myClientsOnly && currentUser?.id) {
      setFilters(prev => ({ ...prev, serviceProviderId: currentUser.id }));
    } else {
      setFilters(prev => {
        const { serviceProviderId, ...rest } = prev;
        return rest;
      });
    }
  }, [myClientsOnly, currentUser?.id]);

  // No need for client-side filtering anymore - backend handles it
  const displayProjects = projects;

  // Table columns
  const columns = [
    {
      title: "Project Code",
      dataIndex: "projectCode",
      key: "projectCode",
      width: 200,
      sorter: (a, b) =>
        (a.projectCode || "").localeCompare(b.projectCode || ""),
      ellipsis: { showTitle: false },
      render: (text) => (
        <Tooltip title={text}>
          <Text strong>{text}</Text>
        </Tooltip>
      ),
    },
    {
      title: "Client",
      dataIndex: ["client"],
      key: "client",
      width: 150,
      sorter: (a, b) =>
        (a.client?.clientCode || "").localeCompare(b.client?.clientCode || ""),
      render: (_, record) => {
        const client = record.client || {};
        return (
          <div>
            <div>
              <Text strong>{client.clientCode}</Text>
            </div>
          </div>
        );
      },
    },
    {
      title: "Work Type",
      dataIndex: ["workType", "name"],
      key: "workType",
      width: 120,
      filters:
        workTypesData?.workTypes?.map((wt) => ({
          text: wt.name,
          value: wt.id,
        })) || [],
      filterSearch: true,
      onFilter: (value, record) => record.workType?.id === value,
    },
    {
      title: "Grading",
      dataIndex: ["grading", "name"],
      key: "grading",
      width: 100,
      render: (text, record) => (
        <div>
          <div>{text}</div>
          <div>
            <Text type="secondary" style={{ fontSize: "12px" }}>
              ₹{record.grading?.defaultRate}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: "Quantity",
      dataIndex: "imageQuantity",
      key: "imageQuantity",
      width: 80,
      align: "center",
      sorter: (a, b) => (a.imageQuantity || 0) - (b.imageQuantity || 0),
    },
    {
      title: "Cost",
      key: "cost",
      width: 120,
      render: (_, record) => (
        <div>
          <div>
            <Text strong>${record.estimatedCost || 0}</Text>
          </div>
          {record.actualCost && (
            <div>
              <Text type="secondary" style={{ fontSize: "12px" }}>
                Actual: ${record.actualCost}
              </Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 100,
      filters: Object.keys(STATUS_MAP).map((key) => ({
        text: STATUS_MAP[key].label,
        value: key,
      })),
      onFilter: (value, record) => (record.status || "").toString() === value,
      render: (status) => {
        const s = STATUS_MAP[(status || "").toString()];
        const label = s ? s.label : status || "Unknown";
        const color = s ? s.color : "default";
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: "Priority",
      dataIndex: "priority",
      key: "priority",
      width: 100,
      filters: Object.keys(PRIORITY_MAP).map((key) => ({
        text: PRIORITY_MAP[key].label,
        value: key,
      })),
      onFilter: (value, record) => (record.priority || "").toString() === value,
      render: (priority) => {
        const p = PRIORITY_MAP[(priority || "").toString()];
        const label = p ? p.label : priority || "N/A";
        const color = p ? p.color : "default";
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: "Deadline",
      dataIndex: "deadlineDate",
      key: "deadlineDate",
      width: 100,
      sorter: (a, b) => {
        if (!a.deadlineDate && !b.deadlineDate) return 0;
        if (!a.deadlineDate) return 1;
        if (!b.deadlineDate) return -1;
        return dayjs(a.deadlineDate).unix() - dayjs(b.deadlineDate).unix();
      },
      render: (date) => (date ? dayjs(date).format("MMM DD") : "-"),
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      fixed: "right",
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button
              type="link"
              icon={<EyeOutlined />}
              size="small"
              onClick={() => handleView(record)}
            />
          </Tooltip>
          <Tooltip title="Edit Project">
            <Button
              type="link"
              icon={<EditOutlined />}
              size="small"
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          {(record.status || "").toString() === "draft" && (
            <Tooltip title="Activate Project">
              <Button
                type="link"
                icon={<PlayCircleOutlined />}
                size="small"
                onClick={() => handleActivate(record)}
              />
            </Tooltip>
          )}
          <Popconfirm
            title="Are you sure you want to delete this project?"
            description="This action cannot be undone."
            onConfirm={() => handleDelete(record)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete Project">
              <Button
                type="link"
                icon={<DeleteOutlined />}
                size="small"
                danger
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Action handlers
  const handleCreate = () => {
    setModalType("create");
    setSelectedProject(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleView = (project) => {
    // Use new project detail drawer instead of modal
    showProjectDetailDrawerV2(project.id);
  };

  const handleEdit = (project) => {
    setModalType("edit");
    setSelectedProject(project);
    form.setFieldsValue({
      description: project.description,
      clientId: project.client?.id,
      workTypeId: project.workType?.id,
      gradingId: project.grading?.id,
      imageQuantity: project.imageQuantity,
      deadlineDate: project.deadlineDate ? dayjs(project.deadlineDate) : null,
      priority: project.priority,
      notes: project.notes,
      clientNotes: project.clientNotes,
    });
    setModalVisible(true);
  };

  const handleActivate = (project) => {
    Modal.confirm({
      title: "Activate Project",
      content: `Are you sure you want to activate project "${project.projectCode}"? This will create tasks and make the project active.`,
      onOk: () => {
        activateProject({
          variables: { id: project.id },
        });
      },
    });
  };

  const handleDelete = (project) => {
    let voidReasonInput = '';
    Modal.confirm({
      title: "Are you sure you want to delete this project?",
      content: (
        <div>
          <p style={{ marginBottom: 16 }}>This action cannot be undone.</p>
          <Input.TextArea
            placeholder="Please provide a reason for deleting this project (required)"
            rows={3}
            onChange={(e) => { voidReasonInput = e.target.value; }}
            autoFocus
          />
        </div>
      ),
      okText: "Yes, Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: () => {
        if (!voidReasonInput || voidReasonInput.trim() === '') {
          message.error('Void reason is required');
          return Promise.reject('Void reason required');
        }
        return deleteProject({
          variables: { 
            id: project.id,
            voidReason: voidReasonInput.trim() 
          },
        });
      },
    });
  };

  const handleSubmit = async (values) => {
    try {
      if (modalType === "create") {
        await createProject({
          variables: {
            input: {
              ...values,
              deadlineDate: values.deadlineDate?.format("YYYY-MM-DD") || null,
            },
          },
        });
      } else if (modalType === "edit") {
        await updateProject({
          variables: {
            id: selectedProject.id,
            input: {
              ...values,
              deadlineDate: values.deadlineDate?.format("YYYY-MM-DD") || null,
            },
          },
        });
      }
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  const handleTableChange = (tablePagination, filters, sorter) => {
    setFilters(filters);
  };

  const handleSearch = (value) => {
    setSearchText(value);
  };

  // Statistics
  const projectStats = {
    total: projects.length,
    active: projects.filter((p) =>
      ["in_progress", "active"].includes((p.status || "").toString())
    ).length,
    draft: projects.filter((p) => (p.status || "").toString() === "draft")
      .length,
    completed: projects.filter(
      (p) => (p.status || "").toString() === "completed"
    ).length,
  };

  if (projectsError) {
    return (
      <Card>
        <Alert
          message="Error Loading Projects"
          description={projectsError.message}
          type="error"
          action={
            <Button size="small" onClick={() => refetchProjects()}>
              Retry
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <div>
      {/* Header with Statistics */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Projects"
              value={projectStats.total}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Active Projects"
              value={projectStats.active}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Draft Projects"
              value={projectStats.draft}
              valueStyle={{ color: "#faad14" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Completed Projects"
              value={projectStats.completed}
              valueStyle={{ color: "#722ed1" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Table Card */}
      <Card
        title={
          <Space>
            <Title level={4} style={{ margin: 0 }}>
              Projects Management
            </Title>
            <Tag color="blue">{projectStats.total} Projects</Tag>
          </Space>
        }
        extra={
          <Space>
            <Input.Search
              placeholder="Search projects..."
              allowClear
              onSearch={handleSearch}
              style={{ width: 200 }}
            />
            <Form.Item style={{ margin: 0 }}>
              <Checkbox
                checked={myClientsOnly}
                onChange={(e) => setMyClientsOnly(e.target.checked)}
              >
                My Clients Only
              </Checkbox>
            </Form.Item>
            <Button
              icon={<ReloadOutlined />}
              onClick={refetchProjects}
              loading={projectsLoading}
            >
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreate}
            >
              Create Project
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={displayProjects}
          rowKey="id"
          loading={projectsLoading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: displayProjects.length,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} projects`,
            pageSizeOptions: [10, 25, 50, 100],
          }}
          onChange={(paginationConfig, filters, sorter) => {
            setPagination({
              current: paginationConfig.current,
              pageSize: paginationConfig.pageSize,
            });
            setFilters(filters);
          }}
          scroll={{ x: 1500 }}
          size="small"
        />
      </Card>

      {/* Project Modal */}
      <Modal
        title={
          modalType === "create"
            ? "Create New Project"
            : modalType === "edit"
            ? "Edit Project"
            : "Project Details"
        }
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        width={modalType === "view" ? 800 : 600}
        footer={
          modalType === "view"
            ? [
                <Button key="close" onClick={() => setModalVisible(false)}>
                  Close
                </Button>,
              ]
            : [
                <Button key="cancel" onClick={() => setModalVisible(false)}>
                  Cancel
                </Button>,
                <Button
                  key="submit"
                  type="primary"
                  onClick={() => form.submit()}
                  loading={createLoading || updateLoading}
                >
                  {modalType === "create" ? "Create Project" : "Update Project"}
                </Button>,
              ]
        }
      >
        {modalType === "view" ? (
          <ProjectViewContent project={selectedProject} />
        ) : (
          <ProjectForm
            form={form}
            onFinish={handleSubmit}
            clients={clientsData?.clients || []}
            workTypes={workTypesData?.workTypes || []}
            gradings={gradingsData?.gradings || []}
            mode={modalType}
          />
        )}
      </Modal>
    </div>
  );
};

// Project View Component
const ProjectViewContent = ({ project }) => {
  if (!project) return null;

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <div>
            <Text strong>Project Code:</Text> {project.projectCode}
          </div>
          <div>
            <Text strong>Project Code:</Text> {project.projectCode}
          </div>
          <div>
            <Text strong>Client:</Text>{" "}
            {(() => {
              const c = project.client || {};
              const name =
                c.displayName ||
                [c.firstName, c.lastName].filter(Boolean).join(" ") ||
                c.companyName ||
                "";
              return `${name} ${c.clientCode ? `(${c.clientCode})` : ""}`;
            })()}
          </div>
          <div>
            <Text strong>Work Type:</Text> {project.workType?.name}
          </div>
          <div>
            <Text strong>Grading:</Text> {project.grading?.name} (₹
            {project.grading?.defaultRate})
          </div>
        </Col>
        <Col span={12}>
          <div>
            <Text strong>Status:</Text>{" "}
            {(() => {
              const s = STATUS_MAP[(project.status || "").toString()];
              return (
                <Tag color={s ? s.color : "default"}>
                  {s ? s.label : project.status}
                </Tag>
              );
            })()}
          </div>
          <div>
            <Text strong>Priority:</Text>{" "}
            {(() => {
              const p = PRIORITY_MAP[(project.priority || "").toString()];
              return (
                <Tag color={p ? p.color : "default"}>
                  {p ? p.label : project.priority}
                </Tag>
              );
            })()}
          </div>
          <div>
            <Text strong>Quantity:</Text> {project.imageQuantity} images
          </div>
          <div>
            <Text strong>Estimated Cost:</Text> ₹{project.estimatedCost}
          </div>
          <div>
            <Text strong>Deadline:</Text>{" "}
            {project.deadlineDate
              ? dayjs(project.deadlineDate).format("YYYY-MM-DD")
              : "Not set"}
          </div>
        </Col>
      </Row>

      {project.description && (
        <div style={{ marginTop: 16 }}>
          <Text strong>Description:</Text>
          <div
            style={{
              marginTop: 8,
              padding: 12,
              background: "#f5f5f5",
              borderRadius: 4,
            }}
          >
            {project.description}
          </div>
        </div>
      )}

      {project.tasks && project.tasks.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <Text strong>Tasks ({project.tasks.length}):</Text>
          <div style={{ marginTop: 8 }}>
            {project.tasks.map((task) => (
              <Tag key={task.id} style={{ margin: "2px" }}>
                {task.taskCode} - {task.taskType?.name}
              </Tag>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Project Form Component
const ProjectForm = ({
  form,
  onFinish,
  clients,
  workTypes,
  gradings,
  mode,
}) => {
  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      initialValues={{
        priority: "MEDIUM",
        imageQuantity: 1,
      }}
    >
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="clientId"
            label="Client"
            rules={[{ required: true, message: "Please select a client" }]}
          >
            <Select placeholder="Select client" showSearch>
              {clients.map((client) => (
                <Option key={client.id} value={client.id}>
                  {client.clientCode}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="workTypeId"
            label="Work Type"
            rules={[{ required: true, message: "Please select work type" }]}
          >
            <Select placeholder="Select work type">
              {workTypes.map((workType) => (
                <Option key={workType.id} value={workType.id}>
                  {workType.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="gradingId"
            label="Grading"
            rules={[{ required: true, message: "Please select grading" }]}
          >
            <Select placeholder="Select grading">
              {gradings.map((grading) => (
                <Option key={grading.id} value={grading.id}>
                  {grading.name} (₹{grading.defaultRate})
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="imageQuantity"
            label="Image Quantity"
            rules={[{ required: true, message: "Please enter image quantity" }]}
          >
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="priority"
            label="Priority"
            rules={[{ required: true, message: "Please select priority" }]}
          >
            <Select>
              <Option value="LOW">Low</Option>
              <Option value="MEDIUM">Medium</Option>
              <Option value="HIGH">High</Option>
              <Option value="URGENT">Urgent</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="deadlineDate" label="Deadline Date">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item name="description" label="Description">
        <TextArea rows={3} placeholder="Enter project description" />
      </Form.Item>

      <Form.Item name="notes" label="Internal Notes">
        <TextArea
          rows={2}
          placeholder="Internal notes (not visible to client)"
        />
      </Form.Item>

      <Form.Item name="clientNotes" label="Client Notes">
        <TextArea rows={2} placeholder="Notes visible to client" />
      </Form.Item>
    </Form>
  );
};

export default ProjectList;
