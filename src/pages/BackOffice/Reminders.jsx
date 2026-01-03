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
  GET_TODAY_PENDING_REMINDERS_COUNT,
} from "../../gql/reminders";
import { GET_USERS } from "../../gql/users";

const { Title, Text } = Typography;
const { TextArea } = Input;

const Reminders = () => {
  const [showCompleted, setShowCompleted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [form] = Form.useForm();

  // Queries
  const { data, loading, refetch } = useQuery(GET_MY_REMINDERS, {
    variables: {
      completed: showCompleted,
    },
    fetchPolicy: "cache-and-network",
  });

  const { data: usersData } = useQuery(GET_USERS, {
    fetchPolicy: "cache-first",
  });

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
              <Space>
                <Title level={3} style={{ margin: 0 }}>
                  <BellOutlined /> My Reminders
                </Title>
                <Badge count={reminders.length} showZero />
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
              <List
                dataSource={reminders}
                renderItem={(reminder) => (
                  <List.Item
                    key={reminder.id}
                    style={{
                      background: reminder.completed ? "#f5f5f5" : "#fff",
                      borderRadius: 8,
                      marginBottom: 8,
                      padding: "12px 16px",
                      border: "1px solid #f0f0f0",
                    }}
                    actions={[
                      <Tooltip
                        title={
                          reminder.completed
                            ? "Mark as incomplete"
                            : "Mark as complete"
                        }
                      >
                        <Button
                          type="text"
                          icon={<CheckCircleOutlined />}
                          onClick={() => handleToggleComplete(reminder.id)}
                          style={{
                            color: reminder.completed ? "#52c41a" : "#999",
                          }}
                        />
                      </Tooltip>,
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
                        <Space>
                          <Text
                            style={{
                              textDecoration: reminder.completed
                                ? "line-through"
                                : "none",
                              fontSize: 16,
                            }}
                          >
                            {reminder.title}
                          </Text>
                          <Tag color={getPriorityColor(reminder.priority)}>
                            {reminder.priority}
                          </Tag>
                          {reminder.dueDate && (
                            <Tag
                              icon={<ClockCircleOutlined />}
                              color={
                                isOverdue(reminder.dueDate) && !reminder.completed
                                  ? "red"
                                  : "default"
                              }
                            >
                              {dayjs(reminder.dueDate).format("MMM D, YYYY")}
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
                )}
              />
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
            rules={[
              { required: true, message: "Please assign to at least one user" },
            ]}
          >
            <Select
              mode="multiple"
              placeholder="Select users to assign"
              showSearch
              filterOption={(input, option) =>
                option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {users.map((user) => (
                <Select.Option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName}
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
