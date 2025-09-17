import React from "react";
import { Layout, Menu, Button, Dropdown, Avatar, Typography } from "antd";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import {
  DashboardOutlined,
  ProjectOutlined,
  UserOutlined,
  SettingOutlined,
  BarChartOutlined,
  LogoutOutlined,
  BellOutlined,
  TagsOutlined,
} from "@ant-design/icons";
import { useAuth } from "../contexts/AuthContext";
import { useReactiveVar } from "@apollo/client";
import { userCacheVar } from "../cache/userCacheVar";
import ViewSwitcher from "../components/ViewSwitcher";

// Page Components
import Dashboard from "../pages/BackOffice/Dashboard";
import Projects from "../pages/BackOffice/Projects";
import Users from "../pages/BackOffice/Users";
import Reports from "../pages/BackOffice/Reports";
import Settings from "../pages/BackOffice/Settings";
import TaskTypes from "../pages/BackOffice/TaskTypes";

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const BackOfficeLayout = () => {
  // Helper to get page title from route
  const getPageTitle = () => {
    switch (location.pathname) {
      case "/":
        return "Dashboard";
      case "/projects":
        return "Projects";
      case "/task-types":
        return "Task Types";
      case "/users":
        return "Users";
      case "/reports":
        return "Reports";
      case "/settings":
        return "Settings";
      default:
        return "";
    }
  };
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
      key: "/projects",
      icon: <ProjectOutlined />,
      label: <Link to="/projects">Projects</Link>,
    },
    {
      key: "/task-types",
      icon: <TagsOutlined />,
      label: <Link to="/task-types">Task Types</Link>,
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
    <Layout>
      <Header className="bg-white border-b border-gray-200 px-6 flex items-center justify-between">
        {/* Title and Menu */}
        <div className="flex items-center  w-full min-w-0">
          <Title level={4} className="mb-0 text-gradient mt-0 mr-8 p-0">
            MicroArt BackOffice
          </Title>
          <Menu
            mode="horizontal"
            selectedKeys={[location.pathname]}
            items={menuItems}
            className="flex-1 border-b-0"
            style={{ flex: 1, minWidth: 0 }}
          />
        </div>
        {/* User Controls */}
        <div className="flex items-center space-x-4 ml-8">
          <ViewSwitcher size="small" />
          <Button type="text" icon={<BellOutlined />} />
          <Dropdown
            menu={{ items: userMenuItems }}
            placement="bottomRight"
            trigger={["click"]}
          >
            <div className="flex items-center space-x-2 cursor-pointer">
              <Avatar icon={<UserOutlined />} size={36} />
              <span className="font-medium text-base text-gray-800">
                {user?.firstName} {user?.lastName}
              </span>
            </div>
          </Dropdown>
        </div>
      </Header>
      {/* Page Title Bar */}

      <Content className="p-6 bg-gray-50">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/task-types" element={<TaskTypes />} />
          <Route path="/users" element={<Users />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Content>
    </Layout>
  );
};

export default BackOfficeLayout;
