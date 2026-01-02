import React, { useState, useEffect } from "react";
import {
  Card,
  Table,
  Button,
  Input,
  InputNumber,
  Select,
  Space,
  message,
  Row,
  Col,
  Tag,
  Popconfirm,
  Tooltip,
} from "antd";
import { useMutation, useQuery } from "@apollo/client";
import {
  GET_USER_SALARIES,
  GENERATE_MONTHLY_SALARIES,
  UPDATE_USER_SALARY,
  MARK_USER_SALARY_PAID,
  BULK_UPDATE_USER_SALARIES,
} from "../../gql/userSalaries";
import { GET_ADVANCE_PAYS } from "../../gql/advancePays";
import { GET_PAYMENT_TYPES } from "../../gql/paymentTypes";
import dayjs from "dayjs";

const SalaryManagement = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [isPaid, setIsPaid] = useState(null);
  const [editedRows, setEditedRows] = useState({});
  // Queries and mutations
  const { data, loading, refetch } = useQuery(GET_USER_SALARIES, {
    variables: {
      year,
      month,
      isPaid: isPaid === null ? undefined : isPaid,
    },
    fetchPolicy: "cache-and-network",
    onCompleted: (data) => {
      console.log('Salaries loaded:', data?.userSalaries?.map(s => ({ 
        id: s.id, 
        user: `${s.user.firstName} ${s.user.lastName}`,
        paymentDetails: s.user.paymentDetails,
        isPaid: s.isPaid 
      })));
    },
  });

  // Calculate date range for the selected month
  const fromDate = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).format('YYYY-MM-DD');
  const toDate = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).endOf('month').format('YYYY-MM-DD');

  const { data: advancePayData } = useQuery(GET_ADVANCE_PAYS, {
    variables: { 
      isDeducted: false,
      fromDate,
      toDate,
    },
    fetchPolicy: "cache-and-network",
  });

  const { data: paymentTypesData } = useQuery(GET_PAYMENT_TYPES, {
    fetchPolicy: "cache-and-network",
  });

  const [generateMonthlySalaries, { loading: generating }] = useMutation(
    GENERATE_MONTHLY_SALARIES,
    {
      onCompleted: () => {
        message.success("Monthly salary records generated successfully");
        refetch();
      },
      onError: (error) => {
        message.error(`Failed to generate records: ${error.message}`);
      },
    }
  );

  // Always load current month salaries on mount and whenever filters change
  useEffect(() => {
    // First generate salary records for all employees
    generateMonthlySalaries({ variables: { year, month } });
  }, [year, month, generateMonthlySalaries]);

  const [updateUserSalary] = useMutation(UPDATE_USER_SALARY, {
    onCompleted: () => {
      message.success("Salary updated successfully");
      refetch();
    },
    onError: (error) => {
      message.error(`Failed to update salary: ${error.message}`);
    },
  });

  const [markUserSalaryPaid] = useMutation(MARK_USER_SALARY_PAID, {
    refetchQueries: [{ query: GET_USER_SALARIES, variables: { year, month, isPaid: isPaid === null ? undefined : isPaid } }],
    awaitRefetchQueries: true,
    onCompleted: () => {
      message.success("Salary marked as paid successfully");
      setEditedRows({});
    },
    onError: (error) => {
      message.error(`Failed to mark salary as paid: ${error.message}`);
    },
  });

  const [bulkUpdateUserSalaries] = useMutation(BULK_UPDATE_USER_SALARIES, {
    onCompleted: () => {
      message.success("All salaries saved successfully");
      setEditedRows({});
      refetch();
    },
    onError: (error) => {
      message.error(`Failed to save salaries: ${error.message}`);
    },
  });

  const calculateTotalToPay = (row) => {
    const { userId, monthlySalary, monthlyHours, actualHours } = row;

    // Calculate total advance pay from DB
    const dbAdvance = calculateUserAdvancePays(userId);

    // If no actual hours entered, return 0
    if (!actualHours || actualHours === 0) {
      return 0;
    }

    // Calculate based on hourly rate
    const hourlyRate = monthlyHours > 0 ? monthlySalary / monthlyHours : 0;
    const total = actualHours * hourlyRate - dbAdvance;

    return Math.max(0, total);
  };

  const handleCellChange = (recordId, field, value) => {
    setEditedRows({
      ...editedRows,
      [recordId]: {
        ...editedRows[recordId],
        [field]: value,
      },
    });
  };

  const handleConfirmPay = async (record) => {
    // Get the current row data including any edited values
    const editedData = editedRows[record.id] || {};
    
    const actualHours = editedData.actualHours ?? record.actualHours;
    const paymentTypeId = editedData.paymentTypeId ?? record.paymentTypeId;

    // Validate required fields
    if (!paymentTypeId) {
      message.error('Please select a payment method before marking as paid');
      return;
    }

    if (!actualHours || actualHours === 0) {
      message.error('Please enter actual hours worked before marking as paid');
      return;
    }

    // Calculate paid amount
    const hourlyRate = record.monthlyHours > 0 ? record.monthlySalary / record.monthlyHours : 0;
    const dbAdvance = calculateUserAdvancePays(record.userId);
    const paidAmount = actualHours * hourlyRate - dbAdvance;

    try {
      await markUserSalaryPaid({
        variables: {
          id: record.id,
          input: {
            actualHours: actualHours,
            paymentTypeId: paymentTypeId,
            paidAmount: Math.max(0, paidAmount),
            paymentType: "full",
            notes: "",
          },
        },
      });
    } catch (error) {
      console.error('Error marking as paid:', error);
    }
  };

  const handleBulkSave = async () => {
    if (Object.keys(editedRows).length === 0) {
      message.info("No changes to save");
      return;
    }

    // Validate that all edited rows have paymentTypeId and actualHours
    const invalidRows = [];
    const allSalaries = data?.userSalaries || [];
    
    Object.entries(editedRows).forEach(([id, changes]) => {
      const salary = allSalaries.find(s => s.id === id);
      const paymentTypeId = changes.paymentTypeId ?? salary?.paymentTypeId;
      const actualHours = changes.actualHours ?? salary?.actualHours;
      
      if (!paymentTypeId || !actualHours || actualHours === 0) {
        const user = salary?.user;
        const name = user ? `${user.firstName} ${user.lastName}` : 'Unknown';
        invalidRows.push(name);
      }
    });

    if (invalidRows.length > 0) {
      message.error(`Please enter actual hours and select payment method for: ${invalidRows.join(', ')}`);
      return;
    }

    // Calculate paid amount for each row and mark as paid
    const updates = Object.entries(editedRows).map(([id, changes]) => {
      const salary = allSalaries.find(s => s.id === id);
      const actualHours = changes.actualHours ?? salary?.actualHours;
      const paymentTypeId = changes.paymentTypeId ?? salary?.paymentTypeId;
      
      // Calculate paid amount
      const hourlyRate = salary.monthlyHours > 0 ? salary.monthlySalary / salary.monthlyHours : 0;
      const dbAdvance = calculateUserAdvancePays(salary.userId);
      const paidAmount = actualHours * hourlyRate - dbAdvance;
      
      return {
        id,
        ...changes,
        isPaid: true,
        paidDate: new Date().toISOString(),
        paidAmount: Math.max(0, paidAmount),
        paymentType: "full",
      };
    });

    await bulkUpdateUserSalaries({
      variables: {
        updates,
      },
    });
  };

  const calculateUserAdvancePays = (userId) => {
    if (!advancePayData?.advancePays) return 0;
    const userAdvancePays = advancePayData.advancePays.filter(
      (ap) => ap.userId === userId
    );
    return userAdvancePays.reduce((sum, ap) => sum + Number(ap.amount), 0);
  };

  const columns = [
    {
      title: "Employee Name",
      dataIndex: ["user", "firstName"],
      key: "userName",
      render: (text, record) => `${record.user.firstName} ${record.user.lastName}`,
      width: 180,
      fixed: "left",
    },
    {
      title: "Monthly Salary",
      dataIndex: "monthlySalary",
      key: "monthlySalary",
      render: (text) => `₹${Number(text).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      width: 150,
    },
    {
      title: "Monthly Hours",
      dataIndex: "monthlyHours",
      key: "monthlyHours",
      render: (text) => `${Number(text).toFixed(1)} hrs`,
      width: 130,
    },
    {
      title: "Actual Hours Worked",
      key: "actualHours",
      render: (text, record) => {
        const value = editedRows[record.id]?.actualHours ?? record.actualHours ?? 0;
        return (
          <InputNumber
            min={0}
            precision={1}
            value={value}
            onChange={(val) => handleCellChange(record.id, "actualHours", val)}
            style={{ width: "100%" }}
            placeholder="Enter hours"
            status={!value || value === 0 ? "warning" : ""}
            disabled={record.isPaid}
          />
        );
      },
      width: 150,
    },
    {
      title: (
        <span>
          Payment Method <span style={{ color: "red" }}>*</span>
        </span>
      ),
      key: "paymentMethod",
      render: (text, record) => {
        const value = editedRows[record.id]?.paymentTypeId ?? record.paymentTypeId;
        const hasError = !value;
        return (
          <Select
            value={value}
            onChange={(val) => handleCellChange(record.id, "paymentTypeId", val)}
            style={{ width: "100%" }}
            disabled={record.isPaid}
            placeholder="Select method"
            showSearch
            optionFilterProp="children"
            status={hasError ? "error" : ""}
          >
            {paymentTypesData?.paymentTypes?.map((pt) => (
              <Select.Option key={pt.id} value={pt.id}>
                {pt.name}
              </Select.Option>
            ))}
          </Select>
        );
      },
      width: 180,
    },
    {
      title: "Advance Pay",
      key: "advancePay",
      render: (text, record) => {
        const dbAdvance = calculateUserAdvancePays(record.userId);
        return (
          <span style={{ color: dbAdvance > 0 ? "#ff4d4f" : "#666" }}>
            ₹{Number(dbAdvance).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        );
      },
      width: 130,
    },
    {
      title: "Total to Pay",
      key: "totalToPay",
      render: (text, record) => {
        const rowData = {
          ...record,
          ...editedRows[record.id],
        };
        const total = calculateTotalToPay(rowData);
        return (
          <span style={{ fontWeight: "bold", fontSize: "14px", color: "#1890ff" }}>
            ₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        );
      },
      width: 150,
    },
    {
      title: "Status",
      key: "status",
      render: (text, record) => (
        record.isPaid ? <Tag color="green">Paid</Tag> : <Tag color="orange">Unpaid</Tag>
      ),
      width: 100,
    },
    {
      title: "Note",
      key: "note",
      render: (text, record) => {
        const paymentDetails = record.user?.paymentDetails;
        return paymentDetails ? (
          <Tooltip title={paymentDetails} placement="topLeft">
            <span style={{ fontSize: "12px", color: "#666", display: "block", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {paymentDetails}
            </span>
          </Tooltip>
        ) : (
          <span style={{ fontSize: "12px", color: "#ccc" }}>-</span>
        );
      },
      width: 200,
    },
    {
      title: "Action",
      key: "action",
      render: (text, record) => (
        record.isPaid ? (
          <Tag color="success" style={{ fontSize: "12px", padding: "4px 12px" }}>
            Paid
          </Tag>
        ) : (
          <Popconfirm
            title="Mark Salary as Paid"
            description="Are you sure you want to mark this salary as paid?"
            onConfirm={() => handleConfirmPay(record)}
            okText="Yes, Mark as Paid"
            cancelText="Cancel"
          >
            <Button
              type="primary"
              size="small"
            >
              Pay
            </Button>
          </Popconfirm>
        )
      ),
      width: 80,
      fixed: "right",
    },
  ];

  const months = [
    { label: "January", value: 1 },
    { label: "February", value: 2 },
    { label: "March", value: 3 },
    { label: "April", value: 4 },
    { label: "May", value: 5 },
    { label: "June", value: 6 },
    { label: "July", value: 7 },
    { label: "August", value: 8 },
    { label: "September", value: 9 },
    { label: "October", value: 10 },
    { label: "November", value: 11 },
    { label: "December", value: 12 },
  ];

  return (
    <div style={{ padding: "24px" }}>
      <Card title="Salary Management" style={{ marginBottom: 24 }}>
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={6}>
            <span style={{ marginRight: 8 }}>Month:</span>
            <Select
              value={month}
              onChange={setMonth}
              style={{ width: 150 }}
              options={months}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <span style={{ marginRight: 8 }}>Year:</span>
            <InputNumber
              min={2020}
              max={2100}
              value={year}
              onChange={(val) => setYear(val)}
              style={{ width: 150 }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <span style={{ marginRight: 8 }}>Status:</span>
            <Select
              value={isPaid}
              onChange={setIsPaid}
              style={{ width: 150 }}
              placeholder="All"
            >
              <Select.Option value={null}>All</Select.Option>
              <Select.Option value={true}>Paid</Select.Option>
              <Select.Option value={false}>Unpaid</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Button
              type="primary"
              onClick={() => refetch()}
              loading={loading}
            >
              Search
            </Button>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={data?.userSalaries || []}
          loading={loading}
          rowKey="id"
          pagination={false}
          scroll={{ x: 1500 }}
        />

        {Object.keys(editedRows).length > 0 && (
          <Row style={{ marginTop: 24, justifyContent: "flex-end" }}>
            <Space>
              <Button onClick={() => setEditedRows({})}>Clear Changes</Button>
              <Button
                type="primary"
                onClick={handleBulkSave}
                style={{ backgroundColor: "#52c41a" }}
              >
                Pay All Selected ({Object.keys(editedRows).length})
              </Button>
            </Space>
          </Row>
        )}
      </Card>
    </div>
  );
};

export default SalaryManagement;
