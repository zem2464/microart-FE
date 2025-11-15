import React, { useState } from "react";
import { message, Tag, Space, Tooltip, Typography } from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  DollarOutlined,
  TagsOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation } from "@apollo/client";
import { useReactiveVar } from "@apollo/client";
import { userCacheVar } from "../../cache/userCacheVar";
import { GET_GRADINGS, DELETE_GRADING } from "../../gql/gradings";
import { CommonTable, StatusTag, ActionColumn } from "../../components/common/CommonTable";
import { useAppDrawer } from "../../contexts/DrawerContext";
import { hasPermission, MODULES, generatePermission } from "../../config/permissions";
import { formatDate } from "../../utils/dateUtils";

const { Text } = Typography;

const Gradings = () => {
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const userData = useReactiveVar(userCacheVar);

  // Permission checks
  const canCreate = hasPermission(userData, generatePermission(MODULES.GRADINGS, 'create'));
  const canUpdate = hasPermission(userData, generatePermission(MODULES.GRADINGS, 'update'));
  const canDelete = hasPermission(userData, generatePermission(MODULES.GRADINGS, 'delete'));
  const canRead = hasPermission(userData, generatePermission(MODULES.GRADINGS, 'read'));

  // Color mapping for work types - each worktype gets a unique color
  const workTypeColors = {
    'Clipping Path': '#1890ff',      // blue
    'Background Removal': '#52c41a',  // green
    'Image Masking': '#722ed1',       // purple
    'Photo Retouching': '#fa8c16',    // orange
    'Ghost Mannequin': '#eb2f96',     // magenta
    'Color Correction': '#13c2c2',    // cyan
    'Shadow Creation': '#faad14',     // gold
    'Image Enhancement': '#f5222d',   // red
    'Product Photography': '#2f54eb', // geekblue
    'default': '#8c8c8c'              // gray for unknown types
  };

  // Function to get color for a work type
  const getWorkTypeColor = (workTypeName) => {
    return workTypeColors[workTypeName] || workTypeColors['default'];
  };

  // Drawer hooks
  const { showGradingFormDrawer, showGradingDetailDrawer } = useAppDrawer();

  // GraphQL queries and mutations
  const {
    data,
    loading: queryLoading,
    error: queryError,
    refetch,
  } = useQuery(GET_GRADINGS, {
    fetchPolicy: "cache-and-network",
    skip: !canRead,
    onError: (error) => {
      console.error('Gradings GraphQL Error:', error);
      message.error(`Failed to load gradings: ${error.message}`);
    }
  });

  const [deleteGrading] = useMutation(DELETE_GRADING, {
    refetchQueries: [{ query: GET_GRADINGS }],
    onCompleted: () => {
      message.success("Grading deleted successfully");
    },
    onError: (error) => {
      message.error(`Failed to delete grading: ${error.message}`);
    },
  });

  // Handle create
  const handleCreate = () => {
    if (!canCreate) {
      message.error("You don't have permission to create gradings");
      return;
    }
    showGradingFormDrawer(null, "create", () => {
      refetch();
    });
  };

  // Handle edit
  const handleEdit = (grading) => {
    if (!canUpdate) {
      message.error("You don't have permission to edit gradings");
      return;
    }
    showGradingFormDrawer(grading, "edit", () => {
      refetch();
    });
  };

  // Handle view details
  const handleViewDetails = (grading) => {
    showGradingDetailDrawer(grading);
  };

  // Handle delete
  const handleDelete = async (grading) => {
    if (!canDelete) {
      message.error("You don't have permission to delete gradings");
      return;
    }
    
    try {
      await deleteGrading({
        variables: { id: grading.id },
      });
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  // Filter data based on search
  const filteredData = data?.gradings?.filter((grading) =>
    grading.name?.toLowerCase().includes(searchValue.toLowerCase()) ||
    grading.description?.toLowerCase().includes(searchValue.toLowerCase()) ||
    grading.workType?.name?.toLowerCase().includes(searchValue.toLowerCase())
  ) || [];

  // Extract unique work types for filter
  const uniqueWorkTypes = [...new Set(
    (data?.gradings || [])
      .map(g => g.workType?.name)
      .filter(Boolean)
  )].sort();

  // Table columns
  const columns = [
    {
      title: "Grading Name",
      dataIndex: "name",
      key: "name",
      sorter: (a, b) => {
        const aName = a.shortCode ? `${a.shortCode} - ${a.name}` : a.name;
        const bName = b.shortCode ? `${b.shortCode} - ${b.name}` : b.name;
        return aName.localeCompare(bName);
      },
      render: (text, record) => {
        const displayName = record.shortCode ? `${record.shortCode} - ${text}` : text;
        return (
          <div>
            <Text strong className="block">
              {record.shortCode && (
                <span style={{ color: '#1890ff', fontWeight: 'bold' }}>
                  {record.shortCode} -{' '}
                </span>
              )}
              {text}
            </Text>
            {record.description && (
              <Text type="secondary" className="text-sm">
                {record.description.length > 60 
                  ? `${record.description.substring(0, 60)}...` 
                  : record.description
                }
              </Text>
            )}
          </div>
        );
      },
    },
    {
      title: "Work Type",
      dataIndex: "workType",
      key: "workType",
      sorter: (a, b) => {
        const aName = a.workType?.name || '';
        const bName = b.workType?.name || '';
        console.log('Sorting:', aName, 'vs', bName, '=', aName.localeCompare(bName));
        return aName.localeCompare(bName);
      },
      filters: uniqueWorkTypes.map(name => ({
        text: name,
        value: name
      })),
      filterSearch: true,
      onFilter: (value, record) => record.workType?.name === value,
      render: (workType, record) => {
        console.log('Rendering workType for', record.name, ':', workType);
        return workType ? (
          <Tag 
            color={getWorkTypeColor(workType.name)}
            style={{ 
              fontWeight: 500,
              fontSize: '13px',
              padding: '4px 12px',
              borderRadius: '4px'
            }}
          >
            {workType.name}
          </Tag>
        ) : (
          <Text type="secondary">No work type</Text>
        );
      },
    },
    {
      title: "Client Rate",
      dataIndex: "defaultRate",
      key: "defaultRate",
      sorter: (a, b) => (a.defaultRate || 0) - (b.defaultRate || 0),
      render: (defaultRate, record) => (
        <div>
          <div className="flex items-center space-x-1">
            <DollarOutlined className="text-blue-500 text-xs" />
            <Text className="text-base font-semibold" style={{ color: '#1890ff' }}>
              ₹{(defaultRate || 0).toFixed(2)}
            </Text>
          </div>
          <Text type="secondary" className="text-xs">
            per {record.unit || 'image'}
          </Text>
        </div>
      ),
    },
    {
      title: "Employee Cost & Profit",
      dataIndex: "taskTypes",
      key: "pricing",
      render: (taskTypes, record) => {
        if (!taskTypes || taskTypes.length === 0) {
          return (
            <div className="text-center">
              <ExclamationCircleOutlined className="text-orange-500 mr-1" />
              <Text type="secondary">No tasks</Text>
            </div>
          );
        }

        const activeTaskTypes = taskTypes.filter(tt => tt.gradingTask?.isActive);
        
        // Calculate total employee cost (INR only)
        const totalEmployeeCost = activeTaskTypes.reduce((sum, tt) => {
          if (tt.gradingTask?.currency === 'INR') {
            return sum + (tt.gradingTask?.employeeRate || 0);
          }
          return sum;
        }, 0);

        const clientRate = record.defaultRate || 0;
        const profitMargin = clientRate - totalEmployeeCost;
        const profitPercentage = clientRate > 0 ? (profitMargin / clientRate * 100) : 0;

        return (
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <TagsOutlined className="text-blue-500" />
              <Text className="text-xs">
                {activeTaskTypes.length} active tasks
              </Text>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Text type="secondary" className="text-xs">Employee Cost:</Text>
                <Text className="text-xs font-medium" style={{ color: '#faad14' }}>
                  ₹{totalEmployeeCost.toFixed(2)}
                </Text>
              </div>
              <div className="flex items-center justify-between">
                <Text type="secondary" className="text-xs">Profit:</Text>
                <Text 
                  className="text-xs font-semibold" 
                  style={{ color: profitMargin >= 0 ? '#52c41a' : '#ff4d4f' }}
                >
                  ₹{profitMargin.toFixed(2)} ({profitPercentage.toFixed(0)}%)
                </Text>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "isActive",
      key: "isActive",
      sorter: (a, b) => a.isActive - b.isActive,
      filters: [
        { text: "Active", value: true },
        { text: "Inactive", value: false },
      ],
      onFilter: (value, record) => record.isActive === value,
      render: (isActive) => (
        <StatusTag status={isActive ? "success" : "error"}>
          {isActive ? "Active" : "Inactive"}
        </StatusTag>
      ),
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
      render: (createdAt, record) => (
        <div>
          <div className="text-sm">{formatDate(createdAt)}</div>
          {record.creator && (
            <Text type="secondary" className="text-xs">
              by {record.creator.firstName} {record.creator.lastName}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_, record) => {
        const actions = [
          {
            key: "view",
            icon: <EyeOutlined />,
            tooltip: "View Details",
            onClick: () => handleViewDetails(record),
          },
        ];

        if (canUpdate) {
          actions.push({
            key: "edit",
            icon: <EditOutlined />,
            tooltip: "Edit",
            onClick: () => handleEdit(record),
          });
        }

        if (canDelete) {
          actions.push({
            key: "delete",
            icon: <DeleteOutlined />,
            tooltip: "Delete",
            danger: true,
            onClick: () => handleDelete(record),
          });
        }

        return <ActionColumn actions={actions} />;
      },
    },
  ];

  if (!canRead) {
    return (
      <div className="p-6">
        <div className="text-center">
          <ExclamationCircleOutlined className="text-red-500 text-4xl mb-4" />
          <Text type="secondary">You don't have permission to view gradings.</Text>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <CommonTable
        title="Gradings"
        description="Manage pricing packages for different work types and task configurations"
        dataSource={filteredData}
        columns={columns}
        loading={queryLoading || loading}
        error={queryError}
        searchable={true}
        searchValue={searchValue}
        onSearch={setSearchValue}
        searchPlaceholder="Search gradings..."
        onAdd={canCreate ? handleCreate : null}
        addButtonText="Add Grading"
        showAdd={canCreate}
        rowKey="id"
        scroll={{ x: 1200 }}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} of ${total} gradings`,
          pageSizeOptions: [10, 25, 50, 100],
        }}
        summary={(data) => {
          if (!data || data.length === 0) return null;
          
          const totalGradings = data.length;
          const activeGradings = data.filter(g => g.isActive).length;
          const totalTaskTypes = data.reduce((sum, g) => sum + (g.taskTypes?.length || 0), 0);
          
          return (
            <div className="bg-gray-50 p-3 border-t">
              <Space size="large">
                <Text>
                  <strong>{totalGradings}</strong> total gradings
                </Text>
                <Text>
                  <strong>{activeGradings}</strong> active
                </Text>
                <Text>
                  <strong>{totalTaskTypes}</strong> total task type configurations
                </Text>
              </Space>
            </div>
          );
        }}
      />
    </div>
  );
};

export default Gradings;