import React, { useState, useCallback } from "react";
import { useQuery, useMutation, useReactiveVar } from "@apollo/client";
import {
  Spin,
  Alert,
  Typography,
  Tag,
  Table,
  Select,
  InputNumber,
  message,
  Space,
  Button,
  Empty,
  Statistic,
  Row,
  Col,
  Card,
  Tooltip,
  Progress,
  Input,
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
  SaveOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
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
import { UPDATE_TASK, GET_TASKS } from "../gql/tasks";
import { GET_WORK_TYPES } from "../graphql/workTypeQueries";
import {
  BULK_CREATE_TASK_ASSIGNMENTS,
  DELETE_TASK_ASSIGNMENT,
  UPDATE_TASK_ASSIGNMENT,
} from "../gql/taskAssignments";
import { GET_PROJECT_AUDIT_HISTORY } from "../gql/auditLogs";
import AuditDisplay from "./common/AuditDisplay.jsx";

const { Title, Text } = Typography;
const { Option } = Select;

// Project status configuration
const STATUS_MAP = {
  DRAFT: { label: "Draft", color: "default" },
  ACTIVE: { label: "Active", color: "green" },
  IN_PROGRESS: { label: "In Progress", color: "processing" },
  REVIEW: { label: "Review", color: "cyan" },
  COMPLETED: { label: "Completed", color: "success" },
  CANCELLED: { label: "Cancelled", color: "error" },
  ON_HOLD: { label: "On Hold", color: "warning" },
  REQUESTED: { label: "Pending Approval", color: "purple" },
};

// Status configuration matching TaskTable
const TASK_STATUS = {
  todo: { label: "To Do", color: "default", icon: <ClockCircleOutlined /> },
  in_progress: {
    label: "In Progress",
    color: "blue",
    icon: <SyncOutlined spin />,
  },
  review: {
    label: "Ready QC",
    color: "purple",
    icon: <ExclamationCircleOutlined />,
  },
  completed: {
    label: "Completed",
    color: "green",
    icon: <CheckCircleOutlined />,
  },
  revision: {
    label: "Re-Open",
    color: "orange",
    icon: <ExclamationCircleOutlined />,
  },
  cancelled: {
    label: "Cancelled",
    color: "red",
    icon: <CloseCircleOutlined />,
  },
  on_hold: { label: "On Hold", color: "gold", icon: <ClockCircleOutlined /> },
};

const ProjectDetailDrawer = ({ projectId }) => {
  const currentUser = useReactiveVar(userCacheVar);
  const [editingCell, setEditingCell] = useState({
    gradingId: null,
    taskTypeId: null,
    field: null,
  });
  const [editedData, setEditedData] = useState({});

  // Fetch project details
  const { data, loading, error, refetch } = useQuery(GET_PROJECT_DETAIL, {
    variables: { id: projectId },
    skip: !projectId,
    fetchPolicy: "cache-and-network",
  });

  // Fetch tasks separately with project filter
  const {
    data: tasksData,
    loading: tasksLoading,
    refetch: refetchTasks,
  } = useQuery(GET_TASKS, {
    variables: {
      filters: { projectId: projectId },
      page: 1,
      limit: 1000,
      sortBy: "createdAt",
      sortOrder: "DESC",
    },
    skip: !projectId,
    fetchPolicy: "cache-and-network",
  });

  // Fetch available users
  const { data: usersData } = useQuery(GET_AVAILABLE_USERS);

  // Fetch work types with task types
  const { data: workTypesData } = useQuery(GET_WORK_TYPES);
  const [updateProject] = useMutation(UPDATE_PROJECT, {
    onCompleted: () => {
      message.success("Project notes updated");
      refetch();
    },
    onError: (error) => message.error(error.message),
  });
  const [updateClient] = useMutation(UPDATE_CLIENT, {
    onCompleted: () => {
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
    fetchPolicy: "cache-and-network",
  });

  // Mutations - Using cache eviction and refetchQueries to ensure updates reflect
  const [updateTask] = useMutation(UPDATE_TASK, {
    refetchQueries: [
      {
        query: GET_TASKS,
        variables: {
          filters: { projectId: projectId },
          page: 1,
          limit: 1000,
          sortBy: "createdAt",
          sortOrder: "DESC",
        },
      },
    ],
    awaitRefetchQueries: true,
    update(cache) {
      // Evict all tasks to force fresh fetch
      cache.evict({ fieldName: "tasks" });
      cache.gc();
    },
    onCompleted: () => {
      message.success("Task updated successfully");
      cancelEditCell();
    },
    onError: (error) => {
      message.error(`Failed to update task: ${error.message}`);
    },
  });

  const [bulkCreateAssignments] = useMutation(BULK_CREATE_TASK_ASSIGNMENTS, {
    refetchQueries: [
      {
        query: GET_TASKS,
        variables: {
          filters: { projectId: projectId },
          page: 1,
          limit: 1000,
          sortBy: "createdAt",
          sortOrder: "DESC",
        },
      },
    ],
    awaitRefetchQueries: true,
    update(cache) {
      // Evict all tasks and taskAssignments to force fresh fetch
      cache.evict({ fieldName: "tasks" });
      cache.evict({ fieldName: "taskAssignments" });
      cache.gc();
    },
    onCompleted: () => {
      message.success("Assignments updated successfully");
      cancelEditCell();
    },
    onError: (error) => {
      message.error(`Failed to update assignments: ${error.message}`);
    },
  });

  const [deleteAssignment] = useMutation(DELETE_TASK_ASSIGNMENT, {
    refetchQueries: [
      {
        query: GET_TASKS,
        variables: {
          filters: { projectId: projectId },
          page: 1,
          limit: 1000,
          sortBy: "createdAt",
          sortOrder: "DESC",
        },
      },
    ],
    awaitRefetchQueries: true,
    update(cache) {
      // Evict all tasks and taskAssignments to force fresh fetch
      cache.evict({ fieldName: "tasks" });
      cache.evict({ fieldName: "taskAssignments" });
      cache.gc();
    },
  });

  const [updateTaskAssignment] = useMutation(UPDATE_TASK_ASSIGNMENT, {
    refetchQueries: [
      {
        query: GET_TASKS,
        variables: {
          filters: { projectId: projectId },
          page: 1,
          limit: 1000,
          sortBy: "createdAt",
          sortOrder: "DESC",
        },
      },
    ],
    awaitRefetchQueries: true,
    update(cache) {
      // Evict all tasks and taskAssignments to force fresh fetch
      cache.evict({ fieldName: "tasks" });
      cache.evict({ fieldName: "taskAssignments" });
      cache.gc();
    },
    onCompleted: () => {
      message.success("Completed quantity updated successfully");
      cancelEditCell();
    },
    onError: (error) => {
      message.error(`Failed to update assignment: ${error.message}`);
    },
  });

  const project = data?.project;
  const tasks = tasksData?.tasks?.tasks || [];
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

  // Inline editing helpers
  const isEditingCell = useCallback(
    (gradingId, taskTypeId, field) => {
      return (
        editingCell.gradingId === gradingId &&
        editingCell.taskTypeId === taskTypeId &&
        editingCell.field === field
      );
    },
    [editingCell]
  );

  const startEditCell = useCallback(
    (gradingId, taskTypeId, field, initialValue) => {
      setEditingCell({ gradingId, taskTypeId, field });
      setEditedData({ [field]: initialValue });
    },
    []
  );

  const cancelEditCell = useCallback(() => {
    setEditingCell({ gradingId: null, taskTypeId: null, field: null });
    setEditedData({});
  }, []);

  const saveTaskCell = async (task, field) => {
    try {
      if (field === "assignees") {
        // Handle multiple user assignments
        const currentAssignments = task.taskAssignments || [];
        const currentUserIds = currentAssignments.map((a) => a.userId);
        const newUserIds = editedData.assignees || [];

        const usersToAdd = newUserIds.filter(
          (id) => !currentUserIds.includes(id)
        );
        const usersToRemove = currentAssignments.filter(
          (a) => !newUserIds.includes(a.userId)
        );

        // Delete removed assignments
        for (const assignment of usersToRemove) {
          await deleteAssignment({ variables: { id: assignment.id } });
        }

        // Create new assignments
        if (usersToAdd.length > 0) {
          const taskImageQty = task.imageQuantity || 0;
          const numUsers = newUserIds.length;
          const qtyPerUser =
            numUsers > 0 ? Math.floor(taskImageQty / numUsers) : 0;

          const assignmentInputs = usersToAdd.map((userId) => ({
            taskId: task.id,
            userId,
            imageQuantity: qtyPerUser,
            notes: null,
          }));

          await bulkCreateAssignments({
            variables: { inputs: assignmentInputs },
          });
        }

        cancelEditCell();
        return;
      } else if (field === "completedQty") {
        // Update task assignment completed quantity
        const userAssignment = task.taskAssignments?.[0];
        if (!userAssignment) {
          message.error("No assignment found");
          cancelEditCell();
          return;
        }

        await updateTaskAssignment({
          variables: {
            id: userAssignment.id,
            input: { completedImageQuantity: editedData.completedQty },
          },
        });
        return;
      } else if (field === "status") {
        await updateTask({
          variables: {
            id: task.id,
            input: { status: editedData.status },
          },
        });
        return;
      }
    } catch (error) {
      console.error("Error saving task:", error);
      message.error(`Failed to update task: ${error.message}`);
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

    // Create tabs based on projectWorkTypes (not grading.workType which is null)
    return project.projectWorkTypes
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
            const gradingTasks = tasks.filter((task) => {
              const taskGradingId =
                task.gradingTask?.grading?.id || task.gradingTask?.gradingId;
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

            return {
              gradingId: grading.id,
              gradingName: grading.name,
              gradingShortCode: grading.shortCode,
              imageQuantity: projectGrading.imageQuantity,
              estimatedCost: projectGrading.estimatedCost,
              actualCost: projectGrading.actualCost,
              tasksByType,
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

  // Generate columns for work type table (similar to TaskTable)
  const generateColumnsForWorkType = (workType) => {
    // Sort task types by the order field from WorkTypeTask junction table
    const taskTypes = Array.isArray(workType?.taskTypes)
      ? [...workType.taskTypes].sort((a, b) => {
          const orderA = a.WorkTypeTask?.order ?? 0;
          const orderB = b.WorkTypeTask?.order ?? 0;
          return orderA - orderB;
        })
      : [];

    const baseColumns = [
      {
        title: "Grading / Qty",
        dataIndex: "gradingName",
        key: "grading",
        width: 150,
        fixed: "left",
        render: (name, record) => (
          <div style={{ fontSize: 12 }}>
            <div style={{ fontWeight: 500 }}>
              {record.gradingShortCode || record.gradingName || "-"}
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>
              ({record.imageQuantity || 0})
            </Text>
          </div>
        ),
      },
    ];

    // Dynamic task type columns
    const taskColumns = taskTypes.flatMap((taskType) => [
      {
        title: (
          <div style={{ textAlign: "center" }}>
            <Tag color={taskType.color || "default"}>{taskType.name}</Tag>
          </div>
        ),
        className: "task-type-column-group",
        children: [
          {
            title: "Status",
            key: `task-${taskType.id}-status`,
            width: 110,
            align: "center",
            onCell: () => ({
              style: { backgroundColor: `${taskType.color || "#d9d9d9"}20` },
            }),
            render: (_, record) => {
              const task = record.tasksByType[taskType.id];
              if (!task) return <Text type="secondary">-</Text>;

              const isEditing = isEditingCell(
                record.gradingId,
                taskType.id,
                "status"
              );

              if (isEditing) {
                return (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{ padding: "4px 0" }}
                  >
                    <Space
                      direction="vertical"
                      size={4}
                      style={{ width: "100%" }}
                    >
                      <Select
                        size="small"
                        value={editedData.status || task.status}
                        onChange={(value) =>
                          setEditedData({ ...editedData, status: value })
                        }
                        style={{ width: "100%" }}
                      >
                        {Object.keys(TASK_STATUS).map((status) => (
                          <Option key={status} value={status}>
                            <Tag
                              color={TASK_STATUS[status].color}
                              icon={TASK_STATUS[status].icon}
                            >
                              {TASK_STATUS[status].label}
                            </Tag>
                          </Option>
                        ))}
                      </Select>
                      <Space size="small">
                        <Button
                          type="primary"
                          size="small"
                          icon={<SaveOutlined />}
                          onClick={() => saveTaskCell(task, "status")}
                        >
                          Save
                        </Button>
                        <Button
                          size="small"
                          icon={<CloseCircleOutlined />}
                          onClick={cancelEditCell}
                        >
                          Cancel
                        </Button>
                      </Space>
                    </Space>
                  </div>
                );
              }

              return (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    startEditCell(
                      record.gradingId,
                      taskType.id,
                      "status",
                      task.status
                    );
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <Tag
                    color={TASK_STATUS[task.status]?.color}
                    icon={TASK_STATUS[task.status]?.icon}
                  >
                    {TASK_STATUS[task.status]?.label || task.status}
                  </Tag>
                </div>
              );
            },
          },
          {
            title: "Assignees",
            key: `task-${taskType.id}-assignees`,
            width: 150,
            align: "center",
            onCell: () => ({
              style: { backgroundColor: `${taskType.color || "#d9d9d9"}20` },
            }),
            render: (_, record) => {
              const task = record.tasksByType[taskType.id];
              if (!task) return <Text type="secondary">-</Text>;

              const isEditing = isEditingCell(
                record.gradingId,
                taskType.id,
                "assignees"
              );
              const taskAssignments = task.taskAssignments || [];
              const assignedUserIds = taskAssignments.map((a) => a.userId);

              if (isEditing) {
                return (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{ padding: "4px 0" }}
                  >
                    <Space
                      direction="vertical"
                      size={4}
                      style={{ width: "100%" }}
                    >
                      <Select
                        mode="multiple"
                        size="small"
                        value={editedData.assignees || assignedUserIds}
                        onChange={(values) =>
                          setEditedData({ ...editedData, assignees: values })
                        }
                        style={{ width: "100%" }}
                      >
                        {users.map((user) => (
                          <Option key={user.id} value={user.id}>
                            {user.firstName} {user.lastName}
                          </Option>
                        ))}
                      </Select>
                      <Space size="small">
                        <Button
                          type="primary"
                          size="small"
                          icon={<SaveOutlined />}
                          onClick={() => saveTaskCell(task, "assignees")}
                        >
                          Save
                        </Button>
                        <Button
                          size="small"
                          icon={<CloseCircleOutlined />}
                          onClick={cancelEditCell}
                        >
                          Cancel
                        </Button>
                      </Space>
                    </Space>
                  </div>
                );
              }

              if (taskAssignments.length === 0) {
                return (
                  <Button
                    size="small"
                    type="link"
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditCell(
                        record.gradingId,
                        taskType.id,
                        "assignees",
                        []
                      );
                    }}
                    style={{ fontSize: "11px" }}
                  >
                    Assign Users
                  </Button>
                );
              }

              return (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    startEditCell(
                      record.gradingId,
                      taskType.id,
                      "assignees",
                      assignedUserIds
                    );
                  }}
                  style={{ cursor: "pointer" }}
                >
                  {taskAssignments.map((assignment) => (
                    <Tag
                      key={assignment.id}
                      icon={<UserOutlined />}
                      style={{ fontSize: 11 }}
                    >
                      {assignment.user?.firstName} {assignment.user?.lastName}
                    </Tag>
                  ))}
                </div>
              );
            },
          },
          {
            title: "Images",
            key: `task-${taskType.id}-images`,
            width: 100,
            align: "center",
            onCell: () => ({
              style: { backgroundColor: `${taskType.color || "#d9d9d9"}20` },
            }),
            render: (_, record) => {
              const task = record.tasksByType[taskType.id];
              if (!task) return <Text type="secondary">-</Text>;

              const taskAssignments = task.taskAssignments || [];
              const userAssignment = taskAssignments.find(
                (assignment) => assignment.userId === currentUser?.id
              );
              const isAssignedUser = !!userAssignment;

              const totalTaskQty =
                record.imageQuantity || task.imageQuantity || 0;
              const userCompleted = userAssignment?.completedImageQuantity || 0;

              const totalCompleted = taskAssignments.reduce(
                (sum, a) => sum + (a.completedImageQuantity || 0),
                0
              );

              const isEditingImages = isEditingCell(
                record.gradingId,
                taskType.id,
                "completedQty"
              );

              // If editing and user is assigned, show input
              if (isEditingImages && isAssignedUser) {
                return (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{ padding: "4px 0" }}
                  >
                    <Space
                      direction="vertical"
                      size={4}
                      style={{ width: "100%" }}
                    >
                      <InputNumber
                        size="small"
                        min={0}
                        max={totalTaskQty}
                        value={editedData.completedQty}
                        onChange={(value) =>
                          setEditedData({ ...editedData, completedQty: value })
                        }
                        style={{ width: "100%" }}
                        addonAfter={`/${totalTaskQty}`}
                      />
                      <Space size="small">
                        <Button
                          type="primary"
                          size="small"
                          icon={<SaveOutlined />}
                          onClick={() => saveTaskCell(task, "completedQty")}
                        >
                          Save
                        </Button>
                        <Button
                          size="small"
                          icon={<CloseCircleOutlined />}
                          onClick={cancelEditCell}
                        >
                          Cancel
                        </Button>
                      </Space>
                    </Space>
                  </div>
                );
              }

              const displayCompleted = totalCompleted;
              const percentage =
                totalTaskQty > 0
                  ? Math.round((displayCompleted / totalTaskQty) * 100)
                  : 0;

              const tooltipTitle = isAssignedUser
                ? `Click to update your completed quantity (${userCompleted}/${totalTaskQty})`
                : `Total progress: ${totalCompleted}/${totalTaskQty}`;

              return (
                <Tooltip title={tooltipTitle}>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isAssignedUser) {
                        startEditCell(
                          record.gradingId,
                          taskType.id,
                          "completedQty",
                          userCompleted
                        );
                      }
                    }}
                    style={{
                      cursor: isAssignedUser ? "pointer" : "not-allowed",
                      padding: "4px",
                      opacity: isAssignedUser ? 1 : 0.6,
                    }}
                  >
                    <div
                      style={{ fontSize: 11, fontWeight: 500, marginBottom: 2 }}
                    >
                      {displayCompleted} / {totalTaskQty}
                    </div>
                    <Progress
                      percent={percentage}
                      size="small"
                      strokeColor={percentage === 100 ? "#52c41a" : "#1890ff"}
                      showInfo={false}
                    />
                  </div>
                </Tooltip>
              );
            },
          },
        ],
      },
    ]);

    return [...baseColumns, ...taskColumns];
  };

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
      {/* Header with Refresh Button */}
      <div
        style={{
          marginBottom: 16,
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
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

      {/* Project Statistics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
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
      </Row>

      {/* Quick Info Bar */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space
          split={<span style={{ color: "#d9d9d9" }}>|</span>}
          size="large"
          wrap
        >
          <Space>
            <CodeOutlined />
            <Text strong>Project:</Text>
            <Tag color="blue">{project.projectCode}</Tag>
            <Text>{project.name}</Text>
          </Space>
          <Space>
            <FolderOutlined />
            <Text strong>Folder:</Text>
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
          <Space>
            <Text strong>Client:</Text>
            <Text>
              {project.client?.displayName} ({project.client?.clientCode})
            </Text>
          </Space>
          <Space>
            <CalendarOutlined />
            <Text strong>Deadline:</Text>
            <Text>
              {project.deadlineDate
                ? dayjs(project.deadlineDate).format("YYYY-MM-DD")
                : "No deadline"}
            </Text>
          </Space>
          <Space>
            <Text strong>Status:</Text>
            <Tag
              color={
                (STATUS_MAP[project.status?.toUpperCase()] || {}).color ||
                "blue"
              }
            >
              {(STATUS_MAP[project.status?.toUpperCase()] || {}).label ||
                project.status}
            </Tag>
          </Space>
        </Space>
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
              <Table
                dataSource={
                  Array.isArray(workType?.gradings) ? workType.gradings : []
                }
                columns={generateColumnsForWorkType(workType)}
                rowKey="gradingId"
                pagination={false}
                size="small"
                scroll={{ x: "max-content" }}
                bordered
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
