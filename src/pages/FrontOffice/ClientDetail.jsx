import React, { useState } from "react";
import {
  Modal,
  Tabs,
  Card,
  Row,
  Col,
  Descriptions,
  Tag,
  Avatar,
  Button,
  Spin,
  Statistic,
  Timeline,
  Table,
  Empty,
  Space,
  Tooltip,
  Typography,
  Divider,
  Select,
  DatePicker,
  Input,
  Badge,
  Progress,
  Form,
  InputNumber,
  message,
  Alert,
} from "antd";
import {
  UserOutlined,
  EditOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  GlobalOutlined,
  BankOutlined,
  DollarOutlined,
  CalendarOutlined,
  FileTextOutlined,
  TeamOutlined,
  ToolOutlined,
  WalletOutlined,
  CreditCardOutlined,
  FilterOutlined,
  ReloadOutlined,
  PlusOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation } from "@apollo/client";
import dayjs from "dayjs";
import { usePayment } from "../../contexts/PaymentContext";
import {
  GET_CLIENT_WORK_TYPES,
  GET_CLIENT_SERVICE_PROVIDERS,
  GET_TRANSACTIONS_BY_CLIENT,
} from "../../gql/clients";
import {
  GET_CLIENT_LEDGER_SUMMARY,
  GET_CLIENT_LEDGER_RANGE,
  GET_CLIENT_INVOICES,
  GET_CLIENT_PAYMENTS,
  GET_CLIENT_CREDIT_BLOCKED_PROJECTS,
  ALLOCATE_PAYMENT_TO_INVOICE,
} from "../../gql/clientLedger";

