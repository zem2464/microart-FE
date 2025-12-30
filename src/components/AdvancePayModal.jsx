import React, { useState } from "react";
import {
  Modal,
  Form,
  InputNumber,
  Select,
  DatePicker,
  Input,
  Button,
  message,
  Table,
  Space,
  Popconfirm,
} from "antd";
import { useMutation, useQuery } from "@apollo/client";
import {
  CREATE_ADVANCE_PAY,
  GET_ADVANCE_PAYS,
  DELETE_ADVANCE_PAY,
} from "../gql/advancePays";
import { GET_USERS } from "../gql/users";
import dayjs from "dayjs";

const AdvancePayModal = ({ open, onClose }) => {
  const [form] = Form.useForm();
  const [selectedUserId, setSelectedUserId] = useState(null);

  const { data, loading, refetch } = useQuery(GET_ADVANCE_PAYS, {
    variables: { isDeducted: false },
    fetchPolicy: "cache-and-network",
  });

  const { data: usersData, loading: usersLoading } = useQuery(GET_USERS, {
    fetchPolicy: "cache-and-network",
  });

  const [createAdvancePay] = useMutation(CREATE_ADVANCE_PAY, {
    onCompleted: () => {
      message.success("Advance pay created successfully!");
      form.resetFields();
      setSelectedUserId(null);
      refetch();
    },
    onError: (error) => {
      message.error(`Failed to create advance pay: ${error.message}`);
    },
  });

  const [deleteAdvancePay] = useMutation(DELETE_ADVANCE_PAY, {
    onCompleted: () => {
      message.success("Advance pay deleted successfully!");
      refetch();
    },
    onError: (error) => {
      message.error(`Failed to delete advance pay: ${error.message}`);
    },
  });

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      await createAdvancePay({
        variables: {
          userId: values.userId,
          amount: values.amount,
          paymentType: values.paymentType || "cash",
          paymentDate: values.paymentDate.format('YYYY-MM-DD'),
          remarks: values.remarks,
        },
      });
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleDelete = async (id) => {
    await deleteAdvancePay({ variables: { id } });
  };

  const columns = [
    {
      title: "User Name",
      dataIndex: ["user", "firstName"],
      key: "userName",
      render: (text, record) => `${record.user.firstName} ${record.user.lastName}`,
      width: 150,
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      render: (text) => `₹${Number(text).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      width: 120,
    },
    {
      title: "Payment Type",
      dataIndex: "paymentType",
      key: "paymentType",
      width: 120,
    },
    {
      title: "Payment Date",
      dataIndex: "paymentDate",
      key: "paymentDate",
      render: (text) => dayjs(text).format("YYYY-MM-DD"),
      width: 120,
    },
    {
      title: "Remarks",
      dataIndex: "remarks",
      key: "remarks",
      ellipsis: true,
      width: 200,
    },
    {
      title: "Action",
      key: "action",
      render: (text, record) => (
        <Popconfirm
          title="Delete Advance Pay"
          description="Are you sure you want to delete this advance pay?"
          onConfirm={() => handleDelete(record.id)}
          okText="Yes"
          cancelText="No"
        >
          <Button type="link" danger size="small">
            Delete
          </Button>
        </Popconfirm>
      ),
      width: 80,
    },
  ];

  return (
    <Modal
      title="Advance Pay Management"
      open={open}
      onCancel={onClose}
      width={1000}
      footer={null}
    >
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16 }}>Create New Advance Pay</h3>
        <Form
          form={form}
          layout="vertical"
          style={{ maxWidth: 600 }}
        >
          <Form.Item
            name="userId"
            label="User"
            rules={[{ required: true, message: "Please select a user" }]}
          >
            <Select
              placeholder="Select user"
              showSearch
              loading={usersLoading}
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.children ?? '')
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
            >
              {usersData?.users?.filter(user => user.isActive && user.isEmployee).map(user => (
                <Select.Option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="amount"
            label="Amount"
            rules={[{ required: true, message: "Please enter amount" }]}
          >
            <InputNumber
              min={0}
              precision={2}
              style={{ width: '100%' }}
              placeholder="Enter amount"
              formatter={(value) => value ? `₹${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
              parser={(value) => value.replace(/₹\s?|(,*)/g, '')}
            />
          </Form.Item>

          <Form.Item
            name="paymentType"
            label="Payment Type"
            initialValue="cash"
          >
            <Select>
              <Select.Option value="cash">Cash</Select.Option>
              <Select.Option value="cheque">Cheque</Select.Option>
              <Select.Option value="bank_transfer">Bank Transfer</Select.Option>
              <Select.Option value="other">Other</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="paymentDate"
            label="Payment Date"
            rules={[{ required: true, message: "Please select payment date" }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="remarks"
            label="Remarks"
          >
            <Input.TextArea
              rows={3}
              placeholder="Add any notes or remarks"
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" onClick={handleSubmit} block>
              Create Advance Pay
            </Button>
          </Form.Item>
        </Form>
      </div>

      <div>
        <h3 style={{ marginBottom: 16 }}>Recent Advance Pays (Not Deducted)</h3>
        <Table
          columns={columns}
          dataSource={data?.advancePays || []}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 5 }}
          scroll={{ x: 800 }}
        />
      </div>
    </Modal>
  );
};

export default AdvancePayModal;
