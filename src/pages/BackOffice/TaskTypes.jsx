import React, { useState } from "react";
import { message, Popconfirm } from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation } from "@apollo/client";
import {
  GET_TASK_TYPES,
  UPDATE_TASK_TYPE,
  DELETE_TASK_TYPE,
} from "../../gql/taskTypes";
import {
  CommonTable,
  StatusTag,
  ActionColumn,
  ColorDisplay,
} from "../../components/common/CommonTable";
import { useAppDrawer } from "../../contexts/DrawerContext";

const EnhancedTaskTypes = () => {
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  // Drawer hooks
  const { showTaskTypeFormDrawer, showTaskTypeDetailDrawer } = useAppDrawer();

  // GraphQL queries and mutations
  const {
    data,
    loading: queryLoading,
    refetch,
  } = useQuery(GET_TASK_TYPES, {
    fetchPolicy: "cache-and-network",
  });

  const [updateTaskType] = useMutation(UPDATE_TASK_TYPE, {
    refetchQueries: [{ query: GET_TASK_TYPES }],
    onCompleted: () => {
      message.success("Task type updated successfully");
    },
    onError: (error) => {
      message.error(`Failed to update task type: ${error.message}`);
    },
  });

  const [deleteTaskType] = useMutation(DELETE_TASK_TYPE, {
    refetchQueries: [{ query: GET_TASK_TYPES }],
    onCompleted: () => {
      message.success("Task type deleted successfully");
    },
    onError: (error) => {
      message.error(`Failed to delete task type: ${error.message}`);
    },
  });

  // Handle create
  const handleCreate = () => {
    showTaskTypeFormDrawer(null, "create", () => {
      refetch();
    });
  };

  // Handle edit
  const handleEdit = (taskType) => {
    showTaskTypeFormDrawer(taskType, "edit", () => {
      refetch();
    });
  };

  // Handle view details
  const handleViewDetails = (taskType) => {
    showTaskTypeDetailDrawer(taskType);
  };

  // Handle delete
  const handleDelete = async (taskType) => {
    try {
      await deleteTaskType({
        variables: { id: taskType.id },
      });
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  // Handle toggle active status
  const handleToggleActive = async (taskType) => {
    setLoading(true);
    try {
      await updateTaskType({
        variables: {
          id: taskType.id,
          input: {
            isActive: !taskType.isActive,
          },
        },
      });
    } catch (error) {
      console.error("Toggle active error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter data based on search
  const filteredData = (data?.taskTypes || []).filter(
    (taskType) =>
      taskType.name.toLowerCase().includes(searchValue.toLowerCase()) ||
      (taskType.description &&
        taskType.description.toLowerCase().includes(searchValue.toLowerCase()))
  );

  // Table columns configuration
  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      sorter: true,
      render: (text, record) => (
        <div className="flex items-center space-x-3">
          {/* <span style={{ color: record.color, fontSize: "16px" }}>
            {record.icon}
          </span> */}
          <span className="font-medium">{text}</span>
        </div>
      ),
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      render: (text) =>
        text || <span className="text-gray-400 italic">No description</span>,
    },
    {
      title: "Color",
      dataIndex: "color",
      key: "color",
      width: 150,
      render: (color) => <ColorDisplay color={color} />,
    },
    {
      title: "Status",
      dataIndex: "isActive",
      key: "isActive",
      width: 120,
      filters: [
        { text: "Active", value: true },
        { text: "Inactive", value: false },
      ],
      onFilter: (value, record) => record.isActive === value,
      render: (isActive) => (
        <StatusTag
          status={isActive}
          activeText="Active"
          inactiveText="Inactive"
        />
      ),
    },
    {
      title: "Sort Order",
      dataIndex: "sortOrder",
      key: "sortOrder",
      width: 100,
      sorter: true,
      render: (sortOrder) => sortOrder || 0,
    },
    {
      title: "Actions",
      key: "actions",
      width: 150,
      render: (_, record) => (
        <ActionColumn
          record={record}
          loading={loading}
          actions={[
            {
              icon: <InfoCircleOutlined />,
              tooltip: "View Details",
              onClick: handleViewDetails,
            },
            {
              icon: <EditOutlined />,
              tooltip: "Edit",
              onClick: handleEdit,
            },
            {
              icon: record.isActive ? (
                <EyeInvisibleOutlined />
              ) : (
                <EyeOutlined />
              ),
              tooltip: record.isActive ? "Deactivate" : "Activate",
              onClick: handleToggleActive,
              loading: loading,
            },
            {
              icon: <DeleteOutlined />,
              tooltip: "Delete",
              danger: true,
              onClick: (taskType) => {
                // Custom confirmation for delete
                Popconfirm.confirm({
                  title: "Are you sure you want to delete this task type?",
                  content: `This will permanently delete "${taskType.name}".`,
                  okText: "Yes, Delete",
                  cancelText: "Cancel",
                  okType: "danger",
                  onOk: () => handleDelete(taskType),
                });
              },
            },
          ]}
        />
      ),
    },
  ];

  return (
    <CommonTable
      title="Task Types"
      subTitle="Manage your task types"
      // Data
      dataSource={filteredData}
      columns={columns}
      loading={queryLoading}
      // Actions
      onAdd={handleCreate}
      addButtonText="Add Task Type"
      onRefresh={() => refetch()}
      showRefresh={true}
      // Search
      searchable={true}
      searchPlaceholder="Search task types..."
      searchValue={searchValue}
      onSearch={setSearchValue}
      // Table configuration
      rowKey="id"
      size="middle"
      pagination={{
        pageSize: 10,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total, range) =>
          `${range[0]}-${range[1]} of ${total} task types`,
      }}
    />
  );
};

export default EnhancedTaskTypes;
