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
  Empty,
  Tag,
  Dropdown,
} from "antd";
import {
  FilterOutlined,
  ReloadOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  WhatsAppOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import { useQuery } from "@apollo/client";
import dayjs from "dayjs";
import { GET_CLIENTS } from "../../graphql/clientQueries";
import { GET_CLIENT_LEDGER_RANGE } from "../../gql/clientLedger";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { font } from "../../fonts/Noto_Sans/NotoSans.base64.js";
import { boldFont } from "../../fonts/Noto_Sans/NotoSans-bold.js";

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount || 0);

const LedgerReport = () => {
  // State for filters
  const [selectedClient, setSelectedClient] = useState(null);
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
  const [showLedger, setShowLedger] = useState(false);

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

  // Fetch clients
  const { data: clientsData, loading: clientsLoading } = useQuery(GET_CLIENTS, {
    variables: {
      filters: { isActive: true },
      page: 1,
      limit: 1000,
      sortBy: "displayName",
      sortOrder: "ASC",
    },
    fetchPolicy: "cache-and-network",
  });

  // Fetch ledger data only when Show Ledger is clicked
  const {
    data: ledgerData,
    loading: ledgerLoading,
    refetch: refetchLedger,
  } = useQuery(GET_CLIENT_LEDGER_RANGE, {
    variables: {
      clientId: selectedClient,
      dateFrom: dateRange ? dateRange[0].format("YYYY-MM-DD") : null,
      dateTo: dateRange ? dateRange[1].format("YYYY-MM-DD") : null,
      pagination: { page: 1, limit: 10000 },
    },
    skip: !selectedClient || !showLedger,
    fetchPolicy: "network-only",
  });

  // Handle date filter type change
  const handleDateFilterChange = (value) => {
    setDateFilterType(value);
    const today = dayjs();

    switch (value) {
      case "monthly":
        // Use selected month or current month
        const monthToUse = selectedMonth || today;
        setDateRange([monthToUse.startOf("month"), monthToUse.endOf("month")]);
        break;
      case "fy":
        // Financial Year: April to March
        const fyStart = today.month() >= 3 ? today.year() : today.year() - 1;
        setDateRange([
          dayjs(`${fyStart}-04-01`),
          dayjs(`${fyStart + 1}-03-31`),
        ]);
        break;
      case "yearly":
        // Use selected year or current year
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
    setShowLedger(false); // Hide ledger when month changes
    if (dateFilterType === "monthly" && date) {
      setDateRange([date.startOf("month"), date.endOf("month")]);
    }
  };

  // Handle year change
  const handleYearChange = (date) => {
    setSelectedYear(date);
    setShowLedger(false); // Hide ledger when year changes
    if (dateFilterType === "yearly" && date) {
      setDateRange([date.startOf("year"), date.endOf("year")]);
    }
  };

  // Handle custom date range change
  const handleCustomDateChange = (dates) => {
    setCustomDateRange(dates);
    setShowLedger(false); // Hide ledger when custom date changes
    if (dateFilterType === "custom") {
      setDateRange(dates);
    }
  };

  // Handle Show Ledger button
  const handleShowLedger = () => {
    if (!selectedClient) {
      message.warning("Please select a client");
      return;
    }
    if (!dateRange || !dateRange[0] || !dateRange[1]) {
      message.warning("Please select a date range");
      return;
    }
    setShowLedger(true);
  };

  // Reset filters
  const handleReset = () => {
    const today = dayjs();
    setSelectedClient(null);
    setDateFilterType("monthly");
    setDateRange([today.startOf("month"), today.endOf("month")]);
    setCustomDateRange([today.startOf("month"), today.endOf("month")]);
    setSelectedMonth(today);
    setSelectedYear(today);
    setShowLedger(false);
  };

  // Prepare ledger data for table
  const prepareLedgerData = () => {
    if (!ledgerData?.clientLedgerRange) return [];

    const range = ledgerData.clientLedgerRange;
    const opening = Number(range.openingBalance ?? 0);
    const txs = (range.transactions || []).slice();

    // Transactions are already sorted by backend, but ensure they're in order
    txs.sort(
      (a, b) => new Date(a.transactionDate) - new Date(b.transactionDate)
    );

    // Calculate running balance starting from opening balance
    let running = opening;
    return txs.map((t) => {
      const debit = Number(t.debitAmount || 0);
      const credit = Number(t.creditAmount || 0);
      running = running + credit - debit;
      return { ...t, debit, credit, runningBalance: running };
    });
  };

  const ledgerTableData = prepareLedgerData();

  // Use backend-calculated opening and closing balances directly
  const opening = Number(ledgerData?.clientLedgerRange?.openingBalance ?? 0);
  const closing = Number(
    ledgerData?.clientLedgerRange?.closingBalance ?? opening
  );

  // Prepare table data with opening and closing balance rows
  const tableDataWithBalances = () => {
    if (!showLedger || ledgerTableData.length === 0) return ledgerTableData;

    // Create opening balance row
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

    // Create closing balance row
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

    return [openingRow, ...ledgerTableData, closingRow];
  };

  // Get selected client details
  const selectedClientData = clientsData?.clients?.find(
    (c) => c.id === selectedClient
  );

  // Export to Excel
  const handleExportExcel = () => {
    if (!ledgerTableData.length) {
      message.warning("No data to export");
      return;
    }

    // Prepare Excel data with header information (similar to HMS-FE)
    const excelData = [
      ["MicroArt - Client Ledger Report"],
      [
        `Client: ${selectedClientData?.displayName || "N/A"} (${
          selectedClientData?.clientCode || "N/A"
        })`,
      ],
      [
        `Period: ${dateRange[0].format("DD MMM YYYY")} to ${dateRange[1].format(
          "DD MMM YYYY"
        )}`,
      ],
      [`Generated on: ${dayjs().format("DD MMM YYYY, HH:mm")}`],
      [],
      ["OPENING BALANCE"],
      ["Opening Balance", opening],
      [],
      ["LEDGER TRANSACTIONS"],
      [
        "Order Date",
        "Invoice Date",
        "Work Days",
        "Invoice No.",
        "Particulars",
        "Details",
        "Debit",
        "Credit",
        "Running Balance",
      ],
    ];

    // Add transaction data
    ledgerTableData.forEach((row) => {
      const project = row.invoice?.project;
      let detailsText = row.description || "-";
      
      // Calculate work days
      let workDays = "-";
      if (project?.createdAt && row.invoice?.invoiceDate) {
        const days = dayjs(row.invoice.invoiceDate).diff(
          dayjs(project.createdAt),
          "day"
        );
        workDays = `${days}d`;
      }
      
      // Format project gradings details same as table with new lines for Excel
      if (project?.projectGradings?.length > 0) {
        const lines = project.projectGradings.map((pg) => {
          const qty = pg.imageQuantity || 0;
          const rate = pg.customRate || pg.grading?.defaultRate || 0;
          const total = qty * rate;
          return `${pg.grading?.name || pg.grading?.shortCode} (qty) ${qty} × ₹${rate.toFixed(2)} = ₹${total.toFixed(2)}`;
        });
        detailsText = lines.join("\n"); // Use newline for Excel
      }
      
      excelData.push([
        row.invoice?.project?.createdAt
          ? dayjs(row.invoice.project.createdAt).format("DD/MM/YYYY")
          : "-",
        row.invoice?.invoiceDate
          ? dayjs(row.invoice.invoiceDate).format("DD/MM/YYYY")
          : "-",
        workDays,
        row.invoice?.invoiceNumber || "-",
        row.invoice?.project?.projectCode || row.description || "-",
        detailsText,
        row.debit > 0 ? row.debit : "",
        row.credit > 0 ? row.credit : "",
        row.runningBalance,
      ]);
    });

    // Add closing balance section
    excelData.push([]);
    excelData.push(["CLOSING BALANCE"]);
    excelData.push(["Closing Balance", closing]);

    const ws = XLSX.utils.aoa_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Client Ledger");

    const fileName = `${
      selectedClientData?.displayName || "Client"
    }_Ledger_${dateRange[0].format("DD-MMM-YYYY")}_to_${dateRange[1].format(
      "DD-MMM-YYYY"
    )}.xlsx`;
    XLSX.writeFile(wb, fileName);
    message.success("Excel file downloaded successfully");
  };

  // Export to PDF
  const handleExportPDF = () => {
    if (!ledgerTableData.length) {
      message.warning("No data to export");
      return;
    }

    const doc = new jsPDF({ orientation: "landscape" });

    // Add Noto Sans fonts for proper rupee symbol rendering
    doc.addFileToVFS("NotoSans-Regular.ttf", font);
    doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
    doc.addFileToVFS("NotoSans-Bold.ttf", boldFont);
    doc.addFont("NotoSans-Bold.ttf", "NotoSans", "bold");

    const pageWidth = doc.internal.pageSize.width;

    // Add header - Client Ledger Report centered
    doc.setFontSize(16);
    doc.setFont("NotoSans", "bold");
    doc.setTextColor(40);
    doc.text("Client Ledger Report", pageWidth / 2, 15, { align: "center" });

    // Period on next line, centered
    doc.setFontSize(10);
    doc.setFont("NotoSans", "normal");
    doc.setTextColor(100);
    doc.text(
      `Period: ${dateRange[0].format("DD MMM YYYY")} to ${dateRange[1].format(
        "DD MMM YYYY"
      )}`,
      pageWidth / 2,
      22,
      { align: "center" }
    );

    // Next line: MicroArt on left, Client Info on right
    doc.setFontSize(12);
    doc.setFont("NotoSans", "bold");
    doc.setTextColor(40);
    doc.text("MicroArt", 14, 30);
    
    doc.setFontSize(10);
    doc.setFont("NotoSans", "normal");
    doc.text(
      `Client: ${selectedClientData?.displayName || "N/A"} (${
        selectedClientData?.clientCode || "N/A"
      })`,
      pageWidth - 14,
      30,
      { align: "right" }
    );

    doc.setFontSize(10);
    doc.setFont("NotoSans", "bold");
    doc.setTextColor(40);
    doc.text(`Opening Balance: ${formatCurrency(opening)}`, 14, 38);

    // Prepare table data
    const tableData = ledgerTableData.map((row) => {
      const project = row.invoice?.project;
      let detailsText = row.description || "-";
      let particularsText = row.description || "-";

      // Calculate work days
      let workDays = "-";
      if (project?.createdAt && row.invoice?.invoiceDate) {
        const days = dayjs(row.invoice.invoiceDate).diff(
          dayjs(project.createdAt),
          "day"
        );
        workDays = `${days}d`;
      }

      // Format project code with project name
      if (project?.projectCode) {
        particularsText = project.projectCode;
        if (project.name) {
          particularsText += ` - ${project.name}`;
        }
      }

      // Format project gradings details same as table with new lines for PDF
      if (project?.projectGradings?.length > 0) {
        const lines = project.projectGradings.map((pg) => {
          const qty = pg.imageQuantity || 0;
          const rate = pg.customRate || pg.grading?.defaultRate || 0;
          const total = qty * rate;
          return `${pg.grading?.name || pg.grading?.shortCode} (qty) ${qty} × ₹${rate.toFixed(
            2
          )} = ₹${total.toFixed(2)}`;
        });
        detailsText = lines.join("\n"); // Use newline for PDF
      }

      return [
        row.invoice?.project?.createdAt
          ? dayjs(row.invoice.project.createdAt).format("DD/MM/YY")
          : "-",
        row.invoice?.invoiceDate
          ? dayjs(row.invoice.invoiceDate).format("DD/MM/YY")
          : "-",
        workDays,
        row.invoice?.invoiceNumber || "-",
        particularsText,
        detailsText,
        row.debit > 0 ? formatCurrency(row.debit) : "",
        row.credit > 0 ? formatCurrency(row.credit) : "",
        formatCurrency(row.runningBalance),
      ];
    });

    // Add table
    autoTable(doc, {
      startY: 44,
      head: [
        [
          "Order Date",
          "Inv. Date",
          "Work Days",
          "Inv. No.",
          "Particulars",
          "Details",
          "Debit",
          "Credit",
          "Balance",
        ],
      ],
      body: tableData,
      styles: { fontSize: 7, font: "NotoSans" },
      headStyles: {
        fillColor: [22, 160, 133],
        fontStyle: "bold",
        font: "NotoSans",
      },
      margin: { left: 14, right: 14 },
      columnStyles: {
        2: { cellWidth: 20, halign: "center" },
        5: { cellWidth: 75 },
      },
    });

    // Add closing balance
    const finalY = doc.lastAutoTable.finalY;
    doc.setFontSize(10);
    doc.setFont("NotoSans", "bold");
    doc.setTextColor(40);
    doc.text(`Closing Balance: ${formatCurrency(closing)}`, 14, finalY + 10);

    // Add footer with Generated on
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setFont("NotoSans", "normal");
    doc.setTextColor(100);
    doc.text(
      `Generated on: ${dayjs().format("DD MMM YYYY, HH:mm")}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );

    const fileName = `${
      selectedClientData?.displayName || "Client"
    }_Ledger_${dateRange[0].format("DD-MMM-YYYY")}_to_${dateRange[1].format(
      "DD-MMM-YYYY"
    )}.pdf`;
    doc.save(fileName);
    message.success("PDF file downloaded successfully");
  };

  // Share on WhatsApp
  const handleWhatsAppShare = async () => {
    if (!selectedClientData) {
      message.warning("Please select a client");
      return;
    }

    if (!ledgerTableData.length) {
      message.warning("No data to export");
      return;
    }

    try {
      const doc = new jsPDF({ orientation: "landscape" });

      // Add Noto Sans fonts for proper rupee symbol rendering
      doc.addFileToVFS("NotoSans-Regular.ttf", font);
      doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
      doc.addFileToVFS("NotoSans-Bold.ttf", boldFont);
      doc.addFont("NotoSans-Bold.ttf", "NotoSans", "bold");

      const pageWidth = doc.internal.pageSize.width;

      // Add header - Client Ledger Report centered
      doc.setFontSize(16);
      doc.setFont("NotoSans", "bold");
      doc.setTextColor(40);
      doc.text("Client Ledger Report", pageWidth / 2, 15, { align: "center" });

      // Period on next line, centered
      doc.setFontSize(10);
      doc.setFont("NotoSans", "normal");
      doc.setTextColor(100);
      doc.text(
        `Period: ${dateRange[0].format("DD MMM YYYY")} to ${dateRange[1].format(
          "DD MMM YYYY"
        )}`,
        pageWidth / 2,
        22,
        { align: "center" }
      );

      // Next line: MicroArt on left, Client Info on right
      doc.setFontSize(12);
      doc.setFont("NotoSans", "bold");
      doc.setTextColor(40);
      doc.text("MicroArt", 14, 30);

      doc.setFontSize(10);
      doc.setFont("NotoSans", "normal");
      doc.text(
        `Client: ${selectedClientData?.displayName || "N/A"} (${
          selectedClientData?.clientCode || "N/A"
        })`,
        pageWidth - 14,
        30,
        { align: "right" }
      );

      doc.setFontSize(10);
      doc.setFont("NotoSans", "bold");
      doc.setTextColor(40);
      doc.text(`Opening Balance: ${formatCurrency(opening)}`, 14, 38);

      // Prepare table data
      const tableData = ledgerTableData.map((row) => {
        const project = row.invoice?.project;
        let detailsText = row.description || "-";
        let particularsText = row.description || "-";

        // Calculate work days
        let workDays = "-";
        if (project?.createdAt && row.invoice?.invoiceDate) {
          const days = dayjs(row.invoice.invoiceDate).diff(
            dayjs(project.createdAt),
            "day"
          );
          workDays = `${days}d`;
        }

        // Format project code with project name
        if (project?.projectCode) {
          particularsText = project.projectCode;
          if (project.name) {
            particularsText += ` - ${project.name}`;
          }
        }

        // Format project gradings details
        if (project?.projectGradings?.length > 0) {
          const lines = project.projectGradings.map((pg) => {
            const qty = pg.imageQuantity || 0;
            const rate = pg.customRate || pg.grading?.defaultRate || 0;
            const total = qty * rate;
            return `${pg.grading?.name || pg.grading?.shortCode} (qty) ${qty} × ₹${rate.toFixed(
              2
            )} = ₹${total.toFixed(2)}`;
          });
          detailsText = lines.join("\n");
        }

        return [
          row.invoice?.project?.createdAt
            ? dayjs(row.invoice.project.createdAt).format("DD/MM/YY")
            : "-",
          row.invoice?.invoiceDate
            ? dayjs(row.invoice.invoiceDate).format("DD/MM/YY")
            : "-",
          workDays,
          row.invoice?.invoiceNumber || "-",
          particularsText,
          detailsText,
          row.debit > 0 ? formatCurrency(row.debit) : "",
          row.credit > 0 ? formatCurrency(row.credit) : "",
          formatCurrency(row.runningBalance),
        ];
      });

      // Add table
      autoTable(doc, {
        startY: 44,
        head: [
          [
            "Order Date",
            "Inv. Date",
            "Work Days",
            "Inv. No.",
            "Particulars",
            "Details",
            "Debit",
            "Credit",
            "Balance",
          ],
        ],
        body: tableData,
        styles: { fontSize: 7, font: "NotoSans" },
        headStyles: {
          fillColor: [22, 160, 133],
          fontStyle: "bold",
          font: "NotoSans",
        },
        margin: { left: 14, right: 14 },
        columnStyles: {
          2: { cellWidth: 20, halign: "center" },
          5: { cellWidth: 75 },
        },
      });

      // Add closing balance
      const finalY = doc.lastAutoTable.finalY;
      doc.setFontSize(10);
      doc.setFont("NotoSans", "bold");
      doc.setTextColor(40);
      doc.text(`Closing Balance: ${formatCurrency(closing)}`, 14, finalY + 10);

      // Add footer
      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(8);
      doc.setFont("NotoSans", "normal");
      doc.setTextColor(100);
      doc.text(
        `Generated on: ${dayjs().format("DD MMM YYYY, HH:mm")}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );

      const fileName = `${
        selectedClientData?.displayName || "Client"
      }_Ledger_${dateRange[0].format("DD-MMM-YYYY")}_to_${dateRange[1].format(
        "DD-MMM-YYYY"
      )}.pdf`;

      // Get PDF as blob
      const pdfBlob = doc.output("blob");

      // Check if Web Share API is available (works on mobile)
      if (navigator.share && navigator.canShare) {
        const file = new File([pdfBlob], fileName, { type: "application/pdf" });
        
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: "Client Ledger Report",
            text: `*Client Ledger Report*\n\nClient: ${
              selectedClientData.displayName || "N/A"
            }\nPeriod: ${dateRange[0].format("DD/MM/YYYY")} to ${dateRange[1].format(
              "DD/MM/YYYY"
            )}\nOpening Balance: ${formatCurrency(
              opening
            )}\nClosing Balance: ${formatCurrency(
              closing
            )}\nTotal Transactions: ${ledgerTableData.length}`,
            files: [file],
          });
          message.success("PDF shared successfully");
          return;
        }
      }

      // Fallback: Download PDF and open WhatsApp with text
      doc.save(fileName);
      
      const whatsappMessage = `*Client Ledger Report*%0A%0A*Client:* ${
        selectedClientData.displayName || "N/A"
      }%0A*Period:* ${dateRange[0].format("DD/MM/YYYY")} to ${dateRange[1].format(
        "DD/MM/YYYY"
      )}%0A*Opening Balance:* ${formatCurrency(
        opening
      )}%0A*Closing Balance:* ${formatCurrency(
        closing
      )}%0A*Total Transactions:* ${
        ledgerTableData.length
      }%0A%0APlease find the detailed ledger report attached.`;

      const whatsappUrl = `https://wa.me/?text=${whatsappMessage}`;
      
      setTimeout(() => {
        window.open(whatsappUrl, "_blank");
        message.info("PDF downloaded. Please attach it in WhatsApp.");
      }, 500);
      
    } catch (error) {
      console.error("Share error:", error);
      message.error("Failed to share PDF. Please try downloading instead.");
    }
  };

  // Export menu items
  const exportMenuItems = [
    {
      key: "excel",
      label: "Export to Excel",
      icon: <FileExcelOutlined />,
      onClick: handleExportExcel,
    },
    {
      key: "pdf",
      label: "Export to PDF",
      icon: <FilePdfOutlined />,
      onClick: handleExportPDF,
    },
    {
      key: "whatsapp",
      label: "Share on WhatsApp",
      icon: <WhatsAppOutlined />,
      onClick: handleWhatsAppShare,
    },
  ];

  // Ledger table columns
  const columns = [
    {
      title: "Order Date",
      key: "orderDate",
      width: 100,
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
      width: 100,
      render: (_, r) => {
        if (r.isBalanceRow) return null;
        return r.invoice?.invoiceDate
          ? dayjs(r.invoice.invoiceDate).format("DD/MM/YYYY")
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
      width: 200,
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
              <div style={{ fontWeight: 500 }}>{project.projectCode}</div>
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
          const lines = project.projectGradings.map((pg) => {
            const qty = pg.imageQuantity || 0;
            const rate = pg.customRate || pg.grading?.defaultRate || 0;
            const total = qty * rate;
            return `${
              pg.grading?.name || pg.grading?.shortCode
            } (qty) ${qty} × ₹${rate.toFixed(2)} = ₹${total.toFixed(2)}`;
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
      render: (v, r) => {
        if (r.isBalanceRow) return null;
        return v > 0 ? formatCurrency(v) : "-";
      },
    },
    {
      title: "Credit",
      dataIndex: "credit",
      key: "credit",
      width: 110,
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
      width: 130,
      align: "right",
      render: (v, r) => {
        const color = v > 0 ? "#f5222d" : v < 0 ? "#52c41a" : "#1890ff";
        const fontWeight = r.isBalanceRow ? 600 : 500;
        const fontSize = r.isBalanceRow ? 14 : undefined;
        return (
          <Text style={{ color, fontWeight, fontSize }}>
            {formatCurrency(v)}
          </Text>
        );
      },
    },
  ];

  return (
    <div className="ledger-report">
      <Card>
        <Title level={3}>
          <FilterOutlined /> Client Ledger Report
        </Title>
        <Text type="secondary">
          Select a client and date range to view ledger transactions
        </Text>

        {/* Filters */}
        <Card style={{ marginTop: 16 }} size="small">
          <Row gutter={16}>
            <Col span={6}>
              <div style={{ marginBottom: 8 }}>
                <Text strong>Client</Text>
              </div>
              <Select
                showSearch
                placeholder="Select Client"
                value={selectedClient}
                onChange={(value) => {
                  setSelectedClient(value);
                  setShowLedger(false); // Hide ledger when client changes
                }}
                style={{ width: "100%" }}
                loading={clientsLoading}
                optionFilterProp="children"
                filterOption={(input, option) =>
                  (option?.label ?? "")
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
                labelRender={(props) => {
                  const client = clientsData?.clients?.find(
                    (c) => c.id === props.value
                  );
                  if (!client) return props.label;
                  return (
                    <span>
                      <strong>{client.clientCode}</strong> (
                      {client.displayName || client.companyName})
                    </span>
                  );
                }}
              >
                {clientsData?.clients?.map((client) => (
                  <Option
                    key={client.id}
                    value={client.id}
                    label={`${client.clientCode} ${
                      client.displayName || client.companyName
                    }`}
                  >
                    <div>
                      <div title={client.companyName}>
                        <strong>{client.clientCode}</strong> (
                        {client.displayName || client.companyName})
                        {client.companyName &&
                          client.displayName !== client.companyName && (
                            <span style={{ color: "#8c8c8c", fontSize: 12 }}>
                              {" "}
                              - {client.companyName}
                            </span>
                          )}
                      </div>
                    </div>
                  </Option>
                ))}
              </Select>
            </Col>

            <Col span={5}>
              <div style={{ marginBottom: 8 }}>
                <Text strong>Date Filter</Text>
              </div>
              <Select
                value={dateFilterType}
                onChange={handleDateFilterChange}
                style={{ width: "100%" }}
              >
                <Option value="monthly">Current Month</Option>
                <Option value="fy">Financial Year</Option>
                <Option value="yearly">Calendar Year</Option>
                <Option value="custom">Custom Range</Option>
              </Select>
            </Col>

            <Col span={7}>
              <div style={{ marginBottom: 8 }}>
                <Text strong>Date Range</Text>
              </div>
              {dateFilterType === "monthly" && (
                <DatePicker
                  picker="month"
                  value={selectedMonth}
                  onChange={handleMonthChange}
                  style={{ width: "100%" }}
                  format="MMMM YYYY"
                  placeholder="Select Month"
                />
              )}
              {dateFilterType === "yearly" && (
                <DatePicker
                  picker="year"
                  value={selectedYear}
                  onChange={handleYearChange}
                  style={{ width: "100%" }}
                  format="YYYY"
                  placeholder="Select Year"
                />
              )}
              {(dateFilterType === "custom" || dateFilterType === "fy") && (
                <RangePicker
                  value={
                    dateFilterType === "custom" ? customDateRange : dateRange
                  }
                  onChange={handleCustomDateChange}
                  disabled={dateFilterType === "fy"}
                  style={{ width: "100%" }}
                  format="DD/MM/YYYY"
                />
              )}
            </Col>

            <Col span={6}>
              <div style={{ marginBottom: 8 }}>&nbsp;</div>
              <Space>
                <Button
                  type="primary"
                  icon={<EyeOutlined />}
                  onClick={handleShowLedger}
                  disabled={!selectedClient}
                >
                  Show Ledger
                </Button>
                <Button icon={<ReloadOutlined />} onClick={handleReset}>
                  Reset
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Summary Statistics */}
        {showLedger && ledgerData && (
          <>
            <Row gutter={16} style={{ marginTop: 16 }}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Opening Balance"
                    value={opening}
                    precision={2}
                    prefix="₹"
                    valueStyle={{
                      color:
                        opening > 0
                          ? "#f5222d"
                          : opening < 0
                          ? "#52c41a"
                          : "#1890ff",
                    }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Closing Balance"
                    value={closing}
                    precision={2}
                    prefix="₹"
                    valueStyle={{
                      color:
                        closing > 0
                          ? "#f5222d"
                          : closing < 0
                          ? "#52c41a"
                          : "#1890ff",
                    }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Total Transactions"
                    value={ledgerTableData.length}
                    valueStyle={{ color: "#1890ff" }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Net Movement"
                    value={closing - opening}
                    precision={2}
                    prefix="₹"
                    valueStyle={{
                      color:
                        closing - opening > 0
                          ? "#f5222d"
                          : closing - opening < 0
                          ? "#52c41a"
                          : "#1890ff",
                    }}
                  />
                </Card>
              </Col>
            </Row>

            {/* Export Actions */}
            <Row justify="end" style={{ marginTop: 16 }}>
              <Space>
                <Dropdown menu={{ items: exportMenuItems }}>
                  <Button icon={<DownloadOutlined />}>
                    Export <DownloadOutlined />
                  </Button>
                </Dropdown>
              </Space>
            </Row>

            {/* Ledger Table */}
            <Card style={{ marginTop: 16 }} title="Ledger Transactions">
              {ledgerLoading ? (
                <div style={{ textAlign: "center", padding: 40 }}>
                  <Spin size="large" />
                </div>
              ) : ledgerTableData.length === 0 ? (
                <Empty description="No transactions found for the selected period" />
              ) : (
                <Table
                  dataSource={tableDataWithBalances()}
                  columns={columns}
                  rowKey="id"
                  size="small"
                  rowClassName={(record) => {
                    if (record.isOpeningBalance)
                      return "ledger-opening-balance-row";
                    if (record.isClosingBalance)
                      return "ledger-closing-balance-row";
                    return "";
                  }}
                  pagination={{
                    pageSize: 50,
                    showSizeChanger: true,
                    showTotal: (total) => `Total ${total - 2} transactions`,
                  }}
                  scroll={{ x: 1400 }}
                />
              )}
            </Card>
          </>
        )}

        {/* Empty state when ledger not shown */}
        {!showLedger && (
          <Card style={{ marginTop: 16, textAlign: "center", padding: "60px 20px" }}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <div>
                  <Typography.Title level={4} style={{ marginBottom: 8 }}>
                    Ready to Generate Ledger Report? 📊
                  </Typography.Title>
                  <Typography.Text type="secondary">
                    {selectedClient
                      ? "Hit the 'Show Ledger' button to view detailed transactions and balances"
                      : "Select a client and date range, then click 'Show Ledger' to begin"}
                  </Typography.Text>
                </div>
              }
            />
          </Card>
        )}
      </Card>
    </div>
  );
};

export default LedgerReport;
