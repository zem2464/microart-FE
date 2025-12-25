import React, { useState, useEffect } from "react";
import {
  Layout,
  Menu,
  Button,
  Dropdown,
  Avatar,
  Typography,
  Badge,
} from "antd";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import {
  DashboardOutlined,
  UserOutlined,
  SettingOutlined,
  BarChartOutlined,
  LogoutOutlined,
  BellOutlined,
  TagsOutlined,
  SecurityScanOutlined,
  DollarOutlined,
  WalletOutlined,
  SearchOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import { useAuth } from "../contexts/AuthContext";
import { useReactiveVar } from "@apollo/client";
import { userCacheVar } from "../cache/userCacheVar";
import ViewSwitcher from "../components/ViewSwitcher";
import {
  hasPermission,
  MODULES,
  ACTIONS,
  generatePermission,
} from "../config/permissions";
import GlobalSearchModal from "../components/GlobalSearchModal";

// Page Components
import Dashboard from "../pages/BackOffice/Dashboard";
import Users from "../pages/BackOffice/Users";
import Reports from "../pages/BackOffice/Reports";
import Settings from "../pages/BackOffice/Settings";
import TaskTypes from "../pages/BackOffice/TaskTypes";
import WorkTypes from "../pages/BackOffice/WorkTypes";
import Gradings from "../pages/BackOffice/Gradings";
import Roles from "../pages/BackOffice/Roles";
import AuditLogs from "../pages/BackOffice/AuditLogs";
import PaymentTypes from "../pages/BackOffice/PaymentTypes";
import UserGradingRateManagement from "../pages/Admin/UserGradingRateManagement";
import HolidayManagement from "../pages/BackOffice/HolidayManagement";

const { Header, Content } = Layout;
const { Title } = Typography;

const BackOfficeLayout = () => {
  const user = useReactiveVar(userCacheVar); // Use cache variable instead of auth context
  const { logout } = useAuth();
  const location = useLocation();
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  // Keyboard shortcut for global search (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchModalOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Check permissions for menu items (using MANAGE to show/hide menu)
  const canManageUsers = hasPermission(
    user,
    generatePermission(MODULES.USERS, ACTIONS.MANAGE)
  );
  const canManageRoles = hasPermission(
    user,
    generatePermission(MODULES.ROLES, ACTIONS.MANAGE)
  );
  const canManageUserManager = hasPermission(
    user,
    generatePermission(MODULES.USER_MANAGER, ACTIONS.MANAGE)
  );
  const canManageTaskTypes = hasPermission(
    user,
    generatePermission(MODULES.TASK_TYPES, ACTIONS.MANAGE)
  );
  const canManageWorkTypes = hasPermission(
    user,
    generatePermission(MODULES.WORK_TYPES, ACTIONS.MANAGE)
  );
  const canManageGradings = hasPermission(
    user,
    generatePermission(MODULES.GRADINGS, ACTIONS.MANAGE)
  );
  const canManageReports = hasPermission(
    user,
    generatePermission(MODULES.REPORTS, ACTIONS.MANAGE)
  );
  const canManageAuditLogs = hasPermission(
    user,
    generatePermission(MODULES.AUDIT_LOGS, ACTIONS.MANAGE)
  );

  // Build menu items based on permissions
  const allMenuItems = [
    {
      key: "/",
      icon: <DashboardOutlined />,
      label: <Link to="/">Dashboard</Link>,
    },
    canManageTaskTypes && {
      key: "/task-types",
      icon: <TagsOutlined />,
      label: <Link to="/task-types">Task Types</Link>,
    },
    canManageWorkTypes && {
      key: "/work-types",
      icon: <DollarOutlined />,
      label: <Link to="/work-types">Work Types</Link>,
    },
    canManageGradings && {
      key: "/gradings",
      icon: <DollarOutlined />,
      label: <Link to="/gradings">Gradings</Link>,
    },
    {
      key: "/payment-types",
      icon: <WalletOutlined />,
      label: <Link to="/payment-types">Payment Types</Link>,
    },
    canManageUsers && {
      key: "/users",
      icon: <UserOutlined />,
      label: <Link to="/users">Users</Link>,
    },
    canManageRoles && {
      key: "/roles",
      icon: <UserOutlined />, // You can use a different icon if desired
      label: <Link to="/roles">Roles</Link>,
    },
    canManageAuditLogs && {
      key: "/audit-logs",
      icon: <SecurityScanOutlined />,
      label: <Link to="/audit-logs">Audit Logs</Link>,
    },
    canManageGradings && {
      key: "/user-rates",
      icon: <DollarOutlined />,
      label: <Link to="/user-rates">Employee Rates</Link>,
    },
    {
      key: "/holidays",
      icon: <CalendarOutlined />,
      label: <Link to="/holidays">Holidays</Link>,
    },
    {
      key: "/settings",
      icon: <SettingOutlined />,
      label: <Link to="/settings">Settings</Link>,
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
      key: "settings",
      icon: <SettingOutlined />,
      label: "Settings",
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
  ];

  return (
    <Layout className="min-h-screen backoffice-layout">
      <Header className="bg-white border-b border-gray-200 flex items-center justify-between shadow-sm px-4">
        {/* Title and Menu */}
        <div className="flex items-center w-full min-w-0">
          <div className="flex items-center mr-8">
            <img
              src="/images/images.png"
              alt="MicroArt Logo"
              style={{ height: "130px", marginRight: "12px" }}
            />
            <Badge
              count="Admin"
              style={{
                backgroundColor: "#1890ff",
                color: "#ffffff",
                fontWeight: "500",
                fontSize: "10px",
              }}
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
          {/* Global Search Button */}
          <Button
            type="text"
            shape="circle"
            icon={<SearchOutlined />}
            onClick={() => setSearchModalOpen(true)}
            className="hover:bg-gray-100"
            title="Search Projects (Ctrl+K)"
          />

          <ViewSwitcher size="small" />
          <Badge count={5} size="small">
            <Button type="text" icon={<BellOutlined />} />
          </Badge>
          <Dropdown
            menu={{ items: userMenuItems }}
            placement="bottomRight"
            trigger={["click"]}
          >
            <div className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors">
              <Avatar
                icon={<UserOutlined />}
                size={36}
                className="bg-blue-500"
              />
              <span className="font-medium text-base text-gray-800">
                {user?.firstName} {user?.lastName}
              </span>
            </div>
          </Dropdown>
        </div>
      </Header>

      <Content className="p-6 bg-gray-50 min-h-[calc(100vh-64px)]">
        <div className="w-full max-w-none mx-auto px-4">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/task-types" element={<TaskTypes />} />
            <Route path="/work-types" element={<WorkTypes />} />
            <Route path="/gradings" element={<Gradings />} />
            <Route path="/payment-types" element={<PaymentTypes />} />
            <Route path="/users" element={<Users />} />
            <Route path="/roles" element={<Roles />} />
            <Route path="/audit-logs" element={<AuditLogs />} />
            <Route path="/user-rates" element={<UserGradingRateManagement />} />
            <Route path="/holidays" element={<HolidayManagement />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
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

export default BackOfficeLayout;
