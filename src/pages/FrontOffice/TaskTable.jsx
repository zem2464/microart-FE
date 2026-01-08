import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Table,
  Card,
  Input,
  InputNumber,
  Select,
  Tag,
  Button,
  Space,
  DatePicker,
  Tooltip,
  message,
  Row,
  Col,
  Typography,
  Tabs,
  Modal,
  Checkbox,
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
  SaveOutlined,
  CloseCircleOutlined,
  PictureOutlined,
  SplitCellsOutlined,
  EditOutlined,
} from "@ant-design/icons";
import TaskCard from "../../components/TaskCard";
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
import { userCacheVar } from "../../cache/userCacheVar";
import { useAppDrawer } from "../../contexts/DrawerContext";
import {
  BULK_CREATE_TASK_ASSIGNMENTS,
  DELETE_TASK_ASSIGNMENT,
  UPDATE_TASK_ASSIGNMENT,
} from "../../gql/taskAssignments";

dayjs.extend(relativeTime);

// Fetch everything in one go; pagination/infinite scroll is removed
// Increased limit to ensure all projects are fetched without pagination restrictions
const TASK_FETCH_LIMIT = 10000;

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
  REVISION: {
    label: "Re-Open",
    color: "orange",
    icon: <ExclamationCircleOutlined />,
  },
};

// Priority colors - A=High(Red), B=Medium(Orange), C=Low(Green)
const PRIORITY_COLORS = {
  A: "red", // High priority
  B: "orange", // Medium priority
  C: "green", // Low priority
};

// Resolve the effective task quantity: task value first, then matching grading on the project, then project total
function getTaskTotalQuantity(task) {
  if (!task) return 0;

  const directQty = task.imageQuantity;
  if (directQty !== null && directQty !== undefined) {
    return Number(directQty) || 0;
  }

  const gradingId = task?.gradingTask?.grading?.id;
  if (gradingId && Array.isArray(task?.project?.projectGradings)) {
    const match = task.project.projectGradings.find((g) => {
      const gid = g.gradingId ?? g.id;
      return String(gid) === String(gradingId);
    });
    if (match && match.imageQuantity !== null && match.imageQuantity !== undefined) {
      return Number(match.imageQuantity) || 0;
    }
  }

  const projectQty = task?.project?.imageQuantity;
  if (projectQty !== null && projectQty !== undefined) {
    return Number(projectQty) || 0;
  }

  return 0;
}

