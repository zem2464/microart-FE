import React, { useState } from "react";
import { message, Tag, Space } from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  InfoCircleOutlined,
  TagsOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation } from "@apollo/client";
import { useReactiveVar } from "@apollo/client";
import { userCacheVar } from "../../cache/userCacheVar";
import { GET_WORK_TYPES, UPDATE_WORK_TYPE, DELETE_WORK_TYPE } from "../../gql/workTypes";
import { CommonTable, StatusTag, ActionColumn } from "../../components/common/CommonTable";
import { useAppDrawer } from "../../contexts/DrawerContext";
import { hasPermission, MODULES, generatePermission } from "../../config/permissions";

const WorkTypes = () => {
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const userData = useReactiveVar(userCacheVar);

  // Permission checks
  const canCreate = hasPermission(userData, generatePermission(MODULES.WORK_TYPES, 'create'));
  const canUpdate = hasPermission(userData, generatePermission(MODULES.WORK_TYPES, 'update'));
  const canDelete = hasPermission(userData, generatePermission(MODULES.WORK_TYPES, 'delete'));
  const canRead = hasPermission(userData, generatePermission(MODULES.WORK_TYPES, 'read'));

  // Drawer hooks
  const { showWorkTypeFormDrawer, showWorkTypeDetailDrawer } = useAppDrawer();

  // GraphQL queries and mutations
  const {
    data,
    loading: queryLoading,
    error: queryError,
    refetch,
  } = useQuery(GET_WORK_TYPES, {
    fetchPolicy: "cache-and-network",
    skip: !canRead,
    onError: (error) => {
      console.error('WorkTypes GraphQL Error:', error);
      message.error(`Failed to load work types: ${error.message}`);
    }
  });

  const [updateWorkType] = useMutation(UPDATE_WORK_TYPE, {
    refetchQueries: [{ query: GET_WORK_TYPES }],
    onCompleted: () => {
      message.success("Work type updated successfully");
    },
    onError: (error) => {
      message.error(`Failed to update work type: ${error.message}`);
    },
  });

  const [deleteWorkType] = useMutation(DELETE_WORK_TYPE, {
    refetchQueries: [{ query: GET_WORK_TYPES }],
    onCompleted: () => {
      message.success("Work type deleted successfully");
    },
    onError: (error) => {
      message.error(`Failed to delete work type: ${error.message}`);
    },
  });

  // Handle create
  const handleCreate = () => {
    if (!canCreate) {
      message.error("You don't have permission to create work types");
      return;
    }
    showWorkTypeFormDrawer(null, "create", () => {
      refetch();
    });
  };

  // Handle edit
  const handleEdit = (workType) => {
    if (!canUpdate) {
      message.error("You don't have permission to edit work types");
      return;
    }
    showWorkTypeFormDrawer(workType, "edit", () => {
      refetch();
    });
  };

  // Handle view details
  const handleViewDetails = (workType) => {
    showWorkTypeDetailDrawer(workType);
  };

  // Handle delete
  const handleDelete = async (workType) => {
    if (!canDelete) {
      message.error("You don't have permission to delete work types");
      return;
    }
    try {
      await deleteWorkType({
        variables: { id: workType.id },
      });
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  // Handle toggle active status
  const handleToggleActive = async (workType) => {
    if (!canUpdate) {
      message.error("You don't have permission to update work types");
      return;
    }
    setLoading(true);
    try {
      await updateWorkType({
        variables: {
          id: workType.id,
          input: {
            isActive: !workType.isActive,
          },
        },
      });
    } catch (error) {
      console.error("Toggle active error:", error);
    } finally {
      setLoading(false);
    }
  };

  // TEMPORARY: Show user data and permissions for debugging
  if (!userData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4">Loading user data...</p>
          <p className="text-xs text-gray-400 mt-2">Check console for detailed logs</p>
        </div>
      </div>
    );
  }

  // TEMPORARY: Always render for debugging - remove access checks
  console.log('🏠 WorkTypes Component Render State:', {
    userData,
    canRead,
    canCreate,
    canUpdate,
    canDelete,
    userRole: userData?.role?.name,
    userPermissions: userData?.role?.permissions
  });

  // Debug logging
  console.log('WorkTypes userData:', userData);
  console.log('WorkTypes data:', data);
  console.log('WorkTypes loading states:', { queryLoading, loading });
  console.log('WorkTypes user permissions:', { canCreate, canUpdate, canDelete, canRead });
  console.log('WorkTypes query skip condition:', !canRead);
  if (queryError) {
    console.log('WorkTypes query error:', queryError);
  }

  // Show loading state
  if (queryLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4">Loading work types...</p>
        </div>
      </div>
    );
  }

  // Filter data based on search
  const filteredData = (data?.workTypes || []).filter(
    (workType) =>
      workType.name.toLowerCase().includes(searchValue.toLowerCase()) ||
      (workType.description &&
        workType.description.toLowerCase().includes(searchValue.toLowerCase()))
  );

  console.log('Filtered data for table:', filteredData);

  // Show error state
  if (queryError) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h3 className="text-red-600">Error Loading Work Types</h3>
          <p className="text-gray-600 mt-2">{queryError.message}</p>
          <button 
            onClick={() => refetch()} 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show empty state if no data
  if (!data?.workTypes || data.workTypes.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h3>No Work Types Found</h3>
          <p className="text-gray-600 mt-2">
            {canCreate ? "Get started by creating your first work type." : "No work types are currently available."}
          </p>
          {canCreate && (
            <button 
              onClick={handleCreate}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Create Work Type
            </button>
          )}
        </div>
      </div>
    );
  }

  // Table columns configuration
  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      sorter: true,
      render: (text, record) => (
        <div className="flex items-center space-x-3">
          <TagsOutlined className="text-blue-500" />
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
      title: "Task Types",
      dataIndex: "taskTypes",
      key: "taskTypes",
      render: (taskTypes) => (
        <Space size={[0, 4]} wrap>
          {taskTypes?.slice(0, 3).map((taskType) => (
            <Tag 
              key={taskType.id} 
              color={taskType.color || 'default'}
              style={{ margin: '2px' }}
            >
              {taskType.name}
            </Tag>
          ))}
          {taskTypes?.length > 3 && (
            <Tag color="default">+{taskTypes.length - 3} more</Tag>
          )}
        </Space>
      ),
    },
    {
      title: "Status",
      dataIndex: "isActive",
      key: "isActive",
      width: 120,
      render: (isActive) => <StatusTag status={isActive} />,
    },
    {
      title: "Actions",
      key: "actions",
      width: 200,
      render: (_, record) => {
        const actions = [
          {
            key: "view",
            icon: <InfoCircleOutlined />,
            label: "View Details",
            onClick: () => handleViewDetails(record),
          },
        ];

        if (canUpdate) {
          actions.push(
            {
              key: "edit",
              icon: <EditOutlined />,
              label: "Edit",
              onClick: () => handleEdit(record),
            },
            {
              key: "toggle",
              icon: record.isActive ? <EyeInvisibleOutlined /> : <EyeOutlined />,
              label: record.isActive ? "Deactivate" : "Activate",
              onClick: () => handleToggleActive(record),
            }
          );
        }

        if (canDelete) {
          actions.push({
            key: "delete",
            icon: <DeleteOutlined />,
            label: "Delete",
            danger: true,
            popconfirm: {
              title: "Are you sure you want to delete this work type?",
              description: "This action cannot be undone.",
              onConfirm: () => handleDelete(record),
            },
          });
        }

        return <ActionColumn actions={actions} />;
      },
    },
  ];

  return (
    <CommonTable
      title="Work Types"
      subtitle="Manage service packages and their associated task types"
      dataSource={filteredData}
      columns={columns}
      loading={queryLoading || loading}
      onSearch={setSearchValue}
      searchPlaceholder="Search work types..."
      onAdd={canCreate ? handleCreate : null}
      addButtonText="Add Work Type"
      showExport={true}
      pagination={{
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total, range) =>
          `${range[0]}-${range[1]} of ${total} work types`,
      }}
    />
  );
};

export default WorkTypes;