import React, { useState } from "react";
import { Button, Card, Input, message, Popconfirm, Table, Tag } from "antd";
import { EditOutlined, DeleteOutlined, SearchOutlined } from "@ant-design/icons";
import { useQuery, useMutation } from "@apollo/client";
import { GET_ROLES, CREATE_ROLE, UPDATE_ROLE, DELETE_ROLE } from "../../gql/roles";
import { GET_DEFAULT_PERMISSION_MODULES } from "../../gql/modules";
import { useAppDrawer } from "../../contexts/DrawerContext";


const getMergedPermissions = (permissions = {}, defaultPermissions = {}) => {
  // Get all modules from both defaultPermissions and permissions
  const allModules = Array.from(new Set([
    ...Object.keys(defaultPermissions),
    ...Object.keys(permissions)
  ]));
  return allModules.map((module) => {
    // Get all keys from both default and role permissions for this module
    const modulePerms = { ...defaultPermissions[module], ...permissions[module] };
    // If admin/super, set all keys to true
    const isAdmin = permissions.isSuper || permissions.name?.toLowerCase() === 'admin';
    const allKeys = Object.keys(modulePerms);
    const perms = {};
    allKeys.forEach((key) => {
      perms[key] = isAdmin ? true : modulePerms[key] ?? false;
    });
    return {
      module: module.charAt(0).toUpperCase() + module.slice(1),
      ...perms,
    };
  });
};

const renderPermissionTable = (permissions, defaultPermissions, record) => {
  const data = getMergedPermissions(permissions, defaultPermissions);
  // For each row (module), create columns dynamically based on its keys
  return (
    <>
      {data.map((row, idx) => {
        const keys = Object.keys(row).filter(k => k !== 'module');
        const columns = [
          { title: "Module", dataIndex: "module", key: "module" },
          ...keys.map((key) => ({
            title: key.charAt(0).toUpperCase() + key.slice(1),
            dataIndex: key,
            key,
            render: (value) => value ? <Tag color="green">Yes</Tag> : <Tag color="red">No</Tag>,
          }))
        ];
        return (
          <Table
            key={row.module + idx}
            columns={columns}
            dataSource={[row]}
            pagination={false}
            showHeader={true}
            style={{ marginBottom: 16 }}
            title={() => (
              <>
                Permissions for <b>{row.module}</b> in <b>{record?.name}</b> role
              </>
            )}
          />
        );
      })}
    </>
  );
};

const Roles = () => {
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const { showRoleFormDrawer } = useAppDrawer();

  const { data, loading: queryLoading, refetch } = useQuery(GET_ROLES, {
    fetchPolicy: "cache-and-network",
  });

  const { data: defaultPermissionsData, loading: defaultPermissionsLoading } = useQuery(GET_DEFAULT_PERMISSION_MODULES, {
    fetchPolicy: "cache-and-network",
  });

  const [createRole] = useMutation(CREATE_ROLE);
  const [updateRole] = useMutation(UPDATE_ROLE);
  const [deleteRole] = useMutation(DELETE_ROLE);

  const handleEdit = (role) => {
  showRoleFormDrawer(role, 'edit', async () => refetch());
  };

  const handleCreate = () => {
  showRoleFormDrawer(null, 'create', () => refetch());
  };

  const handleDelete = async (role) => {
    setLoading(true);
    try {
      await deleteRole({ variables: { id: role.id } });
      message.success("Role deleted");
      refetch();
    } catch (e) {
      message.error("Delete failed");
    }
    setLoading(false);
  };

  // Convert backend default permissions to the format expected by the component
  const defaultPermissions = React.useMemo(() => {
    if (!defaultPermissionsData?.defaultPermissionModules) return {};
    
    const permissions = {};
    defaultPermissionsData.defaultPermissionModules.forEach(module => {
      permissions[module.name.toLowerCase()] = {};
      module.actions.forEach(action => {
        permissions[module.name.toLowerCase()][action] = false;
      });
    });
    return permissions;
  }, [defaultPermissionsData]);

  const columns = [
    {
      title: "Role Name",
      dataIndex: "name",
      key: "name",
      render: (text, record) => (
        <span>
          {text}
          {record.isSystemDefine && (
            <Tag color="blue" style={{ marginLeft: 8 }}>
              System Defined
            </Tag>
          )}
        </span>
      ),
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
    },
    {
      title: "Role Type",
      dataIndex: "roleType",
      key: "roleType",
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <>
          <Button type="link" onClick={() => handleEdit(record)}>
            Edit
          </Button>
          <Popconfirm
            title="Sure to Delete?"
            onConfirm={() => handleDelete(record)}
            okButtonProps={{ loading }}
          >
            <Button type="link" danger>
              Delete
            </Button>
          </Popconfirm>
        </>
      ),
    },
  ];

  // Filter roles by search
  const filteredRoles = (data?.roles || []).filter((role) =>
    role.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card
      title="Roles Table"
      extra={<Button onClick={handleCreate}>Add New Role</Button>}
    >
      <Input
        placeholder="Search by Role Name"
        onChange={(e) => setSearch(e.target.value)}
        prefix={<SearchOutlined />}
        style={{ width: 300, marginBottom: 16 }}
      />
      <Table
        columns={columns}
        dataSource={filteredRoles.map((role) => ({ ...role, key: role.id }))}
        expandable={{
          expandedRowRender: (record) => (
            <div>
              {Object.keys(defaultPermissions).length > 0 ? (
                renderPermissionTable(record.permissions, defaultPermissions, record)
              ) : (
                <div>Loading permissions...</div>
              )}
            </div>
          ),
        }}
        loading={loading || queryLoading || defaultPermissionsLoading}
      />
    </Card>
  );
};

export default Roles;
