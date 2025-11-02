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
  
  // Drag and drop state - completely static during drag
  const [updatingTasks, setUpdatingTasks] = useState(new Set());
  
  // Use a single ref to control ALL component behavior during drag
  const dragControlRef = useRef({
    isDragging: false,
    frozenData: null,
    frozenUsers: null,
    dragResult: null,
    componentVersion: 0 // Increment to force single rerender when needed
  });
  
  const [componentKey, setComponentKey] = useState(0);
  const stableTasksRef = useRef(null);
  const refetchTimeoutRef = useRef(null);
  
  // Derived state for drag status
  const isDragging = dragControlRef.current.isDragging;

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
    // Skip query during drag to prevent component updates
    skip: isDragging,
    onCompleted: (data) => {
      console.log("TaskBoard received tasks data:", data?.tasks?.tasks?.length);
      // Store stable reference for drag operations
      stableTasksRef.current = data;
    },
    onError: (error) => {
      console.error("Tasks query error:", error);
    },
  });

  const { data: usersData } = useQuery(GET_AVAILABLE_USERS, {
    fetchPolicy: "cache-and-network",
    skip: isDragging, // Also skip this during drag
  });

  const [updateTaskStatus] = useMutation(UPDATE_TASK_STATUS, {
    onCompleted: () => {
      message.success("Task status updated successfully");
    },
    onError: (error) => {
      message.error(`Failed to update task: ${error.message}`);
    },
  });

  // Safe refetch that respects drag state
  const safeRefetch = useCallback(async () => {
    if (dragStateRef.current.isDragging) {
      console.log('[DnD] Deferring refetch during drag');
      return;
    }
    
    // Clear any pending refetch timeout
    if (refetchTimeoutRef.current) {
      clearTimeout(refetchTimeoutRef.current);
      refetchTimeoutRef.current = null;
    }
    
    try {
      await refetchTasks();
    } catch (error) {
      console.warn("Safe refetch failed:", error);
    }
  }, [refetchTasks]);

  // Deferred refetch after drag ends
  const scheduleRefetch = useCallback(() => {
    if (refetchTimeoutRef.current) {
      clearTimeout(refetchTimeoutRef.current);
    }
    
    refetchTimeoutRef.current = setTimeout(() => {
      if (!dragStateRef.current.isDragging) {
        safeRefetch();
      }
    }, 200);
  }, [safeRefetch]);

  // Group tasks by status with stable reference during drag
  const tasksByStatus = useMemo(() => {
    // If we're dragging and have a snapshot, ALWAYS use it to prevent rerenders
    if (isDragging && dragStateRef.current.taskSnapshot) {
      console.log("Using task snapshot during drag");
      return dragStateRef.current.taskSnapshot;
    }
    
    // Use live data or stable reference when not dragging
    const rawTasks = tasksData || stableTasksRef.current;
    const tasks = rawTasks?.tasks?.tasks || [];
    
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
  }, [tasksData, isDragging]);

  // Update stable reference when tasks change (but not during drag)
  useEffect(() => {
    if (!dragStateRef.current.isDragging && tasksData) {
      stableTasksRef.current = tasksData;
    }
  }, [tasksData]);

  // Drag handlers
  const handleDragStart = useCallback((start) => {
    console.log('[DnD] Drag started:', start.draggableId);
    
    // Set global drag flag
    window.__isDraggingTask = true;
    
    // Take snapshot BEFORE updating state to prevent race conditions
    const snapshot = { ...tasksByStatus };
    
    // Update refs first, then state
    dragStateRef.current = {
      isDragging: true,
      dragResult: { ...start },
      dragEnded: false,
      taskSnapshot: snapshot
    };
    
    // Update state last to trigger minimal rerenders
    setIsDragging(true);
  }, [tasksByStatus]);

  const handleDragUpdate = useCallback((update) => {
    if (dragStateRef.current.isDragging) {
      dragStateRef.current.dragResult = { ...update };
    }
  }, []);

  const handleDragEnd = useCallback(async (result) => {
    console.log('[DnD] Drag ended:', result);
    
    // Mark drag as ended immediately to prevent race conditions
    dragStateRef.current.dragEnded = true;
    
    const { destination, source, draggableId } = result;
    
    // Helper to cleanup drag state with error handling
    const cleanupDragState = () => {
      try {
        window.__isDraggingTask = false;
        
        // Use setTimeout to ensure cleanup happens after react-beautiful-dnd cleanup
        setTimeout(() => {
          setIsDragging(false);
          dragStateRef.current = {
            isDragging: false,
            dragResult: null,
            dragEnded: false,
            taskSnapshot: null
          };
        }, 0);
      } catch (error) {
        console.warn('[DnD] Error during cleanup:', error);
      }
    };

    // If no destination, just cleanup
    if (!destination) {
      cleanupDragState();
      scheduleRefetch();
      return;
    }

    // If no change, just cleanup
    if (destination.droppableId === source.droppableId && 
        destination.index === source.index) {
      cleanupDragState();
      return;
    }

    // Validate destination droppable still exists in DOM
    try {
      const destElement = document.querySelector(`[data-droppable-id="${destination.droppableId}"]`);
      if (!destElement) {
        console.warn('[DnD] Destination droppable not found in DOM:', destination.droppableId);
        cleanupDragState();
        scheduleRefetch();
        return;
      }
    } catch (error) {
      console.warn('[DnD] Error validating destination:', error);
      cleanupDragState();
      scheduleRefetch();
      return;
    }

    // Find the task being moved using the snapshot for consistency
    const snapshotTasks = dragStateRef.current.taskSnapshot || tasksByStatus;
    const allTasks = Object.values(snapshotTasks).flat();
    const task = allTasks.find((t) => String(t.id) === draggableId);
    
    if (!task) {
      console.warn('[DnD] Task not found:', draggableId);
      cleanupDragState();
      scheduleRefetch();
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

      console.log(`[DnD] Task ${draggableId} moved from ${source.droppableId} to ${destination.droppableId}`);
      
    } catch (error) {
      console.error('[DnD] Failed to update task status:', error);
      message.error("Failed to update task status");
    } finally {
      // Remove updating flag
      setUpdatingTasks((prev) => {
        const next = new Set(prev);
        next.delete(draggableId);
        return next;
      });
      
      // Cleanup drag state
      cleanupDragState();
      
      // Schedule a refetch to ensure consistency
      scheduleRefetch();
    }
  }, [tasksByStatus, updateTaskStatus, scheduleRefetch]);

  // Task click handler
  const handleTaskClick = useCallback((task) => {
    // Prevent opening modal during drag
    if (dragStateRef.current.isDragging || window.__isDraggingTask) {
      return;
    }
    setSelectedTask(task);
    setTaskModalVisible(true);
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (refetchTimeoutRef.current) {
        clearTimeout(refetchTimeoutRef.current);
      }
    };
  }, []);

  // Create stable column references that won't change during drag
  const stableColumnsRef = useRef(null);
  
  // Initialize stable columns once
  useEffect(() => {
    if (!stableColumnsRef.current) {
      stableColumnsRef.current = STATUS_COLUMNS.map(column => ({
        ...column,
        tasks: [],
        stableTasksRef: { current: [] }
      }));
    }
  }, []);

  // Memoized Column component with extreme stability during drag
  const Column = React.memo(
    ({ column, tasks = [], onTaskClick, usersData, updatingTasks, isDragging: dragFlag }) => {
      // Use a stable reference for tasks during drag to prevent Droppable remounting
      const tasksRef = useRef(tasks);
      
      // Only update tasks reference when not dragging
      if (!dragFlag) {
        tasksRef.current = tasks;
      }
      
      const renderTasks = dragFlag ? tasksRef.current : tasks;
      
      return (
        <div className="flex-1 flex flex-col bg-gray-100 rounded-md">
          {/* Column header */}
          <div className="px-2 pt-3 pb-2 border-b border-gray-200 bg-white rounded-t-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  {column.title}
                </span>
                <span className="text-xs text-slate-500 bg-gray-200 px-2 py-0.5 rounded-full font-medium min-w-[18px] text-center">
                  {renderTasks?.length || 0}
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
                {renderTasks?.length > 0 ? (
                  <TaskList
                    tasks={renderTasks.filter((task) => task && task.id)}
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
      );
    },
    (prev, next) => {
      // During drag, prevent ALL rerenders to maintain Droppable stability
      if (next.isDragging && prev.isDragging) {
        return true; // Skip rerender during drag
      }
      
      // When transitioning to/from drag state, allow rerender
      if (prev.isDragging !== next.isDragging) {
        return false;
      }
      
      // Normal comparison when not dragging
      if (prev.column.id !== next.column.id) return false;
      
      const prevTasks = prev.tasks || [];
      const nextTasks = next.tasks || [];
      
      if (prevTasks.length !== nextTasks.length) return false;
      if (prevTasks.length > 0 && nextTasks.length > 0) {
        if (prevTasks[0]?.id !== nextTasks[0]?.id) return false;
        if (prevTasks[prevTasks.length - 1]?.id !== nextTasks[nextTasks.length - 1]?.id) return false;
      }
      
      const prevUpdatingSize = prev.updatingTasks?.size || 0;
      const nextUpdatingSize = next.updatingTasks?.size || 0;
      if (prevUpdatingSize !== nextUpdatingSize) return false;
      
      return true;
    }
  );

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
            onClick={safeRefetch}
            loading={tasksLoading}
            disabled={isDragging}
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
                disabled={isDragging}
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
                disabled={isDragging}
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
                disabled={isDragging}
              >
                Clear All
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {tasksLoading && !isDragging && (
        <div className="text-center py-20">
          <Spin size="large" />
        </div>
      )}

      {/* Error state */}
      {tasksError && !isDragging && (
        <div className="text-center py-20">
          <div className="bg-white rounded shadow p-6 inline-block">
            <Text type="danger">Error loading tasks: {tasksError.message}</Text>
            <br />
            <Button onClick={safeRefetch} className="mt-4">
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Task board - Drag & Drop */}
      {!tasksLoading && (
        <div className="relative">
          <DragDropContext
            key="stable-dnd-context" // Stable key to prevent remounting
            onDragStart={handleDragStart}
            onDragUpdate={handleDragUpdate}
            onDragEnd={handleDragEnd}
          >
            <div 
              className="flex flex-row gap-3 h-[calc(100vh-200px)]"
              key={`board-${isDragging ? 'dragging' : 'idle'}`} // Stable during drag
            >
              {STATUS_COLUMNS.map((column) => (
                <Column
                  key={`column-${column.id}-${isDragging ? 'dragging' : 'idle'}`} // Prevent key changes during drag
                  column={column}
                  tasks={tasksByStatus[column.id] || []}
                  onTaskClick={handleTaskClick}
                  usersData={usersData}
                  updatingTasks={updatingTasks}
                  isDragging={isDragging}
                />
              ))}
            </div>
          </DragDropContext>
        </div>
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
            scheduleRefetch();
          }}
        />
      )}
    </div>
  );
};

export default TaskBoard;