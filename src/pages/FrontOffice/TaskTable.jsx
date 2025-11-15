import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  Table,
  Card,
  Input,
  Select,
  Tag,
  Button,
  Space,
  DatePicker,
  Progress,
  Tooltip,
  message,
  Dropdown,
  Badge,
  Drawer,
  Descriptions,
  Timeline,
  Avatar,
  Divider,
  Row,
  Col,
  Typography,
} from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  FilterOutlined,
  UserOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  ExclamationCircleOutlined,
  DownOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation } from "@apollo/client";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { GET_TASKS, UPDATE_TASK, BULK_UPDATE_TASK_STATUS } from "../../gql/tasks";
import { GET_AVAILABLE_USERS } from "../../graphql/projectQueries";
import { GET_WORK_TYPES } from "../../graphql/workTypeQueries";
import TaskCard from "../../components/TaskCard";

dayjs.extend(relativeTime);

const { Option } = Select;
const { Text } = Typography;

// Status configuration - matches backend TaskStatus enum
const TASK_STATUS = {
  TODO: { label: "To Do", color: "default", icon: <ClockCircleOutlined /> },
  IN_PROGRESS: { label: "In Progress", color: "blue", icon: <SyncOutlined spin /> },
  REVIEW: { label: "Review", color: "purple", icon: <ExclamationCircleOutlined /> },
  REVISION: { label: "Revision", color: "orange", icon: <ExclamationCircleOutlined /> },
  COMPLETED: { label: "Completed", color: "green", icon: <CheckCircleOutlined /> },
  CANCELLED: { label: "Cancelled", color: "red", icon: <CloseOutlined /> },
  ON_HOLD: { label: "On Hold", color: "gold", icon: <ClockCircleOutlined /> },
};

// Priority colors - A=High(Red), B=Medium(Orange), C=Low(Green)
const PRIORITY_COLORS = {
  A: "red",      // High priority
  B: "orange",   // Medium priority
  C: "green",    // Low priority
};

