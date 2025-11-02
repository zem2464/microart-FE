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
import {
  DragDropContext,
  Droppable,
  useKeyboardSensor,
  useMouseSensor,
  useTouchSensor,
} from "react-beautiful-dnd";
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
  
  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const [updatingTasks, setUpdatingTasks] = useState(new Set());
  const [taskSnapshot, setTaskSnapshot] = useState(null);
  
  // Refs for drag state tracking
  const dragResultRef = useRef(null);
  const dragEndedRef = useRef(false);
  const isDraggingRef = useRef(false);
  const lastTasksRef = useRef(null);
  const pendingRefetchRef = useRef(false);

  // Status mapping between frontend and backend
  const STATUS_MAP = useMemo(() => ({
    "todo": "TODO",
    "in_progress": "IN_PROGRESS", 
    "revision": "REVISION",
    "completed": "COMPLETED"
  }), []);

  const REVERSE_STATUS_MAP = useMemo(() => ({
    "TODO": "todo",
    "IN_PROGRESS": "in_progress",
    "REVISION": "revision", 
    "COMPLETED": "completed"
  }), []);

  // --- DnD and Task Handlers ---

  // Called when drag starts - simplified to prevent unnecessary state updates
  const handleDragStart = useCallback((start) => {
    console.log('[DnD] Drag started:', start.draggableId);
    window.__isDraggingTask = true;
    setIsDragging(true);
    isDraggingRef.current = true;
    
    // Store drag state for potential force end
    dragResultRef.current = { ...start };
    dragEndedRef.current = false;
    
    // Take snapshot ONLY if we have valid data
    if (tasksByStatus && Object.keys(tasksByStatus).length > 0) {
      setTaskSnapshot({ ...tasksByStatus });
    }
  }, [tasksByStatus]);

  // Called when drag updates
  const handleDragUpdate = useCallback((update) => {
    dragResultRef.current = { ...update };
  }, []);

  // Called when drag ends
  const handleDragEnd = async (result) => {
    // mark ended to avoid double-calling from forced pointerup handler
    dragEndedRef.current = true;
    // Note: we do NOT clear `isDragging` immediately here. We keep the
    // dragging flag true until after we've finished the react-beautiful-dnd
    // internal cleanup and any snapshot/refetch handling. Clearing the flag
    // too early lets other parts of the app trigger refetches or state
    // updates that can unmount Droppables while RBD is still cleaning up
    // resulting in the "Cannot find droppable entry" invariant.

    // Defer clearing the snapshot and refetch to give react-beautiful-dnd
    // internal cleanup time to complete. Using a slightly larger delay reduces
    // the chance of unmounting droppables while RBD is cleaning up and
    // causing the "Cannot find droppable entry" invariant.
    const clearSnapshotAndRefetch = (delay = 120) => {
      return new Promise((resolve) => {
        // clear the temporary snapshot used during drag after a short delay
        setTimeout(() => {
          try {
            setUseSnapshot(false);
            setTaskSnapshot(null);
          } catch (e) {
            console.warn("clear snapshot failed:", e);
          }
          // refetch tasks after clearing snapshot to ensure UI consistency
          try {
            safeRefetch();
          } catch (e) {
            console.warn("safeRefetch failed:", e);
          }
          resolve();
        }, delay);
      });
    };

    // Helper to gracefully finalize a drag without performing backend updates
    // This is used when the destination droppable is no longer mounted which
    // would otherwise cause react-beautiful-dnd to throw an invariant.
    const safeFinalizeDrag = async () => {
      try {
        // finalize and wait for snapshot/refetch to complete
        await clearSnapshotAndRefetch(120);
      } catch (err) {
        console.error("safeFinalizeDrag error:", err);
      }
    };

    const { destination, source, draggableId } = result;
    if (!destination) {
      // Dropped outside any droppable — finalize safely (no backend updates)
      await safeFinalizeDrag();
      return;
    }
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      // No visual change — finalize safely to clear snapshot and refs
      await clearSnapshotAndRefetch();
      return; // No change
    }

    // Find the task being moved
    const task = Object.values(tasksByStatus)
      .flat()
      .find((t) => String(t.id) === draggableId);
    if (!task) {
      // Task not found in snapshot/live data — finalize safely
      await clearSnapshotAndRefetch();
      return;
    }

    // Validate that destination droppable is still present in the DOM. In some
    // cases a refetch or component unmount during drag can remove the droppable
    // from the registry which causes react-beautiful-dnd to throw:
    // "Cannot find droppable entry with id [<id>]". If the droppable node is
    // not present, finalize safely without attempting to compute the drop.
    try {
      const selector = destination?.droppableId
        ? `[data-rbd-droppable-id="${destination.droppableId}"], [data-testid=\"droppable-${destination.droppableId}\"]`
        : null;
      const destPresent = selector ? document.querySelector(selector) : null;
      if (destination && !destPresent) {
        console.warn(
          `[DnD Guard] destination '${destination.droppableId}' not present in DOM — cancelling mutation`
        );
        await safeFinalizeDrag();
        return;
      }
    } catch (err) {
      console.warn("Error while validating destination DOM presence:", err);
    }

    // Optimistically update UI
    const updatedTask = { ...task, status: destination.droppableId };
    setTaskSnapshot((prev) => {
      if (!prev) return prev;
      const newSnapshot = { ...prev };
      // Remove from old column
      newSnapshot[source.droppableId] = newSnapshot[source.droppableId].filter(
        (t) => String(t.id) !== draggableId
      );
      // Insert into new column at correct index
      newSnapshot[destination.droppableId] = [
        ...newSnapshot[destination.droppableId].slice(0, destination.index),
        updatedTask,
        ...newSnapshot[destination.droppableId].slice(destination.index),
      ];
      return newSnapshot;
    });

    // Mark as updating
    setUpdatingTasks((prev) => new Set(prev).add(draggableId));

    // Update backend
    try {
      // Map droppableId to TaskStatus enum (uppercase)
      const statusMap = {
        todo: "TODO",
        in_progress: "IN_PROGRESS",
        revision: "REVISION",
        completed: "COMPLETED",
      };
      const newStatus =
        statusMap[destination.droppableId] ||
        destination.droppableId.toUpperCase();
      await updateTaskStatus({
        variables: {
          id: draggableId,
          status: newStatus,
        },
      });
      // Refetch tasks to ensure consistency (deferred to avoid RBD cleanup races)
      await clearSnapshotAndRefetch();
    } catch (error) {
      message.error("Failed to update task status");
    } finally {
      setUpdatingTasks((prev) => {
        const next = new Set(prev);
        next.delete(draggableId);
        return next;
      });
      // Now that we've completed the backend update and waited for the
      // snapshot/refetch cleanup, it's safe to clear the dragging state so
      // other UI updates can proceed.
      try {
        setIsDragging(false);
        window.__isDraggingTask = false;
      } catch (e) {
        // swallow errors here — not critical
      }
    }
  };

  // ...existing code...

  // Called when a task card is clicked
  const handleTaskClick = useCallback((task) => {
    setSelectedTask(task);
    setTaskModalVisible(true);
  }, []);
  // While dragging, optionally listen for pointerup/mouseup and force end if RBD missed it
  useEffect(() => {
    if (!isDragging) return;
    if (!ENABLE_FORCE_END) return;
    const onPointerUp = async (e) => {
      console.log('[DnD Debug] pointerup event:', e.type, e);
      if (!dragEndedRef.current && dragResultRef.current) {
        console.warn('[DnD Debug] Forcing drag end (pointerup detected)');
        try {
          const last = dragResultRef.current;
          const destId = last?.destination?.droppableId;
          // Validate droppable exists in DOM to avoid RBD registry errors
          const selector = destId
            ? `[data-rbd-droppable-id="${destId}"], [data-testid="droppable-${destId}"]`
            : null;
          const droppablePresent = selector ? document.querySelector(selector) : null;
          if (destId && !droppablePresent) {
            console.warn(`[DnD Debug] destination '${destId}' not present in DOM - cancelling drop`);
            // Call handler with destination null to gracefully cancel
            await handleDragEnd({ ...last, destination: null });
          } else {
            await handleDragEnd(last);
          }
        } catch (err) {
          console.error('[DnD Debug] Error forcing drag end:', err);
        }
      }
    };
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('mouseup', onPointerUp);
    return () => {
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('mouseup', onPointerUp);
    };
  }, [isDragging, ENABLE_FORCE_END]);

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
      console.log("TaskBoard received tasks data:", data?.tasks?.tasks);
    },
    onError: (error) => {
      console.error("Tasks query error:", error);
    },
  });

  // Cache the last successful tasks query result so that when the query is
  // skipped during a drag (we use `skip: isDragging`) we still have stable
  // data to render. Without this, `tasksData` becomes `undefined` while
  // dragging and the grouped `tasksByStatus` can change mid-drag which
  // destabilizes react-beautiful-dnd and leads to invariants.
  const lastTasksRef = useRef(null);
  useEffect(() => {
    if (tasksData) {
      lastTasksRef.current = tasksData;
    }
  }, [tasksData]);

  // Ref that mirrors `isDragging` so helpers called from outside React's
  // render cycle can check drag state synchronously.
  const isDraggingRef = useRef(isDragging);
  useEffect(() => {
    isDraggingRef.current = isDragging;
    // If dragging just finished and there was a deferred refetch, run it now
    if (!isDragging && pendingRefetchRef.current) {
      pendingRefetchRef.current = false;
      try {
        safeRefetch();
      } catch (e) {
        console.warn("deferred refetch failed:", e);
      }
    }
  }, [isDragging]);

  // Queue a deferred refetch if a refetch is requested during a drag. This
  // prevents refetch-driven unmounts while react-beautiful-dnd is cleaning up.
  const pendingRefetchRef = useRef(false);
  const safeRefetch = async () => {
    if (isDraggingRef.current) {
      // mark that a refetch is pending and skip for now
      pendingRefetchRef.current = true;
      return;
    }
    try {
      return await refetchTasks();
    } catch (e) {
      console.warn("safeRefetch failed:", e);
    }
  };

  // Fetch available users for task assignment and mentions
  const { data: usersData } = useQuery(GET_AVAILABLE_USERS, {
    fetchPolicy: "cache-and-network",
  });

  const [updateTaskStatus] = useMutation(UPDATE_TASK_STATUS, {
    onCompleted: () => {
      message.success("Task status updated successfully");
      // Refetch will be handled by the drag end handler
    },
    onError: (error) => {
      message.error(`Failed to update task: ${error.message}`);
    },
  });

