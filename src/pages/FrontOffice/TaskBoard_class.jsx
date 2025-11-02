import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
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

// Create a stable component that will never re-render during drag
class StableDragBoard extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isDragActive: false,
      frozenTasks: null,
      frozenUsers: null,
      frozenUpdatingTasks: new Set()
    };
    this.dragInProgress = false;
  }

  // Prevent all updates during drag
  shouldComponentUpdate(nextProps, nextState) {
    // Only update when drag state changes or when not dragging
    if (this.dragInProgress) {
      return false; // NEVER update during drag
    }
    return true;
  }

  freezeForDrag = (tasksByStatus, usersData, updatingTasks) => {
    this.dragInProgress = true;
    this.setState({
      isDragActive: true,
      frozenTasks: { ...tasksByStatus },
      frozenUsers: usersData,
      frozenUpdatingTasks: new Set(updatingTasks)
    });
    console.log('[Stable Board] Frozen for drag - no updates possible');
  };

  unfreezeAfterDrag = () => {
    this.dragInProgress = false;
    this.setState({
      isDragActive: false,
      frozenTasks: null,
      frozenUsers: null,
      frozenUpdatingTasks: new Set()
    });
    console.log('[Stable Board] Unfrozen after drag - updates resumed');
  };

  render() {
    const { tasksByStatus, usersData, updatingTasks, onTaskClick, onDragStart, onDragUpdate, onDragEnd } = this.props;
    const { isDragActive, frozenTasks, frozenUsers, frozenUpdatingTasks } = this.state;

    // Use frozen data during drag, live data otherwise
    const effectiveTasks = isDragActive ? frozenTasks : tasksByStatus;
    const effectiveUsers = isDragActive ? frozenUsers : usersData;
    const effectiveUpdatingTasks = isDragActive ? frozenUpdatingTasks : updatingTasks;

    return (
      <div className="relative">
        <DragDropContext
          onDragStart={(start) => {
            this.freezeForDrag(tasksByStatus, usersData, updatingTasks);
            onDragStart(start);
          }}
          onDragUpdate={onDragUpdate}
          onDragEnd={(result) => {
            const cleanup = () => {
              setTimeout(() => this.unfreezeAfterDrag(), 100);
            };
            onDragEnd(result, cleanup);
          }}
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
                        {effectiveTasks[column.id]?.length || 0}
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
                  isDropDisabled={effectiveUpdatingTasks?.size > 5}
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
                      {effectiveTasks[column.id]?.length > 0 ? (
                        <TaskList
                          tasks={effectiveTasks[column.id].filter((task) => task && task.id)}
                          onTaskClick={onTaskClick}
                          availableUsers={effectiveUsers?.availableUsers || []}
                          updatingTasks={effectiveUpdatingTasks}
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
  }
}

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
  
  // Ref to control the stable board
  const stableBoardRef = useRef(null);

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
      console.log("TaskBoard received tasks data:", data?.tasks?.tasks?.length);
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
        console.warn("Filtering out invalid task:", task);
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
    console.log('[TaskBoard] Drag started:', start.draggableId);
    window.__isDraggingTask = true;
  }, []);

  const handleDragUpdate = useCallback((update) => {
    // Just track the update, no state changes
  }, []);

  const handleDragEnd = useCallback(async (result, cleanup) => {
    console.log('[TaskBoard] Drag ended:', result);
    
    const { destination, source, draggableId } = result;
    
    // Always cleanup first
    const performCleanup = () => {
      window.__isDraggingTask = false;
      if (cleanup) cleanup();
    };

    // If no destination, just cleanup
    if (!destination) {
      performCleanup();
      return;
    }

    // If no change, just cleanup
    if (destination.droppableId === source.droppableId && 
        destination.index === source.index) {
      performCleanup();
      return;
    }

    // Find the task being moved
    const allTasks = Object.values(tasksByStatus).flat();
    const task = allTasks.find((t) => String(t.id) === draggableId);
    
    if (!task) {
      console.warn('[TaskBoard] Task not found:', draggableId);
      performCleanup();
      return;
    }

    // Mark task as updating
    setUpdatingTasks((prev) => new Set(prev).add(draggableId));

    try {
      // Get the new status
      const newStatus = STATUS_MAP[destination.droppableId] || destination.droppableId.toUpperCase();
      
      // Update backend
      await updateTaskStatus({
        variables: {
          id: draggableId,
          status: newStatus,
        },
      });

      console.log(`[TaskBoard] Task ${draggableId} moved from ${source.droppableId} to ${destination.droppableId}`);
      
    } catch (error) {
      console.error('[TaskBoard] Failed to update task status:', error);
      message.error("Failed to update task status");
    } finally {
      // Remove updating flag
      setUpdatingTasks((prev) => {
        const next = new Set(prev);
        next.delete(draggableId);
        return next;
      });
      
      // Cleanup and refetch
      performCleanup();
      
      // Refetch after a delay to ensure state is stable
      setTimeout(() => {
        refetchTasks();
      }, 200);
    }
  }, [tasksByStatus, updateTaskStatus, refetchTasks]);

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

      {/* Task board - Stable Class Component */}
      {!tasksLoading && (
        <StableDragBoard
          ref={stableBoardRef}
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