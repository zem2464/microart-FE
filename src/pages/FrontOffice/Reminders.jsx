import React, { useState } from "react";
import {
  Card,
  Row,
  Col,
  Button,
  List,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  DatePicker,
  Select,
  Checkbox,
  Typography,
  Empty,
  Spin,
  message,
  Tooltip,
  Badge,
} from "antd";
import {
  PlusOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  BellOutlined,
  UserOutlined,
  FlagOutlined,
  FlagFilled,
} from "@ant-design/icons";
import { Avatar } from "antd";
import { useQuery, useMutation } from "@apollo/client";
import dayjs from "dayjs";
import {
  GET_MY_REMINDERS,
  CREATE_REMINDER,
  UPDATE_REMINDER,
  DELETE_REMINDER,
  TOGGLE_REMINDER_COMPLETE,
  TOGGLE_REMINDER_FLAG,
  GET_TODAY_PENDING_REMINDERS_COUNT,
} from "../../gql/reminders";
import { GET_USERS } from "../../gql/users";
import { ME_QUERY } from "../../gql/me";

const { Title, Text } = Typography;
const { TextArea } = Input;

const Reminders = () => {
  const [showCompleted, setShowCompleted] = useState(false);
  const [filterMode, setFilterMode] = useState("myTasks"); // "myTasks" or "assignedByMe"
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [form] = Form.useForm();

  // Queries
  const { data, loading, refetch } = useQuery(GET_MY_REMINDERS, {
    variables: {
      completed: showCompleted,
      assignedByMeOnly: filterMode === "assignedByMe",
      createdByMe: false, // Deprecated, use assignedByMeOnly
    },
    fetchPolicy: "cache-and-network",
  });

  const { data: usersData } = useQuery(GET_USERS, {
    fetchPolicy: "cache-first",
  });

  const { data: meData } = useQuery(ME_QUERY, {
    fetchPolicy: "cache-first",
  });

  const currentUser = meData?.me;

  // Mutations
  const [createReminder, { loading: creating }] = useMutation(CREATE_REMINDER, {
    onCompleted: () => {
      message.success("Reminder created successfully");
      setIsModalOpen(false);
      form.resetFields();
      refetch();
    },
    onError: (error) => {
      message.error(error.message || "Failed to create reminder");
    },
    refetchQueries: [{ query: GET_TODAY_PENDING_REMINDERS_COUNT }],
  });

  const [updateReminder, { loading: updating }] = useMutation(UPDATE_REMINDER, {
    onCompleted: () => {
      message.success("Reminder updated successfully");
      setIsModalOpen(false);
      setEditingReminder(null);
      form.resetFields();
      refetch();
    },
    onError: (error) => {
      message.error(error.message || "Failed to update reminder");
    },
    refetchQueries: [{ query: GET_TODAY_PENDING_REMINDERS_COUNT }],
  });

  const [deleteReminder] = useMutation(DELETE_REMINDER, {
    onCompleted: () => {
      message.success("Reminder deleted");
      refetch();
    },
    onError: (error) => {
      message.error(error.message || "Failed to delete reminder");
    },
    refetchQueries: [{ query: GET_TODAY_PENDING_REMINDERS_COUNT }],
  });

  const [toggleComplete] = useMutation(TOGGLE_REMINDER_COMPLETE, {
    onCompleted: () => {
      refetch();
    },
    onError: (error) => {
      message.error(error.message || "Failed to update reminder");
    },
    refetchQueries: [{ query: GET_TODAY_PENDING_REMINDERS_COUNT }],
  });

  const [toggleFlag] = useMutation(TOGGLE_REMINDER_FLAG, {
    onCompleted: () => {
      refetch();
    },
    onError: (error) => {
      message.error(error.message || "Failed to update reminder");
    },
  });

  const reminders = data?.myReminders?.reminders || [];
  const users = usersData?.users || [];

  const handleCreateNew = () => {
    setEditingReminder(null);
    form.resetFields();
    form.setFieldsValue({
      dueDate: dayjs(),
    });
    setIsModalOpen(true);
  };

  const handleEdit = (reminder) => {
    setEditingReminder(reminder);
    form.setFieldsValue({
      title: reminder.title,
      description: reminder.description,
      dueDate: reminder.dueDate ? dayjs(reminder.dueDate) : null,
      priority: reminder.priority,
      assignedUserIds: reminder.assignedUsers.map((u) => u.id),
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    deleteReminder({ variables: { id } });
  };

  const handleToggleComplete = (id) => {
    toggleComplete({ variables: { id } });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const input = {
        title: values.title,
        description: values.description,
        dueDate: values.dueDate ? values.dueDate.toISOString() : null,
        priority: values.priority || "medium",
        assignedUserIds: values.assignedUserIds || [],
      };

      if (editingReminder) {
        await updateReminder({
          variables: {
            id: editingReminder.id,
            input,
          },
        });
      } else {
        await createReminder({
          variables: { input },
        });
      }
    } catch (error) {
      console.error("Form validation failed:", error);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "red";
      case "medium":
        return "orange";
      case "low":
        return "blue";
      default:
        return "default";
    }
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return dayjs(dueDate).isBefore(dayjs(), "day");
  };

  // Group reminders by date
  const groupRemindersByDate = (reminders) => {
    const today = dayjs().startOf("day");
    const tomorrow = dayjs().add(1, "day").startOf("day");
    const weekEnd = dayjs().endOf("week");

    const groups = {
      overdue: [],
      today: [],
      tomorrow: [],
      thisWeek: [],
      later: [],
      noDueDate: [],
    };

    reminders.forEach((reminder) => {
      // Use per-user completion status
      const myCompletion = reminder.myAssignment?.isCompleted || false;
      
      if (!reminder.dueDate) {
        groups.noDueDate.push(reminder);
      } else {
        const dueDate = dayjs(reminder.dueDate).startOf("day");
        // For completed reminders, don't categorize as overdue
        if (dueDate.isBefore(today) && !myCompletion && !showCompleted) {
          groups.overdue.push(reminder);
        } else if (dueDate.isSame(today, "day")) {
          groups.today.push(reminder);
        } else if (dueDate.isSame(tomorrow, "day")) {
          groups.tomorrow.push(reminder);
        } else if (dueDate.isBefore(weekEnd) || dueDate.isSame(weekEnd, "day")) {
          groups.thisWeek.push(reminder);
        } else if (dueDate.isBefore(today) && (myCompletion || showCompleted)) {
          // Past completed reminders go to "later" to group by date
          groups.later.push(reminder);
        } else {
          groups.later.push(reminder);
        }
      }
    });

    return groups;
  };

  const groupedReminders = groupRemindersByDate(reminders);

  const renderReminderItem = (reminder) => {
    // Determine user's own completion status
    const myCompletion = reminder.myAssignment?.isCompleted || false;
    // Check if all assigned users have completed
    const allCompleted = reminder.completed;
    
    // Calculate completion stats
    const totalAssigned = reminder.assignments?.length || 0;
    const totalCompleted = reminder.assignments?.filter(a => a.isCompleted).length || 0;
    const totalPending = totalAssigned - totalCompleted;
    
    return (
      <List.Item
        key={reminder.id}
        style={{
          background: myCompletion ? "#f5f5f5" : "#fff",
          borderRadius: 8,
          marginBottom: 6,
          padding: "10px 14px",
          border: "1px solid #f0f0f0",
        }}
        actions={[
          <Tooltip title={reminder.flagged ? "Unflag" : "Flag"}>
            <Button
              type="text"
              icon={
                reminder.flagged ? (
                  <FlagFilled style={{ color: "#ff4d4f" }} />
                ) : (
                  <FlagOutlined />
                )
              }
              onClick={() => toggleFlag({ variables: { id: reminder.id } })}
            />
          </Tooltip>,
          // Only show toggle if user is assigned
          ...(reminder.myAssignment ? [
            <Tooltip
              title={
                myCompletion
                  ? "Mark as incomplete"
                  : "Mark as complete"
              }
            >
              <Button
                type="text"
                icon={<CheckCircleOutlined />}
                onClick={() => handleToggleComplete(reminder.id)}
                style={{
                  color: myCompletion ? "#52c41a" : "#999",
                }}
              />
            </Tooltip>
          ] : []),
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(reminder)}
            />
          </Tooltip>,
          <Tooltip title="Delete">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(reminder.id)}
            />
          </Tooltip>,
        ]}
      >
        <List.Item.Meta
          title={
            <Space size={6}>
              <Text
                style={{
                  textDecoration: myCompletion
                    ? "line-through"
                    : "none",
                  fontSize: 15,
                  margin: 0,
                }}
              >
                {reminder.title}
              </Text>
              <Tag color={getPriorityColor(reminder.priority)} style={{ margin: 0 }}>
                {reminder.priority}
              </Tag>
              {reminder.dueDate && (
                <Tag
                  icon={<ClockCircleOutlined />}
                  color={
                    isOverdue(reminder.dueDate) && !myCompletion
                      ? "red"
                      : "default"
                  }
                  style={{ margin: 0 }}
                >
                  {dayjs(reminder.dueDate).format("MMM D, YYYY")}
                </Tag>
              )}
              {allCompleted && (
                <Tag color="success" icon={<CheckCircleOutlined />} style={{ margin: 0 }}>
                  All Completed
                </Tag>
              )}
              {totalAssigned > 0 && !allCompleted && (
                <Tag color={totalPending === 0 ? "success" : "warning"} style={{ margin: 0 }}>
                  {totalCompleted}/{totalAssigned} Done
                </Tag>
              )}
            </Space>
          }
          description={
            <Space direction="vertical" size={6}>
              {reminder.description && (
                <Text type="secondary" style={{ fontSize: "13px" }}>{reminder.description}</Text>
              )}
              {reminder.assignments && reminder.assignments.length > 0 && (
                <div style={{ marginTop: "2px" }}>
                  <Space direction="horizontal" size={8} style={{ width: "100%", flexWrap: "wrap", alignItems: "center" }}>
                    <Text type="secondary" style={{ fontSize: "11px", fontWeight: 600, whiteSpace: "nowrap" }}>
                      Assigned:
                    </Text>
                    {/* Compact Inline Status Display */}
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                      {reminder.assignments.map((assignment) => (
                        <Tooltip
                          key={assignment.userId}
                          title={`${assignment.user.firstName} ${assignment.user.lastName} ${assignment.isCompleted ? "✓ Completed" : "⏳ Pending"}`}
                          placement="top"
                        >
                          <div 
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "2px 8px",
                              borderRadius: "12px",
                              backgroundColor: assignment.isCompleted ? "#f6ffed" : "#e6f7ff",
                              border: `1px solid ${assignment.isCompleted ? "#b7eb8f" : "#91d5ff"}`,
                              cursor: "pointer",
                              fontSize: "11px",
                            }}
                          >
                            <Avatar
                              size={20}
                              style={{
                                backgroundColor: assignment.isCompleted ? "#52c41a" : "#1890ff",
                                fontWeight: "bold",
                                fontSize: "9px",
                              }}
                            >
                              {assignment.user.firstName.charAt(0).toUpperCase() + 
                               assignment.user.lastName.charAt(0).toUpperCase()}
                            </Avatar>
                            <span style={{ color: "#262626", fontWeight: 500 }}>
                              {assignment.user.firstName.split(" ")[0]}
                            </span>
                            <span style={{ color: assignment.isCompleted ? "#52c41a" : "#faad14", fontSize: "10px" }}>
                              {assignment.isCompleted ? "✓" : "⏳"}
                            </span>
                          </div>
                        </Tooltip>
                      ))}
                    </div>
                  </Space>
                </div>
              )}
            </Space>
          }
        />
      </List.Item>
    );
  };

  return (
    <div style={{ padding: "24px" }}>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card>
            <Space
              style={{
                width: "100%",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <Space direction="vertical" size="small">
                <Space>
                  <Title level={3} style={{ margin: 0 }}>
                    <BellOutlined /> My Reminders
                  </Title>
                  <Badge count={data?.myReminders?.total || 0} showZero />
                </Space>
                <Space>
                  <span style={{ fontSize: "12px", color: "#666" }}>Filter:</span>
                  <Button
                    size="small"
                    type={filterMode === "myTasks" ? "primary" : "default"}
                    onClick={() => setFilterMode("myTasks")}
                  >
                    My Tasks
                  </Button>
                  <Button
                    size="small"
                    type={filterMode === "assignedByMe" ? "primary" : "default"}
                    onClick={() => setFilterMode("assignedByMe")}
                  >
                    Assigned by Me
                  </Button>
                </Space>
              </Space>
              <Space>
                <Checkbox
                  checked={showCompleted}
                  onChange={(e) => setShowCompleted(e.target.checked)}
                >
                  Show Completed
                </Checkbox>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleCreateNew}
                >
                  New Reminder
                </Button>
              </Space>
            </Space>

            {loading ? (
              <div style={{ textAlign: "center", padding: "40px" }}>
                <Spin size="large" />
              </div>
            ) : reminders.length === 0 ? (
              <Empty
                description={
                  showCompleted
                    ? "No completed reminders"
                    : "No active reminders. Create one to get started!"
                }
                style={{ padding: "40px" }}
              />
            ) : (
              <div>
                {/* Overdue - only show when not viewing completed */}
                {!showCompleted && groupedReminders.overdue.length > 0 && (
                  <div style={{ marginBottom: "16px" }}>
                    <Title level={5} style={{ color: "#ff4d4f", marginBottom: "8px" }}>
                      Overdue ({groupedReminders.overdue.length})
                    </Title>
                    <List
                      dataSource={groupedReminders.overdue}
                      renderItem={(reminder) => renderReminderItem(reminder)}
                    />
                  </div>
                )}

                {/* Today */}
                {groupedReminders.today.length > 0 && (
                  <div style={{ marginBottom: "16px" }}>
                    <Title level={5} style={{ color: "#1890ff", marginBottom: "8px" }}>
                      Today ({groupedReminders.today.length})
                    </Title>
                    <List
                      dataSource={groupedReminders.today}
                      renderItem={(reminder) => renderReminderItem(reminder)}
                    />
                  </div>
                )}

                {/* Tomorrow */}
                {groupedReminders.tomorrow.length > 0 && (
                  <div style={{ marginBottom: "16px" }}>
                    <Title level={5} style={{ color: "#52c41a", marginBottom: "8px" }}>
                      Tomorrow ({groupedReminders.tomorrow.length})
                    </Title>
                    <List
                      dataSource={groupedReminders.tomorrow}
                      renderItem={(reminder) => renderReminderItem(reminder)}
                    />
                  </div>
                )}

                {/* This Week */}
                {groupedReminders.thisWeek.length > 0 && (
                  <div style={{ marginBottom: "16px" }}>
                    <Title level={5} style={{ marginBottom: "8px" }}>
                      This Week ({groupedReminders.thisWeek.length})
                    </Title>
                    <List
                      dataSource={groupedReminders.thisWeek}
                      renderItem={(reminder) => renderReminderItem(reminder)}
                    />
                  </div>
                )}

                {/* Later / Past */}
                {groupedReminders.later.length > 0 && (
                  <div style={{ marginBottom: "16px" }}>
                    <Title level={5} style={{ marginBottom: "8px" }}>
                      {showCompleted ? "Past" : "Later"} ({groupedReminders.later.length})
                    </Title>
                    <List
                      dataSource={groupedReminders.later}
                      renderItem={(reminder) => renderReminderItem(reminder)}
                    />
                  </div>
                )}

                {/* No Due Date */}
                {groupedReminders.noDueDate.length > 0 && (
                  <div style={{ marginBottom: "16px" }}>
                    <Title level={5} style={{ color: "#999", marginBottom: "8px" }}>
                      No Due Date ({groupedReminders.noDueDate.length})
                    </Title>
                    <List
                      dataSource={groupedReminders.noDueDate}
                      renderItem={(reminder) => renderReminderItem(reminder)}
                    />
                  </div>
                )}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        title={editingReminder ? "Edit Reminder" : "New Reminder"}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingReminder(null);
          form.resetFields();
        }}
        confirmLoading={creating || updating}
        width={600}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            label="Title"
            name="title"
            rules={[{ required: true, message: "Please enter a title" }]}
          >
            <Input placeholder="What needs to be done?" />
          </Form.Item>

          <Form.Item label="Description" name="description">
            <TextArea rows={3} placeholder="Add more details (optional)" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Due Date" name="dueDate">
                <DatePicker
                  style={{ width: "100%" }}
                  format="YYYY-MM-DD"
                  placeholder="Select due date"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Priority"
                name="priority"
                initialValue="medium"
              >
                <Select>
                  <Select.Option value="low">Low</Select.Option>
                  <Select.Option value="medium">Medium</Select.Option>
                  <Select.Option value="high">High</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Assign To"
            name="assignedUserIds"
          >
            <Select
              mode="multiple"
              placeholder="Select users to assign"
              showSearch
              filterOption={(input, option) =>
                String(option.children).toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {users.map((user) => (
                <Select.Option key={user.id} value={user.id}>
                  {user.id === currentUser?.id ? `ME (${user.firstName} ${user.lastName})` : `${user.firstName} ${user.lastName}`}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Reminders;
