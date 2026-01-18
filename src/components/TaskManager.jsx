import React, { useState, useEffect, useMemo } from "react";
import {
  Row,
  Col,
  Select,
  Typography,
  Form,
  Modal,
  message,
  Card,
  Collapse,
  Tag,
  Divider,
  Table,
  Avatar,
  Space,
  Button,
  Tooltip,
  Empty,
} from "antd";
import {
  LinkOutlined,
  CheckSquareOutlined,
  SortAscendingOutlined,
  UnorderedListOutlined,
  UserAddOutlined,
  EditOutlined,
} from "@ant-design/icons";
import TaskCard from "./TaskCard";
import useAssignmentValidator from "../hooks/useAssignmentValidator";

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
  layout = "grid", // "grid", "list", "row", "grouped", or "table"
  clientCode = null,
  projectDescription = null,
  clientPreferences = null,
  gradingData = null, // Array of grading objects with tasks
  workTypeData = null, // Array of worktype objects
}) => {
  // ✅ Call hook at component top level (React Rules of Hooks)
  const assignmentValidator = useAssignmentValidator();
  
  const [linkingTask, setLinkingTask] = useState(null);
  const [linkForm] = Form.useForm();
  const [editingAssignees, setEditingAssignees] = useState(null);
  const [tempAssignees, setTempAssignees] = useState([]);
  const [editingStatus, setEditingStatus] = useState(null);
  const [rowAssignees, setRowAssignees] = useState({});
  const [rowStatus, setRowStatus] = useState({});

  // Normalize task identity across different sources (newly generated, existing, grouped)
  const resolveTaskId = (task) =>
    task?.id ??
    task?.gradingTaskId ??
    task?.taskTypeId ??
    task?.taskKey ??
    task?.taskCode;

  // Get preferred employee from client preferences
  const getPreferredEmployeeId = (task) => {
    if (!clientPreferences || !clientPreferences.taskTypePreferences) {
      return task.assigneeId || task.assignee?.id || null;
    }
    
    const taskTypePref = clientPreferences.taskTypePreferences.find(
      pref => pref.taskTypeId === task.taskTypeId
    );
    
    // Use preferred employee if available and task is not already assigned
    if (taskTypePref?.preferredUserId && !task.assigneeId && !task.assignee?.id) {
      return taskTypePref.preferredUserId;
    }
    
    return task.assigneeId || task.assignee?.id || null;
  };

  // Enhance tasks with additional properties while preserving original data
  const enhanceTask = (task) => ({
    // Preserve all original task properties
    ...task,
    // Guarantee stable identity for per-row edits and validations
    id: resolveTaskId(task),
    taskKey:
      task.taskKey ||
      resolveTaskId(task) ||
      task.taskCode ||
      task.taskTypeId ||
      task.gradingTaskId,
    name: task.name || task.title || 'Untitled Task',
    title: task.title || task.name || 'Untitled Task',
    description: task.description || projectDescription || 'No description provided',
    taskType: task.taskType || task.type || 'task',
    // Preserve original status - only default to 'todo' if status is null/undefined
    status: task.status !== null && task.status !== undefined ? task.status : 'todo',
    priority: task.priority || 'medium',
    assigneeId: getPreferredEmployeeId(task),
    estimatedHours: task.estimatedHours || task.estimatedTime || 0,
    actualHours: task.actualHours || task.actualTime || 0,
    dueDate: task.dueDate || task.deadlineDate || null,
    dependencies: task.dependencies || [],
    comments: task.comments || [],
    customFields: task.customFields || {},
    clientCode: task.clientCode || clientCode || task.project?.client?.clientCode,
    createdAt: task.createdAt || new Date().toISOString(),
    updatedAt: task.updatedAt || new Date().toISOString(),
  });

  const [enhancedTasks, setEnhancedTasks] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState({});

  useEffect(() => {
    setEnhancedTasks(tasks.map(enhanceTask));
  }, [tasks]);

  // Group tasks by worktype and grading
  const groupedTasks = useMemo(() => {
    if (layout !== "grouped" || !tasks.length) {
      return {};
    }

    // Group tasks by their worktype and grading
    const groups = {};

    tasks.forEach((task) => {
      // Determine worktype key - prefer from task data, fallback to taskType or default
      const workTypeKey = task.workType?.id || task.workTypeId || "default";
      const workTypeName = task.workType?.name || "Default Work Type";
      const workTypeSort = task.workType?.sortOrder || 0;

      // Determine grading key
      const gradingKey = task.grading?.id || task.gradingId || "default";
      const gradingName = task.grading?.name || task.gradingName || "Default Grading";

      // Create nested group structure
      if (!groups[workTypeKey]) {
        groups[workTypeKey] = {
          id: workTypeKey,
          name: workTypeName,
          sortOrder: workTypeSort,
          gradings: {},
        };
      }

      if (!groups[workTypeKey].gradings[gradingKey]) {
        groups[workTypeKey].gradings[gradingKey] = {
          id: gradingKey,
          name: gradingName,
          tasks: [],
        };
      }

      groups[workTypeKey].gradings[gradingKey].tasks.push(enhanceTask(task));
    });

    // Sort worktypes and gradings
    const sortedGroups = Object.values(groups)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      .map((workTypeGroup) => ({
        ...workTypeGroup,
        gradings: Object.values(workTypeGroup.gradings).sort((a, b) =>
          a.name.localeCompare(b.name)
        ),
      }));

    return sortedGroups;
  }, [tasks, layout]);

  // Initialize expanded state for groups
  useEffect(() => {
    if (layout === "grouped" && groupedTasks.length > 0) {
      const initialExpanded = {};
      groupedTasks.forEach((workTypeGroup) => {
        const workTypeKey = `wt-${workTypeGroup.id}`;
        initialExpanded[workTypeKey] = true;
        workTypeGroup.gradings.forEach((gradingGroup) => {
          const gradingKey = `g-${workTypeGroup.id}-${gradingGroup.id}`;
          initialExpanded[gradingKey] = true;
        });
      });
      setExpandedGroups(initialExpanded);
    }
  }, [groupedTasks, layout]);

  // Handle task update
  const handleTaskUpdate = (taskId, updates) => {
    console.log(`[TaskManager] Updating task ${taskId} with:`, updates);
    console.log(`[TaskManager] Current enhancedTasks:`, enhancedTasks.map(t => ({ id: resolveTaskId(t), status: t.status, assigneeId: t.assigneeId })));
    
    const updatedTasks = enhancedTasks.map(task => {
      const currentId = resolveTaskId(task);
      if (currentId === taskId) {
        console.log(`[TaskManager] Matched task ${taskId}, applying updates`);
        return { ...task, ...updates, updatedAt: new Date().toISOString() };
      }
      return task;
    });
    
    console.log(`[TaskManager] After update:`, updatedTasks.map(t => ({ id: resolveTaskId(t), status: t.status, assigneeId: t.assigneeId })));
    setEnhancedTasks(updatedTasks);
    if (onTaskUpdate) {
      console.log(`[TaskManager] Calling onTaskUpdate with`, updatedTasks.length, 'tasks');
      onTaskUpdate(updatedTasks);
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
      handleTaskUpdate(linkingTask.id, {
        dependencies: values.dependencies || []
      });
      setLinkingTask(null);
      linkForm.resetFields();
      message.success("Dependencies updated successfully");
    } catch (error) {
      message.error("Failed to update dependencies");
    }
  };

  // Check if task is blocked
  const isTaskBlocked = (task) => {
    return task.dependencies.some(depId => {
      const depTask = enhancedTasks.find(t => t.id === depId);
      return depTask && depTask.status !== "done";
    });
  };

  // Get blocking tasks
  const getBlockingTasks = (task) => {
    return task.dependencies
      .map(depId => enhancedTasks.find(t => t.id === depId))
      .filter(t => t && t.status !== "done");
  };

  // Handle opening assignment editor
  const handleEditAssignees = (taskId, currentAssigneeId = null) => {
    setEditingAssignees(taskId);
    // Store single assignee value per row (not array)
    setRowAssignees(prev => ({
      ...prev,
      [taskId]: currentAssigneeId || null
    }));
  };

  // Handle saving assignments with validation
  const handleSaveAssignees = (taskId) => {
    // Use validator from top-level hook call (not inside function)
    const { validateAssignmentChange, formatValidationError } = assignmentValidator;
    
    console.log(`[TaskManager] Saving assignees for task ${taskId}`);
    console.log(`[TaskManager] rowAssignees state:`, rowAssignees);
    const assigneeToSave = rowAssignees[taskId] !== undefined ? rowAssignees[taskId] : null;
    console.log(`[TaskManager] Saving assigneeId: ${assigneeToSave} for taskId: ${taskId}`);
    
    // Find the task
    const task = enhancedTasks.find(t => resolveTaskId(t) === taskId);
    if (!task) {
      message.error(`Task with ID ${taskId} not found`);
      return;
    }

    // Validate the assignment change
    const validation = validateAssignmentChange(
      taskId,
      task.assigneeId || null,
      assigneeToSave,
      availableUsers,
      enhancedTasks
    );

    if (!validation.valid) {
      const errorMsg = formatValidationError(validation);
      console.error(`[TaskManager] Assignment validation failed:`, validation);
      message.error(`Cannot update assignment: ${errorMsg}`);
      return;
    }

    // Show warning if any
    if (validation.warnings.length > 0) {
      console.warn(`[TaskManager] Assignment warnings:`, validation.warnings);
    }

    // Proceed with update
    handleTaskUpdate(taskId, {
      assigneeId: assigneeToSave,
    });
    setEditingAssignees(null);
    // Clean up state for this row
    setRowAssignees(prev => {
      const newState = { ...prev };
      delete newState[taskId];
      return newState;
    });
    message.success("Assignment updated successfully");
  };

  // Handle closing assignment editor
  const handleCancelAssignees = () => {
    setEditingAssignees(null);
    // Clean up state for the editing row
    setRowAssignees(prev => {
      const newState = { ...prev };
      if (editingAssignees) {
        delete newState[editingAssignees];
      }
      return newState;
    });
  };

  // Handle opening status editor
  const handleEditStatus = (taskId, currentStatus) => {
    setEditingStatus(taskId);
    // Store status per row
    setRowStatus(prev => ({
      ...prev,
      [taskId]: currentStatus
    }));
  };

  // Handle saving status
  const handleSaveStatus = (taskId) => {
    console.log(`[TaskManager] Saving status for task ${taskId}`);
    console.log(`[TaskManager] rowStatus state:`, rowStatus);
    const statusToSave = rowStatus[taskId];
    console.log(`[TaskManager] Saving status: ${statusToSave} for taskId: ${taskId}`);
    
    if (statusToSave && statusToSave !== null) {
      handleTaskUpdate(taskId, {
        status: statusToSave,
      });
      setEditingStatus(null);
      // Clean up state for this row
      setRowStatus(prev => {
        const newState = { ...prev };
        delete newState[taskId];
        return newState;
      });
      message.success("Status updated");
    }
  };

  // Handle closing status editor
  const handleCancelStatus = () => {
    setEditingStatus(null);
    // Clean up state for the editing row
    setRowStatus(prev => {
      const newState = { ...prev };
      if (editingStatus) {
        delete newState[editingStatus];
      }
      return newState;
    });
  };

  // Get user display name
  const getUserDisplayName = (userId) => {
    const user = availableUsers.find(u => u.id === userId);
    return user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Unassigned';
  };

  // Get user avatar
  const getUserAvatar = (userId) => {
    const user = availableUsers.find(u => u.id === userId);
    if (!user) return <Avatar size="small">?</Avatar>;
    return (
      <Avatar size="small" style={{ backgroundColor: '#1890ff' }}>
        {user.firstName?.[0]}{user.lastName?.[0]}
      </Avatar>
    );
  };

  // Table columns configuration
  const tableColumns = [
    {
      title: 'Task Name',
      dataIndex: 'name',
      key: 'name',
      width: 180,
      render: (text, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '12px',
              height: '12px',
              backgroundColor: '#1890ff',
              borderRadius: '2px',
              flexShrink: 0,
            }}
          />
          <Text strong style={{ fontSize: '12px' }}>{text}</Text>
        </div>
      ),
    },
    {
      title: 'WorkType',
      dataIndex: ['workType', 'name'],
      key: 'workType',
      width: 120,
      render: (text) => (
        <Tag color="blue" style={{ fontSize: '11px' }}>{text || 'N/A'}</Tag>
      ),
    },
    {
      title: 'Grading',
      dataIndex: 'gradingName',
      key: 'grading',
      width: 120,
      render: (text) => (
        <Tag color="cyan" style={{ fontSize: '11px' }}>{text || 'N/A'}</Tag>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      width: 200,
      render: (text) => (
        <Text style={{ fontSize: '11px', color: '#6B778C' }}>
          {text || '-'}
        </Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status, record) => {
        const statusColors = {
          todo: 'default',
          inprogress: 'processing',
          done: 'success',
          cancelled: 'error',
        };
        
        // CRITICAL: Use task.id, NOT record.id for consistency
        const taskId = record.id || record.key;
        const isEditing = editingStatus === taskId;
        
        // Get the current status value - prioritize rowStatus state if exists
        let currentRowStatus;
        if (rowStatus.hasOwnProperty(taskId)) {
          currentRowStatus = rowStatus[taskId];
        } else {
          currentRowStatus = status || 'todo';
        }

        if (isEditing) {
          return (
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <Select
                autoFocus
                style={{ width: '100px', fontSize: '11px' }}
                placeholder="Select status"
                value={currentRowStatus}
                onChange={(value) => {
                  setRowStatus(prev => ({
                    ...prev,
                    [taskId]: value
                  }));
                }}
                size="small"
              >
                <Option value="todo">TODO</Option>
                <Option value="inprogress">IN PROGRESS</Option>
                <Option value="done">DONE</Option>
                <Option value="cancelled">CANCELLED</Option>
              </Select>
              <Button
                type="primary"
                size="small"
                onClick={() => handleSaveStatus(taskId)}
                style={{ fontSize: '10px', padding: '0 6px', height: '24px' }}
              >
                Save
              </Button>
              <Button
                size="small"
                onClick={handleCancelStatus}
                style={{ fontSize: '10px', padding: '0 6px', height: '24px' }}
              >
                Cancel
              </Button>
            </div>
          );
        }

        return (
          <div
            style={{
              cursor: !readOnly ? 'pointer' : 'default',
              display: 'inline-block',
            }}
            onClick={() => !readOnly && handleEditStatus(taskId, status)}
          >
            <Tag color={statusColors[status] || 'default'} style={{ fontSize: '10px', cursor: !readOnly ? 'pointer' : 'default' }}>
              {status?.toUpperCase() || 'TODO'}
            </Tag>
            {!readOnly && (
              <EditOutlined style={{ fontSize: '11px', color: '#999', marginLeft: '4px', cursor: 'pointer' }} />
            )}
          </div>
        );
      },
    },
    {
      title: 'Assignees',
      dataIndex: 'assigneeId',
      key: 'assignees',
      width: 200,
      render: (assigneeId, record) => {
        // CRITICAL: Use task.id, NOT record.id for consistency
        const taskId = resolveTaskId(record) || record.key || record.id;
        const isEditing = editingAssignees === taskId;
        
        // Get the current assignee value - prioritize rowAssignees state if exists
        let currentRowAssignee;
        if (rowAssignees.hasOwnProperty(taskId)) {
          currentRowAssignee = rowAssignees[taskId];
        } else {
          currentRowAssignee = assigneeId || null;
        }

        if (isEditing) {
          return (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Select
                autoFocus
                style={{ width: '150px', fontSize: '11px' }}
                placeholder="Select user"
                value={currentRowAssignee}
                onChange={(value) => {
                  setRowAssignees(prev => ({
                    ...prev,
                    [taskId]: value
                  }));
                }}
                optionLabelProp="label"
                size="small"
              >
                <Option value={null} label="Unassigned">
                  Unassigned
                </Option>
                {availableUsers.map(user => (
                  <Option key={user.id} value={user.id} label={`${user.firstName} ${user.lastName}`}>
                    <Avatar size="small" style={{ backgroundColor: '#1890ff', marginRight: '8px' }}>
                      {user.firstName?.[0]}{user.lastName?.[0]}
                    </Avatar>
                    {user.firstName} {user.lastName}
                  </Option>
                ))}
              </Select>
              <Button
                type="primary"
                size="small"
                onClick={() => handleSaveAssignees(taskId)}
                style={{ fontSize: '10px', padding: '0 8px', height: '24px' }}
              >
                Save
              </Button>
              <Button
                size="small"
                onClick={handleCancelAssignees}
                style={{ fontSize: '10px', padding: '0 8px', height: '24px' }}
              >
                Cancel
              </Button>
            </div>
          );
        }

        return (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: !readOnly ? 'pointer' : 'default',
            }}
            onClick={() => !readOnly && handleEditAssignees(taskId, assigneeId)}
          >
            {assigneeId ? (
              <>
                {getUserAvatar(assigneeId)}
                <Text style={{ fontSize: '11px' }}>
                  {getUserDisplayName(assigneeId).split(' ')[0]}
                </Text>
              </>
            ) : (
              <Text style={{ fontSize: '11px', color: '#999' }}>Unassigned</Text>
            )}
            {!readOnly && (
              <EditOutlined style={{ fontSize: '12px', color: '#999', cursor: 'pointer' }} />
            )}
          </div>
        );
      },
    },
  ];

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
            {readOnly ? 'View task details' : 'Click on any task card to view details'}
          </Text>
        </div>
      </div>

      {/* Task List */}
      {layout === "table" ? (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', overflow: 'hidden' }}>
          {enhancedTasks.length === 0 ? (
            <Empty
              description="No tasks yet"
              style={{ padding: '48px 16px' }}
            />
          ) : (
            <Table
              columns={tableColumns}
              dataSource={enhancedTasks.map(task => ({ ...task, key: resolveTaskId(task) }))}
              pagination={false}
              size="small"
              style={{
                fontSize: '12px',
              }}
              rowClassName={() => 'task-row'}
            />
          )}
        </div>
      ) : layout === "grouped" ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {groupedTasks.length === 0 ? (
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
            groupedTasks.map((workTypeGroup) => {
              const workTypeKey = `wt-${workTypeGroup.id}`;
              const totalTasksInWt = workTypeGroup.gradings.reduce((sum, g) => sum + g.tasks.length, 0);

              return (
                <Card
                  key={workTypeKey}
                  style={{
                    backgroundColor: '#fafbfc',
                    borderLeft: '4px solid #1890ff',
                  }}
                  bodyStyle={{ padding: '12px 16px' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '12px',
                      paddingBottom: '12px',
                      borderBottom: '1px solid #e8e8e8',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <SortAscendingOutlined style={{ fontSize: '16px', color: '#1890ff' }} />
                      <Text strong style={{ fontSize: '14px' }}>
                        {workTypeGroup.name}
                      </Text>
                      <Tag color="blue">{totalTasksInWt} tasks</Tag>
                    </div>
                  </div>

                  {/* Grading Groups */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {workTypeGroup.gradings.map((gradingGroup) => {
                      const gradingKey = `g-${workTypeGroup.id}-${gradingGroup.id}`;
                      const isExpanded = expandedGroups[gradingKey] !== false;

                      return (
                        <Card
                          key={gradingKey}
                          size="small"
                          style={{
                            backgroundColor: '#ffffff',
                            borderLeft: '3px solid #13c2c2',
                            cursor: 'pointer',
                          }}
                          onClick={() => {
                            setExpandedGroups((prev) => ({
                              ...prev,
                              [gradingKey]: !prev[gradingKey],
                            }));
                          }}
                          bodyStyle={{ padding: '12px' }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <UnorderedListOutlined
                                style={{
                                  fontSize: '14px',
                                  color: '#13c2c2',
                                  transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                                  transition: 'transform 0.3s',
                                }}
                              />
                              <Text style={{ fontSize: '13px', fontWeight: 500 }}>
                                {gradingGroup.name}
                              </Text>
                              <Tag color="cyan">{gradingGroup.tasks.length}</Tag>
                            </div>
                          </div>

                          {/* Tasks in this grading */}
                          {isExpanded && (
                            <Row
                              gutter={[16, 16]}
                              style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f0f0f0' }}
                            >
                              {gradingGroup.tasks.map((task) => (
                                <Col key={resolveTaskId(task)} span={24}>
                                  <TaskCard
                                    task={task}
                                    workType={workType}
                                    grading={grading}
                                    customFields={customFields}
                                    availableUsers={availableUsers}
                                    onTaskUpdate={(taskId, updates) => handleTaskUpdate(taskId, updates)}
                                    readOnly={readOnly}
                                    layout="row"
                                    clientPreferences={clientPreferences}
                                  />
                                </Col>
                              ))}
                            </Row>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      ) : layout === "row" ? (
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
              <Col key={task.id} span={24}>
                <TaskCard
                  task={task}
                  workType={workType}
                  grading={grading}
                  customFields={customFields}
                  availableUsers={availableUsers}
                  onTaskUpdate={(taskId, updates) => handleTaskUpdate(taskId, updates)}
                  readOnly={readOnly}
                  layout="row"
                  clientPreferences={clientPreferences}
                />
              </Col>
            ))
          )}
        </Row>
      ) : layout === "grid" ? (
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
                  clientPreferences={clientPreferences}
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
              <TaskCard
                key={task.id}
                task={task}
                workType={workType}
                grading={grading}
                customFields={customFields}
                availableUsers={availableUsers}
                onTaskUpdate={(taskId, updates) => handleTaskUpdate(taskId, updates)}
                readOnly={readOnly}
                clientPreferences={clientPreferences}
              />
            ))
          )}
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