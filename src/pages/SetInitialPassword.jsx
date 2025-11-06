import React, { useState, useEffect } from "react";
import { Form, Input, Button, Card, Alert, Typography, Progress } from "antd";
import { LockOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { useAuth } from "../contexts/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";

const { Title, Text } = Typography;

const SetInitialPassword = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [form] = Form.useForm();
  const { setInitialPassword } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Get email from navigation state
  const emailAddress = location.state?.emailAddress || "";

  useEffect(() => {
    // Redirect to login if no email address provided
    if (!emailAddress) {
      navigate("/login");
    }
  }, [emailAddress, navigate]);

  // Calculate password strength
  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (!password) return 0;

    // Length check
    if (password.length >= 6) strength += 20;
    if (password.length >= 8) strength += 20;
    if (password.length >= 12) strength += 10;

    // Contains lowercase
    if (/[a-z]/.test(password)) strength += 15;

    // Contains uppercase
    if (/[A-Z]/.test(password)) strength += 15;

    // Contains numbers
    if (/\d/.test(password)) strength += 10;

    // Contains special characters
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength += 10;

    return Math.min(strength, 100);
  };

  const getPasswordStrengthColor = (strength) => {
    if (strength < 40) return "#ff4d4f";
    if (strength < 70) return "#faad14";
    return "#52c41a";
  };

  const getPasswordStrengthText = (strength) => {
    if (strength < 40) return "Weak";
    if (strength < 70) return "Medium";
    return "Strong";
  };

  const handlePasswordChange = (e) => {
    const password = e.target.value;
    const strength = calculatePasswordStrength(password);
    setPasswordStrength(strength);
  };

  const onFinish = async (values) => {
    setLoading(true);
    setError("");

    try {
      await setInitialPassword({
        email: emailAddress,
        password: values.newPassword,
      });
      // Navigation handled by AuthContext
    } catch (err) {
      console.error("Error setting initial password:", err);
      setError(err.message || "Failed to set initial password. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="max-w-md w-full space-y-6 max-h-full overflow-y-auto">
        <div className="text-center">
          <Title level={2} className="text-gradient">
            MicroArt
          </Title>
          <Text type="secondary">Set Your Initial Password</Text>
        </div>

        <Card className="card-shadow">
          <div className="text-center mb-4">
            <CheckCircleOutlined
              style={{ fontSize: 48, color: "#3b82f6" }}
              className="mb-4"
            />
            <Title level={3}>Welcome!</Title>
            <Text type="secondary">
              Please set your initial password to continue
            </Text>
          </div>

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

          <Form
            form={form}
            name="setInitialPassword"
            onFinish={onFinish}
            layout="vertical"
            size="large"
          >
            <Form.Item label="Email">
              <Input value={emailAddress} disabled />
            </Form.Item>

            <Form.Item
              name="newPassword"
              label="New Password"
              rules={[
                { required: true, message: "Please input your new password!" },
                { min: 6, message: "Password must be at least 6 characters!" },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="New Password"
                onChange={handlePasswordChange}
              />
            </Form.Item>

            {form.getFieldValue("newPassword") && (
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <Text type="secondary" className="text-sm">
                    Password Strength:
                  </Text>
                  <Text
                    style={{ color: getPasswordStrengthColor(passwordStrength) }}
                    className="text-sm font-semibold"
                  >
                    {getPasswordStrengthText(passwordStrength)}
                  </Text>
                </div>
                <Progress
                  percent={passwordStrength}
                  strokeColor={getPasswordStrengthColor(passwordStrength)}
                  showInfo={false}
                />
              </div>
            )}

            <Form.Item
              name="confirmPassword"
              label="Confirm Password"
              dependencies={["newPassword"]}
              rules={[
                {
                  required: true,
                  message: "Please confirm your password!",
                },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue("newPassword") === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(
                      new Error("The two passwords do not match!")
                    );
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Confirm Password"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                className="w-full"
              >
                Set Password
              </Button>
            </Form.Item>
          </Form>

          <div className="mt-4 text-center">
            <Text type="secondary" className="text-sm">
              Password requirements:
              <br />
              • At least 6 characters long
              <br />
              • Mix of uppercase and lowercase letters recommended
              <br />• Numbers and special characters recommended
            </Text>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SetInitialPassword;
