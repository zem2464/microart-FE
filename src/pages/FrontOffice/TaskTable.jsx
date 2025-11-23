import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  Table,
  Card,
  Input,
  Select,
  Tag,
  Button,
  Space,
  DatePicker,
  Progress,
  Tooltip,
  message,
  Drawer,
  Descriptions,
  Row,
  Col,
  Typography,
  Tabs,
  Avatar,
} from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  FilterOutlined,
  UserOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  ExclamationCircleOutlined,
  CloseOutlined,
  EditOutlined,
  SaveOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useReactiveVar } from "@apollo/client";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  GET_TASKS,
  UPDATE_TASK,
  BULK_UPDATE_TASK_STATUS,
  GET_TASKS_DASHBOARD,
} from "../../gql/tasks";
import { GET_AVAILABLE_USERS } from "../../graphql/projectQueries";
import { GET_WORK_TYPES } from "../../graphql/workTypeQueries";
import { GET_GRADINGS_BY_WORK_TYPE } from "../../graphql/gradingQueries";
import TaskCard from "../../components/TaskCard";
import { userCacheVar } from "../../cache/userCacheVar";

dayjs.extend(relativeTime);

const { Option } = Select;
const { Text } = Typography;
const { TabPane } = Tabs;

// Status configuration - matches backend TaskStatus enum
const TASK_STATUS = {
  TODO: { label: "To Do", color: "default", icon: <ClockCircleOutlined /> },
  IN_PROGRESS: {
    label: "In Progress",
    color: "blue",
    icon: <SyncOutlined spin />,
  },
  REVIEW: {
    label: "Ready QC",
    color: "purple",
    icon: <ExclamationCircleOutlined />,
  },
  COMPLETED: {
    label: "Completed",
    color: "green",
    icon: <CheckCircleOutlined />,
  },
};

// Priority colors - A=High(Red), B=Medium(Orange), C=Low(Green)
const PRIORITY_COLORS = {
  A: "red", // High priority
  B: "orange", // Medium priority
  C: "green", // Low priority
};

