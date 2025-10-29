import React, { useState, useEffect, useMemo } from "react";
import {
  Row,
  Col,
  Card,
  Tag,
  Typography,
  Button,
  Input,
  Select,
  Avatar,
  Dropdown,
  Menu,
  Modal,
  message,
  Spin,
  Badge,
  Tooltip,
  Space,
  Empty,
} from "antd";
import {
  PlusOutlined,
  UserOutlined,
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  FilterOutlined,
  SearchOutlined,
  ReloadOutlined,
  SettingOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  FlagOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation } from "@apollo/client";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { GET_TASKS, UPDATE_TASK_STATUS, DELETE_TASK } from "../../gql/tasks";
import TaskCard from "../../components/TaskCard";

dayjs.extend(relativeTime);

const { Title, Text } = Typography;
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
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

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
    // Prevent refetching during drag operations
    skip: isDragging,
    onCompleted: (data) => {
      console.log("Tasks data received:", data);
    },
    onError: (error) => {
      console.error("Tasks query error:", error);
    },
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

  const [deleteTask] = useMutation(DELETE_TASK, {
    onCompleted: () => {
      message.success("Task deleted successfully");
      refetchTasks();
    },
    onError: (error) => {
      message.error(`Failed to delete task: ${error.message}`);
    },
  });

