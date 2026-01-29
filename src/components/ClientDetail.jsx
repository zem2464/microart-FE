import React, { useState } from "react";
import {
  Card,
  Row,
  Col,
  Tag,
  Typography,
  Space,
  Button,
  Spin,
  Tabs,
  Table,
  DatePicker,
  Statistic,
  Tooltip,
} from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { useQuery } from "@apollo/client";
import { GET_CLIENT } from "../gql/clients";
import { GET_CLIENT_LEDGER_RANGE } from "../gql/clientLedger";
import dayjs from "dayjs";

const { Text, Title } = Typography;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    amount || 0
  );

const buildWorkTypeSequenceMap = (project) => {
  const map = {};

  (project?.projectWorkTypes || []).forEach((pwt) => {
    const workTypeId = pwt?.workTypeId || pwt?.workType?.id;
    if (!workTypeId) return;
    map[String(workTypeId)] =
      pwt.sequence ?? pwt.sortOrder ?? pwt?.workType?.sortOrder ?? 9999;
  });

  (project?.projectGradings || []).forEach((pg) => {
    const workTypeId = pg?.grading?.workType?.id;
    if (!workTypeId) return;
    const key = String(workTypeId);
    if (map[key] === undefined || map[key] === null) {
      map[key] = pg?.grading?.workType?.sortOrder ?? 9999;
    }
  });

  return map;
};

const getSortedProjectGradings = (project) => {
  if (!project?.projectGradings?.length) return [];
  const workTypeSequenceMap = buildWorkTypeSequenceMap(project);

  return [...project.projectGradings].sort((a, b) => {
    const orderA = workTypeSequenceMap[String(a?.grading?.workType?.id)] ?? 9999;
    const orderB = workTypeSequenceMap[String(b?.grading?.workType?.id)] ?? 9999;
    if (orderA !== orderB) return orderA - orderB;
    const nameA = a?.grading?.name || "";
    const nameB = b?.grading?.name || "";
    return nameA.localeCompare(nameB);
  });
};

