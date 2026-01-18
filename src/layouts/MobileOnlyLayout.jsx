import React, { useMemo } from 'react';
import { Layout, Menu, Drawer, Button, Space, Avatar, Badge, Typography } from 'antd';
import {
  MessageOutlined,
  BellOutlined,
  ProjectOutlined,
  TeamOutlined,
  FileTextOutlined,
  MenuOutlined,
  LogoutOutlined,
  HomeOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { useReactiveVar } from '@apollo/client';
import { userCacheVar } from '../cache/userCacheVar';
import { useAuth } from '../contexts/AuthContext';
import { MOBILE_ROUTES } from '../config/mobileRoutes';
import './MobileOnlyLayout.css';

const { Text } = Typography;

const { Header, Sider, Content } = Layout;

/**
 * Mobile-only layout component
 * Provides simplified navigation for mobile users
 * Only shows Chat, Reminders, Projects, Clients, and Reports
 */
const MobileOnlyLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useReactiveVar(userCacheVar);
  const { logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  // Hide bottom nav on chat detail pages to give more space for messages/input
  const isChatDetailPage = location.pathname.match(/\/mobile\/chat\/[^/]+$/) || location.pathname.match(/\/messages\/[^/]+$/);

  // Get user display name
  const userDisplayName = useMemo(() => {
    if (!user) return 'User';
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'User';
  }, [user]);

  // Mobile menu items
  const menuItems = [
    {
      key: MOBILE_ROUTES.REMINDERS,
      icon: <BellOutlined />,
      label: 'Reminders',
      onClick: () => {
        navigate(MOBILE_ROUTES.REMINDERS);
        setDrawerOpen(false);
      },
    },
    {
      key: MOBILE_ROUTES.CHAT,
      icon: <MessageOutlined />,
      label: 'Chat',
      onClick: () => {
        navigate(MOBILE_ROUTES.CHAT);
        setDrawerOpen(false);
      },
    },
    {
      key: MOBILE_ROUTES.PROJECTS,
      icon: <ProjectOutlined />,
      label: 'Projects',
      onClick: () => {
        navigate(MOBILE_ROUTES.PROJECTS);
        setDrawerOpen(false);
      },
    },
    {
      key: MOBILE_ROUTES.CLIENTS,
      icon: <TeamOutlined />,
      label: 'Clients',
      onClick: () => {
        navigate(MOBILE_ROUTES.CLIENTS);
        setDrawerOpen(false);
      },
    },
    {
      key: MOBILE_ROUTES.REPORTS,
      icon: <FileTextOutlined />,
      label: 'Reports',
      onClick: () => {
        navigate(MOBILE_ROUTES.REPORTS);
        setDrawerOpen(false);
      },
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      danger: true,
      onClick: () => {
        setDrawerOpen(false);
        logout();
      },
    },
  ];

  // Get current selected key based on location
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path.includes('/chat')) return MOBILE_ROUTES.CHAT;
    if (path.includes('/reminders')) return MOBILE_ROUTES.REMINDERS;
    if (path.includes('/projects')) return MOBILE_ROUTES.PROJECTS;
    if (path.includes('/clients')) return MOBILE_ROUTES.CLIENTS;
    if (path.includes('/reports')) return MOBILE_ROUTES.REPORTS;
    if (path.includes('/messages')) return MOBILE_ROUTES.CHAT;
    return MOBILE_ROUTES.REMINDERS;
  };

  return (
    <Layout className="mobile-only-layout">
      {/* Mobile Header - Matches Web */}
      <Header className="mobile-header">
        <div className="mobile-header-content">
          <Button
            type="text"
            icon={<MenuOutlined style={{ fontSize: '22px' }} />}
            onClick={() => setDrawerOpen(true)}
            className="mobile-menu-btn"
          />
          <div className="mobile-header-brand">
            <img 
              src={`${process.env.PUBLIC_URL}/images/images.png`}
              alt="MicroArt"
              className="mobile-header-logo-img"
            />
          </div>
          <Avatar 
            size={40}
            style={{ 
              backgroundColor: '#1890ff',
              fontWeight: '600',
              fontSize: '16px'
            }}
            icon={!userDisplayName ? <UserOutlined /> : null}
          >
            {userDisplayName ? userDisplayName.charAt(0).toUpperCase() : null}
          </Avatar>
        </div>
      </Header>

      {/* Main Content */}
      <Layout className="mobile-layout-wrapper">
        <Content className="mobile-content">
          {children}
        </Content>
      </Layout>

      {/* Modern Navigation Drawer */}
      <Drawer
        title={null}
        placement="left"
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
        width="85%"
        bodyStyle={{ padding: 0 }}
        headerStyle={{ display: 'none' }}
        className="mobile-drawer"
      >
        {/* User Profile Section */}
        <div className="drawer-profile-section">
          <div className="drawer-profile-bg"></div>
          <div className="drawer-profile-content">
            <Avatar 
              size={72}
              style={{ 
                backgroundColor: '#1890ff',
                marginBottom: '12px',
                border: '4px solid rgba(255, 255, 255, 0.9)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
              }}
              icon={!userDisplayName ? <UserOutlined /> : null}
            >
              {userDisplayName ? userDisplayName.charAt(0).toUpperCase() : null}
            </Avatar>
            <Text strong style={{ fontSize: '18px', color: '#fff', marginBottom: '4px', display: 'block' }}>
              {userDisplayName}
            </Text>
            <Text style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.85)' }}>
              {user?.email}
            </Text>
          </div>
        </div>

        <Menu
          mode="vertical"
          items={menuItems}
          selectedKeys={[getSelectedKey()]}
          style={{ border: 'none', paddingTop: '8px' }}
          className="mobile-drawer-menu"
        />
      </Drawer>

      {/* Modern Bottom Navigation Bar - Hidden on chat detail pages */}
      {!isChatDetailPage && (
        <div className="mobile-bottom-nav">
          <button
            className={`mobile-nav-item ${location.pathname.includes('/chat') ? 'active' : ''}`}
            onClick={() => navigate(MOBILE_ROUTES.CHAT)}
          >
            <div className="nav-icon-wrapper">
              <MessageOutlined className="nav-icon" />
              {location.pathname.includes('/chat') && <div className="nav-indicator"></div>}
            </div>
            <span className="nav-label">Chat</span>
          </button>
          
          <button
            className={`mobile-nav-item ${location.pathname.includes('/reminders') ? 'active' : ''}`}
            onClick={() => navigate(MOBILE_ROUTES.REMINDERS)}
          >
            <div className="nav-icon-wrapper">
              <BellOutlined className="nav-icon" />
              {location.pathname.includes('/reminders') && <div className="nav-indicator"></div>}
            </div>
            <span className="nav-label">Reminders</span>
          </button>
          
          <button
            className={`mobile-nav-item ${location.pathname.includes('/projects') ? 'active' : ''}`}
            onClick={() => navigate(MOBILE_ROUTES.PROJECTS)}
          >
            <div className="nav-icon-wrapper">
              <ProjectOutlined className="nav-icon" />
              {location.pathname.includes('/projects') && <div className="nav-indicator"></div>}
            </div>
            <span className="nav-label">Projects</span>
          </button>
          
          <button
            className={`mobile-nav-item ${location.pathname.includes('/clients') ? 'active' : ''}`}
            onClick={() => navigate(MOBILE_ROUTES.CLIENTS)}
          >
            <div className="nav-icon-wrapper">
              <TeamOutlined className="nav-icon" />
              {location.pathname.includes('/clients') && <div className="nav-indicator"></div>}
            </div>
            <span className="nav-label">Clients</span>
          </button>
          
          <button
            className={`mobile-nav-item ${location.pathname.includes('/reports') ? 'active' : ''}`}
            onClick={() => navigate(MOBILE_ROUTES.REPORTS)}
          >
            <div className="nav-icon-wrapper">
              <FileTextOutlined className="nav-icon" />
              {location.pathname.includes('/reports') && <div className="nav-indicator"></div>}
            </div>
            <span className="nav-label">Reports</span>
          </button>
        </div>
      )}
    </Layout>
  );
};

export default MobileOnlyLayout;
