import React, { useState, useEffect } from "react";
import { Layout, Menu, Button, Dropdown, Avatar, Badge } from "antd";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import {
  DashboardOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  BellOutlined,
  SearchOutlined,
  DollarOutlined,
  ToolOutlined,
  GiftOutlined,
  AlertOutlined,
} from "@ant-design/icons";
import { useAuth } from "../contexts/AuthContext";
import { useReactiveVar } from "@apollo/client";
import { userCacheVar } from "../cache/userCacheVar";
import ViewSwitcher from "../components/ViewSwitcher";
import UpdateNotification from "../components/UpdateNotification";
import AdvancePayModal from "../components/AdvancePayModal";
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
import SalaryManagement from "../pages/BackOffice/SalaryManagement";
import Finance from "../pages/BackOffice/Finance";
import Reminders from "../pages/BackOffice/Reminders";

const { Header, Content } = Layout;

const BackOfficeLayout = () => {
  const user = useReactiveVar(userCacheVar); // Use cache variable instead of auth context
  const { logout } = useAuth();
  const location = useLocation();
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [advancePayModalOpen, setAdvancePayModalOpen] = useState(false);

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
  const canManageReports = hasPermission(
    user,
    generatePermission(MODULES.REPORTS, ACTIONS.MANAGE)
  );
  const canManageAuditLogs = hasPermission(
    user,
    generatePermission(MODULES.AUDIT_LOGS, ACTIONS.MANAGE)
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
  const canViewFinance = hasPermission(
    user,
    generatePermission(MODULES.FINANCE, ACTIONS.READ)
  );

  const navSections = [
    {
      key: "/",
      icon: <DashboardOutlined />,
      label: <Link to="/">Dashboard</Link>,
    },
    {
      key: "/reminders",
      icon: <AlertOutlined />,
      label: <Link to="/reminders">Reminders</Link>,
    },
    {
      key: "finance",
      label: "Finance",
      icon: <DollarOutlined />,
      children: [
        canViewFinance && {
          key: "/finance",
          label: <Link to="/finance">Finance</Link>,
        },
        {
          key: "/payment-types",
          label: <Link to="/payment-types">Payment Types</Link>,
        },
        canManageUsers && {
          key: "/salary-management",
          label: <Link to="/salary-management">Salary Management</Link>,
        },
      ].filter(Boolean),
    },
    (canManageUsers || canManageRoles) && {
      key: "people",
      label: "People",
      icon: <UserOutlined />,
      children: [
        canManageUsers && {
          key: "/users",
          label: <Link to="/users">Employees</Link>,
        },
        canManageRoles && {
          key: "/roles",
          label: <Link to="/roles">Roles</Link>,
        },
      ].filter(Boolean),
    },
    {
      key: "system",
      label: "System",
      icon: <SettingOutlined />,
      children: [
        {
          key: "/holidays",
          label: <Link to="/holidays">Holidays</Link>,
        },
        canManageAuditLogs && {
          key: "/audit-logs",
          label: <Link to="/audit-logs">Audit Log</Link>,
        },
        canManageReports && {
          key: "/reports",
          label: <Link to="/reports">Reports</Link>,
        },
      ].filter(Boolean),
    },
    {
      key: "configuration",
      label: "Configuration",
      icon: <ToolOutlined />,
      children: [
        canManageTaskTypes && {
          key: "/task-types",
          label: <Link to="/task-types">Task Types</Link>,
        },
        canManageWorkTypes && {
          key: "/work-types",
          label: <Link to="/work-types">Work Types</Link>,
        },
        canManageGradings && {
          key: "/gradings",
          label: <Link to="/gradings">Gradings</Link>,
        },
        canManageGradings && {
          key: "/user-rates",
          label: <Link to="/user-rates">Employee Rates</Link>,
        },
      ].filter(Boolean),
    },
  ].filter(Boolean);

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
              src={`${process.env.PUBLIC_URL}/images/images.png`}
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
            items={navSections}
            className="flex-1 border-b-0"
            style={{ flex: 1, minWidth: 0 }}
          />
        </div>

        {/* User Controls */}
        <div className="flex items-center space-x-4 ml-8">
          {/* Advance Pay Button */}
          <Button
            type="primary"
            shape="round"
            icon={<GiftOutlined />}
            onClick={() => setAdvancePayModalOpen(true)}
            className="hover:bg-blue-600"
          >
            Advance Pay
          </Button>

          {/* Global Search Button */}
          <Button
            type="text"
            shape="circle"
            icon={<SearchOutlined />}
            onClick={() => setSearchModalOpen(true)}
            className="hover:bg-gray-100"
            title="Search Projects (Ctrl+K)"
          />

          <UpdateNotification />

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
            <Route path="/reminders" element={<Reminders />} />
            <Route path="/task-types" element={<TaskTypes />} />
            <Route path="/work-types" element={<WorkTypes />} />
            <Route path="/gradings" element={<Gradings />} />
            <Route path="/finance" element={<Finance />} />
            <Route path="/payment-types" element={<PaymentTypes />} />
            <Route path="/users" element={<Users />} />
            <Route path="/roles" element={<Roles />} />
            <Route path="/audit-logs" element={<AuditLogs />} />
            <Route path="/user-rates" element={<UserGradingRateManagement />} />
            <Route path="/holidays" element={<HolidayManagement />} />
            <Route path="/salary-management" element={<SalaryManagement />} />
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

      {/* Advance Pay Modal */}
      <AdvancePayModal
        open={advancePayModalOpen}
        onClose={() => setAdvancePayModalOpen(false)}
      />

    </Layout>
  );
};

export default BackOfficeLayout;