// Task status mapping - moved outside component to prevent re-creation
// TODO: Implement project-specific status columns based on project workflow settings
// This should be dynamically loaded from project configuration where different projects
// can have different task status workflows (e.g., some projects may skip review stages)
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

  // Create a stable snapshot of tasks for drag operations
  const [taskSnapshot, setTaskSnapshot] = useState({});

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    // During drag operations, use the stable snapshot
    if (isDragging && Object.keys(taskSnapshot).length > 0) {
      console.log("Using task snapshot during drag");
      return taskSnapshot;
    }

    console.log("Raw tasks data:", tasksData);
    const tasks = tasksData?.tasks?.tasks || [];
    console.log("Parsed tasks:", tasks);

    // Filter out tasks without valid IDs
    const validTasks = tasks.filter((task) => task && task.id);
    console.log("Valid tasks with IDs:", validTasks.length);

    // Log all unique status values in the tasks
    const uniqueStatuses = [...new Set(validTasks.map((task) => task.status))];
    console.log("Unique task statuses found:", uniqueStatuses);
    console.log(
      "Expected status columns:",
      STATUS_COLUMNS.map((col) => col.id)
    );

    const grouped = STATUS_COLUMNS.reduce((acc, column) => {
      acc[column.id] = validTasks.filter((task) => task.status === column.id);
      console.log(`Tasks with status ${column.id}:`, acc[column.id].length);
      // Log task IDs for debugging
      console.log(`Task IDs in ${column.id}:`, acc[column.id].map(t => t.id));
      return acc;
    }, {});
    console.log("Grouped tasks by status:", grouped);
    
    return grouped;
  }, [tasksData, isDragging]);

  // Update snapshot when tasksByStatus changes and we're not dragging
  useEffect(() => {
    if (!isDragging && Object.keys(tasksByStatus).length > 0) {
      setTaskSnapshot(tasksByStatus);
    }
  }, [tasksByStatus, isDragging]);

  // Priority colors - Jira style
  const getPriorityColor = (priority) => {
    const colors = {
      LOW: "#00875a",     // Green
      MEDIUM: "#0052cc",  // Blue  
      HIGH: "#ff8b00",    // Orange
      URGENT: "#de350b",  // Red
      A: "#de350b",       // Red (if using A/B/C system)
      B: "#ff8b00",       // Orange
      C: "#00875a",       // Green
    };
    return colors[priority] || "#6b778c";
  };

  // Task actions
  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setTaskModalVisible(true);
  };

  const handleDeleteTask = (taskId) => {
    Modal.confirm({
      title: "Delete Task",
      content:
        "Are you sure you want to delete this task? This action cannot be undone.",
      okText: "Delete",
      okType: "danger",
      onOk: () => {
        deleteTask({ variables: { id: taskId } });
      },
    });
  };

  const handleStatusChange = React.useCallback((taskId, newStatus) => {
    // Convert lowercase column ID to uppercase GraphQL enum value
    const upperCaseStatus = newStatus.toUpperCase();
    
    console.log('Updating task status:', { taskId, newStatus, upperCaseStatus });
    
    updateTaskStatus({
      variables: {
        id: taskId,
        status: upperCaseStatus,
        notes: `Status changed to ${newStatus}`,
      },
    });
  }, [updateTaskStatus]);

  // Handle drag start
  const handleDragStart = React.useCallback(() => {
    setIsDragging(true);
  }, []);

  // Handle drag end - use useCallback to prevent re-creation on each render
  const handleDragEnd = React.useCallback((result) => {
    const { destination, source, draggableId } = result;

    console.log('Drag end:', { destination, source, draggableId });

    // Always reset dragging state first
    setIsDragging(false);

    // Refetch tasks after a short delay to ensure fresh data
    setTimeout(() => {
      refetchTasks();
    }, 100);

    // If dropped outside a droppable area
    if (!destination) {
      console.log('Dropped outside droppable area');
      return;
    }

    // If dropped in the same position
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      console.log('Dropped in same position');
      return;
    }

    // Update task status if moved to different column
    if (destination.droppableId !== source.droppableId) {
      // Use the draggableId directly as it's the task ID
      updateTaskStatus({
        variables: {
          id: draggableId,
          status: destination.droppableId.toUpperCase(),
          notes: `Status changed to ${destination.droppableId}`,
        },
      });
    }
  }, [updateTaskStatus, refetchTasks]);

  // Task card display component - Jira-style design
  const TaskCardDisplay = React.memo(({ task }) => {
    return (
      <div
        className="jira-task-card"
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid #dfe1e6",
        borderRadius: "3px",
        padding: "8px 12px",
        marginBottom: "8px",
        cursor: "grab",
        boxShadow: selectedTasks.includes(task.id)
          ? "0 0 0 2px #0052cc"
          : "0 1px 2px rgba(9, 30, 66, 0.25)",
        transition: "all 0.2s ease",
        position: "relative",
        userSelect: "none",
      }}
      onMouseEnter={(e) => {
        if (!selectedTasks.includes(task.id)) {
          e.currentTarget.style.backgroundColor = "#f4f5f7";
          e.currentTarget.style.boxShadow = "0 2px 4px rgba(9, 30, 66, 0.25)";
        }
      }}
      onMouseLeave={(e) => {
        if (!selectedTasks.includes(task.id)) {
          e.currentTarget.style.backgroundColor = "#ffffff";
          e.currentTarget.style.boxShadow = "0 1px 2px rgba(9, 30, 66, 0.25)";
        }
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (e.ctrlKey || e.metaKey) {
          setSelectedTasks((prev) =>
            prev.includes(task.id)
              ? prev.filter((id) => id !== task.id)
              : [...prev, task.id]
          );
        } else {
          handleTaskClick(task);
        }
      }}
    >
      {/* Task header with type and actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {/* Task type color indicator */}
          {task.taskType && (
            <div
              style={{
                width: "12px",
                height: "12px",
                backgroundColor: task.taskType.color || "#6b778c",
                borderRadius: "2px",
                flexShrink: 0,
              }}
            />
          )}
          
          {/* Task code */}
          <Text
            style={{
              fontSize: "11px",
              color: "#6b778c",
              fontWeight: "500",
              lineHeight: "16px",
            }}
          >
            {task.taskCode}
          </Text>
        </div>

        {/* Actions dropdown */}
        <Dropdown
          overlay={
            <Menu>
              <Menu.Item
                key="edit"
                icon={<EditOutlined />}
                onClick={() => handleTaskClick(task)}
              >
                Edit
              </Menu.Item>
              <Menu.SubMenu key="status" title="Move to">
                {STATUS_COLUMNS.map((col) => (
                  <Menu.Item
                    key={col.id}
                    onClick={() => handleStatusChange(task.id, col.id)}
                    disabled={task.status === col.id}
                  >
                    {col.icon} {col.title}
                  </Menu.Item>
                ))}
              </Menu.SubMenu>
              <Menu.Divider />
              <Menu.Item
                key="delete"
                icon={<DeleteOutlined />}
                danger
                onClick={() => handleDeleteTask(task.id)}
              >
                Delete
              </Menu.Item>
            </Menu>
          }
          trigger={["click"]}
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            type="text"
            size="small"
            icon={<MoreOutlined />}
            style={{
              width: "20px",
              height: "20px",
              minWidth: "20px",
              padding: "0",
              color: "#6b778c",
              opacity: 0.7,
            }}
          />
        </Dropdown>
      </div>

      {/* Task title */}
      <div
        style={{
          fontSize: "14px",
          fontWeight: "400",
          color: "#172b4d",
          lineHeight: "20px",
          marginBottom: "8px",
          wordWrap: "break-word",
        }}
      >
        {task.title}
      </div>

      {/* Project and client info */}
      <div
        style={{
          fontSize: "11px",
          color: "#6b778c",
          marginBottom: "8px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          flexWrap: "wrap",
        }}
      >
        {task.project && (
          <span
            style={{
              backgroundColor: "#e3f2fd",
              padding: "2px 6px",
              borderRadius: "10px",
              fontSize: "10px",
              fontWeight: "500",
              color: "#0052cc",
            }}
          >
            {task.project.projectCode}
          </span>
        )}
        {(task.project?.client?.clientCode || task.clientCode) && (
          <span
            style={{
              backgroundColor: "#f3e5f5",
              padding: "2px 6px",
              borderRadius: "10px",
              fontSize: "10px",
              fontWeight: "500",
              color: "#7b1fa2",
            }}
          >
            {task.project?.client?.clientCode || task.clientCode}
          </span>
        )}
      </div>

      {/* Bottom section with priority, assignee, and due date */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {/* Left side - Priority */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {/* Priority indicator */}
          <div
            style={{
              width: "12px",
              height: "12px",
              backgroundColor: getPriorityColor(task.priority),
              borderRadius: "2px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FlagOutlined
              style={{
                fontSize: "6px",
                color: "#ffffff",
              }}
            />
          </div>
          
          {/* Due date */}
          {task.dueDate && (
            <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
              <CalendarOutlined style={{ fontSize: "10px", color: "#6b778c" }} />
              <span
                style={{
                  fontSize: "10px",
                  color: dayjs(task.dueDate).isBefore(dayjs()) ? "#de350b" : "#6b778c",
                  fontWeight: dayjs(task.dueDate).isBefore(dayjs()) ? "500" : "400",
                }}
              >
                {dayjs(task.dueDate).format("MMM D")}
              </span>
            </div>
          )}
        </div>

        {/* Right side - Assignee */}
        {task.assignee && (
          <Tooltip
            title={`${task.assignee.firstName} ${task.assignee.lastName}`}
          >
            <Avatar
              size={24}
              style={{
                backgroundColor: "#0052cc",
                fontSize: "10px",
                fontWeight: "500",
              }}
            >
              {task.assignee.firstName?.charAt(0)}
              {task.assignee.lastName?.charAt(0)}
            </Avatar>
          </Tooltip>
        )}
      </div>
    </div>
    );
  });

  return (
    <div style={{ padding: "24px", height: "100vh", overflow: "auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <Space>
          {/* Bulk actions */}
          {selectedTasks.length > 0 && (
            <Badge count={selectedTasks.length}>
              <Button icon={<SettingOutlined />}>
                Bulk Actions ({selectedTasks.length})
              </Button>
            </Badge>
          )}

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
        </Space>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <Card style={{ marginBottom: "16px" }}>
          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Search
                placeholder="Search tasks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: "100%" }}
              />
            </Col>
            <Col xs={24} sm={8}>
              <Select
                placeholder="Priority"
                value={filters.priority}
                onChange={(value) =>
                  setFilters((prev) => ({ ...prev, priority: value }))
                }
                style={{ width: "100%" }}
                allowClear
              >
                <Option value="LOW">Low</Option>
                <Option value="MEDIUM">Medium</Option>
                <Option value="HIGH">High</Option>
                <Option value="URGENT">Urgent</Option>
              </Select>
            </Col>
            <Col xs={24} sm={8}>
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
            </Col>
          </Row>
        </Card>
      )}

      {/* Debug info */}
      {process.env.NODE_ENV === "development" && (
        <div
          style={{
            marginBottom: "16px",
            padding: "8px",
            backgroundColor: "#f0f0f0",
            fontSize: "12px",
          }}
        >
          <div>Loading: {tasksLoading ? "Yes" : "No"}</div>
          <div>Error: {tasksError ? tasksError.message : "None"}</div>
          <div>Total Tasks: {tasksData?.tasks?.tasks?.length || 0}</div>
          <div>
            Raw Data:{" "}
            {tasksData
              ? JSON.stringify(tasksData, null, 2).substring(0, 200) + "..."
              : "No data"}
          </div>
        </div>
      )}

      {/* Loading state */}
      {tasksLoading && (
        <div style={{ textAlign: "center", padding: "50px" }}>
          <Spin size="large" />
        </div>
      )}

      {/* Error state */}
      {tasksError && (
        <div style={{ textAlign: "center", padding: "50px" }}>
          <Card>
            <Text type="danger">Error loading tasks: {tasksError.message}</Text>
            <br />
            <Button
              onClick={() => refetchTasks()}
              style={{ marginTop: "16px" }}
            >
              Retry
            </Button>
          </Card>
        </div>
      )}

      {/* Task board - Jira style with Drag & Drop */}
      {!tasksLoading && (
        <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <Row gutter={12} style={{ height: "calc(100vh - 200px)" }}>
            {STATUS_COLUMNS.map((column) => (
              <Col xs={24} sm={12} md={6} lg={6} xl={6} xxl={6} key={column.id}>
                <div
                  style={{
                    height: "100%",
                    backgroundColor: "#f4f5f7",
                    borderRadius: "3px",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {/* Column header */}
                  <div
                    style={{
                      padding: "12px 8px 8px 8px",
                      borderBottom: "1px solid #dfe1e6",
                      backgroundColor: "#ffffff",
                      borderRadius: "3px 3px 0 0",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: "600",
                            color: "#5e6c84",
                            textTransform: "uppercase",
                            letterSpacing: "0.3px",
                          }}
                        >
                          {column.title}
                        </span>
                        <span
                          style={{
                            fontSize: "11px",
                            color: "#6b778c",
                            backgroundColor: "#dfe1e6",
                            padding: "2px 6px",
                            borderRadius: "12px",
                            fontWeight: "500",
                            minWidth: "18px",
                            textAlign: "center",
                          }}
                        >
                          {tasksByStatus[column.id]?.length || 0}
                        </span>
                      </div>
                      <Button
                        type="text"
                        size="small"
                        icon={<PlusOutlined />}
                        style={{
                          width: "20px",
                          height: "20px",
                          minWidth: "20px",
                          padding: "0",
                          color: "#6b778c",
                          fontSize: "10px",
                        }}
                      />
                    </div>
                  </div>

                  {/* Droppable Column content */}
                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        style={{
                          flex: 1,
                          padding: "8px",
                          overflowY: "auto",
                          overflowX: "hidden",
                          backgroundColor: snapshot.isDraggingOver 
                            ? "#e3f2fd" 
                            : "transparent",
                          transition: "background-color 0.2s ease",
                        }}
                      >
                        {tasksByStatus[column.id]?.length > 0 ? (
                          tasksByStatus[column.id]
                            .filter(task => task && task.id) // Only include tasks with valid IDs
                            .map((task, index) => {
                              const taskId = String(task.id);
                              const uniqueKey = `${taskId}-${column.id}`;
                              
                              return (
                                <Draggable 
                                  key={uniqueKey}
                                  draggableId={taskId} 
                                  index={index}
                                >
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      style={{
                                        ...provided.draggableProps.style,
                                        transform: snapshot.isDragging
                                          ? `${provided.draggableProps.style?.transform} rotate(5deg)`
                                          : provided.draggableProps.style?.transform,
                                      }}
                                    >
                                      <TaskCardDisplay task={task} />
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })
                        ) : (
                          <div
                            style={{
                              textAlign: "center",
                              padding: "40px 20px",
                              color: "#6b778c",
                              fontSize: "12px",
                            }}
                          >
                            <div
                              style={{
                                width: "40px",
                                height: "40px",
                                backgroundColor: "#dfe1e6",
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                margin: "0 auto 8px",
                                opacity: 0.5,
                              }}
                            >
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
              </Col>
            ))}
          </Row>
        </DragDropContext>
      )}

      {/* Task detail modal */}
      {selectedTask && (
        <TaskCard
          task={selectedTask}
          showModal={taskModalVisible}
          onModalClose={() => {
            setTaskModalVisible(false);
            setSelectedTask(null);
          }}
          onTaskUpdate={(updatedTask) => {
            setSelectedTask(updatedTask);
            refetchTasks();
          }}
        />
      )}

      <style jsx>{`
        .jira-task-card {
          transition: all 0.15s ease;
        }
        .jira-task-card:hover {
          transform: translateY(-1px);
        }
        .jira-task-card:active {
          cursor: grabbing !important;
        }
        
        /* Drag and drop styles */
        [data-rbd-drag-handle-draggable-id]:active {
          cursor: grabbing !important;
        }
        
        /* Custom scrollbar for columns */
        .ant-col::-webkit-scrollbar {
          width: 6px;
        }
        .ant-col::-webkit-scrollbar-track {
          background: #f4f5f7;
        }
        .ant-col::-webkit-scrollbar-thumb {
          background: #dfe1e6;
          border-radius: 3px;
        }
        .ant-col::-webkit-scrollbar-thumb:hover {
          background: #c1c7d0;
        }
        
        /* Dragging styles */
        [data-rbd-draggable-id] {
          transition: all 0.2s ease;
        }
        
        /* Drop zone highlighting */
        [data-rbd-droppable-id] {
          min-height: 100px;
        }
      `}</style>
    </div>
  );
};

export default TaskBoard;
