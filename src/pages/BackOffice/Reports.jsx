import React, { useState } from 'react';
import { 
  Card, 
  Typography, 
  DatePicker, 
  Button, 
  Row, 
  Col, 
  Statistic, 
  Table, 
  Space, 
  Spin, 
  Alert,
  Divider,
  Tag
} from 'antd';
import { 
  DollarOutlined, 
  ArrowUpOutlined, 
  ArrowDownOutlined, 
  ReloadOutlined
} from '@ant-design/icons';
import { useQuery } from '@apollo/client';
import { GET_ACCOUNTING_REPORT } from '../../graphql/queries/accountingReport';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const Reports = () => {
  // Default to current month
  const now = dayjs();
  const defaultStartDate = now.startOf('month');
  const defaultEndDate = now.endOf('month');
  
  const [dateRange, setDateRange] = useState([defaultStartDate, defaultEndDate]);

  // GraphQL Query
  const { data, loading, error, refetch } = useQuery(GET_ACCOUNTING_REPORT, {
    variables: {
      startDate: dateRange[0].format('YYYY-MM-DD'),
      endDate: dateRange[1].format('YYYY-MM-DD'),
    },
  });

  const report = data?.accountingReport;

  // Handle date range change
  const handleDateRangeChange = (dates) => {
    if (dates && dates.length === 2) {
      setDateRange(dates);
    }
  };

  // Quick date filters
  const setQuickFilter = (type) => {
    let start, end;
    const today = dayjs();
    
    switch (type) {
      case 'today':
        start = today.startOf('day');
        end = today.endOf('day');
        break;
      case 'week':
        start = today.startOf('week');
        end = today.endOf('week');
        break;
      case 'month':
        start = today.startOf('month');
        end = today.endOf('month');
        break;
      case 'quarter':
        start = today.startOf('quarter');
        end = today.endOf('quarter');
        break;
      case 'year':
        start = today.startOf('year');
        end = today.endOf('year');
        break;
      case 'lastMonth':
        start = today.subtract(1, 'month').startOf('month');
        end = today.subtract(1, 'month').endOf('month');
        break;
      default:
        start = today.startOf('month');
        end = today.endOf('month');
    }
    
    setDateRange([start, end]);
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  // Prepare table data for categories
  const prepareTableData = (categories) => {
    return categories?.map((cat, index) => ({
      key: cat.categoryId || index,
      categoryName: cat.categoryName,
      amount: cat.amount,
    })) || [];
  };

  // Table columns
  const categoryColumns = [
    {
      title: 'Category',
      dataIndex: 'categoryName',
      key: 'categoryName',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (amount) => <Text>{formatCurrency(amount)}</Text>,
    },
  ];

  if (error) {
    return (
      <Card>
        <Alert
          message="Error Loading Report"
          description={error.message}
          type="error"
          showIcon
        />
      </Card>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Card className="card-shadow" style={{ marginBottom: '24px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={3} style={{ margin: 0 }}>Accounting Report</Title>
            <Text type="secondary">
              Comprehensive financial overview for the selected period
            </Text>
          </Col>
          <Col>
            <Space>
              <RangePicker
                value={dateRange}
                onChange={handleDateRangeChange}
                format="DD MMM YYYY"
                allowClear={false}
              />
              <Button 
                icon={<ReloadOutlined />} 
                onClick={() => refetch()}
                loading={loading}
              >
                Refresh
              </Button>
            </Space>
          </Col>
        </Row>

        <Divider />

        {/* Quick Filters */}
        <Space wrap style={{ marginBottom: '16px' }}>
          <Text type="secondary">Quick Filters:</Text>
          <Button size="small" onClick={() => setQuickFilter('today')}>Today</Button>
          <Button size="small" onClick={() => setQuickFilter('week')}>This Week</Button>
          <Button size="small" onClick={() => setQuickFilter('month')}>This Month</Button>
          <Button size="small" onClick={() => setQuickFilter('lastMonth')}>Last Month</Button>
          <Button size="small" onClick={() => setQuickFilter('quarter')}>This Quarter</Button>
          <Button size="small" onClick={() => setQuickFilter('year')}>This Year</Button>
        </Space>
      </Card>

      {loading ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <Spin size="large" tip="Loading report..." />
          </div>
        </Card>
      ) : report ? (
        <>
          {/* Summary Statistics */}
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={24} sm={12} lg={8}>
              <Card>
                <Statistic
                  title="Total Income"
                  value={report.totalIncome}
                  precision={2}
                  valueStyle={{ color: '#3f8600' }}
                  prefix={<ArrowUpOutlined />}
                  suffix={<Text type="secondary">INR</Text>}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Card>
                <Statistic
                  title="Total Expense"
                  value={report.totalExpense}
                  precision={2}
                  valueStyle={{ color: '#cf1322' }}
                  prefix={<ArrowDownOutlined />}
                  suffix={<Text type="secondary">INR</Text>}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Card>
                <Statistic
                  title="Net Income (Profit/Loss)"
                  value={report.netIncome}
                  precision={2}
                  valueStyle={{ 
                    color: report.netIncome >= 0 ? '#3f8600' : '#cf1322' 
                  }}
                  prefix={<DollarOutlined />}
                  suffix={
                    <Tag color={report.netIncome >= 0 ? 'success' : 'error'}>
                      {report.netIncome >= 0 ? 'Profit' : 'Loss'}
                    </Tag>
                  }
                />
              </Card>
            </Col>
          </Row>

          {/* Direct Income Section */}
          <Card 
            title={
              <Space>
                <Title level={4} style={{ margin: 0 }}>Direct Income</Title>
                <Tag color="green">{formatCurrency(report.directIncome.total)}</Tag>
              </Space>
            }
            style={{ marginBottom: '24px' }}
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Card type="inner" title="Client Payments">
                  <Statistic
                    value={report.directIncome.clientPayments}
                    precision={2}
                    valueStyle={{ color: '#3f8600' }}
                    prefix="₹"
                  />
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card type="inner" title="Categorized Income">
                  {report.directIncome.categories.length > 0 ? (
                    <Table
                      dataSource={prepareTableData(report.directIncome.categories)}
                      columns={categoryColumns}
                      pagination={false}
                      size="small"
                    />
                  ) : (
                    <Text type="secondary">No categorized income in this period</Text>
                  )}
                </Card>
              </Col>
            </Row>
          </Card>

          {/* Direct Expense Section */}
          <Card 
            title={
              <Space>
                <Title level={4} style={{ margin: 0 }}>Direct Expense</Title>
                <Tag color="red">{formatCurrency(report.directExpense.total)}</Tag>
              </Space>
            }
            style={{ marginBottom: '24px' }}
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Card type="inner" title="Salaries Paid">
                  <Statistic
                    value={report.directExpense.salariesPaid}
                    precision={2}
                    valueStyle={{ color: '#cf1322' }}
                    prefix="₹"
                  />
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card type="inner" title="Categorized Expenses">
                  {report.directExpense.categories.length > 0 ? (
                    <Table
                      dataSource={prepareTableData(report.directExpense.categories)}
                      columns={categoryColumns}
                      pagination={false}
                      size="small"
                    />
                  ) : (
                    <Text type="secondary">No categorized expenses in this period</Text>
                  )}
                </Card>
              </Col>
            </Row>
          </Card>

          {/* Indirect Income Section */}
          <Card 
            title={
              <Space>
                <Title level={4} style={{ margin: 0 }}>Indirect Income</Title>
                <Tag color="green">{formatCurrency(report.indirectIncome.total)}</Tag>
              </Space>
            }
            style={{ marginBottom: '24px' }}
          >
            {report.indirectIncome.categories.length > 0 ? (
              <Table
                dataSource={prepareTableData(report.indirectIncome.categories)}
                columns={categoryColumns}
                pagination={false}
                size="small"
              />
            ) : (
              <Text type="secondary">No indirect income in this period</Text>
            )}
          </Card>

          {/* Indirect Expense Section */}
          <Card 
            title={
              <Space>
                <Title level={4} style={{ margin: 0 }}>Indirect Expense</Title>
                <Tag color="red">{formatCurrency(report.indirectExpense.total)}</Tag>
              </Space>
            }
            style={{ marginBottom: '24px' }}
          >
            {report.indirectExpense.categories.length > 0 ? (
              <Table
                dataSource={prepareTableData(report.indirectExpense.categories)}
                columns={categoryColumns}
                pagination={false}
                size="small"
              />
            ) : (
              <Text type="secondary">No indirect expenses in this period</Text>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
};

export default Reports;