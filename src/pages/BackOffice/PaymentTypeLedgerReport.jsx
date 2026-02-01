import React, { useState, useMemo, useEffect } from "react";
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
  Empty,
  Tag,
  Dropdown,
  Checkbox,
  Divider,
  Alert,
  Tooltip,
} from "antd";
import {
  FilterOutlined,
  ReloadOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  BankOutlined,
  WalletOutlined,
  CreditCardOutlined,
  QrcodeOutlined,
  SwapOutlined,
  DollarOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from "@ant-design/icons";
import { useQuery } from "@apollo/client";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  GET_PAYMENT_TYPES_FOR_REPORT,
  GET_PAYMENT_TYPE_LEDGER_REPORT,
  TRANSACTION_TYPE_LABELS,
  TRANSACTION_TYPE_COLORS,
} from "../../gql/paymentTypeLedgerReport";

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

// Company details for PDF header
const COMPANY_DETAILS = {
  name: "The Image Care",
  contactName: "Rohit Ramani",
  address:
    "204 MBC, Meridian Business Centre, Lajamni Chowk, opposite Opera Business Center, Shanti Niketan Society, Mota Varachha, Surat, Gujarat 394105",
  phone: "+91 9904530103",
};

// Currency formatter
const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);

const formatCurrencyNoDecimal = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);

// Payment type icons
const getPaymentTypeIcon = (type) => {
  const icons = {
    BANK: <BankOutlined />,
    UPI: <QrcodeOutlined />,
    CASH: <WalletOutlined />,
    CREDIT_CARD: <CreditCardOutlined />,
    DEBIT_CARD: <CreditCardOutlined />,
    CHEQUE: <BankOutlined />,
    OTHER: <DollarOutlined />,
  };
  return icons[type] || <DollarOutlined />;
};

// Transaction type options for filter
const TRANSACTION_TYPE_OPTIONS = [
  { value: "EXPENSE", label: "Expense" },
  { value: "INCOME", label: "Income" },
  { value: "CLIENT_PAYMENT", label: "Client Payment" },
  { value: "SALARY_PAYMENT", label: "Salary Payment" },
  { value: "TRANSFER_IN", label: "Transfer In" },
  { value: "TRANSFER_OUT", label: "Transfer Out" },
];

