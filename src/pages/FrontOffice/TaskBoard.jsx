import React, { useState, useMemo, useCallback } from "react";
import { Typography, Button, Input, Select, message, Spin } from "antd";
import {
  PlusOutlined,
  FilterOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  EditOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation } from "@apollo/client";
import { DragDropContext, Droppable } from "react-beautiful-dnd";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { GET_TASKS, UPDATE_TASK_STATUS } from "../../gql/tasks";
import { GET_AVAILABLE_USERS } from "../../graphql/projectQueries";
import TaskCard from "../../components/TaskCard";
import TaskList from "../../components/TaskList";

dayjs.extend(relativeTime);

const { Text } = Typography;
const { Option } = Select;
const { Search } = Input;

// Task status columns (stable reference outside component)
const STATUS_COLUMNS = [
  {
    id: "todo",
    title: "To Do",
    color: "#f4f5f7",
    borderColor: "#dfe1e6",
    icon: <ClockCircleOutlined />,
    description: "Tasks ready to be started",
  },
  {
    id: "in_progress",
    title: "In Progress",
    color: "#e4fcff",
    borderColor: "#00a3bf",
    icon: <PlayCircleOutlined />,
    description: "Tasks currently being worked on",
  },
  {
    id: "revision",
    title: "In Review",
    color: "#fff4e6",
    borderColor: "#ffab00",
    icon: <EditOutlined />,
    description: "Tasks needing revision",
  },
  {
    id: "completed",
    title: "Done",
    color: "#e3fcef",
    borderColor: "#00875a",
    icon: <CheckCircleOutlined />,
    description: "Tasks that are completed",
  },
];

// Status mapping between frontend and backend
const STATUS_MAP = {
  "todo": "TODO",
  "in_progress": "IN_PROGRESS",
  "revision": "REVISION",
  "completed": "COMPLETED"
};

const REVERSE_STATUS_MAP = {
  "TODO": "todo",
  "IN_PROGRESS": "in_progress",
  "REVISION": "revision",
  "COMPLETED": "completed"
};

