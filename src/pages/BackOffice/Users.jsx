import React, { useState } from "react";
import { Button, Card, Input, message, Popconfirm, Table, Tag, Avatar, Space, Tooltip } from "antd";
import { EditOutlined, DeleteOutlined, SearchOutlined, UserOutlined, EyeOutlined, KeyOutlined } from "@ant-design/icons";
import { useQuery, useMutation } from "@apollo/client";
import { GET_USERS, DELETE_USER, UPDATE_USER } from "../../gql/users";
import { useAppDrawer } from "../../contexts/DrawerContext";
import dayjs from "dayjs";

const Users = () => {
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const { showUserFormDrawer, showUserDetailDrawer } = useAppDrawer();

  const { data, loading: queryLoading, refetch } = useQuery(GET_USERS, {
    fetchPolicy: "cache-and-network",
  });

  const [deleteUser] = useMutation(DELETE_USER);
  const [updateUser] = useMutation(UPDATE_USER);

  const handleEdit = (user) => {
    showUserFormDrawer(user, 'edit', async () => refetch());
  };

  const handleCreate = () => {
    showUserFormDrawer(null, 'create', () => refetch());
  };

  const handleView = (user) => {
    showUserDetailDrawer(user);
  };

  const handleDelete = async (user) => {
    setLoading(true);
    try {
      await deleteUser({ variables: { id: user.id } });
      message.success("User deleted successfully");
      refetch();
    } catch (e) {
      message.error("Delete failed: " + e.message);
    }
    setLoading(false);
  };

  const handleResetPassword = async (user) => {
    setLoading(true);
    try {
      await updateUser({ 
        variables: { 
          id: user.id,
          input: {
            hasSetInitialPassword: false
          }
        } 
      });
      message.success(`Password reset for ${user.firstName} ${user.lastName}. They will be prompted to set a new password on next login.`);
      refetch();
    } catch (e) {
      message.error("Password reset failed: " + e.message);
    }
    setLoading(false);
  };

  const columns = [
    {
      title: "User",
      key: "user",
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar icon={<UserOutlined />} />
          <div>
            <div style={{ fontWeight: 500 }}>
              {record.firstName} {record.lastName}
              {record.isSystemDefine && (
                <Tag color="orange" style={{ marginLeft: 8 }} size="small">
                  System
                </Tag>
              )}
            </div>
            <div style={{ color: '#666', fontSize: '12px' }}>
              {record.email}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      render: (role) => (
        role ? (
          <div>
            <Tag color="blue">{role.name}</Tag>
            <div style={{ color: '#666', fontSize: '12px' }}>
              {role.roleType}
            </div>
          </div>
        ) : (
          <Tag color="default">No Role</Tag>
        )
      ),
    },
    {
      title: "Contact",
      key: "contact",
      render: (_, record) => (
        <div>
          {record.contactPersonal && (
            <div style={{ fontSize: '12px' }}>
              📱 {record.contactPersonal}
            </div>
          )}
          {record.contactHome && (
            <div style={{ fontSize: '12px' }}>
              🏠 {record.contactHome}
            </div>
          )}
          {!record.contactPersonal && !record.contactHome && (
            <span style={{ color: '#999' }}>No contact info</span>
          )}
        </div>
      ),
    },
    {
      title: "Employment",
      key: "employment",
      render: (_, record) => (
        <div>
          <div>
            {record.isEmployee ? (
              <Tag color="green">Employee</Tag>
            ) : (
              <Tag color="default">Non-Employee</Tag>
            )}
          </div>
          {record.joiningDate && (
            <div style={{ color: '#666', fontSize: '12px' }}>
              Joined: {dayjs(record.joiningDate).format('MMM DD, YYYY')}
            </div>
          )}
          {record.isEmployee && (
            <div style={{ color: '#666', fontSize: '12px' }}>
              {record.payType === 'fixed' ? (
                record.salaryAmount ? `₹${Number(record.salaryAmount).toLocaleString()} (${record.salaryType})` : 'Salary not set'
              ) : record.payType === 'hourly' ? (
                record.hourlyRate ? `₹${Number(record.hourlyRate).toLocaleString()}/hr` : 'Rate not set'
              ) : (
                'Pay type not set'
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Status",
      key: "status",
      render: (_, record) => (
        <Space direction="vertical" size="small">
          {record.isActive ? (
            <Tag color="green">Active</Tag>
          ) : (
            <Tag color="red">Inactive</Tag>
          )}
          {record.canLogin ? (
            <Tag color="blue" size="small">Can Login</Tag>
          ) : (
            <Tag color="default" size="small">No Login</Tag>
          )}
          {!record.hasSetInitialPassword && record.canLogin && (
            <Tag color="orange" size="small">Password Pending</Tag>
          )}
        </Space>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button 
            type="link" 
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
            size="small"
          >
            View
          </Button>
          <Button 
            type="link" 
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            size="small"
          >
            Edit
          </Button>
          {record.canLogin && (
            <Popconfirm
              title="Reset Password?"
              description={`${record.firstName} will need to set a new password on their next login.`}
              onConfirm={() => handleResetPassword(record)}
              okButtonProps={{ loading }}
              okText="Reset"
              cancelText="Cancel"
            >
              <Tooltip title="Reset Password">
                <Button 
                  type="link" 
                  icon={<KeyOutlined />}
                  size="small"
                  style={{ color: '#faad14' }}
                >
                  Reset Password
                </Button>
              </Tooltip>
            </Popconfirm>
          )}
          {!record.isSystemDefine && (
            <Popconfirm
              title="Sure to Delete?"
              description="This action cannot be undone."
              onConfirm={() => handleDelete(record)}
              okButtonProps={{ loading }}
            >
              <Button 
                type="link" 
                danger 
                icon={<DeleteOutlined />}
                size="small"
              >
                Delete
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // Filter users by search
  const filteredUsers = (data?.users || []).filter((user) =>
    `${user.firstName} ${user.lastName} ${user.email}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <Card
      title="Users Management"
      extra={<Button type="primary" onClick={handleCreate}>Add New User</Button>}
    >
      <Input
        placeholder="Search by name or email"
        onChange={(e) => setSearch(e.target.value)}
        prefix={<SearchOutlined />}
        style={{ width: 300, marginBottom: 16 }}
      />
      
      <Table
        columns={columns}
        dataSource={filteredUsers.map((user) => ({ ...user, key: user.id }))}
        loading={loading || queryLoading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} of ${total} users`,
          pageSizeOptions: [10, 25, 50, 100],
        }}
        scroll={{ x: 1000 }}
      />
    </Card>
  );
};

export default Users;