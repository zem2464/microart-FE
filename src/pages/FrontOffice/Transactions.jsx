import { useState } from 'react';
import { useContext } from 'react';
import {
  Table,
  Card,
  Space,
  Tag,
  Button,
  DatePicker,
  Select,
  Input,
  Row,
  Col,
  Statistic,
  Drawer,
  Descriptions,
  Typography,
  Alert,
  Empty,
  message
} from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  FileTextOutlined,
  DollarOutlined,
  EyeOutlined,
  DownloadOutlined,
  ReloadOutlined,
  FilePdfOutlined
} from '@ant-design/icons';
import { useQuery } from '@apollo/client';
import dayjs from 'dayjs';
import { GET_CLIENTS } from '../../gql/clients';
import { GET_CLIENT_LEDGER_RANGE } from '../../gql/clientLedger';
import { generateInvoicePDF } from '../../utils/invoicePDF';
import { formatCurrency } from '../../utils/currencyUtils';
import { AppDrawerContext } from '../../contexts/DrawerContext';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Title, Text } = Typography;

const Transactions = () => {
  const { showInvoiceDetailDrawer } = useContext(AppDrawerContext);
  const [selectedClient, setSelectedClient] = useState(null);
  const [dateRange, setDateRange] = useState([
    dayjs().startOf('month'),
    dayjs().endOf('month')
  ]);
  const [transactionType, setTransactionType] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);

  // Fetch clients
  const { data: clientsData } = useQuery(GET_CLIENTS);

  // Client search helper functions
  const getClientSearchText = (client) => {
    const searchFields = [
      client.clientCode,
      client.firstName,
      client.lastName,
      client.displayName,
      client.companyName,
      client.contactNoWork,
      client.contactNoPersonal,
      client.email,
    ];
    return searchFields.filter(Boolean).join(" ").toLowerCase();
  };

  const filterClients = (inputValue, option) => {
    if (!inputValue) return true;
    const client = clientsData?.clients?.find((c) => c.id === option.value);
    if (!client) return false;

    const trimmedInput = inputValue.trim();

    // Check if input contains only digits
    const isNumericSearch = /^\d+$/.test(trimmedInput);

    if (isNumericSearch) {
      // Search only in clientCode number part (e.g., "CL-123" -> "123")
      const clientCodeNumber = client.clientCode?.split("-")[1] || "";
      return clientCodeNumber === trimmedInput;
    } else {
      // Search in all text fields
      const searchText = getClientSearchText(client);
      const searchTerms = trimmedInput.toLowerCase().split(" ");
      return searchTerms.every((term) => searchText.includes(term));
    }
  };

  // Fetch transactions
  const { data: ledgerData, loading, refetch } = useQuery(GET_CLIENT_LEDGER_RANGE, {
    variables: {
      clientId: selectedClient === 'all' ? null : selectedClient,
      dateFrom: dateRange[0].format('YYYY-MM-DD'),
      dateTo: dateRange[1].format('YYYY-MM-DD'),
      pagination: { page: 1, limit: 1000 }
    },
    skip: !selectedClient,
  });

  const transactions = ledgerData?.clientLedgerRange?.transactions || [];
  const openingBalance = ledgerData?.clientLedgerRange?.openingBalance || 0;
  const closingBalance = ledgerData?.clientLedgerRange?.closingBalance || 0;

  // Filter transactions based on type and search
  const filteredTransactions = transactions.filter(txn => {
    const matchesType = transactionType === 'all' ||
      (transactionType === 'invoice' && txn.transactionType === 'work_done') ||
      (transactionType === 'payment' && txn.transactionType === 'payment_received');

    const matchesSearch = !searchText ||
      txn.referenceNumber?.toLowerCase().includes(searchText.toLowerCase()) ||
      txn.description?.toLowerCase().includes(searchText.toLowerCase());

    return matchesType && matchesSearch;
  });

  // Calculate statistics
  const totalInvoices = transactions.filter(t => t.transactionType === 'work_done').length;
  const totalPayments = transactions.filter(t => t.transactionType === 'payment_received').length;
  const totalInvoiced = transactions
    .filter(t => t.transactionType === 'work_done')
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  const totalPaid = transactions
    .filter(t => t.transactionType === 'payment_received')
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

  // Define all columns including Client column
  const allColumns = [
    {
      title: 'Date',
      dataIndex: 'transactionDate',
      key: 'transactionDate',
      width: 110,
      fixed: selectedClient === 'all' ? 'left' : false,
      sorter: (a, b) => new Date(a.transactionDate) - new Date(b.transactionDate),
      render: (date) => (
        <div>
          <div>{dayjs(date).format('DD MMM YY')}</div>
          <Text type="secondary" style={{ fontSize: '11px' }}>
            {dayjs(date).format('HH:mm')}
          </Text>
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'transactionType',
      key: 'transactionType',
      width: 100,
      fixed: selectedClient === 'all' ? 'left' : false,
      filters: [
        { text: 'Invoice', value: 'work_done' },
        { text: 'Payment', value: 'payment_received' },
      ],
      onFilter: (value, record) => record.transactionType === value,
      render: (type) => {
        if (type === 'work_done') {
          return <Tag icon={<FileTextOutlined />} color="orange">Invoice</Tag>;
        }
        if (type === 'payment_received') {
          return <Tag icon={<DollarOutlined />} color="green">Payment</Tag>;
        }
        return <Tag>{type}</Tag>;
      },
    },
    {
      title: 'Invoice/Payment #',
      dataIndex: 'referenceNumber',
      key: 'referenceNumber',
      width: 140,
      render: (ref, record) => (
        <div>
          <Text strong>{ref}</Text>
          {record.invoice?.status && (
            <div>
              <Tag
                color={
                  record.invoice.status === 'FULLY_PAID' ? 'green' :
                    record.invoice.status === 'PARTIAL_PAID' ? 'orange' :
                      record.invoice.status === 'OVERDUE' ? 'red' : 'blue'
                }
                style={{ fontSize: '10px', marginTop: '2px' }}
              >
                {record.invoice.status.replace('_', ' ')}
              </Tag>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Client',
      dataIndex: 'client',
      key: 'client',
      width: 200,
      render: (client, record) => {
        if (!client) return 'N/A';

        // When "All Clients" is selected, show clientCode and displayName together
        if (selectedClient === 'all') {
          return (
            <div>
              <div>
                <Text strong style={{ fontSize: '13px', color: '#1890ff' }}>
                  {client.clientCode}
                </Text>
                <Text style={{ fontSize: '13px', marginLeft: '4px' }}>
                  {client.displayName || `${client.firstName} ${client.lastName}`}
                </Text>
              </div>
              {client.companyName && (
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  {client.companyName}
                </Text>
              )}
            </div>
          );
        }

        // For specific client view, show display name and company name
        return (
          <div>
            <div>
              <Text strong style={{ fontSize: '13px' }}>
                {client.displayName || `${client.firstName} ${client.lastName}`}
              </Text>
            </div>
            {client.companyName && (
              <Text type="secondary" style={{ fontSize: '11px' }}>
                {client.companyName}
              </Text>
            )}
          </div>
        );
      },
    },
    {
      title: 'Project/Payment Method',
      dataIndex: 'description',
      key: 'description',
      width: 220,
      ellipsis: true,
      render: (desc, record) => (
        <div>
          {record.invoice?.project ? (
            <>
              <Text strong style={{ fontSize: '13px' }}>{record.invoice.project.name}</Text>
              <div>
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  #{record.invoice.project.projectCode}
                </Text>
              </div>
            </>
          ) : record.payment?.paymentType ? (
            <>
              <Text strong style={{ fontSize: '13px' }}>{record.payment.paymentType.name}</Text>
              {record.payment.notes && (
                <div>
                  <Text type="secondary" style={{ fontSize: '11px' }}>
                    {record.payment.notes}
                  </Text>
                </div>
              )}
            </>
          ) : (
            <Text style={{ fontSize: '12px' }}>{desc}</Text>
          )}
        </div>
      ),
    },
    {
      title: 'Invoice Amount',
      key: 'invoiceAmount',
      width: 140,
      align: 'right',
      render: (_, record) => {
        if (record.transactionType !== 'work_done' || !record.invoice) return '-';
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
            <Text strong style={{ fontSize: '14px' }}>
              {formatCurrency(record.invoice.totalAmount, true, 0)}
            </Text>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              Total
            </Text>
          </div>
        );
      },
    },
    {
      title: 'Paid',
      key: 'paidAmount',
      width: 120,
      align: 'right',
      render: (_, record) => {
        if (record.transactionType !== 'work_done' || !record.invoice) return '-';
        const paidAmount = parseFloat(record.invoice.paidAmount || 0);
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
            <Text style={{ fontSize: '13px', color: '#52c41a' }}>
              {formatCurrency(paidAmount, true, 0)}
            </Text>
            {record.payment && (
              <Tag color="green" style={{ fontSize: '10px' }}>
                Payment
              </Tag>
            )}
          </div>
        );
      },
    },
    {
      title: 'Due Amount',
      key: 'dueAmount',
      width: 120,
      align: 'right',
      render: (_, record) => {
        if (record.transactionType !== 'work_done' || !record.invoice) {
          // For payments, show payment amount
          if (record.transactionType === 'payment_received' && record.payment) {
            return (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                <Text strong style={{ fontSize: '14px', color: '#52c41a' }}>
                  {formatCurrency(record.payment.amount, true, 0)}
                </Text>
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  Received
                </Text>
              </div>
            );
          }
          return '-';
        }
        const dueAmount = parseFloat(record.invoice.balanceAmount || 0);
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
            <Text strong style={{ fontSize: '14px', color: dueAmount > 0 ? '#f5222d' : '#52c41a' }}>
              {formatCurrency(dueAmount, true, 0)}
            </Text>
            {dueAmount > 0 && record.invoice.dueDate && (
              <Text type="secondary" style={{ fontSize: '10px' }}>
                Due: {dayjs(record.invoice.dueDate).format('DD MMM')}
              </Text>
            )}
          </div>
        );
      },
    },
    {
      title: 'Action',
      key: 'action',
      width: 150,
      fixed: selectedClient === 'all' ? 'right' : false,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => {
              // For invoices, use centralized drawer
              if (record.transactionType === 'work_done' && record.invoice) {
                showInvoiceDetailDrawer(record.invoice.id);
              } else {
                // For payments and other transactions, use local drawer
                setSelectedTransaction(record);
                setDrawerVisible(true);
              }
            }}
          >
            View
          </Button>
          {record.transactionType === 'work_done' && record.invoice && (
            <Button
              type="link"
              icon={<FilePdfOutlined />}
              onClick={() => handleDownloadInvoice(record)}
            >
              PDF
            </Button>
          )}
        </Space>
      ),
    },
  ];

  // Filter columns based on selected client - hide Client column if a specific client is selected
  const columns = selectedClient === 'all'
    ? allColumns
    : allColumns.filter(col => col.key !== 'client');

  const handleRefresh = () => {
    refetch();
  };

  const handleDownloadInvoice = async (transaction) => {
    if (!transaction.invoice) {
      message.error('Invoice data not available');
      return;
    }

    try {
      message.loading({ content: 'Generating PDF...', key: 'pdf' });
      await generateInvoicePDF(transaction.invoice);
      message.success({ content: 'Invoice downloaded successfully!', key: 'pdf', duration: 2 });
    } catch (error) {
      console.error('Error generating PDF:', error);
      message.error({ content: 'Failed to generate invoice PDF', key: 'pdf', duration: 2 });
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>Transactions</Title>

      {/* Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Select
              placeholder="Search client by mobile, code, name, or company"
              style={{ width: '100%' }}
              showSearch
              allowClear
              value={selectedClient}
              onChange={setSelectedClient}
              optionFilterProp="children"
              filterOption={(input, option) => {
                // Don't filter the "All Clients" option
                if (option.value === 'all') return true;
                return filterClients(input, option);
              }}
              notFoundContent={!clientsData ? "Loading..." : "No clients found"}
              labelRender={(props) => {
                if (props.value === 'all') return <strong>All Clients</strong>;
                const client = clientsData?.clients?.find(
                  (c) => c.id === props.value
                );
                if (!client) return props.label;
                return (
                  <span>
                    <strong>{client.clientCode}</strong> ({client.displayName})
                  </span>
                );
              }}
            >
              <Option key="all" value="all">
                <div>
                  <strong>All Clients</strong>
                </div>
              </Option>
              {clientsData?.clients?.map(client => (
                <Option key={client.id} value={client.id}>
                  <div>
                    <div title={client.companyName}>
                      <strong>{client.clientCode}</strong> ({client.displayName})
                      {client.companyName && ` - ${client.companyName}`}
                    </div>
                  </div>
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <RangePicker
              style={{ width: '100%' }}
              value={dateRange}
              onChange={setDateRange}
              format="DD MMM YYYY"
            />
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Select
              placeholder="Type"
              style={{ width: '100%' }}
              value={transactionType}
              onChange={setTransactionType}
            >
              <Option value="all">All Types</Option>
              <Option value="invoice">Invoices Only</Option>
              <Option value="payment">Payments Only</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Input
              placeholder="Search..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} lg={2}>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              loading={loading}
              block
            >
              Refresh
            </Button>
          </Col>
        </Row>
      </Card>

      {!selectedClient ? (
        <Card>
          <Empty description="Please select a client to view transactions" />
        </Card>
      ) : loading ? (
        <Card>
          <Empty description="Loading transactions..." />
        </Card>
      ) : (
        <>
          {/* Statistics */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            {selectedClient !== 'all' && (
              <Col xs={12} sm={6}>
                <Card>
                  <Statistic
                    title="Opening Balance"
                    value={Math.abs(openingBalance)}
                    formatter={(value) => formatCurrency(openingBalance < 0 ? -value : value, true, 0)}
                    suffix={openingBalance < 0 ? 'DR' : 'CR'}
                    valueStyle={{ color: openingBalance < 0 ? '#f5222d' : '#52c41a' }}
                  />
                </Card>
              </Col>
            )}
            <Col xs={12} sm={selectedClient === 'all' ? 8 : 6}>
              <Card>
                <Statistic
                  title="Total Invoiced"
                  value={totalInvoiced}
                  formatter={(value) => formatCurrency(value, true, 0)}
                  suffix={`(${totalInvoices})`}
                  valueStyle={{ color: '#ff4d4f' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={selectedClient === 'all' ? 8 : 6}>
              <Card>
                <Statistic
                  title="Total Paid"
                  value={totalPaid}
                  formatter={(value) => formatCurrency(value, true, 0)}
                  suffix={`(${totalPayments})`}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            {selectedClient !== 'all' && (
              <Col xs={12} sm={6}>
                <Card>
                  <Statistic
                    title="Closing Balance"
                    value={Math.abs(closingBalance)}
                    formatter={(value) => formatCurrency(closingBalance < 0 ? -value : value, true, 0)}
                    suffix={closingBalance < 0 ? 'DR' : 'CR'}
                    valueStyle={{ color: closingBalance < 0 ? '#f5222d' : '#52c41a' }}
                  />
                </Card>
              </Col>
            )}
            {selectedClient === 'all' && (
              <Col xs={12} sm={8}>
                <Card>
                  <Statistic
                    title="Net Balance"
                    value={totalPaid - totalInvoiced}
                    formatter={(value) => formatCurrency(value, true, 0)}
                    valueStyle={{ color: (totalPaid - totalInvoiced) < 0 ? '#f5222d' : '#52c41a' }}
                  />
                </Card>
              </Col>
            )}
          </Row>

          {/* Transactions Table */}
          <Card style={{ width: '100%' }}>
            <Table
              columns={columns}
              dataSource={filteredTransactions}
              rowKey="id"
              loading={loading}
              scroll={selectedClient === 'all' ? { x: 1200 } : { x: 'max-content' }}
              pagination={{
                pageSize: 50,
                showSizeChanger: true,
                showTotal: (total) => `Total ${total} transactions`,
              }}
              summary={() => {
                const totalInvoiceAmount = filteredTransactions
                  .filter(t => t.transactionType === 'work_done' && t.invoice)
                  .reduce((sum, t) => sum + parseFloat(t.invoice.totalAmount || 0), 0);

                const totalPaidAmount = filteredTransactions
                  .filter(t => t.transactionType === 'work_done' && t.invoice)
                  .reduce((sum, t) => sum + parseFloat(t.invoice.paidAmount || 0), 0);

                const totalDueAmount = filteredTransactions
                  .filter(t => t.transactionType === 'work_done' && t.invoice)
                  .reduce((sum, t) => sum + parseFloat(t.invoice.balanceAmount || 0), 0);

                const totalPaymentsReceived = filteredTransactions
                  .filter(t => t.transactionType === 'payment_received' && t.payment)
                  .reduce((sum, t) => sum + parseFloat(t.payment.amount || 0), 0);

                return (
                  <Table.Summary fixed>
                    <Table.Summary.Row style={{ backgroundColor: '#fafafa' }}>
                      <Table.Summary.Cell index={0} colSpan={selectedClient === 'all' ? 5 : 4}>
                        <Text strong style={{ fontSize: '14px' }}>Summary</Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={5} align="right">
                        <Text strong style={{ fontSize: '14px' }}>
                          {formatCurrency(totalInvoiceAmount, true, 0)}
                        </Text>
                        <div><Text type="secondary" style={{ fontSize: '11px' }}>Invoiced</Text></div>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={6} align="right">
                        <Text strong style={{ fontSize: '14px', color: '#52c41a' }}>
                          {formatCurrency(totalPaidAmount + totalPaymentsReceived, true, 0)}
                        </Text>
                        <div><Text type="secondary" style={{ fontSize: '11px' }}>Paid</Text></div>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={7} align="right">
                        <Text strong style={{ fontSize: '14px', color: totalDueAmount > 0 ? '#f5222d' : '#52c41a' }}>
                          {formatCurrency(totalDueAmount, true, 0)}
                        </Text>
                        <div><Text type="secondary" style={{ fontSize: '11px' }}>Due</Text></div>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={8} />
                    </Table.Summary.Row>
                  </Table.Summary>
                );
              }}
            />
          </Card>
        </>
      )}

      {/* Transaction Detail Drawer */}
      <Drawer
        title={
          <Space>
            {selectedTransaction?.transactionType === 'work_done' ? (
              <FileTextOutlined style={{ color: '#fa8c16' }} />
            ) : (
              <DollarOutlined style={{ color: '#52c41a' }} />
            )}
            <span>
              {selectedTransaction?.transactionType === 'work_done' ? 'Invoice' : 'Payment'} Details
            </span>
          </Space>
        }
        placement="right"
        width={700}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        extra={
          selectedTransaction?.transactionType === 'work_done' && selectedTransaction?.invoice && (
            <Button
              type="primary"
              icon={<FilePdfOutlined />}
              onClick={() => handleDownloadInvoice(selectedTransaction)}
            >
              Download PDF
            </Button>
          )
        }
      >
        {selectedTransaction && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* Transaction Header */}
            <Card size="small">
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Text type="secondary">Reference Number</Text>
                  <div><Text strong style={{ fontSize: '16px' }}>{selectedTransaction.referenceNumber}</Text></div>
                </Col>
                <Col span={12}>
                  <Text type="secondary">Date</Text>
                  <div><Text strong>{dayjs(selectedTransaction.transactionDate).format('DD MMMM YYYY')}</Text></div>
                </Col>
                <Col span={24}>
                  <Text type="secondary">Amount</Text>
                  <div>
                    <Text strong style={{
                      fontSize: '24px',
                      color: selectedTransaction.transactionType === 'work_done' ? '#f5222d' : '#52c41a'
                    }}>
                      {formatCurrency(selectedTransaction.amount, true, 0)}
                    </Text>
                  </div>
                </Col>
              </Row>
            </Card>

            {/* Invoice Details */}
            {selectedTransaction.invoice && (
              <>
                <Card
                  title={<Text strong>Invoice Information</Text>}
                  size="small"
                  style={{ borderColor: '#fa8c16' }}
                >
                  <Descriptions bordered column={2} size="small">
                    <Descriptions.Item label="Invoice Number" span={1}>
                      <Text strong>{selectedTransaction.invoice.invoiceNumber}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Status" span={1}>
                      <Tag
                        color={
                          selectedTransaction.invoice.status === 'FULLY_PAID' ? 'green' :
                            selectedTransaction.invoice.status === 'PARTIAL_PAID' ? 'orange' :
                              selectedTransaction.invoice.status === 'OVERDUE' ? 'red' : 'blue'
                        }
                      >
                        {selectedTransaction.invoice.status.replace('_', ' ')}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Invoice Date" span={1}>
                      {dayjs(selectedTransaction.invoice.invoiceDate).format('DD MMM YYYY')}
                    </Descriptions.Item>
                    <Descriptions.Item label="Due Date" span={1}>
                      {selectedTransaction.invoice.dueDate ? (
                        <Text type={dayjs(selectedTransaction.invoice.dueDate).isBefore(dayjs()) ? 'danger' : undefined}>
                          {dayjs(selectedTransaction.invoice.dueDate).format('DD MMM YYYY')}
                          {dayjs(selectedTransaction.invoice.dueDate).isBefore(dayjs()) && ' (Overdue)'}
                        </Text>
                      ) : '-'}
                    </Descriptions.Item>
                    {selectedTransaction.invoice.project && (
                      <>
                        <Descriptions.Item label="Project Code" span={1}>
                          {selectedTransaction.invoice.project.projectCode}
                        </Descriptions.Item>
                        <Descriptions.Item label="Project Name" span={1}>
                          {selectedTransaction.invoice.project.name}
                        </Descriptions.Item>
                      </>
                    )}
                    <Descriptions.Item label="Description" span={2}>
                      {selectedTransaction.description}
                    </Descriptions.Item>
                  </Descriptions>

                  {/* Grading Items Table */}
                  {selectedTransaction.invoice.project?.projectGradings?.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <Text strong style={{ fontSize: '14px', marginBottom: 8, display: 'block' }}>
                        Service Details----
                      </Text>
                      <Table
                        size="small"
                        bordered
                        pagination={false}
                        dataSource={selectedTransaction.invoice.project.projectGradings}
                        rowKey={(record, idx) => idx}
                        columns={[
                          {
                            title: 'Grading',
                            dataIndex: ['grading', 'name'],
                            key: 'grading',
                            width: '30%',
                            render: (name, record) => {
                              const gradingName = record.grading?.name || '-';
                              const gradingCode = record.grading?.shortCode || '';
                              const label = gradingCode ? `${gradingName} (${gradingCode})` : gradingName;
                              return <Text strong>{label}</Text>;
                            },
                          },
                          {
                            title: 'Image Qty',
                            dataIndex: 'imageQuantity',
                            key: 'quantity',
                            width: '20%',
                            align: 'center',
                            render: (qty) => <Text>{qty}</Text>,
                          },
                          {
                            title: 'Rate',
                            dataIndex: 'customRate',
                            key: 'rate',
                            width: '20%',
                            align: 'right',
                            render: (rate) => <Text>{formatCurrency(rate, true, 0)}</Text>,
                          },
                          {
                            title: 'Amount',
                            key: 'amount',
                            width: '30%',
                            align: 'right',
                            render: (_, record) => (
                              <Text strong>
                                {formatCurrency(parseFloat(record.imageQuantity) * parseFloat(record.customRate), true, 0)}
                              </Text>
                            ),
                          },
                        ]}
                        summary={(pageData) => {
                          const totalAmount = pageData.reduce(
                            (sum, item) => sum + (parseFloat(item.imageQuantity) * parseFloat(item.customRate)),
                            0
                          );
                          return (
                            <Table.Summary.Row style={{ backgroundColor: '#fafafa' }}>
                              <Table.Summary.Cell colSpan={3} align="right">
                                <Text strong>Subtotal:</Text>
                              </Table.Summary.Cell>
                              <Table.Summary.Cell align="right">
                                <Text strong style={{ fontSize: '16px' }}>
                                  {formatCurrency(totalAmount, true, 0)}
                                </Text>
                              </Table.Summary.Cell>
                            </Table.Summary.Row>
                          );
                        }}
                      />
                    </div>
                  )}

                  {/* Invoice Amount Summary */}
                  <Card size="small" style={{ marginTop: 16, backgroundColor: '#fafafa' }}>
                    <Row gutter={[16, 8]}>
                      <Col span={12}>
                        <Text type="secondary">Subtotal:</Text>
                      </Col>
                      <Col span={12} style={{ textAlign: 'right' }}>
                        <Text strong>{formatCurrency(selectedTransaction.invoice.subtotalAmount || 0, true, 0)}</Text>
                      </Col>
                      {selectedTransaction.invoice.taxAmount > 0 && (
                        <>
                          <Col span={12}>
                            <Text type="secondary">Tax (GST):</Text>
                          </Col>
                          <Col span={12} style={{ textAlign: 'right' }}>
                            <Text>{formatCurrency(selectedTransaction.invoice.taxAmount, true, 0)}</Text>
                          </Col>
                        </>
                      )}
                      {selectedTransaction.invoice.discountAmount > 0 && (
                        <>
                          <Col span={12}>
                            <Text type="secondary">Discount:</Text>
                          </Col>
                          <Col span={12} style={{ textAlign: 'right' }}>
                            <Text type="danger">-{formatCurrency(selectedTransaction.invoice.discountAmount, true, 0)}</Text>
                          </Col>
                        </>
                      )}
                      <Col span={24}><hr style={{ margin: '8px 0', border: 'none', borderTop: '1px solid #d9d9d9' }} /></Col>
                      <Col span={12}>
                        <Text strong style={{ fontSize: '16px' }}>Total Invoice Amount:</Text>
                      </Col>
                      <Col span={12} style={{ textAlign: 'right' }}>
                        <Text strong style={{ fontSize: '18px' }}>
                          {formatCurrency(selectedTransaction.invoice.totalAmount, true, 0)}
                        </Text>
                      </Col>
                      <Col span={12}>
                        <Text type="secondary">Paid:</Text>
                      </Col>
                      <Col span={12} style={{ textAlign: 'right' }}>
                        <Text style={{ color: '#52c41a', fontSize: '16px' }}>
                          {formatCurrency(selectedTransaction.invoice.paidAmount || 0, true, 0)}
                        </Text>
                      </Col>
                      <Col span={12}>
                        <Text strong style={{ fontSize: '16px' }}>Balance Due:</Text>
                      </Col>
                      <Col span={12} style={{ textAlign: 'right' }}>
                        <Text strong style={{ fontSize: '18px', color: selectedTransaction.invoice.balanceAmount > 0 ? '#f5222d' : '#52c41a' }}>
                          {formatCurrency(selectedTransaction.invoice.balanceAmount || 0, true, 0)}
                        </Text>
                      </Col>
                    </Row>
                  </Card>

                  {/* Payment Allocations */}
                  {selectedTransaction.invoice.allocations && selectedTransaction.invoice.allocations.length > 0 && (
                    <Card size="small" style={{ marginTop: 16 }} title={<Text strong>Payment Allocations</Text>}>
                      <Table
                        size="small"
                        bordered
                        pagination={false}
                        dataSource={selectedTransaction.invoice.allocations}
                        rowKey="id"
                        columns={[
                          {
                            title: 'Payment #',
                            dataIndex: ['payment', 'paymentNumber'],
                            key: 'paymentNumber',
                            width: '25%',
                            render: (paymentNumber) => <Text strong>{paymentNumber}</Text>,
                          },
                          {
                            title: 'Date',
                            dataIndex: 'allocationDate',
                            key: 'allocationDate',
                            width: '20%',
                            render: (date) => dayjs(date).format('DD MMM YYYY'),
                          },
                          {
                            title: 'Payment Method',
                            key: 'paymentMethod',
                            width: '25%',
                            render: (_, record) => (
                              <Tag color="blue">
                                {record.payment?.paymentType?.name || 'N/A'}
                              </Tag>
                            ),
                          },
                          {
                            title: 'Amount',
                            dataIndex: 'allocatedAmount',
                            key: 'allocatedAmount',
                            width: '20%',
                            align: 'right',
                            render: (amount) => (
                              <Text strong style={{ color: '#52c41a' }}>
                                {formatCurrency(amount, true, 0)}
                              </Text>
                            ),
                          },
                          {
                            title: 'Type',
                            dataIndex: 'isAutoAllocated',
                            key: 'isAutoAllocated',
                            width: '10%',
                            align: 'center',
                            render: (isAuto) => (
                              <Tag color={isAuto ? 'cyan' : 'purple'} style={{ fontSize: '11px' }}>
                                {isAuto ? 'Auto' : 'Manual'}
                              </Tag>
                            ),
                          },
                        ]}
                        summary={(pageData) => {
                          const totalAllocated = pageData.reduce(
                            (sum, item) => sum + parseFloat(item.allocatedAmount),
                            0
                          );
                          return (
                            <Table.Summary.Row style={{ backgroundColor: '#f0f0f0' }}>
                              <Table.Summary.Cell colSpan={3} align="right">
                                <Text strong>Total Paid:</Text>
                              </Table.Summary.Cell>
                              <Table.Summary.Cell align="right">
                                <Text strong style={{ fontSize: '14px', color: '#52c41a' }}>
                                  {formatCurrency(totalAllocated, true, 0)}
                                </Text>
                              </Table.Summary.Cell>
                              <Table.Summary.Cell />
                            </Table.Summary.Row>
                          );
                        }}
                      />
                    </Card>
                  )}
                </Card>
              </>
            )}

            {/* Payment Details */}
            {selectedTransaction.payment && (
              <>
                <Card
                  title={<Text strong>Payment Receipt</Text>}
                  size="small"
                  style={{ borderColor: '#52c41a' }}
                >
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    {/* Payment Status Badge */}
                    <div style={{ textAlign: 'center', padding: '12px', backgroundColor: '#f6ffed', borderRadius: '8px' }}>
                      <Tag
                        color={
                          selectedTransaction.payment.status === 'ALLOCATED' ? 'success' :
                            selectedTransaction.payment.status === 'PARTIAL' ? 'warning' : 'error'
                        }
                        style={{ fontSize: '14px', padding: '4px 12px' }}
                      >
                        {selectedTransaction.payment.status}
                      </Tag>
                    </div>

                    <Descriptions bordered column={2} size="small">
                      <Descriptions.Item label="Receipt Number" span={2}>
                        <Text strong style={{ fontSize: '16px' }}>{selectedTransaction.payment.paymentNumber}</Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="Payment Date" span={1}>
                        {dayjs(selectedTransaction.transactionDate).format('DD MMMM YYYY')}
                      </Descriptions.Item>
                      <Descriptions.Item label="Time" span={1}>
                        {dayjs(selectedTransaction.transactionDate).format('hh:mm A')}
                      </Descriptions.Item>
                      {selectedTransaction.payment.paymentType && (
                        <>
                          <Descriptions.Item label="Payment Method" span={1}>
                            <Tag color="blue">{selectedTransaction.payment.paymentType.name}</Tag>
                          </Descriptions.Item>
                          <Descriptions.Item label="Type" span={1}>
                            <Tag>{selectedTransaction.payment.paymentType.type}</Tag>
                          </Descriptions.Item>
                        </>
                      )}
                      {selectedTransaction.payment.referenceNumber && (
                        <Descriptions.Item label="Reference Number" span={2}>
                          {selectedTransaction.payment.referenceNumber}
                        </Descriptions.Item>
                      )}
                      {selectedTransaction.payment.bankName && (
                        <Descriptions.Item label="Bank Name" span={2}>
                          {selectedTransaction.payment.bankName}
                        </Descriptions.Item>
                      )}
                      {selectedTransaction.payment.chequeDate && (
                        <Descriptions.Item label="Cheque Date" span={2}>
                          {dayjs(selectedTransaction.payment.chequeDate).format('DD MMM YYYY')}
                        </Descriptions.Item>
                      )}
                    </Descriptions>

                    {/* Payment Summary */}
                    <Card size="small" style={{ backgroundColor: '#fafafa' }}>
                      <Row gutter={[16, 8]}>
                        <Col span={12}>
                          <Text type="secondary">Total Received:</Text>
                        </Col>
                        <Col span={12} style={{ textAlign: 'right' }}>
                          <Text strong style={{ fontSize: '18px', color: '#52c41a' }}>
                            {formatCurrency(selectedTransaction.payment.amount, true, 0)}
                          </Text>
                        </Col>
                        <Col span={12}>
                          <Text type="secondary">Allocated:</Text>
                        </Col>
                        <Col span={12} style={{ textAlign: 'right' }}>
                          <Text>{formatCurrency(selectedTransaction.payment.totalAllocated || 0, true, 0)}</Text>
                        </Col>
                        <Col span={12}>
                          <Text type="secondary">Unallocated:</Text>
                        </Col>
                        <Col span={12} style={{ textAlign: 'right' }}>
                          <Text strong style={{ color: '#fa8c16' }}>
                            {formatCurrency(selectedTransaction.payment.unallocatedAmount || 0, true, 0)}
                          </Text>
                        </Col>
                      </Row>
                    </Card>

                    {selectedTransaction.notes && (
                      <Alert
                        message="Payment Notes"
                        description={selectedTransaction.notes}
                        type="info"
                        showIcon
                      />
                    )}
                  </Space>
                </Card>
              </>
            )}

            {/* Created By */}
            {selectedTransaction.createdBy && (
              <Card size="small">
                <Descriptions bordered column={2} size="small">
                  <Descriptions.Item label="Created By" span={1}>
                    {selectedTransaction.createdBy.firstName} {selectedTransaction.createdBy.lastName}
                  </Descriptions.Item>
                  {selectedTransaction.createdAt && (
                    <Descriptions.Item label="Created At" span={1}>
                      {dayjs(selectedTransaction.createdAt).format('DD MMM YYYY, hh:mm A')}
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </Card>
            )}
          </Space>
        )}
      </Drawer>
    </div>
  );
};

export default Transactions;