const { TabPane } = Tabs;
const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const ClientDetail = ({ client, onClose, onEdit }) => {
  const [activeTab, setActiveTab] = useState("profile");
  const [allocationForm] = Form.useForm();
  const { openPaymentModal } = usePayment();

  // Ledger state
  const [ledgerFilters, setLedgerFilters] = useState({
    invoiceStatus: "all",
    paymentStatus: "all",
    dateRange: [dayjs().startOf("month"), dayjs().endOf("month")],
    showBlockedOnly: false,
  });
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  // Fetch related data
  const { data: workTypesData, loading: workTypesLoading } = useQuery(
    GET_CLIENT_WORK_TYPES,
    {
      variables: { clientId: client.id },
      fetchPolicy: "cache-and-network",
    }
  );

  const { data: serviceProvidersData, loading: serviceProvidersLoading } =
    useQuery(GET_CLIENT_SERVICE_PROVIDERS, {
      variables: { clientId: client.id },
      fetchPolicy: "cache-and-network",
    });

  const { data: transactionsData, loading: transactionsLoading } = useQuery(
    GET_TRANSACTIONS_BY_CLIENT,
    {
      variables: {
        clientId: client.id,
        filters: { limit: 10 }, // Latest 10 transactions
      },
      fetchPolicy: "cache-and-network",
    }
  );

  // Ledger queries
  const {
    data: ledgerData,
    loading: ledgerLoading,
    refetch: refetchLedger,
  } = useQuery(GET_CLIENT_LEDGER_SUMMARY, {
    variables: { clientId: client.id },
    fetchPolicy: "cache-and-network",
  });

  const { data: invoicesData, loading: invoicesLoading } = useQuery(
    GET_CLIENT_INVOICES,
    {
      variables: {
        clientId: client.id,
        filters: {
          ...(ledgerFilters.invoiceStatus !== "all" && {
            status: ledgerFilters.invoiceStatus,
          }),
          ...(ledgerFilters.dateRange && {
            dateFrom: ledgerFilters.dateRange[0].format("YYYY-MM-DD"),
            dateTo: ledgerFilters.dateRange[1].format("YYYY-MM-DD"),
          }),
        },
        pagination: { page: 1, limit: 50 },
      },
      fetchPolicy: "cache-and-network",
    }
  );

  const { data: paymentsData, loading: paymentsLoading } = useQuery(
    GET_CLIENT_PAYMENTS,
    {
      variables: {
        clientId: client.id,
        filters: {
          ...(ledgerFilters.paymentStatus !== "all" && {
            status: ledgerFilters.paymentStatus,
          }),
          ...(ledgerFilters.dateRange && {
            dateFrom: ledgerFilters.dateRange[0].format("YYYY-MM-DD"),
            dateTo: ledgerFilters.dateRange[1].format("YYYY-MM-DD"),
          }),
        },
        pagination: { page: 1, limit: 50 },
      },
      fetchPolicy: "cache-and-network",
    }
  );

  const { data: blockedProjectsData, loading: blockedProjectsLoading } =
    useQuery(GET_CLIENT_CREDIT_BLOCKED_PROJECTS, {
      variables: { clientId: client.id },
      fetchPolicy: "cache-and-network",
    });

  // Range ledger (opening balance + transactions within selected range)
  const {
    data: ledgerRangeData,
    loading: ledgerRangeLoading,
    refetch: refetchLedgerRange,
    error: ledgerRangeError,
  } = useQuery(GET_CLIENT_LEDGER_RANGE, {
    variables: {
      clientId: client.id,
      dateFrom: ledgerFilters.dateRange
        ? ledgerFilters.dateRange[0].format("YYYY-MM-DD")
        : null,
      dateTo: ledgerFilters.dateRange
        ? ledgerFilters.dateRange[1].format("YYYY-MM-DD")
        : null,
      pagination: { page: 1, limit: 1000 },
    },
    skip:
      !client?.id ||
      !ledgerFilters.dateRange ||
      !ledgerFilters.dateRange[0] ||
      !ledgerFilters.dateRange[1],
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
    notifyOnNetworkStatusChange: true,
  });

  // Mutations
  const [allocatePayment] = useMutation(ALLOCATE_PAYMENT_TO_INVOICE, {
    onCompleted: (data) => {
      if (data.allocatePaymentToInvoice.success) {
        message.success(data.allocatePaymentToInvoice.message);
        setShowAllocationModal(false);
        allocationForm.resetFields();
        refetchLedger();
      } else {
        message.error(data.allocatePaymentToInvoice.message);
      }
    },
    onError: (error) => {
      message.error("Error allocating payment: " + error.message);
    },
  });

  // Helper functions
  const getStatusColor = (status) => {
    const colors = {
      active: "green",
      inactive: "red",
      suspended: "orange",
      pending: "blue",
    };
    return colors[status] || "default";
  };

  const getClientTypeColor = (type) => {
    const colors = {
      project: "blue",
      "walk-in": "green",
      corporate: "purple",
      individual: "orange",
    };
    return colors[type] || "default";
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount || 0);
  };

  // Transaction table columns
  const transactionColumns = [
    {
      title: "Date",
      dataIndex: "paymentDate",
      key: "date",
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: "Type",
      dataIndex: "transactionType",
      key: "type",
      render: (type) => (
        <Tag color={type === "credit" ? "green" : "orange"}>
          {type?.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      render: (amount) => formatCurrency(amount),
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
      render: (status) => (
        <Tag
          color={
            status === "paid"
              ? "green"
              : status === "pending"
              ? "orange"
              : "red"
          }
        >
          {status?.toUpperCase()}
        </Tag>
      ),
    },
  ];

  // Work types table columns
  const workTypeColumns = [
    {
      title: "Work Type",
      dataIndex: "workTypeName",
      key: "workType",
    },
    {
      title: "Rate Type",
      dataIndex: "rateType",
      key: "rateType",
      render: (type) => <Tag>{type?.replace("_", " ")?.toUpperCase()}</Tag>,
    },
    {
      title: "Rate",
      dataIndex: "rate",
      key: "rate",
      render: (rate, record) => (
        <span>
          {formatCurrency(rate)}
          {record.rateType === "hourly" && "/hr"}
          {record.rateType === "daily" && "/day"}
          {record.rateType === "monthly" && "/month"}
        </span>
      ),
    },
    {
      title: "Status",
      dataIndex: "isActive",
      key: "status",
      render: (isActive) => (
        <Tag color={isActive ? "green" : "red"}>
          {isActive ? "ACTIVE" : "INACTIVE"}
        </Tag>
      ),
    },
  ];

  // Service providers table columns
  const serviceProviderColumns = [
    {
      title: "Service Provider",
      dataIndex: "serviceProviderName",
      key: "name",
    },
    {
      title: "Contact Person",
      dataIndex: "contactPerson",
      key: "contact",
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Phone",
      dataIndex: "phone",
      key: "phone",
    },
    {
      title: "Status",
      dataIndex: "isActive",
      key: "status",
      render: (isActive) => (
        <Tag color={isActive ? "green" : "red"}>
          {isActive ? "ACTIVE" : "INACTIVE"}
        </Tag>
      ),
    },
  ];

  const renderProfileTab = () => (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card title="Basic Information">
        <Row gutter={[24, 16]}>
          <Col span={24}>
            <div className="flex items-center space-x-4 mb-4">
              <Avatar size={80} src={client.logo} icon={<UserOutlined />} />
              <div>
                <Title level={3} className="mb-1">
                  {client.companyName || client.displayName}
                </Title>
                <Text className="text-lg text-gray-500 block">
                  {client.clientCode}
                </Text>
                <Space size="small" className="mt-2">
                  <Tag color={getClientTypeColor(client.clientType)}>
                    {client.clientType?.toUpperCase()}
                  </Tag>
                  <Tag color={getStatusColor(client.status)}>
                    {client.status?.toUpperCase()}
                  </Tag>
                </Space>
              </div>
            </div>
          </Col>
        </Row>

        <Descriptions bordered column={2}>
          <Descriptions.Item label="Contact Person" span={1}>
            {client.displayName}
          </Descriptions.Item>
          <Descriptions.Item label="Designation" span={1}>
            {client.designation || "N/A"}
          </Descriptions.Item>
          <Descriptions.Item label="Company Name" span={1}>
            {client.companyName || "N/A"}
          </Descriptions.Item>
          <Descriptions.Item label="Industry" span={1}>
            {client.industry || "N/A"}
          </Descriptions.Item>
          <Descriptions.Item label="Company Size" span={1}>
            {client.companySize || "N/A"}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Contact Information */}
      <Card
        title={
          <>
            <PhoneOutlined /> Contact Information
          </>
        }
      >
        <Descriptions bordered column={2}>
          <Descriptions.Item label="Email" span={1}>
            <div className="flex items-center">
              <MailOutlined className="mr-2" />
              <a href={`mailto:${client.email}`}>{client.email}</a>
            </div>
          </Descriptions.Item>
          <Descriptions.Item label="Phone" span={1}>
            <div className="flex items-center">
              <PhoneOutlined className="mr-2" />
              <a href={`tel:${client.phone}`}>{client.phone}</a>
            </div>
          </Descriptions.Item>
          <Descriptions.Item label="Alternate Phone" span={1}>
            {client.alternatePhone ? (
              <div className="flex items-center">
                <PhoneOutlined className="mr-2" />
                <a href={`tel:${client.alternatePhone}`}>
                  {client.alternatePhone}
                </a>
              </div>
            ) : (
              "N/A"
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Website" span={1}>
            {client.website ? (
              <div className="flex items-center">
                <GlobalOutlined className="mr-2" />
                <a
                  href={client.website}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {client.website}
                </a>
              </div>
            ) : (
              "N/A"
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Preferred Contact" span={1}>
            {client.preferredContactMethod || "Email"}
          </Descriptions.Item>
          <Descriptions.Item label="Source" span={1}>
            {client.source || "N/A"}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Address Information */}
      <Card
        title={
          <>
            <EnvironmentOutlined /> Address Information
          </>
        }
      >
        <Descriptions bordered column={1}>
          <Descriptions.Item label="Address">
            {client.address}
          </Descriptions.Item>
          <Descriptions.Item label="Location">
            {[client.city?.name, client.state?.name, client.country?.name]
              .filter(Boolean)
              .join(", ")}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Business Information */}
      <Card
        title={
          <>
            <BankOutlined /> Business Information
          </>
        }
      >
        <Descriptions bordered column={2}>
          <Descriptions.Item label="Tax ID" span={1}>
            {client.taxId || "N/A"}
          </Descriptions.Item>
          <Descriptions.Item label="Registration Number" span={1}>
            {client.registrationNumber || "N/A"}
          </Descriptions.Item>
          <Descriptions.Item label="Business Description" span={2}>
            {client.businessDescription || "N/A"}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Additional Notes */}
      {client.notes && (
        <Card
          title={
            <>
              <FileTextOutlined /> Additional Notes
            </>
          }
        >
          <Text>{client.notes}</Text>
        </Card>
      )}

      {/* Timestamps */}
      <Card
        title={
          <>
            <CalendarOutlined /> Record Information
          </>
        }
      >
        <Descriptions bordered column={2}>
          <Descriptions.Item label="Created At">
            {new Date(client.createdAt).toLocaleString()}
          </Descriptions.Item>
          <Descriptions.Item label="Updated At">
            {new Date(client.updatedAt).toLocaleString()}
          </Descriptions.Item>
          <Descriptions.Item label="Created By">
            {client.creator
              ? `${client.creator.firstName} ${client.creator.lastName}`
              : "N/A"}
          </Descriptions.Item>
          <Descriptions.Item label="Updated By">
            {client.updater
              ? `${client.updater.firstName} ${client.updater.lastName}`
              : "N/A"}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );

  const renderWorkTypesTab = () => (
    <Card
      title={
        <>
          <ToolOutlined /> Work Types
        </>
      }
    >
      <Table
        columns={workTypeColumns}
        dataSource={workTypesData?.clientWorkTypes || []}
        loading={workTypesLoading}
        rowKey="id"
        pagination={false}
        locale={{
          emptyText: <Empty description="No work types assigned" />,
        }}
      />
    </Card>
  );

  const renderServiceProvidersTab = () => {
    // Transform service provider data to match table column expectations
    const transformedServiceProviders = (serviceProvidersData?.serviceProvidersByClient || []).map(user => ({
      id: user.id,
      serviceProviderName: `${user.firstName} ${user.lastName}`,
      contactPerson: `${user.firstName} ${user.lastName}`,
      email: user.email || 'N/A',
      phone: user.contactPersonal || 'N/A'
    }));

    return (
      <Card
        title={
          <>
            <TeamOutlined /> Service Providers
          </>
        }
      >
        <Table
          columns={serviceProviderColumns}
          dataSource={transformedServiceProviders}
          loading={serviceProvidersLoading}
          rowKey="id"
          pagination={false}
          locale={{
            emptyText: <Empty description="No service providers assigned" />,
          }}
        />
      </Card>
    );
  };

  const renderLedgerTab = () => {
    const ledgerSummary = ledgerData?.clientLedgerSummary;

    return (
      <div className="space-y-6">
        {/* Credit Summary */}
        <Row gutter={16}>
          <Col span={6}>
            <Card>
              <Statistic
                title="Credit Limit"
                value={ledgerSummary?.client?.creditLimit || 0}
                precision={2}
                prefix="₹"
                valueStyle={{ color: "#1890ff" }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Available Credit"
                value={ledgerSummary?.summary?.availableCredit || 0}
                precision={2}
                prefix="₹"
                valueStyle={{
                  color:
                    (ledgerSummary?.summary?.availableCredit || 0) > 0
                      ? "#52c41a"
                      : "#f5222d",
                }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Outstanding Amount"
                value={ledgerSummary?.summary?.totalOutstanding || 0}
                precision={2}
                prefix="₹"
                valueStyle={{ color: "#f5222d" }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Credit Blocked"
                value={ledgerSummary?.summary?.totalCreditBlocked || 0}
                precision={2}
                prefix="₹"
                valueStyle={{ color: "#faad14" }}
              />
            </Card>
          </Col>
        </Row>

        {/* Credit Utilization */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <Title level={5}>Credit Utilization</Title>
            <Text>
              {ledgerSummary?.summary?.creditUtilization?.toFixed(1) || 0}% of
              credit limit used
            </Text>
          </div>
          <Progress
            percent={ledgerSummary?.summary?.creditUtilization || 0}
            status={
              (ledgerSummary?.summary?.creditUtilization || 0) > 90
                ? "exception"
                : (ledgerSummary?.summary?.creditUtilization || 0) > 75
                ? "active"
                : "success"
            }
            strokeColor={
              (ledgerSummary?.summary?.creditUtilization || 0) > 90
                ? "#ff4d4f"
                : (ledgerSummary?.summary?.creditUtilization || 0) > 75
                ? "#faad14"
                : "#52c41a"
            }
          />
        </Card>

        {/* Filters */}
        <Card
          title={
            <>
              <FilterOutlined /> Filters
            </>
          }
        >
          <Row gutter={16}>
            <Col span={6}>
              <Select
                placeholder="Invoice Status"
                value={ledgerFilters.invoiceStatus}
                onChange={(value) =>
                  setLedgerFilters((prev) => ({
                    ...prev,
                    invoiceStatus: value,
                  }))
                }
                style={{ width: "100%" }}
              >
                <Option value="all">All Invoices</Option>
                <Option value="pending">Pending</Option>
                <Option value="partial">Partially Paid</Option>
                <Option value="paid">Paid</Option>
                <Option value="overdue">Overdue</Option>
              </Select>
            </Col>
            <Col span={6}>
              <Select
                placeholder="Payment Status"
                value={ledgerFilters.paymentStatus}
                onChange={(value) =>
                  setLedgerFilters((prev) => ({
                    ...prev,
                    paymentStatus: value,
                  }))
                }
                style={{ width: "100%" }}
              >
                <Option value="all">All Payments</Option>
                <Option value="allocated">Fully Allocated</Option>
                <Option value="partial">Partially Allocated</Option>
                <Option value="unallocated">Unallocated</Option>
              </Select>
            </Col>
            <Col span={8}>
              <RangePicker
                placeholder={["Start Date", "End Date"]}
                value={ledgerFilters.dateRange}
                onChange={(dates) =>
                  setLedgerFilters((prev) => ({ ...prev, dateRange: dates }))
                }
                style={{ width: "100%" }}
              />
            </Col>
            <Col span={4}>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  setLedgerFilters({
                    invoiceStatus: "all",
                    paymentStatus: "all",
                    dateRange: [
                      dayjs().startOf("month"),
                      dayjs().endOf("month"),
                    ],
                    showBlockedOnly: false,
                  });
                }}
              >
                Reset
              </Button>
            </Col>
          </Row>
        </Card>

        {/* Date-range ledger (opening balance + transactions) */}
        <Card
          title={
            <>
              <WalletOutlined /> Date-wise Ledger
            </>
          }
          style={{ marginTop: 12 }}
        >
          {ledgerRangeLoading ? (
            <div
              style={{ display: "flex", justifyContent: "center", padding: 24 }}
            >
              <Spin />
            </div>
          ) : ledgerRangeError ? (
            <div style={{ textAlign: "center", padding: 24 }}>
              <Text type="secondary">
                Unable to load ledger data for the selected date range.
              </Text>
            </div>
          ) : (
            (() => {
              const range = ledgerRangeData?.clientLedgerRange;
              const opening = Number(range?.openingBalance ?? 0);
              const txs = (range?.transactions || []).slice();

              // Debug: Log transaction data to check project and invoice info
              if (txs.length > 0) {
                console.log(
                  "Ledger transactions sample:",
                  JSON.stringify(txs[0], null, 2)
                );
              }

              txs.sort(
                (a, b) =>
                  new Date(a.transactionDate) - new Date(b.transactionDate)
              );

              let running = opening;
              const txWithRunning = txs.map((t) => {
                const debit = Number(t.debitAmount || 0);
                const credit = Number(t.creditAmount || 0);
                running = running + credit - debit;
                return { ...t, debit, credit, runningBalance: running };
              });

              const closing = Number(range?.closingBalance ?? running);

              const balanceLabel = (amt) => {
                if (amt > 0) return { text: "To Pay (DR)", color: "#f5222d" };
                if (amt < 0)
                  return { text: "To Receive (CR)", color: "#52c41a" };
                return { text: "Settled", color: "#1890ff" };
              };

              return (
                <div>
                  <Row gutter={16} style={{ marginBottom: 12 }}>
                    <Col span={8}>
                      <Card>
                        <Statistic
                          title="Opening Balance"
                          value={opening}
                          precision={2}
                          prefix="₹"
                        />
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card>
                        <Statistic
                          title="Closing Balance"
                          value={closing}
                          precision={2}
                          prefix="₹"
                        />
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card>
                        <Statistic
                          title="Transactions"
                          value={txWithRunning.length}
                        />
                      </Card>
                    </Col>
                  </Row>

                  <Table
                    dataSource={txWithRunning}
                    rowKey="id"
                    size="small"
                    pagination={{ pageSize: 10 }}
                    scroll={{ x: 1400 }}
                    columns={[
                      {
                        title: "Order Date",
                        key: "orderDate",
                        width: 100,
                        render: (_, r) => {
                          const project = r.invoice?.project;
                          return project?.createdAt
                            ? dayjs(project.createdAt).format("DD/MM/YYYY")
                            : "-";
                        },
                      },
                      {
                        title: "Invoice Date",
                        key: "invoiceDate",
                        width: 100,
                        render: (_, r) =>
                          r.invoice?.invoiceDate
                            ? dayjs(r.invoice.invoiceDate).format("DD/MM/YYYY")
                            : "-",
                      },
                      {
                        title: "Work Days",
                        key: "workDays",
                        width: 90,
                        render: (_, r) => {
                          const project = r.invoice?.project;
                          if (project?.createdAt && r.invoice?.invoiceDate) {
                            const days = dayjs(r.invoice.invoiceDate).diff(
                              dayjs(project.createdAt),
                              "day"
                            );
                            return `${days}d`;
                          }
                          return "-";
                        },
                      },
                      {
                        title: "Document No.",
                        key: "documentNumber",
                        width: 120,
                        render: (_, r) => {
                          if (r.payment) {
                            return (
                              <Tag color="green">
                                {r.payment.paymentNumber}
                              </Tag>
                            );
                          }
                          return r.invoice?.invoiceNumber || "-";
                        },
                      },
                      {
                        title: "Particulars",
                        key: "particulars",
                        width: 200,
                        ellipsis: true,
                        render: (_, r) => {
                          const project = r.invoice?.project;
                          const payment = r.payment;
                          
                          if (payment) {
                            // This is a payment transaction
                            return (
                              <div>
                                <div style={{ fontWeight: 500 }}>
                                  {payment.paymentNumber}
                                </div>
                                <div style={{ fontSize: 12, color: "#666" }}>
                                  Payment Received
                                </div>
                              </div>
                            );
                          } else if (project) {
                            // This is an invoice transaction
                            return (
                              <div>
                                <div style={{ fontWeight: 500 }}>
                                  {project.projectCode}
                                </div>
                                <div style={{ fontSize: 12, color: "#666" }}>
                                  {project.name || project.description}
                                </div>
                              </div>
                            );
                          }
                          return r.description || "-";
                        },
                      },
                      {
                        title: "Details",
                        key: "details",
                        width: 300,
                        render: (_, r) => {
                          const project = r.invoice?.project;
                          const payment = r.payment;
                          
                          if (payment) {
                            // Show payment details
                            return (
                              <div style={{ fontSize: 11, lineHeight: "1.4" }}>
                                {payment.paymentType && (
                                  <div>
                                    <strong>Type:</strong> {payment.paymentType.name} ({payment.paymentType.type})
                                  </div>
                                )}
                                {payment.paymentDate && (
                                  <div>
                                    <strong>Date:</strong> {dayjs(payment.paymentDate).format("DD/MM/YYYY")}
                                  </div>
                                )}
                                {r.referenceNumber && (
                                  <div>
                                    <strong>Ref:</strong> {r.referenceNumber}
                                  </div>
                                )}
                              </div>
                            );
                          } else if (project?.projectGradings?.length > 0) {
                            // Show project grading details
                            const lines = project.projectGradings.map((pg) => {
                              const qty = pg.imageQuantity || 0;
                              const rate =
                                (pg.customRate !== undefined && pg.customRate !== null)
                                  ? pg.customRate
                                  : (pg.grading?.defaultRate ?? 0);
                              const total = qty * rate;
                              return `${
                                pg.grading?.name || pg.grading?.shortCode
                              }  (qty) ${qty} × ₹${rate.toFixed(
                                2
                              )} = ₹${total.toFixed(2)}`;
                            });
                            return (
                              <div style={{ fontSize: 11, lineHeight: "1.4" }}>
                                {lines.map((line, idx) => (
                                  <div key={idx}>{line}</div>
                                ))}
                              </div>
                            );
                          }
                          return r.description || "-";
                        },
                      },
                      {
                        title: "Debit",
                        dataIndex: "debit",
                        key: "debit",
                        width: 110,
                        align: "right",
                        render: (v) => (v > 0 ? formatCurrency(v) : "-"),
                      },
                      {
                        title: "Credit",
                        dataIndex: "credit",
                        key: "credit",
                        width: 110,
                        align: "right",
                        render: (v) => (v > 0 ? formatCurrency(v) : "-"),
                      },
                      {
                        title: "Running Balance",
                        dataIndex: "runningBalance",
                        key: "runningBalance",
                        width: 140,
                        align: "right",
                        render: (v) => (
                          <div>
                            <div>{formatCurrency(Math.abs(v))}</div>
                            <div
                              style={{
                                color: balanceLabel(v).color,
                                fontSize: 11,
                              }}
                            >
                              {balanceLabel(v).text}
                            </div>
                          </div>
                        ),
                      },
                    ]}
                  />
                </div>
              );
            })()
          )}
        </Card>

        {/* Credit Blocked Projects */}
        {blockedProjectsData?.clientCreditBlockedProjects?.length > 0 && (
          <Card
            title={
              <div className="flex items-center">
                <ExclamationCircleOutlined
                  style={{ color: "#faad14", marginRight: 8 }}
                />
                <span>Credit Blocked Projects</span>
                <Badge
                  count={blockedProjectsData.clientCreditBlockedProjects.length}
                  style={{ marginLeft: 8 }}
                />
              </div>
            }
          >
            <Alert
              message="The following projects have credit blocked. Complete payments to release credits."
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Table
              columns={[
                {
                  title: "Project Code",
                  dataIndex: "projectCode",
                  key: "projectCode",
                },
                {
                  title: "Description",
                  dataIndex: "description",
                  key: "description",
                  ellipsis: true,
                },
                {
                  title: "Blocked Amount",
                  dataIndex: "creditBlockedAmount",
                  key: "blockedAmount",
                  render: (amount) => formatCurrency(amount),
                },
                {
                  title: "Blocked Date",
                  dataIndex: "creditBlockedAt",
                  key: "blockedDate",
                  render: (date) => new Date(date).toLocaleDateString(),
                },
                {
                  title: "Status",
                  dataIndex: "status",
                  key: "status",
                  render: (status) => (
                    <Tag color="orange">{status?.toUpperCase()}</Tag>
                  ),
                },
              ]}
              dataSource={blockedProjectsData.clientCreditBlockedProjects}
              loading={blockedProjectsLoading}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>
        )}

        {/* Invoices and Payments Tables */}
        <Row gutter={16}>
          <Col span={12}>
            <Card
              title={
                <>
                  <FileTextOutlined /> Invoices
                </>
              }
              extra={
                <Badge
                  count={invoicesData?.clientInvoices?.invoices?.length || 0}
                  showZero
                />
              }
            >
              <Table
                columns={[
                  {
                    title: "Invoice #",
                    dataIndex: "invoiceNumber",
                    key: "invoiceNumber",
                  },
                  {
                    title: "Project",
                    dataIndex: ["project", "projectCode"],
                    key: "projectCode",
                  },
                  {
                    title: "Amount",
                    dataIndex: "totalAmount",
                    key: "amount",
                    render: (amount) => formatCurrency(amount),
                  },
                  {
                    title: "Balance",
                    dataIndex: "balanceAmount",
                    key: "balance",
                    render: (balance) => (
                      <Text
                        style={{ color: balance > 0 ? "#f5222d" : "#52c41a" }}
                      >
                        {formatCurrency(balance)}
                      </Text>
                    ),
                  },
                  {
                    title: "Status",
                    dataIndex: "status",
                    key: "status",
                    render: (status) => {
                      const colors = {
                        pending: "orange",
                        partial: "blue",
                        paid: "green",
                        overdue: "red",
                      };
                      return (
                        <Tag color={colors[status] || "default"}>
                          {status?.toUpperCase()}
                        </Tag>
                      );
                    },
                  },
                ]}
                dataSource={invoicesData?.clientInvoices?.invoices || []}
                loading={invoicesLoading}
                rowKey="id"
                pagination={{ pageSize: 10, showSizeChanger: false }}
                size="small"
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card
              title={
                <>
                  <WalletOutlined /> Payments
                </>
              }
              extra={
                <Badge
                  count={paymentsData?.clientPayments?.payments?.length || 0}
                  showZero
                />
              }
            >
              <Table
                columns={[
                  {
                    title: "Payment #",
                    dataIndex: "paymentNumber",
                    key: "paymentNumber",
                  },
                  {
                    title: "Date",
                    dataIndex: "paymentDate",
                    key: "date",
                    render: (date) => new Date(date).toLocaleDateString(),
                  },
                  {
                    title: "Amount",
                    dataIndex: "amount",
                    key: "amount",
                    render: (amount) => formatCurrency(amount),
                  },
                  {
                    title: "Unallocated",
                    dataIndex: "unallocatedAmount",
                    key: "unallocated",
                    render: (amount) => (
                      <Text
                        style={{ color: amount > 0 ? "#faad14" : "#52c41a" }}
                      >
                        {formatCurrency(amount)}
                      </Text>
                    ),
                  },
                  {
                    title: "Type",
                    dataIndex: ["paymentType", "name"],
                    key: "type",
                  },
                ]}
                dataSource={paymentsData?.clientPayments?.payments || []}
                loading={paymentsLoading}
                rowKey="id"
                pagination={{ pageSize: 10, showSizeChanger: false }}
                size="small"
                onRow={(record) => ({
                  onClick: () => {
                    if (record.unallocatedAmount > 0) {
                      setSelectedPayment(record);
                      setShowAllocationModal(true);
                    }
                  },
                  style: {
                    cursor:
                      record.unallocatedAmount > 0 ? "pointer" : "default",
                  },
                })}
              />
            </Card>
          </Col>
        </Row>

        {/* Action Buttons */}
        <Card>
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => openPaymentModal(client.id)}
            >
              Record Payment
            </Button>
            <Button
              icon={<CreditCardOutlined />}
              onClick={() => {
                if (
                  paymentsData?.clientPayments?.payments?.some(
                    (p) => p.unallocatedAmount > 0
                  )
                ) {
                  setShowAllocationModal(true);
                } else {
                  message.info(
                    "No unallocated payments available for allocation"
                  );
                }
              }}
            >
              Allocate Payments
            </Button>
          </Space>
        </Card>
      </div>
    );
  };

  const renderTransactionsTab = () => (
    <div className="space-y-4">
      {/* Financial Summary */}
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Transactions"
              value={transactionsData?.transactionsByClient?.length || 0}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Invoiced"
              value={
                transactionsData?.transactionsByClient
                  ?.filter((t) => t.transactionType === "debit")
                  ?.reduce((sum, t) => sum + t.amount, 0) || 0
              }
              precision={2}
              prefix="₹"
              valueStyle={{ color: "#f5222d" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Paid"
              value={
                transactionsData?.transactionsByClient
                  ?.filter((t) => t.transactionType === "credit")
                  ?.reduce((sum, t) => sum + t.amount, 0) || 0
              }
              precision={2}
              prefix="₹"
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Recent Transactions */}
      <Card
        title={
          <>
            <DollarOutlined /> Recent Transactions
          </>
        }
      >
        <Table
          columns={transactionColumns}
          dataSource={transactionsData?.transactionsByClient || []}
          loading={transactionsLoading}
          rowKey="id"
          pagination={false}
          locale={{
            emptyText: <Empty description="No transactions found" />,
          }}
        />
      </Card>
    </div>
  );

  return (
    <Modal
      title={
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <UserOutlined />
            <span>Client Details</span>
          </div>
          <Button type="primary" icon={<EditOutlined />} onClick={onEdit}>
            Edit Client
          </Button>
        </div>
      }
      open={true}
      onCancel={onClose}
      width={1200}
      footer={null}
      destroyOnClose
    >
      <div className="py-4">
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane
            tab={
              <span>
                <UserOutlined />
                Details
              </span>
            }
            key="profile"
          >
            {renderProfileTab()}
          </TabPane>
          <TabPane
            tab={
              <span>
                <WalletOutlined />
                Ledger
                {ledgerData?.clientLedgerSummary?.summary?.totalCreditBlocked >
                  0 && (
                  <Badge
                    count="!"
                    size="small"
                    style={{ backgroundColor: "#faad14" }}
                  />
                )}
              </span>
            }
            key="ledger"
          >
            {renderLedgerTab()}
          </TabPane>
          <TabPane
            tab={
              <span>
                <ToolOutlined />
                Work Types
              </span>
            }
            key="workTypes"
          >
            {renderWorkTypesTab()}
          </TabPane>
          <TabPane
            tab={
              <span>
                <TeamOutlined />
                Service Providers
              </span>
            }
            key="serviceProviders"
          >
            {renderServiceProvidersTab()}
          </TabPane>
          <TabPane
            tab={
              <span>
                <DollarOutlined />
                Transactions
              </span>
            }
            key="transactions"
          >
            {renderTransactionsTab()}
          </TabPane>
        </Tabs>
      </div>

      {/* Payment Allocation Modal */}
      <Modal
        title="Allocate Payment to Invoice"
        open={showAllocationModal}
        onCancel={() => {
          setShowAllocationModal(false);
          setSelectedPayment(null);
          allocationForm.resetFields();
        }}
        footer={null}
        width={800}
      >
        {selectedPayment && (
          <div className="mb-4">
            <Alert
              message={`Payment #${
                selectedPayment.paymentNumber
              } - Unallocated: ${formatCurrency(
                selectedPayment.unallocatedAmount
              )}`}
              type="info"
            />
          </div>
        )}
        <Form
          form={allocationForm}
          layout="vertical"
          onFinish={(values) => {
            allocatePayment({
              variables: {
                input: {
                  paymentId: selectedPayment?.id,
                  invoiceId: values.invoiceId,
                  allocatedAmount: values.allocatedAmount,
                },
              },
            });
          }}
        >
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                name="invoiceId"
                label="Select Invoice"
                rules={[
                  { required: true, message: "Please select an invoice" },
                ]}
              >
                <Select
                  placeholder="Select invoice to allocate payment"
                  showSearch
                  optionFilterProp="children"
                >
                  {invoicesData?.clientInvoices?.invoices
                    ?.filter((invoice) => invoice.balanceAmount > 0)
                    ?.map((invoice) => (
                      <Option key={invoice.id} value={invoice.id}>
                        {invoice.invoiceNumber} - {invoice.project.projectCode}
                        (Balance: {formatCurrency(invoice.balanceAmount)})
                      </Option>
                    ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="allocatedAmount"
                label="Amount to Allocate"
                rules={[{ required: true, message: "Please enter amount" }]}
              >
                <InputNumber
                  style={{ width: "100%" }}
                  min={0.01}
                  max={selectedPayment?.unallocatedAmount}
                  precision={2}
                  formatter={(value) =>
                    `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                  }
                  parser={(value) => value.replace(/₹\s?|(,*)/g, "")}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Allocate Payment
              </Button>
              <Button onClick={() => setShowAllocationModal(false)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Modal>
  );
};

export default ClientDetail;
