import React from "react";
import {
  Table,
  Card,
  Space,
  Button,
  Input,
  Tooltip,
  Tag,
  Typography,
  Popconfirm,
} from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  DownloadOutlined,
  SettingOutlined,
  FilterOutlined,
  PlusOutlined,
} from "@ant-design/icons";

const { Search } = Input;

// Enhanced Table Component
export const CommonTable = ({
  // Data props
  dataSource = [],
  columns = [],
  loading = false,

  // Title prop
  title,

  // Header props
  showHeader = true,

  // Action props
  onAdd,
  addButtonText = "Add New",
  addButtonIcon = <PlusOutlined />,
  onRefresh,
  onExport,
  showRefresh = true,
  showExport = false,

  // Search props
  searchable = true,
  searchPlaceholder = "Search...",
  onSearch,
  searchValue,

  // Filter props
  filterable = false,
  onFilter,
  filterOptions = [],

  // Table props
  pagination = true,
  rowSelection,
  scroll,
  size = "middle",
  bordered = false,

  // Styling
  className = "",
  cardProps = {},
  tableProps = {},

  // Custom components
  headerExtra,
  tableFooter,

  ...otherProps
}) => {
  // Default pagination configuration
  const defaultPagination = {
    pageSize: 10,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
    pageSizeOptions: ["10", "25", "50", "100"],
    ...(typeof pagination === "object" ? pagination : {}),
  };

  const finalPagination = pagination === true ? defaultPagination : pagination;

  // Enhanced columns with consistent styling
  const enhancedColumns = columns.map((col) => ({
    ...col,
    sorter:
      col.sorter !== false && col.dataIndex
        ? {
            compare: (a, b) => {
              const aVal = a[col.dataIndex];
              const bVal = b[col.dataIndex];
              if (typeof aVal === "string") return aVal.localeCompare(bVal);
              if (typeof aVal === "number") return aVal - bVal;
              return 0;
            },
            ...(typeof col.sorter === "object" ? col.sorter : {}),
          }
        : col.sorter,
    showSorterTooltip: col.showSorterTooltip !== false,
  }));

  return (
    <Card
      className={`enhanced-table-card card-shadow ${className}`}
      {...cardProps}
    >
      {/* Header Section */}
      {showHeader && (
        <div className="enhanced-table-header">
          {/* Combined Search and Actions Row */}
          <div className="flex justify-between items-center mb-6">
            {/* Left side - Search and Filters */}
            <div className="flex items-center space-x-4 flex-1">
              {/* Title Bar */}
              {title && (
                <div className="flex text-lg font-semibold text-gray-800">
                  {title}
                </div>
              )}
            </div>
            {/* Right side - Actions */}
            <div className="flex items-center space-x-3">
              {headerExtra}
              {/* Search */}
              {searchable && (
                <Search
                  placeholder={searchPlaceholder}
                  allowClear
                  onSearch={onSearch}
                  defaultValue={searchValue}
                  style={{ width: 300 }}
                  enterButton={<SearchOutlined />}
                />
              )}
              {/* Active Filters Display */}
              {filterable && filterOptions.length > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">Filters:</span>
                  {filterOptions.map((filter, index) => (
                    <Tag
                      key={index}
                      closable
                      onClose={() => filter.onRemove && filter.onRemove()}
                      color="blue"
                    >
                      {filter.label}: {filter.value}
                    </Tag>
                  ))}
                </div>
              )}
              {/* Table Settings */}
              <Tooltip title="Table settings">
                <Button
                  type="text"
                  icon={<SettingOutlined />}
                  onClick={() => {
                    /* Table settings modal */
                  }}
                />
              </Tooltip>
              {/* Filter Button */}
              {filterable && onFilter && (
                <Tooltip title="Filter options">
                  <Button
                    type="text"
                    icon={<FilterOutlined />}
                    onClick={onFilter}
                  />
                </Tooltip>
              )}
              {/* Refresh Button */}
              {showRefresh && onRefresh && (
                <Tooltip title="Refresh data">
                  <Button
                    type="text"
                    icon={<ReloadOutlined />}
                    onClick={() => onRefresh()}
                    loading={loading}
                  />
                </Tooltip>
              )}
              {/* Export Button */}
              {showExport && onExport && (
                <Tooltip title="Export data">
                  <Button
                    type="text"
                    icon={<DownloadOutlined />}
                    onClick={onExport}
                  />
                </Tooltip>
              )}
              {/* Add Button */}
              {onAdd && (
                <Button type="primary" icon={addButtonIcon} onClick={onAdd}>
                  {addButtonText}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Table */}
      <Table
        className="enhanced-table"
        dataSource={dataSource}
        columns={enhancedColumns}
        loading={loading}
        pagination={finalPagination}
        rowSelection={rowSelection}
        scroll={scroll}
        size={size}
        bordered={bordered}
        {...tableProps}
        {...otherProps}
      />
      {/* Footer */}
      {tableFooter && (
        <div className="enhanced-table-footer mt-4">{tableFooter}</div>
      )}
    </Card>
  );
};

// Status Tag Component for consistent status display
export const StatusTag = ({
  status,
  activeText = "Active",
  inactiveText = "Inactive",
  type = "status", // 'status', 'priority', 'custom'
}) => {
  const getStatusProps = () => {
    if (type === "priority") {
      switch (status?.toLowerCase()) {
        case "low":
          return { color: "default", className: "priority-low" };
        case "medium":
          return { color: "blue", className: "priority-medium" };
        case "high":
          return { color: "orange", className: "priority-high" };
        case "urgent":
          return { color: "red", className: "priority-urgent" };
        default:
          return { color: "default" };
      }
    }

    if (type === "status") {
      return status
        ? { color: "green", className: "status-active" }
        : { color: "red", className: "status-inactive" };
    }

    return { color: "default" };
  };

  const props = getStatusProps();
  const text =
    type === "status" ? (status ? activeText : inactiveText) : status;

  return <Tag {...props}>{text}</Tag>;
};

// Action Column Component for consistent action buttons
export const ActionColumn = ({ record, actions = [], loading = false }) => {
  return (
    <Space size="small">
      {actions.map((action, index) => {
        const button = (
          <Button
            type={action.type || "text"}
            icon={action.icon}
            onClick={() => !action.popconfirm && action.onClick && action.onClick(record)}
            loading={loading && action.loading}
            disabled={action.disabled}
            danger={action.danger}
            size="small"
          />
        );

        // If action has popconfirm, wrap button with Popconfirm
        if (action.popconfirm) {
          return (
            <Popconfirm
              key={index}
              title={action.popconfirm.title || "Are you sure?"}
              description={action.popconfirm.description}
              onConfirm={() => action.onClick && action.onClick(record)}
              okText={action.popconfirm.okText || "Yes"}
              cancelText={action.popconfirm.cancelText || "No"}
              okButtonProps={action.popconfirm.okButtonProps}
              {...(action.popconfirm.props || {})}
            >
              <Tooltip title={action.tooltip}>
                {button}
              </Tooltip>
            </Popconfirm>
          );
        }

        // Regular button with tooltip
        return (
          <Tooltip key={index} title={action.tooltip}>
            {button}
          </Tooltip>
        );
      })}
    </Space>
  );
};

// Color Display Component
export const ColorDisplay = ({ color, size = "default" }) => {
  const sizeClasses = {
    small: "w-4 h-4",
    default: "w-6 h-6",
    large: "w-8 h-8",
  };

  return (
    <div className="flex items-center space-x-2">
      <div
        className={`${sizeClasses[size]} rounded border border-gray-300 flex-shrink-0`}
        style={{ backgroundColor: color }}
      />
      <span className="font-mono text-sm">{color}</span>
    </div>
  );
};

// User Display Component
export const UserDisplay = ({ user, showEmail = false }) => {
  if (!user) return <span className="text-gray-400">Unknown</span>;

  return (
    <div>
      <div className="font-medium">
        {user.firstName} {user.lastName}
      </div>
      {showEmail && user.email && (
        <div className="text-sm text-gray-500">{user.email}</div>
      )}
    </div>
  );
};

// Date Display Component
export const DateDisplay = ({
  date,
  format = "smart", // 'smart', 'full', 'date', 'time'
  showRelative = false,
}) => {
  if (!date) return <span className="text-gray-400">N/A</span>;

  try {
    const dateObj = new Date(date);

    if (format === "smart") {
      const now = new Date();
      const diffMs = now - dateObj;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return <span>Today at {dateObj.toLocaleTimeString()}</span>;
      } else if (diffDays === 1) {
        return <span>Yesterday at {dateObj.toLocaleTimeString()}</span>;
      } else if (diffDays < 7) {
        return <span>{diffDays} days ago</span>;
      }
    }

    const displayDate =
      format === "full"
        ? dateObj.toLocaleString()
        : format === "date"
        ? dateObj.toLocaleDateString()
        : format === "time"
        ? dateObj.toLocaleTimeString()
        : dateObj.toLocaleDateString();

    return (
      <div>
        <div>{displayDate}</div>
        {showRelative && (
          <div className="text-xs text-gray-500">
            {formatRelativeTime(dateObj)}
          </div>
        )}
      </div>
    );
  } catch (error) {
    return <span className="text-red-400">Invalid Date</span>;
  }
};

// Helper function for relative time
const formatRelativeTime = (date) => {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

export default CommonTable;
