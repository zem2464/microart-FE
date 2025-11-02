import React, { useState, useEffect } from "react";
import {
  Card,
  Typography,
  Avatar,
  Tag,
  Space,
  Button,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Row,
  Col,
  Divider,
  List,
  InputNumber,
  message,
  Spin,
  Tooltip,
  Popconfirm,
  Alert,
} from "antd";
import {
  UserOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  CommentOutlined,
  SendOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  DeleteOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useSubscription } from "@apollo/client";
import dayjs from "dayjs";

// Import GraphQL operations
import { UPDATE_TASK, TASK_FRAGMENT } from "../gql/tasks";
import {
  GET_TASK_COMMENTS,
  CREATE_TASK_COMMENT,
  UPDATE_TASK_COMMENT,
  DELETE_TASK_COMMENT,
  createCommentInput,
  createUpdateCommentInput,
} from "../gql/taskComments";
import { useTaskSubscriptions } from "../hooks/useTaskSubscriptions";
import MentionInput from "./MentionInput";

const { TextArea } = Input;
const { Text } = Typography;
const { Option } = Select;

// Animation style for update button
const updateBtnStyle = {
  transition: "opacity 0.2s",
  opacity: 1,
  marginTop: "8px",
};
const updateBtnHiddenStyle = {
  ...updateBtnStyle,
  opacity: 0,
  pointerEvents: "none",
  height: 0,
  overflow: "hidden",
};

