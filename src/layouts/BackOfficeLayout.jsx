import React from "react";
import { Layout, Menu, Button, Dropdown, Avatar, Typography, Badge } from "antd";
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
} from "@ant-design/icons";
import { useAuth } from "../contexts/AuthContext";
import { useReactiveVar } from "@apollo/client";
import { userCacheVar } from "../cache/userCacheVar";
import ViewSwitcher from "../components/ViewSwitcher";

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

const { Header, Content } = Layout;
const { Title } = Typography;

const BackOfficeLayout = () => {
  const user = useReactiveVar(userCacheVar); // Use cache variable instead of auth context
  const { logout } = useAuth();
  const location = useLocation();

  const menuItems = [
    {
      key: "/",
      icon: <DashboardOutlined />,
      label: <Link to="/">Dashboard</Link>,
    },
    {
      key: "/task-types",
      icon: <TagsOutlined />,
      label: <Link to="/task-types">Task Types</Link>,
    },
    {
      key: "/work-types",
      icon: <DollarOutlined />,
      label: <Link to="/work-types">Work Types</Link>,
    },
    {
      key: "/gradings",
      icon: <DollarOutlined />,
      label: <Link to="/gradings">Gradings</Link>,
    },
    {
      key: "/users",
      icon: <UserOutlined />,
      label: <Link to="/users">Users</Link>,
    },
    {
      key: "/reports",
      icon: <BarChartOutlined />,
      label: <Link to="/reports">Reports</Link>,
    },
    {
      key: "/roles",
      icon: <UserOutlined />, // You can use a different icon if desired
      label: <Link to="/roles">Roles</Link>,
    },
    {
      key: "/audit-logs",
      icon: <SecurityScanOutlined />,
      label: <Link to="/audit-logs">Audit Logs</Link>,
    },
    {
      key: "/settings",
      icon: <SettingOutlined />, 
      label: <Link to="/settings">Settings</Link>,
    },
  ];

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
      <Header className="bg-white border-b border-gray-200 px-6 flex items-center justify-between shadow-sm">
        {/* Title and Menu */}
        <div className="flex items-center w-full min-w-0">
          <div className="flex items-center mr-8">
            <Title level={4} className="mb-0 mr-3 text-gradient">
              MicroArt Admin
            </Title>
            <Badge 
              count="Admin" 
              style={{ 
                backgroundColor: '#1890ff', 
                color: '#ffffff',
                fontWeight: '500',
                fontSize: '10px'
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
              minWidth: 0
            }}
          />
        </div>
        
        {/* User Controls */}
        <div className="flex items-center space-x-4 ml-8">
          <ViewSwitcher size="small" />
          <Badge count={5} size="small">
            <Button 
              type="text" 
              icon={<BellOutlined />} 
            />
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
            <Route path="/users" element={<Users />} />
            <Route path="/roles" element={<Roles />} />
            <Route path="/audit-logs" element={<AuditLogs />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </Content>
    </Layout>
  );
};

export default BackOfficeLayout;
