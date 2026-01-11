import React, { useState, useCallback, useEffect } from "react";
import {
  Card,
  Table,
  Typography,
  Space,
  Tooltip,
  Input,
  Button,
  message,
  Row,
  Col,
  Statistic,
  DatePicker,
} from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  DeleteOutlined,
  CalendarOutlined,
  FileTextOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useQuery } from "@apollo/client";
import { GET_PROJECTS } from "../../graphql/projectQueries";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const DeletedProjectsReport = () => {
  const [searchText, setSearchText] = useState("");
  const [dateRange, setDateRange] = useState([null, null]);
  const [page, setPage] = useState(1);
  const [allProjects, setAllProjects] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Build filters object
  const buildFilters = useCallback(() => {
    const filters = {
      includeDeleted: true,
    };

    // Add date range filter if selected (use YYYY-MM-DD format to avoid timezone issues)
    if (dateRange[0] && dateRange[1]) {
      filters.dateRange = {
        start: dateRange[0].format('YYYY-MM-DD'),
        end: dateRange[1].format('YYYY-MM-DD'),
      };
    }

    return filters;
  }, [dateRange]);

  // Query deleted projects with server-side pagination
  const {
    data: projectsData,
    loading: projectsLoading,
    error,
    refetch,
    fetchMore,
  } = useQuery(GET_PROJECTS, {
    variables: {
      filters: buildFilters(),
      page: 1,
      limit: 20,
      search: searchText || "",
      sortBy: "deletedAt",
      sortOrder: "DESC",
    },
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
  });

  // Extract projects from response (backend already filters deleted projects)
  useEffect(() => {
    const projects = projectsData?.projects?.projects || [];
    if (page === 1) {
      setAllProjects(projects);
    }
  }, [projectsData, page]);

  // Check if there are more items to load
  useEffect(() => {
    if (projectsData?.projects?.pagination) {
      const { page: currentPage, totalPages } = projectsData.projects.pagination;
      setHasMore(currentPage < totalPages);
    }
  }, [projectsData]);

  // Load more data
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || projectsLoading) return;

    setIsLoadingMore(true);
    try {
      await fetchMore({
        variables: {
          filters: buildFilters(),
          page: page + 1,
          limit: 20,
          search: searchText || "",
          sortBy: "deletedAt",
          sortOrder: "DESC",
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev;

          const prevProjects = prev?.projects?.projects || [];
          const newProjects = fetchMoreResult?.projects?.projects || [];

          return {
            ...fetchMoreResult,
            projects: {
              ...fetchMoreResult.projects,
              projects: [...prevProjects, ...newProjects],
            },
          };
        },
      });
      setPage(page + 1);
    } catch (error) {
      console.error("Error loading more projects:", error);
      message.error("Failed to load more deleted projects");
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, projectsLoading, fetchMore, page, buildFilters, searchText]);

  // Handle scroll event for infinite scroll
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
  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Reset pagination on filter change
  useEffect(() => {
    refetch({
      filters: buildFilters(),
      page: 1,
      limit: 20,
      search: searchText || "",
      sortBy: "deletedAt",
      sortOrder: "DESC",
    });
    setPage(1);
  }, [searchText, dateRange, buildFilters, refetch]);

  // Statistics
  const totalDeleted = allProjects.length;
  const deletedThisMonth = allProjects.filter((project) =>
    dayjs(project.deletedAt).isAfter(dayjs().startOf("month"))
  ).length;
  const deletedThisWeek = allProjects.filter((project) =>
    dayjs(project.deletedAt).isAfter(dayjs().startOf("week"))
  ).length;

  // Handle date range change
  const handleDateRangeChange = (dates) => {
    if (dates && dates.length === 2) {
      setDateRange(dates);
    } else {
      setDateRange([null, null]);
    }
  };

  // Table columns
  const columns = [
    {
      title: "Project Code",
      dataIndex: "projectCode",
      key: "projectCode",
      width: 150,
      fixed: "left",
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: "Project Name",
      dataIndex: "name",
      key: "name",
      width: 200,
      ellipsis: {
        showTitle: false,
      },
      render: (text) => (
        <Tooltip placement="topLeft" title={text}>
          {text || "-"}
        </Tooltip>
      ),
    },
    {
      title: "Client",
      dataIndex: ["client", "displayName"],
      key: "client",
      width: 180,
      render: (text, record) => (
        <Space>
          <Text>{record.client?.clientCode || "-"}</Text>
          <Text type="secondary">{text || ""}</Text>
        </Space>
      ),
    },
    {
      title: "Void Reason",
      dataIndex: "voidReason",
      key: "voidReason",
      width: 250,
      ellipsis: {
        showTitle: false,
      },
      render: (text) => (
        <Tooltip placement="topLeft" title={text}>
          <Text type="secondary" style={{ fontSize: "12px" }}>
            {text || "-"}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: "Deleted By",
      dataIndex: "updater",
      key: "deletedBy",
      width: 150,
      render: (updater) => (
        <Space>
          <UserOutlined style={{ color: "#999" }} />
          <Text>
            {updater ? `${updater.firstName} ${updater.lastName}` : "Unknown"}
          </Text>
        </Space>
      ),
    },
    {
      title: "Deleted At",
      dataIndex: "deletedAt",
      key: "deletedAt",
      width: 180,
      sorter: (a, b) => dayjs(a.deletedAt).unix() - dayjs(b.deletedAt).unix(),
      defaultSortOrder: "descend",
      render: (date) => (
        <Space direction="vertical" size={0}>
          <Text>{dayjs(date).format("MMM DD, YYYY")}</Text>
          <Text type="secondary" style={{ fontSize: "11px" }}>
            {dayjs(date).format("hh:mm A")}
          </Text>
          <Text
            type="secondary"
            style={{ fontSize: "10px", fontStyle: "italic" }}
          >
            ({dayjs(date).fromNow()})
          </Text>
        </Space>
      ),
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 140,
      render: (date) => (
        <Text type="secondary">{dayjs(date).format("MMM DD, YYYY")}</Text>
      ),
    },
  ];

  return (
    <div style={{ padding: "24px" }}>
      {/* Statistics */}
      <Card bordered={false} style={{ marginBottom: "16px" }}>
        <Row justify={"space-between"}>
          <Col>
            <Space>
              <DeleteOutlined style={{ fontSize: "24px", color: "#ff4d4f" }} />
              <Title level={3} style={{ margin: 0 }}>
                Deleted Projects Report
              </Title>
            </Space>
          </Col>
          <Col>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => refetch()}
              loading={projectsLoading}
            >
              Refresh
            </Button>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={8}>
            <Statistic
              title="Total Deleted Projects"
              value={totalDeleted}
              prefix={<DeleteOutlined />}
              valueStyle={{ color: "#ff4d4f" }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="Deleted This Week"
              value={deletedThisWeek}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: "#faad14" }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="Deleted This Month"
              value={deletedThisMonth}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: "#1890ff" }}
            />
          </Col>
        </Row>
      </Card>

      {/* Search and Filters */}
      <Card bordered={false} style={{ marginBottom: "16px" }}>
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <Input.Search
              placeholder="Search by project code, name, client..."
              allowClear
              enterButton={<SearchOutlined />}
              onSearch={setSearchText}
              onChange={(e) => {
                if (!e.target.value) {
                  setSearchText("");
                }
              }}
              style={{ width: 300 }}
            />
            <RangePicker
              value={dateRange}
              onChange={handleDateRangeChange}
              placeholder={["Start Date", "End Date"]}
              format="MMM DD, YYYY"
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                setSearchText("");
                setDateRange([null, null]);
                refetch();
              }}
              loading={projectsLoading}
            >
              Reset
            </Button>
          </div>
          <Text type="secondary">
            Showing {allProjects.length} deleted project(s)
            {dateRange[0] && dateRange[1]
              ? ` from ${dateRange[0].format("MMM DD, YYYY")} to ${dateRange[1].format("MMM DD, YYYY")}`
              : ""}
          </Text>
        </Space>
      </Card>

      {/* Table */}
      <Card bordered={false}>
        <Table
          columns={columns}
          dataSource={allProjects}
          rowKey="id"
          loading={projectsLoading && !isLoadingMore}
          pagination={false}
          scroll={{ x: 1200 }}
          size="small"
        />
        {isLoadingMore && (
          <div style={{ textAlign: "center", padding: "16px" }}>
            <Text type="secondary">Loading more projects...</Text>
          </div>
        )}
        {!hasMore && allProjects.length > 0 && (
          <div style={{ textAlign: "center", padding: "16px" }}>
            <Text type="secondary">No more deleted projects to load</Text>
          </div>
        )}
      </Card>

      {/* Error handling */}
      {error && (
        <Card bordered={false} style={{ marginTop: "16px" }}>
          <Text type="danger">
            Error loading deleted projects: {error.message}
          </Text>
        </Card>
      )}
    </div>
  );
};

export default DeletedProjectsReport;
