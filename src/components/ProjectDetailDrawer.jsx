import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useReactiveVar, useApolloClient } from "@apollo/client";
import {
  Spin,
  Alert,
  Typography,
  Tag,
  Empty,
  Statistic,
  Row,
  Col,
  Card,
  Tooltip,
  Progress,
  Input,
  Button,
  Space,
  message,
} from "antd";
import {
  FolderOutlined,
  CodeOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  FileImageOutlined,
  ReloadOutlined,
  CopyOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { userCacheVar } from "../cache/userCacheVar";
import {
  GET_PROJECT_DETAIL,
  GET_AVAILABLE_USERS,
} from "../graphql/projectQueries";
import { UPDATE_PROJECT } from "../graphql/projectQueries";
import { UPDATE_CLIENT } from "../gql/clients";
import { GET_TASKS } from "../gql/tasks";
// Use work types query that includes sortOrder for proper ordering
import { GET_WORK_TYPES } from "../gql/workTypes";
import { GET_PROJECT_AUDIT_HISTORY } from "../gql/auditLogs";
import AuditDisplay from "./common/AuditDisplay.jsx";
import TasksTable from "./common/TasksTable";
import { generateBaseColumns } from "./common/TasksTableColumns";
import { useAppDrawer } from "../contexts/DrawerContext";

const { Title, Text } = Typography;

// Project status configuration
const STATUS_MAP = {
  DRAFT: { label: "Draft", color: "default" },
  ACTIVE: { label: "Active", color: "green" },
  IN_PROGRESS: { label: "In Progress", color: "processing" },
  REVIEW: { label: "Review", color: "cyan" },
  COMPLETED: { label: "Completed", color: "success" },
  CANCELLED: { label: "Cancelled", color: "error" },
  ON_HOLD: { label: "On Hold", color: "warning" },
  DELIVERED: { label: "Delivered", color: "purple" },
  REQUESTED: { label: "Pending Approval", color: "purple" },
};

const ProjectDetailDrawer = ({ projectId }) => {
  const currentUser = useReactiveVar(userCacheVar);
  const { updateProjectDetailDrawerTitle } = useAppDrawer();
  const client = useApolloClient();

  // Fetch project details
  const { data, loading, error, refetch } = useQuery(GET_PROJECT_DETAIL, {
    variables: { id: projectId },
    skip: !projectId,
    fetchPolicy: "no-cache",
  });

  // Fetch tasks separately with project filter - include all statuses including completed
  const {
    data: tasksData,
    loading: tasksLoading,
    refetch: refetchTasks,
  } = useQuery(GET_TASKS, {
    variables: {
      filters: { 
        projectId: projectId,
        // Explicitly include all statuses including COMPLETED
        statuses: ["TODO", "IN_PROGRESS", "REVIEW", "REVISION", "COMPLETED", "CANCELLED", "ON_HOLD"],
        // Include inactive tasks (soft-deleted) to show completed tasks
        includeInactive: true
      },
      page: 1,
      limit: 1000,
      sortBy: "createdAt",
      sortOrder: "DESC",
    },
    skip: !projectId,
    fetchPolicy: "no-cache",
    onCompleted: (data) => {
      console.log('[ProjectDetailDrawer] GET_TASKS completed. Tasks received:', data?.tasks?.tasks?.length || 0);
      if (data?.tasks?.tasks?.length > 0) {
        console.log('[ProjectDetailDrawer] Sample tasks:', data.tasks.tasks.slice(0, 3).map(t => ({ 
          id: t.id, 
          taskCode: t.taskCode, 
          status: t.status,
          isActive: t.isActive 
        })));
      }
    },
    onError: (error) => {
      console.error('[ProjectDetailDrawer] GET_TASKS error:', error);
    }
  });

  // Fetch available users
  const { data: usersData } = useQuery(GET_AVAILABLE_USERS, {
    fetchPolicy: "no-cache",
  });

  // Fetch work types with task types
  const { data: workTypesData } = useQuery(GET_WORK_TYPES, {
    fetchPolicy: "no-cache",
  });
  const [updateProject] = useMutation(UPDATE_PROJECT, {
    fetchPolicy: 'no-cache',
    onCompleted: () => {
      // Evict cache
      client.cache.evict({ fieldName: 'project' });
      client.cache.evict({ fieldName: 'tasks' });
      client.cache.gc();
      message.success("Project notes updated");
      refetch();
    },
    onError: (error) => message.error(error.message),
  });
  const [updateClient] = useMutation(UPDATE_CLIENT, {
    fetchPolicy: 'no-cache',
    onCompleted: () => {
      // Evict cache
      client.cache.evict({ fieldName: 'project' });
      client.cache.evict({ fieldName: 'client' });
      client.cache.gc();
      message.success("Client notes updated");
      refetch();
    },
    onError: (error) => message.error(error.message),
  });


  // Fetch combined audit logs for project and all its tasks (like Jira ticket history)
  const {
    data: auditData,
    loading: auditLoading,
    refetch: refetchAudit,
  } = useQuery(GET_PROJECT_AUDIT_HISTORY, {
    variables: { projectId },
    skip: !projectId,
    fetchPolicy: "no-cache",
  });

  // Mutations - Using cache eviction and refetchQueries to ensure updates reflect
  const project = data?.project;
  const tasks = tasksData?.tasks?.tasks || [];
  
  // Update drawer title when project loads
  useEffect(() => {
    if (project) {
      const statusConfig = STATUS_MAP[project.status?.toUpperCase()] || {};
      const titleElement = (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingRight: 24 }}>
          <Space size="middle">
            <span>{project.projectCode}</span>
            <span style={{ color: '#8c8c8c', fontWeight: 'normal' }}>|</span>
            <span style={{ fontWeight: 'normal' }}>{project.name}</span>
            <Tag color={statusConfig.color || 'blue'}>
              {statusConfig.label || project.status}
            </Tag>
          </Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              refetch();
              refetchTasks();
              refetchAudit();
            }}
            size="small"
          >
            Refresh
          </Button>
        </div>
      );
      updateProjectDetailDrawerTitle(titleElement);
    }
  }, [project, updateProjectDetailDrawerTitle]);
  const [projectNotesInput, setProjectNotesInput] = useState("");
    const [clientNotesInput, setClientNotesInput] = useState("");

    React.useEffect(() => {
      setProjectNotesInput(project?.notes || "");
      const clientNotesFromTasks = Array.isArray(tasks) && tasks.length > 0
        ? (tasks[0]?.project?.client?.clientNotes || tasks[0]?.clientNotes)
        : null;
      setClientNotesInput(clientNotesFromTasks || "");
    }, [project?.notes, tasks]);

    const handleUpdateNotes = async () => {
      try {
        const mutations = [];
        if (project?.id) {
          mutations.push(updateProject({ variables: { id: project.id, input: { notes: projectNotesInput } } }));
        }
        const clientId = project?.client?.id || (tasks[0]?.project?.client?.id);
        if (clientId) {
          mutations.push(updateClient({ variables: { id: clientId, input: { clientNotes: clientNotesInput } } }));
        }
        await Promise.all(mutations);
        message.success("Notes updated successfully");
        refetch();
        refetchTasks();
      } catch (e) {
        message.error(`Failed to update notes: ${e.message}`);
      }
    };
  const users = usersData?.availableUsers || [];
  const allWorkTypes = workTypesData?.workTypes || [];

  // Base columns for TasksTable - show all columns except project/client/dates
  const baseColumns = generateBaseColumns({
    showProjectCode: false, // Hide project column (we're in project detail)
    showClientInfo: false,  // Hide client column (we're in project detail)
    showOrderDate: false,   // Hide order date (shown in header)
    showGrading: true,      // Show grading column (multiple gradings per project)
    showPriority: true,     // Show priority
  });

  // Generate folder name matching ProjectManagement format
  const generateFolderName = (project) => {
    const parts = [];

    // 1. Project Code
    if (project.projectCode) {
      parts.push(project.projectCode);
    }

    // 2. Project Name
    if (project.name) {
      parts.push(project.name);
    }

    // 3. Grading codes with image quantities
    if (
      project.projectGradings &&
      Array.isArray(project.projectGradings) &&
      project.projectGradings.length > 0
    ) {
      const gradingParts = project.projectGradings
        .filter((pg) => pg.grading && pg.imageQuantity)
        .map((pg) => {
          let code = pg.grading.shortCode;
          if (!code && pg.grading.name) {
            code = pg.grading.name.replace(/\s+/g, "-");
          }
          if (!code) {
            code = "GR";
          }
          return `${code}-${pg.imageQuantity}`;
        })
        .join("_");
      if (gradingParts) {
        parts.push(gradingParts + `_${project?.client?.clientCode}`);
      }
    }

    return parts.join(" ");
  };

  // Handler to copy folder name to clipboard
  const handleCopyFolderName = () => {
    if (!project) return;
    const folderName = generateFolderName(project);

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(folderName)
        .then(() => {
          message.success("Folder name copied to clipboard!");
        })
        .catch(() => {
          message.error("Failed to copy folder name");
        });
    } else {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = folderName;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        message.success("Folder name copied to clipboard!");
      } catch (err) {
        message.error("Failed to copy folder name");
      }
      document.body.removeChild(textArea);
    }
  };

  // Structure data for table display using projectWorkTypes
  const getWorkTypeTabsData = () => {
    if (
      !project ||
      !project.projectWorkTypes ||
      project.projectWorkTypes.length === 0
    )
      return [];

    const projectGradings = project.projectGradings || [];
    if (projectGradings.length === 0) return [];

    // Sort projectWorkTypes by workType.sortOrder to maintain BackOffice configuration order
    const sortedProjectWorkTypes = [...project.projectWorkTypes].sort((a, b) => {
      const workTypeA = allWorkTypes.find((wt) => wt.id === a.workTypeId);
      const workTypeB = allWorkTypes.find((wt) => wt.id === b.workTypeId);
      const sortOrderA = workTypeA?.sortOrder ?? 999;
      const sortOrderB = workTypeB?.sortOrder ?? 999;
      
      // Sort by sortOrder first, then by name
      if (sortOrderA !== sortOrderB) {
        return sortOrderA - sortOrderB;
      }
      const nameA = workTypeA?.name || '';
      const nameB = workTypeB?.name || '';
      return nameA.localeCompare(nameB);
    });

    // Create tabs based on sorted projectWorkTypes
    return sortedProjectWorkTypes
      .map((projectWorkType) => {
        const workTypeId = projectWorkType.workTypeId;
        const workTypeName = projectWorkType.workType?.name || "Unknown";

        // Find the full work type configuration with task types
        const fullWorkType = allWorkTypes.find((wt) => wt.id === workTypeId);
        const taskTypes = fullWorkType?.taskTypes || [];

        // Get all gradings for this project (we'll show all gradings in each work type tab)
        const gradings = projectGradings
          .map((projectGrading) => {
            const grading = projectGrading.grading;
            if (!grading) return null;

            // Get all tasks for this grading, organized by task type
            const tasksByType = {};
            // Match tasks to current grading via gradingTask.grading.id
            const gradingTasks = tasks.filter((task) => {
              const taskGradingId = task.gradingTask?.grading?.id;
              return taskGradingId === grading.id;
            });

            // Organize tasks by task type - only include tasks for this work type
            gradingTasks.forEach((task) => {
              const taskTypeId = task.taskType?.id;
              // Check if this task type belongs to the current work type
              if (taskTypeId && taskTypes.find((tt) => tt.id === taskTypeId)) {
                tasksByType[taskTypeId] = task;
              }
            });

            // Only include this grading if it has tasks for this work type
            if (Object.keys(tasksByType).length === 0) return null;

            // Prefer shortCode from tasks.project.projectGradings for the matching grading
            // Prefer task.gradingTask.grading.shortCode; fallback to tasks.project.projectGradings[].grading.shortCode
            const shortCodeFromTasks = gradingTasks
              .map((task) => {
                const direct = task.gradingTask?.grading?.shortCode || null;
                if (direct) return direct;
                const pg = task.project?.projectGradings || [];
                const match = pg.find((g) => g.grading?.id === grading.id);
                return match?.grading?.shortCode || null;
              })
              .find((code) => !!code);

            // Get dueDate from first task (tasks have dueDate field)
            const firstTask = gradingTasks[0];
            const taskDueDate = firstTask?.dueDate || null;

            return {
              gradingId: grading.id,
              gradingName: grading.name || null,
              gradingShortCode: shortCodeFromTasks || grading.shortCode || null,
              imageQuantity: projectGrading.imageQuantity,
              estimatedCost: projectGrading.estimatedCost,
              actualCost: projectGrading.actualCost,
              tasksByType,
              // Add project-level fields for columns from main project query
              projectId: project.id,
              orderDate: project.createdAt, // Use createdAt as orderDate (like main TaskTable)
              dueDate: taskDueDate, // Get dueDate from task (tasks have dueDate, not projects)
              priority: project.priority,
            };
          })
          .filter(Boolean); // Remove null gradings

        // Only return work type if it has gradings with tasks
        if (gradings.length === 0) return null;

        return {
          workTypeId,
          workTypeName,
          taskTypes,
          gradings,
        };
      })
      .filter(Boolean); // Remove null work types
  };

  const workTypeTabs = getWorkTypeTabsData() || [];

  if (loading || tasksLoading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error Loading Project"
        description={error.message}
        type="error"
        showIcon
      />
    );
  }

  if (!project) {
    return <Empty description="Project not found" />;
  }

  const totalTasks = tasks.length || 0;
  const completedTasks = tasks.filter(
    (task) => task.status === "completed"
  ).length;
  const totalImages = project.totalImageQuantity || project.imageQuantity || 0;
  const completedImages = tasks.reduce(
    (sum, task) => sum + (task.completedImageQuantity || 0),
    0
  );

  return (
    <div style={{ padding: "0" }}>
      {/* Project Statistics */}
      {/* <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Total Tasks"
              value={totalTasks}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Completed"
              value={completedTasks}
              suffix={`/ ${totalTasks}`}
              valueStyle={{ color: "#3f8600" }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Total Images"
              value={totalImages}
              prefix={<FileImageOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Completed Images"
              value={completedImages}
              suffix={`/ ${totalImages}`}
              valueStyle={{ color: "#3f8600" }}
              prefix={<FileImageOutlined />}
            />
          </Card>
        </Col>
      </Row> */}

      {/* Project Details Card */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 12]}>
          {/* Client Row */}
          <Col span={24}>
            <Space>
              <Text strong>Client:</Text>
              <Text>
                {project.client?.displayName} ({project.client?.clientCode})
              </Text>
            </Space>
          </Col>

          {/* Dates Row */}
          <Col span={8}>
            <Space>
              <CalendarOutlined style={{ color: "#1890ff" }} />
              <Text strong>Order Date:</Text>
              <Text>
                {project.createdAt
                  ? dayjs(project.createdAt).format("DD-MM-YYYY")
                  : "-"}
              </Text>
            </Space>
          </Col>
          <Col span={8}>
            <Space>
              <ClockCircleOutlined style={{ color: "#faad14" }} />
              <Text strong>Due Date:</Text>
              <Text>
                {tasks[0]?.dueDate
                  ? dayjs(tasks[0].dueDate).format("DD-MM-YYYY")
                  : "-"}
              </Text>
            </Space>
          </Col>
          <Col span={8}>
            <Space>
              <CalendarOutlined style={{ color: "#52c41a" }} />
              <Text strong>Deadline:</Text>
              <Text>
                {project.deadlineDate
                  ? dayjs(project.deadlineDate).format("DD-MM-YYYY")
                  : "-"}
              </Text>
            </Space>
          </Col>

          {/* Folder Name Row */}
          <Col span={24}>
            <Space>
              <FolderOutlined />
              <Text strong>Folder Name:</Text>
              <Space size={4}>
                <Tooltip title="Copy folder name">
                  <Button
                    type="text"
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={handleCopyFolderName}
                    style={{ padding: "0 4px" }}
                  />
                </Tooltip>
                <Text copyable>{generateFolderName(project)}</Text>
              </Space>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Notes Section */}
      <Card title={<Title level={4}>Notes</Title>} size="small" style={{ marginBottom: 16 }}>
        <Row gutter={12}>
          <Col span={12}>
            <Text strong>Project Internal Notes:</Text>
            <Input.TextArea
              rows={4}
              value={projectNotesInput}
              onChange={(e) => setProjectNotesInput(e.target.value)}
              placeholder="Enter project internal notes"
            />
          </Col>
          <Col span={12}>
            <Text strong>Client Notes:</Text>
            <Input.TextArea
              rows={4}
              value={clientNotesInput}
              onChange={(e) => setClientNotesInput(e.target.value)}
              placeholder="Enter client notes"
            />
          </Col>
        </Row>
        <div style={{ marginTop: 12, textAlign: 'right' }}>
          <Button type="primary" onClick={handleUpdateNotes}>
            Update Notes
          </Button>
        </div>
      </Card>

      {/* Work Types Tables */}
      {workTypeTabs.length === 0 ? (
        <Card
          title={<Title level={4}>Tasks by Work Type & Grading</Title>}
          size="small"
        >
          <Empty description="No tasks found for this project" />
        </Card>
      ) : (
        workTypeTabs.map((workType, index) => {
          const totalTaskCount = Array.isArray(workType?.gradings)
            ? workType.gradings.reduce((sum, g) => {
                return sum + Object.keys(g?.tasksByType || {}).length;
              }, 0)
            : 0;

          return (
            <Card
              key={index}
              title={
                <Space>
                  <Title level={4} style={{ margin: 0 }}>
                    {workType.workTypeName}
                  </Title>
                  <Tag color="blue">{totalTaskCount} tasks</Tag>
                </Space>
              }
              size="small"
              style={{ marginBottom: 16 }}
            >
              <TasksTable
                dataSource={workType.gradings || []}
                columns={baseColumns}
                taskTypes={workType.taskTypes || []}
                users={users}
                projectId={projectId}
                refetchQueries={[
                  {
                    query: GET_TASKS,
                    variables: {
                      filters: { 
                        projectId: projectId,
                        statuses: ["TODO", "IN_PROGRESS", "REVIEW", "REVISION", "COMPLETED", "CANCELLED", "ON_HOLD"],
                        includeInactive: true
                      },
                      page: 1,
                      limit: 1000,
                      sortBy: "createdAt",
                      sortOrder: "DESC",
                    },
                  },
                ]}
              />
            </Card>
          );
        })
      )}

      {/* Audit Logs (History) */}
      <Card
        title={<Title level={4}>Audit History</Title>}
        size="small"
        style={{ marginTop: 16 }}
      >
        <AuditDisplay
          auditLogs={auditData?.projectAuditHistory || []}
          loading={auditLoading}
        />
      </Card>
    </div>
  );
};

export default ProjectDetailDrawer;
