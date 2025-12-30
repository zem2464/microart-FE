import React, { useMemo, useState } from "react";
import {
  Row,
  Col,
  Card,
  Statistic,
  Table,
  Tabs,
  Tag,
  Space,
  Button,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Switch,
  Select,
  Divider,
  Typography,
  message,
  List,
  Spin,
  Modal,
} from "antd";
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  MoneyCollectOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery } from "@apollo/client";
import dayjs from "dayjs";
import {
  GET_FINANCE_DASHBOARD,
  GET_EXPENSES,
  GET_INCOMES,
  GET_PAYMENT_TYPE_LEDGER,
  CREATE_EXPENSE,
  CREATE_INCOME,
  MARK_EXPENSE_PAID,
  MARK_INCOME_RECEIVED,
} from "../../gql/finance";
import { GET_PAYMENT_TYPES } from "../../gql/paymentTypes";

const { Title, Text } = Typography;
const { Option } = Select;

const currency = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const statusTag = (status) => {
  const map = {
    PENDING: "orange",
    DUE: "volcano",
    PAID: "green",
    RECEIVED: "green",
    CANCELLED: "red",
  };
  return <Tag color={map[status] || "default"}>{status}</Tag>;
};

const Finance = () => {
  const [expenseForm] = Form.useForm();
  const [incomeForm] = Form.useForm();
  const [selectedPaymentType, setSelectedPaymentType] = useState(null);
  const [ledgerRange, setLedgerRange] = useState([]);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [incomeModalOpen, setIncomeModalOpen] = useState(false);

  const { data: paymentTypeData } = useQuery(GET_PAYMENT_TYPES, {
    fetchPolicy: "cache-and-network",
  });

  const {
    data: dashboardData,
    loading: dashboardLoading,
    refetch: refetchDashboard,
  } = useQuery(GET_FINANCE_DASHBOARD, {
    fetchPolicy: "cache-and-network",
  });

  const {
    data: expensesData,
    loading: expensesLoading,
    refetch: refetchExpenses,
  } = useQuery(GET_EXPENSES, {
    variables: { limit: 50, offset: 0 },
    fetchPolicy: "cache-and-network",
  });

  const {
    data: incomesData,
    loading: incomesLoading,
    refetch: refetchIncomes,
  } = useQuery(GET_INCOMES, {
    variables: { limit: 50, offset: 0 },
    fetchPolicy: "cache-and-network",
  });

  const {
    data: ledgerData,
    loading: ledgerLoading,
    refetch: refetchLedger,
  } = useQuery(GET_PAYMENT_TYPE_LEDGER, {
    skip: !selectedPaymentType,
    variables: {
      paymentTypeId: selectedPaymentType,
      dateFrom:
        ledgerRange?.[0] && dayjs.isDayjs(ledgerRange[0])
          ? ledgerRange[0].startOf("day").toISOString()
          : null,
      dateTo:
        ledgerRange?.[1] && dayjs.isDayjs(ledgerRange[1])
          ? ledgerRange[1].endOf("day").toISOString()
          : null,
    },
    fetchPolicy: "cache-and-network",
  });

  const [createExpense, { loading: creatingExpense }] = useMutation(
    CREATE_EXPENSE,
    {
      onCompleted: () => {
        message.success("Expense added");
        expenseForm.resetFields();
        refetchExpenses();
        refetchDashboard();
        if (selectedPaymentType) refetchLedger();
        setExpenseModalOpen(false);
      },
      onError: (error) => message.error(error.message),
    }
  );

  const [createIncome, { loading: creatingIncome }] = useMutation(
    CREATE_INCOME,
    {
      onCompleted: () => {
        message.success("Income added");
        incomeForm.resetFields();
        refetchIncomes();
        refetchDashboard();
        if (selectedPaymentType) refetchLedger();
        setIncomeModalOpen(false);
      },
      onError: (error) => message.error(error.message),
    }
  );

  const [markExpensePaid, { loading: markingExpense }] = useMutation(
    MARK_EXPENSE_PAID,
    {
      onCompleted: () => {
        message.success("Expense marked as paid");
        refetchExpenses();
        refetchDashboard();
        if (selectedPaymentType) refetchLedger();
      },
      onError: (error) => message.error(error.message),
    }
  );

  const [markIncomeReceived, { loading: markingIncome }] = useMutation(
    MARK_INCOME_RECEIVED,
    {
      onCompleted: () => {
        message.success("Income marked as received");
        refetchIncomes();
        refetchDashboard();
        if (selectedPaymentType) refetchLedger();
      },
      onError: (error) => message.error(error.message),
    }
  );

  const paymentTypes = useMemo(
    () => paymentTypeData?.paymentTypes || [],
    [paymentTypeData]
  );

  const handleCreateExpense = (values) => {
    const payload = {
      ...values,
      amount: Number(values.amount || 0),
      dueDate: values.dueDate ? values.dueDate.toISOString() : null,
      recurringFrequency: values.isRecurring
        ? values.recurringFrequency || null
        : null,
      recurringEndDate:
        values.isRecurring && values.recurringEndDate
          ? values.recurringEndDate.toISOString()
          : null,
    };
    createExpense({ variables: { input: payload } });
  };

  const handleCreateIncome = (values) => {
    const payload = {
      ...values,
      amount: Number(values.amount || 0),
      dueDate: values.dueDate ? values.dueDate.toISOString() : null,
      recurringFrequency: values.isRecurring
        ? values.recurringFrequency || null
        : null,
      recurringEndDate:
        values.isRecurring && values.recurringEndDate
          ? values.recurringEndDate.toISOString()
          : null,
    };
    createIncome({ variables: { input: payload } });
  };

  const handleMarkExpensePaid = (record) => {
    if (!record.paymentType?.id) {
      message.warning("Add a payment type before marking paid");
      return;
    }
    markExpensePaid({
      variables: {
        id: record.id,
        paymentTypeId: record.paymentType.id,
        paidDate: dayjs().toISOString(),
        markNextAsPaid: false,
      },
    });
  };

  const handleMarkIncomeReceived = (record) => {
    if (!record.paymentType?.id) {
      message.warning("Add a payment type before marking received");
      return;
    }
    markIncomeReceived({
      variables: {
        id: record.id,
        paymentTypeId: record.paymentType.id,
        receivedDate: dayjs().toISOString(),
        markNextAsReceived: false,
      },
    });
  };

  const expenseColumns = [
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      render: (text, record) => (
        <div>
          <Text strong>{text}</Text>
          {record.category && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.category}
              </Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Due Date",
      dataIndex: "dueDate",
      key: "dueDate",
      render: (value) =>
        value ? dayjs(value).format("DD MMM YYYY") : <Text type="secondary">-</Text>,
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      align: "right",
      render: (value) => <Text strong>{currency(value)}</Text>,
    },
    {
      title: "Payment Type",
      dataIndex: ["paymentType", "name"],
      key: "paymentType",
      render: (_, record) => record.paymentType?.name || "-",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => statusTag(status),
    },
    {
      title: "Recurring",
      dataIndex: "isRecurring",
      key: "isRecurring",
      render: (_, record) =>
        record.isRecurring ? (
          <Tag color="blue">{record.recurringFrequency}</Tag>
        ) : (
          <Tag>One-time</Tag>
        ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Button
          size="small"
          type="link"
          icon={<CheckCircleOutlined />}
          disabled={record.status === "PAID"}
          onClick={() => handleMarkExpensePaid(record)}
          loading={markingExpense}
        >
          Mark Paid
        </Button>
      ),
    },
  ];

  const incomeColumns = [
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      render: (text, record) => (
        <div>
          <Text strong>{text}</Text>
          {record.source && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.source}
              </Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Due Date",
      dataIndex: "dueDate",
      key: "dueDate",
      render: (value) =>
        value ? dayjs(value).format("DD MMM YYYY") : <Text type="secondary">-</Text>,
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      align: "right",
      render: (value) => <Text strong>{currency(value)}</Text>,
    },
    {
      title: "Payment Type",
      dataIndex: ["paymentType", "name"],
      key: "paymentType",
      render: (_, record) => record.paymentType?.name || "-",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => statusTag(status),
    },
    {
      title: "Recurring",
      dataIndex: "isRecurring",
      key: "isRecurring",
      render: (_, record) =>
        record.isRecurring ? (
          <Tag color="purple">{record.recurringFrequency}</Tag>
        ) : (
          <Tag>One-time</Tag>
        ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Button
          size="small"
          type="link"
          icon={<CheckCircleOutlined />}
          disabled={record.status === "RECEIVED"}
          onClick={() => handleMarkIncomeReceived(record)}
          loading={markingIncome}
        >
          Mark Received
        </Button>
      ),
    },
  ];

  const ledgerColumns = [
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      render: (value) => dayjs(value).format("DD MMM YYYY"),
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      render: (type) => (
        <Tag color={type === "INCOME" ? "green" : "red"}>{type}</Tag>
      ),
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => statusTag(status),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      align: "right",
      render: (value, record) => (
        <Text style={{ color: record.type === "INCOME" ? "#389e0d" : "#cf1322" }}>
          {currency(value)}
        </Text>
      ),
    },
    {
      title: "Balance After",
      dataIndex: "balanceAfter",
      key: "balanceAfter",
      align: "right",
      render: (value) => <Text strong>{currency(value)}</Text>,
    },
  ];

  const upcomingExpenses = dashboardData?.financeDashboard?.upcomingExpenses || [];
  const upcomingIncomes = dashboardData?.financeDashboard?.upcomingIncomes || [];

  const summaryCards = [
    {
      title: "Total Income",
      value: dashboardData?.financeDashboard?.totalIncome,
      prefix: <ArrowUpOutlined style={{ color: "#52c41a" }} />,
      color: "#52c41a",
    },
    {
      title: "Total Expense",
      value: dashboardData?.financeDashboard?.totalExpense,
      prefix: <ArrowDownOutlined style={{ color: "#cf1322" }} />,
      color: "#cf1322",
    },
  ];

  const ledgerTotals = ledgerData?.paymentTypeLedger;

  const renderCreateForm = (form, type) => {
    const isExpense = type === "expense";
    const onFinish = isExpense ? handleCreateExpense : handleCreateIncome;

    return (
      <Form layout="vertical" form={form} onFinish={onFinish} initialValues={{ isRecurring: false }}>
        <Form.Item
          name="description"
          label="Description"
          rules={[{ required: true, message: "Please add a description" }]}
        >
          <Input placeholder={isExpense ? "e.g. Office rent" : "e.g. Client payment"} />
        </Form.Item>

        <Form.Item
          name={isExpense ? "category" : "source"}
          label={isExpense ? "Category" : "Source"}
        >
          <Input placeholder={isExpense ? "e.g. Utilities" : "e.g. Customer"} />
        </Form.Item>

        <Form.Item
          name="amount"
          label="Amount"
          rules={[{ required: true, message: "Enter an amount" }]}
        >
          <InputNumber style={{ width: "100%" }} min={0} prefix="₹" />
        </Form.Item>

        <Form.Item name="paymentTypeId" label="Payment Type">
          <Select placeholder="Select payment type" allowClear>
            {paymentTypes.map((pt) => (
              <Option key={pt.id} value={pt.id}>
                {pt.name} ({pt.type})
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="dueDate" label="Due / Expected Date">
          <DatePicker style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item name="isRecurring" label="Recurring" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Form.Item shouldUpdate={(prev, cur) => prev.isRecurring !== cur.isRecurring} noStyle>
          {({ getFieldValue }) =>
            getFieldValue("isRecurring") ? (
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item
                    name="recurringFrequency"
                    label="Frequency"
                    rules={[{ required: true, message: "Select frequency" }]}
                  >
                    <Select placeholder="Choose frequency">
                      <Option value="DAILY">Daily</Option>
                      <Option value="WEEKLY">Weekly</Option>
                      <Option value="MONTHLY">Monthly</Option>
                      <Option value="YEARLY">Yearly</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="recurringEndDate" label="Ends On">
                    <DatePicker style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
              </Row>
            ) : null
          }
        </Form.Item>

        <div className="flex justify-end">
          <Button
            type="primary"
            htmlType="submit"
            icon={<PlusOutlined />}
            loading={isExpense ? creatingExpense : creatingIncome}
          >
            {isExpense ? "Add Expense" : "Add Income"}
          </Button>
        </div>
      </Form>
    );
  };

  return (
    <div className="finance-page">
      <div className="flex justify-between items-center mb-4">
        <Title level={2} className="mb-0">
          Finance
        </Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => {
            refetchDashboard();
            refetchExpenses();
            refetchIncomes();
            if (selectedPaymentType) refetchLedger();
          }}>
            Refresh
          </Button>
        </Space>
      </div>

      <Row gutter={16} className="mb-4">
        {summaryCards.map((card) => (
          <Col xs={24} sm={12} md={8} key={card.title}>
            <Card loading={dashboardLoading}>
              <Statistic
                title={card.title}
                value={card.value || 0}
                precision={2}
                prefix={card.prefix}
                valueStyle={{ color: card.color }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Tabs
        defaultActiveKey="expenses"
        items={[
          {
            key: "expenses",
            label: "Expenses",
            children: (
              <div>
                <div className="flex justify-end mb-3">
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setExpenseModalOpen(true)}
                  >
                    Add Expense
                  </Button>
                </div>
                <Table
                  rowKey="id"
                  loading={expensesLoading}
                  dataSource={expensesData?.expenses?.items || []}
                  columns={expenseColumns}
                  pagination={{ pageSize: 10 }}
                />
              </div>
            ),
          },
          {
            key: "incomes",
            label: "Incomes",
            children: (
              <div>
                <div className="flex justify-end mb-3">
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setIncomeModalOpen(true)}
                  >
                    Add Income
                  </Button>
                </div>
                <Table
                  rowKey="id"
                  loading={incomesLoading}
                  dataSource={incomesData?.incomes?.items || []}
                  columns={incomeColumns}
                  pagination={{ pageSize: 10 }}
                />
              </div>
            ),
          },
          {
            key: "ledger",
            label: "Ledger",
            children: (
              <Card>
                <Row gutter={12} className="mb-4">
                  <Col xs={24} md={8}>
                    <Select
                      placeholder="Payment Type"
                      style={{ width: "100%" }}
                      value={selectedPaymentType}
                      onChange={(val) => setSelectedPaymentType(val)}
                      allowClear
                    >
                      {paymentTypes.map((pt) => (
                        <Option key={pt.id} value={pt.id}>
                          {pt.name} ({pt.type})
                        </Option>
                      ))}
                    </Select>
                  </Col>
                  <Col xs={24} md={10}>
                    <DatePicker.RangePicker
                      style={{ width: "100%" }}
                      value={ledgerRange}
                      onChange={(range) => setLedgerRange(range || [])}
                    />
                  </Col>
                  <Col xs={24} md={6} className="flex justify-end">
                    <Button
                      type="primary"
                      icon={<CalendarOutlined />}
                      onClick={() => selectedPaymentType && refetchLedger()}
                      disabled={!selectedPaymentType}
                    >
                      Load Ledger
                    </Button>
                  </Col>
                </Row>

                {ledgerLoading ? (
                  <Spin />
                ) : selectedPaymentType && ledgerData ? (
                  <>
                    <Row gutter={16} className="mb-4">
                      <Col span={6}>
                        <Card size="small">
                          <Statistic
                            title="Opening Balance"
                            value={ledgerTotals?.openingBalance || 0}
                            precision={2}
                          />
                        </Card>
                      </Col>
                      <Col span={6}>
                        <Card size="small">
                          <Statistic
                            title="Total Income"
                            value={ledgerTotals?.totalIncome || 0}
                            precision={2}
                            valueStyle={{ color: "#52c41a" }}
                          />
                        </Card>
                      </Col>
                      <Col span={6}>
                        <Card size="small">
                          <Statistic
                            title="Total Expense"
                            value={ledgerTotals?.totalExpense || 0}
                            precision={2}
                            valueStyle={{ color: "#cf1322" }}
                          />
                        </Card>
                      </Col>
                      <Col span={6}>
                        <Card size="small">
                          <Statistic
                            title="Closing Balance"
                            value={ledgerTotals?.closingBalance || 0}
                            precision={2}
                            valueStyle={{ color: "#1890ff" }}
                          />
                        </Card>
                      </Col>
                    </Row>

                    <Table
                      rowKey={(row) => `${row.type}-${row.id}`}
                      dataSource={ledgerData?.paymentTypeLedger?.transactions || []}
                      columns={ledgerColumns}
                      pagination={{ pageSize: 10 }}
                    />
                  </>
                ) : (
                  <Text type="secondary">Select a payment type to view ledger.</Text>
                )}
              </Card>
            ),
          },
        ]}
      />

      <Modal
        title="Add Expense"
        open={expenseModalOpen}
        onCancel={() => {
          setExpenseModalOpen(false);
          expenseForm.resetFields();
        }}
        footer={null}
        destroyOnClose
      >
        {renderCreateForm(expenseForm, "expense")}
      </Modal>

      <Modal
        title="Add Income"
        open={incomeModalOpen}
        onCancel={() => {
          setIncomeModalOpen(false);
          incomeForm.resetFields();
        }}
        footer={null}
        destroyOnClose
      >
        {renderCreateForm(incomeForm, "income")}
      </Modal>

      <Divider orientation="left" className="mt-8">
        Upcoming
      </Divider>
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Card title="Upcoming Expenses" size="small">
            <List
              dataSource={upcomingExpenses}
              locale={{ emptyText: "No upcoming expenses" }}
              renderItem={(item) => (
                <List.Item>
                  <Space direction="vertical" size={0}>
                    <Text strong>{item.description}</Text>
                    <Text type="secondary">
                      {item.dueDate
                        ? dayjs(item.dueDate).format("DD MMM YYYY")
                        : "-"}
                    </Text>
                  </Space>
                  <Text strong>{currency(item.amount)}</Text>
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Upcoming Incomes" size="small">
            <List
              dataSource={upcomingIncomes}
              locale={{ emptyText: "No upcoming incomes" }}
              renderItem={(item) => (
                <List.Item>
                  <Space direction="vertical" size={0}>
                    <Text strong>{item.description}</Text>
                    <Text type="secondary">
                      {item.dueDate
                        ? dayjs(item.dueDate).format("DD MMM YYYY")
                        : "-"}
                    </Text>
                  </Space>
                  <Text strong>{currency(item.amount)}</Text>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Finance;