import React, { useState } from "react";
import { Form, Input, Button, Card, Alert, Typography } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { useAuth } from "../contexts/AuthContext";

const { Title, Text } = Typography;

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();

  const onFinish = async (values) => {
    setLoading(true);
    setError("");
    console.log("Received values of form: ", values);
    const result = await login(values);

    if (!result.success) {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="max-w-md w-full space-y-6 max-h-full overflow-y-auto">
        <div className="text-center">
          <Title level={2} className="text-gradient">
            MicroArt
          </Title>
          <Text type="secondary">Photo editing workflow management system</Text>
        </div>

        <Card className="card-shadow">
          <Title level={3} className="text-center mb-4">
            Sign in to your account
          </Title>

          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              closable
              className="mb-4"
              onClose={() => setError("")}
            />
          )}

          <Form name="login" onFinish={onFinish} layout="vertical" size="large">
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: "Please input your email!" },
                { type: "email", message: "Please enter a valid email!" },
              ]}
            >
              <Input prefix={<UserOutlined />} placeholder="Email" />
            </Form.Item>

            <Form.Item
              name="password"
              label="Password"
              rules={[
                { required: true, message: "Please input your password!" },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Password"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                className="w-full"
              >
                Sign in
              </Button>
            </Form.Item>
          </Form>

          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 text-center">
              <Text type="secondary" className="text-sm">
                Demo accounts:
                <br />
                <strong>admin@microart.com</strong> /{" "}
                <strong>manager@microart.com</strong> /{" "}
                <strong>employee@microart.com</strong>
                <br />
                Password: <strong>password123</strong>
              </Text>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Login;
