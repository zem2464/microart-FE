import React, { useState, useMemo, useCallback, memo } from "react";
import {
  Table,
  Input,
  InputNumber,
  Select,
  Tag,
  Button,
  Space,
  DatePicker,
  Tooltip,
  message,
  Typography,
  Modal,
  Progress,
} from "antd";
import {
  SearchOutlined,
  UserOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  ExclamationCircleOutlined,
  SaveOutlined,
  CloseCircleOutlined,
  EditOutlined,
} from "@ant-design/icons";
import { useMutation, useApolloClient } from "@apollo/client";
import dayjs from "dayjs";
import { UPDATE_TASK } from "../../gql/tasks";
import { generateActionColumns } from "./TasksTableColumns";
import {
  BULK_CREATE_TASK_ASSIGNMENTS,
  DELETE_TASK_ASSIGNMENT,
  UPDATE_TASK_ASSIGNMENT,
} from "../../gql/taskAssignments";

const { Option } = Select;
const { Text } = Typography;

// Status configuration - matches backend TaskStatus enum
export const TASK_STATUS = {
  TODO: { label: "To Do", color: "default", icon: <ClockCircleOutlined /> },
  IN_PROGRESS: {
    label: "In Progress",
    color: "blue",
    icon: <SyncOutlined spin />,
  },
  REVIEW: {
    label: "Review",
    color: "purple",
    icon: <ExclamationCircleOutlined />,
  },
  COMPLETED: {
    label: "Completed",
    color: "green",
    icon: <CheckCircleOutlined />,
  },
  REVISION: {
    label: "Reopen",
    color: "orange",
    icon: <ExclamationCircleOutlined />,
  },
};

// Priority colors - A=High(Red), B=Medium(Orange), C=Low(Green)
export const PRIORITY_COLORS = {
  A: "red", // High priority
  B: "orange", // Medium priority
  C: "green", // Low priority
};

/**
 * Resolve the effective task quantity: task value first, then matching grading on the project, then project total
 */
export function getTaskTotalQuantity(task) {
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
    if (
      match &&
      match.imageQuantity !== null &&
      match.imageQuantity !== undefined
    ) {
      return Number(match.imageQuantity) || 0;
    }
  }

  const projectQty = task?.project?.imageQuantity;
  if (projectQty !== null && projectQty !== undefined) {
    return Number(projectQty) || 0;
  }

  return 0;
}

/**
 * TasksTable Component
 *
 * A reusable component for displaying and managing tasks in a table format.
 * Supports inline editing, assignment management, allocation drawer, status updates, and due date changes.
 *
 * Props:
 * - dataSource: Array of row data objects
 * - columns: Array of column definitions (Ant Design Table columns)
 * - users: Array of user objects for assignments
 * - currentUser: Current logged-in user object
 * - loading: Boolean for loading state
 * - refetchTasks: Function to refetch tasks after mutations
 * - refetchQueries: Array of GraphQL queries to refetch after mutations
 * - onRowClick: Optional callback when a row is clicked
 * - tableLayout: Optional table layout ("auto" | "fixed")
 * - rowClassName: Optional function to determine row className
 * - taskColumnRenderer: Function to render dynamic task columns
 * - showAllocationModal: Boolean to enable/disable allocation modal
 */