const TaskCard = ({
  hideStatusOnBoard = false,
  task,
  workType = null,
  grading = null,
  customFields = [],
  availableUsers = [],
  onTaskUpdate,
  onTaskClick,
  readOnly = false,
  showModal = false,
  onModalClose,
  layout = "grid",
  clientPreferences = null,
}) => {
  const [modalVisible, setModalVisible] = useState(showModal);

  // Sync modal visibility with showModal prop
  useEffect(() => {
    setModalVisible(showModal);
  }, [showModal]);
  const [form] = Form.useForm();
  const [commentForm] = Form.useForm();
  const [newComment, setNewComment] = useState("");
  const [newCommentMentions, setNewCommentMentions] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [editCommentMentions, setEditCommentMentions] = useState([]);
  // Comment sorting state
  const [commentSortOrder, setCommentSortOrder] = useState("desc"); // 'desc' = latest first, 'asc' = oldest first
  // Local state for editable fields
  const [description, setDescription] = useState(task?.description || "");
  const [instructions, setInstructions] = useState(task?.instructions || "");
  const [notes, setNotes] = useState(task?.notes || "");
  const [clientNotes, setClientNotes] = useState(task?.clientNotes || "");
  const [internalNotes, setInternalNotes] = useState(task?.internalNotes || "");
  // Focus state for each field
  const [descFocused, setDescFocused] = useState(false);
  const [instFocused, setInstFocused] = useState(false);
  const [notesFocused, setNotesFocused] = useState(false);
  const [clientNotesFocused, setClientNotesFocused] = useState(false);
  const [internalNotesFocused, setInternalNotesFocused] = useState(false);

  // Initialize form when modal opens or task changes
  useEffect(() => {
    if (modalVisible && task) {
      // Get assignee ID from either assignee object or assigneeId field
      const assigneeId = task.assignee?.id || task.assigneeId;

      console.log("Initializing form with task:", {
        taskAssignee: task.assignee,
        assigneeId: assigneeId,
        availableUsers: availableUsers.length,
        taskTitle: task.title || task.name,
      });

      // Convert status to uppercase format expected by Select options
      const convertStatusToSelectFormat = (status) => {
        const statusMap = {
          todo: "TODO",
          in_progress: "IN_PROGRESS",
          "in-progress": "IN_PROGRESS",
          revision: "REVISION",
          completed: "COMPLETED",
          done: "COMPLETED",
        };
        return statusMap[status?.toLowerCase()] || status?.toUpperCase();
      };

      const formValues = {
        title: task.title || task.name,
        description: task.description,
        instructions: task.instructions,
        status: convertStatusToSelectFormat(task.status),
        priority: task.priority,
        assigneeId: assigneeId, // Use the correct assignee ID
        estimatedHours: task.estimatedHours || task.estimatedTime,
        actualHours: task.actualHours || task.actualTime,
        estimatedCost: task.estimatedCost,
        actualCost: task.actualCost,
        dueDate: task.dueDate ? dayjs(task.dueDate) : null,
        notes: task.notes,
        clientNotes: task.clientNotes,
        internalNotes: task.internalNotes,
      };

      console.log("Setting form values:", formValues);
      form.setFieldsValue(formValues);
    }
  }, [modalVisible, task, form, availableUsers.length]);

  // Additional effect to update assignee when users are loaded
  useEffect(() => {
    if (modalVisible && task && availableUsers.length > 0) {
      const assigneeId = task.assignee?.id || task.assigneeId;
      if (assigneeId) {
        console.log("Setting assignee after users loaded:", assigneeId);
        form.setFieldsValue({ assigneeId: assigneeId });
      }
    }
  }, [modalVisible, task, availableUsers.length, form]);

  // GraphQL Mutations
  const [updateTask, { loading: updateTaskLoading }] = useMutation(
    UPDATE_TASK,
    {
      onCompleted: (data) => {
        message.success("Task updated successfully");
        setIsEditing(false);
        onTaskUpdate?.(data.updateTask);
      },
      onError: (error) => {
        message.error(`Failed to update task: ${error.message}`);
      },
    }
  );

  const [createTaskComment, { loading: createCommentLoading }] = useMutation(
    CREATE_TASK_COMMENT,
    {
      refetchQueries: [
        { query: GET_TASK_COMMENTS, variables: { taskId: task?.id } },
      ],
      onCompleted: () => {
        message.success("Comment added successfully");
        setNewComment("");
        commentForm.resetFields();
      },
      onError: (error) => {
        message.error(`Failed to add comment: ${error.message}`);
      },
    }
  );

  const [updateTaskComment, { loading: updateCommentLoading }] = useMutation(
    UPDATE_TASK_COMMENT,
    {
      onCompleted: () => {
        message.success("Comment updated successfully");
        setEditingCommentId(null);
        setEditCommentText("");
      },
      onError: (error) => {
        message.error(`Failed to update comment: ${error.message}`);
      },
    }
  );

  const [deleteTaskComment, { loading: deleteCommentLoading }] = useMutation(
    DELETE_TASK_COMMENT,
    {
      refetchQueries: [
        { query: GET_TASK_COMMENTS, variables: { taskId: task?.id } },
      ],
      onCompleted: () => {
        message.success("Comment deleted successfully");
      },
      onError: (error) => {
        message.error(`Failed to delete comment: ${error.message}`);
      },
    }
  );

  // GraphQL Queries
  const {
    data: commentsData,
    loading: commentsLoading,
    error: commentsError,
    refetch: refetchComments,
  } = useQuery(GET_TASK_COMMENTS, {
    variables: { taskId: task?.id },
    skip: !task?.id || !modalVisible,
    fetchPolicy: "cache-and-network",
  });

  // Use the custom subscription hook for real-time updates
  const subscriptions = useTaskSubscriptions(task?.id, null, {
    enabled: !!task?.id, // Only enable if task exists
    showNotifications: modalVisible, // Only show notifications when modal is open
    onTaskUpdated: (updatedTask) => {
      // Update the task data
      onTaskUpdate?.(updatedTask);
      // Refresh form fields if modal is open
      if (modalVisible) {
        const assigneeId = updatedTask.assignee?.id || updatedTask.assigneeId;
        form.setFieldsValue({
          title: updatedTask.title || updatedTask.name,
          description: updatedTask.description,
          instructions: updatedTask.instructions,
          status: updatedTask.status,
          priority: updatedTask.priority,
          assigneeId: assigneeId,
          estimatedHours:
            updatedTask.estimatedHours || updatedTask.estimatedTime,
          actualHours: updatedTask.actualHours || updatedTask.actualTime,
          estimatedCost: updatedTask.estimatedCost,
          actualCost: updatedTask.actualCost,
          dueDate: updatedTask.dueDate ? dayjs(updatedTask.dueDate) : null,
          notes: updatedTask.notes,
          clientNotes: updatedTask.clientNotes,
          internalNotes: updatedTask.internalNotes,
        });
        // Update local state as well
        setDescription(updatedTask.description || "");
        setInstructions(updatedTask.instructions || "");
        setNotes(updatedTask.notes || "");
        setClientNotes(updatedTask.clientNotes || "");
        setInternalNotes(updatedTask.internalNotes || "");
      }
    },
    onCommentAdded: () => {
      refetchComments();
    },
    onCommentUpdated: () => {
      refetchComments();
    },
    onCommentDeleted: () => {
      refetchComments();
    },
  });

  const comments = commentsData?.taskComments?.nodes || [];

  // Get task type details with color
  const getTaskTypeDetails = (taskTypeObj) => {
    if (taskTypeObj && typeof taskTypeObj === "object") {
      // Task type is already an object with all properties
      return {
        icon: taskTypeObj.icon || "📋",
        color: taskTypeObj.color || "#0052CC",
        bgColor: taskTypeObj.color ? `${taskTypeObj.color}20` : "#DEEBFF", // Add transparency to color for background
        name: taskTypeObj.name || "Task",
      };
    } else if (typeof taskTypeObj === "string") {
      // Fallback for string type values
      const taskTypes = {
        bug: {
          icon: "🐛",
          color: "#DE350B",
          bgColor: "#FFEBE6",
          name: "Bug",
        },
        feature: {
          icon: "✨",
          color: "#36B37E",
          bgColor: "#E3FCEF",
          name: "Feature",
        },
        task: {
          icon: "📋",
          color: "#0052CC",
          bgColor: "#DEEBFF",
          name: "Task",
        },
        story: {
          icon: "📖",
          color: "#FF8B00",
          bgColor: "#FFF4E6",
          name: "Story",
        },
      };
      return taskTypes[taskTypeObj] || taskTypes.task;
    }

    // Default fallback
    return {
      icon: "📋",
      color: "#0052CC",
      bgColor: "#DEEBFF",
      name: "Task",
    };
  };

  // Get priority details
  const getPriorityDetails = (priority) => {
    const priorities = {
      lowest: { label: "Lowest", color: "#57A55A", bgColor: "#E3FCEF" },
      low: { label: "Low", color: "#57A55A", bgColor: "#E3FCEF" },
      medium: { label: "Medium", color: "#E97F33", bgColor: "#FFF4E6" },
      high: { label: "High", color: "#CD1317", bgColor: "#FFE7E6" },
      highest: { label: "Highest", color: "#CD1317", bgColor: "#FFE7E6" },
    };
    return priorities[priority] || priorities.medium;
  };

  // Get status details - aligned with TaskBoard STATUS_COLUMNS
  const getStatusDetails = (status) => {
    const normalizedStatus = status?.toLowerCase();
    const statuses = {
      todo: { label: "To Do", color: "#42526E", bgColor: "#DFE1E6" },
      in_progress: {
        label: "In Progress",
        color: "#FFFFFF",
        bgColor: "#0052CC",
      },
      revision: { label: "In Review", color: "#FFFFFF", bgColor: "#FF8B00" },
      completed: { label: "Done", color: "#FFFFFF", bgColor: "#36B37E" },
      // Keep some backwards compatibility
      "in-progress": {
        label: "In Progress",
        color: "#FFFFFF",
        bgColor: "#0052CC",
      },
      done: { label: "Done", color: "#FFFFFF", bgColor: "#36B37E" },
      blocked: { label: "BLOCKED", color: "#FFFFFF", bgColor: "#DE350B" },
    };
    return statuses[normalizedStatus] || statuses.todo;
  };

  // Get user display name
  const getUserDisplayName = (userId) => {
    // First check if we have the assignee object in the task
    if (!userId && task.assignee) {
      return `${task.assignee.firstName} ${task.assignee.lastName}`;
    }

    const user = availableUsers.find((u) => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : "Unassigned";
  };

  // Check if the current assignee is a preferred user
  const isPreferredUser = (userId, taskTypeId) => {
    if (!clientPreferences?.taskPreferences || !userId || !taskTypeId) {
      return false;
    }

    const taskPreference = clientPreferences.taskPreferences.find(
      (pref) => pref.taskType.id === taskTypeId
    );

    return taskPreference?.preferredUserIds?.includes(userId) || false;
  };

  // Get user avatar
  const getUserAvatar = (userId) => {
    // First check if we have the assignee object in the task
    if (!userId && task.assignee) {
      return (
        <Avatar size="small" style={{ backgroundColor: "#0052CC" }}>
          {task.assignee.firstName?.charAt(0)}
        </Avatar>
      );
    }

    const user = availableUsers.find((u) => u.id === userId);
    return user ? (
      <Avatar size="small" style={{ backgroundColor: "#0052CC" }}>
        {user.firstName?.charAt(0)}
      </Avatar>
    ) : (
      <Avatar size="small" icon={<UserOutlined />} />
    );
  };

  // Render comment content with proper mentions
  const renderCommentContent = (content) => {
    if (!content) return "";

    // Parse mentions in format @[Display Name](userId)
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }

      // Add mention as styled span
      const [fullMatch, displayName, userId] = match;
      const user = availableUsers.find((u) => u.id === userId);
      const mentionDisplay = user
        ? `${user.firstName} ${user.lastName}`
        : displayName;

      parts.push(
        <span
          key={`mention-${userId}-${match.index}`}
          style={{
            backgroundColor: "#e6f7ff",
            color: "#1890ff",
            fontWeight: "bold",
            borderRadius: "3px",
            padding: "1px 3px",
            textDecoration: "none",
          }}
        >
          @{mentionDisplay}
        </span>
      );

      lastIndex = match.index + fullMatch.length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }

    return parts.length > 0 ? parts : content;
  };

  // Sort comments based on sort order
  const getSortedComments = (comments) => {
    if (!comments || comments.length === 0) return [];

    return [...comments].sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);

      return commentSortOrder === "desc"
        ? dateB.getTime() - dateA.getTime() // Latest first
        : dateA.getTime() - dateB.getTime(); // Oldest first
    });
  };

  // Handle card click
  const handleCardClick = () => {
    if (onTaskClick) {
      onTaskClick(task);
    } else {
      setModalVisible(true);
      const assigneeId = task.assignee?.id || task.assigneeId;
      form.setFieldsValue({
        title: task.title || task.name, // Support both title and name fields
        description: task.description,
        instructions: task.instructions,
        status: task.status,
        priority: task.priority,
        assigneeId: assigneeId,
        estimatedHours: task.estimatedHours || task.estimatedTime,
        actualHours: task.actualHours || task.actualTime,
        estimatedCost: task.estimatedCost,
        actualCost: task.actualCost,
        dueDate: task.dueDate ? dayjs(task.dueDate) : null,
        notes: task.notes,
        clientNotes: task.clientNotes,
        internalNotes: task.internalNotes,
      });
    }
  };

  // Initialize local state when modal opens
  useEffect(() => {
    if (modalVisible && task) {
      // Initialize local state for editable fields
      setDescription(task.description || "");
      setInstructions(task.instructions || "");
      setNotes(task.notes || "");
      setClientNotes(task.clientNotes || "");
      setInternalNotes(task.internalNotes || "");
    }
  }, [modalVisible, task]);

  // Handle task update
  const handleTaskUpdate = async (values) => {
    try {
      const updates = {
        ...values,
        dueDate: values.dueDate ? values.dueDate.toISOString() : null,
      };

      await updateTask({
        variables: {
          id: task.id,
          input: updates,
        },
      });
    } catch (error) {
      console.error("Task update error:", error);
    }
  };

  // Handle modal save
  const handleModalSave = async (values) => {
    await handleTaskUpdate(values);
    if (!updateTaskLoading) {
      setModalVisible(false);
      form.resetFields();
    }
  };

  // Handle inline field updates
  const handleFieldUpdate = async (fieldName, value) => {
    const updates = {
      [fieldName]: value,
    };

    if (fieldName === "dueDate") {
      updates[fieldName] = value ? dayjs(value).toISOString() : null;
    }

    await handleTaskUpdate(updates);
  };

  // Handle comment submission
  const handleCommentSubmit = async () => {
    if (!newComment.trim()) return;

    // Extract mentioned user IDs
    const mentionedUserIds = newCommentMentions.map((mention) => mention.id);

    try {
      await createTaskComment({
        variables: {
          input: createCommentInput({
            taskId: task.id,
            content: newComment.trim(),
            commentType: "general",
            isInternal: false,
            mentionedUsers: mentionedUserIds,
          }),
        },
      });

      // Clear comment input and mentions after successful submission
      setNewComment("");
      setNewCommentMentions([]);
    } catch (error) {
      console.error("Comment creation error:", error);
    }
  };

  // Handle comment edit
  const handleCommentEdit = (comment) => {
    setEditingCommentId(comment.id);
    setEditCommentText(comment.content);
    // Extract existing mentions from comment if available
    setEditCommentMentions(comment.mentionedUsers || []);
  };

  // Handle comment update
  const handleCommentUpdate = async (commentId) => {
    if (!editCommentText.trim()) return;

    // Extract mentioned user IDs from edit mentions
    const mentionedUserIds = editCommentMentions.map((mention) => mention.id);

    try {
      await updateTaskComment({
        variables: {
          id: commentId,
          input: createUpdateCommentInput({
            content: editCommentText.trim(),
            mentionedUsers: mentionedUserIds,
          }),
        },
      });

      // Clear edit state after successful update
      setEditingCommentId(null);
      setEditCommentText("");
      setEditCommentMentions([]);
    } catch (error) {
      console.error("Comment update error:", error);
    }
  };

  // Handle comment delete
  const handleCommentDelete = async (commentId) => {
    try {
      await deleteTaskComment({
        variables: { id: commentId },
      });
    } catch (error) {
      console.error("Comment delete error:", error);
    }
  };

  // Cancel comment edit
  const cancelCommentEdit = () => {
    setEditingCommentId(null);
    setEditCommentText("");
  };

  // Render custom fields in description
  const renderCustomFieldsDescription = () => {
    if (!customFields || customFields.length === 0) return null;

    return (
      <div style={{ marginTop: "6px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {customFields.map((field, index) => (
            <div
              key={index}
              style={{
                backgroundColor: "#F0F4F8",
                padding: "4px 8px",
                borderRadius: "4px",
                fontSize: "10px",
              }}
            >
              <Text
                style={{ fontSize: "10px", color: "#0052CC", fontWeight: 600 }}
              >
                {field.label}:
              </Text>
              <Text
                style={{
                  fontSize: "10px",
                  color: "#172B4D",
                  marginLeft: "4px",
                }}
              >
                {field.value}
              </Text>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const taskTypeDetails = getTaskTypeDetails(task.taskType);
  const priorityDetails = getPriorityDetails(task.priority);
  const statusDetails = getStatusDetails(task.status);

  return (
    <>
      {/* Only render the card if showModal is false */}
      {!showModal && (
        <Card
          size="small"
          hoverable
          onClick={handleCardClick}
          style={{
            cursor: "pointer",
            border: `2px solid ${taskTypeDetails.color}`,
            borderRadius: "8px",
            marginBottom: layout === "row" ? "12px" : "8px",
            transition: "all 0.2s ease",
            width: "100%",
          }}
          bodyStyle={{
            padding: layout === "row" ? "16px" : "12px",
            display: layout === "row" ? "flex" : "block",
            alignItems: layout === "row" ? "center" : "initial",
            justifyContent: layout === "row" ? "space-between" : "initial",
          }}
        >
          {/* Task Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "8px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              {/* Task Type Color Box */}
              <div
                style={{
                  width: "18px",
                  height: "18px",
                  backgroundColor: taskTypeDetails.color,
                  borderRadius: "3px",
                  border: "1px solid rgba(0,0,0,0.1)",
                  flexShrink: 0,
                }}
              />

              {/* Task Title */}
              <Text
                style={{
                  fontSize: "12px",
                  color: "#172B4D",
                  fontWeight: 600,
                  lineHeight: "1.2",
                }}
              >
                {task.title || task.name}
              </Text>

              {/* Client Code */}
              {(task.clientCode || task.project?.client?.clientCode) && (
                <Text
                  style={{
                    fontSize: "10px",
                    color: "#0052CC",
                    fontWeight: 600,
                    backgroundColor: "#E3F2FD",
                    padding: "2px 6px",
                    borderRadius: "3px",
                  }}
                >
                  {task.clientCode || task.project?.client?.clientCode}
                </Text>
              )}
            </div>

            {/* Status (hide on kanban board if hideStatusOnBoard is true) */}
            {!hideStatusOnBoard && (
              <Tag
                style={{
                  backgroundColor: statusDetails.bgColor,
                  color: statusDetails.color,
                  border: "none",
                  fontSize: "9px",
                  padding: "2px 6px",
                  borderRadius: "10px",
                  fontWeight: 600,
                }}
              >
                {statusDetails.label}
              </Tag>
            )}
          </div>

          {layout === "row" ? (
            /* Row Layout Content */
            <>
              {/* Left Section - Task Info */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                {/* Task Description */}
                {task.description && (
                  <div>
                    <Text
                      style={{
                        fontSize: "12px",
                        color: "#6B778C",
                        lineHeight: "1.4",
                      }}
                    >
                      {task.description}
                    </Text>
                  </div>
                )}

                {/* Work Type and Grading Info */}
                {(workType || grading) && (
                  <div
                    style={{
                      display: "flex",
                      gap: "16px",
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    {workType && (
                      <div
                        style={{
                          backgroundColor: "#E8F4FD",
                          padding: "3px 8px",
                          borderRadius: "12px",
                          fontSize: "10px",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: "10px",
                            color: "#0052CC",
                            fontWeight: 600,
                          }}
                        >
                          {workType.name}
                        </Text>
                      </div>
                    )}
                    {grading && (
                      <div
                        style={{
                          backgroundColor: "#F0F9FF",
                          padding: "3px 8px",
                          borderRadius: "12px",
                          fontSize: "10px",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: "10px",
                            color: "#1890FF",
                            fontWeight: 600,
                          }}
                        >
                          {grading.name}
                        </Text>
                      </div>
                    )}
                  </div>
                )}

                {/* Custom Fields */}
                {renderCustomFieldsDescription()}
              </div>

              {/* Right Section - Meta Info */}
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                {(task.estimatedHours || task.estimatedTime) > 0 && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "2px",
                    }}
                  >
                    <ClockCircleOutlined
                      style={{ fontSize: "11px", color: "#6B778C" }}
                    />
                    <Text style={{ fontSize: "10px", color: "#6B778C" }}>
                      {task.estimatedHours || task.estimatedTime}h
                    </Text>
                  </div>
                )}
                {task.dueDate && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "2px",
                    }}
                  >
                    <CalendarOutlined
                      style={{ fontSize: "11px", color: "#6B778C" }}
                    />
                    <Text
                      style={{
                        fontSize: "10px",
                        color: dayjs(task.dueDate).isBefore(dayjs())
                          ? "#DE350B"
                          : "#6B778C",
                      }}
                    >
                      {dayjs(task.dueDate).format("MMM DD")}
                    </Text>
                  </div>
                )}
                {comments.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "2px",
                    }}
                  >
                    <CommentOutlined
                      style={{ fontSize: "11px", color: "#6B778C" }}
                    />
                    <Text style={{ fontSize: "10px", color: "#6B778C" }}>
                      {comments.length}
                    </Text>
                  </div>
                )}
              </div>

              {/* Right Section - Task Code, Priority and Assignee */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: "8px",
                }}
              >
                {/* Top row: Task Code and Priority */}
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <Text
                    style={{
                      fontSize: "10px",
                      color: "#6B778C",
                      backgroundColor: "#F4F5F7",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      fontWeight: 500,
                    }}
                  >
                    {task.taskCode || task.taskKey || "N/A"}
                  </Text>

                  {/* Priority Indicator */}
                  <div
                    style={{
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      backgroundColor: priorityDetails.color,
                    }}
                  />
                </div>

                {/* Assignee */}
                <div
                  style={{ display: "flex", alignItems: "center", gap: "4px" }}
                >
                  {getUserAvatar(task.assignee?.id || task.assigneeId)}
                  <Text style={{ fontSize: "10px", color: "#172B4D" }}>
                    {
                      getUserDisplayName(
                        task.assignee?.id || task.assigneeId
                      ).split(" ")[0]
                    }
                  </Text>
                  {isPreferredUser(
                    task.assignee?.id || task.assigneeId,
                    task.taskTypeId
                  ) && (
                    <Text style={{ fontSize: "8px", color: "#52c41a" }}>
                      ⭐
                    </Text>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* Grid/List Layout Content */
            <>
              {/* Work Type and Grading Info */}
              {(workType || grading) && (
                <div
                  style={{
                    marginBottom: "8px",
                    display: "flex",
                    gap: "8px",
                    flexWrap: "wrap",
                  }}
                >
                  {workType && (
                    <div
                      style={{
                        backgroundColor: "#E8F4FD",
                        padding: "3px 6px",
                        borderRadius: "10px",
                        fontSize: "9px",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: "9px",
                          color: "#0052CC",
                          fontWeight: 600,
                        }}
                      >
                        {workType.name}
                      </Text>
                    </div>
                  )}
                  {grading && (
                    <div
                      style={{
                        backgroundColor: "#F0F9FF",
                        padding: "3px 6px",
                        borderRadius: "10px",
                        fontSize: "9px",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: "9px",
                          color: "#1890FF",
                          fontWeight: 600,
                        }}
                      >
                        {grading.name}
                      </Text>
                    </div>
                  )}
                </div>
              )}

              {/* Task Description */}
              {task.description && (
                <div style={{ marginBottom: "8px" }}>
                  <Text
                    style={{
                      fontSize: "11px",
                      color: "#6B778C",
                      lineHeight: "1.3",
                    }}
                  >
                    {task.description.length > 60
                      ? `${task.description.substring(0, 60)}...`
                      : task.description}
                  </Text>
                </div>
              )}

              {/* Custom Fields */}
              {renderCustomFieldsDescription()}

              {/* Jira-style Task Footer - Task Code (left) and Assignee (right) */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "8px",
                  paddingTop: "8px",
                  borderTop: "1px solid #F4F5F7",
                }}
              >
                {/* Left: Task Code, Priority and Grading */}
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  {/* Task Code */}
                  <Text
                    style={{
                      fontSize: "10px",
                      color: "#6B778C",
                      backgroundColor: "#F4F5F7",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      fontWeight: 500,
                    }}
                  >
                    {task.taskCode || task.taskKey || "N/A"}
                  </Text>

                  {/* Priority Indicator */}
                  <div
                    style={{
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      backgroundColor: priorityDetails.color,
                    }}
                  />

                  {/* Grading Info */}
                  {(task.gradingTask?.grading || grading) && (
                    <Text
                      style={{
                        fontSize: "10px",
                        color: "#0052CC",
                        backgroundColor: "#E3F2FD",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontWeight: 500,
                      }}
                    >
                      {task.gradingTask?.grading?.name || grading.name}
                    </Text>
                  )}
                </div>

                {/* Right: Assignee */}
                <div
                  style={{ display: "flex", alignItems: "center", gap: "4px" }}
                >
                  {getUserAvatar(task.assignee?.id || task.assigneeId)}
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <Text style={{ fontSize: "10px", color: "#172B4D" }}>
                      {
                        getUserDisplayName(
                          task.assignee?.id || task.assigneeId
                        ).split(" ")[0]
                      }
                    </Text>
                    {isPreferredUser(
                      task.assignee?.id || task.assigneeId,
                      task.taskTypeId
                    ) && (
                      <Text style={{ fontSize: "8px", color: "#52c41a" }}>
                        ⭐
                      </Text>
                    )}
                  </div>
                </div>

                {/* Meta info */}
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  {(task.estimatedHours || task.estimatedTime) > 0 && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "2px",
                      }}
                    >
                      <ClockCircleOutlined
                        style={{ fontSize: "10px", color: "#6B778C" }}
                      />
                      <Text style={{ fontSize: "10px", color: "#6B778C" }}>
                        {task.estimatedHours || task.estimatedTime}h
                      </Text>
                    </div>
                  )}
                  {task.dueDate && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "2px",
                      }}
                    >
                      <CalendarOutlined
                        style={{ fontSize: "10px", color: "#6B778C" }}
                      />
                      <Text
                        style={{
                          fontSize: "10px",
                          color: dayjs(task.dueDate).isBefore(dayjs())
                            ? "#DE350B"
                            : "#6B778C",
                        }}
                      >
                        {dayjs(task.dueDate).format("MMM DD")}
                      </Text>
                    </div>
                  )}
                  {comments.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "2px",
                      }}
                    >
                      <CommentOutlined
                        style={{ fontSize: "10px", color: "#6B778C" }}
                      />
                      <Text style={{ fontSize: "10px", color: "#6B778C" }}>
                        {comments.length}
                      </Text>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </Card>
      )}

      {/* JIRA-like Task Modal */}
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "16px",
                height: "16px",
                backgroundColor: taskTypeDetails.color,
                borderRadius: "3px",
                display: "inline-block",
              }}
            />
            <span style={{ fontWeight: 600, color: "#172B4D" }}>
              {taskTypeDetails.name}
            </span>
            <Text
              style={{
                fontSize: "12px",
                color: "#6B778C",
                backgroundColor: "#F4F5F7",
                padding: "2px 6px",
                borderRadius: "4px",
                marginLeft: "8px",
              }}
            >
              {task.taskCode || task.taskKey}
            </Text>
          </div>
        }
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          onModalClose && onModalClose();
        }}
        width={800}
        footer={null}
        styles={{
          header: {
            backgroundColor: "#F4F5F7",
            borderBottom: "1px solid #DFE1E6",
          },
        }}
      >
        <Row gutter={16}>
          {/* Left Column - Task Details */}
          <Col span={16}>
            <Form form={form} layout="vertical" onFinish={handleModalSave}>
              {/* Task Title Section */}
              <Form.Item
                name="title"
                label={
                  <span style={{ fontWeight: 600, color: "#172B4D" }}>
                    Title
                  </span>
                }
              >
                <Input
                  readOnly
                  style={{
                    fontSize: "16px",
                    fontWeight: 500,
                    backgroundColor: "#f5f5f5",
                    cursor: "default",
                  }}
                />
              </Form.Item>

              {/* Show task metadata */}
              <div style={{ marginBottom: "16px" }}>
                <Row gutter={16}>
                  <Col span={12}>
                    <Text style={{ fontSize: "12px", color: "#6B778C" }}>
                      Task Code: <strong>{task.taskCode}</strong>
                    </Text>
                  </Col>
                  <Col span={12}>
                    {(task.project?.client?.clientCode || task.clientCode) && (
                      <Text style={{ fontSize: "12px", color: "#6B778C" }}>
                        Client:{" "}
                        <strong>
                          {task.project?.client?.clientCode || task.clientCode}
                        </strong>
                      </Text>
                    )}
                  </Col>
                </Row>
              </div>

              {/* Client & Project Information Display */}
              <div
                style={{
                  marginBottom: "16px",
                  padding: "12px",
                  backgroundColor: "#F8F9FA",
                  borderRadius: "4px",
                }}
              >
                <Text
                  style={{
                    fontWeight: 600,
                    color: "#172B4D",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  Client & Project Details
                </Text>
                <Row gutter={[16, 8]}>
                  {task.clientColorStyle && (
                    <Col span={12}>
                      <Text style={{ fontSize: "12px", color: "#6B778C" }}>
                        <strong>Color Style:</strong> {task.clientColorStyle}
                      </Text>
                    </Col>
                  )}
                  {task.clientTransferMode && (
                    <Col span={12}>
                      <Text style={{ fontSize: "12px", color: "#6B778C" }}>
                        <strong>Transfer Mode:</strong>{" "}
                        {task.clientTransferMode}
                      </Text>
                    </Col>
                  )}
                  {task.taskManager && (
                    <Col span={12}>
                      <Text style={{ fontSize: "12px", color: "#6B778C" }}>
                        <strong>Service Provider:</strong>{" "}
                        {task.taskManager.firstName} {task.taskManager.lastName}
                      </Text>
                    </Col>
                  )}
                  {task.projectDeadlineDate && (
                    <Col span={12}>
                      <Text style={{ fontSize: "12px", color: "#6B778C" }}>
                        <strong>Project Deadline:</strong>{" "}
                        {dayjs(task.projectDeadlineDate).format("MMM DD, YYYY")}
                      </Text>
                    </Col>
                  )}
                  {task.projectImageQuantity && (
                    <Col span={12}>
                      <Text style={{ fontSize: "12px", color: "#6B778C" }}>
                        <strong>No. of Images:</strong>{" "}
                        {task.projectImageQuantity}
                      </Text>
                    </Col>
                  )}
                  {/* Show work type from task data first, fallback to props */}
                  {(task.taskType?.workType?.name || workType) && (
                    <Col span={12}>
                      <Text style={{ fontSize: "12px", color: "#6B778C" }}>
                        <strong>Work Type:</strong>{" "}
                        {task.taskType?.workType?.name || workType.name}
                      </Text>
                    </Col>
                  )}
                  {/* Show grading from task data first, fallback to props */}
                  {(task.gradingTask?.grading || grading) && (
                    <Col span={12}>
                      <Text style={{ fontSize: "12px", color: "#6B778C" }}>
                        <strong>Grading:</strong>{" "}
                        {task.gradingTask?.grading?.name || grading.name}
                        {(task.gradingTask?.grading?.defaultRate ||
                          grading?.defaultRate) && (
                          <span>
                            {" "}
                            (₹
                            {task.gradingTask?.grading?.defaultRate ||
                              grading.defaultRate}
                            )
                          </span>
                        )}
                      </Text>
                    </Col>
                  )}
                  {task.projectDescription && (
                    <Col span={24}>
                      <Text style={{ fontSize: "12px", color: "#6B778C" }}>
                        <strong>Project Description:</strong>
                      </Text>
                      <div
                        style={{
                          marginTop: "4px",
                          padding: "8px",
                          backgroundColor: "#FFFFFF",
                          borderRadius: "4px",
                          border: "1px solid #E8E8E8",
                        }}
                      >
                        <Text style={{ fontSize: "12px", color: "#172B4D" }}>
                          {task.projectDescription}
                        </Text>
                      </div>
                    </Col>
                  )}
                </Row>
              </div>

              {/* Custom Fields Display */}
              {customFields && customFields.length > 0 && (
                <div
                  style={{
                    marginBottom: "16px",
                    padding: "12px",
                    backgroundColor: "#F0F9FF",
                    borderRadius: "4px",
                  }}
                >
                  <Text
                    style={{
                      fontWeight: 600,
                      color: "#172B4D",
                      display: "block",
                      marginBottom: "8px",
                    }}
                  >
                    Custom Fields
                  </Text>
                  <Row gutter={[16, 8]}>
                    {customFields.map((field, index) => (
                      <Col span={12} key={index}>
                        <Text style={{ fontSize: "12px", color: "#6B778C" }}>
                          <strong>{field.label || field.name}:</strong>{" "}
                          {field.value}
                        </Text>
                      </Col>
                    ))}
                  </Row>
                </div>
              )}

              {/* Client Notes Display */}
              {(task.clientNotes || task.project?.client?.clientNotes) && (
                <div
                  style={{
                    marginBottom: "16px",
                    padding: "12px",
                    backgroundColor: "#E6F7FF",
                    borderRadius: "4px",
                    border: "1px solid #91D5FF",
                  }}
                >
                  <Text
                    style={{
                      fontWeight: 600,
                      color: "#172B4D",
                      display: "block",
                      marginBottom: "8px",
                    }}
                  >
                    Client Notes
                  </Text>
                  <Text
                    style={{
                      fontSize: "12px",
                      color: "#172B4D",
                      lineHeight: "1.4",
                    }}
                  >
                    {task.clientNotes || task.project?.client?.clientNotes}
                  </Text>
                </div>
              )}

              <Form.Item
                name="description"
                label={
                  <span style={{ fontWeight: 600, color: "#172B4D" }}>
                    Description
                  </span>
                }
              >
                <TextArea
                  rows={4}
                  placeholder="Add a description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onFocus={() => setDescFocused(true)}
                  onBlur={() => setDescFocused(false)}
                />
                <div
                  style={descFocused ? updateBtnStyle : updateBtnHiddenStyle}
                >
                  <Button
                    type="primary"
                    onMouseDown={(e) => e.preventDefault()} // Prevent blur before click
                    onClick={() =>
                      handleFieldUpdate("description", description)
                    }
                    disabled={updateTaskLoading}
                  >
                    Update
                  </Button>
                </div>
              </Form.Item>

              <Form.Item
                name="instructions"
                label={
                  <span style={{ fontWeight: 600, color: "#172B4D" }}>
                    Instructions
                  </span>
                }
              >
                <TextArea
                  rows={3}
                  placeholder="Add specific instructions..."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  onFocus={() => setInstFocused(true)}
                  onBlur={() => setInstFocused(false)}
                />
                <div
                  style={instFocused ? updateBtnStyle : updateBtnHiddenStyle}
                >
                  <Button
                    type="primary"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() =>
                      handleFieldUpdate("instructions", instructions)
                    }
                    disabled={updateTaskLoading}
                  >
                    Update
                  </Button>
                </div>
              </Form.Item>

              {/* Custom Fields Display */}
              {customFields && customFields.length > 0 && (
                <div style={{ marginBottom: "16px" }}>
                  <Text
                    style={{
                      fontWeight: 600,
                      color: "#172B4D",
                      display: "block",
                      marginBottom: "8px",
                    }}
                  >
                    Custom Fields
                  </Text>
                  <div
                    style={{
                      backgroundColor: "#F8F9FA",
                      padding: "12px",
                      borderRadius: "4px",
                    }}
                  >
                    {customFields.map((field, index) => (
                      <div key={index} style={{ marginBottom: "8px" }}>
                        <Text style={{ fontSize: "12px", color: "#172B4D" }}>
                          <strong>{field.label}:</strong> {field.value}
                        </Text>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments Section */}
              <div style={{ marginTop: "24px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <Text style={{ fontWeight: 600, color: "#172B4D" }}>
                      Comments ({comments.length})
                    </Text>
                    {/* Comment sort toggle */}
                    {comments.length > 1 && (
                      <Button
                        type="text"
                        size="small"
                        onClick={() =>
                          setCommentSortOrder((prev) =>
                            prev === "desc" ? "asc" : "desc"
                          )
                        }
                        style={{
                          fontSize: "11px",
                          color: "#6B778C",
                          padding: "2px 6px",
                          height: "20px",
                        }}
                      >
                        {commentSortOrder === "desc"
                          ? "↓ Latest first"
                          : "↑ Oldest first"}
                      </Button>
                    )}
                    {/* Real-time status indicator */}
                    {subscriptions.isLoading ? (
                      <Tooltip title="Connecting to real-time updates">
                        <div
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            backgroundColor: "#faad14",
                          }}
                        />
                      </Tooltip>
                    ) : subscriptions.hasErrors ? (
                      <Tooltip title="Real-time updates disabled">
                        <div
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            backgroundColor: "#ff4d4f",
                          }}
                        />
                      </Tooltip>
                    ) : (
                      <Tooltip title="Real-time updates active">
                        <div
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            backgroundColor: "#52c41a",
                          }}
                        />
                      </Tooltip>
                    )}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    {commentsLoading && <Spin size="small" />}
                    <Button
                      type="text"
                      icon={<ReloadOutlined />}
                      onClick={refetchComments}
                      size="small"
                    />
                  </div>
                </div>

                {commentsError && (
                  <Alert
                    message="Failed to load comments"
                    type="error"
                    style={{ marginBottom: "16px" }}
                    showIcon
                  />
                )}

                {/* Add Comment */}
                <div style={{ marginBottom: "16px" }}>
                  <MentionInput
                    value={newComment}
                    onChange={(value) => setNewComment(value)}
                    onMentionChange={(mentions) =>
                      setNewCommentMentions(mentions)
                    }
                    users={availableUsers}
                    placeholder="Add a comment... Use @ to mention users"
                    disabled={createCommentLoading}
                    style={{ marginBottom: "8px" }}
                  />
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={handleCommentSubmit}
                    disabled={!newComment.trim() || createCommentLoading}
                    loading={createCommentLoading}
                  >
                    Comment
                  </Button>
                </div>

                {/* Comments List */}
                {comments.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "24px",
                      color: "#6B778C",
                    }}
                  >
                    <CommentOutlined
                      style={{ fontSize: "24px", marginBottom: "8px" }}
                    />
                    <div>No comments yet</div>
                    <Text type="secondary" style={{ fontSize: "12px" }}>
                      Be the first to comment on this task
                    </Text>
                  </div>
                ) : (
                  <List
                    dataSource={getSortedComments(comments)}
                    renderItem={(comment) => (
                      <div
                        style={{
                          display: "flex",
                          gap: "12px",
                          padding: "12px 0",
                          borderBottom: "1px solid #F1F2F4",
                        }}
                      >
                        <Avatar
                          style={{ backgroundColor: "#0052CC" }}
                          size="small"
                        >
                          {comment.author?.firstName?.charAt(0)}
                        </Avatar>
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              marginBottom: "4px",
                            }}
                          >
                            <Text
                              style={{
                                fontWeight: 600,
                                fontSize: "12px",
                                color: "#172B4D",
                              }}
                            >
                              {comment.author
                                ? `${comment.author.firstName} ${comment.author.lastName}`
                                : "Unknown User"}
                            </Text>
                            <Text
                              style={{ fontSize: "11px", color: "#6B778C" }}
                            >
                              {dayjs(comment.createdAt).format(
                                "MMM DD, YYYY HH:mm"
                              )}
                            </Text>
                            {comment.isEdited && (
                              <Text
                                style={{
                                  fontSize: "10px",
                                  color: "#6B778C",
                                  fontStyle: "italic",
                                }}
                              >
                                (edited)
                              </Text>
                            )}

                            {/* Comment Actions */}
                            <Space style={{ marginLeft: "auto" }}>
                              <Tooltip title="Edit comment">
                                <Button
                                  type="text"
                                  size="small"
                                  icon={<EditOutlined />}
                                  onClick={() => handleCommentEdit(comment)}
                                  style={{ padding: "0 4px" }}
                                />
                              </Tooltip>
                              <Tooltip title="Delete comment">
                                <Popconfirm
                                  title="Delete comment?"
                                  description="Are you sure you want to delete this comment?"
                                  onConfirm={() =>
                                    handleCommentDelete(comment.id)
                                  }
                                  okText="Delete"
                                  cancelText="Cancel"
                                >
                                  <Button
                                    type="text"
                                    size="small"
                                    icon={<DeleteOutlined />}
                                    loading={deleteCommentLoading}
                                    style={{
                                      padding: "0 4px",
                                      color: "#ff4d4f",
                                    }}
                                  />
                                </Popconfirm>
                              </Tooltip>
                            </Space>
                          </div>

                          {editingCommentId === comment.id ? (
                            <div>
                              <MentionInput
                                value={editCommentText}
                                onChange={(value) => setEditCommentText(value)}
                                onMentionChange={(mentions) =>
                                  setEditCommentMentions(mentions)
                                }
                                users={availableUsers}
                                placeholder="Edit your comment... Use @ to mention users"
                                style={{ marginBottom: "8px" }}
                              />
                              <Space>
                                <Button
                                  size="small"
                                  type="primary"
                                  icon={<SaveOutlined />}
                                  onClick={() =>
                                    handleCommentUpdate(comment.id)
                                  }
                                  loading={updateCommentLoading}
                                >
                                  Save
                                </Button>
                                <Button
                                  size="small"
                                  icon={<CloseOutlined />}
                                  onClick={cancelCommentEdit}
                                >
                                  Cancel
                                </Button>
                              </Space>
                            </div>
                          ) : (
                            <div
                              style={{
                                fontSize: "12px",
                                color: "#172B4D",
                                lineHeight: "1.4",
                              }}
                            >
                              {renderCommentContent(comment.content)}
                            </div>
                          )}

                          {/* Render replies if any */}
                          {comment.replies && comment.replies.length > 0 && (
                            <div
                              style={{
                                marginTop: "12px",
                                marginLeft: "16px",
                                borderLeft: "2px solid #F1F2F4",
                                paddingLeft: "12px",
                              }}
                            >
                              {comment.replies.map((reply) => (
                                <div
                                  key={reply.id}
                                  style={{ marginBottom: "8px" }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "6px",
                                      marginBottom: "2px",
                                    }}
                                  >
                                    <Avatar
                                      size="small"
                                      style={{ backgroundColor: "#0052CC" }}
                                    >
                                      {reply.author?.firstName?.charAt(0)}
                                    </Avatar>
                                    <Text
                                      style={{
                                        fontWeight: 600,
                                        fontSize: "11px",
                                        color: "#172B4D",
                                      }}
                                    >
                                      {reply.author
                                        ? `${reply.author.firstName} ${reply.author.lastName}`
                                        : "Unknown User"}
                                    </Text>
                                    <Text
                                      style={{
                                        fontSize: "10px",
                                        color: "#6B778C",
                                      }}
                                    >
                                      {dayjs(reply.createdAt).format(
                                        "MMM DD, HH:mm"
                                      )}
                                    </Text>
                                  </div>
                                  <div
                                    style={{
                                      fontSize: "11px",
                                      color: "#172B4D",
                                    }}
                                  >
                                    {renderCommentContent(reply.content)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  />
                )}
              </div>
            </Form>
          </Col>

          {/* Right Column - Task Properties */}
          <Col span={8}>
            <div
              style={{
                backgroundColor: "#F8F9FA",
                padding: "16px",
                borderRadius: "8px",
              }}
            >
              <Form
                form={form}
                layout="vertical"
                onValuesChange={(changedValues) => {
                  // Auto-save on field changes (with debounce in real implementation)
                  Object.keys(changedValues).forEach((key) => {
                    handleFieldUpdate(key, changedValues[key]);
                  });
                }}
              >
                <Form.Item
                  name="status"
                  label={
                    <span style={{ fontWeight: 600, color: "#172B4D" }}>
                      Status
                    </span>
                  }
                >
                  <Select loading={updateTaskLoading}>
                    <Option value="TODO">To Do</Option>
                    <Option value="IN_PROGRESS">In Progress</Option>
                    <Option value="REVISION">In Review</Option>
                    <Option value="COMPLETED">Done</Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  name="priority"
                  label={
                    <span style={{ fontWeight: 600, color: "#172B4D" }}>
                      Priority
                    </span>
                  }
                >
                  <Select loading={updateTaskLoading}>
                    <Option value="A">Highest</Option>
                    <Option value="B">High</Option>
                    <Option value="C">Medium</Option>
                    <Option value="D">Low</Option>
                    <Option value="E">Lowest</Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  name="assigneeId"
                  label={
                    <span style={{ fontWeight: 600, color: "#172B4D" }}>
                      Assignee
                    </span>
                  }
                >
                  <Select
                    placeholder="Unassigned"
                    allowClear
                    showSearch
                    value={form.getFieldValue("assigneeId")}
                    loading={updateTaskLoading}
                    filterOption={(input, option) =>
                      option.children
                        .toLowerCase()
                        .indexOf(input.toLowerCase()) >= 0
                    }
                    onChange={(value) => {
                      form.setFieldsValue({ assigneeId: value });
                    }}
                  >
                    {availableUsers.map((user) => (
                      <Option key={user.id} value={user.id}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <Avatar
                            size="small"
                            style={{ backgroundColor: "#0052CC" }}
                          >
                            {user.firstName?.charAt(0)}
                          </Avatar>
                          <span>
                            {user.firstName} {user.lastName}
                          </span>
                        </div>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  name="dueDate"
                  label={
                    <span style={{ fontWeight: 600, color: "#172B4D" }}>
                      Due Date
                    </span>
                  }
                >
                  <DatePicker
                    style={{ width: "100%" }}
                    showTime
                    disabled={updateTaskLoading}
                  />
                </Form.Item>

                {/* Notes Section */}
                <Divider style={{ margin: "12px 0" }} />

                <Form.Item
                  name="notes"
                  label={
                    <span style={{ fontWeight: 600, color: "#172B4D" }}>
                      Notes
                    </span>
                  }
                >
                  <TextArea
                    rows={2}
                    placeholder="Internal notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    onFocus={() => setNotesFocused(true)}
                    onBlur={() => setNotesFocused(false)}
                    disabled={updateTaskLoading}
                  />
                  <div
                    style={notesFocused ? updateBtnStyle : updateBtnHiddenStyle}
                  >
                    <Button
                      type="primary"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleFieldUpdate("notes", notes)}
                      disabled={updateTaskLoading}
                    >
                      Update
                    </Button>
                  </div>
                </Form.Item>

                <Form.Item
                  name="internalNotes"
                  label={
                    <span style={{ fontWeight: 600, color: "#172B4D" }}>
                      Internal Notes
                    </span>
                  }
                >
                  <TextArea
                    rows={3}
                    placeholder="Internal notes (not visible to client)..."
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    onFocus={() => setInternalNotesFocused(true)}
                    onBlur={() => setInternalNotesFocused(false)}
                    disabled={updateTaskLoading}
                  />
                  <div
                    style={
                      internalNotesFocused
                        ? updateBtnStyle
                        : updateBtnHiddenStyle
                    }
                  >
                    <Button
                      type="primary"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() =>
                        handleFieldUpdate("internalNotes", internalNotes)
                      }
                      disabled={updateTaskLoading}
                    >
                      Update
                    </Button>
                  </div>
                </Form.Item>

                {/* Project Info Section */}
                <Divider style={{ margin: "12px 0" }} />
                <div>
                  <Text
                    style={{
                      fontWeight: 600,
                      color: "#172B4D",
                      display: "block",
                      marginBottom: "8px",
                    }}
                  >
                    Project Info
                  </Text>

                  {task.taskType && (
                    <div style={{ marginBottom: "8px" }}>
                      <Text style={{ fontSize: "12px", color: "#6B778C" }}>
                        <strong>Task Type:</strong> {task.taskType.name}
                      </Text>
                    </div>
                  )}

                  {/* Duplicate grading and work type sections removed - now handled in Client & Project Details section above */}

                  {task.creator && (
                    <div style={{ marginBottom: "4px" }}>
                      <Text style={{ fontSize: "12px", color: "#6B778C" }}>
                        <strong>Created by:</strong> {task.creator.firstName}{" "}
                        {task.creator.lastName}
                      </Text>
                    </div>
                  )}

                  {task.createdAt && (
                    <div style={{ marginBottom: "4px" }}>
                      <Text style={{ fontSize: "12px", color: "#6B778C" }}>
                        <strong>Created:</strong>{" "}
                        {dayjs(task.createdAt).format("MMM DD, YYYY HH:mm")}
                      </Text>
                    </div>
                  )}
                </div>
              </Form>
            </div>
          </Col>
        </Row>
      </Modal>
    </>
  );
};

export default TaskCard;
