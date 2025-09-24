import React from "react";
import { Descriptions, Tag, Typography, Spin } from "antd";
import { useQuery } from '@apollo/client';
import { GET_DEFAULT_PERMISSION_MODULES } from '../gql/modules';

const { Title } = Typography;

const RoleDetail = ({ role, onClose }) => {
  const { data, loading } = useQuery(GET_DEFAULT_PERMISSION_MODULES);
  if (!role) return null;
  if (loading) return <Spin />;
  const defaultPermissions = data?.defaultPermissionModules || [];
  return (
    <div>
      <Title level={4}>Role Details</Title>
      <Descriptions bordered column={1} size="middle">
        <Descriptions.Item label="Name">{role.name}</Descriptions.Item>
        <Descriptions.Item label="Description">{role.description}</Descriptions.Item>
        <Descriptions.Item label="Permissions">
          {defaultPermissions.length > 0 ? (
            <div>
              {defaultPermissions.map(({ name: module, actions }) => (
                <div key={module} style={{ marginBottom: 8 }}>
                  <b>{module.charAt(0).toUpperCase() + module.slice(1)}:</b>
                  {actions.map((action) => (
                    role.permissions?.[module]?.[action] ? (
                      <Tag key={action} color="green">{action}</Tag>
                    ) : (
                      <Tag key={action} color="red">{action}</Tag>
                    )
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <span>No permissions assigned</span>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Created By">{role.createdBy}</Descriptions.Item>
        <Descriptions.Item label="Updated By">{role.updatedBy}</Descriptions.Item>
      </Descriptions>
      <div style={{ marginTop: 24, textAlign: "right" }}>
        <button className="ant-btn" onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default RoleDetail;
