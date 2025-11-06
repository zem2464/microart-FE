import React, { useState, useEffect } from "react";
import { Form, Input, Button, Card, Alert, Typography } from "antd";
import { ClockCircleOutlined } from "@ant-design/icons";
import { useLocation, useNavigate } from "react-router-dom";

const { Title, Text } = Typography;

const ChangeExpirePassword = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // This feature is not yet implemented in the backend
    // Redirect to login
    navigate("/login");
  }, [navigate]);

  return (
    <div className="h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="max-w-md w-full space-y-6 max-h-full overflow-y-auto">
        <Card className="card-shadow">
          <div className="text-center mb-4">
            <ClockCircleOutlined
              style={{ fontSize: 48, color: "#faad14" }}
              className="mb-4"
            />
            <Title level={3}>Feature Coming Soon</Title>
            <Text type="secondary">
              Password expiry management is currently under development.
              Redirecting you to login...
            </Text>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ChangeExpirePassword;
