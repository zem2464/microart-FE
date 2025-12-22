import React, { useState } from "react";
import {
  Card,
  Row,
  Col,
  Select,
  DatePicker,
  Button,
  Table,
  Space,
  Typography,
  Statistic,
  message,
  Spin,
  Tag,
  Tooltip,
} from "antd";
import {
  FilterOutlined,
  ReloadOutlined,
  FileExcelOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useQuery } from "@apollo/client";
import dayjs from "dayjs";
import { GET_USER_WORK_DASHBOARD } from "../../gql/userDashboard";
import * as XLSX from "xlsx";

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const UserDashboard = () => {
  // State for filters
  const [dateFilterType, setDateFilterType] = useState("monthly");
  const [selectedMonth, setSelectedMonth] = useState(dayjs());
  const [selectedYear, setSelectedYear] = useState(dayjs());
  const [customDateRange, setCustomDateRange] = useState([
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);
  const [dateRange, setDateRange] = useState([
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Fetch user work dashboard data
  const {
    data: dashboardData,
    loading: dashboardLoading,
    refetch: refetchDashboard,
    fetchMore,
  } = useQuery(GET_USER_WORK_DASHBOARD, {
    variables: {
      dateFrom: dateRange ? dateRange[0].format("YYYY-MM-DD") : null,
      dateTo: dateRange ? dateRange[1].format("YYYY-MM-DD") : null,
      limit: 20,
      offset: 0,
    },
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      if (data?.userWorkDashboard) {
        setAllUsers(data.userWorkDashboard.users);
        setHasMore(data.userWorkDashboard.hasMore);
      }
    },
  });

  // Handle date filter type change
  const handleDateFilterChange = (value) => {
    setDateFilterType(value);
    const today = dayjs();

    switch (value) {
      case "weekly":
        setDateRange([today.startOf("week"), today.endOf("week")]);
        break;
      case "monthly":
        const monthToUse = selectedMonth || today;
        setDateRange([monthToUse.startOf("month"), monthToUse.endOf("month")]);
        break;
      case "fy":
        const fyStart = today.month() >= 3 ? today.year() : today.year() - 1;
        setDateRange([
          dayjs(`${fyStart}-04-01`),
          dayjs(`${fyStart + 1}-03-31`),
        ]);
        break;
      case "yearly":
        const yearToUse = selectedYear || today;
        setDateRange([yearToUse.startOf("year"), yearToUse.endOf("year")]);
        break;
      case "custom":
        setDateRange(customDateRange);
        break;
      default:
        break;
    }
  };

  // Handle month change
  const handleMonthChange = (date) => {
    setSelectedMonth(date);
    if (dateFilterType === "monthly" && date) {
      setDateRange([date.startOf("month"), date.endOf("month")]);
    }
  };

  // Handle year change
  const handleYearChange = (date) => {
    setSelectedYear(date);
    if (dateFilterType === "yearly" && date) {
      setDateRange([date.startOf("year"), date.endOf("year")]);
    }
  };

  // Handle custom date range change
  const handleCustomDateChange = (dates) => {
    setCustomDateRange(dates);
    if (dateFilterType === "custom") {
      setDateRange(dates);
    }
  };

  // Load more users for infinite scroll
  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      await fetchMore({
        variables: {
          offset: allUsers.length,
          limit: 20,
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev;

          const newUsers = fetchMoreResult.userWorkDashboard.users;
          setAllUsers([...allUsers, ...newUsers]);
          setHasMore(fetchMoreResult.userWorkDashboard.hasMore);

          return {
            userWorkDashboard: {
              ...fetchMoreResult.userWorkDashboard,
              users: [...prev.userWorkDashboard.users, ...newUsers],
            },
          };
        },
      });
    } catch (error) {
      message.error("Failed to load more users");
      console.error("Load more error:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  // Reset filters
  const handleReset = () => {
    const today = dayjs();
    setDateFilterType("monthly");
    setDateRange([today.startOf("month"), today.endOf("month")]);
    setCustomDateRange([today.startOf("month"), today.endOf("month")]);
    setSelectedMonth(today);
    setSelectedYear(today);
    setAllUsers([]);
    setHasMore(true);
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (!dashboardData?.userWorkDashboard?.users?.length) {
      message.warning("No data to export");
      return;
    }

    const users = dashboardData.userWorkDashboard.users;
    
    // Prepare Excel data
    const excelData = [
      ["MicroArt - User Work Dashboard"],
      [
        `Period: ${dateRange[0].format("DD MMM YYYY")} to ${dateRange[1].format(
          "DD MMM YYYY"
        )}`,
      ],
      [`Generated on: ${dayjs().format("DD MMM YYYY, HH:mm")}`],
      [],
      ["SUMMARY"],
      ["Total Users", dashboardData.userWorkDashboard.summary.totalUsers],
      ["Total Completed Quantity", dashboardData.userWorkDashboard.summary.totalCompletedImages],
      [],
      ["USER WORK DETAILS"],
      [
        "User Name",
        "Email",
        "Completed Quantity",
        "Avg/Day",
      ],
    ];

    users.forEach((user) => {
      const avgPerDay = totalDays ? Math.round(user.totalCompletedImages / totalDays) : 0;
      excelData.push([
        user.userName,
        user.userEmail,
        user.totalCompletedImages,
        avgPerDay,
      ]);

      // Add work by date
      if (user.workByDate?.length > 0) {
        excelData.push(["", "Date", "Completed Qty", ""]);
        user.workByDate.forEach((work) => {
          excelData.push([
            "",
            dayjs(work.date).format("DD/MM/YYYY"),
            work.completedImages,
            "",
          ]);
        });
      }

      // Add grading breakdown
      if (user.gradingBreakdown?.length > 0) {
        excelData.push(["", "Grading", "Work Type", "Completed Qty"]);
        user.gradingBreakdown.forEach((grading) => {
          excelData.push([
            "",
            grading.gradingName,
            grading.workType || "-",
            grading.completedImages,
          ]);
        });
      }

      excelData.push([]);
    });

    // Create workbook and worksheet
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "User Work Dashboard");

    // Auto-size columns
    const maxWidth = excelData.reduce((w, r) => Math.max(w, r.length), 10);
    ws["!cols"] = Array(maxWidth).fill({ wch: 15 });

    // Download file
    const filename = `user_work_dashboard_${dateRange[0].format(
      "YYYYMMDD"
    )}_${dateRange[1].format("YYYYMMDD")}.xlsx`;
    XLSX.writeFile(wb, filename);
    message.success("Excel file downloaded successfully");
  };

  // Main table columns
  const totalDays = dateRange && dateRange[0] && dateRange[1]
    ? dateRange[1].diff(dateRange[0], 'day') + 1
    : 0;

  const mainColumns = [
    {
      title: "User",
      dataIndex: "userName",
      key: "userName",
      width: 200,
      fixed: "left",
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {record.userEmail}
          </Text>
        </Space>
      ),
    },
    {
      title: "Completed Quantity",
      dataIndex: "totalCompletedImages",
      key: "totalCompletedImages",
      width: 150,
      align: "center",
      sorter: (a, b) => a.totalCompletedImages - b.totalCompletedImages,
      render: (value) => <Tag color="success">{value}</Tag>,
    },
    {
      title: "Avg/Day",
      key: "avgPerDay",
      width: 120,
      align: "center",
      render: (_, record) => {
        if (!totalDays || !record?.totalCompletedImages) return <Text type="secondary">-</Text>;
        const avg = Math.round(record.totalCompletedImages / totalDays);
        return <Tag color="blue">{avg}</Tag>;
      },
      sorter: (a, b) => {
        const avga = totalDays ? a.totalCompletedImages / totalDays : 0;
        const avgb = totalDays ? b.totalCompletedImages / totalDays : 0;
        return avga - avgb;
      }
    },
    {
      title: "Grading Types & Quantity",
      key: "gradingTypes",
      render: (_, record) => {
        if (!record.gradingBreakdown?.length) return <Text type="secondary">-</Text>;
        
        return (
          <Space size={[4, 4]} wrap>
            {record.gradingBreakdown.map((grading) => (
              <Tooltip
                key={grading.gradingId}
                title={`${grading.gradingName} (${grading.workType || 'N/A'})`}
              >
                <Tag color="blue" style={{ fontSize: 11 }}>
                  {grading.gradingShortCode || grading.gradingName}: {grading.completedImages}
                </Tag>
              </Tooltip>
            ))}
          </Space>
        );
      },
    },
  ];

  // Generate all dates in the selected month
  const generateMonthDates = () => {
    if (!dateRange || !dateRange[0] || !dateRange[1]) return [];
    
    const dates = [];
    let currentDate = dateRange[0].clone();
    const endDate = dateRange[1].clone();
    
    while (currentDate.isBefore(endDate) || currentDate.isSame(endDate, 'day')) {
      dates.push(currentDate.format('YYYY-MM-DD'));
      currentDate = currentDate.add(1, 'day');
    }
    
    return dates;
  };

  // Get daily data for selected user
  const getDailyData = () => {
    if (!selectedUser) return [];
    
    const allDates = generateMonthDates();
    const workByDateMap = {};
    
    // Create a map of existing work data
    selectedUser.workByDate?.forEach(work => {
      workByDateMap[work.date] = work;
    });
    
    // Generate data for all dates
    return allDates.map(date => {
      const workData = workByDateMap[date];
      
      if (!workData) {
        return {
          date,
          completedImages: 0,
          tasks: [],
          hasData: false
        };
      }
      
      return {
        ...workData,
        hasData: true
      };
    });
  };

  const users = dashboardData?.userWorkDashboard?.users || [];
  const summary = dashboardData?.userWorkDashboard?.summary;

  return (
    <div style={{ padding: "24px" }}>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card>
            <Row justify="space-between" align="middle">
              <Col>
                <Space align="center">
                  <UserOutlined style={{ fontSize: 24 }} />
                  <Title level={3} style={{ margin: 0 }}>
                    User Work Dashboard
                  </Title>
                </Space>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* Summary Statistics */}
        {summary && (
          <Col span={24}>
            <Card>
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Statistic
                    title="Total Users"
                    value={summary.totalUsers}
                    prefix={<UserOutlined />}
                  />
                </Col>
                <Col xs={24} sm={12}>
                  <Statistic
                    title="Total Completed Quantity"
                    value={summary.totalCompletedImages}
                    valueStyle={{ color: "#3f8600" }}
                  />
                </Col>
              </Row>
            </Card>
          </Col>
        )}

        {/* Filters */}
        <Col span={24}>
          <Card>
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} sm={12} md={6}>
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Text strong>Filter Type</Text>
                  <Select
                    value={dateFilterType}
                    onChange={handleDateFilterChange}
                    style={{ width: "100%" }}
                  >
                    <Option value="weekly">Weekly</Option>
                    <Option value="monthly">Monthly</Option>
                    <Option value="yearly">Yearly</Option>
                    <Option value="fy">Financial Year</Option>
                    <Option value="custom">Custom Range</Option>
                  </Select>
                </Space>
              </Col>

              {dateFilterType === "monthly" && (
                <Col xs={24} sm={12} md={6}>
                  <Space direction="vertical" style={{ width: "100%" }}>
                    <Text strong>Select Month</Text>
                    <DatePicker
                      picker="month"
                      value={selectedMonth}
                      onChange={handleMonthChange}
                      style={{ width: "100%" }}
                      format="MMM YYYY"
                    />
                  </Space>
                </Col>
              )}

              {dateFilterType === "yearly" && (
                <Col xs={24} sm={12} md={6}>
                  <Space direction="vertical" style={{ width: "100%" }}>
                    <Text strong>Select Year</Text>
                    <DatePicker
                      picker="year"
                      value={selectedYear}
                      onChange={handleYearChange}
                      style={{ width: "100%" }}
                      format="YYYY"
                    />
                  </Space>
                </Col>
              )}

              {dateFilterType === "custom" && (
                <Col xs={24} sm={12} md={10}>
                  <Space direction="vertical" style={{ width: "100%" }}>
                    <Text strong>Custom Date Range</Text>
                    <RangePicker
                      value={customDateRange}
                      onChange={handleCustomDateChange}
                      style={{ width: "100%" }}
                      format="DD MMM YYYY"
                    />
                  </Space>
                </Col>
              )}

              <Col xs={24} sm={12} md={6}>
                <Space style={{ marginTop: 24 }}>
                  <Button
                    icon={<FilterOutlined />}
                    onClick={() => {
                      setAllUsers([]);
                      setHasMore(true);
                      refetchDashboard();
                    }}
                  >
                    Apply
                  </Button>
                  <Button icon={<ReloadOutlined />} onClick={handleReset}>
                    Reset
                  </Button>
                  <Button
                    icon={<FileExcelOutlined />}
                    onClick={handleExportExcel}
                    disabled={!users.length}
                  >
                    Export
                  </Button>
                </Space>
              </Col>

              <Col span={24}>
                <Text type="secondary">
                  Showing data from <strong>{dateRange[0].format("DD MMM YYYY")}</strong> to{" "}
                  <strong>{dateRange[1].format("DD MMM YYYY")}</strong>
                </Text>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* Side by Side Layout */}
        <Col span={24}>
          <Row gutter={16}>
            {/* Left Side - Main User Table */}
            <Col xs={24} lg={10}>
              <Card title="Users" extra={<Text type="secondary">Click a row to view daily details</Text>}>
                <Spin spinning={dashboardLoading}>
                  <Table
                    columns={mainColumns}
                    dataSource={allUsers}
                    rowKey="userId"
                    onRow={(record) => ({
                      onClick: () => setSelectedUser(record),
                      style: {
                        cursor: 'pointer',
                        backgroundColor: selectedUser?.userId === record.userId ? '#e6f7ff' : undefined
                      }
                    })}
                    pagination={false}
                    scroll={{ x: 800, y: 600 }}
                    size="small"
                    footer={() => (
                      hasMore ? (
                        <div style={{ textAlign: 'center', padding: '12px 0' }}>
                          <Button
                            type="link"
                            loading={loadingMore}
                            onClick={handleLoadMore}
                          >
                            {loadingMore ? 'Loading...' : 'Load More Users'}
                          </Button>
                        </div>
                      ) : allUsers.length > 0 ? (
                        <div style={{ textAlign: 'center', padding: '8px 0', color: '#999' }}>
                          All {allUsers.length} users loaded
                        </div>
                      ) : null
                    )}
                  />
                </Spin>
              </Card>
            </Col>

            {/* Right Side - Daily Breakdown */}
            <Col xs={24} lg={14}>
              <Card 
                title={selectedUser ? `Daily Work: ${selectedUser.userName}` : "Daily Work Breakdown"}
                extra={
                  selectedUser && (
                    <Button 
                      size="small" 
                      onClick={() => setSelectedUser(null)}
                    >
                      Clear Selection
                    </Button>
                  )
                }
              >
                {selectedUser ? (
                  <Table
                    columns={[
                      {
                        title: "Date",
                        dataIndex: "date",
                        key: "date",
                        width: 120,
                        fixed: "left",
                        render: (date, record) => (
                          <Text strong={record.hasData} type={!record.hasData ? "secondary" : undefined}>
                            {dayjs(date).format("DD MMM YYYY")}
                          </Text>
                        ),
                      },
                      {
                        title: "Completed Qty",
                        dataIndex: "completedImages",
                        key: "completedImages",
                        width: 120,
                        align: "center",
                        render: (value, record) => {
                          if (!value || value === 0) {
                            return <Text type="secondary">-</Text>;
                          }
                          return <Tag color="success">{value}</Tag>;
                        },
                      },
                      {
                        title: "Grading Types & Quantity",
                        key: "gradingDetails",
                        render: (_, workDate) => {
                          if (!workDate.tasks?.length) return <Text type="secondary">-</Text>;
                          
                          // Group tasks by grading
                          const gradingMap = {};
                          workDate.tasks.forEach(task => {
                            if (task.gradingName) {
                              const key = task.gradingShortCode || task.gradingName;
                              if (!gradingMap[key]) {
                                gradingMap[key] = {
                                  name: task.gradingName,
                                  shortCode: task.gradingShortCode,
                                  workType: task.workType,
                                  qty: 0
                                };
                              }
                              gradingMap[key].qty += task.completedImageQuantity || 0;
                            }
                          });
                          
                          const gradingEntries = Object.values(gradingMap);
                          
                          if (gradingEntries.length === 0) {
                            return <Text type="secondary">-</Text>;
                          }
                          
                          return (
                            <Space size={[4, 4]} wrap>
                              {gradingEntries.map((grading, idx) => (
                                <Tooltip
                                  key={idx}
                                  title={`${grading.name} (${grading.workType || 'N/A'})`}
                                >
                                  <Tag color="blue" style={{ fontSize: 11 }}>
                                    {grading.shortCode || grading.name}: {grading.qty}
                                  </Tag>
                                </Tooltip>
                              ))}
                            </Space>
                          );
                        },
                      },
                    ]}
                    dataSource={getDailyData()}
                    rowKey="date"
                    pagination={{
                      pageSize: 31,
                      hideOnSinglePage: true
                    }}
                    scroll={{ y: 600 }}
                    size="small"
                    bordered
                  />
                ) : (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '60px 20px',
                    color: '#999'
                  }}>
                    <UserOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                    <div>Select a user from the left table to view their daily work breakdown</div>
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>
    </div>
  );
};

export default UserDashboard;
