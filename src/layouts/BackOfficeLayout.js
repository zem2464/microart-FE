import React from 'react';
import { Layout, Menu, Button, Dropdown, Avatar, Typography } from 'antd';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  ProjectOutlined,
  UserOutlined,
  SettingOutlined,
  BarChartOutlined,
  LogoutOutlined,
  BellOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

// Import pages
import Dashboard from '../pages/BackOffice/Dashboard';
import Projects from '../pages/BackOffice/Projects';
import Users from '../pages/BackOffice/Users';
import Reports from '../pages/BackOffice/Reports';
import Settings from '../pages/BackOffice/Settings';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const BackOfficeLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: <Link to="/">Dashboard</Link>,
    },
    {
      key: '/projects',
      icon: <ProjectOutlined />,
      label: <Link to="/projects">Projects</Link>,
    },
    {
      key: '/users',
      icon: <UserOutlined />,
      label: <Link to="/users">Users</Link>,
    },
    {
      key: '/reports',
      icon: <BarChartOutlined />,
      label: <Link to="/reports">Reports</Link>,
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: <Link to="/settings">Settings</Link>,
    },
  ];

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: logout,
    },
  ];

  return (
    <Layout className="min-h-screen">
      <Sider
        theme="light"
        width={250}
        className="border-r border-gray-200"
      >
        <div className="p-4 border-b border-gray-200">
          <Title level={4} className="mb-0 text-gradient">
            MicroArt BackOffice
          </Title>
        </div>
        
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          className="border-r-0"
        />
      </Sider>
      
      <Layout>
        <Header className="bg-white border-b border-gray-200 px-6 flex justify-between items-center">
          <div>
            <Title level={4} className="mb-0">
              {location.pathname === '/' && 'Dashboard'}
              {location.pathname === '/projects' && 'Projects'}
              {location.pathname === '/users' && 'Users'}
              {location.pathname === '/reports' && 'Reports'}
              {location.pathname === '/settings' && 'Settings'}
            </Title>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button type="text" icon={<BellOutlined />} />
            
            <Dropdown
              menu={{ items: userMenuItems }}
              placement="bottomRight"
              trigger={['click']}
            >
              <div className="flex items-center space-x-2 cursor-pointer">
                <Avatar icon={<UserOutlined />} />
                <span className="hidden md:inline">
                  {user?.firstName} {user?.lastName}
                </span>
              </div>
            </Dropdown>
          </div>
        </Header>
        
        <Content className="p-6 bg-gray-50">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/users" element={<Users />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
};

export default BackOfficeLayout;