// Functional drag board with key-based remounting
const StableDragBoard = React.memo(({
  tasksByStatus,
  usersData,
  updatingTasks,
  onTaskClick,
  onDragStart,
  onDragUpdate,
  onDragEnd,
  boardKey // Add this to force remount when needed
}) => {

  const handleDragStart = useCallback((start) => {

    onDragStart(start);
  }, [onDragStart]);

  const handleDragEnd = useCallback((result) => {

    // Call parent's drag end handler
    onDragEnd(result, () => {
      // Parent cleanup callback - nothing needed here
    });
  }, [onDragEnd]);

  return (
    <div className="relative" key={boardKey}>
      <DragDropContext
        onDragStart={handleDragStart}
        onDragUpdate={onDragUpdate}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-row gap-3 h-[calc(100vh-200px)]">
          {STATUS_COLUMNS.map((column) => (
            <div key={column.id} className="flex-1 flex flex-col bg-gray-100 rounded-md">
              {/* Column header */}
              <div className="px-2 pt-3 pb-2 border-b border-gray-200 bg-white rounded-t-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      {column.title}
                    </span>
                    <span className="text-xs text-slate-500 bg-gray-200 px-2 py-0.5 rounded-full font-medium min-w-[18px] text-center">
                      {tasksByStatus[column.id]?.length || 0}
                    </span>
                  </div>
                  <Button
                    type="text"
                    size="small"
                    icon={<PlusOutlined />}
                    className="w-5 h-5 min-w-[20px] p-0 text-slate-500 text-xs"
                  />
                </div>
              </div>

              <Droppable
                droppableId={column.id}
                type="TASK"
                direction="vertical"
                isDropDisabled={updatingTasks?.size > 5}
              >
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={[
                      "flex-1 p-2 overflow-y-auto overflow-x-hidden min-h-[120px] relative transition-all",
                      snapshot.isDraggingOver
                        ? "bg-blue-50 border-2 border-dashed border-blue-400 rounded-md"
                        : "border-2 border-transparent",
                    ].join(" ")}
                    data-droppable-id={column.id}
                  >
                    {tasksByStatus[column.id]?.length > 0 ? (
                      <TaskList
                        tasks={tasksByStatus[column.id].filter((task) => task && task.id)}
                        onTaskClick={onTaskClick}
                        availableUsers={usersData?.availableUsers || []}
                        updatingTasks={updatingTasks}
                      />
                    ) : (
                      <div className="text-center py-10 px-5 text-slate-500 text-xs">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-2 opacity-50">
                          {column.icon}
                        </div>
                        <div>{column.description}</div>
                      </div>
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
});

const TaskBoard = () => {
  // State management
  const [filters, setFilters] = useState({
    status: null,
    priority: null,
    assigneeId: null,
  });
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [updatingTasks, setUpdatingTasks] = useState(new Set());
  const [boardKey, setBoardKey] = useState(0); // Key to force remount after drag

  // GraphQL queries and mutations
  const {
    data: tasksData,
    loading: tasksLoading,
    refetch: refetchTasks,
    error: tasksError,
  } = useQuery(GET_TASKS, {
    variables: {
      filters: Object.keys(filters).reduce((acc, key) => {
        if (filters[key]) acc[key] = filters[key];
        return acc;
      }, {}),
      search: search || null,
      limit: 1000,
      sortBy: "createdAt",
      sortOrder: "ASC",
    },
    fetchPolicy: "cache-and-network",
    onCompleted: (data) => {
    },
    onError: (error) => {
      console.error("Tasks query error:", error);
    },
  });

  const { data: usersData } = useQuery(GET_AVAILABLE_USERS, {
    fetchPolicy: "cache-and-network",
  });

  const [updateTaskStatus] = useMutation(UPDATE_TASK_STATUS, {
    onCompleted: () => {
      message.success("Task status updated successfully");
    },
    onError: (error) => {
      message.error(`Failed to update task: ${error.message}`);
    },
    // Force Apollo to refetch queries after mutation
    refetchQueries: [
      {
        query: GET_TASKS,
        variables: {
          filters: Object.keys(filters).reduce((acc, key) => {
            if (filters[key]) acc[key] = filters[key];
            return acc;
          }, {}),
          search: search || null,
          limit: 1000,
          sortBy: "createdAt",
          sortOrder: "ASC",
        },
      },
    ],
    awaitRefetchQueries: true,
  });

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const tasks = tasksData?.tasks?.tasks || [];

    // Filter out invalid tasks
    const validTasks = tasks.filter((task) => {
      const isValid = task && task.id &&
        task.id !== "undefined" &&
        task.id !== "null" &&
        task.id !== null;
      if (!isValid) {
      }
      return isValid;
    });

    // Group by status
    const grouped = STATUS_COLUMNS.reduce((acc, column) => {
      acc[column.id] = validTasks.filter((task) => {
        const taskStatus = REVERSE_STATUS_MAP[task.status] || task.status;
        return taskStatus === column.id;
      });
      return acc;
    }, {});

    return grouped;
  }, [tasksData]);

  // Drag handlers
  const handleDragStart = useCallback((start) => {
    window.__isDraggingTask = true;
  }, []);

  const handleDragUpdate = useCallback((update) => {
    // Just track the update, no state changes
  }, []);

  const handleDragEnd = useCallback(async (result, cleanup) => {

    const { destination, source, draggableId } = result;

    // Always cleanup drag state immediately
    window.__isDraggingTask = false;

    // If no destination or no change, force refresh and return
    if (!destination ||
      (destination.droppableId === source.droppableId && destination.index === source.index)) {
      setBoardKey(prev => prev + 1);
      return;
    }

    // Find the task being moved
    const allTasks = Object.values(tasksByStatus).flat();
    const task = allTasks.find((t) => String(t.id) === draggableId);

    if (!task) {
      setBoardKey(prev => prev + 1);
      return;
    }

    // Mark task as updating
    setUpdatingTasks((prev) => new Set(prev).add(draggableId));

    try {
      // Get the new status
      const newStatus = STATUS_MAP[destination.droppableId] || destination.droppableId.toUpperCase();

      // Perform the mutation with proper cache update
      await updateTaskStatus({
        variables: {
          id: draggableId,
          status: newStatus,
        },
        // Optimistic update for immediate UI feedback
        optimisticResponse: {
          updateTaskStatus: {
            __typename: "Task",
            id: draggableId,
            status: newStatus,
            ...task
          }
        },
        // Manual cache update to ensure immediate UI sync
        update: (cache, { data: { updateTaskStatus } }) => {
          try {
            // Read current cache
            const existingTasks = cache.readQuery({
              query: GET_TASKS,
              variables: {
                filters: Object.keys(filters).reduce((acc, key) => {
                  if (filters[key]) acc[key] = filters[key];
                  return acc;
                }, {}),
                search: search || null,
                limit: 1000,
                sortBy: "createdAt",
                sortOrder: "ASC",
              },
            });

            // Update the task in cache
            const updatedTasks = existingTasks.tasks.tasks.map(t =>
              t.id === draggableId ? { ...t, status: newStatus } : t
            );

            // Write back to cache
            cache.writeQuery({
              query: GET_TASKS,
              variables: {
                filters: Object.keys(filters).reduce((acc, key) => {
                  if (filters[key]) acc[key] = filters[key];
                  return acc;
                }, {}),
                search: search || null,
                limit: 1000,
                sortBy: "createdAt",
                sortOrder: "ASC",
              },
              data: {
                ...existingTasks,
                tasks: {
                  ...existingTasks.tasks,
                  tasks: updatedTasks
                }
              },
            });
          } catch (cacheError) {
          }
        }
      });

      // Force a board refresh to ensure UI sync
      setTimeout(() => {
        setBoardKey(prev => prev + 1);
      }, 100);

    } catch (error) {
      console.error('[TaskBoard] Failed to update task status:', error);
      message.error("Failed to update task status");

      // Force refresh on error to restore correct state
      setBoardKey(prev => prev + 1);
    } finally {
      // Remove updating flag
      setUpdatingTasks((prev) => {
        const next = new Set(prev);
        next.delete(draggableId);
        return next;
      });
    }
  }, [tasksByStatus, updateTaskStatus, filters, search]);

  // Task click handler
  const handleTaskClick = useCallback((task) => {
    if (window.__isDraggingTask) {
      return;
    }
    setSelectedTask(task);
    setTaskModalVisible(true);
  }, []);

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap items-center">
          {/* Filters */}
          <Button
            icon={<FilterOutlined />}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filters
          </Button>

          {/* Refresh */}
          <Button
            icon={<ReloadOutlined />}
            onClick={() => refetchTasks()}
            loading={tasksLoading}
          />

          {/* Add task */}
          <Button type="primary" icon={<PlusOutlined />}>
            Add Task
          </Button>
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="bg-white rounded shadow mb-4 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Search
                placeholder="Search tasks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex-1">
              <Select
                placeholder="Priority"
                value={filters.priority}
                onChange={(value) =>
                  setFilters((prev) => ({ ...prev, priority: value }))
                }
                className="w-full"
                allowClear
              >
                <Option value="LOW">Low</Option>
                <Option value="MEDIUM">Medium</Option>
                <Option value="HIGH">High</Option>
                <Option value="URGENT">Urgent</Option>
              </Select>
            </div>
            <div className="flex items-center">
              <Button
                onClick={() => {
                  setFilters({
                    status: null,
                    priority: null,
                    assigneeId: null,
                  });
                  setSearch("");
                }}
              >
                Clear All
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {tasksLoading && (
        <div className="text-center py-20">
          <Spin size="large" />
        </div>
      )}

      {/* Error state */}
      {tasksError && (
        <div className="text-center py-20">
          <div className="bg-white rounded shadow p-6 inline-block">
            <Text type="danger">Error loading tasks: {tasksError.message}</Text>
            <br />
            <Button onClick={() => refetchTasks()} className="mt-4">
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Task board - Stable Component with Key-based Remounting */}
      {!tasksLoading && (
        <StableDragBoard
          boardKey={boardKey}
          tasksByStatus={tasksByStatus}
          usersData={usersData}
          updatingTasks={updatingTasks}
          onTaskClick={handleTaskClick}
          onDragStart={handleDragStart}
          onDragUpdate={handleDragUpdate}
          onDragEnd={handleDragEnd}
        />
      )}

      {/* Task detail modal */}
      {selectedTask && (
        <TaskCard
          task={selectedTask}
          showModal={taskModalVisible}
          availableUsers={usersData?.availableUsers || []}
          hideStatusOnBoard={true}
          onModalClose={() => {
            setTaskModalVisible(false);
            setSelectedTask(null);
          }}
          onTaskUpdate={(updatedTask) => {
            setSelectedTask(updatedTask);
            setTimeout(() => refetchTasks(), 100);
          }}
        />
      )}
    </div>
  );
};

export default TaskBoard;