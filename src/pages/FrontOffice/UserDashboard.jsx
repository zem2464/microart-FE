import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { useQuery, useReactiveVar } from "@apollo/client";
import dayjs from "dayjs";
import { GET_USER_WORK_DASHBOARD } from "../../gql/userDashboard";
import * as XLSX from "xlsx";
import { userCacheVar, meUserData } from "../../cache/userCacheVar";

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const UserDashboard = () => {
  const cachedUser = useReactiveVar(userCacheVar);
  const fallbackUser = useReactiveVar(meUserData);
  const currentUser = cachedUser || fallbackUser;
  const roleType = useMemo(() => {
    const rt = currentUser?.role?.roleType || currentUser?.roleType || currentUser?.role?.name;
    return typeof rt === "string" ? rt.toLowerCase() : "";
  }, [currentUser]);
  const isEmployee = roleType === "employee";
  const isUser = roleType === "user";
  const isAdmin = roleType === "admin";

  const filterUsersByRole = useCallback(
    (users) => {
      if (!Array.isArray(users)) return [];
      // Filter to show only logged-in user's reports for "User" or "Employee" role types
      if ((isEmployee || isUser) && currentUser?.id) {
        return users.filter((u) => String(u.userId) === String(currentUser.id));
      }
      return users;
    },
    [isEmployee, isUser, currentUser?.id]
  );

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

  // Fetch user work dashboard data
  const {
    data: dashboardData,
    loading: dashboardLoading,
    refetch: refetchDashboard,
  } = useQuery(GET_USER_WORK_DASHBOARD, {
    variables: {
      dateFrom: dateRange ? dateRange[0].format("YYYY-MM-DD") : null,
      dateTo: dateRange ? dateRange[1].format("YYYY-MM-DD") : null,
      userId: (isEmployee || isUser) ? currentUser?.id : null,
    },
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      if (data?.userWorkDashboard) {
        const filteredUsers = filterUsersByRole(data.userWorkDashboard.users);
        setAllUsers(filteredUsers);
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

  // Reset filters
  const handleReset = () => {
    const today = dayjs();
    setDateFilterType("monthly");
    setDateRange([today.startOf("month"), today.endOf("month")]);
    setCustomDateRange([today.startOf("month"), today.endOf("month")]);
    setSelectedMonth(today);
    setSelectedYear(today);
    setAllUsers([]);
  };

  const effectiveUsers = useMemo(() => filterUsersByRole(allUsers), [allUsers, filterUsersByRole]);
  const effectiveSummary = useMemo(
    () => ({
      totalUsers: effectiveUsers.length,
      totalCompletedImages: effectiveUsers.reduce(
        (sum, user) => sum + (user.totalCompletedImages || 0),
        0
      ),
    }),
    [effectiveUsers]
  );

  useEffect(() => {
    if (selectedUser && !effectiveUsers.find((u) => String(u.userId) === String(selectedUser.userId))) {
      setSelectedUser(null);
    }
  }, [effectiveUsers, selectedUser]);

  // Export to Excel
  const handleExportExcel = () => {
    if (!effectiveUsers?.length) {
      message.warning("No data to export");
      return;
    }

    const users = effectiveUsers;
    
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
      ["Total Users", effectiveSummary.totalUsers],
      ["Total Completed Quantity", effectiveSummary.totalCompletedImages],
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
            {record.gradingBreakdown.map((grading) => {
              // Build tooltip content with project info
              const tooltipContent = (
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                    {grading.gradingName} ({grading.workType || 'N/A'})
                  </div>
                  {grading.projects && grading.projects.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, opacity: 0.9, marginBottom: 2 }}>Projects:</div>
                      {grading.projects.map((proj, idx) => (
                        <div key={idx} style={{ fontSize: 11, paddingLeft: 8 }}>
                          • {proj.projectName} ({proj.projectCode}): {proj.imageQuantity} images
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );

              return (
                <Tooltip
                  key={grading.gradingId}
                  title={tooltipContent}
                >
                  <Tag color="blue" style={{ fontSize: 11, cursor: 'pointer' }}>
                    {grading.gradingShortCode || grading.gradingName}: {grading.completedImages}
                  </Tag>
                </Tooltip>
              );
            })}
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

  // Calculate total earnings for selected user
  const getTotalEarnings = () => {
    if (!selectedUser || !isAdmin) return 0;
    
    return selectedUser.workByDate?.reduce((total, workDate) => {
      const dayTotal = workDate.taskTypeBreakdown?.reduce((daySum, taskType) => {
        return daySum + (taskType.totalEarnings || 0);
      }, 0) || 0;
      return total + dayTotal;
    }, 0) || 0;
  };

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
        {effectiveSummary && (
          <Col span={24}>
            <Card>
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Statistic
                    title="Total Users"
                    value={effectiveSummary.totalUsers}
                    prefix={<UserOutlined />}
                  />
                </Col>
                <Col xs={24} sm={12}>
                  <Statistic
                    title="Total Completed Quantity"
                    value={effectiveSummary.totalCompletedImages}
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
                    disabled={!allUsers.length}
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
                    dataSource={effectiveUsers}
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
                  />
                </Spin>
              </Card>
            </Col>

            {/* Right Side - Daily Breakdown */}
            <Col xs={24} lg={14}>
              <Card 
                title={selectedUser ? `Daily Work: ${selectedUser.userName}` : "Daily Work Breakdown"}
                extra={(
                  <Space>
                    {selectedUser && isAdmin && (
                      <Text strong style={{ color: '#52c41a', fontSize: 14 }}>
                        Total Earnings: ₹{getTotalEarnings().toFixed(2)}
                      </Text>
                    )}
                    {selectedUser && (
                      <Button 
                        size="small" 
                        onClick={() => setSelectedUser(null)}
                      >
                        Clear Selection
                      </Button>
                    )}
                  </Space>
                )}
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
                        title: "Task Types & Earnings",
                        key: "taskTypeDetails",
                        render: (_, workDate) => {
                          // Use taskTypeBreakdown if available
                          if (workDate.taskTypeBreakdown && workDate.taskTypeBreakdown.length > 0) {
                            return (
                              <Space size={[4, 4]} wrap>
                                {workDate.taskTypeBreakdown.map((taskType) => {
                                  // Build tooltip with clean, consistent table design
                                  const tooltipContent = (
                                    <div>
                                      <div style={{ 
                                        fontWeight: 600,
                                        fontSize: 13,
                                        marginBottom: 10,
                                        paddingBottom: 8,
                                        borderBottom: '1px solid #d9d9d9',
                                        color: '#000',
                                        whiteSpace: 'nowrap'
                                      }}>
                                        {taskType.taskTypeName}
                                      </div>
                                      <table style={{ 
                                        width: '100%', 
                                        fontSize: 12,
                                        borderCollapse: 'collapse',
                                        backgroundColor: '#fff'
                                      }}>
                                        <thead>
                                          <tr style={{ 
                                            backgroundColor: '#f5f5f5',
                                            borderBottom: '1px solid #d9d9d9'
                                          }}>
                                            <th style={{ 
                                              padding: '8px 12px', 
                                              textAlign: 'left',
                                              fontWeight: 600,
                                              fontSize: 11,
                                              color: '#000',
                                              whiteSpace: 'nowrap'
                                            }}>Grading</th>
                                            <th style={{ 
                                              padding: '8px 12px', 
                                              textAlign: 'left',
                                              fontWeight: 600,
                                              fontSize: 11,
                                              color: '#000',
                                              whiteSpace: 'nowrap'
                                            }}>Project</th>
                                            <th style={{ 
                                              padding: '8px 12px', 
                                              textAlign: 'right',
                                              fontWeight: 600,
                                              fontSize: 11,
                                              color: '#000',
                                              whiteSpace: 'nowrap'
                                            }}>Qty</th>
                                            {isAdmin && (
                                              <>
                                                <th style={{ 
                                                  padding: '8px 12px', 
                                                  textAlign: 'right',
                                                  fontWeight: 600,
                                                  fontSize: 11,
                                                  color: '#000',
                                                  whiteSpace: 'nowrap'
                                                }}>Rate</th>
                                                <th style={{ 
                                                  padding: '8px 12px', 
                                                  textAlign: 'right',
                                                  fontWeight: 600,
                                                  fontSize: 11,
                                                  color: '#000',
                                                  whiteSpace: 'nowrap'
                                                }}>Earnings</th>
                                              </>
                                            )}
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {taskType.details.map((detail, idx) => (
                                            <tr key={idx} style={{ 
                                              backgroundColor: '#fff',
                                              borderBottom: '1px solid #f0f0f0'
                                            }}>
                                              <td style={{ 
                                                padding: '8px 12px',
                                                color: '#000',
                                                whiteSpace: 'nowrap'
                                              }}>
                                                <Tag color="blue" style={{ 
                                                  fontSize: 11,
                                                  margin: 0,
                                                  padding: '0 7px',
                                                  lineHeight: '20px'
                                                }}>
                                                  {detail.gradingShortCode || detail.gradingName || '-'}
                                                </Tag>
                                              </td>
                                              <td style={{ 
                                                padding: '8px 12px',
                                                color: '#000',
                                                fontSize: 11,
                                                whiteSpace: 'nowrap'
                                              }}>
                                                {detail.projectCode && detail.projectName 
                                                  ? `${detail.projectCode} - ${detail.projectName}`
                                                  : detail.projectName || detail.projectCode || '-'
                                                }
                                              </td>
                                              <td style={{ 
                                                padding: '8px 12px',
                                                textAlign: 'right',
                                                color: '#000',
                                                fontWeight: 500,
                                                whiteSpace: 'nowrap'
                                              }}>
                                                {detail.quantity}
                                              </td>
                                              {isAdmin && (
                                                <>
                                                  <td style={{ 
                                                    padding: '8px 12px',
                                                    textAlign: 'right',
                                                    color: '#000',
                                                    fontSize: 11,
                                                    whiteSpace: 'nowrap'
                                                  }}>
                                                    ₹{detail.employeeRate.toFixed(2)}
                                                  </td>
                                                  <td style={{ 
                                                    padding: '8px 12px',
                                                    textAlign: 'right',
                                                    fontWeight: 600,
                                                    color: '#52c41a',
                                                    whiteSpace: 'nowrap'
                                                  }}>
                                                    ₹{detail.earnings.toFixed(2)}
                                                  </td>
                                                </>
                                              )}
                                            </tr>
                                          ))}
                                        </tbody>
                                        <tfoot>
                                          <tr style={{ 
                                            backgroundColor: '#f5f5f5',
                                            borderTop: '1px solid #d9d9d9'
                                          }}>
                                            <td colSpan="2" style={{ 
                                              padding: '10px 12px',
                                              textAlign: 'right',
                                              fontWeight: 600,
                                              fontSize: 12,
                                              color: '#000',
                                              whiteSpace: 'nowrap'
                                            }}>
                                              Total:
                                            </td>
                                            <td style={{ 
                                              padding: '10px 12px',
                                              textAlign: 'right',
                                              fontWeight: 600,
                                              fontSize: 12,
                                              color: '#000',
                                              whiteSpace: 'nowrap'
                                            }}>
                                              {taskType.completedImages}
                                            </td>
                                            {isAdmin && (
                                              <>
                                                <td style={{ padding: '10px 12px' }}></td>
                                                <td style={{ 
                                                  padding: '10px 12px',
                                                  textAlign: 'right',
                                                  fontWeight: 600,
                                                  fontSize: 13,
                                                  color: '#52c41a',
                                                  whiteSpace: 'nowrap'
                                                }}>
                                                  ₹{taskType.totalEarnings.toFixed(2)}
                                                </td>
                                              </>
                                            )}
                                          </tr>
                                        </tfoot>
                                      </table>
                                    </div>
                                  );

                                  return (
                                    <Tooltip
                                      key={taskType.taskTypeId}
                                      title={tooltipContent}
                                      overlayInnerStyle={{ 
                                        padding: 12,
                                        backgroundColor: '#fff',
                                        boxShadow: '0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 9px 28px 8px rgba(0, 0, 0, 0.05)'
                                      }}
                                      color="#fff"
                                      overlayStyle={{ maxWidth: 'none' }}
                                    >
                                      <Tag color="green" style={{ 
                                        fontSize: 11, 
                                        cursor: 'pointer',
                                        fontWeight: 500
                                      }}>
                                        {isAdmin 
                                          ? `${taskType.taskTypeName}: ${taskType.completedImages} (₹${taskType.totalEarnings.toFixed(0)})`
                                          : `${taskType.taskTypeName}: ${taskType.completedImages}`
                                        }
                                      </Tag>
                                    </Tooltip>
                                  );
                                })}
                              </Space>
                            );
                          }
                          
                          return <Text type="secondary">-</Text>;
                        },
                      },
                      {
                        title: "Grading Types & Quantity",
                        key: "gradingDetails",
                        render: (_, workDate) => {
                          // Use gradingBreakdown if available, otherwise fall back to tasks
                          if (workDate.gradingBreakdown && workDate.gradingBreakdown.length > 0) {
                            return (
                              <Space size={[4, 4]} wrap>
                                {workDate.gradingBreakdown.map((grading) => {
                                  // Build tooltip content with project info
                                  const tooltipContent = (
                                    <div>
                                      <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                                        {grading.gradingName} ({grading.workType || 'N/A'})
                                      </div>
                                      {grading.projects && grading.projects.length > 0 && (
                                        <div>
                                          <div style={{ fontSize: 11, opacity: 0.9, marginBottom: 2 }}>Projects:</div>
                                          {grading.projects.map((proj, idx) => (
                                            <div key={idx} style={{ fontSize: 11, paddingLeft: 8 }}>
                                              • {proj.projectName} ({proj.projectCode}): {proj.imageQuantity} images
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );

                                  return (
                                    <Tooltip
                                      key={grading.gradingId}
                                      title={tooltipContent}
                                    >
                                      <Tag color="blue" style={{ fontSize: 11, cursor: 'pointer' }}>
                                        {grading.gradingShortCode || grading.gradingName}: {grading.completedImages}
                                      </Tag>
                                    </Tooltip>
                                  );
                                })}
                              </Space>
                            );
                          }
                          
                          // Fallback to old task-based rendering if no gradingBreakdown
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
                    pagination={false}
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
