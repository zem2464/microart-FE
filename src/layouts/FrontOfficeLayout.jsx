import { useEffect } from "react";
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
import { Routes, Route, Link, useLocation } from "react-router-dom";
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
} from "@ant-design/icons";
import { useAuth } from "../contexts/AuthContext";
import { useReactiveVar } from "@apollo/client";
import { userCacheVar } from "../cache/userCacheVar";
import ViewSwitcher from "../components/ViewSwitcher";
import { useAppDrawer } from "../contexts/DrawerContext";

// Import pages
import TaskTable from "../pages/FrontOffice/TaskTable";
import ProjectManagement from "../pages/FrontOffice/ProjectManagement";
import ClientDashboard from "../pages/FrontOffice/ClientDashboard";
import ClientList from "../pages/FrontOffice/ClientList";
import LedgerReport from "../pages/FrontOffice/LedgerReport";

const { Header, Content } = Layout;
const { Title } = Typography;

const FrontOfficeLayout = () => {
  const user = useReactiveVar(userCacheVar);
  const { logout } = useAuth();
  const location = useLocation();
  const { showClientFormDrawer, showProjectFormDrawer } = useAppDrawer();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Alt+C for Add Client
      if (e.altKey && e.key === "c") {
        e.preventDefault();
        showClientFormDrawer(null, "create");
      }
      // Alt+P for Add Project
      if (e.altKey && e.key === "p") {
        e.preventDefault();
        showProjectFormDrawer(null, "create");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showClientFormDrawer, showProjectFormDrawer]);

  // Allow employees and admin users (when they choose employee view)
  const role = user?.role?.roleType?.toLowerCase();
  if (role !== "employee" && role !== "admin" && role !== "manager") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-gray-600">
            You don't have permission to access this area.
          </p>
        </div>
      </div>
    );
  }

  const menuItems = [
    {
      key: "/",
      icon: <CheckSquareOutlined />,
      label: <Link to="/">Task Board</Link>,
    },
    {
      key: "/projects",
      icon: <ProjectOutlined />,
      label: <Link to="/projects">Projects</Link>,
    },
    {
      key: "/ledger",
      icon: <FileTextOutlined />,
      label: <Link to="/ledger">Ledger</Link>,
    },
    {
      key: "/clients",
      icon: <TeamOutlined />,
      label: <Link to="/clients">Clients</Link>,
    },
    {
      key: "clients",
      icon: <TeamOutlined />,
      label: "Client Management",
      children: [
        {
          key: "/clients/dashboard",
          icon: <DashboardOutlined />,
          label: <Link to="/clients/dashboard">Client Dashboard</Link>,
        },
        {
          key: "/clients",
          icon: <TeamOutlined />,
          label: <Link to="/clients">Client List</Link>,
        },
      ],
    },
  ];

  const userMenuItems = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "Profile",
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
    <Layout className="frontoffice-layout">
      <Header className="bg-white border-b border-gray-200 px-6 flex items-center justify-between shadow-sm">
        {/* Title and Menu */}
        <div className="flex items-center w-full min-w-0">
          <div className="flex items-center mr-8">
            <Title level={4} className="mb-0 mr-3 text-gradient">
              MicroArt
            </Title>
            <Badge
              count="Employee"
              style={{
                backgroundColor: "#52c41a",
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
          {/* Quick Action Buttons */}
          <Space size="small">
            <Tooltip title="Add New Client (Alt+C)" placement="bottom">
              <Button
                type="primary"
                shape="circle"
                icon={<UserAddOutlined />}
                onClick={() => showClientFormDrawer(null, "create")}
                className="bg-green-500 hover:bg-green-600 border-green-500"
              />
            </Tooltip>
            <Tooltip title="Add New Project (Alt+P)" placement="bottom">
              <Button
                type="primary"
                shape="circle"
                icon={<PlusOutlined />}
                onClick={() => showProjectFormDrawer(null, "create")}
              />
            </Tooltip>
          </Space>

          <ViewSwitcher size="small" />
          <Badge count={3} size="small">
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
                className="bg-green-500"
              />
              <span className="font-medium text-base text-gray-800">
                {user?.firstName} {user?.lastName}
              </span>
            </div>
          </Dropdown>
        </div>
      </Header>

      <Content className="p-2 bg-gray-50 min-h-[calc(100vh-64px)]">
        <div className="w-full max-w-none mx-auto px-4">
          <Routes>
            <Route path="/" element={<TaskTable />} />
            <Route path="/projects" element={<ProjectManagement />} />
            <Route path="/ledger" element={<LedgerReport />} />
            <Route path="/clients/dashboard" element={<ClientDashboard />} />
            <Route path="/clients" element={<ClientList />} />
          </Routes>
        </div>
      </Content>
    </Layout>
  );
};

export default FrontOfficeLayout;