const PaymentTypeLedgerReport = () => {
  // Add styles for opening balance row
  useEffect(() => {
    const styleId = 'payment-type-ledger-styles';
    if (!document.getElementById(styleId)) {
      const styleEl = document.createElement('style');
      styleEl.id = styleId;
      styleEl.textContent = `
        .ledger-opening-balance-row {
          background-color: #fffbe6 !important;
          font-weight: 600;
          border-left: 3px solid #faad14;
        }
        .ledger-opening-balance-row:hover td,
        .ledger-opening-balance-row td {
          background-color: #fffbe6 !important;
        }
      `;
      document.head.appendChild(styleEl);
    }
  }, []);

  // State for filters
  const [selectedPaymentType, setSelectedPaymentType] = useState(null);
  const [dateRange, setDateRange] = useState([
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);
  const [selectedTransactionTypes, setSelectedTransactionTypes] = useState([]);
  const [dateFilterType, setDateFilterType] = useState("monthly");
  const [selectedMonth, setSelectedMonth] = useState(dayjs());

  // Fetch payment types
  const { data: paymentTypesData, loading: paymentTypesLoading } = useQuery(
    GET_PAYMENT_TYPES_FOR_REPORT,
    { fetchPolicy: "cache-and-network" }
  );

  // Fetch ledger report
  const {
    data: reportData,
    loading: reportLoading,
    refetch: refetchReport,
  } = useQuery(GET_PAYMENT_TYPE_LEDGER_REPORT, {
    skip: !selectedPaymentType || !dateRange[0] || !dateRange[1],
    variables: {
      filter: {
        paymentTypeId: selectedPaymentType,
        dateFrom: dateRange[0]?.format("YYYY-MM-DD"),
        dateTo: dateRange[1]?.format("YYYY-MM-DD"),
        transactionTypes:
          selectedTransactionTypes.length > 0 ? selectedTransactionTypes : null,
      },
    },
    fetchPolicy: "network-only",
  });

  const paymentTypes = paymentTypesData?.paymentTypesForReport || [];
  const report = reportData?.paymentTypeLedgerReport;
  const transactions = report?.transactions || [];
  const summary = report?.summary;
  const typeBreakdown = report?.typeBreakdown || [];

  // Selected payment type details
  const selectedPaymentTypeData = useMemo(() => {
    return paymentTypes.find((pt) => pt.id === selectedPaymentType);
  }, [paymentTypes, selectedPaymentType]);

  // Handle date filter type change
  const handleDateFilterChange = (value) => {
    setDateFilterType(value);
    const today = dayjs();

    switch (value) {
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
      case "quarterly":
        setDateRange([today.startOf("quarter"), today.endOf("quarter")]);
        break;
      case "yearly":
        setDateRange([today.startOf("year"), today.endOf("year")]);
        break;
      case "custom":
        // Keep current range for custom
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

  // Quick date filters
  const setQuickFilter = (type) => {
    const today = dayjs();
    let start, end;

    switch (type) {
      case "today":
        start = today.startOf("day");
        end = today.endOf("day");
        break;
      case "week":
        start = today.startOf("week");
        end = today.endOf("week");
        break;
      case "month":
        start = today.startOf("month");
        end = today.endOf("month");
        break;
      case "lastMonth":
        start = today.subtract(1, "month").startOf("month");
        end = today.subtract(1, "month").endOf("month");
        break;
      case "quarter":
        start = today.startOf("quarter");
        end = today.endOf("quarter");
        break;
      case "fy":
        const fyStart = today.month() >= 3 ? today.year() : today.year() - 1;
        start = dayjs(`${fyStart}-04-01`);
        end = dayjs(`${fyStart + 1}-03-31`);
        break;
      default:
        start = today.startOf("month");
        end = today.endOf("month");
    }

    setDateRange([start, end]);
    setDateFilterType("custom");
  };

  // Table columns - Bank Statement Style
  const columns = [
    {
      title: "Date",
      dataIndex: "transactionDate",
      key: "transactionDate",
      width: 100,
      fixed: "left",
      render: (date, record) => (
        <Text style={{ fontSize: 11 }}>
          {record.isOpeningBalance ? "-" : dayjs(date).format("DD/MM/YYYY")}
        </Text>
      ),
    },
    {
      title: "Description / Particulars",
      dataIndex: "description",
      key: "description",
      width: 280,
      render: (desc, record) => (
        <div>
          <Text style={{ fontSize: 11, fontWeight: record.isOpeningBalance ? 600 : 400 }}>
            {record.particulars || desc}
          </Text>
        </div>
      ),
    },
    {
      title: "Narration",
      dataIndex: "referenceNumber",
      key: "referenceNumber",
      width: 150,
      render: (ref, record) => (
        <Text style={{ fontSize: 10 }}>
          {record.isOpeningBalance ? "-" : (ref || "-")}
        </Text>
      ),
    },
    {
      title: "Type",
      dataIndex: "transactionType",
      key: "transactionType",
      width: 120,
      filters: TRANSACTION_TYPE_OPTIONS.map((opt) => ({
        text: opt.label,
        value: opt.value,
      })),
      onFilter: (value, record) => record.transactionType === value,
      render: (type, record) => (
        record.isOpeningBalance ? (
          <Text style={{ fontSize: 10, fontWeight: 500 }}>Opening Bal.</Text>
        ) : (
          <Tag color={TRANSACTION_TYPE_COLORS[type]} style={{ fontSize: 10 }}>
            {TRANSACTION_TYPE_LABELS[type]}
          </Tag>
        )
      ),
    },
    {
      title: "Debit (Dr)",
      dataIndex: "debitAmount",
      key: "debitAmount",
      width: 120,
      align: "right",
      render: (amount) => (
        <Text
          style={{
            color: amount > 0 ? "#cf1322" : "inherit",
            fontSize: 11,
            fontWeight: amount > 0 ? 500 : 400,
          }}
        >
          {amount > 0 ? formatCurrency(amount) : "-"}
        </Text>
      ),
    },
    {
      title: "Credit (Cr)",
      dataIndex: "creditAmount",
      key: "creditAmount",
      width: 120,
      align: "right",
      render: (amount) => (
        <Text
          style={{
            color: amount > 0 ? "#389e0d" : "inherit",
            fontSize: 11,
            fontWeight: amount > 0 ? 500 : 400,
          }}
        >
          {amount > 0 ? formatCurrency(amount) : "-"}
        </Text>
      ),
    },
    {
      title: "Balance",
      dataIndex: "runningBalance",
      key: "runningBalance",
      width: 130,
      align: "right",
      fixed: "right",
      render: (balance) => (
        <Text
          strong
          style={{
            color: balance >= 0 ? "#1890ff" : "#cf1322",
            fontSize: 11,
          }}
        >
          {formatCurrency(Math.abs(balance))}
          {balance < 0 ? " (Dr)" : " (Cr)"}
        </Text>
      ),
    },
  ];

  // Export to Excel
  const handleExportExcel = () => {
    if (!transactions.length) {
      message.warning("No data to export");
      return;
    }

    const paymentTypeName = selectedPaymentTypeData?.name || "PaymentType";
    const dateFromStr = dateRange[0]?.format("DD-MMM-YYYY");
    const dateToStr = dateRange[1]?.format("DD-MMM-YYYY");

    // Prepare header rows
    const headerRows = [
      [COMPANY_DETAILS.name],
      [`Payment Type Ledger Statement`],
      [`Account: ${paymentTypeName} (${selectedPaymentTypeData?.type || ""})`],
      [`Period: ${dateFromStr} to ${dateToStr}`],
      [],
      [`Opening Balance: ${formatCurrency(summary?.openingBalance || 0)}`],
      [],
    ];

    // Prepare data rows - with opening balance row first
    const dataRows = [];
    
    // Add opening balance row if available
    if (summary?.openingBalance !== 0) {
      dataRows.push({
        Date: "-",
        Description: "Opening Balance",
        Narration: "-",
        Type: "Opening Bal.",
        "Debit (Dr)": "",
        "Credit (Cr)": "",
        Balance: summary?.openingBalance || 0,
      });
    }
    
    // Add transaction rows
    transactions.forEach((tx) => {
      dataRows.push({
        Date: dayjs(tx.transactionDate).format("DD/MM/YYYY"),
        Description: tx.description,
        Narration: tx.referenceNumber || "-",
        Type: TRANSACTION_TYPE_LABELS[tx.transactionType],
        "Debit (Dr)": tx.debitAmount > 0 ? tx.debitAmount : "",
        "Credit (Cr)": tx.creditAmount > 0 ? tx.creditAmount : "",
        Balance: tx.runningBalance,
      });
    });

    // Add summary rows
    const summaryRows = [
      {},
      {
        Date: "",
        Description: "TOTALS",
        Narration: "",
        Type: "",
        "Debit (Dr)": summary?.totalDebit || 0,
        "Credit (Cr)": summary?.totalCredit || 0,
        Balance: summary?.closingBalance || 0,
      },
      {
        Date: "",
        Description: `Closing Balance: ${formatCurrency(summary?.closingBalance || 0)}`,
        Narration: "",
        Type: "",
        "Debit (Dr)": "",
        "Credit (Cr)": "",
        Balance: "",
      },
    ];

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Create main sheet with header and data
    const ws = XLSX.utils.aoa_to_sheet(headerRows);
    XLSX.utils.sheet_add_json(ws, [...dataRows, ...summaryRows], {
      origin: -1,
      skipHeader: false,
    });

    // Set column widths
    ws["!cols"] = [
      { wch: 12 }, // Date
      { wch: 45 }, // Description
      { wch: 18 }, // Narration
      { wch: 15 }, // Type
      { wch: 15 }, // Debit
      { wch: 15 }, // Credit
      { wch: 15 }, // Balance
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Ledger Statement");

    // Add breakdown sheet
    if (typeBreakdown.length > 0) {
      const breakdownData = typeBreakdown.map((b) => ({
        "Transaction Type": TRANSACTION_TYPE_LABELS[b.transactionType],
        Count: b.count,
        "Total Debit": b.totalDebit,
        "Total Credit": b.totalCredit,
        Net: b.totalCredit - b.totalDebit,
      }));
      const wsBreakdown = XLSX.utils.json_to_sheet(breakdownData);
      XLSX.utils.book_append_sheet(wb, wsBreakdown, "Type Breakdown");
    }

    const fileName = `${paymentTypeName}_Ledger_${dateFromStr}_to_${dateToStr}.xlsx`;
    XLSX.writeFile(wb, fileName);
    message.success("Excel file downloaded successfully");
  };

  // Export to PDF - Bank Statement Style
  const handleExportPDF = async () => {
    if (!transactions.length) {
      message.warning("No data to export");
      return;
    }

    const hideLoading = message.loading("Generating PDF...", 0);

    try {
      const doc = new jsPDF({ orientation: "landscape" });

      // Try to load custom fonts dynamically
      let fontLoaded = false;
      try {
        const fontModule = await import("../../fonts/Noto_Sans/NotoSans.base64.js");
        const boldFontModule = await import("../../fonts/Noto_Sans/NotoSans-bold.js");
        if (fontModule.font && boldFontModule.boldFont) {
          doc.addFileToVFS("NotoSans-Regular.ttf", fontModule.font);
          doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
          doc.addFileToVFS("NotoSans-Bold.ttf", boldFontModule.boldFont);
          doc.addFont("NotoSans-Bold.ttf", "NotoSans", "bold");
          doc.setFont("NotoSans");
          fontLoaded = true;
        }
      } catch (e) {
        console.log("Custom fonts not available, using default fonts");
      }

      const pageWidth = doc.internal.pageSize.getWidth();
      const paymentTypeName = selectedPaymentTypeData?.name || "Payment Type";

      let yPos = 15;

      // Header
      doc.setFontSize(16);
      doc.setFont(fontLoaded ? "NotoSans" : "helvetica", "bold");
      doc.text(COMPANY_DETAILS.name, pageWidth / 2, yPos, { align: "center" });

      yPos += 8;
      doc.setFontSize(12);
      doc.text("PAYMENT TYPE LEDGER STATEMENT", pageWidth / 2, yPos, {
        align: "center",
      });

      yPos += 10;
      doc.setFontSize(10);
      doc.setFont(fontLoaded ? "NotoSans" : "helvetica", "normal");

      // Account details
      doc.text(
        `Account: ${paymentTypeName} (${selectedPaymentTypeData?.type || ""})`,
        14,
        yPos
      );
      doc.text(
        `Period: ${dateRange[0]?.format("DD MMM YYYY")} to ${dateRange[1]?.format("DD MMM YYYY")}`,
        pageWidth - 14,
        yPos,
        { align: "right" }
      );

      if (selectedPaymentTypeData?.accountNumber) {
        yPos += 5;
        doc.text(`Account No: ${selectedPaymentTypeData.accountNumber}`, 14, yPos);
      }
      if (selectedPaymentTypeData?.bankName) {
        doc.text(
          `Bank: ${selectedPaymentTypeData.bankName}`,
          pageWidth - 14,
          yPos,
          { align: "right" }
        );
      }

      yPos += 8;
      doc.setFont(fontLoaded ? "NotoSans" : "helvetica", "bold");
      doc.text(
        `Opening Balance: ${formatCurrency(summary?.openingBalance || 0)}`,
        14,
        yPos
      );

      yPos += 5;

      // Table data - with opening balance row
      const tableData = [];
      
      // Add opening balance row if available
      if (summary?.openingBalance !== 0) {
        tableData.push([
          "-",
          "Opening Balance",
          "-",
          "Opening Bal.",
          "-",
          "-",
          `${formatCurrencyNoDecimal(Math.abs(summary?.openingBalance || 0))}${(summary?.openingBalance || 0) < 0 ? " Dr" : " Cr"}`,
        ]);
      }
      
      // Add transaction rows
      transactions.forEach((tx) => {
        tableData.push([
          dayjs(tx.transactionDate).format("DD/MM/YY"),
          tx.description.substring(0, 40) + (tx.description.length > 40 ? "..." : ""),
          tx.referenceNumber || "-",
          TRANSACTION_TYPE_LABELS[tx.transactionType],
          tx.debitAmount > 0 ? formatCurrencyNoDecimal(tx.debitAmount) : "-",
          tx.creditAmount > 0 ? formatCurrencyNoDecimal(tx.creditAmount) : "-",
          `${formatCurrencyNoDecimal(Math.abs(tx.runningBalance))}${tx.runningBalance < 0 ? " Dr" : " Cr"}`,
        ]);
      });

      // Add totals row
      tableData.push([
        "",
        "",
        "",
        "TOTALS",
        formatCurrencyNoDecimal(summary?.totalDebit || 0),
        formatCurrencyNoDecimal(summary?.totalCredit || 0),
        `${formatCurrencyNoDecimal(Math.abs(summary?.closingBalance || 0))}${(summary?.closingBalance || 0) < 0 ? " Dr" : " Cr"}`,
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [
          [
            "Date",
            "Description",
            "Narration",
            "Type",
            "Debit (Dr)",
            "Credit (Cr)",
            "Balance",
          ],
        ],
        body: tableData,
        theme: "striped",
        styles: {
          fontSize: 8,
          font: fontLoaded ? "NotoSans" : "helvetica",
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [102, 126, 234],
          textColor: 255,
          fontStyle: "bold",
        },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: "auto" },
          2: { cellWidth: 30 },
          3: { cellWidth: 28 },
          4: { cellWidth: 28, halign: "right" },
          5: { cellWidth: 28, halign: "right" },
          6: { cellWidth: 32, halign: "right" },
        },
        didParseCell: function (data) {
          // Highlight opening balance row
          if (summary?.openingBalance !== 0 && data.row.index === 0) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [255, 251, 230];
          }
          // Highlight totals row
          if (data.row.index === tableData.length - 1) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [230, 247, 255];
          }
          // Color debit column
          if (data.column.index === 4 && data.cell.text[0] !== "-" && data.cell.text[0] !== "") {
            data.cell.styles.textColor = [207, 19, 34];
          }
          // Color credit column
          if (data.column.index === 5 && data.cell.text[0] !== "-" && data.cell.text[0] !== "") {
            data.cell.styles.textColor = [56, 158, 13];
          }
        },
      });

      // Footer
      const finalY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(10);
      doc.setFont(fontLoaded ? "NotoSans" : "helvetica", "bold");
      doc.text(
        `Closing Balance: ${formatCurrency(summary?.closingBalance || 0)}`,
        14,
        finalY
      );

      doc.setFont(fontLoaded ? "NotoSans" : "helvetica", "normal");
      doc.setFontSize(8);
      doc.text(
        `Generated on: ${dayjs().format("DD MMM YYYY HH:mm")}`,
        pageWidth - 14,
        finalY,
        { align: "right" }
      );

      // Save PDF
      const fileName = `${paymentTypeName}_Ledger_${dateRange[0]?.format("DD-MMM-YYYY")}_to_${dateRange[1]?.format("DD-MMM-YYYY")}.pdf`;
      doc.save(fileName);
      message.success("PDF downloaded successfully");
    } catch (error) {
      console.error("PDF generation error:", error);
      message.error("Failed to generate PDF");
    } finally {
      hideLoading();
    }
  };

  // Export dropdown menu
  const exportMenu = {
    items: [
      {
        key: "excel",
        icon: <FileExcelOutlined />,
        label: "Export to Excel (CSV)",
        onClick: handleExportExcel,
      },
      {
        key: "pdf",
        icon: <FilePdfOutlined />,
        label: "Export to PDF",
        onClick: handleExportPDF,
      },
    ],
  };

  // Prepare table data with opening balance row
  const tableDataWithOpening = useMemo(() => {
    if (!summary || summary.openingBalance === 0) return transactions;
    
    const openingRow = {
      id: 'opening-balance',
      isOpeningBalance: true,
      transactionDate: dateRange[0]?.toISOString(),
      description: 'Opening Balance',
      particulars: 'Opening Balance',
      referenceNumber: null,
      transactionType: 'OPENING_BALANCE',
      debitAmount: 0,
      creditAmount: 0,
      runningBalance: summary.openingBalance,
    };
    
    return [openingRow, ...transactions];
  }, [transactions, summary, dateRange]);

  return (
    <div style={{ padding: "16px" }}>
      {/* Compact Header Row */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
        <Col>
          <Space>
            <BankOutlined style={{ fontSize: 20, color: "#1890ff" }} />
            <Title level={4} style={{ margin: 0 }}>Payment Type Ledger Report</Title>
          </Space>
        </Col>
        <Col>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => refetchReport()}
              loading={reportLoading}
              size="small"
            >
              Refresh
            </Button>
            <Dropdown menu={exportMenu} disabled={!transactions.length}>
              <Button type="primary" icon={<DownloadOutlined />} size="small">
                Export
              </Button>
            </Dropdown>
          </Space>
        </Col>
      </Row>

      {/* Filters Card */}
      <Card className="card-shadow" style={{ marginBottom: "16px" }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={6}>
            <Text strong style={{ display: "block", marginBottom: 4 }}>
              Payment Type
            </Text>
            <Select
              placeholder="Select Payment Type"
              style={{ width: "100%" }}
              value={selectedPaymentType}
              onChange={setSelectedPaymentType}
              loading={paymentTypesLoading}
              showSearch
              optionFilterProp="children"
            >
              {paymentTypes.map((pt) => (
                <Option key={pt.id} value={pt.id}>
                  <Space>
                    {getPaymentTypeIcon(pt.type)}
                    {pt.name}
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      ({pt.type})
                    </Text>
                  </Space>
                </Option>
              ))}
            </Select>
          </Col>

          <Col xs={24} md={4}>
            <Text strong style={{ display: "block", marginBottom: 4 }}>
              Period Type
            </Text>
            <Select
              style={{ width: "100%" }}
              value={dateFilterType}
              onChange={handleDateFilterChange}
            >
              <Option value="monthly">Monthly</Option>
              <Option value="quarterly">Quarterly</Option>
              <Option value="fy">Financial Year</Option>
              <Option value="yearly">Calendar Year</Option>
              <Option value="custom">Custom Range</Option>
            </Select>
          </Col>

          {dateFilterType === "monthly" && (
            <Col xs={24} md={4}>
              <Text strong style={{ display: "block", marginBottom: 4 }}>
                Select Month
              </Text>
              <DatePicker
                picker="month"
                value={selectedMonth}
                onChange={handleMonthChange}
                style={{ width: "100%" }}
                format="MMM YYYY"
              />
            </Col>
          )}

          {dateFilterType === "custom" && (
            <Col xs={24} md={6}>
              <Text strong style={{ display: "block", marginBottom: 4 }}>
                Date Range
              </Text>
              <RangePicker
                value={dateRange}
                onChange={setDateRange}
                style={{ width: "100%" }}
                format="DD/MM/YYYY"
              />
            </Col>
          )}

          <Col xs={24} md={6}>
            <Text strong style={{ display: "block", marginBottom: 4 }}>
              Transaction Types
            </Text>
            <Select
              mode="multiple"
              placeholder="All Types"
              style={{ width: "100%" }}
              value={selectedTransactionTypes}
              onChange={setSelectedTransactionTypes}
              maxTagCount={2}
              allowClear
            >
              {TRANSACTION_TYPE_OPTIONS.map((opt) => (
                <Option key={opt.value} value={opt.value}>
                  <Tag color={TRANSACTION_TYPE_COLORS[opt.value]}>
                    {opt.label}
                  </Tag>
                </Option>
              ))}
            </Select>
          </Col>
        </Row>

        <Divider style={{ margin: "12px 0" }} />

        {/* Quick Filters */}
        <Space wrap>
          <Text type="secondary">Quick Filters:</Text>
          <Button size="small" onClick={() => setQuickFilter("today")}>
            Today
          </Button>
          <Button size="small" onClick={() => setQuickFilter("week")}>
            This Week
          </Button>
          <Button size="small" onClick={() => setQuickFilter("month")}>
            This Month
          </Button>
          <Button size="small" onClick={() => setQuickFilter("lastMonth")}>
            Last Month
          </Button>
          <Button size="small" onClick={() => setQuickFilter("quarter")}>
            This Quarter
          </Button>
          <Button size="small" onClick={() => setQuickFilter("fy")}>
            This FY
          </Button>
        </Space>
      </Card>

      {/* Report Content */}
      {!selectedPaymentType ? (
        <Card>
          <Empty
            description="Please select a payment type to view the ledger statement"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </Card>
      ) : reportLoading ? (
        <Card>
          <div style={{ textAlign: "center", padding: "50px 0" }}>
            <Spin size="large" tip="Loading ledger statement..." />
          </div>
        </Card>
      ) : report ? (
        <>
          {/* Summary Cards + Type Breakdown - Compact Style like LedgerReport */}
          <Row gutter={4} style={{ marginBottom: 8 }}>
            <Col span={4}>
              <Card size="small" bodyStyle={{ padding: '6px 10px' }}>
                <div style={{ fontSize: 10, color: '#999', marginBottom: 1 }}>
                  Opening {(summary?.openingBalance || 0) > 0 ? "(CR)" : (summary?.openingBalance || 0) < 0 ? "(DR)" : ""}
                </div>
                <div style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: (summary?.openingBalance || 0) > 0 ? "#52c41a" : (summary?.openingBalance || 0) < 0 ? "#f5222d" : "#1890ff"
                }}>
                  {formatCurrencyNoDecimal(Math.abs(summary?.openingBalance || 0))}
                </div>
              </Card>
            </Col>
            <Col span={4}>
              <Card size="small" bodyStyle={{ padding: '6px 10px' }}>
                <div style={{ fontSize: 10, color: '#999', marginBottom: 1 }}>Total Debit</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#ff4d4f" }}>
                  {formatCurrencyNoDecimal(summary?.totalDebit || 0)}
                </div>
              </Card>
            </Col>
            <Col span={4}>
              <Card size="small" bodyStyle={{ padding: '6px 10px' }}>
                <div style={{ fontSize: 10, color: '#999', marginBottom: 1 }}>Total Credit</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#52c41a" }}>
                  {formatCurrencyNoDecimal(summary?.totalCredit || 0)}
                </div>
              </Card>
            </Col>
            <Col span={4}>
              <Card size="small" bodyStyle={{ padding: '6px 10px' }}>
                <div style={{ fontSize: 10, color: '#999', marginBottom: 1 }}>
                  Closing {(summary?.closingBalance || 0) > 0 ? "(CR)" : (summary?.closingBalance || 0) < 0 ? "(DR)" : ""}
                </div>
                <div style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: (summary?.closingBalance || 0) > 0 ? "#52c41a" : (summary?.closingBalance || 0) < 0 ? "#f5222d" : "#1890ff"
                }}>
                  {formatCurrencyNoDecimal(Math.abs(summary?.closingBalance || 0))}
                </div>
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small" bodyStyle={{ padding: '6px 10px' }}>
                <div style={{ fontSize: 10, color: '#999', marginBottom: 4 }}>Transaction Breakdown</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                  {typeBreakdown.map((b) => (
                    <div
                      key={b.transactionType}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        padding: '4px 6px',
                        background: '#fff',
                        borderRadius: 4,
                        border: '1px solid #e8e8e8',
                        minWidth: 80,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Tag
                          color={TRANSACTION_TYPE_COLORS[b.transactionType]}
                          style={{ margin: 0, fontSize: 9, padding: '0 4px', lineHeight: '14px' }}
                        >
                          {TRANSACTION_TYPE_LABELS[b.transactionType]}
                        </Tag>
                        <Text strong style={{ fontSize: 11 }}>×{b.count}</Text>
                      </div>
                      <div style={{ display: 'flex', gap: 6, fontSize: 9 }}>
                        {b.totalDebit > 0 && (
                          <span style={{ color: '#ff4d4f' }}>
                            Dr: {formatCurrencyNoDecimal(b.totalDebit)}
                          </span>
                        )}
                        {b.totalCredit > 0 && (
                          <span style={{ color: '#52c41a' }}>
                            Cr: {formatCurrencyNoDecimal(b.totalCredit)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {typeBreakdown.length === 0 && (
                    <Text type="secondary" style={{ fontSize: 10 }}>No transactions</Text>
                  )}
                </div>
              </Card>
            </Col>
          </Row>

          {/* Account Info Header */}
          <Card
            size="small"
            style={{
              marginBottom: 0,
              borderBottom: "none",
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
              background: "#f6f8ff",
            }}
          >
            <Row justify="space-between" align="middle">
              <Col>
                <Space>
                  {getPaymentTypeIcon(selectedPaymentTypeData?.type)}
                  <div>
                    <Text strong style={{ fontSize: 14 }}>
                      {selectedPaymentTypeData?.name}
                    </Text>
                    {selectedPaymentTypeData?.accountNumber && (
                      <Text
                        type="secondary"
                        style={{ marginLeft: 8, fontSize: 12 }}
                      >
                        A/C: {selectedPaymentTypeData.accountNumber}
                      </Text>
                    )}
                    {selectedPaymentTypeData?.bankName && (
                      <Text
                        type="secondary"
                        style={{ marginLeft: 8, fontSize: 12 }}
                      >
                        Bank: {selectedPaymentTypeData.bankName}
                      </Text>
                    )}
                  </div>
                </Space>
              </Col>
              <Col>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Statement Period: {dateRange[0]?.format("DD MMM YYYY")} to{" "}
                  {dateRange[1]?.format("DD MMM YYYY")}
                </Text>
                <Text style={{ marginLeft: 16, fontWeight: 500 }}>
                  {summary?.transactionCount || 0} transactions
                </Text>
              </Col>
            </Row>
          </Card>

          {/* Transactions Table */}
          <Card
            size="small"
            style={{
              borderTop: "none",
              borderTopLeftRadius: 0,
              borderTopRightRadius: 0,
            }}
          >
            <Table
              dataSource={tableDataWithOpening}
              columns={columns}
              rowKey="id"
              size="small"
              pagination={{
                pageSize: 50,
                showSizeChanger: true,
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} of ${total} transactions`,
              }}
              scroll={{ x: 1000 }}
              rowClassName={(record) => record.isOpeningBalance ? 'ledger-opening-balance-row' : ''}
              summary={() => (
                <Table.Summary fixed>
                  <Table.Summary.Row
                    style={{ background: "#e6f7ff", fontWeight: "bold" }}
                  >
                    <Table.Summary.Cell index={0} colSpan={4}>
                      <Text strong>TOTALS</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={4} align="right">
                      <Text type="danger" strong>
                        {formatCurrency(summary?.totalDebit || 0)}
                      </Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={5} align="right">
                      <Text type="success" strong>
                        {formatCurrency(summary?.totalCredit || 0)}
                      </Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={6} align="right">
                      <Text
                        strong
                        style={{
                          color:
                            (summary?.closingBalance || 0) >= 0
                              ? "#1890ff"
                              : "#cf1322",
                        }}
                      >
                        {formatCurrency(Math.abs(summary?.closingBalance || 0))}
                        {(summary?.closingBalance || 0) < 0 ? " (Dr)" : " (Cr)"}
                      </Text>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </Card>
        </>
      ) : (
        <Card>
          <Alert
            message="No Data"
            description="No transactions found for the selected filters. Try adjusting the date range or transaction types."
            type="info"
            showIcon
          />
        </Card>
      )}
    </div>
  );
};

export default PaymentTypeLedgerReport;