const TaskTable = () => {
  // Drawer context
  const { showProjectDetailDrawerV2, showTaskDetailDrawerV2 } = useAppDrawer();

  const currentUser = useReactiveVar(userCacheVar);
  const [searchText, setSearchText] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [projectSearch, setProjectSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // Show all tasks including completed
  const [userFilter, setUserFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [selectedWorkTypeId, setSelectedWorkTypeId] = useState("all");
  const [gradingFilter, setGradingFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("DESC");
  const [myClientsOnly, setMyClientsOnly] = useState(false);

  // Reset filters to default values
  const handleResetFilters = useCallback(() => {
    setSearchText("");
    setClientSearch("");
    setProjectSearch("");
    setStatusFilter("all");
    setUserFilter("all");
    setPriorityFilter("all");
    setSelectedWorkTypeId("all");
    setGradingFilter("all");
    setSortBy("createdAt");
    setSortOrder("DESC");
    setMyClientsOnly(currentUser?.role?.roleType?.toString()?.toUpperCase()?.includes("SERVICE_PROVIDER") || false);
    message.success("Filters reset to default values");
  }, []);

  // Editing states for inline editing
  const [editingCell, setEditingCell] = useState({
    projectId: null,
    gradingId: null,
    taskTypeId: null,
    field: null,
  });
  const [editedData, setEditedData] = useState({});
  const [isInlineUpdating, setIsInlineUpdating] = useState(false);

  // Assignment quantities modal state
  const [assignQtyModalOpen, setAssignQtyModalOpen] = useState(false);
  const [assignQtyModalTask, setAssignQtyModalTask] = useState(null);
  const [assignQtySelectedUserIds, setAssignQtySelectedUserIds] = useState([]);
  const [assignQtyAllocations, setAssignQtyAllocations] = useState({}); // { [userId]: qty }
  const [assignQtyOriginalUserIds, setAssignQtyOriginalUserIds] = useState([]);
  const [assignQtyOriginalAllocations, setAssignQtyOriginalAllocations] = useState({});

  const openAssignQtyModal = useCallback((task, selectedUserIds) => {
    const totalQty = getTaskTotalQuantity(task);
    const currentAssignments = task?.taskAssignments || [];
    const selectedSet = new Set(selectedUserIds);

    // Prefill allocations: use existing assignment qty if present, else equal split of remaining
    const prefill = {};
    // Sum existing quantities for selected users
    let preSum = 0;
    selectedUserIds.forEach((uid) => {
      const existing = currentAssignments.find((a) => a.userId === uid);
      if (existing && typeof existing.imageQuantity === "number") {
        prefill[uid] = existing.imageQuantity;
        preSum += existing.imageQuantity;
      }
    });

    const toDistribute = Math.max(totalQty - preSum, 0);
    const needAllocation = selectedUserIds.filter((uid) => prefill[uid] === undefined);
    if (needAllocation.length > 0) {
      const base = needAllocation.length > 0 ? Math.floor(toDistribute / needAllocation.length) : 0;
      needAllocation.forEach((uid, idx) => {
        // Put remainder on the first few users
        const remainder = idx < (toDistribute % needAllocation.length) ? 1 : 0;
        prefill[uid] = base + remainder;
      });
    }

    setAssignQtyModalTask(task);
    setAssignQtySelectedUserIds(selectedUserIds);
    setAssignQtyAllocations(prefill);
    // Store original state for change detection (from existing task assignments)
    const originalUserIds = currentAssignments.map(a => a.userId);
    const originalAllocations = {};
    currentAssignments.forEach(a => {
      originalAllocations[a.userId] = a.imageQuantity || 0;
    });
    setAssignQtyOriginalUserIds(originalUserIds);
    setAssignQtyOriginalAllocations(originalAllocations);
    setAssignQtyModalOpen(true);
  }, []);

  const closeAssignQtyModal = useCallback(() => {
    setAssignQtyModalOpen(false);
    setAssignQtyModalTask(null);
    setAssignQtySelectedUserIds([]);
    setAssignQtyAllocations({});
    setAssignQtyOriginalUserIds([]);
    setAssignQtyOriginalAllocations({});
  }, []);

  const assignQtyTotalAllocated = useMemo(() => {
    return assignQtySelectedUserIds.reduce((sum, uid) => sum + (Number(assignQtyAllocations[uid]) || 0), 0);
  }, [assignQtyAllocations, assignQtySelectedUserIds]);

  const assignQtyModalTaskTotal = useMemo(() => getTaskTotalQuantity(assignQtyModalTask), [assignQtyModalTask]);

  // If task had no assignments before opening modal, allow save without further changes
  const isInitialTaskUnassigned = useMemo(() => {
    const existing = assignQtyModalTask?.taskAssignments || [];
    return existing.length === 0;
  }, [assignQtyModalTask]);

  // Check if there are any changes from original state
  const hasAssignQtyChanges = useMemo(() => {
    // Check if user IDs changed
    if (assignQtySelectedUserIds.length !== assignQtyOriginalUserIds.length) {
      return true;
    }
    const currentUserSet = new Set(assignQtySelectedUserIds);
    const originalUserSet = new Set(assignQtyOriginalUserIds);
    for (const uid of assignQtySelectedUserIds) {
      if (!originalUserSet.has(uid)) return true;
    }
    for (const uid of assignQtyOriginalUserIds) {
      if (!currentUserSet.has(uid)) return true;
    }
    
    // Check if allocations changed for any user
    for (const uid of assignQtySelectedUserIds) {
      const currentQty = Number(assignQtyAllocations[uid]) || 0;
      const originalQty = Number(assignQtyOriginalAllocations[uid]) || 0;
      if (currentQty !== originalQty) {
        return true;
      }
    }
    
    return false;
  }, [assignQtySelectedUserIds, assignQtyOriginalUserIds, assignQtyAllocations, assignQtyOriginalAllocations]);

  const handleAssignQtyAutoDistribute = useCallback(() => {
    if (!assignQtyModalTask) return;
    const totalQty = getTaskTotalQuantity(assignQtyModalTask);
    const n = assignQtySelectedUserIds.length || 1;
    const base = Math.floor(totalQty / n);
    const remainder = totalQty % n;
    const next = {};
    assignQtySelectedUserIds.forEach((uid, idx) => {
      next[uid] = base + (idx < remainder ? 1 : 0);
    });
    setAssignQtyAllocations(next);
  }, [assignQtyModalTask, assignQtySelectedUserIds]);

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

  // Fetch tasks with server-side filtering and sorting (single batch)
  const {
    data: tasksData,
    loading: tasksLoading,
    refetch: refetchTasks,
  } = useQuery(GET_TASKS, {
    variables: {
      filters: buildFilters(),
      page: 1,
      limit: TASK_FETCH_LIMIT,
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
  const { data: worktypesData, refetch: refetchWorkTypes } = useQuery(
    GET_WORK_TYPES,
    {
      fetchPolicy: "cache-and-network",
    }
  );

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
      // After mutation, refetch the table data to keep rows consistent
      awaitRefetchQueries: true,
      onCompleted: async (data) => {
        message.success("Task updated successfully");
        // Refetch tasks with the latest filters applied to avoid transient blanks
        await refetchTasks({
          filters: buildFilters(),
          page: 1,
          limit: TASK_FETCH_LIMIT,
          sortBy: sortBy,
          sortOrder: sortOrder,
          search: searchText || undefined,
        });
        setEditedData({});
        cancelEditCell();
        setIsInlineUpdating(false);
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
      // Refetch tasks with the latest filters applied
      refetchTasks({
        filters: buildFilters(),
        page: 1,
        limit: TASK_FETCH_LIMIT,
        sortBy: sortBy,
        sortOrder: sortOrder,
        search: searchText || undefined,
      });
    },
    onError: (error) => {
      message.error(`Failed to update tasks: ${error.message}`);
    },
  });

  // Task assignment mutations
  const [bulkCreateAssignments] = useMutation(BULK_CREATE_TASK_ASSIGNMENTS, {
    onError: (error) => {
      message.error(`Failed to update assignments: ${error.message}`);
    },
  });

  const [deleteAssignment] = useMutation(DELETE_TASK_ASSIGNMENT, {
    onError: (error) => {
      message.error(`Failed to delete assignment: ${error.message}`);
    },
  });

  const [updateTaskAssignment] = useMutation(UPDATE_TASK_ASSIGNMENT, {
    onError: (error) => {
      message.error(`Failed to update assignment: ${error.message}`);
    },
  });

  const handleAssignQtyConfirm = useCallback(async () => {
    if (!assignQtyModalTask) return;
    const task = assignQtyModalTask;
    const selectedIds = assignQtySelectedUserIds;
    const allocations = assignQtyAllocations;

    try {
      // Current assignments
      const currentAssignments = task.taskAssignments || [];
      // Delete users that are no longer selected
      const toRemove = currentAssignments.filter((a) => !selectedIds.includes(a.userId));
      for (const assignment of toRemove) {
        await deleteAssignment({ variables: { id: assignment.id } });
      }

      // Upsert for all selected users
      for (const uid of selectedIds) {
        const qty = Number(allocations[uid]) || 0;
        const existing = currentAssignments.find((a) => a.userId === uid);
        if (existing) {
          await updateTaskAssignment({
            variables: { id: existing.id, input: { imageQuantity: qty } },
          });
        } else {
          await bulkCreateAssignments({
            variables: {
              inputs: [
                {
                  taskId: task.id,
                  userId: uid,
                  imageQuantity: qty,
                  notes: null,
                },
              ],
            },
          });
        }
      }

      message.success("Task assignments updated successfully");
      // Refresh with current query variables (prevents stale cache data)
      await refetchTasks();
      cancelEditCell();
      closeAssignQtyModal();
    } catch (err) {
      console.error("Error updating assignments:", err);
      message.error(`Failed to update assignments: ${err.message}`);
    }
  }, [
    assignQtyModalTask,
    assignQtySelectedUserIds,
    assignQtyAllocations,
    deleteAssignment,
    updateTaskAssignment,
    bulkCreateAssignments,
    refetchTasks,
    buildFilters,
    sortBy,
    sortOrder,
    searchText,
  ]);

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

  // Default "My Clients" filter for service providers
  useEffect(() => {
    const roleType = currentUser?.role?.roleType?.toString()?.toUpperCase();
    if (roleType && roleType.includes("SERVICE_PROVIDER")) {
      setMyClientsOnly(true);
    }
  }, [currentUser]);

  // Normalize tasks array from GraphQL response
  const allTasks = tasksData?.tasks?.tasks || [];

  // No pagination/infinite scroll; fetch all tasks in a single request

  const tasks = allTasks;
  const users = usersData?.availableUsers || [];
  const worktypes = worktypesData?.workTypes || [];

  const getUserDisplayName = useCallback(
    (userId) => {
      const u = users.find((x) => x.id === userId);
      if (!u) return String(userId);
      return `${u.firstName || ""} ${u.lastName || ""}`.trim();
    },
    [users]
  );

  // Filter users based on selected work type
  const filteredUsers = useMemo(() => {
    if (!selectedWorkTypeId || selectedWorkTypeId === "all") {
      return { assignedUsers: users, unassignedUsers: [] };
    }

    const assignedUsers = [];
    const unassignedUsers = [];

    users.forEach((user) => {
      const userWorkTypeIds =
        user.workTypes?.map((wt) => wt.id.toString()) || [];

      if (userWorkTypeIds.length === 0) {
        // User has no work types assigned
        unassignedUsers.push(user);
      } else if (userWorkTypeIds.includes(selectedWorkTypeId.toString())) {
        // User has the selected work type
        assignedUsers.push(user);
      }
    });

    return { assignedUsers, unassignedUsers };
  }, [users, selectedWorkTypeId]);

  // Refetch tasks when filters / search / sorting changes
  useEffect(() => {
    refetchTasks({
      filters: buildFilters(),
      page: 1,
      limit: TASK_FETCH_LIMIT,
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
    clientSearch,
    projectSearch,
    sortBy,
    sortOrder,
  ]);

  // Group tasks by worktype, then by project
  // NEW STRUCTURE: worktype -> project -> tasks (with taskType info)
  const groupedByWorkType = useMemo(() => {
    const grouped = {};

    // Apply client and project search filters
    const clientSearchTerm = clientSearch.trim().toLowerCase();
    const projectSearchTerm = projectSearch.trim().toLowerCase();

    const filteredTasks = tasks.filter((task) => {
      // My Clients Only filter (for service providers)
      if (myClientsOnly) {
        const sps = task?.project?.client?.serviceProviders || [];
        const isMine = sps.some(
          (sp) => sp?.isActive && sp?.serviceProvider?.id === currentUser?.id
        );
        if (!isMine) return false;
      }

      // Client search filter
      if (clientSearchTerm) {
        const client = task?.project?.client;
        const clientMatches = [
          client?.clientCode,
          client?.displayName,
          client?.companyName,
        ].some((value) => value?.toLowerCase().includes(clientSearchTerm));
        
        if (!clientMatches) return false;
      }

      // Project search filter
      if (projectSearchTerm) {
        const project = task?.project;
        const projectMatches = [
          project?.name,
          project?.projectCode,
        ].some((value) => value?.toLowerCase().includes(projectSearchTerm));
        
        if (!projectMatches) return false;
      }

      return true;
    });

    filteredTasks.forEach((task) => {
      // Since backend filters by worktype, all tasks should be for selected worktype
      // Use selectedWorkTypeId directly
      const workTypeId = selectedWorkTypeId;
      const projectId = task.project?.id;

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
      const taskTypeId = task.taskType?.id
        ? String(task.taskType.id)
        : "no-tasktype";
      grouped[workTypeId].projects[projectId].tasks[taskTypeId] = task;
      grouped[workTypeId].projects[projectId].tasksList.push(task);

      // Track task type for this worktype
      if (task.taskType) {
        grouped[workTypeId].taskTypes[taskTypeId] = task.taskType;
      }
    });

    return grouped;
  }, [tasks, selectedWorkTypeId, clientSearch, projectSearch, myClientsOnly, currentUser?.id]);

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

        const gradings = allGradings.filter((pg) => {
          const gradingWorkTypeId = pg.grading?.workType?.id;
          const matches =
            gradingWorkTypeId &&
            String(gradingWorkTypeId) === String(workTypeId);

          // Convert both to strings for comparison since workTypeId from tabs is a string
          return matches;
        });

        // If project has gradings for this worktype, create a row for each grading
        if (gradings.length > 0) {
          gradings.forEach((grading, idx) => {
            const gradingId = grading.gradingId || grading.id;

            // Filter tasks for this specific grading
            const gradingTasks = projectData.tasksList.filter((task) => {
              const taskGradingId = task.gradingTask?.grading?.id;
              return (
                taskGradingId && String(taskGradingId) === String(gradingId)
              );
            });

            // Create tasksByType map for this grading only
            const tasksByTypeForGrading = {};
            gradingTasks.forEach((task) => {
              const taskTypeId = task.taskType?.id
                ? String(task.taskType.id)
                : "no-tasktype";
              tasksByTypeForGrading[taskTypeId] = task;
            });

            // Calculate status for this grading's tasks only
            const gradingStatusCounts = {
              TODO: 0,
              IN_PROGRESS: 0,
              REVIEW: 0,
              REVISION: 0,
              COMPLETED: 0,
              CANCELLED: 0,
              ON_HOLD: 0,
            };

            gradingTasks.forEach((task) => {
              const status = (task.status || "TODO").toUpperCase();
              if (gradingStatusCounts[status] !== undefined) {
                gradingStatusCounts[status]++;
              }
            });

            const gradingTotalTasks = gradingTasks.length;
            const gradingCompletedTasks = gradingStatusCounts.COMPLETED;
            const gradingProgress =
              gradingTotalTasks > 0
                ? Math.round((gradingCompletedTasks / gradingTotalTasks) * 100)
                : 0;

            rows.push({
              key: `${workTypeId}-${project.id}-grading-${gradingId}`,
              projectId: project.id,
              gradingId: gradingId,
              project: project,
              projectCode: project.projectCode || project.projectNumber,
              projectName: project.name,
              clientCode: project.client?.clientCode,
              clientName: project.client?.displayName,
              grading: grading, // Single grading for this row
              gradingName: grading.grading?.name || grading.grading?.shortCode,
              shortCode: grading.grading?.shortCode,
              gradingQty: grading.imageQuantity || 0,
              orderDate: project.createdAt,
              dueDate: earliestDueDate,
              priority: project.priority || "B",
              status:
                gradingProgress === 100
                  ? "COMPLETED"
                  : gradingTotalTasks > 0
                  ? "IN_PROGRESS"
                  : "TODO",
              progress: gradingProgress,
              totalTasks: gradingTotalTasks,
              completedTasks: gradingCompletedTasks,
              statusCounts: gradingStatusCounts,
              // Tasks mapped by taskTypeId for this grading only
              tasksByType: tasksByTypeForGrading,
              allTasks: gradingTasks,
            });
          });
        } else {
          // No gradings, create single row
          rows.push({
            key: `${workTypeId}-${project.id}`,
            projectId: project.id,
            gradingId: null,
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

    return result;
  }, [groupedByWorkType]);

  // Use GET_WORK_TYPES for all available worktypes as tabs
  // Filter by user's assigned work types if available
  const allWorkTypeTabs = useMemo(() => {
    const result = {};

    // Get user's work type IDs from ME query (prefer workTypes, fallback to userWorkTypes)
    const userWorkTypeIds =
      (currentUser?.workTypes?.map((wt) => wt.id.toString()) || 
       currentUser?.userWorkTypes?.map((uwt) => uwt.workTypeId.toString())) || [];

    // Check if user has any assigned work types
    const hasAssignedWorkTypes = userWorkTypeIds && userWorkTypeIds.length > 0;

    console.log('[WorkType Filter] User work types:', {
      userId: currentUser?.id,
      userEmail: currentUser?.email,
      userWorkTypeIds,
      hasAssignedWorkTypes,
      userWorkTypeNames: currentUser?.workTypes?.map(wt => wt.name) || [],
      userWorkTypesData: currentUser?.workTypes,
      userWorkTypesJunction: currentUser?.userWorkTypes
    });

    // Create tabs from all available worktypes
    worktypes.forEach((workType) => {
      if (workType.isActive) {
        const workTypeId = workType.id.toString();

        // Filter: only show work types assigned to the user
        // Only filter if user has assigned work types. If none are assigned, show all (for backward compatibility/admins)
        const shouldShow = !hasAssignedWorkTypes || userWorkTypeIds.includes(workTypeId);
        
        console.log(`[WorkType Filter] ${workType.name}:`, {
          workTypeId,
          isAssignedToUser: userWorkTypeIds.includes(workTypeId),
          shouldShow,
          reason: !hasAssignedWorkTypes ? 'No work types assigned (show all)' : userWorkTypeIds.includes(workTypeId) ? 'Assigned to user' : 'Not assigned to user'
        });

        if (shouldShow) {
          result[workTypeId] = {
            workTypeId,
            workTypeName: workType.name,
            workType: workType,
            taskTypes: workType.taskTypes || [],
            rows: [], // Will be populated from tableDataByWorkType
          };
        }
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

    // Preserve the sortOrder from backend for tab display
    // Convert object back to array and sort by original workType order
    const sortedResult = {};
    worktypes.forEach((workType) => {
      const workTypeId = workType.id.toString();
      if (result[workTypeId]) {
        sortedResult[workTypeId] = result[workTypeId];
      }
    });

    return sortedResult;
  }, [worktypes, tableDataByWorkType, currentUser]);

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
  const isEditingCell = (projectId, gradingId, taskTypeId, field) => {
    return (
      editingCell.projectId === projectId &&
      editingCell.gradingId === gradingId &&
      editingCell.taskTypeId === taskTypeId &&
      editingCell.field === field
    );
  };

  const startEditCell = (
    projectId,
    gradingId,
    taskTypeId,
    field,
    currentValue,
    e
  ) => {
    e?.stopPropagation();
    setEditingCell({ projectId, gradingId, taskTypeId, field });
    // For assignees field, map to assigneeIds to match the expected field name
    const fieldName = field === "assignees" ? "assigneeIds" : field;
    setEditedData({ [fieldName]: currentValue });
  };

  const cancelEditCell = () => {
    setEditingCell({
      projectId: null,
      gradingId: null,
      taskTypeId: null,
      field: null,
    });
    setEditedData({});
  };

  const saveTaskCell = async (task, field) => {
    try {
      const input = {};

      if (field === "assigneeId") {
        // Explicitly handle null/undefined to allow clearing assignee
        input.assigneeId = editedData.assigneeId !== undefined ? editedData.assigneeId : null;
      } else if (field === "assignees") {
        // Handle multiple user assignments with per-user quantities when >1 selected
        const currentAssignments = task.taskAssignments || [];
        const currentUserIds = currentAssignments.map((a) => a.userId);
        const selectedUserIds = editedData.assigneeIds || [];

        // If more than 1 user selected, open allocation modal and handle there
        if (selectedUserIds.length > 1) {
          openAssignQtyModal(task, selectedUserIds);
          return;
        }

        // Otherwise, proceed with simple add/remove logic
        const usersToAdd = selectedUserIds.filter((id) => !currentUserIds.includes(id));
        const usersToRemove = currentAssignments.filter((a) => !selectedUserIds.includes(a.userId));

        for (const assignment of usersToRemove) {
          await deleteAssignment({ variables: { id: assignment.id } });
        }

        if (usersToAdd.length > 0) {
          const taskImageQty = getTaskTotalQuantity(task);
          const qtyPerUser = taskImageQty; // single selected user gets full by default
          const assignmentInputs = usersToAdd.map((userId) => ({
            taskId: task.id,
            userId,
            imageQuantity: qtyPerUser,
            notes: null,
          }));
          await bulkCreateAssignments({ variables: { inputs: assignmentInputs } });
        }

        message.success("Task assignments updated successfully");
        await refetchTasks();
        cancelEditCell();
        return;
      } else if (field === "completedQty") {
        // Update the current user's TaskAssignment completed quantity (incremental addition)
        const userAssignment = task.taskAssignments?.find(
          (a) => a.userId === currentUser?.id
        );

        if (!userAssignment) {
          message.error("You are not assigned to this task");
          cancelEditCell();
          return;
        }

        // Validate: the increment being added shouldn't cause total to exceed task quantity
        if (task.imageQuantity) {
          const currentUserCompleted = userAssignment.completedImageQuantity || 0;
          const otherAssignmentsCompleted = task.taskAssignments
            ?.filter((a) => a.id !== userAssignment.id)
            .reduce((sum, a) => sum + (a.completedImageQuantity || 0), 0) || 0;

          const incrementToAdd = editedData.completedQty;
          const newTotalCompleted = currentUserCompleted + incrementToAdd + otherAssignmentsCompleted;

          if (newTotalCompleted > task.imageQuantity) {
            const maxCanAdd = task.imageQuantity - currentUserCompleted - otherAssignmentsCompleted;
            message.error(
              `Cannot add ${incrementToAdd} images. ` +
              `You've completed ${currentUserCompleted}, others completed ${otherAssignmentsCompleted}. ` +
              `You can add up to ${maxCanAdd} more images.`
            );
            cancelEditCell();
            return;
          }
        }

        // Send the increment value - backend will add it to existing total
        await updateTaskAssignment({
          variables: {
            id: userAssignment.id,
            input: {
              completedImageQuantity: editedData.completedQty,
            },
          },
        });

        message.success("Completed quantity updated successfully");
        await refetchTasks();
        cancelEditCell();
        return;
      } else if (field === "dueDate") {
        input.dueDate = editedData.dueDate
          ? dayjs(editedData.dueDate).toISOString()
          : null;
      } else if (field === "status") {
        input.status = editedData.status;
      }

      console.log(`[saveTaskCell] Updating task ${task.id} field=${field}`, input);

      await updateTask({
        variables: {
          id: task.id,
          input,
        },
      });

      // Don't call cancelEditCell here - it's handled in mutation onCompleted
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
    if (!actualData || taskTypes.length === 0) return [];

    const baseColumns = [
      {
        title: "Project / Client",
        dataIndex: "projectCode",
        key: "project",
        width: 180,
        fixed: "left",
        ellipsis: true,
        render: (text, record) => (
          <div style={{ fontSize: 12 }}>
            <div style={{ color: "#262626", fontWeight: 600, marginBottom: 2 }}>
              <Button
                type="link"
                size="small"
                style={{ padding: 0, height: "auto", fontWeight: 600 }}
                onClick={() => showProjectDetailDrawerV2(record.projectId)}
              >
                {text}
                {record.projectName ? ` - ${record.projectName}` : ""}
              </Button>
            </div>
            <div style={{ color: "#66666", fontSize: 11 }}>
              {record.clientCode}
              {record.clientName ? ` - ${record.clientName}` : ""}
            </div>
          </div>
        ),
      },
      {
        title: "Grading / Qty",
        key: "grading",
        width: 120,
        ellipsis: true,
        render: (_, record) => {
          if (!record.grading) {
            return <Text type="secondary">-</Text>;
          }
          return (
            <div style={{ fontSize: 12 }}>
              <Text style={{ fontWeight: 500 }}>{record.shortCode}</Text>
              <Text type="secondary"> ({record.gradingQty})</Text>
            </div>
          );
        },
      },
      {
        title: "Order Date",
        dataIndex: "orderDate",
        key: "orderDate",
        width: 100,
        render: (date) => (date ? dayjs(date).format("DD-MM-YY") : "-"),
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
            width: 110,
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
                record.gradingId,
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
                        value={
                          TASK_STATUS[editedData.status || task.status]?.label
                        }
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
                      record.gradingId,
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
            title: "Assignees",
            key: `task-${taskType.id}-assignees`,
            className: "task-type-column",
            width: 180,
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

              const isEditingAssignees = isEditingCell(
                record.projectId,
                record.gradingId,
                taskType.id,
                "assignees"
              );

              const taskAssignments = task.taskAssignments || [];
              const assignedUserIds = taskAssignments.map((a) => a.userId);

              // Show multi-select when editing
              if (isEditingAssignees) {
                return (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{ padding: "4px 0" }}
                  >
                    <Select
                      mode="multiple"
                      size="small"
                      value={editedData.assigneeIds || assignedUserIds}
                      onChange={(values) => {
                        setEditedData({ ...editedData, assigneeIds: values });
                      }}
                      style={{ width: "100%" }}
                      placeholder="Assign Users"
                      maxTagCount="responsive"
                      showSearch
                      filterOption={(input, option) => {
                        const children = option?.children;
                        const searchText = Array.isArray(children)
                          ? children.join(" ")
                          : String(children ?? "");
                        return searchText
                          .toLowerCase()
                          .includes(input.toLowerCase());
                      }}
                    >
                      {filteredUsers.assignedUsers.length > 0 && (
                        <Select.OptGroup label="Assigned to Work Type">
                          {filteredUsers.assignedUsers.map((user) => (
                            <Option key={user.id} value={user.id}>
                              {user.firstName} {user.lastName}
                            </Option>
                          ))}
                        </Select.OptGroup>
                      )}
                      {filteredUsers.unassignedUsers.length > 0 && (
                        <Select.OptGroup label="No Work Type Assigned">
                          {filteredUsers.unassignedUsers.map((user) => (
                            <Option key={user.id} value={user.id}>
                              {user.firstName} {user.lastName}
                            </Option>
                          ))}
                        </Select.OptGroup>
                      )}
                    </Select>
                    <Space size="small" style={{ marginTop: 4 }}>
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
                  </div>
                );
              }

              // Display assigned users with Edit button
              if (taskAssignments.length > 0) {
                return (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      padding: "4px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                      alignItems: "center",
                    }}
                  >
                    <Space
                      direction="vertical"
                      size={2}
                      style={{ width: "100%" }}
                    >
                      {taskAssignments.map((assignment) => (
                        <Text
                          key={assignment.id}
                          style={{
                            fontSize: 11,
                            display: "block",
                            textAlign: "center",
                          }}
                        >
                          {assignment.user?.firstName} {assignment.user?.lastName}
                          {typeof assignment.imageQuantity === 'number' && (
                            <span style={{ color: '#8c8c8c' }}> ({assignment.imageQuantity})</span>
                          )}
                        </Text>
                      ))}
                    </Space>
                    <Button
                      size="small"
                      type="link"
                      icon={<EditOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditCell(
                          record.projectId,
                          record.gradingId,
                          taskType.id,
                          "assignees",
                          assignedUserIds,
                          e
                        );
                      }}
                      style={{
                        padding: "0 4px",
                        height: "20px",
                        fontSize: "11px",
                      }}
                    >
                      Edit
                    </Button>
                  </div>
                );
              }

              // No assignments - show "Assign" button
              return (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{ padding: "4px" }}
                >
                  <Button
                    size="small"
                    type="dashed"
                    block
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditCell(
                        record.projectId,
                        record.gradingId,
                        taskType.id,
                        "assignees",
                        [],
                        e
                      );
                    }}
                    style={{ fontSize: "11px" }}
                  >
                    Assign Users
                  </Button>
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
        width: 120,
        render: (date, record) => {
          const isEditing = isEditingCell(
            record.projectId,
            record.gradingId,
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
                startEditCell(
                  record.projectId,
                  record.gradingId,
                  "dueDate",
                  "dueDate",
                  date
                );
              }}
              style={{ cursor: "pointer" }}
            >
              <Tooltip title="Click to edit due date">
                {date ? (
                  <span>
                    {dayjs(date).format("DD-MM-YY")}
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
        width: 80,
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
                {/* <Space size={4}>
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
                </Space> */}
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
                  <ExclamationCircleOutlined
                    style={{ fontSize: 16, color: "#fa8c16" }}
                  />
                  <Text strong style={{ fontSize: 14 }}>
                    Re-Open:
                  </Text>
                  <Tag
                    color="orange"
                    style={{ margin: 0, fontSize: 14, padding: "2px 8px" }}
                  >
                    {dashboardData?.tasksDashboard?.reopenedTasks || 0}
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
            <Col span={4}>
              <div style={{ marginBottom: 4, fontSize: 12, fontWeight: 500 }}>
                Visibility
              </div>
              <Checkbox
                checked={myClientsOnly}
                onChange={(e) => setMyClientsOnly(e.target.checked)}
              >
                My Clients Only
              </Checkbox>
            </Col>
            <Col span={6}>
              <div style={{ marginBottom: 4, fontSize: 12, fontWeight: 500 }}>
                Client Search
              </div>
              <Input
                placeholder="Client code, name, company..."
                prefix={<SearchOutlined />}
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
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
                filterOption={(input, option) => {
                  const children = option?.children;
                  const searchText = Array.isArray(children)
                    ? children.join(" ")
                    : String(children ?? "");
                  return searchText.toLowerCase().includes(input.toLowerCase());
                }}
              >
                <Option value="all">All Users</Option>
                <Option value="assignedToMe">Assigned to Me</Option>
                <Option value="unassigned">Unassigned Tasks</Option>
                {filteredUsers.assignedUsers.length > 0 && (
                  <Select.OptGroup label="Assigned to Work Type">
                    {filteredUsers.assignedUsers.map((user) => (
                      <Option key={user.id} value={user.id}>
                        {user.firstName} {user.lastName}
                      </Option>
                    ))}
                  </Select.OptGroup>
                )}
                {filteredUsers.unassignedUsers.length > 0 && (
                  <Select.OptGroup label="No Work Type Assigned">
                    {filteredUsers.unassignedUsers.map((user) => (
                      <Option key={user.id} value={user.id}>
                        {user.firstName} {user.lastName}
                      </Option>
                    ))}
                  </Select.OptGroup>
                )}
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
            <Col span={3}>
              <div style={{ marginBottom: 4, fontSize: 12, fontWeight: 500 }}>
                Project Search
              </div>
              <Input
                placeholder="Project name or code..."
                prefix={<SearchOutlined />}
                value={projectSearch}
                onChange={(e) => setProjectSearch(e.target.value)}
                allowClear
              />
            </Col>
            <Col span={2} style={{ textAlign: "right", paddingTop: 20 }}>
              <Space>
                <Tooltip title="Reset Filters">
                  <Button
                    icon={<CloseCircleOutlined />}
                    onClick={handleResetFilters}
                  />
                </Tooltip>
                <Tooltip title="Refresh">
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={() => {
                      refetchTasks();
                      refetchWorkTypes();
                    }}
                  />
                </Tooltip>
              </Space>
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

                // Calculate total images for this worktype
                const totalImages = actualData.rows.reduce((sum, row) => {
                  return sum + (row.gradingQty || 0);
                }, 0);

                return {
                  key: workTypeId,
                  label: (
                    <span>
                      {workTypeData.workTypeName}
                      {selectedWorkTypeId === workTypeId && (
                        <>
                          <Tag color="blue" style={{ marginLeft: 8 }}>
                            {rowCount} Projects
                          </Tag>
                          <Tag color="green" style={{ marginLeft: 4 }}>
                            {totalImages} Images
                          </Tag>
                        </>
                      )}
                    </span>
                  ),
                  children: (
                    <div>
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
                          size="small"
                          tableLayout="fixed"
                          scroll={{ x: 'max-content' }}
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
        {/* Allocation Modal for per-user image quantities */}
        <Modal
          open={assignQtyModalOpen}
          title="Assign image quantities per user"
          onCancel={closeAssignQtyModal}
          onOk={handleAssignQtyConfirm}
          okButtonProps={{
            disabled:
              !assignQtyModalTask ||
              assignQtySelectedUserIds.length === 0 ||
              assignQtyTotalAllocated > assignQtyModalTaskTotal ||
              (!hasAssignQtyChanges && !isInitialTaskUnassigned),
          }}
          width={600}
        >
          {assignQtyModalTask ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Text type="secondary">
                Task total: {assignQtyModalTaskTotal} images
              </Text>
              
              {/* User Selector */}
              <div>
                <Text strong style={{ display: "block", marginBottom: 8 }}>
                  Select Users:
                </Text>
                <Select
                  mode="multiple"
                  size="middle"
                  value={assignQtySelectedUserIds}
                  onChange={(values) => {
                    setAssignQtySelectedUserIds(values);
                    // Initialize allocations for newly added users with 0
                    const newAllocations = { ...assignQtyAllocations };
                    values.forEach(uid => {
                      if (!(uid in newAllocations)) {
                        newAllocations[uid] = 0;
                      }
                    });
                    // Remove allocations for deselected users
                    Object.keys(newAllocations).forEach(uid => {
                      if (!values.includes(uid)) {
                        delete newAllocations[uid];
                      }
                    });
                    setAssignQtyAllocations(newAllocations);
                  }}
                  style={{ width: "100%" }}
                  placeholder="Select users to assign"
                  maxTagCount="responsive"
                  showSearch
                  filterOption={(input, option) => {
                    const children = option?.children;
                    const searchText = Array.isArray(children)
                      ? children.join(" ")
                      : String(children ?? "");
                    return searchText
                      .toLowerCase()
                      .includes(input.toLowerCase());
                  }}
                >
                  {filteredUsers.assignedUsers.length > 0 && (
                    <Select.OptGroup label="Assigned to Work Type">
                      {filteredUsers.assignedUsers.map((user) => (
                        <Option key={user.id} value={user.id}>
                          {user.firstName} {user.lastName}
                        </Option>
                      ))}
                    </Select.OptGroup>
                  )}
                  {filteredUsers.unassignedUsers.length > 0 && (
                    <Select.OptGroup label="Other Users">
                      {filteredUsers.unassignedUsers.map((user) => (
                        <Option key={user.id} value={user.id}>
                          {user.firstName} {user.lastName}
                        </Option>
                      ))}
                    </Select.OptGroup>
                  )}
                </Select>
              </div>

              {/* Allocation Summary and Auto-distribute */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>
                <Text>
                  <strong>Allocated:</strong> {assignQtyTotalAllocated} / {assignQtyModalTaskTotal}
                  {assignQtyTotalAllocated > assignQtyModalTaskTotal && (
                    <Text type="danger" style={{ marginLeft: 8 }}>
                      (Exceeds total!)
                    </Text>
                  )}
                </Text>
                <Button 
                  size="small" 
                  onClick={handleAssignQtyAutoDistribute}
                  disabled={assignQtySelectedUserIds.length === 0}
                >
                  Auto distribute
                </Button>
              </div>

              {/* Quantity Inputs */}
              {assignQtySelectedUserIds.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <Text strong>Quantity per user:</Text>
                  {assignQtySelectedUserIds.map((uid) => (
                    <div key={uid} style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 0" }}>
                      <div style={{ flex: 1 }}>
                        <UserOutlined style={{ marginRight: 8, color: "#1890ff" }} />
                        {getUserDisplayName(uid)}
                      </div>
                      <div style={{ width: 140 }}>
                        <InputNumber
                          size="small"
                          min={0}
                          max={assignQtyModalTaskTotal}
                          value={assignQtyAllocations[uid] ?? 0}
                          onChange={(val) =>
                            setAssignQtyAllocations((prev) => ({ ...prev, [uid]: Number(val) || 0 }))
                          }
                          style={{ width: "100%" }}
                          addonAfter="images"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: "20px", textAlign: "center", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>
                  <Text type="secondary">Please select users to assign quantities</Text>
                </div>
              )}
            </div>
          ) : null}
        </Modal>

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
