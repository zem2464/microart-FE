import { useEffect, useState } from "react";
import {
  Layout,
  Menu,
  Button,
  Dropdown,
  Avatar,
  Typography,
  Badge,
  Space,
  Tooltip,
} from "antd";
import {
  Routes,
  Route,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  CheckSquareOutlined,
  ProjectOutlined,
  UserOutlined,
  LogoutOutlined,
  BellOutlined,
  TeamOutlined,
  DashboardOutlined,
  PlusOutlined,
  UserAddOutlined,
  FileTextOutlined,
  DollarOutlined,
  TransactionOutlined,
  SearchOutlined,
  CalendarOutlined,
  BarChartOutlined,
  AlertOutlined,
} from "@ant-design/icons";
import { useAuth } from "../contexts/AuthContext";
import { usePayment } from "../contexts/PaymentContext";
import { useReactiveVar, useQuery, useSubscription } from "@apollo/client";
import { userCacheVar } from "../cache/userCacheVar";
import ViewSwitcher from "../components/ViewSwitcher";
import { useAppDrawer } from "../contexts/DrawerContext";
import ChatTrigger from "../components/Chat/ChatTrigger";
import NotificationDropdown from "../components/NotificationDropdown";
import UpdateNotification from "../components/UpdateNotification";
import {
  hasPermission,
  MODULES,
  ACTIONS,
  generatePermission,
} from "../config/permissions";
import GlobalSearchModal from "../components/GlobalSearchModal";
import { GET_TODAY_PENDING_REMINDERS_COUNT } from "../gql/reminders";
import { NOTIFICATION_CREATED_SUBSCRIPTION } from "../graphql/notifications";

// Import pages
import Dashboard from "../pages/FrontOffice/Dashboard";
import TaskTable from "../pages/FrontOffice/TaskTable";
import ProjectManagement from "../pages/FrontOffice/ProjectManagement";
import ClientDashboard from "../pages/FrontOffice/ClientDashboard";
import ClientList from "../pages/FrontOffice/ClientList";
import LedgerReport from "../pages/FrontOffice/LedgerReport";
import Transactions from "../pages/FrontOffice/Transactions";
import UserDashboard from "../pages/FrontOffice/UserDashboard";
import Messages from "../pages/FrontOffice/Messages";
import MyLeaves from "../pages/FrontOffice/MyLeaves";
import LeaveApprovals from "../pages/FrontOffice/LeaveApprovals";
import AllUsersLeaves from "../pages/FrontOffice/AllUsersLeaves";
import Reminders from "../pages/FrontOffice/Reminders";

const { Header, Content } = Layout;
const { Title } = Typography;

