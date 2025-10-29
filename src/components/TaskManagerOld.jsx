import React, { useState, useEffect } from "react";
import {
  Row,
  Col,
  Select,
  Button,
  Typography,
  Form,
  Modal,
  message,
} from "antd";
import {
  LinkOutlined,
  CheckSquareOutlined,
} from "@ant-design/icons";
import TaskCard from "./TaskCard";

const { Option } = Select;
const { Text } = Typography;

const TaskManager = ({ 
  tasks = [], 
  onTaskUpdate, 
  availableUsers = [], 
  readOnly = false,
  workType = null,
  grading = null,
  customFields = [],
  layout = "grid" // "grid" or "list"
}) => {
  const [linkingTask, setLinkingTask] = useState(null);
  const [linkForm] = Form.useForm();

  // Task priorities and statuses with JIRA-like styling
  const taskPriorities = [
    { 
      value: "lowest", 
      label: "Lowest", 
      color: "#57A55A", 
      icon: <ArrowDownOutlined style={{ transform: "rotate(180deg)" }} />,
      bgColor: "#E3FCEF"
    },
    { 
      value: "low", 
      label: "Low", 
      color: "#57A55A", 
      icon: <ArrowDownOutlined />,
      bgColor: "#E3FCEF"
    },
    { 
      value: "medium", 
      label: "Medium", 
      color: "#E97F33", 
      icon: <MinusOutlined />,
      bgColor: "#FFF4E6"
    },
    { 
      value: "high", 
      label: "High", 
      color: "#CD1317", 
      icon: <ArrowUpOutlined />,
      bgColor: "#FFE7E6"
    },
    { 
      value: "highest", 
      label: "Highest", 
      color: "#CD1317", 
      icon: <ArrowUpOutlined style={{ transform: "rotate(180deg)" }} />,
      bgColor: "#FFE7E6"
    },
  ];

  const taskStatuses = [
    { 
      value: "to_do", 
      label: "TO DO", 
      color: "#42526E", 
      bgColor: "#DFE1E6",
      textColor: "#42526E"
    },
    { 
      value: "in_progress", 
      label: "IN PROGRESS", 
      color: "#0052CC", 
      bgColor: "#DEEBFF",
      textColor: "#0052CC"
    },
    { 
      value: "review", 
      label: "IN REVIEW", 
      color: "#8777D9", 
      bgColor: "#EAE6FF",
      textColor: "#8777D9"
    },
    { 
      value: "done", 
      label: "DONE", 
      color: "#00875A", 
      bgColor: "#E3FCEF",
      textColor: "#00875A"
    },
    { 
      value: "blocked", 
      label: "BLOCKED", 
      color: "#DE350B", 
      bgColor: "#FFEBE6",
      textColor: "#DE350B"
    },
  ];

  const taskTypes = [
    { value: "story", label: "Story", icon: "📖", color: "#36B37E" },
    { value: "task", label: "Task", icon: "✅", color: "#0052CC" },
    { value: "bug", label: "Bug", icon: "🐛", color: "#DE350B" },
    { value: "epic", label: "Epic", icon: "⚡", color: "#6554C0" },
  ];

  // Enhanced task structure with JIRA-like fields
  const enhanceTask = (task) => ({
    id: task.id,
    taskKey: task.taskKey || `TASK-${Math.floor(Math.random() * 1000)}`,
    name: task.name,
    description: task.description || "",
    assigneeId: task.assigneeId || null,
    reporterId: task.reporterId || null,
    status: task.status || "to_do",
    priority: task.priority || "medium",
    taskType: task.taskType || "task",
    estimatedHours: task.estimatedHours || 0,
    actualHours: task.actualHours || 0,
    storyPoints: task.storyPoints || null,
    startDate: task.startDate || null,
    dueDate: task.dueDate || null,
    dependencies: task.dependencies || [],
    blockedBy: task.blockedBy || [],
    comments: task.comments || [],
    attachments: task.attachments || [],
    labels: task.labels || [],
    customFields: task.customFields || {},
    createdAt: task.createdAt || new Date().toISOString(),
    updatedAt: task.updatedAt || new Date().toISOString(),
  });

  const [enhancedTasks, setEnhancedTasks] = useState([]);

  useEffect(() => {
    setEnhancedTasks(tasks.map(enhanceTask));
  }, [tasks]);

  // Handle task update
  const handleTaskUpdate = (taskId, updates) => {
    const updatedTasks = enhancedTasks.map(task => 
      task.id === taskId 
        ? { ...task, ...updates, updatedAt: new Date().toISOString() }
        : task
    );
    setEnhancedTasks(updatedTasks);
    onTaskUpdate?.(updatedTasks);
  };

  // Inline editing functions
  const startEditing = (taskId, field) => {
    setEditingFields(prev => ({
      ...prev,
      [`${taskId}-${field}`]: true
    }));
  };

  const stopEditing = (taskId, field) => {
    setEditingFields(prev => {
      const newState = { ...prev };
      delete newState[`${taskId}-${field}`];
      return newState;
    });
  };

  const isEditing = (taskId, field) => {
    return editingFields[`${taskId}-${field}`] || false;
  };

  const handleInlineUpdate = async (taskId, field, value) => {
    try {
      handleTaskUpdate(taskId, { [field]: value });
      stopEditing(taskId, field);
      message.success('Task updated successfully');
    } catch (error) {
      message.error('Failed to update task');
      console.error('Error updating task:', error);
    }
  };

  const handleKeyPress = (e, taskId, field, value) => {
    if (e.key === 'Enter') {
      handleInlineUpdate(taskId, field, value);
    } else if (e.key === 'Escape') {
      stopEditing(taskId, field);
    }
  };



  // Open task linking modal
  const openTaskLinkModal = (task) => {
    setLinkingTask(task);
    linkForm.setFieldsValue({
      dependencies: task.dependencies,
    });
  };

  // Save task dependencies
  const handleLinkSave = async (values) => {
    try {
      handleTaskUpdate(linkingTask.id, { dependencies: values.dependencies || [] });
      setLinkingTask(null);
      linkForm.resetFields();
      message.success("Task dependencies updated successfully");
    } catch (error) {
      message.error("Failed to update task dependencies");
    }
  };

  // Get user display name and avatar
  const getUser = (userId) => {
    const user = availableUsers.find(u => u.id === userId);
    return user || null;
  };

  const getUserDisplayName = (userId) => {
    const user = getUser(userId);
    return user ? `${user.firstName} ${user.lastName}` : "Unassigned";
  };

  const getUserAvatar = (userId) => {
    const user = getUser(userId);
    if (!user) return <Avatar size={24} icon={<UserOutlined />} />;
    
    return (
      <Avatar 
        size={24} 
        style={{ 
          backgroundColor: '#1890ff',
          fontSize: '12px'
        }}
      >
        {user.firstName?.[0]}{user.lastName?.[0]}
      </Avatar>
    );
  };

  // Get priority details
  const getPriorityDetails = (priority) => {
    return taskPriorities.find(p => p.value === priority) || taskPriorities[2];
  };

  // Get status details
  const getStatusDetails = (status) => {
    return taskStatuses.find(s => s.value === status) || taskStatuses[0];
  };

  // Get task type details
  const getTaskTypeDetails = (type) => {
    return taskTypes.find(t => t.value === type) || taskTypes[1];
  };

  // Check if task is blocked
  const isTaskBlocked = (task) => {
    return task.dependencies.some(depId => {
      const depTask = enhancedTasks.find(t => t.id === depId);
      return depTask && depTask.status !== "completed";
    });
  };

  // Get blocking tasks
  const getBlockingTasks = (task) => {
    return task.dependencies
      .map(depId => enhancedTasks.find(t => t.id === depId))
      .filter(t => t && t.status !== "completed");
  };

  return (
    <div style={{ backgroundColor: '#F4F5F7', padding: '16px', borderRadius: '8px' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px',
        paddingBottom: '12px',
        borderBottom: '2px solid #DFE1E6'
      }}>
        <div>
          <Text style={{ fontSize: '16px', fontWeight: 600, color: '#172B4D' }}>
            Project Tasks ({enhancedTasks.length})
          </Text>
          <Text style={{ fontSize: '12px', color: '#6B778C', display: 'block' }}>
            {readOnly ? 'View task details' : 'Click on any field to edit inline'}
          </Text>
        </div>
      </div>

      {/* Task List */}
      {layout === "grid" ? (
        <Row gutter={[16, 16]}>
          {enhancedTasks.length === 0 ? (
            <Col span={24}>
              <div style={{
                textAlign: 'center',
                padding: '48px 16px',
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '1px solid #DFE1E6'
              }}>
                <CheckSquareOutlined style={{ fontSize: '48px', color: '#6B778C', marginBottom: '16px' }} />
                <Text style={{ fontSize: '16px', color: '#172B4D', display: 'block', marginBottom: '8px' }}>
                  No tasks yet
                </Text>
                <Text style={{ fontSize: '14px', color: '#6B778C' }}>
                  Tasks will appear here when they are added to the project
                </Text>
              </div>
            </Col>
          ) : (
            enhancedTasks.map((task) => (
              <Col key={task.id} xs={24} sm={12} md={8} lg={6}>
                <TaskCard
                  task={task}
                  workType={workType}
                  grading={grading}
                  customFields={customFields}
                  availableUsers={availableUsers}
                  onTaskUpdate={(taskId, updates) => handleTaskUpdate(taskId, updates)}
                  readOnly={readOnly}
                />
              </Col>
            ))
          )}
        </Row>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {enhancedTasks.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '48px 16px',
              backgroundColor: 'white',
              borderRadius: '8px',
              border: '1px solid #DFE1E6'
            }}>
              <CheckSquareOutlined style={{ fontSize: '48px', color: '#6B778C', marginBottom: '16px' }} />
              <Text style={{ fontSize: '16px', color: '#172B4D', display: 'block', marginBottom: '8px' }}>
                No tasks yet
              </Text>
              <Text style={{ fontSize: '14px', color: '#6B778C' }}>
                Tasks will appear here when they are added to the project
              </Text>
            </div>
          ) : (
            enhancedTasks.map((task) => (
          const blocked = isTaskBlocked(task);
          const blockingTasks = getBlockingTasks(task);
          const priorityDetails = getPriorityDetails(task.priority);
          const statusDetails = getStatusDetails(task.status);
          const taskTypeDetails = getTaskTypeDetails(task.taskType);

          return (
            <div
              key={task.id}
              style={{
                backgroundColor: blocked ? '#FFEBE6' : 'white',
                border: blocked ? '2px solid #DE350B' : '1px solid #DFE1E6',
                borderRadius: '8px',
                padding: '16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {/* Task Header */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                marginBottom: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                  {/* Task Type Icon */}
                  <span style={{ fontSize: '16px' }}>{taskTypeDetails.icon}</span>
                  
                  {/* Task Key */}
                  <Text style={{ 
                    fontSize: '12px', 
                    color: '#6B778C',
                    fontWeight: 500,
                    backgroundColor: '#F4F5F7',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}>
                    {task.taskKey}
                  </Text>

                  {/* Priority - Inline Editable */}
                  {isEditing(task.id, 'priority') ? (
                    <Select
                      defaultValue={task.priority}
                      style={{ minWidth: '100px' }}
                      onSelect={(value) => handleInlineUpdate(task.id, 'priority', value)}
                      onBlur={() => stopEditing(task.id, 'priority')}
                      autoFocus
                      open={true}
                    >
                      {taskPriorities.map(priority => (
                        <Option key={priority.value} value={priority.value}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: priority.color }}>{priority.icon}</span>
                            <span>{priority.label}</span>
                          </div>
                        </Option>
                      ))}
                    </Select>
                  ) : (
                    <Tooltip title={`Priority: ${priorityDetails.label}`}>
                      <div 
                        style={{ 
                          color: priorityDetails.color,
                          backgroundColor: priorityDetails.bgColor,
                          padding: '4px',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          cursor: readOnly ? 'default' : 'pointer',
                          transition: 'transform 0.1s ease'
                        }}
                        onClick={() => !readOnly && startEditing(task.id, 'priority')}
                        onMouseEnter={(e) => {
                          if (!readOnly) {
                            e.target.style.transform = 'scale(1.1)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = 'scale(1)';
                        }}
                      >
                        {priorityDetails.icon}
                      </div>
                    </Tooltip>
                  )}
                </div>

                {/* Actions */}
                {!readOnly && (
                  <Space>
                    <Tooltip title="Link Dependencies">
                      <Button
                        type="text"
                        size="small"
                        icon={<LinkOutlined />}
                        onClick={() => openTaskLinkModal(task)}
                        style={{ 
                          border: 'none',
                          boxShadow: 'none',
                          color: '#6B778C'
                        }}
                      />
                    </Tooltip>
                  </Space>
                )}
              </div>

              {/* Task Title - Inline Editable */}
              <div style={{ marginBottom: '8px' }}>
                {isEditing(task.id, 'name') ? (
                  <Input
                    defaultValue={task.name}
                    style={{ 
                      fontSize: '14px', 
                      fontWeight: 500,
                      border: '2px solid #0052CC',
                      borderRadius: '4px'
                    }}
                    onBlur={(e) => handleInlineUpdate(task.id, 'name', e.target.value)}
                    onKeyDown={(e) => handleKeyPress(e, task.id, 'name', e.target.value)}
                    autoFocus
                  />
                ) : (
                  <Text 
                    style={{ 
                      fontSize: '14px', 
                      fontWeight: 500, 
                      color: '#172B4D',
                      lineHeight: '1.4',
                      cursor: readOnly ? 'default' : 'pointer',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      transition: 'background-color 0.2s ease'
                    }}
                    onClick={() => !readOnly && startEditing(task.id, 'name')}
                    onMouseEnter={(e) => {
                      if (!readOnly) {
                        e.target.style.backgroundColor = '#F4F5F7';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = 'transparent';
                    }}
                  >
                    {task.name}
                  </Text>
                )}
              </div>

              {/* Task Description - Inline Editable */}
              <div style={{ marginBottom: '12px' }}>
                {isEditing(task.id, 'description') ? (
                  <TextArea
                    defaultValue={task.description}
                    placeholder="Add a description..."
                    rows={3}
                    style={{ 
                      fontSize: '12px',
                      border: '2px solid #0052CC',
                      borderRadius: '4px'
                    }}
                    onBlur={(e) => handleInlineUpdate(task.id, 'description', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        stopEditing(task.id, 'description');
                      }
                    }}
                    autoFocus
                  />
                ) : (
                  <Text 
                    style={{ 
                      fontSize: '12px', 
                      color: task.description ? '#6B778C' : '#BCD9F7',
                      lineHeight: '1.4',
                      cursor: readOnly ? 'default' : 'pointer',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      transition: 'background-color 0.2s ease',
                      display: 'block',
                      minHeight: '20px'
                    }}
                    onClick={() => !readOnly && startEditing(task.id, 'description')}
                    onMouseEnter={(e) => {
                      if (!readOnly) {
                        e.target.style.backgroundColor = '#F4F5F7';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = 'transparent';
                    }}
                  >
                    {task.description || 'Add a description...'}
                  </Text>
                )}
              </div>

              {/* Task Metadata Row */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                {/* Left Side - Status and Assignee */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Status - Inline Editable */}
                  {isEditing(task.id, 'status') ? (
                    <Select
                      defaultValue={task.status}
                      style={{ minWidth: '120px' }}
                      onSelect={(value) => handleInlineUpdate(task.id, 'status', value)}
                      onBlur={() => stopEditing(task.id, 'status')}
                      autoFocus
                      open={true}
                    >
                      {taskStatuses.map(status => (
                        <Option key={status.value} value={status.value}>
                          <div style={{
                            backgroundColor: status.bgColor,
                            color: status.textColor,
                            padding: '2px 6px',
                            borderRadius: '8px',
                            fontSize: '10px',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            display: 'inline-block'
                          }}>
                            {status.label}
                          </div>
                        </Option>
                      ))}
                    </Select>
                  ) : (
                    <div 
                      style={{
                        backgroundColor: statusDetails.bgColor,
                        color: statusDetails.textColor,
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        cursor: readOnly ? 'default' : 'pointer',
                        transition: 'transform 0.1s ease'
                      }}
                      onClick={() => !readOnly && startEditing(task.id, 'status')}
                      onMouseEnter={(e) => {
                        if (!readOnly) {
                          e.target.style.transform = 'scale(1.05)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'scale(1)';
                      }}
                    >
                      {statusDetails.label}
                    </div>
                  )}

                  {/* Assignee - Inline Editable */}
                  {isEditing(task.id, 'assigneeId') ? (
                    <Select
                      defaultValue={task.assigneeId}
                      style={{ minWidth: '150px' }}
                      placeholder="Unassigned"
                      allowClear
                      showSearch
                      onSelect={(value) => handleInlineUpdate(task.id, 'assigneeId', value)}
                      onClear={() => handleInlineUpdate(task.id, 'assigneeId', null)}
                      onBlur={() => stopEditing(task.id, 'assigneeId')}
                      filterOption={(input, option) =>
                        option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                      }
                      autoFocus
                      open={true}
                    >
                      {availableUsers.map(user => (
                        <Option key={user.id} value={user.id}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Avatar size="small" style={{ backgroundColor: '#0052CC' }}>
                              {user.firstName?.charAt(0)}
                            </Avatar>
                            <span>{user.firstName} {user.lastName}</span>
                          </div>
                        </Option>
                      ))}
                    </Select>
                  ) : (
                    <div 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px',
                        cursor: readOnly ? 'default' : 'pointer',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        transition: 'background-color 0.2s ease'
                      }}
                      onClick={() => !readOnly && startEditing(task.id, 'assigneeId')}
                      onMouseEnter={(e) => {
                        if (!readOnly) {
                          e.target.style.backgroundColor = '#F4F5F7';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = 'transparent';
                      }}
                    >
                      {getUserAvatar(task.assigneeId)}
                      <Text style={{ fontSize: '12px', color: '#172B4D' }}>
                        {getUserDisplayName(task.assigneeId)}
                      </Text>
                    </div>
                  )}
                </div>

                {/* Right Side - Time and Due Date */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {/* Estimated Time - Inline Editable */}
                  {isEditing(task.id, 'estimatedHours') ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <ClockCircleOutlined style={{ fontSize: '12px', color: '#6B778C' }} />
                      <InputNumber
                        defaultValue={task.estimatedHours}
                        style={{ width: '60px' }}
                        min={0}
                        step={0.5}
                        size="small"
                        onBlur={(e) => handleInlineUpdate(task.id, 'estimatedHours', parseFloat(e.target.value) || 0)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleInlineUpdate(task.id, 'estimatedHours', parseFloat(e.target.value) || 0);
                          } else if (e.key === 'Escape') {
                            stopEditing(task.id, 'estimatedHours');
                          }
                        }}
                        autoFocus
                      />
                      <Text style={{ fontSize: '12px', color: '#6B778C' }}>h</Text>
                    </div>
                  ) : (
                    <div 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '4px',
                        cursor: readOnly ? 'default' : 'pointer',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        transition: 'background-color 0.2s ease'
                      }}
                      onClick={() => !readOnly && startEditing(task.id, 'estimatedHours')}
                      onMouseEnter={(e) => {
                        if (!readOnly) {
                          e.target.style.backgroundColor = '#F4F5F7';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = 'transparent';
                      }}
                    >
                      <ClockCircleOutlined style={{ fontSize: '12px', color: '#6B778C' }} />
                      <Text style={{ fontSize: '12px', color: '#6B778C' }}>
                        {task.estimatedHours || 0}h
                      </Text>
                    </div>
                  )}

                  {/* Due Date */}
                  {task.dueDate && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CalendarOutlined style={{ fontSize: '12px', color: '#6B778C' }} />
                      <Text style={{ 
                        fontSize: '12px', 
                        color: dayjs(task.dueDate).isBefore(dayjs()) ? '#DE350B' : '#6B778C'
                      }}>
                        {dayjs(task.dueDate).format("MMM DD")}
                      </Text>
                    </div>
                  )}
                </div>
              </div>

              {/* Blocking Warning */}
              {blocked && (
                <div style={{ 
                  marginTop: '12px', 
                  padding: '8px 12px', 
                  backgroundColor: '#FFEBE6', 
                  border: '1px solid #FFBDAD',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <ExclamationCircleOutlined style={{ color: '#DE350B', fontSize: '14px' }} />
                  <Text style={{ fontSize: '12px', color: '#DE350B', fontWeight: 500 }}>
                    Blocked by: {blockingTasks.map(t => t.name).join(", ")}
                  </Text>
                </div>
              )}

              {/* Dependencies */}
              {task.dependencies.length > 0 && !blocked && (
                <div style={{ marginTop: '8px' }}>
                  <Text style={{ fontSize: '11px', color: '#6B778C' }}>
                    <LinkOutlined style={{ marginRight: '4px' }} />
                    Depends on: {task.dependencies.map(depId => {
                      const depTask = enhancedTasks.find(t => t.id === depId);
                      return depTask?.name;
                    }).filter(Boolean).join(", ")}
                  </Text>
                </div>
              )}
            </div>
          );
        }))}
      </div>

      {/* Empty State */}
      {enhancedTasks.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px 20px',
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid #DFE1E6'
        }}>
          <CheckSquareOutlined style={{ fontSize: '48px', color: '#DFE1E6', marginBottom: '16px' }} />
          <Text style={{ fontSize: '16px', color: '#6B778C', display: 'block' }}>
            No tasks available
          </Text>
          <Text style={{ fontSize: '14px', color: '#97A0AF' }}>
            Select a grading to see available tasks
          </Text>
        </div>
      )}



      {/* Task Linking Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LinkOutlined style={{ color: '#0052CC' }} />
            <span>Link Issues</span>
            {linkingTask && (
              <Text style={{ 
                fontSize: '12px', 
                color: '#6B778C',
                backgroundColor: '#F4F5F7',
                padding: '2px 6px',
                borderRadius: '4px',
                marginLeft: '8px'
              }}>
                {linkingTask.taskKey}
              </Text>
            )}
          </div>
        }
        open={!!linkingTask}
        onCancel={() => {
          setLinkingTask(null);
          linkForm.resetFields();
        }}
        onOk={() => linkForm.submit()}
        width={600}
        styles={{
          header: {
            backgroundColor: '#F4F5F7',
            borderBottom: '1px solid #DFE1E6'
          }
        }}
      >
        {linkingTask && (
          <div style={{ 
            backgroundColor: '#FAFBFC', 
            padding: '16px', 
            borderRadius: '8px'
          }}>
            <Form
              form={linkForm}
              layout="vertical"
              onFinish={handleLinkSave}
            >
              <Form.Item
                name="dependencies"
                label={
                  <span style={{ fontWeight: 600, color: '#172B4D' }}>
                    This issue blocks
                  </span>
                }
                help={
                  <span style={{ color: '#6B778C' }}>
                    Select tasks that cannot start until this task is completed
                  </span>
                }
              >
                <Select
                  mode="multiple"
                  placeholder="Choose issues to block..."
                  allowClear
                  style={{ minHeight: '40px' }}
                  optionFilterProp="children"
                  showSearch
                >
                  {enhancedTasks
                    .filter(task => task.id !== linkingTask.id)
                    .map(task => (
                      <Option key={task.id} value={task.id}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Text style={{ 
                            fontSize: '11px', 
                            color: '#6B778C',
                            backgroundColor: '#F4F5F7',
                            padding: '2px 4px',
                            borderRadius: '3px'
                          }}>
                            {task.taskKey}
                          </Text>
                          <span>{task.name}</span>
                        </div>
                      </Option>
                    ))}
                </Select>
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TaskManager;