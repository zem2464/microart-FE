import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import ReactDOM from "react-dom";
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

// Create a stable portal container that won't be affected by React rerenders
let portalContainer = null;
const getPortalContainer = () => {
  if (!portalContainer) {
    portalContainer = document.createElement('div');
    portalContainer.id = 'taskboard-portal';
    portalContainer.style.position = 'relative';
    portalContainer.style.width = '100%';
    portalContainer.style.height = '100%';
    document.body.appendChild(portalContainer);
  }
  return portalContainer;
};

// Cleanup portal on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (portalContainer && portalContainer.parentNode) {
      portalContainer.parentNode.removeChild(portalContainer);
    }
  });
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
  
  // Drag and drop state - completely isolated from React
  const [isDragMode, setIsDragMode] = useState(false);
  const [updatingTasks, setUpdatingTasks] = useState(new Set());
  
  // Refs for complete drag isolation
  const boardRef = useRef(null);
  const portalRef = useRef(null);
  const dragStateRef = useRef({
    isDragging: false,
    originalBoard: null,
    taskSnapshot: null,
    dragResult: null
  });

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
    // Don't skip during drag - we'll handle it differently
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
    // During drag, use the frozen snapshot
    if (isDragMode && dragStateRef.current.taskSnapshot) {
      console.log("Using frozen task snapshot during drag mode");
      return dragStateRef.current.taskSnapshot;
    }

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
  }, [tasksData, isDragMode]);

  // Move board to portal during drag to isolate from React updates
  const moveToPortal = useCallback(() => {
    if (!boardRef.current) return;
    
    const portal = getPortalContainer();
    const board = boardRef.current;
    
    // Store original parent and position
    dragStateRef.current.originalBoard = {
      parent: board.parentNode,
      nextSibling: board.nextSibling
    };
    
    // Move to portal
    portal.appendChild(board);
    portalRef.current = portal;
    
    console.log('[DnD Portal] Moved board to isolated portal');
  }, []);

  // Move board back from portal after drag
  const moveFromPortal = useCallback(() => {
    if (!portalRef.current || !dragStateRef.current.originalBoard) return;
    
    const board = portalRef.current.children[0];
    const { parent, nextSibling } = dragStateRef.current.originalBoard;
    
    if (board && parent) {
      if (nextSibling) {
        parent.insertBefore(board, nextSibling);
      } else {
        parent.appendChild(board);
      }
    }
    
    // Clear portal reference
    portalRef.current = null;
    dragStateRef.current.originalBoard = null;
    
    console.log('[DnD Portal] Moved board back to original location');
  }, []);

  // Drag handlers with portal isolation
  const handleDragStart = useCallback((start) => {
    console.log('[DnD Portal] Drag started:', start.draggableId);
    
    // Set global drag flag
    window.__isDraggingTask = true;
    
    // Freeze current state
    dragStateRef.current = {
      isDragging: true,
      dragResult: { ...start },
      taskSnapshot: { ...tasksByStatus },
      originalBoard: null
    };
    
    // Move board to isolated portal
    moveToPortal();
    
    // Enable drag mode to freeze React updates
    setIsDragMode(true);
    
  }, [tasksByStatus, moveToPortal]);

  const handleDragUpdate = useCallback((update) => {
    if (dragStateRef.current.isDragging) {
      dragStateRef.current.dragResult = { ...update };
    }
  }, []);

  const handleDragEnd = useCallback(async (result) => {
    console.log('[DnD Portal] Drag ended:', result);
    
    const { destination, source, draggableId } = result;
    
    // Helper to cleanup drag state
    const cleanupDragState = () => {
      try {
        window.__isDraggingTask = false;
        dragStateRef.current.isDragging = false;
        
        // Move board back from portal
        moveFromPortal();
        
        // Exit drag mode to resume React updates
        setTimeout(() => {
          setIsDragMode(false);
          dragStateRef.current.taskSnapshot = null;
        }, 100);
        
      } catch (error) {
        console.warn('[DnD Portal] Error during cleanup:', error);
      }
    };

    // If no destination, just cleanup
    if (!destination) {
      cleanupDragState();
      return;
    }

    // If no change, just cleanup
    if (destination.droppableId === source.droppableId && 
        destination.index === source.index) {
      cleanupDragState();
      return;
    }

    // Find the task being moved using the frozen snapshot
    const snapshotTasks = dragStateRef.current.taskSnapshot;
    const allTasks = Object.values(snapshotTasks).flat();
    const task = allTasks.find((t) => String(t.id) === draggableId);
    
    if (!task) {
      console.warn('[DnD Portal] Task not found:', draggableId);
      cleanupDragState();
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

      console.log(`[DnD Portal] Task ${draggableId} moved from ${source.droppableId} to ${destination.droppableId}`);
      
    } catch (error) {
      console.error('[DnD Portal] Failed to update task status:', error);
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
      
      // Refetch after a delay to ensure state is stable
      setTimeout(() => {
        if (!dragStateRef.current.isDragging) {
          refetchTasks();
        }
      }, 300);
    }
  }, [updateTaskStatus, moveFromPortal, refetchTasks]);

  // Task click handler
  const handleTaskClick = useCallback((task) => {
    // Prevent opening modal during drag
    if (dragStateRef.current.isDragging || window.__isDraggingTask) {
      return;
    }
    setSelectedTask(task);
    setTaskModalVisible(true);
  }, []);

  // Safe refetch that respects drag state
  const safeRefetch = useCallback(async () => {
    if (dragStateRef.current.isDragging || isDragMode) {
      console.log('[DnD Portal] Deferring refetch during drag mode');
      return;
    }
    
    try {
      await refetchTasks();
    } catch (error) {
      console.warn("Safe refetch failed:", error);
    }
  }, [refetchTasks, isDragMode]);

  // Column component that's completely stable during drag mode
  const Column = React.memo(
    ({ column, tasks = [], onTaskClick, usersData, updatingTasks }) => {
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
                  {tasks?.length || 0}
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
                {tasks?.length > 0 ? (
                  <TaskList
                    tasks={tasks.filter((task) => task && task.id)}
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
    () => {
      // During drag mode, prevent ALL rerenders to maintain complete stability
      return isDragMode;
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
            disabled={isDragMode}
          >
            Filters
          </Button>

          {/* Refresh */}
          <Button
            icon={<ReloadOutlined />}
            onClick={safeRefetch}
            loading={tasksLoading}
            disabled={isDragMode}
          />

          {/* Add task */}
          <Button type="primary" icon={<PlusOutlined />} disabled={isDragMode}>
            Add Task
          </Button>
          
          {/* Drag mode indicator */}
          {isDragMode && (
            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
              Drag Mode Active
            </span>
          )}
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && !isDragMode && (
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
      {tasksLoading && !isDragMode && (
        <div className="text-center py-20">
          <Spin size="large" />
        </div>
      )}

      {/* Error state */}
      {tasksError && !isDragMode && (
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

      {/* Task board - Portal-isolated Drag & Drop */}
      {!tasksLoading && (
        <div 
          ref={boardRef}
          className="relative"
        >
          <DragDropContext
            onDragStart={handleDragStart}
            onDragUpdate={handleDragUpdate}
            onDragEnd={handleDragEnd}
          >
            <div className="flex flex-row gap-3 h-[calc(100vh-200px)]">
              {STATUS_COLUMNS.map((column) => (
                <Column
                  key={`stable-column-${column.id}`}
                  column={column}
                  tasks={tasksByStatus[column.id] || []}
                  onTaskClick={handleTaskClick}
                  usersData={usersData}
                  updatingTasks={updatingTasks}
                />
              ))}
            </div>
          </DragDropContext>
        </div>
      )}

      {/* Task detail modal */}
      {selectedTask && !isDragMode && (
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
            setTimeout(safeRefetch, 100);
          }}
        />
      )}
    </div>
  );
};

export default TaskBoard;