const FrontOfficeLayout = () => {
  const user = useReactiveVar(userCacheVar);
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { showClientFormDrawer, showProjectFormDrawer } = useAppDrawer();
  const { openPaymentModal } = usePayment();
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  // Query for pending reminders count
  const { data: remindersData, loading: remindersLoading, error: remindersError, refetch: refetchReminderCount } = useQuery(GET_TODAY_PENDING_REMINDERS_COUNT, {
    fetchPolicy: "cache-and-network",
    pollInterval: 5 * 60 * 1000, // Poll every 5 minutes as backup
    skip: !user, // Skip if user is not logged in
  });

  const pendingRemindersCount = remindersData?.todayPendingRemindersCount || 0;

  // Subscribe to notifications to refetch reminder count in real-time
  useSubscription(NOTIFICATION_CREATED_SUBSCRIPTION, {
    onData: ({ data: subData }) => {
      const notification = subData?.data?.notificationCreated;
      console.log('[FrontOfficeLayout] Notification received:', {
        type: notification?.type,
        title: notification?.title,
        willRefetch: notification?.type === 'reminder'
      });
      
      // Refetch reminder count when reminder-related notifications arrive
      if (notification && notification.type === 'reminder') {
        console.log('[FrontOfficeLayout] Refetching reminder count...');
        refetchReminderCount();
      }
    },
    onError: (error) => {
      console.error('[FrontOfficeLayout] Subscription error:', error);
    },
    skip: !user, // Skip if user is not logged in
  });

  // Log for debugging
  useEffect(() => {
    if (remindersError) {
      console.error('Error fetching reminders count:', remindersError);
    }
    console.log('Pending reminders count:', pendingRemindersCount);
  }, [pendingRemindersCount, remindersError]);

  // Check permissions for menu items (using MANAGE to show/hide menu)
  const canManageTasks = hasPermission(
    user,
    generatePermission(MODULES.TASKS, ACTIONS.MANAGE)
  );
  const canManageProjects = hasPermission(
    user,
    generatePermission(MODULES.PROJECTS, ACTIONS.MANAGE)
  );
  const canManageTransactions = hasPermission(
    user,
    generatePermission(MODULES.CLIENT_TRANSACTIONS, ACTIONS.MANAGE)
  );
  const canManageReports = hasPermission(
    user,
    generatePermission(MODULES.REPORTS, ACTIONS.MANAGE)
  );
  const canManageUserDashboard = hasPermission(
    user,
    generatePermission(MODULES.USER_MANAGER, ACTIONS.MANAGE)
  );
  const canManageClients = hasPermission(
    user,
    generatePermission(MODULES.CLIENTS, ACTIONS.MANAGE)
  );

  // Check permissions for actions
  const canCreateClient = hasPermission(
    user,
    generatePermission(MODULES.CLIENTS, ACTIONS.CREATE)
  );
  const canCreateProject = hasPermission(
    user,
    generatePermission(MODULES.PROJECTS, ACTIONS.CREATE)
  );
  const canCreateTransaction = hasPermission(
    user,
    generatePermission(MODULES.CLIENT_TRANSACTIONS, ACTIONS.CREATE)
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+K or Cmd+K for Global Search
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchModalOpen(true);
      }
      // Alt+C for Add Client
      if (e.altKey && e.key === "c" && canCreateClient) {
        e.preventDefault();
        showClientFormDrawer(null, "create");
      }
      // Alt+P for Add Project
      if (e.altKey && e.key === "p" && canCreateProject) {
        e.preventDefault();
        showProjectFormDrawer(null, "create");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    showClientFormDrawer,
    showProjectFormDrawer,
    canCreateClient,
    canCreateProject,
  ]);

  // Build menu items based on permissions - organized by usage and importance
  const allMenuItems = [
    // Dashboard - Always show for all users
    {
      key: "/dashboard",
      icon: <DashboardOutlined />,
      label: <Link to="/dashboard">Dashboard</Link>,
    },
    {
      key: "/leaves",
      icon: <CalendarOutlined />,
      label: <Link to="/leaves">Leave Applied</Link>,
    },
    // Leave Calendar
    {
      key: "/all-users-leaves",
      icon: <CalendarOutlined />,
      label: <Link to="/all-users-leaves">Leave Calendar</Link>,
    },
    // Most Used - Direct Access
    canManageTasks && {
      key: "/",
      icon: <CheckSquareOutlined />,
      label: <Link to="/">Task Board</Link>,
    },
    canManageProjects && {
      key: "/projects",
      icon: <ProjectOutlined />,
      label: <Link to="/projects">Projects</Link>,
    },
    // Client Management
    canManageClients && {
      key: "clients",
      icon: <TeamOutlined />,
      label: "Clients",
      children: [
        {
          key: "/clients/dashboard",
          icon: <BarChartOutlined />,
          label: <Link to="/clients/dashboard">Client Insights</Link>,
        },
        {
          key: "/clients",
          icon: <TeamOutlined />,
          label: <Link to="/clients">Client List</Link>,
        },
      ],
    },
    // Finance Management
    (canManageTransactions || canManageReports) && {
      key: "finance",
      icon: <DollarOutlined />,
      label: "Finance",
      children: [
        canManageTransactions && {
          key: "/transactions",
          icon: <TransactionOutlined />,
          label: <Link to="/transactions">Transactions</Link>,
        },
        canManageReports && {
          key: "/ledger",
          icon: <FileTextOutlined />,
          label: <Link to="/ledger">Ledger Report</Link>,
        },
      ].filter(Boolean),
    },
    // User Dashboard
    canManageUserDashboard && {
      key: "/user-dashboard",
      icon: <UserOutlined />,
      label: <Link to="/user-dashboard">User Dashboard</Link>,
    },
  ].filter(Boolean); // Remove null/false items

  const menuItems = allMenuItems;

  const userMenuItems = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "Profile",
    },
    {
      key: "leaves",
      icon: <CalendarOutlined />,
      label: "My Leaves",
      onClick: () => navigate("/leaves"),
    },
    {
      key: "all-users-leaves",
      icon: <CalendarOutlined />,
      label: "Leave Calendar",
      onClick: () => navigate("/all-users-leaves"),
    },
    (user?.role?.roleType === "ADMIN" ||
      user?.role?.roleType === "MANAGER") && {
      key: "leave-approvals",
      icon: <CheckSquareOutlined />,
      label: "Leave Approvals",
      onClick: () => navigate("/leave-approvals"),
    },
    {
      type: "divider",
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Logout",
      onClick: logout,
    },
  ].filter(Boolean);

  return (
    <Layout className="frontoffice-layout m-0 p-0">
      <Header className="bg-white border-b border-gray-200 flex items-center justify-between shadow-sm px-4">
        {/* Title and Menu */}
        <div className="flex items-center w-full min-w-0">
          <div className="flex items-center">
            <img
              src={`${process.env.PUBLIC_URL}/images/images.png`}
              alt="MicroArt Logo"
              style={{ height: "130px", marginRight: "12px" }}
            />
          </div>
          <Menu
            mode="horizontal"
            selectedKeys={[location.pathname]}
            items={menuItems}
            className="flex-1 border-b-0"
            style={{
              flex: 1,
              minWidth: 0,
            }}
          />
        </div>

        {/* User Controls */}
        <div className="flex items-center space-x-4 ml-8">
          {/* Quick Action Buttons */}
          <Space size="small">
            {canCreateClient && (
              <Tooltip title="Add New Client (Alt+C)" placement="bottom">
                <Button
                  type="primary"
                  shape="circle"
                  icon={<UserAddOutlined />}
                  onClick={() => showClientFormDrawer(null, "create")}
                  className="bg-green-500 hover:bg-green-600 border-green-500"
                />
              </Tooltip>
            )}
            {canCreateProject && (
              <Tooltip title="Add New Project (Alt+P)" placement="bottom">
                <Button
                  type="primary"
                  shape="circle"
                  icon={<PlusOutlined />}
                  onClick={() => showProjectFormDrawer(null, "create")}
                />
              </Tooltip>
            )}
            {canCreateTransaction && (
              <Tooltip title="Record Payment" placement="bottom">
                <Button
                  type="primary"
                  shape="circle"
                  icon={<DollarOutlined />}
                  onClick={() => openPaymentModal()}
                  className="bg-blue-500 hover:bg-blue-600 border-blue-500"
                />
              </Tooltip>
            )}
          </Space>

          {/* Global Search Button */}
          <Tooltip title="Search Projects (Ctrl+K)" placement="bottom">
            <Button
              type="text"
              shape="circle"
              icon={<SearchOutlined />}
              onClick={() => setSearchModalOpen(true)}
              className="hover:bg-gray-100"
            />
          </Tooltip>
          <UpdateNotification />
          <ChatTrigger />
          <Tooltip title="Reminders" placement="bottom">
            <Badge 
              count={pendingRemindersCount} 
              showZero={false}
              overflowCount={99}
              style={{ backgroundColor: '#ff4d4f' }}
            >
              <Button
                type="text"
                shape="circle"
                icon={<AlertOutlined />}
                onClick={() => navigate("/reminders")}
                className="hover:bg-gray-100"
              />
            </Badge>
          </Tooltip>
          <ViewSwitcher size="small" />
          <NotificationDropdown />

          <Dropdown
            menu={{ items: userMenuItems }}
            placement="bottomRight"
            trigger={["click"]}
          >
            <div className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors">
              <Avatar
                icon={<UserOutlined />}
                size={36}
                className="bg-green-500"
              />
              <span className="font-medium text-base text-gray-800">
                {user?.firstName} {user?.lastName}
              </span>
            </div>
          </Dropdown>
        </div>
      </Header>

      <Content
        className={
          location.pathname.startsWith("/messages")
            ? "bg-white h-[calc(100vh-64px)] w-full"
            : "bg-gray-50 min-h-[calc(100vh-64px)]"
        }
        style={{ margin: 0, padding: 0 }}
      >
        <div
          className={
            location.pathname.startsWith("/messages")
              ? "w-full h-full flex flex-col"
              : "w-full max-w-none"
          }
        >
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/" element={<TaskTable />} />
            <Route path="/projects" element={<ProjectManagement />} />
            <Route path="/reminders" element={<Reminders />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/ledger" element={<LedgerReport />} />
            <Route path="/user-dashboard" element={<UserDashboard />} />
            <Route path="/clients/dashboard" element={<ClientDashboard />} />
            <Route path="/clients" element={<ClientList />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/messages/:roomId" element={<Messages />} />
            <Route path="/leaves" element={<MyLeaves />} />
            <Route path="/leave-approvals" element={<LeaveApprovals />} />
            <Route path="/all-users-leaves" element={<AllUsersLeaves />} />
          </Routes>
        </div>
      </Content>

      {/* Global Search Modal */}
      <GlobalSearchModal
        open={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
      />
    </Layout>
  );
};

export default FrontOfficeLayout;