const ClientDetail = ({ client: clientProp, onEdit, onDelete, onClose }) => {
  // Fetch full client data with all associations
  const { data, loading, error } = useQuery(GET_CLIENT, {
    variables: { id: clientProp?.id },
    skip: !clientProp?.id,
    fetchPolicy: "network-only", // Always fetch fresh data
  });

  // Use fetched data if available, otherwise use prop
  const client = data?.client || clientProp;

  // Ledger date range state (default: current month)
  const [dateRange, setDateRange] = useState([
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);

  // Add styles for balance rows
  React.useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      .ledger-opening-balance-row {
        background-color: #e6f7ff !important;
        font-weight: 600;
      }
      .ledger-closing-balance-row {
        background-color: #f6ffed !important;
        font-weight: 600;
        border-top: 2px solid #52c41a !important;
      }
      .ledger-opening-balance-row:hover,
      .ledger-closing-balance-row:hover {
        background-color: inherit !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Server-backed range ledger: openingBalance + transactions
  const {
    data: ledgerRangeData,
    loading: ledgerRangeLoading,
    refetch: refetchLedgerRange,
    error: ledgerRangeError,
  } = useQuery(GET_CLIENT_LEDGER_RANGE, {
    variables: {
      clientId: client?.id,
      dateFrom: dateRange ? dateRange[0].format("YYYY-MM-DD") : null,
      dateTo: dateRange ? dateRange[1].format("YYYY-MM-DD") : null,
      pagination: { page: 1, limit: 1000 },
    },
    skip: !client?.id || !dateRange || !dateRange[0] || !dateRange[1],
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
    notifyOnNetworkStatusChange: true,
  });

  // Note: don't block rendering of the whole drawer while the full client details
  // are being fetched. This lets the Ledger tab load independently (it uses the
  // passed-in client id) so users can view the ledger even if some client
  // associations take longer to load.

  if (error) {
    return <div>Error loading client details: {error.message}</div>;
  }

  // do not early-return when client is not yet available — render tabs so Ledger
  // can still load. Details tab will show a spinner until client data arrives.

  const getClientTypeColor = (type) => {
    return type === "permanent" ? "blue" : "green";
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "A":
        return "red";
      case "B":
        return "orange";
      case "C":
        return "green";
      default:
        return "default";
    }
  };

  const getPriorityText = (priority) => {
    switch (priority) {
      case "A":
        return "High Priority";
      case "B":
        return "Normal Priority";
      case "C":
        return "Low Priority";
      default:
        return priority;
    }
  };

  return (
    <Tabs defaultActiveKey="details">
      <TabPane tab="Details" key="details">
        {loading || !client ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "40px",
            }}
          >
            <Spin size="large" />
          </div>
        ) : (
          <div>
            <div
              style={{
                marginBottom: 16,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Title level={4} style={{ margin: 0 }}>
                {client.displayName ||
                  `${client.firstName} ${client.lastName}`.trim()}
              </Title>
              <Space>
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={() => onEdit?.(client)}
                  size="small"
                >
                  Edit
                </Button>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => onDelete?.(client)}
                  size="small"
                >
                  Delete
                </Button>
              </Space>
            </div>

            <Card size="small" style={{ marginBottom: 16 }}>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Text strong>Client Code:</Text>
                  <br />
                  <Text>{client.clientCode}</Text>
                </Col>
                <Col span={12}>
                  <Text strong>Client Type:</Text>
                  <br />
                  <Tag color={getClientTypeColor(client.clientType)}>
                    {client.clientType === "permanent"
                      ? "Permanent"
                      : "Walk-in"}
                  </Tag>
                </Col>
                <Col span={12}>
                  <Text strong>First Name:</Text>
                  <br />
                  <Text>{client.firstName}</Text>
                </Col>
                <Col span={12}>
                  <Text strong>Last Name:</Text>
                  <br />
                  <Text>{client.lastName || "-"}</Text>
                </Col>
                {client.companyName && (
                  <Col span={24}>
                    <Text strong>Company Name:</Text>
                    <br />
                    <Text>{client.companyName}</Text>
                  </Col>
                )}
                <Col span={12}>
                  <Text strong>Email:</Text>
                  <br />
                  <Text>{client.email || "-"}</Text>
                </Col>
                <Col span={12}>
                  <Text strong>Work Phone:</Text>
                  <br />
                  <Text>{client.contactNoWork || "-"}</Text>
                </Col>
                {client.contactNoPersonal && (
                  <Col span={12}>
                    <Text strong>Personal Phone:</Text>
                    <br />
                    <Text>{client.contactNoPersonal}</Text>
                  </Col>
                )}
                <Col span={12}>
                  <Text strong>Priority:</Text>
                  <br />
                  <Tag color={getPriorityColor(client.priority)}>
                    {getPriorityText(client.priority)}
                  </Tag>
                </Col>
                <Col span={12}>
                  <Text strong>Status:</Text>
                  <br />
                  <Tag color={client.isActive ? "success" : "error"}>
                    {client.isActive ? "Active" : "Inactive"}
                  </Tag>
                </Col>
              </Row>
            </Card>

            {/* Location Information */}
            {(client.country ||
              client.state ||
              client.city ||
              client.address ||
              client.pincode) && (
              <Card
                title="Location Details"
                size="small"
                style={{ marginBottom: 16 }}
              >
                <Row gutter={[16, 16]}>
                  {client.country && (
                    <Col span={8}>
                      <Text strong>Country:</Text>
                      <br />
                      <Text>{client.country.name}</Text>
                    </Col>
                  )}
                  {client.state && (
                    <Col span={8}>
                      <Text strong>State:</Text>
                      <br />
                      <Text>{client.state.name}</Text>
                    </Col>
                  )}
                  {client.city && (
                    <Col span={8}>
                      <Text strong>City:</Text>
                      <br />
                      <Text>{client.city.name}</Text>
                    </Col>
                  )}
                  {client.address && (
                    <Col span={16}>
                      <Text strong>Address:</Text>
                      <br />
                      <Text>{client.address}</Text>
                    </Col>
                  )}
                  {client.pincode && (
                    <Col span={8}>
                      <Text strong>Pincode:</Text>
                      <br />
                      <Text>{client.pincode}</Text>
                    </Col>
                  )}
                </Row>
              </Card>
            )}

            {/* Business Details */}
            {(client.isGstEnabled ||
              client.panCard ||
              client.creditDays ||
              client.creditAmountLimit ||
              client.openingBalance ||
              client.accountMessage) && (
              <Card
                title="Business Details"
                size="small"
                style={{ marginBottom: 16 }}
              >
                <Row gutter={[16, 16]}>
                  {client.isGstEnabled && (
                    <>
                      <Col span={8}>
                        <Text strong>GST Enabled:</Text>
                        <br />
                        <Tag color="success">Yes</Tag>
                      </Col>
                      {client.gstNumber && (
                        <Col span={8}>
                          <Text strong>GST Number:</Text>
                          <br />
                          <Text>{client.gstNumber}</Text>
                        </Col>
                      )}
                      {client.gstRate !== null &&
                        client.gstRate !== undefined && (
                          <Col span={8}>
                            <Text strong>GST Rate:</Text>
                            <br />
                            <Text>{client.gstRate}%</Text>
                          </Col>
                        )}
                    </>
                  )}
                  {client.panCard && (
                    <Col span={8}>
                      <Text strong>PAN Card:</Text>
                      <br />
                      <Text>{client.panCard}</Text>
                    </Col>
                  )}
                  {client.creditDays !== null &&
                    client.creditDays !== undefined && (
                      <Col span={8}>
                        <Text strong>Credit Days:</Text>
                        <br />
                        <Text>{client.creditDays} days</Text>
                      </Col>
                    )}
                  {client.creditAmountLimit !== null &&
                    client.creditAmountLimit !== undefined && (
                      <Col span={8}>
                        <Text strong>Credit Limit:</Text>
                        <br />
                        <Text>
                          ₹
                          {parseFloat(client.creditAmountLimit).toLocaleString(
                            "en-IN",
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }
                          )}
                        </Text>
                      </Col>
                    )}
                  {client.openingBalance !== null &&
                    client.openingBalance !== undefined && (
                      <Col span={8}>
                        <Text strong>Opening Balance:</Text>
                        <br />
                        <Text
                          style={{
                            color: client.openingBalance >= 0 ? "green" : "red",
                          }}
                        >
                          ₹
                          {parseFloat(client.openingBalance).toLocaleString(
                            "en-IN",
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }
                          )}
                        </Text>
                      </Col>
                    )}
                  {client.accountMessage && (
                    <Col span={24}>
                      <Text strong>Account Message:</Text>
                      <br />
                      <Text>{client.accountMessage}</Text>
                    </Col>
                  )}
                </Row>
              </Card>
            )}

            {/* Notes */}
            {client.clientNotes && (
              <Card title="Notes" size="small" style={{ marginBottom: 16 }}>
                <Text>{client.clientNotes}</Text>
              </Card>
            )}

            {/* Work Types */}
            {client.workTypeAssociations &&
              client.workTypeAssociations.length > 0 && (
                <Card
                  title="Work Types"
                  size="small"
                  style={{ marginBottom: 16 }}
                >
                  <Space wrap>
                    {client.workTypeAssociations.map((wta) => (
                      <Tag
                        key={wta.id}
                        color="blue"
                        style={{ marginBottom: 8 }}
                      >
                        {wta.workType?.name || "Unknown"}
                      </Tag>
                    ))}
                  </Space>
                </Card>
              )}

            {/* Gradings & Pricing */}
            {client.gradings && client.gradings.length > 0 && (
              <Card
                title="Gradings & Pricing"
                size="small"
                style={{ marginBottom: 16 }}
              >
                <Row gutter={[16, 16]}>
                  {client.gradings.map((grading) => (
                    <Col span={24} key={grading.id}>
                      <Card
                        size="small"
                        style={{
                          backgroundColor: "#f5f5f5",
                          marginBottom: 8,
                        }}
                      >
                        <Row gutter={[16, 8]}>
                          <Col span={12}>
                            <Text strong>
                              {grading.grading?.name || "Unknown Grading"}
                            </Text>
                            {grading.grading?.workType && (
                              <>
                                <br />
                                <Tag color="blue" style={{ marginTop: 4 }}>
                                  {grading.grading.workType.name}
                                </Tag>
                              </>
                            )}
                            {grading.grading?.description && (
                              <>
                                <br />
                                <Text
                                  type="secondary"
                                  style={{ fontSize: "12px" }}
                                >
                                  {grading.grading.description}
                                </Text>
                              </>
                            )}
                          </Col>
                          <Col span={6}>
                            <Text type="secondary">Default Rate:</Text>
                            <br />
                            <Text strong>
                              ₹{grading.grading?.defaultRate || 0}/
                              {grading.grading?.unit || "unit"}
                            </Text>
                          </Col>
                          <Col span={6}>
                            {grading.customRate ? (
                              <>
                                <Text type="secondary">Custom Rate:</Text>
                                <br />
                                <Text strong style={{ color: "#1890ff" }}>
                                  ₹{grading.customRate}/{grading.unit || "unit"}
                                </Text>
                                <Tag color="orange" style={{ marginLeft: 8 }}>
                                  Custom
                                </Tag>
                              </>
                            ) : (
                              <>
                                <Text type="secondary">Effective Rate:</Text>
                                <br />
                                <Text strong>
                                  ₹
                                  {grading.effectiveRate ||
                                    grading.grading?.defaultRate ||
                                    0}
                                  /{grading.unit || "unit"}
                                </Text>
                              </>
                            )}
                          </Col>
                        </Row>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Card>
            )}

            {/* Task Preferences */}
            {client.taskPreferences && client.taskPreferences.length > 0 && (
              <Card
                title="Task Preferences (Preferred Employees)"
                size="small"
                style={{ marginBottom: 16 }}
              >
                <Text
                  type="secondary"
                  style={{ display: "block", marginBottom: 12 }}
                >
                  These employees will be auto-assigned when creating projects
                  for this client.
                </Text>
                {/* Group task preferences by grading */}
                {(() => {
                  // Group preferences by gradingId
                  const groupedPreferences = {};
                  client.taskPreferences.forEach((pref) => {
                    if (!groupedPreferences[pref.gradingId]) {
                      groupedPreferences[pref.gradingId] = [];
                    }
                    groupedPreferences[pref.gradingId].push(pref);
                  });

                  return Object.entries(groupedPreferences).map(
                    ([gradingId, prefs]) => {
                      // Find the grading name
                      const grading = client.gradings?.find(
                        (g) => g.gradingId === gradingId
                      );
                      const gradingName =
                        grading?.grading?.name || `Grading ${gradingId}`;

                      return (
                        <Card
                          key={gradingId}
                          size="small"
                          title={gradingName}
                          style={{
                            backgroundColor: "#fafafa",
                            marginBottom: 12,
                          }}
                        >
                          {prefs.map((pref) => (
                            <Row
                              key={pref.id}
                              gutter={16}
                              style={{ marginBottom: 8 }}
                            >
                              <Col span={8}>
                                <Text strong>
                                  {pref.task?.name || "Unknown Task"}
                                </Text>
                              </Col>
                              <Col span={16}>
                                <Space wrap size="small">
                                  {pref.preferredUsers &&
                                  pref.preferredUsers.length > 0 ? (
                                    // Use preferredUsers field from the query
                                    pref.preferredUsers.map((user) => (
                                      <Tag key={user.id} color="green">
                                        {user.firstName} {user.lastName}
                                      </Tag>
                                    ))
                                  ) : pref.preferredUserIds &&
                                    pref.preferredUserIds.length > 0 ? (
                                    // Fallback: try to find in serviceProviders
                                    (() => {
                                      const users = pref.preferredUserIds
                                        .map((userId) => {
                                          const sp =
                                            client.serviceProviders?.find(
                                              (s) =>
                                                s.user?.id === userId
                                            );
                                          return sp?.user;
                                        })
                                        .filter(Boolean);

                                      return users.length > 0 ? (
                                        users.map((user) => (
                                          <Tag key={user.id} color="green">
                                            {user.firstName} {user.lastName}
                                          </Tag>
                                        ))
                                      ) : (
                                        <Text
                                          type="secondary"
                                          style={{ fontSize: "12px" }}
                                        >
                                          {pref.preferredUserIds.length}{" "}
                                          employee(s) assigned
                                        </Text>
                                      );
                                    })()
                                  ) : (
                                    <Text type="secondary">
                                      No preferred employees
                                    </Text>
                                  )}
                                </Space>
                              </Col>
                            </Row>
                          ))}
                        </Card>
                      );
                    }
                  );
                })()}
              </Card>
            )}

            {/* Audit Information */}
            <Card title="Audit Information" size="small">
              <Row gutter={[16, 8]}>
                <Col span={12}>
                  <Text strong>Created:</Text>
                  <br />
                  <Text type="secondary">
                    {client.createdAt
                      ? dayjs(client.createdAt).format("DD/MM/YYYY HH:mm")
                      : "-"}
                  </Text>
                </Col>
                <Col span={12}>
                  <Text strong>Updated:</Text>
                  <br />
                  <Text type="secondary">
                    {client.updatedAt
                      ? dayjs(client.updatedAt).format("DD/MM/YYYY HH:mm")
                      : "-"}
                  </Text>
                </Col>
                {client.creator && (
                  <Col span={12}>
                    <Text strong>Created By:</Text>
                    <br />
                    <Text type="secondary">
                      {`${client.creator.firstName} ${client.creator.lastName}`.trim()}
                    </Text>
                  </Col>
                )}
              </Row>
            </Card>
          </div>
        )}
      </TabPane>

      <TabPane tab="Ledger" key="ledger">
        <div>
          <Card size="small" style={{ marginBottom: 12 }}>
            <Row gutter={16} align="middle">
              <Col span={12}>
                <RangePicker
                  value={dateRange}
                  onChange={(vals) => {
                    setDateRange(vals);
                    if (vals) {
                      refetchLedgerRange({
                        clientId: client?.id,
                        dateFrom: vals[0].format("YYYY-MM-DD"),
                        dateTo: vals[1].format("YYYY-MM-DD"),
                        pagination: { page: 1, limit: 1000 },
                      });
                    }
                  }}
                />
              </Col>
            </Row>
          </Card>

          <Card>
            {ledgerRangeLoading ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  padding: 24,
                }}
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
                const opening = Number(
                  range?.openingBalance ?? client.openingBalance ?? 0
                );
                const txs = (range?.transactions || []).slice();

                // Debug: Log transaction data
                if (txs.length > 0) {
                  console.log(
                    "ClientDetail Ledger transactions sample:",
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

                // Calculate closing balance from opening + credits - debits
                // Don't use backend's closingBalance as it uses transaction's balanceAfter which doesn't include client's openingBalance
                const closing = txWithRunning.length > 0 
                  ? txWithRunning[txWithRunning.length - 1].runningBalance 
                  : opening;

                // Create opening and closing balance rows
                const openingRow = {
                  id: "opening-balance",
                  transactionDate: dateRange[0].format("YYYY-MM-DD"),
                  description: "Opening Balance",
                  debit: 0,
                  credit: 0,
                  runningBalance: opening,
                  isBalanceRow: true,
                  isOpeningBalance: true,
                };

                const closingRow = {
                  id: "closing-balance",
                  transactionDate: dateRange[1].format("YYYY-MM-DD"),
                  description: "Closing Balance",
                  debit: 0,
                  credit: 0,
                  runningBalance: closing,
                  isBalanceRow: true,
                  isClosingBalance: true,
                };

                const tableData = [openingRow, ...txWithRunning, closingRow];

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
                      dataSource={tableData}
                      rowKey="id"
                      size="small"
                      rowClassName={(record) => {
                        if (record.isOpeningBalance) return "ledger-opening-balance-row";
                        if (record.isClosingBalance) return "ledger-closing-balance-row";
                        return "";
                      }}
                      pagination={{ pageSize: 10 }}
                      // scroll={{ x: 1400 }}
                      columns={[
                        {
                          title: "Order Date",
                          key: "orderDate",
                          // width: 100,
                          render: (_, r) => {
                            if (r.isBalanceRow) return null;
                            const project = r.invoice?.project;
                            return project?.createdAt
                              ? dayjs(project.createdAt).format("DD/MM/YYYY")
                              : "-";
                          },
                        },
                        {
                          title: "Invoice Date",
                          key: "invoiceDate",
                          // width: 100,
                          render: (_, r) => {
                            if (r.isBalanceRow) return null;
                            return r.invoice?.invoiceDate
                              ? dayjs(r.invoice.invoiceDate).format(
                                  "DD/MM/YYYY"
                                )
                              : "-";
                          },
                        },
                        {
                          title: "Work Days",
                          key: "workDays",
                          width: 90,
                          render: (_, r) => {
                            if (r.isBalanceRow) return null;
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
                          title: "Invoice No.",
                          key: "invoiceNumber",
                          width: 120,
                          render: (_, r) => {
                            if (r.isBalanceRow) return null;
                            return r.invoice?.invoiceNumber || "-";
                          },
                        },
                        {
                          title: "Particulars",
                          key: "particulars",
                          // width: 200,
                          ellipsis: true,
                          render: (_, r) => {
                            if (r.isBalanceRow) {
                              return (
                                <Text
                                  strong
                                  style={{
                                    fontSize: 14,
                                    color: r.isOpeningBalance ? "#1890ff" : "#52c41a",
                                  }}
                                >
                                  {r.description}
                                </Text>
                              );
                            }
                            const project = r.invoice?.project;
                            if (project) {
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
                            if (r.isBalanceRow) return null;
                            const project = r.invoice?.project;
                            if (project?.projectGradings?.length > 0) {
                              const lines = getSortedProjectGradings(project).map(
                                (pg) => {
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
                                }
                              );
                              return (
                                <div
                                  style={{ fontSize: 11, lineHeight: "1.4" }}
                                >
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
                          // width: 110,
                          align: "right",
                          render: (v, r) => {
                            if (r.isBalanceRow) return null;
                            return v > 0 ? formatCurrency(v) : "-";
                          },
                        },
                        {
                          title: "Credit",
                          dataIndex: "credit",
                          key: "credit",
                          // width: 110,
                          align: "right",
                          render: (v, r) => {
                            if (r.isBalanceRow) return null;
                            return v > 0 ? formatCurrency(v) : "-";
                          },
                        },
                        {
                          title: "Running Balance",
                          dataIndex: "runningBalance",
                          key: "runningBalance",
                          // width: 140,
                          align: "right",
                          render: (v, r) => {
                            // Positive = Credit (green), Negative = Debit (red)
                            const color = v > 0 ? "#52c41a" : v < 0 ? "#f5222d" : "#1890ff";
                            const fontWeight = r.isBalanceRow ? 600 : 500;
                            const fontSize = r.isBalanceRow ? 14 : 12;
                            
                            return (
                              <Text style={{ color, fontWeight, fontSize }}>
                                {formatCurrency(v)}
                              </Text>
                            );
                          },
                        },
                      ]}
                    />
                  </div>
                );
              })()
            )}
          </Card>
        </div>
      </TabPane>
    </Tabs>
  );
};

export default ClientDetail;
