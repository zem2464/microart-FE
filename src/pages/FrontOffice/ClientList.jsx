import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  Card,
  Button,
  Space,
  Tag,
  Avatar,
  Typography,
  Row,
  Col,
  Statistic,
  message,
  Modal,
  InputNumber,
  Switch,
  Tooltip,
  Input,
  Select,
  Checkbox,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  ExclamationCircleOutlined,
  CheckOutlined,
  CloseOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useReactiveVar } from "@apollo/client";
import {
  GET_CLIENTS,
  GET_CLIENT_STATS,
  DELETE_CLIENT,
  UPDATE_CLIENT,
} from "../../gql/clients";
import { GET_SERVICE_PROVIDERS, GET_USERS } from "../../gql/users";
import CommonTable from "../../components/common/CommonTable";
import { useAppDrawer } from "../../contexts/DrawerContext";
import { userCacheVar } from "../../cache/userCacheVar";
import {
  getMyClientsFilterFromCookie,
  saveMyClientsFilterToCookie,
} from "../../utils/myClientsFilterUtils";

const { Title, Text } = Typography;
const { Option } = Select;

const ClientList = () => {
  const currentUser = useReactiveVar(userCacheVar);
  const [myClientsOnly, setMyClientsOnly] = useState(
    getMyClientsFilterFromCookie(currentUser?.isServiceProvider === true)
  );
  const [filters, setFilters] = useState({
    search: "",
    clientType: undefined,
    priority: undefined,
    isActive: undefined,
    serviceProviderIds: [],
    leaderIds: [],
  });
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [sorter, setSorter] = useState({ field: "createdAt", order: "DESC" });
  const [editingCredit, setEditingCredit] = useState({}); // Track which credit limits are being edited
  const [editingStatus, setEditingStatus] = useState({}); // Track which statuses are being edited
  const [tempValues, setTempValues] = useState({}); // Store temporary edit values
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    record: null,
  });
  const { showClientFormDrawer, showClientDetailDrawer } = useAppDrawer();

  const { data: serviceProvidersData } = useQuery(GET_SERVICE_PROVIDERS);
  const serviceProviders = serviceProvidersData?.serviceProviders || [];
  const { data: allUsersData } = useQuery(GET_USERS);
  const allUsers = allUsersData?.users || [];

  const { data, loading, error, refetch, fetchMore } = useQuery(GET_CLIENTS, {
    variables: {
      filters,
      page: 1,
      limit: pageSize,
      sortBy: sorter.field,
      sortOrder: sorter.order,
    },
    fetchPolicy: "cache-first",
  });

  // Fetch server-side stats for accurate counts
  const { data: statsData, loading: statsLoading } = useQuery(
    GET_CLIENT_STATS,
    {
      variables: {
        filters: filters,
      },
      fetchPolicy: "cache-and-network",
    }
  );

  const [deleteClient] = useMutation(DELETE_CLIENT, {
    onCompleted: () => {
      message.success("Client deleted successfully");
      // Refetch all pages up to current page to maintain scroll position
      const currentPage = page;
      refetch({
        filters,
        page: 1,
        limit: pageSize * currentPage,
        sortBy: sorter.field,
        sortOrder: sorter.order,
      });
    },
    onError: (error) => {
      message.error(`Failed to delete client: ${error.message}`);
    },
  });

  const [updateClient] = useMutation(UPDATE_CLIENT, {
    onCompleted: () => {
      message.success("Client updated successfully");
      // Refetch all pages up to current page to maintain scroll position
      const currentPage = page;
      refetch({
        filters,
        page: 1,
        limit: pageSize * currentPage,
        sortBy: sorter.field,
        sortOrder: sorter.order,
      });
    },
    onError: (error) => {
      message.error(`Failed to update client: ${error.message}`);
    },
  });

  const clients = data?.clients || [];
  const totalCount = data?.clientsCount || 0;

  // Default "My Clients" filter for service providers
  useEffect(() => {
    if (currentUser?.isServiceProvider === true) {
      setMyClientsOnly(true);
    }
  }, [currentUser]);

  // Update filters when myClientsOnly changes
  useEffect(() => {
    if (
      currentUser?.isServiceProvider === true &&
      myClientsOnly &&
      currentUser?.id
    ) {
      setFilters((prev) => ({ ...prev, serviceProviderId: currentUser.id }));
    } else {
      setFilters((prev) => {
        const { serviceProviderId, ...rest } = prev;
        return rest;
      });
    }
    // Save filter state to cookie whenever it changes
    saveMyClientsFilterToCookie(myClientsOnly);
  }, [myClientsOnly, currentUser?.id, currentUser?.isServiceProvider]);

  // Refetch when filters or sorter change
  React.useEffect(() => {
    setPage(1); // Reset to first page when filters change
    refetch({
      filters,
      page: 1,
      limit: pageSize,
      sortBy: sorter.field,
      sortOrder: sorter.order,
    });
  }, [filters, sorter, pageSize, refetch]);

  // Check if there are more items to load
  React.useEffect(() => {
    const totalPages = Math.ceil(totalCount / pageSize);
    setHasMore(page < totalPages);
  }, [totalCount, pageSize, page]);

  // Load more data for infinite scroll
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || loading) return;

    setIsLoadingMore(true);
    try {
      await fetchMore({
        variables: {
          filters,
          page: page + 1,
          limit: pageSize,
          sortBy: sorter.field,
          sortOrder: sorter.order,
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev;

          const prevClients = prev?.clients || [];
          const newClients = fetchMoreResult?.clients || [];

          return {
            ...fetchMoreResult,
            clients: [...prevClients, ...newClients],
            clientsCount: fetchMoreResult.clientsCount,
          };
        },
      });
      setPage(page + 1);
    } catch (error) {
      console.error("Error loading more clients:", error);
      message.error("Failed to load more clients");
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    isLoadingMore,
    hasMore,
    loading,
    fetchMore,
    page,
    filters,
    pageSize,
    sorter,
  ]);

  // Handle scroll event for infinite scroll (window-level)
  const handleScroll = useCallback(() => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = window.innerHeight;
    // Trigger load more when scrolled to 80% of the content
    if (scrollHeight - scrollTop <= clientHeight * 1.2) {
      loadMore();
    }
  }, [loadMore]);

  // Attach window scroll listener
  React.useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Use backend-filtered data directly
  const filteredClients = clients;

  // Client type colors - memoized
  const getClientTypeColor = useCallback((type) => {
    const colors = {
      permanent: "blue",
      walkIn: "green",
    };
    return colors[type] || "default";
  }, []);

  // Action handlers - memoized to prevent re-renders (defined before columns to avoid TDZ)
  const handleAddClient = useCallback(() => {
    showClientFormDrawer(null, "create", refetch);
  }, [showClientFormDrawer, refetch]);

  const handleEditClient = useCallback(
    (client) => {
      showClientFormDrawer(client, "edit", refetch);
    },
    [showClientFormDrawer, refetch]
  );

  const handleViewClient = useCallback(
    (client) => {
      showClientDetailDrawer(client);
    },
    [showClientDetailDrawer]
  );

  const handleDeleteClient = useCallback(
    (client) => {
      Modal.confirm({
        title: "Delete Client",
        content: `Are you sure you want to delete ${client.companyName ||
          client.displayName ||
          `${client.firstName} ${client.lastName}`
          }?`,
        icon: <ExclamationCircleOutlined />,
        okText: "Yes, Delete",
        okType: "danger",
        onOk: () => {
          deleteClient({ variables: { id: client.id } });
        },
      });
    },
    [deleteClient]
  );

  // Inline editing handlers
  const handleEditCredit = useCallback((clientId, currentValue) => {
    setEditingCredit((prev) => ({ ...prev, [clientId]: true }));
    setTempValues((prev) => ({
      ...prev,
      [`credit_${clientId}`]: currentValue || 0,
    }));
  }, []);

  const handleCancelCreditEdit = useCallback((clientId) => {
    setEditingCredit((prev) => ({ ...prev, [clientId]: false }));
    setTempValues((prev) => {
      const newValues = { ...prev };
      delete newValues[`credit_${clientId}`];
      return newValues;
    });
  }, []);

  const handleSaveCreditEdit = useCallback(
    async (clientId) => {
      const newValue = tempValues[`credit_${clientId}`];
      if (newValue < 0) {
        message.error("Credit limit cannot be negative");
        return;
      }

      try {
        await updateClient({
          variables: {
            id: clientId,
            input: {
              creditAmountLimit: parseFloat(newValue || 0),
            },
          },
        });
        setEditingCredit((prev) => ({ ...prev, [clientId]: false }));
        setTempValues((prev) => {
          const newValues = { ...prev };
          delete newValues[`credit_${clientId}`];
          return newValues;
        });
      } catch (error) {
        message.error("Failed to update credit limit");
      }
    },
    [tempValues, updateClient]
  );

  const handleEditStatus = useCallback((clientId, currentValue) => {
    setEditingStatus((prev) => ({ ...prev, [clientId]: true }));
    setTempValues((prev) => ({
      ...prev,
      [`status_${clientId}`]: currentValue,
    }));
  }, []);

  const handleCancelStatusEdit = useCallback((clientId) => {
    setEditingStatus((prev) => ({ ...prev, [clientId]: false }));
    setTempValues((prev) => {
      const newValues = { ...prev };
      delete newValues[`status_${clientId}`];
      return newValues;
    });
  }, []);

  const handleSaveStatusEdit = useCallback(
    async (clientId) => {
      const newValue = tempValues[`status_${clientId}`];

      try {
        await updateClient({
          variables: {
            id: clientId,
            input: {
              isActive: newValue,
            },
          },
        });
        setEditingStatus((prev) => ({ ...prev, [clientId]: false }));
        setTempValues((prev) => {
          const newValues = { ...prev };
          delete newValues[`status_${clientId}`];
          return newValues;
        });
      } catch (error) {
        message.error("Failed to update client status");
      }
    },
    [tempValues, updateClient]
  );

  // Context menu handlers
  const handleRowRightClick = useCallback((event, record) => {
    console.log("Right click detected", record); // Debug log
    event.preventDefault();
    event.stopPropagation();

    // Calculate position to ensure menu stays within viewport
    const menuWidth = 160;
    const menuHeight = 120;
    let x = event.clientX;
    let y = event.clientY;

    // Adjust position if menu would go off screen
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10;
    }
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 10;
    }

    setContextMenu({
      visible: true,
      x: x,
      y: y,
      record: record,
    });
  }, []);

  const handleContextMenuClose = useCallback(() => {
    console.log("Context menu closing"); // Debug log
    setContextMenu({ visible: false, x: 0, y: 0, record: null });
  }, []);

  const handleContextMenuAction = useCallback(
    (action, record) => {
      console.log("Context menu action:", action, record); // Debug log
      handleContextMenuClose();

      switch (action) {
        case "view":
          handleViewClient(record);
          break;
        case "edit":
          handleEditClient(record);
          break;
        case "delete":
          handleDeleteClient(record);
          break;
        default:
          break;
      }
    },
    [
      handleViewClient,
      handleEditClient,
      handleDeleteClient,
      handleContextMenuClose,
    ]
  );

  // Close context menu when clicking elsewhere
  React.useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.visible) {
        handleContextMenuClose();
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [contextMenu.visible, handleContextMenuClose]);

  // Table columns configuration - memoized to prevent re-renders
  const columns = useMemo(
    () => [
      {
        title: "Client",
        dataIndex: "companyName",
        key: "client",
        width: 250,
        render: (text, record) => (
          <div className="flex items-center space-x-3">
            <Avatar src={record.logo} icon={<UserOutlined />} size="default" />
            <div>
              <div className="font-medium text-gray-900">
                {record.companyName || record.displayName}
              </div>
              <div className="text-sm text-gray-500">{record.clientCode}</div>
              {record.displayName && record.companyName && (
                <div className="text-xs text-gray-400">
                  Contact: {record.displayName}
                </div>
              )}
            </div>
          </div>
        ),
        sorter: true,
      },
      {
        title: "Type",
        dataIndex: "clientType",
        key: "clientType",
        width: 120,
        render: (type) => (
          <Tag color={getClientTypeColor(type)}>
            {type === "permanent"
              ? "PERMANENT"
              : type === "walkIn"
                ? "WALK-IN"
                : type?.toUpperCase()}
          </Tag>
        ),
        filters: [
          { text: "Permanent Client", value: "permanent" },
          { text: "Walk-in Client", value: "walkIn" },
        ],
        filterMultiple: false,
        onFilter: (value, record) => {
          console.log(
            "Filter applied:",
            value,
            "Record type:",
            record.clientType
          ); // Debug log
          return record.clientType === value;
        },
        sorter: (a, b) =>
          (a.clientType || "").localeCompare(b.clientType || ""),
      },
      {
        title: "Contact Info",
        key: "contact",
        width: 200,
        render: (_, record) => (
          <div className="space-y-1">
            {record.email && (
              <div className="flex items-center text-sm text-gray-600">
                <MailOutlined className="mr-2" />
                <span className="truncate" title={record.email}>
                  {record.email}
                </span>
              </div>
            )}
            {(record.contactNoWork || record.contactNoPersonal) && (
              <div className="flex items-center text-sm text-gray-600">
                <PhoneOutlined className="mr-2" />
                {record.contactNoWork || record.contactNoPersonal}
              </div>
            )}
          </div>
        ),
        sorter: (a, b) => (a.email || "").localeCompare(b.email || ""),
      },
      {
        title: "Location",
        key: "location",
        width: 150,
        render: (_, record) => (
          <div className="flex items-center text-sm text-gray-600">
            <EnvironmentOutlined className="mr-2" />
            <div>
              {record.city?.name && <div>{record.city.name}</div>}
              {record.state?.name && (
                <div className="text-xs text-gray-400">{record.state.name}</div>
              )}
              {record.country?.name && !record.state && !record.city && (
                <div className="text-xs text-gray-400">
                  {record.country.name}
                </div>
              )}
            </div>
          </div>
        ),
        sorter: (a, b) => {
          const aLoc = a.city?.name || a.state?.name || a.country?.name || "";
          const bLoc = b.city?.name || b.state?.name || b.country?.name || "";
          return aLoc.localeCompare(bLoc);
        },
      },
      {
        title: "Credit Limit",
        dataIndex: "creditAmountLimit",
        key: "creditLimit",
        width: 180,
        render: (creditLimit, record) => {
          const limit = parseFloat(creditLimit || 0);
          const currentBalance = parseFloat(record.totalBalance || 0);
          const available = limit + currentBalance;
          const isEditing = editingCredit[record.id];
          const tempValue = tempValues[`credit_${record.id}`];

          if (isEditing) {
            return (
              <div className="text-right">
                <div className="flex items-center justify-end space-x-1">
                  <InputNumber
                    size="small"
                    value={tempValue}
                    onChange={(value) =>
                      setTempValues((prev) => ({
                        ...prev,
                        [`credit_${record.id}`]: value,
                      }))
                    }
                    min={0}
                    precision={2}
                    style={{ width: 100 }}
                    prefix="₹"
                  />
                  <Tooltip title="Save">
                    <Button
                      type="text"
                      size="small"
                      icon={<CheckOutlined />}
                      onClick={() => handleSaveCreditEdit(record.id)}
                      style={{ color: "#52c41a" }}
                    />
                  </Tooltip>
                  <Tooltip title="Cancel">
                    <Button
                      type="text"
                      size="small"
                      icon={<CloseOutlined />}
                      onClick={() => handleCancelCreditEdit(record.id)}
                      style={{ color: "#ff4d4f" }}
                    />
                  </Tooltip>
                </div>
              </div>
            );
          }

          return (
            <div className="text-right group">
              <div
                className="font-medium text-gray-900 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded flex items-center justify-end"
                onClick={() => handleEditCredit(record.id, limit)}
                title="Click to edit credit limit"
              >
                ₹
                {limit.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                <EditOutlined className="ml-1 opacity-0 group-hover:opacity-100 text-xs" />
              </div>
              <div className="text-xs text-gray-500">Limit</div>
              {limit > 0 && (
                <div
                  className={`text-xs ${available >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                >
                  ₹
                  {Math.abs(available).toLocaleString("en-IN", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}{" "}
                  {available >= 0 ? "available" : "over limit"}
                </div>
              )}
            </div>
          );
        },
        sorter: (a, b) =>
          parseFloat(a.creditAmountLimit || 0) -
          parseFloat(b.creditAmountLimit || 0),
        filters: [
          { text: "Has Credit Limit", value: "hasLimit" },
          { text: "No Credit Limit", value: "noLimit" },
          { text: "Over Limit", value: "overLimit" },
        ],
        filterMultiple: true,
        onFilter: (value, record) => {
          const limit = parseFloat(record.creditAmountLimit || 0);
          const currentBalance = parseFloat(record.totalBalance || 0);
          const available = limit + currentBalance;

          if (value === "hasLimit") return limit > 0;
          if (value === "noLimit") return limit === 0;
          if (value === "overLimit") return limit > 0 && available < 0;
          return false;
        },
      },
      {
        title: "Priority",
        dataIndex: "priority",
        key: "priority",
        width: 100,
        render: (priority) => {
          const getPriorityConfig = (prio) => {
            const upperPrio = prio?.toUpperCase();
            switch (upperPrio) {
              case "A":
              case "HIGH":
                return { color: "red", text: "A", label: "High Priority" };
              case "B":
              case "MEDIUM":
                return { color: "orange", text: "B", label: "Medium Priority" };
              case "C":
              case "LOW":
                return { color: "green", text: "C", label: "Low Priority" };
              default:
                return {
                  color: "default",
                  text: prio || "-",
                  label: "Unknown",
                };
            }
          };

          const config = getPriorityConfig(priority);

          return priority ? (
            <Tag
              color={config.color}
              title={config.label}
              style={{
                fontWeight: "bold",
                minWidth: "24px",
                textAlign: "center",
              }}
            >
              {config.text}
            </Tag>
          ) : (
            "-"
          );
        },
        filters: [
          { text: "High Priority (A)", value: "A" },
          { text: "Medium Priority (B)", value: "B" },
          { text: "Low Priority (C)", value: "C" },
        ],
        filterMultiple: false,
        onFilter: (value, record) => {
          const recordPriority = record.priority?.toUpperCase();
          const filterValue = value?.toUpperCase();

          // Handle both old format (HIGH/MEDIUM/LOW) and new format (A/B/C)
          if (filterValue === "HIGH" || filterValue === "A") {
            return recordPriority === "HIGH" || recordPriority === "A";
          }
          if (filterValue === "MEDIUM" || filterValue === "B") {
            return recordPriority === "MEDIUM" || recordPriority === "B";
          }
          if (filterValue === "LOW" || filterValue === "C") {
            return recordPriority === "LOW" || recordPriority === "C";
          }
          return record.priority === value;
        },
        sorter: (a, b) => {
          const getPriorityValue = (prio) => {
            const upperPrio = prio?.toUpperCase();
            switch (upperPrio) {
              case "A":
              case "HIGH":
                return 3;
              case "B":
              case "MEDIUM":
                return 2;
              case "C":
              case "LOW":
                return 1;
              default:
                return 0;
            }
          };

          return getPriorityValue(a.priority) - getPriorityValue(b.priority);
        },
      },
      {
        title: "Status",
        dataIndex: "isActive",
        key: "isActive",
        width: 130,
        render: (isActive, record) => {
          const isEditing = editingStatus[record.id];
          const tempValue = tempValues[`status_${record.id}`];

          if (isEditing) {
            return (
              <div className="flex items-center space-x-2">
                <Switch
                  checked={tempValue}
                  onChange={(checked) =>
                    setTempValues((prev) => ({
                      ...prev,
                      [`status_${record.id}`]: checked,
                    }))
                  }
                  size="small"
                  checkedChildren="Active"
                  unCheckedChildren="Inactive"
                />
                <div className="flex space-x-1">
                  <Tooltip title="Save">
                    <Button
                      type="text"
                      size="small"
                      icon={<CheckOutlined />}
                      onClick={() => handleSaveStatusEdit(record.id)}
                      style={{ color: "#52c41a" }}
                    />
                  </Tooltip>
                  <Tooltip title="Cancel">
                    <Button
                      type="text"
                      size="small"
                      icon={<CloseOutlined />}
                      onClick={() => handleCancelStatusEdit(record.id)}
                      style={{ color: "#ff4d4f" }}
                    />
                  </Tooltip>
                </div>
              </div>
            );
          }

          return (
            <div className="group">
              <div
                className="cursor-pointer hover:bg-gray-50 px-2 py-1 rounded flex items-center justify-between"
                onClick={() => handleEditStatus(record.id, isActive)}
                title="Click to edit status"
              >
                <Tag color={isActive ? "green" : "red"}>
                  {isActive ? "ACTIVE" : "INACTIVE"}
                </Tag>
                <EditOutlined className="opacity-0 group-hover:opacity-100 text-xs ml-1" />
              </div>
            </div>
          );
        },
        filters: [
          { text: "Active", value: true },
          { text: "Inactive", value: false },
        ],
        onFilter: (value, record) => record.isActive === value,
        sorter: (a, b) => (a.isActive === b.isActive ? 0 : a.isActive ? -1 : 1),
      },
      // Actions column with direct action buttons
      {
        title: "Actions",
        key: "actions",
        width: 140,
        fixed: "right",
        render: (_, record) => (
          <Space size={4}>
            <Tooltip title="View Details">
              <Button
                type="text"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => handleViewClient(record)}
              />
            </Tooltip>
            <Tooltip title="Edit Client">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEditClient(record)}
              />
            </Tooltip>
            <Tooltip title="Delete Client">
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteClient(record)}
                danger
              />
            </Tooltip>
          </Space>
        ),
      },
    ],
    [
      getClientTypeColor,
      handleViewClient,
      handleEditClient,
      handleDeleteClient,
      editingCredit,
      editingStatus,
      tempValues,
      setTempValues,
      handleEditCredit,
      handleCancelCreditEdit,
      handleSaveCreditEdit,
      handleEditStatus,
      handleCancelStatusEdit,
      handleSaveStatusEdit,
    ]
  );

  // Search handler - memoized
  const handleSearch = useCallback((value) => {
    setFilters((prev) => ({ ...prev, search: value }));
    setPage(1);
  }, []);

  // Summary statistics from server-side query
  const summaryStats = useMemo(() => {
    // Use server-side stats if available, otherwise calculate from filtered clients
    if (statsData?.clientsSummary) {
      const serverStats = statsData.clientsSummary;

      // Calculate financial stats from filtered clients (these are client-specific)
      const totalCreditBalance = filteredClients.reduce((sum, client) => {
        const balance = parseFloat(client.totalBalance || 0);
        return sum + (balance > 0 ? balance : 0);
      }, 0);

      const totalAmountDue = filteredClients.reduce((sum, client) => {
        const balance = parseFloat(client.totalBalance || 0);
        return sum + (balance < 0 ? Math.abs(balance) : 0);
      }, 0);

      const totalCreditLimits = filteredClients.reduce((sum, client) => {
        const limit = parseFloat(client.creditAmountLimit || 0);
        return sum + limit;
      }, 0);

      const clientsWithCreditLimit = filteredClients.filter(
        (c) => parseFloat(c.creditAmountLimit || 0) > 0
      ).length;
      const clientsOverLimit = filteredClients.filter((c) => {
        const limit = parseFloat(c.creditAmountLimit || 0);
        const balance = parseFloat(c.totalBalance || 0);
        return limit > 0 && limit + balance < 0;
      }).length;

      const clientsWithCredit = filteredClients.filter(
        (c) => parseFloat(c.totalBalance || 0) > 0
      ).length;
      const clientsWithDue = filteredClients.filter(
        (c) => parseFloat(c.totalBalance || 0) < 0
      ).length;

      return {
        total: serverStats.totalClients || 0,
        active: serverStats.activeClients || 0,
        totalCreditBalance,
        totalAmountDue,
        totalCreditLimits,
        clientsWithCreditLimit,
        clientsOverLimit,
        clientsWithCredit,
        clientsWithDue,
      };
    }

    // Fallback: calculate from filtered clients
    const activeClients = filteredClients.filter(
      (c) => c.isActive === true
    ).length;

    const totalCreditBalance = filteredClients.reduce((sum, client) => {
      const balance = parseFloat(client.totalBalance || 0);
      return sum + (balance > 0 ? balance : 0);
    }, 0);

    const totalAmountDue = filteredClients.reduce((sum, client) => {
      const balance = parseFloat(client.totalBalance || 0);
      return sum + (balance < 0 ? Math.abs(balance) : 0);
    }, 0);

    const totalCreditLimits = filteredClients.reduce((sum, client) => {
      const limit = parseFloat(client.creditAmountLimit || 0);
      return sum + limit;
    }, 0);

    const clientsWithCreditLimit = filteredClients.filter(
      (c) => parseFloat(c.creditAmountLimit || 0) > 0
    ).length;
    const clientsOverLimit = filteredClients.filter((c) => {
      const limit = parseFloat(c.creditAmountLimit || 0);
      const balance = parseFloat(c.totalBalance || 0);
      return limit > 0 && limit + balance < 0;
    }).length;

    const clientsWithCredit = filteredClients.filter(
      (c) => parseFloat(c.totalBalance || 0) > 0
    ).length;
    const clientsWithDue = filteredClients.filter(
      (c) => parseFloat(c.totalBalance || 0) < 0
    ).length;

    return {
      total: filteredClients.length,
      active: activeClients,
      totalCreditBalance,
      totalAmountDue,
      totalCreditLimits,
      clientsWithCreditLimit,
      clientsOverLimit,
      clientsWithCredit,
      clientsWithDue,
    };
  }, [statsData, filteredClients]);

  // Memoize scroll config
  const scrollConfig = useMemo(() => ({ x: 1200 }), []);

  // Memoize onChange handler
  const handleTableChange = useCallback(
    (paginationConfig, filtersConfig, sorterConfig) => {
      console.log("Table change:", {
        paginationConfig,
        filtersConfig,
        sorterConfig,
      });

      // Update filters - backend expects single values, not arrays
      const newFilters = {};

      // Handle clientType filter (single value)
      if (filtersConfig.clientType && filtersConfig.clientType.length > 0) {
        newFilters.clientType = filtersConfig.clientType[0];
      }

      // Handle priority filter (single value) - backend expects String not array
      if (filtersConfig.priority && filtersConfig.priority.length > 0) {
        newFilters.priority = filtersConfig.priority[0];
      }

      // Note: creditLimit filter is client-side only (not sent to backend)
      // Store it for potential future use
      if (filtersConfig.creditLimit && filtersConfig.creditLimit.length > 0) {
        // This filter is handled client-side via onFilter in column definition
      }

      setFilters(newFilters);

      // Update sorting
      if (sorterConfig && sorterConfig.field) {
        setSorter({
          field: sorterConfig.field,
          order: sorterConfig.order === "ascend" ? "ASC" : "DESC",
        });
      } else {
        setSorter({ field: "createdAt", order: "DESC" });
      }
    },
    []
  );

  return (
    <div className="client-management">
      <div>
        {/* Filters and Actions with Inline Stats */}
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={16} align="middle" style={{ marginBottom: 12 }}>
            {/* Inline Statistics - Compact Badges */}
            <Col flex="auto">
              <Space size={16}>
                <Space size={4}>
                  <UserOutlined style={{ fontSize: 16, color: "#1890ff" }} />
                  <Text strong style={{ fontSize: 14 }}>
                    Total:
                  </Text>
                  <Tag
                    color="blue"
                    style={{ margin: 0, fontSize: 14, padding: "2px 8px" }}
                  >
                    {summaryStats.total}
                  </Tag>
                </Space>
                <Space size={4}>
                  <CheckOutlined style={{ fontSize: 16, color: "#52c41a" }} />
                  <Text strong style={{ fontSize: 14 }}>
                    Active:
                  </Text>
                  <Tag
                    color="green"
                    style={{ margin: 0, fontSize: 14, padding: "2px 8px" }}
                  >
                    {summaryStats.active}
                  </Tag>
                </Space>
                <Space size={4}>
                  <Text strong style={{ fontSize: 14 }}>
                    Credit Limits:
                  </Text>
                  <Tag
                    color="blue"
                    style={{ margin: 0, fontSize: 14, padding: "2px 8px" }}
                  >
                    ₹{summaryStats.totalCreditLimits}
                  </Tag>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    ({summaryStats.clientsWithCreditLimit} clients)
                  </Text>
                </Space>
                <Space size={4}>
                  <Text strong style={{ fontSize: 14 }}>
                    Available:
                  </Text>
                  <Tag
                    color="green"
                    style={{ margin: 0, fontSize: 14, padding: "2px 8px" }}
                  >
                    ₹{summaryStats.totalCreditBalance.toFixed(2)}
                  </Tag>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    ({summaryStats.clientsWithCredit} clients)
                  </Text>
                </Space>
                <Space size={4}>
                  <ExclamationCircleOutlined
                    style={{ fontSize: 16, color: "#ff4d4f" }}
                  />
                  <Text strong style={{ fontSize: 14 }}>
                    Due:
                  </Text>
                  <Tag
                    color="red"
                    style={{ margin: 0, fontSize: 14, padding: "2px 8px" }}
                  >
                    ₹{summaryStats.totalAmountDue.toFixed(2)}
                  </Tag>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    ({summaryStats.clientsWithDue} clients)
                  </Text>
                </Space>
                <Space size={4}>
                  <CloseOutlined style={{ fontSize: 16, color: "#ff4d4f" }} />
                  <Text strong style={{ fontSize: 14 }}>
                    Over Limit:
                  </Text>
                  <Tag
                    color="red"
                    style={{ margin: 0, fontSize: 14, padding: "2px 8px" }}
                  >
                    {summaryStats.clientsOverLimit}
                  </Tag>
                </Space>
                {currentUser?.isServiceProvider === true && (
                  <Space size={4}>
                    {/* My Clients Only filter - visible only for service providers */}
                    <Checkbox
                      checked={myClientsOnly}
                      onChange={(e) => setMyClientsOnly(e.target.checked)}
                      style={{ whiteSpace: "nowrap" }}
                    >
                      <Text strong style={{ fontSize: 14 }}>
                        My Clients
                      </Text>
                    </Checkbox>
                  </Space>
                )}
              </Space>
            </Col>
          </Row>
          <Row gutter={16} align="middle">
            <Col span={8}>
              <Input
                placeholder="Search clients..."
                prefix={<SearchOutlined />}
                value={filters.search}
                onChange={(e) => {
                  const value = e.target.value;
                  setFilters((prev) => ({ ...prev, search: value }));
                  setPage(1);
                }}
                allowClear
                onPressEnter={(e) => handleSearch(e.target.value)}
              />
            </Col>
            <Col span={4}>
              <Select
                placeholder="Client Type"
                value={filters.clientType}
                onChange={(value) => {
                  setFilters((prev) => ({ ...prev, clientType: value }));
                  setPage(1);
                }}
                style={{ width: "100%" }}
                allowClear
              >
                <Option value="permanent">Permanent</Option>
                <Option value="walkIn">Walk-In</Option>
              </Select>
            </Col>
            <Col span={4}>
              <Select
                mode="multiple"
                placeholder="Service Provider"
                value={filters.serviceProviderIds}
                onChange={(value) => {
                  setFilters((prev) => ({ ...prev, serviceProviderIds: value }));
                  setPage(1);
                }}
                style={{ width: "100%" }}
                allowClear
                maxTagCount="responsive"
              >
                {serviceProviders.map((user) => (
                  <Option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col span={4}>
              <Select
                mode="multiple"
                placeholder="Financial Leader"
                value={filters.leaderIds}
                onChange={(value) => {
                  setFilters((prev) => ({ ...prev, leaderIds: value }));
                  setPage(1);
                }}
                style={{ width: "100%" }}
                allowClear
                maxTagCount="responsive"
              >
                {allUsers.map((user) => (
                  <Option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col span={4} style={{ textAlign: "right" }}>
              <Space>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleAddClient}
                >
                  Add New Client
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>
      </div>

      {/* Main Table */}
      <Card>
        <CommonTable
          className="client-table"
          columns={columns}
          dataSource={filteredClients}
          loading={loading && !isLoadingMore}
          pagination={false}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
          size="small"
          showHeader={false}
        />
        {isLoadingMore && (
          <div style={{ textAlign: "center", padding: "16px" }}>
            <Text type="secondary">Loading more clients...</Text>
          </div>
        )}
        {!hasMore && filteredClients.length > 0 && (
          <div style={{ textAlign: "center", padding: "16px" }}>
            <Text type="secondary">No more clients to load</Text>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ClientList;
