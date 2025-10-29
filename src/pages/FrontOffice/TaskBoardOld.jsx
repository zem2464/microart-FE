import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Row, Col, Card, Tag, Typography, Button, Input, Select, Avatar, 
  Dropdown, Menu, Modal, Form, DatePicker, message, Spin, Badge,
  Tooltip, Space, Switch, Popover, Drawer, Empty, Alert
} from 'antd';
import { 
  PlusOutlined, UserOutlined, MoreOutlined, EditOutlined, DeleteOutlined,
  FilterOutlined, SearchOutlined, ReloadOutlined, SettingOutlined,
  ClockCircleOutlined, CalendarOutlined, FlagOutlined, CommentOutlined,
  EyeOutlined, PlayCircleOutlined, CheckCircleOutlined, PauseCircleOutlined
} from '@ant-design/icons';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useQuery, useMutation } from '@apollo/client';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { 
  GET_TASKS, 
  UPDATE_TASK_STATUS, 
  UPDATE_TASK, 
  DELETE_TASK, 
  CREATE_TASK,
  BULK_ASSIGN_TASKS,
  BULK_UPDATE_TASK_STATUS
} from '../../gql/tasks';
import TaskCard from '../../components/TaskCard';
import { useTaskSubscriptions } from '../../hooks/useTaskSubscriptions';

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
    projectId: null,
    taskTypeId: null
  });
  const [search, setSearch] = useState('');
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [viewMode, setViewMode] = useState('board'); // board, list, calendar
  const [showFilters, setShowFilters] = useState(false);
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [createTaskVisible, setCreateTaskVisible] = useState(false);
  const [bulkActionsVisible, setBulkActionsVisible] = useState(false);

  // GraphQL queries and mutations
  const { data: tasksData, loading: tasksLoading, refetch: refetchTasks } = useQuery(GET_TASKS, {
    variables: {
      filters: Object.keys(filters).reduce((acc, key) => {
        if (filters[key]) acc[key] = filters[key];
        return acc;
      }, {}),
      search: search || null,
      limit: 1000, // Get all tasks for board view
      sortBy: 'createdAt',
      sortOrder: 'ASC'
    },
    fetchPolicy: 'cache-and-network'
  });

  const [updateTaskStatus] = useMutation(UPDATE_TASK_STATUS, {
    onCompleted: () => {
      message.success('Task status updated successfully');
      refetchTasks();
    },
    onError: (error) => {
      message.error(`Failed to update task: ${error.message}`);
    }
  });

  const [updateTask] = useMutation(UPDATE_TASK, {
    onCompleted: () => {
      message.success('Task updated successfully');
      refetchTasks();
    },
    onError: (error) => {
      message.error(`Failed to update task: ${error.message}`);
    }
  });

  const [deleteTask] = useMutation(DELETE_TASK, {
    onCompleted: () => {
      message.success('Task deleted successfully');
      refetchTasks();
    },
    onError: (error) => {
      message.error(`Failed to delete task: ${error.message}`);
    }
  });

  const [bulkAssignTasks] = useMutation(BULK_ASSIGN_TASKS, {
    onCompleted: (data) => {
      message.success(data.bulkAssignTasks.message);
      setSelectedTasks([]);
      refetchTasks();
    },
    onError: (error) => {
      message.error(`Bulk assign failed: ${error.message}`);
    }
  });

  const [bulkUpdateStatus] = useMutation(BULK_UPDATE_TASK_STATUS, {
    onCompleted: (data) => {
      message.success(data.bulkUpdateTaskStatus.message);
      setSelectedTasks([]);
      refetchTasks();
    },
    onError: (error) => {
      message.error(`Bulk update failed: ${error.message}`);
    }
  });

  // Real-time subscriptions
  useTaskSubscriptions({
    enabled: true,
    onTaskUpdated: () => {
      refetchTasks();
    },
    onTaskAssigned: () => {
      refetchTasks();
    }
  });

  // Task status mapping
  const statusColumns = [
    {
      id: 'TODO',
      title: 'To Do',
      color: '#f5f5f5',
      borderColor: '#d9d9d9',
      icon: <ClockCircleOutlined />,
      description: 'Tasks ready to be started'
    },
    {
      id: 'IN_PROGRESS', 
      title: 'In Progress',
      color: '#e6f7ff',
      borderColor: '#1890ff',
      icon: <PlayCircleOutlined />,
      description: 'Tasks currently being worked on'
    },
    {
      id: 'REVIEW',
      title: 'Review',
      color: '#fff7e6',
      borderColor: '#fa8c16',
      icon: <EyeOutlined />,
      description: 'Tasks pending review'
    },
    {
      id: 'COMPLETED',
      title: 'Completed',
      color: '#f6ffed',
      borderColor: '#52c41a',
      icon: <CheckCircleOutlined />,
      description: 'Tasks that are done'
    }
  ];

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const tasks = tasksData?.tasks?.tasks || [];
    const grouped = statusColumns.reduce((acc, column) => {
      acc[column.id] = tasks.filter(task => task.status === column.id);
      return acc;
    }, {});
    return grouped;
  }, [tasksData]);

  // Priority colors
  const getPriorityColor = (priority) => {
    const colors = {
      LOW: '#52c41a',
      MEDIUM: '#1890ff', 
      HIGH: '#fa8c16',
      URGENT: '#ff4d4f'
    };
    return colors[priority] || '#d9d9d9';
  };

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag and drop
  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;

    if (!over) return;

    const taskId = active.id;
    const newStatus = over.id;

    // Find the current status of the task
    const currentTask = Object.values(tasksByStatus).flat().find(task => task.id === taskId);
    if (!currentTask || currentTask.status === newStatus) return;

    updateTaskStatus({
      variables: {
        id: taskId,
        status: newStatus,
        notes: `Status changed from ${currentTask.status} to ${newStatus}`
      }
    });
  }, [updateTaskStatus, tasksByStatus]);

  // Task actions
  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setTaskModalVisible(true);
  };

  const handleDeleteTask = (taskId) => {
    Modal.confirm({
      title: 'Delete Task',
      content: 'Are you sure you want to delete this task? This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      onOk: () => {
        deleteTask({ variables: { id: taskId } });
      }
    });
  };

  // Bulk actions
  const handleBulkAction = (action, value) => {
    if (selectedTasks.length === 0) {
      message.warning('Please select tasks first');
      return;
    }

    switch (action) {
      case 'assign':
        bulkAssignTasks({
          variables: {
            taskIds: selectedTasks,
            assigneeId: value
          }
        });
        break;
      case 'status':
        bulkUpdateStatus({
          variables: {
            taskIds: selectedTasks,
            status: value
          }
        });
        break;
      default:
        break;
    }
    setBulkActionsVisible(false);
  };

  // Sortable task card component
  const SortableTaskCard = ({ task }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: task.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      marginBottom: '8px',
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
        <Card
          size="small"
          hoverable
          className={`task-card ${isDragging ? 'dragging' : ''}`}
          style={{
            backgroundColor: isDragging ? '#f0f0f0' : 'white',
            boxShadow: isDragging ? '0 5px 10px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.1)',
            cursor: 'pointer',
            border: selectedTasks.includes(task.id) ? '2px solid #1890ff' : '1px solid #d9d9d9'
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (e.ctrlKey || e.metaKey) {
              // Multi-select with Ctrl/Cmd
              setSelectedTasks(prev => 
                prev.includes(task.id) 
                  ? prev.filter(id => id !== task.id)
                  : [...prev, task.id]
              );
            } else {
              handleTaskClick(task);
            }
          }}
          actions={[
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
              trigger={['click']}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreOutlined />
            </Dropdown>
          ]}
        >
            <div style={{ minHeight: '120px' }}>
              {/* Task type indicator */}
              {task.taskType && (
                <div style={{ marginBottom: '8px' }}>
                  <Tag 
                    color={task.taskType.color || 'default'}
                    style={{ fontSize: '10px', padding: '2px 6px' }}
                  >
                    {task.taskType.icon && <span style={{ marginRight: '4px' }}>{task.taskType.icon}</span>}
                    {task.taskType.name}
                  </Tag>
                </div>
              )}

              {/* Task title */}
              <Title 
                level={5} 
                style={{ 
                  marginBottom: '8px', 
                  fontSize: '14px',
                  lineHeight: '1.3',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical'
                }}
              >
                {task.title}
              </Title>

              {/* Task code */}
              <Text 
                type="secondary" 
                style={{ 
                  fontSize: '11px',
                  display: 'block',
                  marginBottom: '6px'
                }}
              >
                {task.taskCode}
              </Text>

              {/* Project info */}
              {task.project && (
                <Text 
                  type="secondary" 
                  style={{ 
                    fontSize: '11px',
                    display: 'block',
                    marginBottom: '8px'
                  }}
                >
                  {task.project.projectCode}
                  {task.project.client && ` • ${task.project.client.clientCode}`}
                </Text>
              )}

              {/* Priority and assignee */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <Tag 
                  color={getPriorityColor(task.priority)}
                  style={{ fontSize: '10px', margin: 0 }}
                >
                  <FlagOutlined style={{ marginRight: '2px' }} />
                  {task.priority?.toLowerCase()}
                </Tag>
                
                {task.assignee && (
                  <Tooltip title={`${task.assignee.firstName} ${task.assignee.lastName}`}>
                    <Avatar 
                      size="small"
                      style={{ backgroundColor: '#1890ff' }}
                    >
                      {task.assignee.firstName?.charAt(0)}{task.assignee.lastName?.charAt(0)}
                    </Avatar>
                  </Tooltip>
                )}
              </div>

              {/* Due date */}
              {task.dueDate && (
                <div style={{ fontSize: '10px', color: '#999' }}>
                  <CalendarOutlined style={{ marginRight: '4px' }} />
                  Due {dayjs(task.dueDate).fromNow()}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </Draggable>
  );

  return (
    <div style={{ padding: '24px', height: '100vh', overflow: 'auto' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Task Board</Title>
          <Text type="secondary">
            Manage your tasks with drag-and-drop Kanban board
          </Text>
        </div>

        <Space>
          {/* Bulk actions */}
          {selectedTasks.length > 0 && (
            <Badge count={selectedTasks.length}>
              <Button
                icon={<SettingOutlined />}
                onClick={() => setBulkActionsVisible(true)}
              >
                Bulk Actions
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
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateTaskVisible(true)}
          >
            Add Task
          </Button>
        </Space>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <Card style={{ marginBottom: '16px' }}>
          <Row gutter={16}>
            <Col xs={24} sm={12} md={6}>
              <Search
                placeholder="Search tasks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '100%' }}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Select
                placeholder="Priority"
                value={filters.priority}
                onChange={(value) => setFilters(prev => ({ ...prev, priority: value }))}
                style={{ width: '100%' }}
                allowClear
              >
                <Option value="LOW">Low</Option>
                <Option value="MEDIUM">Medium</Option>
                <Option value="HIGH">High</Option>
                <Option value="URGENT">Urgent</Option>
              </Select>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Select
                placeholder="Status"
                value={filters.status}
                onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                style={{ width: '100%' }}
                allowClear
              >
                {statusColumns.map(col => (
                  <Option key={col.id} value={col.id}>{col.title}</Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Button 
                onClick={() => {
                  setFilters({
                    status: null,
                    priority: null,
                    assigneeId: null,
                    projectId: null,
                    taskTypeId: null
                  });
                  setSearch('');
                }}
              >
                Clear All
              </Button>
            </Col>
          </Row>
        </Card>
      )}

      {/* Loading state */}
      {tasksLoading && (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
        </div>
      )}

      {/* Task board */}
      {!tasksLoading && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Row gutter={16} style={{ height: 'calc(100vh - 200px)' }}>
            {statusColumns.map(column => (
              <Col xs={24} sm={12} lg={6} key={column.id}>
                <Card
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {column.icon}
                      <span>{column.title}</span>
                      <Badge 
                        count={tasksByStatus[column.id]?.length || 0} 
                        style={{ backgroundColor: column.borderColor }}
                      />
                    </div>
                  }
                  style={{
                    height: '100%',
                    backgroundColor: column.color,
                    border: `1px solid ${column.borderColor}`
                  }}
                  bodyStyle={{ 
                    padding: '8px',
                    height: 'calc(100% - 60px)',
                    overflow: 'auto'
                  }}
                >
                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        style={{
                          minHeight: '200px',
                          backgroundColor: snapshot.isDraggingOver ? 'rgba(24, 144, 255, 0.1)' : 'transparent',
                          borderRadius: '4px',
                          padding: '4px',
                          transition: 'background-color 0.2s ease'
                        }}
                      >
                        {tasksByStatus[column.id]?.length > 0 ? (
                          tasksByStatus[column.id].map((task, index) => (
                            <TaskCardComponent 
                              key={task.id} 
                              task={task} 
                              index={index}
                            />
                          ))
                        ) : (
                          <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={
                              <span style={{ color: '#999', fontSize: '12px' }}>
                                {column.description}
                              </span>
                            }
                            style={{ marginTop: '50px' }}
                          />
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </Card>
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

      {/* Bulk actions modal */}
      <Modal
        title="Bulk Actions"
        open={bulkActionsVisible}
        onCancel={() => setBulkActionsVisible(false)}
        footer={null}
      >
        <div>
          <p>Selected {selectedTasks.length} task(s)</p>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Text strong>Change Status:</Text>
              <Select
                style={{ width: '100%', marginTop: '8px' }}
                placeholder="Select status"
                onChange={(value) => handleBulkAction('status', value)}
              >
                {statusColumns.map(col => (
                  <Option key={col.id} value={col.id}>{col.title}</Option>
                ))}
              </Select>
            </div>
          </Space>
        </div>
      </Modal>

      <style jsx>{`
        .task-card {
          transition: all 0.2s ease;
        }
        .task-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
        }
        .dragging {
          transform: rotate(5deg) !important;
        }
      `}</style>
    </div>
  );
};

export default TaskBoard;