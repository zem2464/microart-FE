import React, { useState } from "react";
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Switch,
  Space,
  Tag,
  message,
  Tooltip,
  Statistic,
  Row,
  Col,
  Typography,
  DatePicker,
  Alert,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DollarOutlined,
  BankOutlined,
  WalletOutlined,
  CreditCardOutlined,
  QrcodeOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useQuery, useMutation } from "@apollo/client";
import {
  GET_PAYMENT_TYPES,
  CREATE_PAYMENT_TYPE,
  UPDATE_PAYMENT_TYPE,
  CREATE_PAYMENT_TYPE_TRANSFER,
} from "../../gql/paymentTypes";

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const PaymentTypes = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isTransferModalVisible, setIsTransferModalVisible] = useState(false);
  const [editingPaymentType, setEditingPaymentType] = useState(null);
  const [selectedFromPaymentType, setSelectedFromPaymentType] = useState(null);
  const [form] = Form.useForm();
  const [transferForm] = Form.useForm();

  // Queries
  const { data, loading, refetch } = useQuery(GET_PAYMENT_TYPES, {
    fetchPolicy: "cache-and-network",
  });

  // Mutations
  const [createPaymentType, { loading: creating }] = useMutation(
    CREATE_PAYMENT_TYPE,
    {
      onCompleted: () => {
        message.success("Payment type created successfully");
        setIsModalVisible(false);
        form.resetFields();
        refetch();
      },
      onError: (error) => {
        message.error(`Error: ${error.message}`);
      },
    }
  );

  const [updatePaymentType, { loading: updating }] = useMutation(
    UPDATE_PAYMENT_TYPE,
    {
      onCompleted: () => {
        message.success("Payment type updated successfully");
        setIsModalVisible(false);
        setEditingPaymentType(null);
        form.resetFields();
        refetch();
      },
      onError: (error) => {
        message.error(`Error: ${error.message}`);
      },
    }
  );

  const [createTransfer, { loading: transferring }] = useMutation(
    CREATE_PAYMENT_TYPE_TRANSFER,
    {
      onCompleted: (data) => {
        const transfer = data.createPaymentTypeTransfer;
        message.success(
          `Transfer ${transfer.transferNumber} completed successfully! ` +
          `₹${transfer.amount} transferred from ${transfer.fromPaymentType.name} to ${transfer.toPaymentType.name}`
        );
        setIsTransferModalVisible(false);
        transferForm.resetFields();
        refetch();
      },
      onError: (error) => {
        message.error(`Transfer failed: ${error.message}`);
      },
    }
  );

  // Handlers
  const showCreateModal = () => {
    setEditingPaymentType(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const showEditModal = (record) => {
    setEditingPaymentType(record);
    form.setFieldsValue({
      name: record.name,
      type: record.type,
      accountNumber: record.accountNumber,
      bankName: record.bankName,
      upiId: record.upiId,
      description: record.description,
      openingBalance: record.openingBalance,
      isActive: record.isActive,
      sortOrder: record.sortOrder,
    });
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingPaymentType(null);
    form.resetFields();
  };

  const handleSubmit = async (values) => {
    try {
      if (editingPaymentType) {
        await updatePaymentType({
          variables: {
            id: editingPaymentType.id,
            input: values,
          },
        });
      } else {
        await createPaymentType({
          variables: {
            input: values,
          },
        });
      }
    } catch (error) {
      console.error("Error submitting payment type:", error);
    }
  };

  const showTransferModal = () => {
    transferForm.resetFields();
    transferForm.setFieldsValue({
      transferDate: dayjs(),
    });
    setSelectedFromPaymentType(null);
    setIsTransferModalVisible(true);
  };

  const handleTransferCancel = () => {
    setIsTransferModalVisible(false);
    transferForm.resetFields();
    setSelectedFromPaymentType(null);
  };

  const handleTransferSubmit = async (values) => {
    try {
      await createTransfer({
        variables: {
          input: {
            ...values,
            transferDate: values.transferDate?.toISOString(),
          },
        },
      });
    } catch (error) {
      console.error("Error creating transfer:", error);
    }
  };

  // Get payment type icon
  const getPaymentTypeIcon = (type) => {
    const icons = {
      BANK: <BankOutlined style={{ color: "#1890ff" }} />,
      UPI: <QrcodeOutlined style={{ color: "#52c41a" }} />,
      CASH: <DollarOutlined style={{ color: "#faad14" }} />,
      CARD: <CreditCardOutlined style={{ color: "#722ed1" }} />,
      CREDIT_CARD: <CreditCardOutlined style={{ color: "#722ed1" }} />,
      DEBIT_CARD: <CreditCardOutlined style={{ color: "#1890ff" }} />,
      CHEQUE: <BankOutlined style={{ color: "#13c2c2" }} />,
      OTHER: <WalletOutlined style={{ color: "#8c8c8c" }} />,
    };
    return icons[type] || <WalletOutlined />;
  };

  // Get payment type color
  const getPaymentTypeColor = (type) => {
    const colors = {
      BANK: "blue",
      UPI: "green",
      CASH: "gold",
      CARD: "purple",
      CREDIT_CARD: "purple",
      DEBIT_CARD: "blue",
      CHEQUE: "cyan",
      OTHER: "default",
    };
    return colors[type] || "default";
  };

  // Calculate statistics
  const paymentTypes = data?.paymentTypes || [];
  const activeCount = paymentTypes.filter((pt) => pt.isActive).length;
  const totalBalance = paymentTypes
    .filter((pt) => pt.isActive)
    .reduce((sum, pt) => sum + (pt.currentBalance || 0), 0);

  // Table columns
  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (text, record) => (
        <Space>
          {getPaymentTypeIcon(record.type)}
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      render: (type) => (
        <Tag color={getPaymentTypeColor(type)}>
          {type?.replace(/_/g, " ")}
        </Tag>
      ),
    },
    {
      title: "Account Details",
      key: "details",
      render: (_, record) => {
        if (record.type === "BANK" || record.type === "DEBIT_CARD" || record.type === "CREDIT_CARD") {
          return (
            <div>
              {record.accountNumber && (
                <div>
                  <Text type="secondary" style={{ fontSize: "12px" }}>
                    Account: {record.accountNumber}
                  </Text>
                </div>
              )}
              {record.bankName && (
                <div>
                  <Text type="secondary" style={{ fontSize: "12px" }}>
                    Bank: {record.bankName}
                  </Text>
                </div>
              )}
            </div>
          );
        } else if (record.type === "UPI") {
          return record.upiId ? (
            <Text type="secondary" style={{ fontSize: "12px" }}>
              UPI: {record.upiId}
            </Text>
          ) : (
            <Text type="secondary">-</Text>
          );
        }
        return <Text type="secondary">-</Text>;
      },
    },
    {
      title: "Current Balance",
      dataIndex: "currentBalance",
      key: "currentBalance",
      align: "right",
      render: (balance) => (
        <Text strong style={{ color: balance >= 0 ? "#52c41a" : "#ff4d4f" }}>
          ₹{Number(balance || 0).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </Text>
      ),
    },
    {
      title: "Status",
      dataIndex: "isActive",
      key: "isActive",
      render: (isActive) => (
        <Tag color={isActive ? "success" : "error"}>
          {isActive ? "Active" : "Inactive"}
        </Tag>
      ),
    },
    {
      title: "Sort Order",
      dataIndex: "sortOrder",
      key: "sortOrder",
      align: "center",
      width: 100,
    },
    {
      title: "Actions",
      key: "actions",
      align: "center",
      width: 100,
      render: (_, record) => (
        <Tooltip title="Edit">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => showEditModal(record)}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <div className="payment-types-page">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <Title level={2} className="mb-0">
            Payment Types
          </Title>
          <Space>
            <Button
              type="default"
              icon={<SwapOutlined />}
              onClick={showTransferModal}
              size="large"
            >
              Internal Transfer
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={showCreateModal}
              size="large"
            >
              Add Payment Type
            </Button>
          </Space>
        </div>

        {/* Statistics */}
        <Row gutter={16} className="mb-4">
          <Col span={8}>
            <Card>
              <Statistic
                title="Total Payment Types"
                value={paymentTypes.length}
                prefix={<WalletOutlined />}
                valueStyle={{ color: "#1890ff" }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="Active Payment Types"
                value={activeCount}
                prefix={<WalletOutlined />}
                valueStyle={{ color: "#52c41a" }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="Total Balance"
                value={totalBalance}
                precision={2}
                prefix="₹"
                valueStyle={{ color: totalBalance >= 0 ? "#52c41a" : "#ff4d4f" }}
              />
            </Card>
          </Col>
        </Row>
      </div>

      {/* Payment Types Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={paymentTypes}
          loading={loading}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} payment types`,
          }}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={editingPaymentType ? "Edit Payment Type" : "Create Payment Type"}
        open={isModalVisible}
        onCancel={handleCancel}
        footer={null}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            isActive: true,
            sortOrder: 0,
            openingBalance: 0,
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Payment Type Name"
                rules={[
                  { required: true, message: "Please enter payment type name" },
                ]}
              >
                <Input placeholder="e.g., Main Bank Account, Petty Cash" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="type"
                label="Type"
                rules={[{ required: true, message: "Please select type" }]}
              >
                <Select placeholder="Select payment method type">
                  <Option value="BANK">Bank Account</Option>
                  <Option value="UPI">UPI</Option>
                  <Option value="CASH">Cash</Option>
                  <Option value="CREDIT_CARD">Credit Card</Option>
                  <Option value="DEBIT_CARD">Debit Card</Option>
                  <Option value="CHEQUE">Cheque</Option>
                  <Option value="OTHER">Other</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item noStyle shouldUpdate>
            {({ getFieldValue }) => {
              const type = getFieldValue("type");
              if (type === "BANK" || type === "DEBIT_CARD" || type === "CREDIT_CARD") {
                return (
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item name="accountNumber" label="Account Number">
                        <Input placeholder="Enter account number" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="bankName" label="Bank Name">
                        <Input placeholder="Enter bank name" />
                      </Form.Item>
                    </Col>
                  </Row>
                );
              } else if (type === "UPI") {
                return (
                  <Form.Item name="upiId" label="UPI ID">
                    <Input placeholder="e.g., yourname@paytm" />
                  </Form.Item>
                );
              }
              return null;
            }}
          </Form.Item>

          <Form.Item name="description" label="Description">
            <TextArea
              rows={3}
              placeholder="Additional details about this payment type"
            />
          </Form.Item>

          {!editingPaymentType && (
            <Form.Item
              name="openingBalance"
              label="Opening Balance"
              tooltip="Initial balance for this account"
            >
              <InputNumber
                style={{ width: "100%" }}
                placeholder="0.00"
                precision={2}
                formatter={(value) =>
                  `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                }
                parser={(value) => value.replace(/₹\s?|(,*)/g, "")}
              />
            </Form.Item>
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="sortOrder"
                label="Sort Order"
                tooltip="Display order in dropdowns (lower numbers appear first)"
              >
                <InputNumber
                  style={{ width: "100%" }}
                  placeholder="0"
                  min={0}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="isActive"
                label="Active Status"
                valuePropName="checked"
              >
                <Switch
                  checkedChildren="Active"
                  unCheckedChildren="Inactive"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item className="mb-0 mt-4">
            <Space className="w-full justify-end">
              <Button onClick={handleCancel}>Cancel</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={creating || updating}
              >
                {editingPaymentType ? "Update" : "Create"}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Internal Transfer Modal */}
      <Modal
        title={
          <Space>
            <SwapOutlined style={{ color: "#1890ff" }} />
            <span>Internal Transfer</span>
          </Space>
        }
        open={isTransferModalVisible}
        onCancel={handleTransferCancel}
        footer={null}
        width={700}
      >
        <Form
          form={transferForm}
          layout="vertical"
          onFinish={handleTransferSubmit}
          initialValues={{
            transferDate: dayjs(),
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="fromPaymentTypeId"
                label="From Payment Type"
                rules={[
                  { required: true, message: "Please select source payment type" },
                ]}
              >
                <Select
                  placeholder="Select source"
                  showSearch
                  optionFilterProp="children"
                  onChange={(value) => {
                    const selectedPT = paymentTypes.find(pt => pt.id === value);
                    setSelectedFromPaymentType(selectedPT);
                    // Reset amount field when source changes
                    transferForm.setFieldsValue({ amount: undefined });
                  }}
                  filterOption={(input, option) =>
                    option.children.toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {paymentTypes
                    .filter((pt) => pt.isActive)
                    .map((pt) => (
                      <Option key={pt.id} value={pt.id}>
                        <Space>
                          {getPaymentTypeIcon(pt.type)}
                          <span>{pt.name}</span>
                          <Text type="secondary" style={{ fontSize: "12px" }}>
                            (₹{pt.currentBalance?.toFixed(2)})
                          </Text>
                        </Space>
                      </Option>
                    ))}
                </Select>
              </Form.Item>
              {selectedFromPaymentType && (
                <Alert
                  message={
                    <Space direction="vertical" size={0}>
                      <Text strong>Available Balance</Text>
                      <Text style={{ fontSize: "20px", color: "#52c41a" }}>
                        ₹{selectedFromPaymentType.currentBalance?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                    </Space>
                  }
                  type="info"
                  style={{ marginTop: "-16px", marginBottom: "16px" }}
                />
              )}
            </Col>
            <Col span={12}>
              <Form.Item
                name="toPaymentTypeId"
                label="To Payment Type"
                rules={[
                  { required: true, message: "Please select destination payment type" },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue("fromPaymentTypeId") !== value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(
                        new Error("Cannot transfer to the same payment type")
                      );
                    },
                  }),
                ]}
              >
                <Select
                  placeholder="Select destination"
                  showSearch
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    option.children.toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {paymentTypes
                    .filter((pt) => pt.isActive)
                    .map((pt) => (
                      <Option key={pt.id} value={pt.id}>
                        <Space>
                          {getPaymentTypeIcon(pt.type)}
                          <span>{pt.name}</span>
                          <Text type="secondary" style={{ fontSize: "12px" }}>
                            (₹{pt.currentBalance?.toFixed(2)})
                          </Text>
                        </Space>
                      </Option>
                    ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="amount"
                label="Transfer Amount"
                rules={[
                  { required: true, message: "Please enter transfer amount" },
                  {
                    type: "number",
                    min: 0.01,
                    message: "Amount must be greater than 0",
                  },
                  () => ({
                    validator(_, value) {
                      if (!value) {
                        return Promise.resolve();
                      }
                      if (!selectedFromPaymentType) {
                        return Promise.reject(
                          new Error("Please select source payment type first")
                        );
                      }
                      const availableBalance = parseFloat(selectedFromPaymentType.currentBalance || 0);
                      if (value > availableBalance) {
                        return Promise.reject(
                          new Error(
                            `Amount cannot exceed available balance of ₹${availableBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          )
                        );
                      }
                      return Promise.resolve();
                    },
                  }),
                ]}
              >
                <InputNumber
                  style={{ width: "100%" }}
                  placeholder="0.00"
                  precision={2}
                  max={selectedFromPaymentType?.currentBalance || undefined}
                  formatter={(value) =>
                    `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                  }
                  parser={(value) => value.replace(/₹\s?|(,*)/g, "")}
                />
              </Form.Item>
              {selectedFromPaymentType && (
                <Text type="secondary" style={{ fontSize: "12px", marginTop: "-12px", display: "block" }}>
                  Maximum: ₹{selectedFromPaymentType.currentBalance?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              )}
            </Col>
            <Col span={12}>
              <Form.Item
                name="transferDate"
                label="Transfer Date"
                rules={[{ required: true, message: "Please select transfer date" }]}
              >
                <DatePicker
                  style={{ width: "100%" }}
                  showTime
                  format="DD MMM YYYY HH:mm"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="referenceNumber" label="Reference Number">
            <Input placeholder="e.g., Bank transaction ID, Cheque number" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: "Please provide a description" }]}
          >
            <TextArea
              rows={2}
              placeholder="Purpose of transfer (e.g., Daily cash deposit to bank)"
            />
          </Form.Item>

          <Form.Item name="notes" label="Notes">
            <TextArea
              rows={2}
              placeholder="Additional notes (optional)"
            />
          </Form.Item>

          <Form.Item className="mb-0 mt-4">
            <Space className="w-full justify-end">
              <Button onClick={handleTransferCancel}>Cancel</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={transferring}
                icon={<SwapOutlined />}
              >
                Transfer
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PaymentTypes;