const TaskTable = () => {
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("active"); // Default to 'active' to hide completed
  const [userFilter, setUserFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [worktypeFilter, setWorktypeFilter] = useState("all");
  const [gradingFilter, setGradingFilter] = useState("all");
  const [pagination, setPagination] = useState({ current: 1, pageSize: 50 });
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("DESC");
  const [editingKey, setEditingKey] = useState("");
  const [editedData, setEditedData] = useState({});
  const [selectedGrading, setSelectedGrading] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingCell, setEditingCell] = useState({ key: null, field: null });
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskDrawerVisible, setTaskDrawerVisible] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTaskField, setEditingTaskField] = useState(null);
  const [taskEditData, setTaskEditData] = useState({});

  // Build filters for server-side filtering
  const buildFilters = useCallback(() => {
    const filters = {};
    
    if (statusFilter && statusFilter !== "all") {
      if (statusFilter === "active") {
        // For active, exclude COMPLETED and CANCELLED
        filters.statuses = ["TODO", "IN_PROGRESS", "REVIEW", "REVISION", "ON_HOLD"];
      } else {
        filters.status = statusFilter;
      }
    }
    
    if (userFilter && userFilter !== "all") {
      filters.assigneeId = userFilter;
    }
    
    if (priorityFilter && priorityFilter !== "all") {
      filters.priority = priorityFilter;
    }
    
    if (worktypeFilter && worktypeFilter !== "all") {
      filters.workTypeId = worktypeFilter;
    }
    
    if (gradingFilter && gradingFilter !== "all") {
      filters.gradingId = gradingFilter;
    }
    
    return filters;
  }, [statusFilter, userFilter, priorityFilter, worktypeFilter, gradingFilter]);

  // Fetch tasks with server-side filtering, pagination and sorting
  const { data: tasksData, loading: tasksLoading, refetch: refetchTasks } = useQuery(GET_TASKS, {
    variables: {
      filters: buildFilters(),
      page: pagination.current,
      limit: pagination.pageSize,
      sortBy: sortBy,
      sortOrder: sortOrder,
      search: searchText || undefined,
    },
    fetchPolicy: "cache-and-network",
  });

  // Fetch users
  const { data: usersData } = useQuery(GET_AVAILABLE_USERS, {
    fetchPolicy: "cache-first",
  });

  // Fetch worktypes for filtering
  const { data: worktypesData } = useQuery(GET_WORK_TYPES, {
    fetchPolicy: "cache-first",
  });

  // Update task mutation
  const [updateTask] = useMutation(UPDATE_TASK, {
    onCompleted: () => {
      message.success("Task updated successfully");
      refetchTasks();
      setEditingKey("");
      setEditedData({});
    },
    onError: (error) => {
      message.error(`Failed to update task: ${error.message}`);
    },
  });

  // Bulk update mutation
  const [bulkUpdateTaskStatus] = useMutation(BULK_UPDATE_TASK_STATUS, {
    onCompleted: () => {
      message.success("Tasks updated successfully");
      refetchTasks();
    },
    onError: (error) => {
      message.error(`Failed to update tasks: ${error.message}`);
    },
  });

  const tasks = tasksData?.tasks?.tasks || [];
  const totalTasks = tasksData?.tasks?.pagination?.totalItems || 0;
  const users = usersData?.availableUsers || [];
  const worktypes = worktypesData?.workTypes || [];

  // Reset to page 1 when filters change
  useEffect(() => {
    if (pagination.current !== 1) {
      setPagination(prev => ({ ...prev, current: 1 }));
    }
  }, [statusFilter, userFilter, priorityFilter, worktypeFilter, gradingFilter, searchText]);

  // Refetch tasks when filters, search, pagination or sorting changes
  useEffect(() => {
    refetchTasks();
  }, [searchText, statusFilter, userFilter, priorityFilter, worktypeFilter, gradingFilter, pagination.current, pagination.pageSize, sortBy, sortOrder, refetchTasks]);

  // Group tasks by project and grading
  const groupedTasks = useMemo(() => {
    const grouped = {};
    
    tasks.forEach((task) => {
      const projectId = task.project?.id;
      // Access grading from gradingTask relationship (task.gradingTask.grading)
      const grading = task.gradingTask?.grading;
      const gradingId = grading?.id || "no-grading";
      
      if (!projectId) return;
      
      if (!grouped[projectId]) {
        grouped[projectId] = {
          project: task.project,
          gradings: {},
        };
      }
      
      if (!grouped[projectId].gradings[gradingId]) {
        // Find the matching projectGrading to get imageQuantity
        const projectGrading = task.project?.projectGradings?.find(
          pg => pg.gradingId === gradingId
        );
        
        grouped[projectId].gradings[gradingId] = {
          grading: grading,
          tasks: [],
          totalTasks: 0,
          completedTasks: 0,
          totalImages: projectGrading?.imageQuantity || 0,
          completedImages: 0,
        };
      }
      
      grouped[projectId].gradings[gradingId].tasks.push(task);
      grouped[projectId].gradings[gradingId].totalTasks++;
      
      if (task.status?.toUpperCase() === "COMPLETED") {
        grouped[projectId].gradings[gradingId].completedTasks++;
        // Calculate completed images based on the ratio of completed tasks
        const totalTasks = grouped[projectId].gradings[gradingId].totalTasks;
        const completedTasks = grouped[projectId].gradings[gradingId].completedTasks;
        const totalImages = grouped[projectId].gradings[gradingId].totalImages;
        grouped[projectId].gradings[gradingId].completedImages = 
          Math.round((completedTasks / totalTasks) * totalImages);
      }
    });
    
    return grouped;
  }, [tasks]);

  // Flatten grouped data for table display
  const tableData = useMemo(() => {
    const rows = [];
    
    Object.values(groupedTasks).forEach((projectGroup) => {
      Object.values(projectGroup.gradings).forEach((gradingGroup) => {
        // Get unique assigned users from tasks (using task.assignee from GraphQL schema)
        const assignedUsers = [...new Set(gradingGroup.tasks.map(t => t.assignee?.id).filter(Boolean))];
        const earliestDueDate = gradingGroup.tasks
          .map(t => t.dueDate)
          .filter(Boolean)
          .sort((a, b) => new Date(a) - new Date(b))[0];
        
        const statusCounts = {
          TODO: 0,
          IN_PROGRESS: 0,
          REVIEW: 0,
          REVISION: 0,
          COMPLETED: 0,
          CANCELLED: 0,
          ON_HOLD: 0,
        };
        
        gradingGroup.tasks.forEach(task => {
          const status = (task.status || "TODO").toUpperCase();
          if (statusCounts[status] !== undefined) {
            statusCounts[status]++;
          }
        });
        
        rows.push({
          key: `${projectGroup.project.id}-${gradingGroup.grading?.id || "no-grading"}`,
          projectId: projectGroup.project.id,
          projectCode: projectGroup.project.projectCode || projectGroup.project.projectNumber,
          projectName: projectGroup.project.name,
          clientCode: projectGroup.project.client?.clientCode,
          clientName: projectGroup.project.client?.displayName,
          worktype: gradingGroup.tasks[0]?.project?.workType,
          gradingId: gradingGroup.grading?.id,
          gradingName: gradingGroup.grading?.name || "No Grading",
          gradingShortCode: gradingGroup.grading?.shortCode,
          totalTasks: gradingGroup.totalTasks,
          completedTasks: gradingGroup.completedTasks,
          totalImages: gradingGroup.totalImages,
          completedImages: gradingGroup.completedImages,
          progress: gradingGroup.totalTasks > 0 
            ? Math.round((gradingGroup.completedTasks / gradingGroup.totalTasks) * 100) 
            : 0,
          assignedUsers: assignedUsers,
          dueDate: earliestDueDate,
          orderDate: projectGroup.project.createdAt,
          priority: projectGroup.project.priority || "B",
          statusCounts,
          tasks: gradingGroup.tasks,
        });
      });
    });
    
    return rows;
  }, [groupedTasks]);

  // Get available statuses from current data
  const availableStatuses = useMemo(() => {
    const statusSet = new Set();
    tableData.forEach(row => {
      Object.keys(row.statusCounts).forEach(status => {
        if (row.statusCounts[status] > 0) {
          statusSet.add(status);
        }
      });
    });
    return Array.from(statusSet);
  }, [tableData]);

  // No client-side filtering needed - all filtering is done server-side
  const filteredData = tableData;

  // Function to get row class name with project grouping
  const getRowClassName = (record, index) => {
    let className = "";
    
    // Add project grouping border styles
    const currentProjectId = record.projectId;
    const prevRecord = index > 0 ? filteredData[index - 1] : null;
    const nextRecord = index < filteredData.length - 1 ? filteredData[index + 1] : null;
    
    // Check if this is the first row of a new project group
    const isFirstInGroup = !prevRecord || prevRecord.projectId !== currentProjectId;
    // Check if this is the last row of a project group
    const isLastInGroup = !nextRecord || nextRecord.projectId !== currentProjectId;
    
    if (isFirstInGroup) {
      className += "project-group-first ";
    }
    if (isLastInGroup) {
      className += "project-group-last ";
    }
    
    // Alternate background for different projects (only if not completed or overdue)
    const hasStatusColor = record.progress === 100 || (record.dueDate && dayjs(record.dueDate).isBefore(dayjs(), 'day'));
    
    if (!hasStatusColor) {
      const projectIndex = filteredData.findIndex(row => row.projectId === currentProjectId);
      const uniqueProjects = [...new Set(filteredData.slice(0, projectIndex + 1).map(r => r.projectId))];
      const projectGroupIndex = uniqueProjects.length - 1;
      
      if (projectGroupIndex % 2 === 1) {
        className += "project-group-alternate ";
      }
    }
    
    // Base styling for completion status
    if (record.progress === 100) {
      className += "bg-green-50 ";
    } else if (record.dueDate && dayjs(record.dueDate).isBefore(dayjs(), 'day')) {
      className += "bg-red-50 ";
    }
    
    return className.trim();
  };

  // Handle row click to show detail drawer
  const handleRowClick = (record) => {
    setSelectedGrading(record);
    setDrawerVisible(true);
  };

  // Handle inline editing
  const isEditingCell = (record, field) => {
    return editingCell.key === record.key && editingCell.field === field;
  };

  const startEditCell = (record, field, e) => {
    e.stopPropagation(); // Prevent row click
    setEditingCell({ key: record.key, field });
    setEditedData({
      assignedUsers: record.assignedUsers,
      dueDate: record.dueDate ? dayjs(record.dueDate) : null,
    });
  };

  const cancelEditCell = () => {
    setEditingCell({ key: null, field: null });
    setEditedData({});
  };

  const saveEditCell = async (record) => {
    try {
      // Update all tasks in this grading with new due date
      // If due date is changed for the grading, apply to all tasks
      const updates = record.tasks.map(task => ({
        id: task.id,
        dueDate: editedData.dueDate ? editedData.dueDate.toISOString() : null,
      }));

      for (const update of updates) {
        await updateTask({
          variables: {
            id: update.id,
            input: {
              dueDate: update.dueDate,
            },
          },
        });
      }
      cancelEditCell();
      message.success('Due date updated for all tasks in this grading');
    } catch (error) {
      console.error("Error saving:", error);
      message.error('Failed to update due date');
    }
  };

  // Handle inline editing - old methods (keeping for backward compatibility)
  const isEditing = (record) => record.key === editingKey;

  const edit = (record) => {
    setEditingKey(record.key);
    setEditedData({
      assignedUsers: record.assignedUsers,
      dueDate: record.dueDate ? dayjs(record.dueDate) : null,
    });
  };

  const cancel = () => {
    setEditingKey("");
    setEditedData({});
  };

  const save = async (record) => {
    try {
      // Update all tasks in this grading with new assignment/due date
      const updates = record.tasks.map(task => ({
        id: task.id,
        assigneeId: editedData.assignedUsers?.[0] || null,
        dueDate: editedData.dueDate ? editedData.dueDate.toISOString() : null,
      }));

      for (const update of updates) {
        await updateTask({
          variables: {
            id: update.id,
            input: {
              assigneeId: update.assigneeId,
              dueDate: update.dueDate,
            },
          },
        });
      }
    } catch (error) {
      console.error("Error saving:", error);
    }
  };

  // Bulk status update
  const handleBulkStatusUpdate = async (record, newStatus) => {
    try {
      const taskIds = record.tasks.map(t => t.id);
      await bulkUpdateTaskStatus({
        variables: {
          taskIds,
          status: newStatus,
          notes: `Bulk status update to ${newStatus}`,
        },
      });
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  // Table columns
  const columns = [
    {
      title: "Project",
      dataIndex: "projectCode",
      key: "projectCode",
      width: 220,
      fixed: "left",
      render: (text, record) => (
        <div 
          style={{ 
            pointerEvents: 'none', 
            userSelect: 'none'
          }}
        >
          <div className="font-semibold">
            {text}{record.projectName && ` - ${record.projectName}`}
          </div>
          <div className="text-xs text-gray-500">{record.clientName}</div>
        </div>
      ),
      sorter: true,
    },
    {
      title: "Client",
      dataIndex: "clientName",
      key: "clientName",
      width: 180,
      render: (text, record) => (
        <div style={{ pointerEvents: 'none', userSelect: 'none' }}>
          <div className="font-semibold">{record.clientCode}</div>
          <div className="text-xs text-gray-500">{text}</div>
        </div>
      ),
      sorter: true,
    },
    {
      title: "Order Date",
      dataIndex: "orderDate",
      key: "orderDate",
      width: 150,
      render: (text) => (
        <div style={{ pointerEvents: 'none', userSelect: 'none' }}>
          {text ? dayjs(text).format("MMM D, YYYY") : "-"}
        </div>
      ),
      sorter: true,
    },
    {
      title: "Grading",
      dataIndex: "gradingName",
      key: "gradingName",
      width: 200,
      render: (text, record) => (
        <div style={{ pointerEvents: 'none', userSelect: 'none' }}>
          <div>
            {record.gradingShortCode && (
              <Tag color="cyan" className="mr-1">{record.gradingShortCode}</Tag>
            )}
            <span className="font-medium">{text}</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {record.totalImages} images ({record.completedImages} completed)
          </div>
        </div>
      ),
      sorter: true,
    },
    {
      title: "Progress",
      key: "progress",
      width: 200,
      render: (_, record) => {
        // Create tooltip content with task details in horizontal format
        const tooltipContent = (
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {record.tasks.map((task, index) => (
              <div key={task.id} style={{ marginBottom: index < record.tasks.length - 1 ? '8px' : '0', paddingBottom: index < record.tasks.length - 1 ? '8px' : '0', borderBottom: index < record.tasks.length - 1 ? '1px solid rgba(255,255,255,0.15)' : 'none' }}>
                <div style={{ fontWeight: '600', marginBottom: '4px', color: '#ffffff' }}>{task.title || task.taskCode}</div>
                <div style={{ fontSize: '12px', display: 'flex', gap: '12px', flexWrap: 'wrap', color: '#e8e8e8' }}>
                  <span>Status: <Tag color={TASK_STATUS[(task.status || 'TODO').toUpperCase()]?.color} size="small">
                    {TASK_STATUS[(task.status || 'TODO').toUpperCase()]?.label || task.status}
                  </Tag></span>
                  <span>Assignee: <strong>{task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : 'Unassigned'}</strong></span>
                  <span>Due: <strong>{task.dueDate ? dayjs(task.dueDate).format('MMM D, YYYY') : 'Not set'}</strong></span>
                </div>
              </div>
            ))}
          </div>
        );

        return (
          <Tooltip 
            title={tooltipContent} 
            overlayStyle={{ maxWidth: '500px' }}
            color="#1f1f1f"
            overlayInnerStyle={{ color: '#ffffff' }}
          >
            <div style={{ cursor: 'help' }}>
              <Progress 
                percent={record.progress} 
                size="small" 
                status={record.progress === 100 ? "success" : "active"}
              />
              <div className="text-xs text-gray-500 mt-1">
                {record.completedTasks}/{record.totalTasks} tasks • {record.completedImages}/{record.totalImages} images
              </div>
            </div>
          </Tooltip>
        );
      },
      sorter: true,
    },
    {
      title: "Status",
      key: "status",
      width: 180,
      render: (_, record) => (
        <Space size="small" wrap style={{ pointerEvents: 'none', userSelect: 'none' }}>
          {Object.entries(record.statusCounts).map(([status, count]) => {
            if (count === 0) return null;
            const config = TASK_STATUS[status];
            if (!config) return null; // Skip unknown statuses
            return (
              <Tag key={status} color={config.color} icon={config.icon}>
                {count}
              </Tag>
            );
          })}
        </Space>
      ),
    },
    {
      title: "Due Date",
      key: "dueDate",
      width: 200,
      render: (_, record) => {
        const isEditing = isEditingCell(record, 'dueDate');
        
        if (isEditing) {
          return (
            <div onClick={(e) => e.stopPropagation()}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <DatePicker
                  style={{ width: "100%" }}
                  value={editedData.dueDate}
                  onChange={(date) => setEditedData({ ...editedData, dueDate: date })}
                  size="small"
                />
                <Space size="small">
                  <Button type="primary" size="small" onClick={() => saveEditCell(record)}>
                    Save
                  </Button>
                  <Button size="small" onClick={cancelEditCell}>
                    Cancel
                  </Button>
                </Space>
              </Space>
            </div>
          );
        }
        
        if (!record.dueDate) {
          return (
            <div onClick={(e) => startEditCell(record, 'dueDate', e)} style={{ cursor: 'pointer' }}>
              <span className="text-gray-400">Not set (Click to edit)</span>
            </div>
          );
        }
        
        const dueDate = dayjs(record.dueDate);
        const isOverdue = dueDate.isBefore(dayjs(), 'day');
        const isDueSoon = !isOverdue && dueDate.diff(dayjs(), 'day') <= 3;
        
        return (
          <div onClick={(e) => startEditCell(record, 'dueDate', e)} style={{ cursor: 'pointer' }}>
            <div className={isOverdue ? "text-red-500 font-semibold" : isDueSoon ? "text-orange-500" : ""}>
              {dueDate.format("MMM D, YYYY")}
            </div>
            <div className="text-xs text-gray-500">{dueDate.fromNow()}</div>
          </div>
        );
      },
      sorter: true,
    },
    {
      title: "Priority",
      key: "priority",
      width: 100,
      render: (_, record) => (
        <div style={{ pointerEvents: 'none', userSelect: 'none' }}>
          <Tag color={PRIORITY_COLORS[record.priority] || "default"}>
            {record.priority === 'A' ? 'High' : record.priority === 'B' ? 'Medium' : record.priority === 'C' ? 'Low' : record.priority}
          </Tag>
        </div>
      ),
      sorter: true,
    },
  ];

  return (
    <div className="task-table-view">
      <div>
        {/* Filters and Summary Stats */}
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={16} align="middle" style={{ marginBottom: 12 }}>
            {/* Summary Stats - Compact Badges */}
            <Col flex="auto">
              <Space size={16}>
                <Space size={4}>
                  <FilterOutlined style={{ fontSize: 16, color: '#1890ff' }} />
                  <Text strong style={{ fontSize: 14 }}>Gradings:</Text>
                  <Tag color="blue" style={{ margin: 0, fontSize: 14, padding: '2px 8px' }}>{tableData.length}</Tag>
                </Space>
                <Space size={4}>
                  <ClockCircleOutlined style={{ fontSize: 16, color: '#faad14' }} />
                  <Text strong style={{ fontSize: 14 }}>Tasks:</Text>
                  <Tag color="orange" style={{ margin: 0, fontSize: 14, padding: '2px 8px' }}>{tasks.length}</Tag>
                </Space>
                <Space size={4}>
                  <CheckCircleOutlined style={{ fontSize: 16, color: '#52c41a' }} />
                  <Text strong style={{ fontSize: 14 }}>Completed:</Text>
                  <Tag color="green" style={{ margin: 0, fontSize: 14, padding: '2px 8px' }}>{tasks.filter(t => (t.status || '').toUpperCase() === 'COMPLETED').length}</Tag>
                </Space>
                <Space size={4}>
                  <span style={{ fontSize: 16 }}>📷</span>
                  <Text strong style={{ fontSize: 14 }}>Images:</Text>
                  <Tag color="cyan" style={{ margin: 0, fontSize: 14, padding: '2px 8px' }}>{tableData.reduce((sum, row) => sum + row.totalImages, 0)}</Tag>
                </Space>
              </Space>
            </Col>
          </Row>
          <Row gutter={16} align="middle">
            <Col span={6}>
              <div style={{ marginBottom: 4, fontSize: 12, fontWeight: 500 }}>Search</div>
              <Input
                placeholder="Search projects, clients, gradings..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
              />
            </Col>
            <Col span={3}>
              <div style={{ marginBottom: 4, fontSize: 12, fontWeight: 500 }}>Worktype</div>
              <Select
                placeholder="All Worktypes"
                value={worktypeFilter}
                onChange={setWorktypeFilter}
                style={{ width: "100%" }}
                allowClear
              >
                <Option value="all">All Worktypes</Option>
                {worktypes.map(worktype => (
                  <Option key={worktype.id} value={worktype.id}>
                    {worktype.name}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col span={3}>
              <div style={{ marginBottom: 4, fontSize: 12, fontWeight: 500 }}>Grading</div>
              <Select
                placeholder="All Gradings"
                value={gradingFilter}
                onChange={setGradingFilter}
                style={{ width: "100%" }}
                allowClear
              >
                <Option value="all">All Gradings</Option>
                {[...new Set(tableData.map(row => ({ id: row.gradingId, name: row.gradingName })).filter(g => g.id))]
                  .filter((g, index, self) => self.findIndex(t => t.id === g.id) === index)
                  .map(grading => (
                    <Option key={grading.id} value={grading.id}>
                      {grading.name}
                    </Option>
                  ))}
              </Select>
            </Col>
            <Col span={3}>
              <div style={{ marginBottom: 4, fontSize: 12, fontWeight: 500 }}>Status</div>
              <Select
                placeholder="Active"
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: "100%" }}
              >
                <Option value="active">Active</Option>
                <Option value="all">All Status</Option>
                {availableStatuses.map(status => (
                  <Option key={status} value={status}>
                    {TASK_STATUS[status]?.label || status}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col span={3}>
              <div style={{ marginBottom: 4, fontSize: 12, fontWeight: 500 }}>User</div>
              <Select
                placeholder="All Users"
                value={userFilter}
                onChange={setUserFilter}
                style={{ width: "100%" }}
                allowClear
                showSearch
                filterOption={(input, option) =>
                  option.children.toLowerCase().includes(input.toLowerCase())
                }
              >
                <Option value="all">All Users</Option>
                {users.map(user => (
                  <Option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col span={2}>
              <div style={{ marginBottom: 4, fontSize: 12, fontWeight: 500 }}>Priority</div>
              <Select
                placeholder="All"
                value={priorityFilter}
                onChange={setPriorityFilter}
                style={{ width: "100%" }}
              >
                <Option value="all">All</Option>
                <Option value="A">High</Option>
                <Option value="B">Med</Option>
                <Option value="C">Low</Option>
              </Select>
            </Col>
            <Col span={1} style={{ textAlign: "right", paddingTop: 20 }}>
              <Button icon={<ReloadOutlined />} onClick={() => refetchTasks()} />
            </Col>
          </Row>
        </Card>

        {/* Tasks Table */}
        <Card>
        <Table
          columns={columns}
          dataSource={filteredData}
          loading={tasksLoading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: totalTasks,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} tasks (${filteredData.length} gradings on this page)`,
            onChange: (page, pageSize) => {
              setPagination({ current: page, pageSize });
            },
            pageSizeOptions: ['10', '25', '50', '100', '200'],
          }}
          onChange={(pagination, filters, sorter) => {
            // Handle sorting changes
            if (sorter.field && sorter.order) {
              const fieldMap = {
                'projectCode': 'projectCode',
                'clientName': 'clientName',
                'orderDate': 'createdAt',
                'gradingName': 'gradingName',
                'progress': 'status',
                'dueDate': 'dueDate',
                'priority': 'priority'
              };
              const backendField = fieldMap[sorter.field] || sorter.field;
              setSortBy(backendField);
              setSortOrder(sorter.order === 'ascend' ? 'ASC' : 'DESC');
            } else {
              // Reset to default sorting
              setSortBy('createdAt');
              setSortOrder('DESC');
            }
          }}
          scroll={{ x: 1600 }}
          size="small"
          rowClassName={getRowClassName}
          expandable={{
            expandedRowRender: (record) => {
              // Sort tasks by worktype order (using taskType's sortOrder or order field)
              const sortedTasks = [...record.tasks].sort((a, b) => {
                const orderA = a.taskType?.sortOrder || a.taskType?.order || 0;
                const orderB = b.taskType?.sortOrder || b.taskType?.order || 0;
                return orderA - orderB;
              });

              const taskColumns = [
                {
                  title: "Task Code",
                  dataIndex: "taskCode",
                  key: "taskCode",
                  width: 120,
                  render: (text) => <span className="font-mono text-xs">{text}</span>,
                },
                {
                  title: "Title",
                  dataIndex: "title",
                  key: "title",
                  width: 200,
                },
                {
                  title: "Type",
                  key: "taskType",
                  width: 120,
                  render: (_, task) => (
                    <Tag color={task.taskType?.color || "default"}>
                      {task.taskType?.name || "N/A"}
                    </Tag>
                  ),
                },
                {
                  title: "Status",
                  dataIndex: "status",
                  key: "status",
                  width: 130,
                  render: (status) => {
                    const statusKey = (status || "TODO").toUpperCase();
                    const config = TASK_STATUS[statusKey];
                    if (!config) return <Tag>{status}</Tag>;
                    return (
                      <Tag color={config.color} icon={config.icon}>
                        {config.label}
                      </Tag>
                    );
                  },
                },
                {
                  title: "Assigned To",
                  key: "assignee",
                  width: 180,
                  render: (_, task) => {
                    const isEditing = editingTaskId === task.id && editingTaskField === 'assignee';
                    
                    if (isEditing) {
                      return (
                        <Space direction="vertical" size="small" style={{ width: '100%' }}>
                          <Select
                            style={{ width: "100%" }}
                            placeholder="Select user"
                            value={taskEditData.assigneeId}
                            onChange={(value) => setTaskEditData({ ...taskEditData, assigneeId: value })}
                            size="small"
                            showSearch
                            optionFilterProp="children"
                          >
                            <Option value={null}>Unassigned</Option>
                            {users.map(user => (
                              <Option key={user.id} value={user.id}>
                                {user.firstName} {user.lastName}
                              </Option>
                            ))}
                          </Select>
                          <Space size="small">
                            <Button 
                              type="primary" 
                              size="small" 
                              onClick={async () => {
                                try {
                                  await updateTask({
                                    variables: {
                                      id: task.id,
                                      input: { assigneeId: taskEditData.assigneeId },
                                    },
                                  });
                                  setEditingTaskId(null);
                                  setEditingTaskField(null);
                                  setTaskEditData({});
                                } catch (error) {
                                  console.error('Error updating task:', error);
                                }
                              }}
                            >
                              Save
                            </Button>
                            <Button 
                              size="small" 
                              onClick={() => {
                                setEditingTaskId(null);
                                setEditingTaskField(null);
                                setTaskEditData({});
                              }}
                            >
                              Cancel
                            </Button>
                          </Space>
                        </Space>
                      );
                    }
                    
                    return (
                      <div 
                        onClick={() => {
                          setEditingTaskId(task.id);
                          setEditingTaskField('assignee');
                          setTaskEditData({ assigneeId: task.assignee?.id || null });
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        {task.assignee ? (
                          <Tag icon={<UserOutlined />} color="blue">
                            {task.assignee.firstName} {task.assignee.lastName}
                          </Tag>
                        ) : (
                          <Tag icon={<UserOutlined />} color="default">Click to assign</Tag>
                        )}
                      </div>
                    );
                  },
                },
                {
                  title: "Due Date",
                  dataIndex: "dueDate",
                  key: "dueDate",
                  width: 180,
                  render: (date, task) => {
                    const isEditing = editingTaskId === task.id && editingTaskField === 'dueDate';
                    
                    if (isEditing) {
                      return (
                        <Space direction="vertical" size="small" style={{ width: '100%' }}>
                          <DatePicker
                            style={{ width: "100%" }}
                            value={taskEditData.dueDate ? dayjs(taskEditData.dueDate) : null}
                            onChange={(date) => setTaskEditData({ ...taskEditData, dueDate: date ? date.toISOString() : null })}
                            size="small"
                          />
                          <Space size="small">
                            <Button 
                              type="primary" 
                              size="small" 
                              onClick={async () => {
                                try {
                                  await updateTask({
                                    variables: {
                                      id: task.id,
                                      input: { dueDate: taskEditData.dueDate },
                                    },
                                  });
                                  setEditingTaskId(null);
                                  setEditingTaskField(null);
                                  setTaskEditData({});
                                } catch (error) {
                                  console.error('Error updating task:', error);
                                }
                              }}
                            >
                              Save
                            </Button>
                            <Button 
                              size="small" 
                              onClick={() => {
                                setEditingTaskId(null);
                                setEditingTaskField(null);
                                setTaskEditData({});
                              }}
                            >
                              Cancel
                            </Button>
                          </Space>
                        </Space>
                      );
                    }
                    
                    return (
                      <div 
                        onClick={() => {
                          setEditingTaskId(task.id);
                          setEditingTaskField('dueDate');
                          setTaskEditData({ dueDate: date || null });
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        {date ? (
                          <div className={dayjs(date).isBefore(dayjs(), 'day') ? "text-red-500" : ""}>
                            {dayjs(date).format("MMM D, YYYY")}
                          </div>
                        ) : (
                          <span className="text-gray-400">Click to set</span>
                        )}
                      </div>
                    );
                  },
                },
                {
                  title: "Priority",
                  dataIndex: "priority",
                  key: "priority",
                  width: 100,
                  render: (priority) => (
                    <Tag color={PRIORITY_COLORS[priority] || "default"}>
                      {priority === 'A' ? 'High' : priority === 'B' ? 'Medium' : priority === 'C' ? 'Low' : priority}
                    </Tag>
                  ),
                },
                {
                  title: "Action",
                  key: "action",
                  width: 100,
                  render: (_, task) => (
                    <Button 
                      type="link" 
                      size="small"
                      onClick={() => {
                        setSelectedTask(task);
                        setTaskDrawerVisible(true);
                      }}
                    >
                      View Details
                    </Button>
                  ),
                },
              ];

              return (
                <Table
                  columns={taskColumns}
                  dataSource={sortedTasks}
                  pagination={false}
                  size="small"
                  rowKey="id"
                  style={{ margin: '0 48px' }}
                />
              );
            },
            rowExpandable: (record) => record.tasks && record.tasks.length > 0,
          }}
        />
        </Card>
      </div>

      {/* Task Detail Drawer */}
      <Drawer
        title={
          <div>
            <div className="text-lg font-semibold">
              {selectedGrading?.projectCode} - {selectedGrading?.gradingName}
            </div>
            <div className="text-sm text-gray-500">{selectedGrading?.clientName}</div>
          </div>
        }
        placement="right"
        width={800}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        extra={
          <Button icon={<CloseOutlined />} onClick={() => setDrawerVisible(false)}>
            Close
          </Button>
        }
      >
        {selectedGrading && (
          <div>
            {/* Grading Summary */}
            <Card title="Grading Summary" size="small" className="mb-4">
              <Descriptions column={2} size="small">
                <Descriptions.Item label="Project">{selectedGrading.projectCode}</Descriptions.Item>
                <Descriptions.Item label="Client">{selectedGrading.clientName}</Descriptions.Item>
                <Descriptions.Item label="Grading">
                  {selectedGrading.gradingShortCode && (
                    <Tag color="cyan" className="mr-1">{selectedGrading.gradingShortCode}</Tag>
                  )}
                  {selectedGrading.gradingName}
                </Descriptions.Item>
                <Descriptions.Item label="Priority">
                  <Tag color={PRIORITY_COLORS[selectedGrading.priority] || "default"}>
                    {selectedGrading.priority === 'A' ? 'High' : selectedGrading.priority === 'B' ? 'Medium' : selectedGrading.priority === 'C' ? 'Low' : selectedGrading.priority}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Progress">
                  <Progress percent={selectedGrading.progress} size="small" />
                </Descriptions.Item>
                <Descriptions.Item label="Due Date">
                  {selectedGrading.dueDate ? (
                    <div>
                      <div>{dayjs(selectedGrading.dueDate).format("MMM D, YYYY")}</div>
                      <div className="text-xs text-gray-500">
                        {dayjs(selectedGrading.dueDate).fromNow()}
                      </div>
                    </div>
                  ) : (
                    "Not set"
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Total Tasks">{selectedGrading.totalTasks}</Descriptions.Item>
                <Descriptions.Item label="Completed Tasks">{selectedGrading.completedTasks}</Descriptions.Item>
                <Descriptions.Item label="Total Images">{selectedGrading.totalImages}</Descriptions.Item>
                <Descriptions.Item label="Completed Images">{selectedGrading.completedImages}</Descriptions.Item>
              </Descriptions>
            </Card>

            {/* Status Distribution */}
            <Card title="Status Distribution" size="small" className="mb-4">
              <Space size="middle" wrap>
                {Object.entries(selectedGrading.statusCounts).map(([status, count]) => (
                  <div key={status} className="text-center">
                    <div className="text-2xl font-bold">{count}</div>
                    <Tag color={TASK_STATUS[status].color} icon={TASK_STATUS[status].icon}>
                      {TASK_STATUS[status].label}
                    </Tag>
                  </div>
                ))}
              </Space>
            </Card>

            {/* Individual Tasks */}
            <Card title={`Individual Tasks (${selectedGrading.tasks.length})`} size="small">
              <div className="space-y-3">
                {selectedGrading.tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    availableUsers={users}
                    workType={task.workType}
                    onUpdate={() => refetchTasks()}
                  />
                ))}
              </div>
            </Card>
          </div>
        )}
      </Drawer>

      {/* Individual Task Detail Drawer */}
      <Drawer
        title={
          <div>
            <div className="text-lg font-semibold">
              {selectedTask?.taskCode} - {selectedTask?.title}
            </div>
            <div className="text-sm text-gray-500">
              {selectedTask?.project?.projectCode} - {selectedTask?.project?.name}
            </div>
          </div>
        }
        placement="right"
        width={900}
        onClose={() => {
          setTaskDrawerVisible(false);
          setSelectedTask(null);
        }}
        open={taskDrawerVisible}
        extra={
          <Button 
            icon={<CloseOutlined />} 
            onClick={() => {
              setTaskDrawerVisible(false);
              setSelectedTask(null);
            }}
          >
            Close
          </Button>
        }
      >
        {selectedTask && (
          <TaskCard
            task={selectedTask}
            availableUsers={users}
            workType={selectedTask.workType}
            onUpdate={() => {
              refetchTasks();
              // Optionally close drawer after update
              // setTaskDrawerVisible(false);
              // setSelectedTask(null);
            }}
          />
        )}
      </Drawer>
    </div>
  );
};

// Add custom styles for project grouping
const style = document.createElement('style');
style.textContent = `
  .project-group-first {
    border-top: 3px solid #1890ff !important;
  }
  
  .project-group-last {
    border-bottom: 3px solid #1890ff !important;
  }
  
  .project-group-alternate {
    background-color: #f0f5ff !important;
  }
`;
document.head.appendChild(style);

export default TaskTable;
