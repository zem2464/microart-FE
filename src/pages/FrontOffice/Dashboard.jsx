import React, { useMemo } from "react";
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Space,
  Typography,
  Progress,
  Empty,
  Spin,
  Tooltip,
  Alert,
  Badge,
  Timeline,
  Button,
  Avatar,
  List,
  Divider,
} from "antd";
import {
  UserOutlined,
  ProjectOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  WarningOutlined,
  CalendarOutlined,
  TeamOutlined,
  FileTextOutlined,
  RocketOutlined,
  TrophyOutlined,
  FireOutlined,
  RiseOutlined,
  FallOutlined,
  ThunderboltOutlined,
  BellOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from "@ant-design/icons";
import { useQuery, useReactiveVar } from "@apollo/client";
import { userCacheVar } from "../../cache/userCacheVar";
import {
  hasPermission,
  MODULES,
  ACTIONS,
  generatePermission,
} from "../../config/permissions";
import {
  GET_USERS_ON_LEAVE,
  GET_MY_TASK_STATS,
  GET_PROJECTS_OVERVIEW,
  GET_COMPLETED_PROJECTS_NO_PAYMENT,
  GET_DASHBOARD_PENDING_LEAVES,
  GET_MY_ACTIVE_PROJECTS,
} from "../../gql/dashboard";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { useNavigate } from "react-router-dom";

dayjs.extend(isBetween);

const { Title, Text } = Typography;

const Dashboard = () => {
  const user = useReactiveVar(userCacheVar);
  const navigate = useNavigate();

  // Permission checks
  const isAdmin = user?.role?.roleType === "ADMIN";
  const isManager = user?.role?.roleType === "MANAGER";
  const canManageProjects =
    hasPermission(user, generatePermission(MODULES.PROJECTS, ACTIONS.MANAGE)) ||
    isAdmin ||
    isManager; // Allow admins/managers to see projects
  const canManageTransactions =
    hasPermission(
      user,
      generatePermission(MODULES.CLIENT_TRANSACTIONS, ACTIONS.MANAGE)
    ) || isAdmin; // Allow admins to see transactions
  const canApproveLeaves = isAdmin || isManager;

  // Date ranges
  const today = dayjs();
  const next7Days = today.add(7, "day");
  const currentMonthStart = today.startOf("month").format("YYYY-MM-DD");
  const currentMonthEnd = today.endOf("month").format("YYYY-MM-DD");

  // Debug permissions
  console.log("Dashboard permissions:", {
    isAdmin,
    isManager,
    canManageProjects,
    canManageTransactions,
    canApproveLeaves,
    userRole: user?.role?.roleType,
    userPermissions: user?.role?.permissions,
  });

  // Query: Users on leave (fetch all, filter client-side)
  const { data: leaveData, loading: leaveLoading } = useQuery(
    GET_USERS_ON_LEAVE,
    {
      fetchPolicy: "cache-and-network",
    }
  );

  // Query: My task statistics for current month
  const { data: myTaskData, loading: myTaskLoading } = useQuery(
    GET_MY_TASK_STATS,
    {
      variables: {
        dateFrom: currentMonthStart,
        dateTo: currentMonthEnd,
      },
      skip: isAdmin, // Admin sees all projects overview instead
      fetchPolicy: "cache-and-network",
    }
  );

  // Query: Projects overview (for admin/manager)
  const {
    data: projectsData,
    loading: projectsLoading,
    error: projectsError,
  } = useQuery(GET_PROJECTS_OVERVIEW, {
    variables: {
      filters: {},
      page: 1,
      limit: 100,
    },
    skip: !canManageProjects,
    fetchPolicy: "cache-and-network",
    onCompleted: (data) => {
      console.log("Projects data loaded:", data);
    },
    onError: (error) => {
      console.error("Projects query error:", error);
    },
  });

  // Query: My active projects (for employees)
  const { data: myProjectsData, loading: myProjectsLoading } = useQuery(
    GET_MY_ACTIVE_PROJECTS,
    {
      variables: {
        filters: {
          status: "IN_PROGRESS",
        },
        page: 1,
        limit: 20,
      },
      skip: isAdmin || isManager,
      fetchPolicy: "cache-and-network",
    }
  );

  // Query: Completed projects without payment (walk-in clients)
  const { data: completedProjectsData, loading: completedProjectsLoading } =
    useQuery(GET_COMPLETED_PROJECTS_NO_PAYMENT, {
      skip: !canManageTransactions,
      fetchPolicy: "cache-and-network",
    });

  // Query: Pending leave approvals (admin/manager)
  const { data: pendingLeavesData, loading: pendingLeavesLoading } = useQuery(
    GET_DASHBOARD_PENDING_LEAVES,
    {
      skip: !canApproveLeaves,
      fetchPolicy: "cache-and-network",
    }
  );

  // Filter users on leave for today and next 7 days
  const usersOnLeave = useMemo(() => {
    if (!leaveData?.leaves?.leaves) return { today: [], upcoming: [] };

    const today = dayjs();
    const next7Days = today.add(7, "day");

    const todayLeaves = [];
    const upcomingLeaves = [];

    leaveData.leaves.leaves.forEach((leave) => {
      const start = dayjs(leave.startDate);
      const end = dayjs(leave.endDate);

      // Check if on leave today
      if (today.isBetween(start, end, "day", "[]")) {
        todayLeaves.push(leave);
      }
      // Check if leave starts in next 7 days (but not today)
      else if (
        start.isAfter(today, "day") &&
        start.isBefore(next7Days, "day")
      ) {
        upcomingLeaves.push(leave);
      }
    });

    return { today: todayLeaves, upcoming: upcomingLeaves };
  }, [leaveData]);

  // Calculate project statistics
  const projectStats = useMemo(() => {
    console.log("Calculating project stats, projectsData:", projectsData);

    if (!projectsData?.projects?.projects) {
      console.log("No projects data available");
      return {
        total: 0,
        active: 0,
        inProgress: 0,
        completed: 0,
        delivered: 0,
        pendingInvoice: 0,
      };
    }

    const projects = projectsData.projects.projects;
    console.log("Projects array:", projects);
    console.log("Projects length:", projects.length);

    const stats = {
      total: projects.length,
      active: projects.filter((p) => p.status === "active").length,
      inProgress: projects.filter((p) => p.status === "in_progress").length,
      completed: projects.filter((p) => p.status === "completed").length,
      delivered: projects.filter((p) => p.status === "delivered").length,
      pendingInvoice: projects.filter(
        (p) => p.status === "completed" && !p.invoiceId
      ).length,
    };

    console.log("Calculated stats:", stats);
    return stats;
  }, [projectsData]);

  // Calculate my task statistics
  const myTaskStats = useMemo(() => {
    if (!myTaskData?.userWorkDashboard?.users?.[0]) {
      return { total: 0, byWorkType: [] };
    }

    const userData = myTaskData.userWorkDashboard.users[0];
    const total = userData.totalCompletedImages || 0;
    const byWorkType = userData.gradingBreakdown || [];

    return { total, byWorkType };
  }, [myTaskData]);

  // Filter completed projects without invoices (walk-in clients)
  const projectsNeedingInvoice = useMemo(() => {
    if (!completedProjectsData?.projects?.projects) return [];

    return completedProjectsData.projects.projects.filter(
      (project) =>
        project.status === "completed" &&
        !project.invoiceId &&
        project.client?.clientType === "WALKIN"
    );
  }, [completedProjectsData]);

  // Get pending leave approvals
  const pendingLeaves = useMemo(() => {
    return pendingLeavesData?.pendingLeaveApprovals?.leaves || [];
  }, [pendingLeavesData]);

  // Calculate my project task progress
  const myProjectProgress = useMemo(() => {
    if (!myProjectsData?.projects?.projects) return [];

    return myProjectsData.projects.projects.map((project) => {
      const progress =
        project.taskCount > 0
          ? Math.round((project.completedTaskCount / project.taskCount) * 100)
          : 0;

      return {
        ...project,
        progress,
      };
    });
  }, [myProjectsData]);

  // Calculate projects with upcoming deadlines (next 7 days)
  const upcomingDeadlines = useMemo(() => {
    if (!projectsData?.projects?.projects) return [];

    const now = dayjs();
    const next7Days = now.add(7, "day");

    return projectsData.projects.projects
      .filter((p) => {
        if (!p.deadlineDate) return false;
        const deadline = dayjs(p.deadlineDate);
        return deadline.isAfter(now) && deadline.isBefore(next7Days);
      })
      .sort((a, b) => dayjs(a.deadlineDate).diff(dayjs(b.deadlineDate)));
  }, [projectsData]);

  // Calculate overdue projects
  const overdueProjects = useMemo(() => {
    if (!projectsData?.projects?.projects) return [];

    const now = dayjs();

    return projectsData.projects.projects.filter((p) => {
      if (
        !p.deadlineDate ||
        p.status === "completed" ||
        p.status === "delivered"
      )
        return false;
      return dayjs(p.deadlineDate).isBefore(now);
    });
  }, [projectsData]);

  // Recent activity (last 5 updated projects)
  const recentActivity = useMemo(() => {
    if (!projectsData?.projects?.projects) return [];

    return [...projectsData.projects.projects]
      .sort((a, b) => dayjs(b.updatedAt).diff(dayjs(a.updatedAt)))
      .slice(0, 5);
  }, [projectsData]);

  // Calculate total estimated revenue from active projects
  const activeRevenue = useMemo(() => {
    if (!projectsData?.projects?.projects) return 0;

    return projectsData.projects.projects
      .filter((p) => p.status === "in_progress" || p.status === "active")
      .reduce((sum, p) => sum + (p.totalEstimatedCost || 0), 0);
  }, [projectsData]);

  // Calculate completion rate for my projects
  const myCompletionRate = useMemo(() => {
    if (!myProjectProgress || myProjectProgress.length === 0) return 0;

    const totalProgress = myProjectProgress.reduce(
      (sum, p) => sum + p.progress,
      0
    );
    return Math.round(totalProgress / myProjectProgress.length);
  }, [myProjectProgress]);

  // Columns for leave table
  const leaveColumns = [
    {
      title: "User",
      dataIndex: ["user", "firstName"],
      key: "user",
      render: (_, record) => (
        <Space>
          <UserOutlined />
          <Text>
            {record.user.firstName} {record.user.lastName}
          </Text>
        </Space>
      ),
    },
    {
      title: "Type",
      dataIndex: "leaveType",
      key: "leaveType",
      render: (type) => {
        const colorMap = {
          SICK: "red",
          CASUAL: "blue",
          EARNED: "green",
          UNPAID: "orange",
        };
        return <Tag color={colorMap[type] || "default"}>{type}</Tag>;
      },
    },
    {
      title: "Duration",
      dataIndex: "durationType",
      key: "durationType",
      render: (durationType, record) => {
        if (durationType === "HOURS") {
          return <Text>{record.hours} hours</Text>;
        }
        return (
          <Text>
            {dayjs(record.startDate).format("MMM DD")} -{" "}
            {dayjs(record.endDate).format("MMM DD")}
          </Text>
        );
      },
    },
  ];

  // Columns for projects needing invoice
  const invoiceNeededColumns = [
    {
      title: "Project",
      dataIndex: "projectCode",
      key: "projectCode",
      render: (code, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{code}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.name}
          </Text>
        </Space>
      ),
    },
    {
      title: "Client",
      dataIndex: ["client", "displayName"],
      key: "client",
    },
    {
      title: "Amount",
      dataIndex: "totalActualCost",
      key: "amount",
      render: (amount) => (
        <Text strong style={{ color: "#52c41a" }}>
          ₹{amount?.toFixed(2) || "0.00"}
        </Text>
      ),
    },
    {
      title: "Completed",
      dataIndex: "updatedAt",
      key: "completedAt",
      render: (date) => dayjs(date).format("MMM DD, YYYY"),
    },
  ];

  // Columns for pending leave approvals
  const pendingLeaveColumns = [
    {
      title: "Employee",
      dataIndex: ["user", "firstName"],
      key: "employee",
      render: (_, record) => (
        <Space>
          <UserOutlined />
          <Text>
            {record.user.firstName} {record.user.lastName}
          </Text>
        </Space>
      ),
    },
    {
      title: "Type",
      dataIndex: "leaveType",
      key: "type",
      render: (type) => {
        const colorMap = {
          SICK: "red",
          CASUAL: "blue",
          EARNED: "green",
          UNPAID: "orange",
        };
        return <Tag color={colorMap[type] || "default"}>{type}</Tag>;
      },
    },
    {
      title: "Duration",
      dataIndex: "durationType",
      key: "duration",
      render: (durationType, record) => {
        if (durationType === "HOURS") {
          return <Text>{record.hours} hours</Text>;
        }
        const days =
          dayjs(record.endDate).diff(dayjs(record.startDate), "day") + 1;
        return (
          <Text>
            {days} day{days > 1 ? "s" : ""}
          </Text>
        );
      },
    },
    {
      title: "From",
      dataIndex: "startDate",
      key: "startDate",
      render: (date) => dayjs(date).format("MMM DD"),
    },
    {
      title: "Applied",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date) => {
        const daysAgo = dayjs().diff(dayjs(date), "day");
        if (daysAgo === 0) return <Text type="secondary">Today</Text>;
        if (daysAgo === 1) return <Text type="secondary">Yesterday</Text>;
        return <Text type="secondary">{daysAgo} days ago</Text>;
      },
    },
  ];

  return (
    <div style={{ padding: "24px", background: "#f0f2f5", minHeight: "100vh" }}>
      {/* Welcome Header with gradient */}
      <Card
        style={{
          marginBottom: 24,
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          border: "none",
        }}
        bodyStyle={{ padding: "32px" }}
      >
        <Row align="middle" justify="space-between">
          <Col>
            <Space direction="vertical" size={4}>
              <Title level={2} style={{ margin: 0, color: "white" }}>
                Welcome back, {user?.firstName}! 👋
              </Title>
              <Text
                style={{ color: "rgba(255, 255, 255, 0.85)", fontSize: 16 }}
              >
                {dayjs().format("dddd, MMMM DD, YYYY")} • Here's your workspace
                overview
              </Text>
            </Space>
          </Col>
          {isAdmin && (
            <Col>
              <Space size="middle">
                <Button
                  type="primary"
                  size="large"
                  icon={<BellOutlined />}
                  style={{
                    background: "rgba(255, 255, 255, 0.2)",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                    backdropFilter: "blur(10px)",
                  }}
                  onClick={() => navigate("/leave-approvals")}
                >
                  {pendingLeaves.length} Pending Approvals
                </Button>
              </Space>
            </Col>
          )}
        </Row>
      </Card>

      {/* Alert for overdue projects */}
      {canManageProjects && overdueProjects.length > 0 && (
        <Alert
          message={`⚠ ${overdueProjects.length} Projects Overdue`}
          description="You have projects past their deadline. Review and update their status."
          type="error"
          showIcon
          style={{ marginBottom: 16, borderRadius: 8 }}
          action={
            <Button size="small" danger onClick={() => navigate("/projects")}>
              View Projects
            </Button>
          }
        />
      )}

      {/* Alert for upcoming deadlines */}
      {canManageProjects &&
        upcomingDeadlines.length > 0 &&
        !overdueProjects.length && (
          <Alert
            message={`${upcomingDeadlines.length} Projects Due This Week`}
            description="Projects approaching deadline in the next 7 days"
            type="warning"
            showIcon
            style={{ marginBottom: 16, borderRadius: 8 }}
            closable
          />
        )}

      {/* Enhanced Quick Stats Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {/* Users on Leave Today */}
        <Col xs={24} sm={12} lg={6} style={{ display: "flex" }}>
          <Card
            hoverable={usersOnLeave.today.length > 0}
            style={{
              borderRadius: 8,
              borderLeft: "4px solid #fa8c16",
              cursor: usersOnLeave.today.length > 0 ? "pointer" : "default",
              height: "100%",
              width: "100%",
              transition: "all 0.3s ease",
            }}
            bodyStyle={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              padding: "16px",
            }}
            onClick={() => usersOnLeave.today.length > 0 && navigate("/leaves")}
          >
            <Space direction="vertical" size={4} style={{ width: "100%" }}>
              <Space
                align="center"
                style={{ width: "100%", justifyContent: "space-between" }}
              >
                <Text type="secondary" style={{ fontSize: 12 }}>
                  On Leave Today
                </Text>
                <Avatar
                  size="small"
                  icon={<CalendarOutlined />}
                  style={{ background: "#fff7e6", color: "#fa8c16" }}
                />
              </Space>
              <Title level={3} style={{ margin: 0, color: "#fa8c16" }}>
                {usersOnLeave.today.length}
              </Title>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {usersOnLeave.upcoming.length} more in next 7 days
              </Text>
            </Space>
          </Card>
        </Col>

        {/* My Tasks or Active Projects */}
        <Col xs={24} sm={12} lg={6} style={{ display: "flex" }}>
          <Card
            hoverable
            style={{
              borderRadius: 8,
              borderLeft:
                isAdmin || isManager
                  ? "4px solid #1890ff"
                  : "4px solid #52c41a",
              cursor: isAdmin || isManager ? "pointer" : "default",
              height: "100%",
              width: "100%",
              transition: "all 0.3s ease",
            }}
            bodyStyle={{ display: "flex", flexDirection: "column", flex: 1 }}
            onClick={() => (isAdmin || isManager) && navigate("/projects")}
          >
            {isAdmin || isManager ? (
              <Spin spinning={projectsLoading}>
                <Space direction="vertical" size={4} style={{ width: "100%" }}>
                  <Space
                    align="center"
                    style={{ width: "100%", justifyContent: "space-between" }}
                  >
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Active Projects
                    </Text>
                    <Avatar
                      size="small"
                      icon={<ProjectOutlined />}
                      style={{ background: "#e6f7ff", color: "#1890ff" }}
                    />
                  </Space>
                  <Space align="baseline">
                    <Title level={3} style={{ margin: 0, color: "#1890ff" }}>
                      {projectStats.inProgress}
                    </Title>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      / {projectStats.total}
                    </Text>
                  </Space>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {projectStats.completed} completed
                  </Text>
                </Space>
              </Spin>
            ) : (
              <Spin spinning={myTaskLoading}>
                <Space direction="vertical" size={4} style={{ width: "100%" }}>
                  <Space
                    align="center"
                    style={{ width: "100%", justifyContent: "space-between" }}
                  >
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      My Tasks This Month
                    </Text>
                    <Avatar
                      size="small"
                      icon={<CheckCircleOutlined />}
                      style={{ background: "#f6ffed", color: "#52c41a" }}
                    />
                  </Space>
                  <Title level={3} style={{ margin: 0, color: "#52c41a" }}>
                    {myTaskStats.totalTasks}
                  </Title>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {myTaskStats.completedImages} images completed
                  </Text>
                </Space>
              </Spin>
            )}
          </Card>
        </Col>

        {/* Pending Approvals or Completion Rate */}
        <Col xs={24} sm={12} lg={6} style={{ display: "flex" }}>
          {canApproveLeaves && pendingLeaves.length > 0 ? (
            <Card
              hoverable
              style={{
                borderRadius: 8,
                borderLeft: "4px solid #faad14",
                cursor: "pointer",
                height: "100%",
                width: "100%",
                position: "relative",
                transition: "all 0.3s ease",
              }}
              bodyStyle={{ display: "flex", flexDirection: "column", flex: 1 }}
              onClick={() => navigate("/leave-approvals")}
            >
              <Badge
                count={pendingLeaves.length}
                style={{ position: "absolute", top: 12, right: 12, zIndex: 1 }}
              >
                <span />
              </Badge>
              <Spin spinning={pendingLeavesLoading}>
                <Space direction="vertical" size={4} style={{ width: "100%" }}>
                  <Space
                    align="center"
                    style={{ width: "100%", justifyContent: "space-between" }}
                  >
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Pending Approvals
                    </Text>
                    <Avatar
                      size="small"
                      icon={<ClockCircleOutlined />}
                      style={{ background: "#fffbe6", color: "#faad14" }}
                    />
                  </Space>
                  <Title level={3} style={{ margin: 0, color: "#faad14" }}>
                    {pendingLeaves.length}
                  </Title>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    Awaiting your action
                  </Text>
                </Space>
              </Spin>
            </Card>
          ) : (
            <Card
              style={{
                borderRadius: 8,
                borderLeft: "4px solid #722ed1",
                height: "100%",
                width: "100%",
              }}
              bodyStyle={{ display: "flex", flexDirection: "column", flex: 1 }}
            >
              <Space direction="vertical" size={4} style={{ width: "100%" }}>
                <Space
                  align="center"
                  style={{ width: "100%", justifyContent: "space-between" }}
                >
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    My Progress
                  </Text>
                  <Avatar
                    size="small"
                    icon={<TrophyOutlined />}
                    style={{ background: "#f9f0ff", color: "#722ed1" }}
                  />
                </Space>
                <Title level={3} style={{ margin: 0, color: "#722ed1" }}>
                  {myCompletionRate}%
                </Title>
                <Progress
                  percent={myCompletionRate}
                  size="small"
                  showInfo={false}
                  strokeColor="#722ed1"
                />
              </Space>
            </Card>
          )}
        </Col>

        {/* Active Revenue or Projects Needing Invoice */}
        {canManageTransactions ? (
          <Col xs={24} sm={12} lg={6} style={{ display: "flex" }}>
            <Card
              hoverable={projectsNeedingInvoice.length > 0}
              style={{
                borderRadius: 8,
                borderLeft:
                  projectsNeedingInvoice.length > 0
                    ? "4px solid #ff4d4f"
                    : "4px solid #52c41a",
                cursor:
                  projectsNeedingInvoice.length > 0 ? "pointer" : "default",
                height: "100%",
                width: "100%",
                transition: "all 0.3s ease",
              }}
              bodyStyle={{ display: "flex", flexDirection: "column", flex: 1 }}
              onClick={() =>
                projectsNeedingInvoice.length > 0 && navigate("/projects")
              }
            >
              <Spin spinning={completedProjectsLoading}>
                <Space direction="vertical" size={4} style={{ width: "100%" }}>
                  <Space
                    align="center"
                    style={{ width: "100%", justifyContent: "space-between" }}
                  >
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {projectsNeedingInvoice.length > 0
                        ? "Needs Invoice"
                        : "Active Revenue"}
                    </Text>
                    <Avatar
                      size="small"
                      icon={<DollarOutlined />}
                      style={{
                        background:
                          projectsNeedingInvoice.length > 0
                            ? "#fff1f0"
                            : "#f6ffed",
                        color:
                          projectsNeedingInvoice.length > 0
                            ? "#ff4d4f"
                            : "#52c41a",
                      }}
                    />
                  </Space>
                  {projectsNeedingInvoice.length > 0 ? (
                    <>
                      <Title level={3} style={{ margin: 0, color: "#ff4d4f" }}>
                        {projectsNeedingInvoice.length}
                      </Title>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        Completed projects
                      </Text>
                    </>
                  ) : (
                    <>
                      <Title level={3} style={{ margin: 0, color: "#52c41a" }}>
                        ₹{(activeRevenue / 1000).toFixed(0)}K
                      </Title>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        In active projects
                      </Text>
                    </>
                  )}
                </Space>
              </Spin>
            </Card>
          </Col>
        ) : (
          <Col xs={24} sm={12} lg={6} style={{ display: "flex" }}>
            <Card
              style={{
                borderRadius: 8,
                borderLeft: "4px solid #13c2c2",
                height: "100%",
                width: "100%",
              }}
              bodyStyle={{ display: "flex", flexDirection: "column", flex: 1 }}
            >
              <Space direction="vertical" size={4} style={{ width: "100%" }}>
                <Space
                  align="center"
                  style={{ width: "100%", justifyContent: "space-between" }}
                >
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Active Projects
                  </Text>
                  <Avatar
                    size="small"
                    icon={<FireOutlined />}
                    style={{ background: "#e6fffb", color: "#13c2c2" }}
                  />
                </Space>
                <Title level={3} style={{ margin: 0, color: "#13c2c2" }}>
                  {myProjectProgress.length}
                </Title>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Projects in progress
                </Text>
              </Space>
            </Card>
          </Col>
        )}
      </Row>

      {/* Main Content - 3 Column Layout */}
      <Row gutter={[16, 16]} align="top">
        {/* Left Column - Team & Activity */}
        <Col xs={24} lg={8} style={{ display: "flex" }}>
          <Space
            direction="vertical"
            size={12}
            style={{ width: "100%", flex: 1 }}
          >
            {/* Team Availability */}
            {(usersOnLeave.today.length > 0 ||
              usersOnLeave.upcoming.length > 0) && (
              <Card
                title={
                  <Space>
                    <TeamOutlined style={{ color: "#1890ff" }} />
                    <Text strong>Team Availability</Text>
                  </Space>
                }
                style={{ borderRadius: 8 }}
                size="small"
              >
                {usersOnLeave.today.length > 0 && (
                  <>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      ON LEAVE TODAY
                    </Text>
                    <List
                      size="small"
                      dataSource={usersOnLeave.today.slice(0, 3)}
                      renderItem={(leave) => (
                        <List.Item style={{ border: "none", padding: "8px 0" }}>
                          <Space>
                            <Avatar size="small" icon={<UserOutlined />} />
                            <Space direction="vertical" size={0}>
                              <Text strong style={{ fontSize: 13 }}>
                                {leave.user.firstName} {leave.user.lastName}
                              </Text>
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                {leave.leaveType} •{" "}
                                {leave.durationType === "HOURS"
                                  ? `${leave.hours}h`
                                  : `${
                                      dayjs(leave.endDate).diff(
                                        dayjs(leave.startDate),
                                        "day"
                                      ) + 1
                                    } days`}
                              </Text>
                            </Space>
                          </Space>
                        </List.Item>
                      )}
                    />
                  </>
                )}

                {usersOnLeave.upcoming.length > 0 && (
                  <>
                    {usersOnLeave.today.length > 0 && (
                      <Divider style={{ margin: "12px 0" }} />
                    )}
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      UPCOMING (NEXT 7 DAYS)
                    </Text>
                    <List
                      size="small"
                      dataSource={usersOnLeave.upcoming.slice(0, 3)}
                      renderItem={(leave) => (
                        <List.Item style={{ border: "none", padding: "8px 0" }}>
                          <Space>
                            <Avatar
                              size="small"
                              icon={<UserOutlined />}
                              style={{ opacity: 0.6 }}
                            />
                            <Space direction="vertical" size={0}>
                              <Text style={{ fontSize: 13 }}>
                                {leave.user.firstName} {leave.user.lastName}
                              </Text>
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                {dayjs(leave.startDate).format("MMM DD")} •{" "}
                                {leave.leaveType}
                              </Text>
                            </Space>
                          </Space>
                        </List.Item>
                      )}
                    />
                    {usersOnLeave.upcoming.length > 3 && (
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        +{usersOnLeave.upcoming.length - 3} more
                      </Text>
                    )}
                  </>
                )}
              </Card>
            )}

            {/* Recent Activity (for admins) */}
            {canManageProjects && recentActivity.length > 0 && (
              <Card
                title={
                  <Space>
                    <ThunderboltOutlined style={{ color: "#faad14" }} />
                    <Text strong>Recent Activity</Text>
                  </Space>
                }
                style={{ borderRadius: 8 }}
                size="small"
              >
                <Timeline
                  items={recentActivity.map((project) => ({
                    color: project.status === "completed" ? "green" : "blue",
                    children: (
                      <Space direction="vertical" size={0}>
                        <Text
                          strong
                          style={{ fontSize: 13, cursor: "pointer" }}
                          onClick={() => navigate("/projects")}
                        >
                          {project.projectCode} - {project.name || "Untitled"}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {project.client?.displayName} • Updated{" "}
                          {dayjs(project.updatedAt).fromNow()}
                        </Text>
                      </Space>
                    ),
                  }))}
                />
              </Card>
            )}
          </Space>
        </Col>

        {/* Middle Column - Projects & Deadlines */}
        {upcomingDeadlines.length > 0 && (
          <Col xs={24} lg={8} style={{ display: "flex" }}>
            <Space
              direction="vertical"
              size={12}
              style={{ width: "100%", flex: 1 }}
            >
              {/* Upcoming Deadlines */}

              <Card
                title={
                  <Space>
                    <ClockCircleOutlined style={{ color: "#ff4d4f" }} />
                    <Text strong>Upcoming Deadlines</Text>
                    <Badge count={upcomingDeadlines.length} />
                  </Space>
                }
                extra={
                  <Text
                    type="link"
                    onClick={() => navigate("/projects")}
                    style={{ fontSize: 12 }}
                  >
                    View All →
                  </Text>
                }
                style={{ borderRadius: 8 }}
                size="small"
              >
                <List
                  size="small"
                  dataSource={upcomingDeadlines.slice(0, 5)}
                  renderItem={(project) => {
                    const daysLeft = dayjs(project.deadlineDate).diff(
                      dayjs(),
                      "day"
                    );
                    return (
                      <List.Item
                        style={{
                          border: "none",
                          padding: "12px 0",
                          cursor: "pointer",
                        }}
                        onClick={() => navigate("/projects")}
                      >
                        <Space
                          direction="vertical"
                          size={4}
                          style={{ width: "100%" }}
                        >
                          <Space
                            style={{
                              width: "100%",
                              justifyContent: "space-between",
                            }}
                          >
                            <Text strong style={{ fontSize: 13 }}>
                              {project.projectCode}
                            </Text>
                            <Tag
                              color={
                                daysLeft <= 2
                                  ? "red"
                                  : daysLeft <= 5
                                  ? "orange"
                                  : "blue"
                              }
                              style={{ margin: 0 }}
                            >
                              {daysLeft === 0
                                ? "Today"
                                : daysLeft === 1
                                ? "Tomorrow"
                                : `${daysLeft} days`}
                            </Tag>
                          </Space>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {project.name || "Untitled"} •{" "}
                            {project.client?.displayName}
                          </Text>
                          <Progress
                            percent={
                              project.taskCount > 0
                                ? Math.round(
                                    (project.completedTaskCount /
                                      project.taskCount) *
                                      100
                                  )
                                : 0
                            }
                            size="small"
                            strokeColor={daysLeft <= 2 ? "#ff4d4f" : "#1890ff"}
                          />
                        </Space>
                      </List.Item>
                    );
                  }}
                />
              </Card>
            </Space>
          </Col>
        )}
        {/* Right Column - Actions & Alerts */}
        <Col xs={24} lg={16} style={{ display: "flex" }}>
          <Space
            direction="vertical"
            size={12}
            style={{ width: "100%", flex: 1 }}
          >
            {/* Pending Leave Approvals (for admin/manager) */}
            {canApproveLeaves && pendingLeaves.length > 0 && (
              <Card
                title={
                  <Space>
                    <BellOutlined style={{ color: "#faad14" }} />
                    <Text strong>Pending Approvals</Text>
                    <Badge count={pendingLeaves.length} />
                  </Space>
                }
                extra={
                  <Button
                    type="link"
                    size="small"
                    onClick={() => navigate("/leave-approvals")}
                  >
                    View All →
                  </Button>
                }
                style={{ borderRadius: 8 }}
                size="small"
              >
                <Spin spinning={pendingLeavesLoading}>
                  <List
                    size="small"
                    dataSource={pendingLeaves.slice(0, 5)}
                    renderItem={(leave) => (
                      <List.Item
                        style={{
                          border: "none",
                          padding: "12px 0",
                          cursor: "pointer",
                        }}
                        onClick={() => navigate("/leave-approvals")}
                      >
                        <Space
                          direction="vertical"
                          size={4}
                          style={{ width: "100%" }}
                        >
                          <Space
                            style={{
                              width: "100%",
                              justifyContent: "space-between",
                            }}
                          >
                            <Text strong style={{ fontSize: 13 }}>
                              {leave.user.firstName} {leave.user.lastName}
                            </Text>
                            <Tag color="orange">{leave.leaveType}</Tag>
                          </Space>
                          <Space split={<Text type="secondary">•</Text>}>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              {dayjs(leave.startDate).format("MMM DD")}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              {leave.durationType === "HOURS"
                                ? `${leave.hours}h`
                                : `${
                                    dayjs(leave.endDate).diff(
                                      dayjs(leave.startDate),
                                      "day"
                                    ) + 1
                                  } days`}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              {dayjs().diff(dayjs(leave.createdAt), "day") === 0
                                ? "Today"
                                : `${dayjs().diff(
                                    dayjs(leave.createdAt),
                                    "day"
                                  )}d ago`}
                            </Text>
                          </Space>
                        </Space>
                      </List.Item>
                    )}
                  />
                  {pendingLeaves.length > 5 && (
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      +{pendingLeaves.length - 5} more pending
                    </Text>
                  )}
                </Spin>
              </Card>
            )}

            {/* Project Status Overview */}
            {canManageProjects && projectsData && (
              <Card
                title={
                  <Space>
                    <ProjectOutlined style={{ color: "#1890ff" }} />
                    <Text strong>Project Overview</Text>
                  </Space>
                }
                extra={
                  <Button
                    type="link"
                    size="small"
                    onClick={() => navigate("/projects")}
                  >
                    View All →
                  </Button>
                }
                style={{ borderRadius: 8 }}
                size="small"
              >
                <Spin spinning={projectsLoading}>
                  <Row gutter={[12, 12]}>
                    <Col span={6}>
                      <Card
                        size="small"
                        style={{
                          textAlign: "center",
                          background: "#e6f7ff",
                          border: "1px solid #91d5ff",
                        }}
                      >
                        <Statistic
                          title="In Progress"
                          value={projectStats.inProgress}
                          valueStyle={{ color: "#1890ff", fontSize: 20 }}
                          prefix={<RiseOutlined />}
                        />
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card
                        size="small"
                        style={{
                          textAlign: "center",
                          background: "#f6ffed",
                          border: "1px solid #b7eb8f",
                        }}
                      >
                        <Statistic
                          title="Completed"
                          value={projectStats.completed}
                          valueStyle={{ color: "#52c41a", fontSize: 20 }}
                          prefix={<CheckCircleOutlined />}
                        />
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card
                        size="small"
                        style={{
                          textAlign: "center",
                          background: "#f9f0ff",
                          border: "1px solid #d3adf7",
                        }}
                      >
                        <Statistic
                          title="Delivered"
                          value={projectStats.delivered}
                          valueStyle={{ color: "#722ed1", fontSize: 20 }}
                          prefix={<TrophyOutlined />}
                        />
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card
                        size="small"
                        style={{
                          textAlign: "center",
                          background:
                            projectStats.pendingInvoice > 0
                              ? "#fff1f0"
                              : "#f6ffed",
                          border:
                            projectStats.pendingInvoice > 0
                              ? "1px solid #ffa39e"
                              : "1px solid #b7eb8f",
                        }}
                      >
                        <Statistic
                          title="Pending Invoice"
                          value={projectStats.pendingInvoice}
                          valueStyle={{
                            color:
                              projectStats.pendingInvoice > 0
                                ? "#faad14"
                                : "#52c41a",
                            fontSize: 20,
                          }}
                          prefix={<DollarOutlined />}
                        />
                      </Card>
                    </Col>
                  </Row>
                </Spin>
              </Card>
            )}
            <Row gutter={[12, 12]}>
              <Col span={12}>
                {/* My Active Projects (for all users with active projects) */}
                {myProjectProgress.length > 0 && (
                  <Card
                    title={
                      <Space>
                        <RocketOutlined style={{ color: "#1890ff" }} />
                        <Text strong>My Active Projects</Text>
                      </Space>
                    }
                    extra={
                      <Text type="secondary">
                        {myProjectProgress.length} projects
                      </Text>
                    }
                    style={{ borderRadius: 8 }}
                    size="small"
                  >
                    <Spin spinning={myProjectsLoading}>
                      <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                        <Space
                          direction="vertical"
                          size={16}
                          style={{ width: "100%" }}
                        >
                          {myProjectProgress.map((project) => (
                            <div key={project.id}>
                              <Space
                                style={{
                                  width: "100%",
                                  justifyContent: "space-between",
                                  marginBottom: 8,
                                }}
                              >
                                <Space direction="vertical" size={0}>
                                  <Text strong style={{ fontSize: 13 }}>
                                    {project.projectCode}
                                  </Text>
                                  <Text
                                    type="secondary"
                                    style={{ fontSize: 11 }}
                                  >
                                    {project.client?.displayName}
                                  </Text>
                                </Space>
                                <Space>
                                  <Tag
                                    color={
                                      project.priority === "HIGH"
                                        ? "red"
                                        : "blue"
                                    }
                                  >
                                    {project.priority}
                                  </Tag>
                                  <Text strong style={{ fontSize: 16 }}>
                                    {project.progress}%
                                  </Text>
                                </Space>
                              </Space>
                              <Progress
                                percent={project.progress}
                                status={
                                  project.progress === 100
                                    ? "success"
                                    : "active"
                                }
                                strokeColor={{
                                  "0%": "#108ee9",
                                  "100%": "#87d068",
                                }}
                              />
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                {project.completedTaskCount} /{" "}
                                {project.taskCount} tasks completed
                              </Text>
                            </div>
                          ))}
                        </Space>
                      </div>
                    </Spin>
                  </Card>
                )}
              </Col>
              <Col span={12}>
                {/* My Work Breakdown (for all users) */}
                {myTaskStats.byWorkType.length > 0 && (
                  <Card
                    title={
                      <Space>
                        <CheckCircleOutlined style={{ color: "#52c41a" }} />
                        <Text strong>My Work This Month</Text>
                      </Space>
                    }
                    style={{ borderRadius: 8 }}
                    size="small"
                  >
                    <Spin spinning={myTaskLoading}>
                      <Space
                        direction="vertical"
                        size={12}
                        style={{ width: "100%" }}
                      >
                        {myTaskStats.byWorkType.map((workType) => (
                          <div key={workType.gradingId}>
                            <Space
                              style={{
                                width: "100%",
                                justifyContent: "space-between",
                                marginBottom: 4,
                              }}
                            >
                              <Text strong style={{ fontSize: 13 }}>
                                {workType.gradingName}
                              </Text>
                              <Tag color="success">
                                {workType.completedImages} tasks
                              </Tag>
                            </Space>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              {workType.workType}
                            </Text>
                            {workType.projects &&
                              workType.projects.length > 0 && (
                                <div
                                  style={{
                                    marginTop: 8,
                                    paddingLeft: 12,
                                    borderLeft: "2px solid #f0f0f0",
                                  }}
                                >
                                  {workType.projects
                                    .slice(0, 2)
                                    .map((project, idx) => (
                                      <Text
                                        key={idx}
                                        type="secondary"
                                        style={{
                                          fontSize: 11,
                                          display: "block",
                                          marginTop: 4,
                                        }}
                                      >
                                        • {project.projectCode}:{" "}
                                        {project.imageQuantity} tasks
                                      </Text>
                                    ))}
                                </div>
                              )}
                          </div>
                        ))}
                      </Space>
                    </Spin>
                  </Card>
                )}
              </Col>
            </Row>
            {/* Projects Needing Invoice */}
            {canManageTransactions && projectsNeedingInvoice.length > 0 && (
              <Card
                title={
                  <Space>
                    <WarningOutlined style={{ color: "#ff4d4f" }} />
                    <Text strong>Action Required</Text>
                    <Badge count={projectsNeedingInvoice.length} />
                  </Space>
                }
                style={{ borderRadius: 8, borderTop: "3px solid #ff4d4f" }}
                size="small"
              >
                <Alert
                  message="Completed Projects Awaiting Invoice"
                  description="Walk-in clients with completed projects. Generate invoices to track revenue."
                  type="error"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
                <Spin spinning={completedProjectsLoading}>
                  <List
                    size="small"
                    dataSource={projectsNeedingInvoice.slice(0, 3)}
                    renderItem={(project) => (
                      <List.Item
                        style={{
                          border: "none",
                          padding: "12px 0",
                          cursor: "pointer",
                        }}
                        onClick={() => navigate("/projects")}
                      >
                        <Space
                          direction="vertical"
                          size={4}
                          style={{ width: "100%" }}
                        >
                          <Space
                            style={{
                              width: "100%",
                              justifyContent: "space-between",
                            }}
                          >
                            <Text strong style={{ fontSize: 13 }}>
                              {project.projectCode}
                            </Text>
                            <Text strong style={{ color: "#52c41a" }}>
                              ₹
                              {project.totalActualCost?.toFixed(0) ||
                                project.totalEstimatedCost?.toFixed(0)}
                            </Text>
                          </Space>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {project.name || "Untitled"} •{" "}
                            {project.client?.displayName}
                          </Text>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            Completed {dayjs(project.updatedAt).fromNow()}
                          </Text>
                        </Space>
                      </List.Item>
                    )}
                  />
                  {projectsNeedingInvoice.length > 3 && (
                    <Button
                      type="link"
                      size="small"
                      block
                      onClick={() => navigate("/projects")}
                      style={{ marginTop: 8 }}
                    >
                      View All {projectsNeedingInvoice.length} Projects →
                    </Button>
                  )}
                </Spin>
              </Card>
            )}
          </Space>
        </Col>
      </Row>

      {/* Quick Actions Footer */}
      <Card
        style={{
          marginTop: 16,
          borderRadius: 8,
          background: "linear-gradient(to right, #f6f9fc, #ffffff)",
        }}
      >
        <Title level={5} style={{ marginBottom: 16 }}>
          Quick Actions
        </Title>
        <Space size="large" wrap>
          <Button
            type="primary"
            icon={<ProjectOutlined />}
            onClick={() => navigate("/projects")}
          >
            All Projects
          </Button>
          <Button icon={<CheckCircleOutlined />} onClick={() => navigate("/")}>
            Task Board
          </Button>
          <Button
            icon={<CalendarOutlined />}
            onClick={() => navigate("/leaves")}
          >
            My Leaves
          </Button>
          {canManageTransactions && (
            <Button
              icon={<DollarOutlined />}
              onClick={() => navigate("/transactions")}
            >
              Transactions
            </Button>
          )}
          {isAdmin && (
            <Button
              icon={<TeamOutlined />}
              onClick={() => navigate("/user-dashboard")}
            >
              User Dashboard
            </Button>
          )}
          {canManageProjects && (
            <Button
              icon={<FileTextOutlined />}
              onClick={() => navigate("/ledger")}
            >
              Reports
            </Button>
          )}
        </Space>
      </Card>
    </div>
  );
};

export default Dashboard;
