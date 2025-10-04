import React from 'react';
import { Layout, Menu, Button, Dropdown, Avatar, Typography } from 'antd';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  CheckSquareOutlined,
  ProjectOutlined,
  UserOutlined,
  CalendarOutlined,
  LogoutOutlined,
  BellOutlined,
  TeamOutlined,
  DashboardOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useReactiveVar } from '@apollo/client';
import { userCacheVar } from '../cache/userCacheVar';
import ViewSwitcher from '../components/ViewSwitcher';

// Import pages
import TaskBoard from '../pages/FrontOffice/TaskBoard';
import ProjectView from '../pages/FrontOffice/ProjectView';
import Calendar from '../pages/FrontOffice/Calendar';
import ClientDashboard from '../pages/FrontOffice/ClientDashboard';
import ClientList from '../pages/FrontOffice/ClientList';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const FrontOfficeLayout = () => {
  const user = useReactiveVar(userCacheVar); // Use cache variable instead of auth context
  const { logout } = useAuth();
  const location = useLocation();

  // Allow employees and admin users (when they choose employee view)
  const role = user?.role?.name?.toLowerCase();
  if (role !== 'employee' && role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this area.</p>
        </div>
      </div>
    );
  }

  const menuItems = [
    {
      key: '/',
      icon: <CheckSquareOutlined />,
      label: <Link to="/">Task Board</Link>,
    },
    {
      key: '/projects',
      icon: <ProjectOutlined />,
      label: <Link to="/projects">Project View</Link>,
    },
    {
      key: '/calendar',
      icon: <CalendarOutlined />,
      label: <Link to="/calendar">Calendar</Link>,
    },
    {
      key: 'clients',
      icon: <TeamOutlined />,
      label: 'Client Management',
      children: [
        {
          key: '/clients/dashboard',
          icon: <DashboardOutlined />,
          label: <Link to="/clients/dashboard">Client Dashboard</Link>,
        },
        {
          key: '/clients',
          icon: <TeamOutlined />,
          label: <Link to="/clients">Client List</Link>,
        },
      ],
    },
  ];

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
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

  const getPageTitle = () => {
    if (location.pathname === '/') return 'Task Board';
    if (location.pathname === '/projects') return 'Project View';
    if (location.pathname === '/calendar') return 'Calendar';
    if (location.pathname === '/clients/dashboard') return 'Client Dashboard';
    if (location.pathname === '/clients') return 'Client Management';
    return 'Dashboard';
  };

  return (
    <Layout className="min-h-screen">
      <Sider
        theme="light"
        width={250}
        className="border-r border-gray-200"
      >
        <div className="p-4 border-b border-gray-200">
          <Title level={4} className="mb-0 text-gradient">
            MicroArt Workspace
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
              {getPageTitle()}
            </Title>
          </div>
          
          <div className="flex items-center space-x-4">
            <ViewSwitcher size="small" />
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
            <Route path="/" element={<TaskBoard />} />
            <Route path="/projects" element={<ProjectView />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/clients/dashboard" element={<ClientDashboard />} />
            <Route path="/clients" element={<ClientList />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
};

export default FrontOfficeLayout;