const TaskTable = () => {
  const currentUser = useReactiveVar(userCacheVar);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("active"); // Default to 'active' to hide completed
  const [userFilter, setUserFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [selectedWorkTypeId, setSelectedWorkTypeId] = useState("all");
  const [gradingFilter, setGradingFilter] = useState("all");
  // Infinite scroll state
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const scrollContainerRef = useRef(null);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("DESC");

  // Editing states for inline editing
  const [editingCell, setEditingCell] = useState({
    projectId: null,
    taskTypeId: null,
    field: null,
  });
  const [editedData, setEditedData] = useState({});
  const [isInlineUpdating, setIsInlineUpdating] = useState(false);

  // Drawer states
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskDrawerVisible, setTaskDrawerVisible] = useState(false);

  // Build filters for server-side filtering
  const buildFilters = useCallback(() => {
    const filters = {};

    if (statusFilter && statusFilter !== "all") {
      if (statusFilter === "active") {
        // For active, exclude COMPLETED and CANCELLED
        filters.statuses = [
          "TODO",
          "IN_PROGRESS",
          "REVIEW",
          "REVISION",
          "ON_HOLD",
        ];
      } else {
        filters.status = statusFilter;
      }
    }

    if (userFilter && userFilter !== "all") {
      if (userFilter === "assignedToMe") {
        filters.assigneeId = currentUser?.id;
      } else if (userFilter === "unassigned") {
        filters.assigneeId = null;
      } else {
        filters.assigneeId = userFilter;
      }
    }

    if (priorityFilter && priorityFilter !== "all") {
      filters.priority = priorityFilter;
    }

    // Filter by workTypeId when a specific tab is selected
    // This now works because backend properly filters via ProjectWorkType junction table
    if (selectedWorkTypeId && selectedWorkTypeId !== "all") {
      filters.workTypeId = selectedWorkTypeId;
    }

    if (gradingFilter && gradingFilter !== "all") {
      filters.gradingId = gradingFilter;
    }

    return filters;
  }, [
    statusFilter,
    userFilter,
    priorityFilter,
    selectedWorkTypeId,
    gradingFilter,
    currentUser?.id,
  ]);

  // Fetch tasks with server-side filtering, pagination and sorting
  const {
    data: tasksData,
    loading: tasksLoading,
    refetch: refetchTasks,
    fetchMore,
  } = useQuery(GET_TASKS, {
    variables: {
      filters: buildFilters(),
      page: 1,
      limit: 50,
      sortBy: sortBy,
      sortOrder: sortOrder,
      search: searchText || undefined,
    },
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
  });

  // Fetch users
  const { data: usersData } = useQuery(GET_AVAILABLE_USERS, {
    fetchPolicy: "cache-first",
  });

  // Fetch all worktypes for tabs
  const { data: worktypesData, refetch: refetchWorkTypes } = useQuery(GET_WORK_TYPES, {
    fetchPolicy: "cache-and-network",
  });

  // Fetch dashboard stats
  const { data: dashboardData } = useQuery(GET_TASKS_DASHBOARD, {
    fetchPolicy: "cache-and-network",
  });

  // Fetch gradings for selected worktype
  const { data: gradingsData, refetch: refetchGradings } = useQuery(
    GET_GRADINGS_BY_WORK_TYPE,
    {
      variables: {
        workTypeIds:
          selectedWorkTypeId && selectedWorkTypeId !== "all"
            ? [selectedWorkTypeId]
            : [],
      },
      skip: !selectedWorkTypeId || selectedWorkTypeId === "all",
      fetchPolicy: "cache-and-network",
    }
  );

  // Update task mutation
  const [updateTask, { loading: updateTaskLoading }] = useMutation(
    UPDATE_TASK,
    {
      onCompleted: async () => {
        message.success("Task updated successfully");
        setIsInlineUpdating(true);
        await refetchTasks();
        setIsInlineUpdating(false);
        setEditedData({});
      },
      onError: (error) => {
        message.error(`Failed to update task: ${error.message}`);
        setIsInlineUpdating(false);
      },
    }
  );

  // Bulk update mutation
  const [bulkUpdateTaskStatus] = useMutation(BULK_UPDATE_TASK_STATUS, {
    onCompleted: () => {
      message.success("Tasks updated successfully");
      refetchTasks();
    },
    onError: (error) => {
      message.error(`Failed to update tasks: ${error.message}`);
    },
  });

  // Refetch tasks when filters change
  useEffect(() => {
    refetchTasks();
  }, [
    statusFilter,
    userFilter,
    priorityFilter,
    selectedWorkTypeId,
    gradingFilter,
    searchText,
    sortBy,
    sortOrder,
    refetchTasks,
  ]);

  // Reset grading filter when worktype changes
  useEffect(() => {
    setGradingFilter("all");
  }, [selectedWorkTypeId]);

  // Normalize tasks array from GraphQL response
  const allTasks = tasksData?.tasks?.tasks || [];

  // Check if there are more items to load (same as ProjectManagement)
  useEffect(() => {
    if (tasksData?.tasks?.pagination) {
      const { page: currentPage, totalPages } = tasksData.tasks.pagination;
      setHasMore(currentPage < totalPages);
    }
  }, [tasksData]);

  // Load more data for infinite scroll (same pattern as ProjectManagement)
  const loadMore = async () => {
    if (isLoadingMore || !hasMore || tasksLoading) return;

    setIsLoadingMore(true);
    try {
      await fetchMore({
        variables: {
          filters: buildFilters(),
          page: page + 1,
          limit: 50,
          sortBy: sortBy,
          sortOrder: sortOrder,
          search: searchText || undefined,
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev;

          const prevTasks = prev?.tasks?.tasks || [];
          const newTasks = fetchMoreResult?.tasks?.tasks || [];

          return {
            ...fetchMoreResult,
            tasks: {
              ...fetchMoreResult.tasks,
              tasks: [...prevTasks, ...newTasks],
            },
          };
        },
      });
      setPage(page + 1);
    } catch (error) {
      console.error("Error loading more tasks:", error);
      message.error("Failed to load more tasks");
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Handle scroll event for infinite scroll (same as ProjectManagement)
  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    // Trigger load more when scrolled to 80% of the content
    if (scrollHeight - scrollTop <= clientHeight * 1.2) {
      loadMore();
    }
  };

  const tasks = allTasks;
  const users = usersData?.availableUsers || [];
  const worktypes = worktypesData?.workTypes || [];

  // Reset page when filters / search / sorting changes
  useEffect(() => {
    setPage(1);
    refetchTasks({
      filters: buildFilters(),
      page: 1,
      limit: 50,
      sortBy: sortBy,
      sortOrder: sortOrder,
      search: searchText || undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    statusFilter,
    userFilter,
    priorityFilter,
    selectedWorkTypeId, // Re-enabled - backend now properly filters via ProjectWorkType
    gradingFilter,
    searchText,
    sortBy,
    sortOrder,
  ]);

  // Group tasks by worktype, then by project
  // NEW STRUCTURE: worktype -> project -> tasks (with taskType info)
  const groupedByWorkType = useMemo(() => {
    const grouped = {};

    console.log(
      "Grouping tasks:",
      tasks.length,
      "tasks",
      "Selected worktype:",
      selectedWorkTypeId
    );

    tasks.forEach((task) => {
      // Since backend filters by worktype, all tasks should be for selected worktype
      // Use selectedWorkTypeId directly
      const workTypeId = selectedWorkTypeId;
      const projectId = task.project?.id;

      console.log(
        "Task:",
        task.taskCode,
        "ProjectId:",
        projectId,
        "TaskType:",
        task.taskType?.name
      );

      if (!projectId) return;

      // Initialize worktype group
      if (!grouped[workTypeId]) {
        grouped[workTypeId] = {
          workTypeId,
          workTypeName: task.project?.workType?.name || "Work Type",
          workType: task.project?.workType,
          projects: {},
          taskTypes: {}, // Track unique task types for this worktype
        };
      }

      // Initialize project within worktype
      if (!grouped[workTypeId].projects[projectId]) {
        grouped[workTypeId].projects[projectId] = {
          projectId,
          project: task.project,
          tasks: {}, // Keyed by taskTypeId
          tasksList: [], // All tasks as array
        };
      }

      // Add task to project
      const taskTypeId = task.taskType?.id || "no-tasktype";
      grouped[workTypeId].projects[projectId].tasks[taskTypeId] = task;
      grouped[workTypeId].projects[projectId].tasksList.push(task);

      // Track task type for this worktype
      if (task.taskType) {
        grouped[workTypeId].taskTypes[taskTypeId] = task.taskType;
      }
    });

    console.log("Grouped by worktype:", Object.keys(grouped), grouped);

    return grouped;
  }, [tasks, selectedWorkTypeId]);

  // Convert grouped data to table format for each worktype
  const tableDataByWorkType = useMemo(() => {
    const result = {};

    Object.entries(groupedByWorkType).forEach(([workTypeId, workTypeData]) => {
      const rows = [];

      // Get task types from worktype configuration (already ordered by backend)
      const worktypeConfig = worktypes.find(
        (wt) => String(wt.id) === String(workTypeId)
      );
      const taskTypes = worktypeConfig?.taskTypes || [];

      // Create a row for each project - if project has multiple gradings, create multiple rows
      Object.values(workTypeData.projects).forEach((projectData) => {
        const project = projectData.project;

        // Get earliest due date across all tasks
        const dueDates = projectData.tasksList
          .map((t) => t.dueDate)
          .filter(Boolean)
          .sort((a, b) => new Date(a) - new Date(b));
        const earliestDueDate = dueDates[0];

        // Overall project status based on all tasks
        const statusCounts = {
          TODO: 0,
          IN_PROGRESS: 0,
          REVIEW: 0,
          REVISION: 0,
          COMPLETED: 0,
          CANCELLED: 0,
          ON_HOLD: 0,
        };

        projectData.tasksList.forEach((task) => {
          const status = (task.status || "TODO").toUpperCase();
          if (statusCounts[status] !== undefined) {
            statusCounts[status]++;
          }
        });

        const totalTasks = projectData.tasksList.length;
        const completedTasks = statusCounts.COMPLETED;
        const progress =
          totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        // Filter project gradings to only include those belonging to the selected worktype
        const allGradings = project.projectGradings || [];
        console.log(
          `Project ${project.projectCode} has ${allGradings.length} total gradings:`,
          allGradings.map((pg) => ({
            name: pg.grading?.name,
            workTypeId: pg.grading?.workType?.id,
            workTypeName: pg.grading?.workType?.name,
          }))
        );

        const gradings = allGradings.filter((pg) => {
          const gradingWorkTypeId = pg.grading?.workType?.id;
          const matches =
            gradingWorkTypeId &&
            String(gradingWorkTypeId) === String(workTypeId);
          console.log(
            `  Grading ${pg.grading?.name}: workTypeId=${gradingWorkTypeId}, currentTab=${workTypeId}, matches=${matches}`
          );
          // Convert both to strings for comparison since workTypeId from tabs is a string
          return matches;
        });

        console.log(
          `After filtering for worktype ${workTypeId}: ${gradings.length} gradings`
        );

        // If project has gradings for this worktype, create a row for each grading
        if (gradings.length > 0) {
          gradings.forEach((grading, idx) => {
            rows.push({
              key: `${workTypeId}-${project.id}-grading-${idx}`,
              projectId: project.id,
              project: project,
              projectCode: project.projectCode || project.projectNumber,
              projectName: project.name,
              clientCode: project.client?.clientCode,
              clientName: project.client?.displayName,
              grading: grading, // Single grading for this row
              gradingName: grading.grading?.name || grading.grading?.shortCode,
              gradingQty: grading.imageQuantity || 0,
              orderDate: project.createdAt,
              dueDate: earliestDueDate,
              priority: project.priority || "B",
              status:
                progress === 100
                  ? "COMPLETED"
                  : totalTasks > 0
                  ? "IN_PROGRESS"
                  : "TODO",
              progress,
              totalTasks,
              completedTasks,
              statusCounts,
              // Tasks mapped by taskTypeId for easy column access
              tasksByType: projectData.tasks,
              allTasks: projectData.tasksList,
            });
          });
        } else {
          // No gradings, create single row
          rows.push({
            key: `${workTypeId}-${project.id}`,
            projectId: project.id,
            project: project,
            projectCode: project.projectCode || project.projectNumber,
            projectName: project.name,
            clientCode: project.client?.clientCode,
            clientName: project.client?.displayName,
            grading: null,
            gradingName: null,
            gradingQty: 0,
            orderDate: project.createdAt,
            dueDate: earliestDueDate,
            priority: project.priority || "B",
            status:
              progress === 100
                ? "COMPLETED"
                : totalTasks > 0
                ? "IN_PROGRESS"
                : "TODO",
            progress,
            totalTasks,
            completedTasks,
            statusCounts,
            // Tasks mapped by taskTypeId for easy column access
            tasksByType: projectData.tasks,
            allTasks: projectData.tasksList,
          });
        }
      });

      result[workTypeId] = {
        workTypeId,
        workTypeName: workTypeData.workTypeName,
        workType: workTypeData.workType,
        taskTypes, // Ordered task types for columns
        rows, // Table data rows
      };
    });

    console.log("Table data by worktype:", Object.keys(result), result);

    return result;
  }, [groupedByWorkType]);

  // Use GET_WORK_TYPES for all available worktypes as tabs
  const allWorkTypeTabs = useMemo(() => {
    const result = {};

    // Create tabs from all available worktypes
    worktypes.forEach((workType) => {
      if (workType.isActive) {
        const workTypeId = workType.id.toString();
        result[workTypeId] = {
          workTypeId,
          workTypeName: workType.name,
          workType: workType,
          taskTypes: workType.taskTypes || [],
          rows: [], // Will be populated from tableDataByWorkType
        };
      }
    });

    // Merge in task data from tableDataByWorkType for all worktypes
    Object.entries(tableDataByWorkType).forEach(
      ([workTypeId, workTypeData]) => {
        if (result[workTypeId]) {
          // Preserve the workTypeName from worktypes query
          const originalName = result[workTypeId].workTypeName;
          result[workTypeId] = {
            ...result[workTypeId],
            ...workTypeData,
            workTypeName: originalName, // Keep the original name from GET_WORK_TYPES
          };
        }
      }
    );

    return result;
  }, [worktypes, tableDataByWorkType]);

  // Set default worktype tab when data loads
  useEffect(() => {
    const workTypeIds = Object.keys(allWorkTypeTabs);
    if (
      workTypeIds.length > 0 &&
      (selectedWorkTypeId === "all" || !allWorkTypeTabs[selectedWorkTypeId])
    ) {
      // Select the first worktype that has tasks, or just the first one
      const firstWithTasks = workTypeIds.find(
        (id) => allWorkTypeTabs[id].rows.length > 0
      );
      setSelectedWorkTypeId(firstWithTasks || workTypeIds[0]);
    }
  }, [allWorkTypeTabs]);

  // Inline editing functions for task cells
  const isEditingCell = (projectId, taskTypeId, field) => {
    return (
      editingCell.projectId === projectId &&
      editingCell.taskTypeId === taskTypeId &&
      editingCell.field === field
    );
  };

  const startEditCell = (projectId, taskTypeId, field, currentValue, e) => {
    e?.stopPropagation();
    setEditingCell({ projectId, taskTypeId, field });
    setEditedData({ [field]: currentValue });
  };

  const cancelEditCell = () => {
    setEditingCell({ projectId: null, taskTypeId: null, field: null });
    setEditedData({});
  };

  const saveTaskCell = async (task, field) => {
    try {
      const input = {};

      if (field === "assigneeId") {
        input.assigneeId = editedData.assigneeId || null;
      } else if (field === "dueDate") {
        input.dueDate = editedData.dueDate
          ? dayjs(editedData.dueDate).toISOString()
          : null;
      } else if (field === "status") {
        input.status = editedData.status;
      }

      await updateTask({
        variables: {
          id: task.id,
          input,
        },
      });

      message.success("Task updated successfully");
      cancelEditCell();
    } catch (error) {
      console.error("Error saving task:", error);
      message.error(`Failed to update task: ${error.message}`);
    }
  };

  // Generate dynamic columns for a worktype's task table
  const generateColumnsForWorkType = (workTypeId) => {
    // Get row data from tableDataByWorkType (filtered by grading)
    const actualData = tableDataByWorkType[workTypeId];

    // Get task types from the worktype configuration (from GET_WORK_TYPES)
    // This ensures we use the proper sequence defined in the worktype
    const worktypeConfig = worktypes.find(
      (wt) => String(wt.id) === String(workTypeId)
    );
    // Sort task types by the order field from WorkTypeTask junction table
    // Create a copy of the array before sorting to avoid mutating the cached data
    const taskTypes = [...(worktypeConfig?.taskTypes || [])].sort((a, b) => {
      const orderA = a.WorkTypeTask?.order ?? 0;
      const orderB = b.WorkTypeTask?.order ?? 0;
      return orderA - orderB;
    });
    console.log("taskTypes", taskTypes);
    if (!actualData || taskTypes.length === 0) return [];

    const baseColumns = [
      {
        title: "Project / Client",
        dataIndex: "projectCode",
        key: "project",
        width: 200,
        fixed: "left",
        render: (text, record) => (
          <div style={{ fontSize: 12 }}>
            <div style={{ color: "#262626", fontWeight: 600, marginBottom: 2 }}>
              {text}
              {record.projectName ? ` - ${record.projectName}` : ""}
            </div>
            <div style={{ color: "#8c8c8c", fontSize: 11 }}>
              {record.clientCode}
              {record.clientName ? ` - ${record.clientName}` : ""}
            </div>
          </div>
        ),
      },
      {
        title: "Grading / Qty",
        key: "grading",
        width: 150,
        render: (_, record) => {
          if (!record.grading) {
            return <Text type="secondary">-</Text>;
          }
          return (
            <div style={{ fontSize: 12 }}>
              <Text style={{ fontWeight: 500 }}>{record.gradingName}</Text>
              <Text type="secondary"> ({record.gradingQty})</Text>
            </div>
          );
        },
      },
      {
        title: "Order Date",
        dataIndex: "orderDate",
        key: "orderDate",
        width: 110,
        render: (date) => (date ? dayjs(date).format("MMM D, YYYY") : "-"),
      },
    ];

    // Dynamic task columns - create grouped columns with Status and Assignee sub-columns
    // Use taskTypes from groupedByWorkType (not actualData) to keep columns consistent
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
            className: "task-type-column",
            width: 130,
            align: "center",
            onCell: () => ({
              style: {
                backgroundColor: `${taskType.color || "#d9d9d9"}20`,
              },
            }),
            render: (_, record) => {
              const task = record.tasksByType[taskType.id];

              if (!task) {
                return <Text type="secondary">-</Text>;
              }

              const isEditingStatus = isEditingCell(
                record.projectId,
                taskType.id,
                "status"
              );

              if (isEditingStatus) {
                return (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{ padding: "4px 0" }}
                  >
                    <Space
                      direction="vertical"
                      size="small"
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
                      record.projectId,
                      taskType.id,
                      "status",
                      task.status
                    );
                  }}
                  style={{ cursor: "pointer", padding: "4px" }}
                >
                  <Tooltip title="Click to edit status">
                    {(() => {
                      const statusKey = (task.status || "TODO").toUpperCase();
                      const statusConfig =
                        TASK_STATUS[statusKey] || TASK_STATUS.TODO;
                      return (
                        <Tag
                          color={statusConfig.color}
                          icon={statusConfig.icon}
                        >
                          {statusConfig.label}
                        </Tag>
                      );
                    })()}
                  </Tooltip>
                </div>
              );
            },
          },
          {
            title: "Assignee",
            key: `task-${taskType.id}-assignee`,
            className: "task-type-column",
            width: 150,
            align: "center",
            onCell: () => ({
              style: {
                backgroundColor: `${taskType.color || "#d9d9d9"}20`,
              },
            }),
            render: (_, record) => {
              const task = record.tasksByType[taskType.id];

              if (!task) {
                return <Text type="secondary">-</Text>;
              }

              const isEditingAssignee = isEditingCell(
                record.projectId,
                taskType.id,
                "assigneeId"
              );

              if (isEditingAssignee) {
                return (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{ padding: "4px 0" }}
                  >
                    <Space
                      direction="vertical"
                      size="small"
                      style={{ width: "100%" }}
                    >
                      <Select
                        size="small"
                        value={editedData.assigneeId || task.assigneeId}
                        onChange={(value) =>
                          setEditedData({ ...editedData, assigneeId: value })
                        }
                        style={{ width: "100%" }}
                        placeholder="Select assignee"
                        allowClear
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
                          onClick={() => saveTaskCell(task, "assigneeId")}
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
                      record.projectId,
                      taskType.id,
                      "assigneeId",
                      task.assigneeId
                    );
                  }}
                  style={{ cursor: "pointer", padding: "4px" }}
                >
                  <Tooltip title="Click to assign/edit assignee">
                    {task.assignee ? (
                      <Tag icon={<UserOutlined />} color="green">
                        {task.assignee.firstName} {task.assignee.lastName}
                      </Tag>
                    ) : (
                      <Tag icon={<UserOutlined />} color="orange">
                        Unassigned
                      </Tag>
                    )}
                  </Tooltip>
                </div>
              );
            },
          },
        ],
      },
    ]);

    const actionColumns = [
      {
        title: "Due Date",
        dataIndex: "dueDate",
        key: "dueDate",
        width: 150,
        render: (date, record) => {
          const isEditing = isEditingCell(
            record.projectId,
            "dueDate",
            "dueDate"
          );

          if (isEditing) {
            return (
              <div onClick={(e) => e.stopPropagation()}>
                <Space direction="vertical" size="small">
                  <DatePicker
                    size="small"
                    value={
                      editedData.dueDate ? dayjs(editedData.dueDate) : null
                    }
                    onChange={(value) =>
                      setEditedData({ dueDate: value?.toISOString() })
                    }
                    format="MMM D, YYYY"
                  />
                  <Space size="small">
                    <Button
                      type="primary"
                      size="small"
                      icon={<SaveOutlined />}
                      onClick={() => {
                        // Update all tasks in this project row
                        record.allTasks.forEach((task) => {
                          updateTask({
                            variables: {
                              id: task.id,
                              input: { dueDate: editedData.dueDate },
                            },
                          });
                        });
                        message.success("Due date updated for all tasks");
                        cancelEditCell();
                      }}
                    >
                      Save
                    </Button>
                    <Button size="small" onClick={cancelEditCell}>
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
                startEditCell(record.projectId, "dueDate", "dueDate", date);
              }}
              style={{ cursor: "pointer" }}
            >
              <Tooltip title="Click to edit due date">
                {date ? (
                  <span>
                    {dayjs(date).format("MMM D, YYYY")}
                    {dayjs(date).isBefore(dayjs(), "day") && (
                      <Tag color="red" style={{ marginLeft: 4 }}>
                        Overdue
                      </Tag>
                    )}
                  </span>
                ) : (
                  <Text type="secondary">Set date</Text>
                )}
              </Tooltip>
            </div>
          );
        },
      },
      {
        title: "Priority",
        dataIndex: "priority",
        key: "priority",
        width: 100,
        render: (priority) => (
          <Tag color={PRIORITY_COLORS[priority]}>
            {priority === "A" ? "High" : priority === "B" ? "Medium" : "Low"}
          </Tag>
        ),
      },
    ];

    return [...baseColumns, ...taskColumns, ...actionColumns];
  };

  return (
    <div className="task-table-view">
      <div>
        {/* Filters and Summary Stats */}
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={16} align="middle" style={{ marginBottom: 12 }}>
            {/* Summary Stats - Compact Badges */}
            <Col flex="auto">
              <Space size={16}>
                <Space size={4}>
                  <FilterOutlined style={{ fontSize: 16, color: "#1890ff" }} />
                  <Text strong style={{ fontSize: 14 }}>
                    Projects:
                  </Text>
                  <Tag
                    color="blue"
                    style={{ margin: 0, fontSize: 14, padding: "2px 8px" }}
                  >
                    {dashboardData?.tasksDashboard?.totalProjects || 0}
                  </Tag>
                </Space>
                <Space size={4}>
                  <ClockCircleOutlined
                    style={{ fontSize: 16, color: "#faad14" }}
                  />
                  <Text strong style={{ fontSize: 14 }}>
                    Total:
                  </Text>
                  <Tag
                    color="default"
                    style={{ margin: 0, fontSize: 14, padding: "2px 8px" }}
                  >
                    {dashboardData?.tasksDashboard?.totalTasks || tasks.length}
                  </Tag>
                </Space>
                <Space size={4}>
                  <ClockCircleOutlined
                    style={{ fontSize: 16, color: "#d9d9d9" }}
                  />
                  <Text strong style={{ fontSize: 14 }}>
                    To Do:
                  </Text>
                  <Tag
                    color="default"
                    style={{ margin: 0, fontSize: 14, padding: "2px 8px" }}
                  >
                    {dashboardData?.tasksDashboard?.todoTasks || 0}
                  </Tag>
                </Space>
                <Space size={4}>
                  <SyncOutlined style={{ fontSize: 16, color: "#1890ff" }} />
                  <Text strong style={{ fontSize: 14 }}>
                    In Progress:
                  </Text>
                  <Tag
                    color="blue"
                    style={{ margin: 0, fontSize: 14, padding: "2px 8px" }}
                  >
                    {dashboardData?.tasksDashboard?.inProgressTasks || 0}
                  </Tag>
                </Space>
                <Space size={4}>
                  <ExclamationCircleOutlined
                    style={{ fontSize: 16, color: "#722ed1" }}
                  />
                  <Text strong style={{ fontSize: 14 }}>
                    Ready QC:
                  </Text>
                  <Tag
                    color="purple"
                    style={{ margin: 0, fontSize: 14, padding: "2px 8px" }}
                  >
                    {dashboardData?.tasksDashboard?.reviewTasks || 0}
                  </Tag>
                </Space>
                <Space size={4}>
                  <CheckCircleOutlined
                    style={{ fontSize: 16, color: "#52c41a" }}
                  />
                  <Text strong style={{ fontSize: 14 }}>
                    Completed:
                  </Text>
                  <Tag
                    color="green"
                    style={{ margin: 0, fontSize: 14, padding: "2px 8px" }}
                  >
                    {dashboardData?.tasksDashboard?.completedTasks || 0}
                  </Tag>
                </Space>
                <Space size={4}>
                  <ClockCircleOutlined
                    style={{ fontSize: 16, color: "#ff4d4f" }}
                  />
                  <Text strong style={{ fontSize: 14 }}>
                    Overdue:
                  </Text>
                  <Tag
                    color="red"
                    style={{ margin: 0, fontSize: 14, padding: "2px 8px" }}
                  >
                    {dashboardData?.tasksDashboard?.overdueTasks || 0}
                  </Tag>
                </Space>
              </Space>
            </Col>
          </Row>
          <Row gutter={16} align="middle">
            <Col span={6}>
              <div style={{ marginBottom: 4, fontSize: 12, fontWeight: 500 }}>
                Search
              </div>
              <Input
                placeholder="Search projects, clients..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
              />
            </Col>
            <Col span={3}>
              <div style={{ marginBottom: 4, fontSize: 12, fontWeight: 500 }}>
                Grading
              </div>
              <Select
                placeholder="All Gradings"
                value={gradingFilter}
                onChange={setGradingFilter}
                style={{ width: "100%" }}
                allowClear
              >
                <Option value="all">All Gradings</Option>
                {(gradingsData?.gradingsByWorkType || []).map((grading) => (
                  <Option key={grading.id} value={grading.id}>
                    {grading.name}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col span={3}>
              <div style={{ marginBottom: 4, fontSize: 12, fontWeight: 500 }}>
                Status
              </div>
              <Select
                placeholder="Active"
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: "100%" }}
              >
                <Option value="active">Active</Option>
                <Option value="all">All Status</Option>
                {Object.keys(TASK_STATUS).map((status) => (
                  <Option key={status} value={status}>
                    {TASK_STATUS[status]?.label || status}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col span={3}>
              <div style={{ marginBottom: 4, fontSize: 12, fontWeight: 500 }}>
                User
              </div>
              <Select
                placeholder="All Users"
                value={userFilter}
                onChange={setUserFilter}
                style={{ width: "100%" }}
                allowClear
                showSearch
                filterOption={(input, option) =>
                  option.children.toLowerCase().includes(input.toLowerCase())
                }
              >
                <Option value="all">All Users</Option>
                <Option value="assignedToMe">Assigned to Me</Option>
                <Option value="unassigned">Unassigned Tasks</Option>
                {users.map((user) => (
                  <Option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col span={2}>
              <div style={{ marginBottom: 4, fontSize: 12, fontWeight: 500 }}>
                Priority
              </div>
              <Select
                placeholder="All"
                value={priorityFilter}
                onChange={setPriorityFilter}
                style={{ width: "100%" }}
              >
                <Option value="all">All</Option>
                <Option value="A">High</Option>
                <Option value="B">Med</Option>
                <Option value="C">Low</Option>
              </Select>
            </Col>
            <Col span={1} style={{ textAlign: "right", paddingTop: 20 }}>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  refetchTasks();
                  refetchWorkTypes();
                }}
              />
            </Col>
          </Row>
        </Card>

        {/* Tasks Table - Work Type Tabs */}
        <Card>
          <Tabs
            activeKey={selectedWorkTypeId}
            onChange={setSelectedWorkTypeId}
            type="card"
            items={Object.entries(allWorkTypeTabs).map(
              ([workTypeId, workTypeData]) => {
                // Get the actual task data for the selected worktype from tableDataByWorkType
                const actualData = tableDataByWorkType[workTypeId] || {
                  rows: [],
                  taskTypes: [],
                };
                const rowCount = actualData.rows.length;

                return {
                  key: workTypeId,
                  label: (
                    <span>
                      {workTypeData.workTypeName}
                      {selectedWorkTypeId === workTypeId && (
                        <Tag color="blue" style={{ marginLeft: 8 }}>
                          {rowCount}
                        </Tag>
                      )}
                    </span>
                  ),
                  children: (
                    <div
                      style={{
                        maxHeight: "calc(100vh - 400px)",
                        overflowY: "auto",
                        overflowX: "auto",
                      }}
                    >
                      {tasksLoading && !tasksData ? (
                        <div
                          style={{ textAlign: "center", padding: "48px 16px" }}
                        >
                          <SyncOutlined
                            spin
                            style={{
                              fontSize: "48px",
                              color: "#1890ff",
                              marginBottom: "16px",
                            }}
                          />
                          <Text
                            style={{
                              fontSize: "16px",
                              color: "#595959",
                              display: "block",
                            }}
                          >
                            Loading tasks...
                          </Text>
                        </div>
                      ) : rowCount === 0 ? (
                        <div
                          style={{
                            textAlign: "center",
                            padding: "48px 16px",
                            backgroundColor: "#fafafa",
                            borderRadius: "8px",
                            border: "1px dashed #d9d9d9",
                          }}
                        >
                          <ClockCircleOutlined
                            style={{
                              fontSize: "48px",
                              color: "#bfbfbf",
                              marginBottom: "16px",
                            }}
                          />
                          <Text
                            style={{
                              fontSize: "16px",
                              color: "#595959",
                              display: "block",
                              marginBottom: "8px",
                              fontWeight: 500,
                            }}
                          >
                            No projects for {workTypeData.workTypeName}
                          </Text>
                          <Text style={{ fontSize: "14px", color: "#8c8c8c" }}>
                            Projects will appear here when tasks are assigned to
                            this work type
                          </Text>
                        </div>
                      ) : (
                        <Table
                          bordered
                          columns={generateColumnsForWorkType(workTypeId)}
                          dataSource={actualData.rows}
                          pagination={false}
                          scroll={{ x: "max-content" }}
                          size="small"
                          // loading={updateTaskLoading}
                          rowKey="key"
                          rowClassName={(record, index) => {
                            // Group rows by project and alternate colors
                            const projectIndex = actualData.rows.findIndex(
                              (r) => r.projectId === record.projectId
                            );
                            const uniqueProjectIds = [
                              ...new Set(
                                actualData.rows.map((r) => r.projectId)
                              ),
                            ];
                            const projectGroupIndex = uniqueProjectIds.indexOf(
                              record.projectId
                            );
                            return projectGroupIndex % 2 === 0
                              ? "project-group-even"
                              : "project-group-odd";
                          }}
                        />
                      )}
                    </div>
                  ),
                };
              }
            )}
          />
        </Card>
      </div>
    </div>
  );
};

// Add custom styles for project grouping
const style = document.createElement("style");
style.textContent = `
  .project-group-even {
    background-color: #ffffff !important;
  }
  
  .project-group-odd {
    background-color: #f5f5f5 !important;
  }
  
  .project-group-even:hover,
  .project-group-odd:hover {
    background-color: #e6f7ff !important;
  }
`;
document.head.appendChild(style);

export default TaskTable;