// Task status columns (stable reference outside component)
// TODO: Make this configurable per-project if different workflows are needed
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

// Shallow compare two task arrays by id and length — cheap and stable.
const shallowTasksEqual = (a = [], b = []) => {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (String(a[i]?.id) !== String(b[i]?.id)) return false;
  }
  return true;
};

// A memoized Column component to keep Droppable identity stable during drags.
const Column = React.memo(
  ({
    column,
    tasks = [],
    onTaskClick,
    usersData,
    updatingTasks,
  }) => {
    return (
      <div className="flex-1 flex flex-col bg-gray-100 rounded-md" key={column.id}>
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
          isDropDisabled={(updatingTasks?.size || 0) > 5}
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
  (prev, next) => {
    // Avoid re-rendering the Column while dragging unless the tasks change.
    // Compare tasks shallowly and compare updatingTasks by size (not reference)
    if (prev.column.id !== next.column.id) return false;
    if (!shallowTasksEqual(prev.tasks, next.tasks)) return false;
    const prevUpdatingSize = prev.updatingTasks ? prev.updatingTasks.size : 0;
    const nextUpdatingSize = next.updatingTasks ? next.updatingTasks.size : 0;
    if (prevUpdatingSize !== nextUpdatingSize) return false;
    return true;
  }
);

// Portal wrapper that mounts its children into a stable DOM node appended to
// document.body. This keeps the Droppable DOM outside of the React subtree
// that may be re-rendered/updated during drag operations and reduces the
// chance of accidental unmounts while react-beautiful-dnd is cleaning up.
const DroppablePortal = ({ children }) => {
  const containerRef = useRef(null);
  useEffect(() => {
    const el = document.createElement('div');
    el.setAttribute('id', 'taskboard-droppables-root');
    // Keep portal visually in the same place by default; styles can be
    // controlled via CSS if needed. For now we append at end of body.
    document.body.appendChild(el);
    containerRef.current = el;
    return () => {
      try {
        if (containerRef.current && containerRef.current.parentNode) {
          containerRef.current.parentNode.removeChild(containerRef.current);
        }
      } catch (err) {
        // ignore
      }
    };
  }, []);

  if (!containerRef.current) return null;
  return ReactDOM.createPortal(children, containerRef.current);
};

  // Create a stable snapshot of tasks for drag operations
  const [taskSnapshot, setTaskSnapshot] = useState(null);
  const [useSnapshot, setUseSnapshot] = useState(false);

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    if (useSnapshot && taskSnapshot) {
      console.log("Using task snapshot during drag");
      return taskSnapshot;
    }

    // Prefer the live `tasksData` but fall back to the cached `lastTasksRef`
    // when the query is skipped/paused during a drag. This avoids a
    // transient `undefined` value that would make our grouped lists empty
    // and cause droppables to unmount during a drag.
    const raw = tasksData ?? lastTasksRef.current;
    console.log("Raw tasks data:", raw);
    const tasks = raw?.tasks?.tasks || [];
    // ...existing code for filtering and grouping...
    const validTasks = tasks.filter((task) => {
      const isValid =
        task &&
        task.id &&
        task.id !== "undefined" &&
        task.id !== "null" &&
        task.id !== null;
      if (!isValid) {
        console.warn("Filtering out invalid task:", task);
      }
      return isValid;
    });
    const grouped = STATUS_COLUMNS.reduce((acc, column) => {
      acc[column.id] = validTasks.filter((task) => task.status === column.id);
      return acc;
    }, {});
    return grouped;
  }, [tasksData, useSnapshot, taskSnapshot]);

    // Debug: Track previous columns and tasks to detect re-renders during drag
    const prevColumnsRef = useRef();
    const prevTasksRef = useRef();

    useEffect(() => {
      if (isDragging) {
        const columnsChanged =
          prevColumnsRef.current &&
          JSON.stringify(Object.keys(tasksByStatus)) !==
            JSON.stringify(Object.keys(prevColumnsRef.current));
        const tasksChanged =
          prevTasksRef.current &&
          JSON.stringify(tasksByStatus) !== JSON.stringify(prevTasksRef.current);
        if (columnsChanged) {
          console.warn(
            "[DnD Debug] Columns changed during drag! This will break DnD context."
          );
        }
        if (tasksChanged) {
          console.warn(
            "[DnD Debug] Tasks changed during drag! This will break DnD context."
          );
        }
      }
      prevColumnsRef.current = tasksByStatus;
      prevTasksRef.current = tasksByStatus;
    }, [tasksByStatus, isDragging]);

    // Ref for board container to observe DOM changes during drag
    const boardRef = useRef(null);

    // If enabled, observe mount/unmounts within the board while dragging to detect
    // whether any droppable nodes are being removed during the drag.
    useEffect(() => {
      if (!isDragging || !ENABLE_MOUNT_LOG) return;
      const root = boardRef.current || document.body;
      const observer = new MutationObserver((mutations) => {
          for (const m of mutations) {
            if (m.removedNodes && m.removedNodes.length) {
              m.removedNodes.forEach((node) => {
                if (!(node instanceof HTMLElement)) return;
                const droppableId = node.getAttribute('data-rbd-droppable-id');
                if (droppableId) {
                  // Provide a stack trace and contextual state so we can see what
                  // the app state was when a droppable element was removed.
                  console.warn(
                    '[DnD MountLog] Droppable removed during drag:',
                    droppableId,
                    node
                  );
                  try {
                    console.log('[DnD MountLog] Context:', {
                      isDragging: isDraggingRef?.current ?? isDragging,
                      useSnapshot,
                      pendingRefetch: pendingRefetchRef?.current,
                      updatingTasksSize: updatingTasks ? updatingTasks.size : 0,
                      tasksByStatusSummary: Object.keys(tasksByStatus || {}).reduce((acc, k) => {
                        acc[k] = (tasksByStatus[k] || []).length;
                        return acc;
                      }, {}),
                    });
                  } catch (err) {
                    console.warn('[DnD MountLog] Failed to stringify context', err);
                  }
                  // Print a stack trace to aid debugging; the trace will show the
                  // call-site within the MutationObserver callback (helpful to
                  // correlate with browser event timing), even though it won't
                  // show the original code that removed the node.
                  console.trace('[DnD MountLog] trace');
                }
              });
            }
          }
      });
      observer.observe(root, { childList: true, subtree: true });
      return () => observer.disconnect();
    }, [isDragging, ENABLE_MOUNT_LOG]);

  // Only update snapshot and switch to it on drag start
  // (handled below, only one declaration)

  // On drag end, switch back to live data after backend update
  // (handled below, only one declaration)

  return (
    <div className=" flex flex-col">
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
                  onClick={() => safeRefetch()}
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
              <Button onClick={() => safeRefetch()} className="mt-4">
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Task board - Jira style with Drag & Drop */}
      {!tasksLoading && (
        <div className="relative">
          <DragDropContext
            onDragStart={handleDragStart}
            onDragUpdate={handleDragUpdate}
            onDragEnd={handleDragEnd}
            onBeforeCapture={(before) => {
              const { draggableId } = before;
              const allTasks = Object.values(tasksByStatus).flat();
              const taskExists = allTasks.some(
                (task) => String(task.id) === draggableId
              );
              if (!taskExists) {
                safeRefetch();
                return;
              }
            }}
            sensors={[useMouseSensor, useKeyboardSensor, useTouchSensor]}
          >
            <div className="flex flex-row gap-3 h-[calc(100vh-200px)]">
              {STATUS_COLUMNS.map((column) => (
                <Column
                  key={column.id}
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
            safeRefetch();
          }}
        />
      )}

      {/* Most custom styles removed in favor of Tailwind CSS */}
    </div>
  );
};

export default TaskBoard;
