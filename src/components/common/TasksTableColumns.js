/**
 * TasksTable Column Builders
 * 
 * Helper functions for generating common table columns used in both
 * the main TaskTable page and ProjectDetail drawer.
 */

import React from "react";
import { Typography, Tag, Space, Button, DatePicker, Select, Tooltip, Progress } from "antd";
import {
  ClockCircleOutlined,
  CloseCircleOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { TASK_STATUS, PRIORITY_COLORS } from "./TasksTable";

const { Text } = Typography;
const { Option } = Select;

/**
 * Generate base columns for the tasks table
 * These are the columns before the dynamic task type columns
 */
export const generateBaseColumns = ({
  showProjectCode = true,
  showClientInfo = true,
  showOrderDate = true,
  showGrading = true,
  showPriority = true,
  onProjectClick = null,
}) => {
  const columns = [];

  if (showProjectCode) {
    columns.push({
      title: "Project",
      dataIndex: "projectCode",
      key: "projectCode",
      width: 130,
      fixed: "left",
      render: (text, record) => (
        <div
          style={{ cursor: onProjectClick ? "pointer" : "default" }}
          onClick={(e) => {
            if (onProjectClick) {
              e.stopPropagation();
              onProjectClick(record.project);
            }
          }}
        >
          <Text
            strong
            style={{
              fontSize: 12,
              color: onProjectClick ? "#1890ff" : "inherit",
            }}
          >
            {text}
          </Text>
          {record.projectName && (
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {record.projectName}
              </Text>
            </div>
          )}
        </div>
      ),
    });
  }

  if (showClientInfo) {
    columns.push({
      title: "Client",
      key: "client",
      width: 150,
      render: (_, record) => {
        return (
          <div>
            <Text strong style={{ fontSize: 12 }}>
              {record.clientCode || "-"}
            </Text>
            {record.clientName && (
              <div>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {record.clientName}
                </Text>
              </div>
            )}
          </div>
        );
      },
    });
  }

  if (showOrderDate) {
    columns.push({
      title: "Order Date",
      dataIndex: "orderDate",
      key: "orderDate",
      width: 100,
      render: (date) => (date ? dayjs(date).format("DD-MM-YY") : "-"),
    });
  }

  // Grading / Qty column - always visible unless explicitly hidden
  if (showGrading) {
    columns.push({
      title: "Grading / Qty",
      dataIndex: "gradingShortCode",
      key: "grading",
      width: 150,
      render: (_, record) => (
        <div style={{ fontSize: 12 }}>
          <div style={{ fontWeight: 600 }}>
            {record.gradingShortCode || record.shortCode || record.gradingName || "-"}
          </div>
          <Text type="secondary" style={{ fontSize: 11 }}>
            ({record.imageQuantity || 0})
          </Text>
        </div>
      ),
    });
  }

  if (showPriority) {
    columns.push({
      title: "Priority",
      dataIndex: "priority",
      key: "priority",
      width: 90,
      render: (priority) => {
        if (!priority) return <Text type="secondary">-</Text>;
        return (
          <Tag color={PRIORITY_COLORS[priority] || "default"}>
            {priority}
          </Tag>
        );
      },
    });
  }

  return columns;
};

/**
 * Generate action columns (Due Date, etc.)
 * These columns appear after the dynamic task type columns
 */
export const generateActionColumns = ({
  isEditingCell,
  startEditCell,
  saveTaskCell,
  cancelEditCell,
  editedData,
  setEditedData,
  isInlineUpdating = false,
}) => {
  return [
    {
      title: "Due Date",
      dataIndex: "dueDate",
      key: "dueDate",
      width: 120,
      render: (date, record) => {
        // Note: Due date is typically at project level, not per grading
        // We need to handle editing differently here
        const isEditing = isEditingCell(
          record.projectId,
          record.gradingId,
          "dueDate",
          "dueDate"
        );

        if (isEditing) {
          return (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ padding: "4px 0" }}
            >
              <Space direction="vertical" size={4} style={{ width: "100%" }}>
                <DatePicker
                  size="small"
                  value={editedData.dueDate ? dayjs(editedData.dueDate) : null}
                  onChange={(date) =>
                    setEditedData({ ...editedData, dueDate: date })
                  }
                  style={{ width: "100%" }}
                  format="MMM D, YYYY"
                />
                <Space size="small">
                  <Button
                    type="primary"
                    size="small"
                    icon={<SaveOutlined />}
                    onClick={() => {
                      // Save due date for the first task in this grading/project combo
                      const firstTask = Object.values(record.tasksByType || {})[0];
                      if (firstTask) {
                        saveTaskCell(firstTask, "dueDate");
                      }
                    }}
                    loading={isInlineUpdating}
                  >
                    Save
                  </Button>
                  <Button
                    size="small"
                    icon={<CloseCircleOutlined />}
                    onClick={cancelEditCell}
                  >
                    Cancel
                  </Button>
                </Space>
              </Space>
            </div>
          );
        }

        return (
          <div
            onClick={(e) => {
              e.stopPropagation();
              startEditCell(
                record.projectId,
                record.gradingId,
                "dueDate",
                "dueDate",
                date,
                e
              );
            }}
            style={{ cursor: "pointer" }}
          >
            <Tooltip title="Click to edit due date">
              {date ? (
                <span>
                  {dayjs(date).format("DD-MM-YY")}
                  {dayjs(date).isBefore(dayjs(), "day") && (
                    <Tag color="red" style={{ marginLeft: 4 }}>
                      Overdue
                    </Tag>
                  )}
                </span>
              ) : (
                <Text type="secondary">Set date</Text>
              )}
            </Tooltip>
          </div>
        );
      },
    },
  ];
};

/**
 * Generate progress column
 */
export const generateProgressColumn = () => ({
  title: "Progress",
  key: "progress",
  width: 120,
  render: (_, record) => {
    const progress = record.progress || 0;
    return (
      <div style={{ padding: "4px 0" }}>
        <Progress
          percent={progress}
          size="small"
          status={progress === 100 ? "success" : "active"}
          strokeColor={progress === 100 ? "#52c41a" : "#1890ff"}
        />
        <Text type="secondary" style={{ fontSize: 10 }}>
          {record.completedTasks || 0} / {record.totalTasks || 0} tasks
        </Text>
      </div>
    );
  },
});
