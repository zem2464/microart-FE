import React from "react";
import {
  Form,
  Input,
  Select,
  Button,
  message,
  Space,
  Checkbox,
  Spin,
} from "antd";
import { useMutation, useQuery } from "@apollo/client";
import { CREATE_ROLE, UPDATE_ROLE, GET_ROLES } from "../gql/roles";
import { GET_DEFAULT_PERMISSION_MODULES } from "../gql/modules";

const { Option } = Select;

const RoleForm = ({ open, onClose, role, onSuccess }) => {
  // Fetch default permissions from backend
  const { data: permData, loading: permLoading } = useQuery(
    GET_DEFAULT_PERMISSION_MODULES
  );

  // Merge permissions for create/edit
  const defaultPermissions = React.useMemo(() => {
    if (!permData?.defaultPermissionModules) return {};
    const out = {};
    permData.defaultPermissionModules.forEach(({ name, actions }) => {
      out[name] = {};
      actions.forEach((action) => {
        out[name][action] = false;
      });
    });
    return out;
  }, [permData]);

  const allModules = React.useMemo(() => {
    return Array.from(
      new Set([
        ...Object.keys(defaultPermissions),
        ...(role?.permissions ? Object.keys(role.permissions) : []),
      ])
    );
  }, [defaultPermissions, role]);

  const mergedPermissions = React.useMemo(() => {
    const out = {};
    allModules.forEach((module) => {
      // Get all unique action keys from both default and role permissions
      const defaultKeys = Object.keys(defaultPermissions[module] || {});
      const roleKeys = Object.keys(role?.permissions?.[module] || {});
      const allKeys = Array.from(new Set([...defaultKeys, ...roleKeys]));
      out[module] = {};
      allKeys.forEach((key) => {
        // If role has a value for this key, use it; otherwise use default
        out[module][key] =
          role?.permissions?.[module]?.[key] ??
          defaultPermissions[module]?.[key] ??
          false;
      });
    });
    return out;
  }, [defaultPermissions, role, allModules]);

  // (removed duplicate declaration)
  const [form] = Form.useForm();
  const isEditing = !!role;

  // Apollo mutations
  const [createRole] = useMutation(CREATE_ROLE, {
    refetchQueries: [{ query: GET_ROLES }],
    onCompleted: () => {
      message.success("Role created successfully!");
      form.resetFields();
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      message.error(`Failed to create role: ${error.message}`);
    },
  });

  const [updateRole] = useMutation(UPDATE_ROLE, {
    refetchQueries: [{ query: GET_ROLES }],
    onCompleted: () => {
      message.success("Role updated successfully!");
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      message.error(`Failed to update role: ${error.message}`);
    },
  });

  // Reset and set form values when drawer opens and permissions are loaded
  React.useEffect(() => {
    if (open && !permLoading) {
      form.resetFields();
      form.setFieldsValue({
        name: role?.name || "",
        description: role?.description || "",
        roleType: role?.roleType || "",
        permissions: mergedPermissions,
      });
    }
    if (!open) {
      form.resetFields();
    }
  }, [open, role, mergedPermissions, permLoading, form]);
  console.log("mergedPermissions", mergedPermissions);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (isEditing) {
        await updateRole({ variables: { id: role.id, input: values } });
      } else {
        await createRole({ variables: { input: values } });
      }
    } catch (error) {
      // Already handled by mutation onError
    }
  };

  if (permLoading) return <Spin />;

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      style={{ maxWidth: 400 }}
    >
      <Form.Item
        name="name"
        label="Role Name"
        rules={[{ required: true, message: "Please enter a role name" }]}
      >
        <Input placeholder="Role name" maxLength={50} size="middle" />
      </Form.Item>
      <Form.Item
        name="description"
        label="Description"
        rules={[
          { max: 200, message: "Description must not exceed 200 characters" },
        ]}
      >
        <Input.TextArea
          placeholder="Description"
          maxLength={200}
          size="middle"
          autoSize={{ minRows: 2, maxRows: 4 }}
        />
      </Form.Item>
      <Form.Item
        name="roleType"
        label="Role Type"
        rules={[{ required: true, message: "Please select a role type" }]}
      >
        <Select
          placeholder="Select role type"
          size="middle"
          showSearch
          optionFilterProp="children"
          style={{
            width: "100%",
            boxShadow: "none",
            border: "1px solid #d9d9d9",
          }}
          bordered={false}
        >
          <Select.Option value="ADMIN">Admin</Select.Option>
          <Select.Option value="MANAGER">Manager</Select.Option>
          <Select.Option value="USER">User</Select.Option>
        </Select>
        {/* Action buttons moved to Drawer footer */}
      </Form.Item>
      <Form.Item label="Permissions">
        {allModules.map((module) => (
          <div key={module} style={{ marginBottom: 12 }}>
            <strong>{module.charAt(0).toUpperCase() + module.slice(1)}</strong>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                marginTop: 4,
              }}
            >
              {Object.keys(mergedPermissions[module]).map((key) => (
                <Form.Item
                  key={module + "-" + key}
                  name={["permissions", module, key]}
                  valuePropName="checked"
                  style={{ marginBottom: 0 }}
                >
                  <Checkbox size="small">
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </Checkbox>
                </Form.Item>
              ))}
            </div>
          </div>
        ))}
      </Form.Item>
      {/* Action buttons moved to Drawer footer */}
    </Form>
  );
};

export default RoleForm;