const TasksTable = memo(
  ({
    dataSource = [],
    columns = [],
    users = [],
    currentUser = null,
    loading = false,
    refetchTasks = () => { },
    refetchQueries = [],
    onRowClick = null,
    tableLayout = "fixed",
    rowClassName = null,
    taskTypes = [],
  }) => {
    const client = useApolloClient();

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
    const [assignQtySelectedUserIds, setAssignQtySelectedUserIds] = useState(
      []
    );
    const [assignQtyAllocations, setAssignQtyAllocations] = useState({}); // { [userId]: qty }
    const [assignQtyOriginalUserIds, setAssignQtyOriginalUserIds] = useState(
      []
    );
    const [assignQtyOriginalAllocations, setAssignQtyOriginalAllocations] =
      useState({});

    // Mutations with refetch support
    const [updateTask] = useMutation(UPDATE_TASK, {
      refetchQueries,
      awaitRefetchQueries: true,
      fetchPolicy: "no-cache",
      onCompleted: () => {
        // Evict cache to prevent stale data before refetch
        client.cache.evict({ fieldName: "tasks" });
        client.cache.evict({ fieldName: "project" });
        client.cache.gc();
        message.success("Task updated successfully");
        cancelEditCell();
        setIsInlineUpdating(false);
      },
      onError: (error) => {
        message.error(`Failed to update task: ${error.message}`);
        setIsInlineUpdating(false);
      },
    });

    const [bulkCreateAssignments] = useMutation(BULK_CREATE_TASK_ASSIGNMENTS, {
      refetchQueries,
      awaitRefetchQueries: true,
      fetchPolicy: "no-cache",
      onCompleted: () => {
        // Evict cache to prevent stale data before refetch
        client.cache.evict({ fieldName: "tasks" });
        client.cache.evict({ fieldName: "project" });
        client.cache.gc();
        message.success("Assignments created successfully");
        setIsInlineUpdating(false);
      },
      onError: (error) => {
        message.error(`Failed to create assignments: ${error.message}`);
        setIsInlineUpdating(false);
      },
    });

    const [deleteAssignment] = useMutation(DELETE_TASK_ASSIGNMENT, {
      refetchQueries,
      awaitRefetchQueries: true,
      fetchPolicy: "no-cache",
      onCompleted: () => {
        // Evict cache to prevent stale data before refetch
        client.cache.evict({ fieldName: "tasks" });
        client.cache.evict({ fieldName: "project" });
        client.cache.gc();
        setIsInlineUpdating(false);
      },
      onError: (error) => {
        message.error(`Failed to delete assignment: ${error.message}`);
        setIsInlineUpdating(false);
      },
    });

    const [updateTaskAssignment] = useMutation(UPDATE_TASK_ASSIGNMENT, {
      refetchQueries,
      awaitRefetchQueries: true,
      fetchPolicy: "no-cache",
      onCompleted: () => {
        // Evict cache to prevent stale data before refetch
        client.cache.evict({ fieldName: "tasks" });
        client.cache.evict({ fieldName: "project" });
        client.cache.gc();
        message.success("Completed quantity updated successfully");
        cancelEditCell();
        setIsInlineUpdating(false);
      },
      onError: (error) => {
        message.error(`Failed to update assignment: ${error.message}`);
        setIsInlineUpdating(false);
      },
    });

    const getUserDisplayName = useCallback(
      (userId) => {
        const u = users.find((x) => x.id === userId);
        if (!u) return String(userId);
        return `${u.firstName || ""} ${u.lastName || ""}`.trim();
      },
      [users]
    );

    const openAssignQtyModal = useCallback((task, selectedUserIds) => {
      const totalQty = getTaskTotalQuantity(task);
      const currentAssignments = task?.taskAssignments || [];

      // Prefill allocations: use existing assignment qty if present, else equal split of remaining
      const prefill = {};
      let preSum = 0;
      selectedUserIds.forEach((uid) => {
        const existing = currentAssignments.find((a) => a.userId === uid);
        if (existing && typeof existing.imageQuantity === "number") {
          prefill[uid] = existing.imageQuantity;
          preSum += existing.imageQuantity;
        }
      });

      const toDistribute = Math.max(totalQty - preSum, 0);
      const needAllocation = selectedUserIds.filter(
        (uid) => prefill[uid] === undefined
      );
      if (needAllocation.length > 0) {
        const base =
          needAllocation.length > 0
            ? Math.floor(toDistribute / needAllocation.length)
            : 0;
        needAllocation.forEach((uid, idx) => {
          const remainder = idx < toDistribute % needAllocation.length ? 1 : 0;
          prefill[uid] = base + remainder;
        });
      }

      setAssignQtyModalTask(task);
      setAssignQtySelectedUserIds(selectedUserIds);
      setAssignQtyAllocations(prefill);

      // Store original state for change detection
      const originalUserIds = currentAssignments.map((a) => a.userId);
      const originalAllocations = {};
      currentAssignments.forEach((a) => {
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
      return assignQtySelectedUserIds.reduce(
        (sum, uid) => sum + (Number(assignQtyAllocations[uid]) || 0),
        0
      );
    }, [assignQtyAllocations, assignQtySelectedUserIds]);

    const assignQtyModalTaskTotal = useMemo(
      () => getTaskTotalQuantity(assignQtyModalTask),
      [assignQtyModalTask]
    );

    const isInitialTaskUnassigned = useMemo(() => {
      const existing = assignQtyModalTask?.taskAssignments || [];
      return existing.length === 0;
    }, [assignQtyModalTask]);

    const hasAssignQtyChanges = useMemo(() => {
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

      for (const uid of assignQtySelectedUserIds) {
        const currentQty = Number(assignQtyAllocations[uid]) || 0;
        const originalQty = Number(assignQtyOriginalAllocations[uid]) || 0;
        if (currentQty !== originalQty) {
          return true;
        }
      }

      return false;
    }, [
      assignQtySelectedUserIds,
      assignQtyOriginalUserIds,
      assignQtyAllocations,
      assignQtyOriginalAllocations,
    ]);

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

    const handleAssignQtyConfirm = useCallback(async () => {
      if (!assignQtyModalTask) return;

      try {
        setIsInlineUpdating(true);
        const currentAssignments = assignQtyModalTask.taskAssignments || [];
        const currentUserIds = currentAssignments.map((a) => a.userId);

        const usersToAdd = assignQtySelectedUserIds.filter(
          (id) => !currentUserIds.includes(id)
        );
        const usersToRemove = currentAssignments.filter(
          (a) => !assignQtySelectedUserIds.includes(a.userId)
        );
        const usersToUpdate = assignQtySelectedUserIds.filter((id) =>
          currentUserIds.includes(id)
        );

        // Delete removed assignments
        for (const assignment of usersToRemove) {
          await deleteAssignment({ variables: { id: assignment.id } });
        }

        // Update existing assignments if quantities changed
        for (const userId of usersToUpdate) {
          const assignment = currentAssignments.find(
            (a) => a.userId === userId
          );
          const newQty = Number(assignQtyAllocations[userId]) || 0;
          const oldQty = assignment.imageQuantity || 0;

          if (newQty !== oldQty) {
            await updateTaskAssignment({
              variables: {
                id: assignment.id,
                input: { imageQuantity: newQty },
              },
            });
          }
        }

        // Create new assignments
        if (usersToAdd.length > 0) {
          const assignmentInputs = usersToAdd.map((userId) => ({
            taskId: assignQtyModalTask.id,
            userId,
            imageQuantity: Number(assignQtyAllocations[userId]) || 0,
            notes: null,
          }));
          await bulkCreateAssignments({
            variables: { inputs: assignmentInputs },
          });
        }

        message.success("Task assignments updated successfully");
        await refetchTasks();
        closeAssignQtyModal();
        cancelEditCell();
      } catch (error) {
        console.error("Error saving assignments:", error);
        message.error(`Failed to update assignments: ${error.message}`);
      } finally {
        setIsInlineUpdating(false);
      }
    }, [
      assignQtyModalTask,
      assignQtySelectedUserIds,
      assignQtyAllocations,
      deleteAssignment,
      updateTaskAssignment,
      bulkCreateAssignments,
      refetchTasks,
      closeAssignQtyModal,
    ]);

    // Inline editing functions
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
        setIsInlineUpdating(true);
        const input = {};

        if (field === "assignees") {
          const currentAssignments = task.taskAssignments || [];
          const currentUserIds = currentAssignments.map((a) => a.userId);
          const selectedUserIds = editedData.assigneeIds || [];

          // If more than 1 user selected, open allocation modal
          if (selectedUserIds.length > 1) {
            openAssignQtyModal(task, selectedUserIds);
            setIsInlineUpdating(false);
            return;
          }

          // Simple add/remove logic for single user
          const usersToAdd = selectedUserIds.filter(
            (id) => !currentUserIds.includes(id)
          );
          const usersToRemove = currentAssignments.filter(
            (a) => !selectedUserIds.includes(a.userId)
          );

          for (const assignment of usersToRemove) {
            await deleteAssignment({ variables: { id: assignment.id } });
          }

          if (usersToAdd.length > 0) {
            const taskImageQty = getTaskTotalQuantity(task);
            const assignmentInputs = usersToAdd.map((userId) => ({
              taskId: task.id,
              userId,
              imageQuantity: taskImageQty,
              notes: null,
            }));
            await bulkCreateAssignments({
              variables: { inputs: assignmentInputs },
            });
          }

          message.success("Task assignments updated successfully");
          await refetchTasks();
          cancelEditCell();
          setIsInlineUpdating(false);
          return;
        } else if (field === "completedQty") {
          const userAssignment = task.taskAssignments?.find(
            (a) => a.userId === currentUser?.id
          );

          if (!userAssignment) {
            message.error("You are not assigned to this task");
            cancelEditCell();
            setIsInlineUpdating(false);
            return;
          }

          if (task.imageQuantity) {
            const currentUserCompleted =
              userAssignment.completedImageQuantity || 0;
            const otherAssignmentsCompleted =
              task.taskAssignments
                ?.filter((a) => a.id !== userAssignment.id)
                .reduce((sum, a) => sum + (a.completedImageQuantity || 0), 0) ||
              0;

            const incrementToAdd = editedData.completedQty;
            const newTotalCompleted =
              currentUserCompleted + incrementToAdd + otherAssignmentsCompleted;

            if (newTotalCompleted > task.imageQuantity) {
              const maxCanAdd =
                task.imageQuantity -
                currentUserCompleted -
                otherAssignmentsCompleted;
              message.error(
                `Cannot add ${incrementToAdd} images. ` +
                `You've completed ${currentUserCompleted}, others completed ${otherAssignmentsCompleted}. ` +
                `You can add up to ${maxCanAdd} more images.`
              );
              cancelEditCell();
              setIsInlineUpdating(false);
              return;
            }
          }

          await updateTaskAssignment({
            variables: {
              id: userAssignment.id,
              input: {
                completedImageQuantity: editedData.completedQty,
              },
            },
          });

          await refetchTasks();
          setIsInlineUpdating(false);
          return;
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

        await refetchTasks();
      } catch (error) {
        console.error("Error saving task:", error);
        message.error(`Failed to update task: ${error.message}`);
        setIsInlineUpdating(false);
      }
    };

    // Generate task columns dynamically
    const generateTaskColumns = useCallback(() => {
      if (!taskTypes || taskTypes.length === 0) return [];

      // Sort task types by the order field from WorkTypeTask junction table
      const sortedTaskTypes = [...taskTypes].sort((a, b) => {
        const orderA = a.WorkTypeTask?.order ?? 0;
        const orderB = b.WorkTypeTask?.order ?? 0;
        return orderA - orderB;
      });

      return sortedTaskTypes.flatMap((taskType) => [
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
              filters: Object.keys(TASK_STATUS).map((status) => ({
                text: TASK_STATUS[status].label,
                value: status,
              })),
              onFilter: (value, record) => {
                const task = record.tasksByType?.[String(taskType.id)];
                return task?.status?.toUpperCase() === String(value).toUpperCase();
              },
              render: (_, record) => {
                const task = record.tasksByType?.[taskType.id];
                if (!task) return <Text type="secondary">-</Text>;

                const isEditing = isEditingCell(
                  record.projectId,
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
                            loading={isInlineUpdating}
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
                        task.status,
                        e
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
              width: 180,
              align: "center",
              onCell: () => ({
                style: { backgroundColor: `${taskType.color || "#d9d9d9"}20` },
              }),
              render: (_, record) => {
                const task = record.tasksByType?.[taskType.id];
                if (!task) return <Text type="secondary">-</Text>;

                const isEditingAssignees = isEditingCell(
                  record.projectId,
                  record.gradingId,
                  taskType.id,
                  "assignees"
                );

                const taskAssignments = task.taskAssignments || [];
                const assignedUserIds = taskAssignments.map((a) => a.userId);

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
                        onChange={(values) =>
                          setEditedData({ ...editedData, assigneeIds: values })
                        }
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
                        {users.map((user) => (
                          <Option key={user.id} value={user.id}>
                            {user.firstName} {user.lastName}
                          </Option>
                        ))}
                      </Select>
                      <Space size="small" style={{ marginTop: 4 }}>
                        <Button
                          type="primary"
                          size="small"
                          icon={<SaveOutlined />}
                          onClick={() => saveTaskCell(task, "assignees")}
                          loading={isInlineUpdating}
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
                            {assignment.user?.firstName}{" "}
                            {assignment.user?.lastName}
                            {typeof assignment.imageQuantity === "number" && (
                              <span style={{ color: "#8c8c8c" }}>
                                {" "}
                                ({assignment.imageQuantity})
                              </span>
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
    }, [taskTypes, editingCell, editedData, users, isInlineUpdating]);

    // Generate action columns (Due Date, etc.)
    const actionColumns = useMemo(() => {
      return generateActionColumns({
        isEditingCell,
        startEditCell,
        saveTaskCell,
        cancelEditCell,
        editedData,
        setEditedData,
        isInlineUpdating,
      });
    }, [editedData, isInlineUpdating]);

    const allColumns = useMemo(() => {
      return [...columns, ...generateTaskColumns(), ...actionColumns];
    }, [columns, generateTaskColumns, actionColumns]);

    return (
      <>
        <Table
          bordered
          columns={allColumns}
          dataSource={dataSource}
          loading={loading || isInlineUpdating}
          pagination={false}
          size="small"
          tableLayout={tableLayout}
          scroll={{ x: "max-content" }}
          rowKey="key"
          rowClassName={rowClassName}
          onRow={(record) => ({
            onClick: onRowClick ? () => onRowClick(record) : undefined,
          })}
        />

        {/* Allocation Modal */}
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
            loading: isInlineUpdating,
          }}
          width={600}
        >
          {assignQtyModalTask ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Text type="secondary">
                Task total: {assignQtyModalTaskTotal} images
              </Text>

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
                    const newAllocations = { ...assignQtyAllocations };
                    values.forEach((uid) => {
                      if (!(uid in newAllocations)) {
                        newAllocations[uid] = 0;
                      }
                    });
                    Object.keys(newAllocations).forEach((uid) => {
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
                  {users.map((user) => (
                    <Option key={user.id} value={user.id}>
                      {user.firstName} {user.lastName}
                    </Option>
                  ))}
                </Select>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 12px",
                  backgroundColor: "#f5f5f5",
                  borderRadius: "4px",
                }}
              >
                <Text>
                  <strong>Allocated:</strong> {assignQtyTotalAllocated} /{" "}
                  {assignQtyModalTaskTotal}
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

              {assignQtySelectedUserIds.length > 0 ? (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  <Text strong>Quantity per user:</Text>
                  {assignQtySelectedUserIds.map((uid) => (
                    <div
                      key={uid}
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        padding: "4px 0",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <UserOutlined
                          style={{ marginRight: 8, color: "#1890ff" }}
                        />
                        {getUserDisplayName(uid)}
                      </div>
                      <div style={{ width: 140 }}>
                        <InputNumber
                          size="small"
                          min={0}
                          max={assignQtyModalTaskTotal}
                          value={assignQtyAllocations[uid] ?? 0}
                          onChange={(val) =>
                            setAssignQtyAllocations((prev) => ({
                              ...prev,
                              [uid]: Number(val) || 0,
                            }))
                          }
                          style={{ width: "100%" }}
                          addonAfter="images"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    padding: "20px",
                    textAlign: "center",
                    backgroundColor: "#f5f5f5",
                    borderRadius: "4px",
                  }}
                >
                  <Text type="secondary">
                    Please select users to assign quantities
                  </Text>
                </div>
              )}
            </div>
          ) : null}
        </Modal>
      </>
    );
  }
);

export default TasksTable;
