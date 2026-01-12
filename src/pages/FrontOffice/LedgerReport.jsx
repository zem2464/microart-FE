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
  Input,
} from "antd";
import {
  FilterOutlined,
  ReloadOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  WhatsAppOutlined,
  EyeOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useQuery } from "@apollo/client";
import dayjs from "dayjs";
import { GET_ALL_CLIENTS_BALANCE_SUMMARY } from "../../gql/clientLedger";
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

const formatCurrencyNoDecimal = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);

const LedgerReport = () => {
  // State for selected client and filters
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

  // Infinite scroll state for clients list
  const [clientsPage, setClientsPage] = useState(1);
  const [hasMoreClients, setHasMoreClients] = useState(true);
  const [isLoadingMoreClients, setIsLoadingMoreClients] = useState(false);
  const [allClientsData, setAllClientsData] = useState([]);
  const [clientSearch, setClientSearch] = useState("");
  const [sortConfig, setSortConfig] = useState(null);
  const [financeManagerFilter, setFinanceManagerFilter] = useState(null);

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
      .client-row-selected {
        background-color: #e6f7ff !important;
      }
      .client-row-selected:hover td {
        background-color: #bae7ff !important;
      }
      .ant-table-thead > tr > th {
        position: sticky !important;
        top: 0 !important;
        z-index: 10 !important;
        background: #fafafa !important;
      }
      .client-list-table .ant-table {
        font-size: 11px !important;
      }
      .client-list-table .ant-table-thead > tr > th {
        padding: 4px 8px !important;
        font-size: 11px !important;
        font-weight: 600 !important;
      }
      .client-list-table .ant-table-tbody > tr > td {
        padding: 4px 8px !important;
        font-size: 11px !important;
      }
      .client-list-table .ant-btn-sm {
        font-size: 11px !important;
        padding: 0px 6px !important;
        height: 22px !important;
      }
      .client-list-table .ant-table-tbody > tr:hover > td {
        background-color: #d6f0ff !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Fetch all clients balance summary
  const {
    data: clientsBalanceData,
    loading: clientsBalanceLoading,
    refetch: refetchClientsBalance,
    fetchMore: fetchMoreClients,
  } = useQuery(GET_ALL_CLIENTS_BALANCE_SUMMARY, {
    variables: {
      search: clientSearch,
      sort: sortConfig,
      filters: financeManagerFilter
        ? { financeManagerName: financeManagerFilter }
        : null,
      pagination: {
        page: 1,
        limit: 50,
      },
    },
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
  });

  // Update allClientsData when new data is fetched
  React.useEffect(() => {
    if (clientsBalanceData?.allClientsBalanceSummary?.clients) {
      setAllClientsData(clientsBalanceData.allClientsBalanceSummary.clients);
    }
  }, [clientsBalanceData]);

  // Check if there are more clients to load
  React.useEffect(() => {
    if (clientsBalanceData?.allClientsBalanceSummary?.pagination) {
      const { hasNext } =
        clientsBalanceData.allClientsBalanceSummary.pagination;
      setHasMoreClients(hasNext);
    }
  }, [clientsBalanceData]);

  // Refetch when search, sort, or filter changes
  React.useEffect(() => {
    setClientsPage(1);
    refetchClientsBalance({
      search: clientSearch,
      sort: sortConfig,
      filters: financeManagerFilter
        ? { financeManagerName: financeManagerFilter }
        : null,
      pagination: { page: 1, limit: 50 },
    });
  }, [clientSearch, sortConfig, financeManagerFilter, refetchClientsBalance]);

  // Get unique finance managers for filter
  const financeManagers = React.useMemo(() => {
    const managers = new Set();
    allClientsData.forEach((client) => {
      if (client.financeManagerName) {
        managers.add(client.financeManagerName);
      }
    });
    return Array.from(managers).sort();
  }, [allClientsData]);

  // Fetch ledger data for selected client
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
    skip: !selectedClient,
    fetchPolicy: "network-only",
  });

  // Handle scroll event for infinite scroll on clients table
  const loadMoreClients = React.useCallback(async () => {
    if (isLoadingMoreClients || !hasMoreClients || clientsBalanceLoading)
      return;

    setIsLoadingMoreClients(true);
    try {
      await fetchMoreClients({
        variables: {
          search: clientSearch,
          sort: sortConfig,
          filters: financeManagerFilter
            ? { financeManagerName: financeManagerFilter }
            : null,
          pagination: {
            page: clientsPage + 1,
            limit: 50,
          },
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev;

          const prevClients = prev?.allClientsBalanceSummary?.clients || [];
          const newClients =
            fetchMoreResult?.allClientsBalanceSummary?.clients || [];

          return {
            ...fetchMoreResult,
            allClientsBalanceSummary: {
              ...fetchMoreResult.allClientsBalanceSummary,
              clients: [...prevClients, ...newClients],
            },
          };
        },
      });
      setClientsPage(clientsPage + 1);
    } catch (error) {
      console.error("Error loading more clients:", error);
      message.error("Failed to load more clients");
    } finally {
      setIsLoadingMoreClients(false);
    }
  }, [
    isLoadingMoreClients,
    hasMoreClients,
    clientsBalanceLoading,
    fetchMoreClients,
    clientsPage,
  ]);

  const handleClientsScroll = React.useCallback(
    (e) => {
      const target = e.target;
      const scrollTop = target.scrollTop;
      const scrollHeight = target.scrollHeight;
      const clientHeight = target.clientHeight;

      // Trigger load more when scrolled to 80% of the content
      if (scrollHeight - scrollTop <= clientHeight * 1.2) {
        loadMoreClients();
      }
    },
    [loadMoreClients]
  );

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
    if (!selectedClient || ledgerTableData.length === 0) return ledgerTableData;

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
  const selectedClientData =
    clientsBalanceData?.allClientsBalanceSummary?.clients?.find(
      (c) => c.clientId === selectedClient
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
        `Client: ${
          selectedClientData?.displayName ||
          selectedClientData?.companyName ||
          "N/A"
        } (${selectedClientData?.clientCode || "N/A"})`,
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
          const rate = (pg.customRate !== undefined && pg.customRate !== null)
            ? pg.customRate
            : (pg.grading?.defaultRate ?? 0);
          const total = qty * rate;
          return `${
            pg.grading?.name || pg.grading?.shortCode
          } (qty) ${qty} × ₹${rate.toFixed(2)} = ₹${total.toFixed(2)}`;
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
      selectedClientData?.displayName ||
      selectedClientData?.companyName ||
      "Client"
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
      `Client: ${
        selectedClientData?.displayName ||
        selectedClientData?.companyName ||
        "N/A"
      } (${selectedClientData?.clientCode || "N/A"})`,
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
          const rate = (pg.customRate !== undefined && pg.customRate !== null)
            ? pg.customRate
            : (pg.grading?.defaultRate ?? 0);
          const total = qty * rate;
          return `${
            pg.grading?.name || pg.grading?.shortCode
          } (qty) ${qty} × ₹${rate.toFixed(2)} = ₹${total.toFixed(2)}`;
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
      selectedClientData?.displayName ||
      selectedClientData?.companyName ||
      "Client"
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
        `Client: ${
          selectedClientData?.displayName ||
          selectedClientData?.companyName ||
          "N/A"
        } (${selectedClientData?.clientCode || "N/A"})`,
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
            const rate = (pg.customRate !== undefined && pg.customRate !== null)
              ? pg.customRate
              : (pg.grading?.defaultRate ?? 0);
            const total = qty * rate;
            return `${
              pg.grading?.name || pg.grading?.shortCode
            } (qty) ${qty} × ₹${rate.toFixed(2)} = ₹${total.toFixed(2)}`;
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
        selectedClientData?.displayName ||
        selectedClientData?.companyName ||
        "Client"
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
              selectedClientData?.displayName ||
              selectedClientData?.companyName ||
              "N/A"
            }\nPeriod: ${dateRange[0].format(
              "DD/MM/YYYY"
            )} to ${dateRange[1].format(
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
        selectedClientData?.displayName ||
        selectedClientData?.companyName ||
        "N/A"
      }%0A*Period:* ${dateRange[0].format(
        "DD/MM/YYYY"
      )} to ${dateRange[1].format(
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

  // Clients list table columns
  const clientsColumns = [
    {
      title: "Client Code",
      dataIndex: "clientCode",
      key: "clientCode",
      width: 70,
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: "Client Name",
      key: "displayName",
      width: 150,
      ellipsis: true,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500, fontSize: 13 }}>
            {record.displayName || record.companyName}
          </div>
          {record.displayName &&
            record.companyName &&
            record.displayName !== record.companyName && (
              <div style={{ fontSize: 11, color: "#666" }}>
                {record.companyName}
              </div>
            )}
        </div>
      ),
    },
    {
      title: "Finance Manager",
      dataIndex: "financeManagerName",
      key: "financeManagerName",
      width: 100,
      ellipsis: true,
      render: (text) => text || "-",
      filters: financeManagers.map((manager) => ({
        text: manager,
        value: manager,
      })),
      filteredValue: financeManagerFilter ? [financeManagerFilter] : null,
    },
    {
      title: "Debit",
      dataIndex: "totalDebit",
      key: "totalDebit",
      width: 80,
      align: "right",
      render: (value) => formatCurrencyNoDecimal(value),
      sorter: true,
      sortOrder: sortConfig?.field === "totalDebit" ? sortConfig.order : null,
    },
    {
      title: "Credit",
      dataIndex: "totalCredit",
      key: "totalCredit",
      width: 80,
      align: "right",
      render: (value) => formatCurrencyNoDecimal(value),
      sorter: true,
      sortOrder: sortConfig?.field === "totalCredit" ? sortConfig.order : null,
    },
    {
      title: "Balance",
      dataIndex: "currentBalance",
      key: "currentBalance",
      width: 90,
      align: "right",
      render: (value) => {
        const color = value > 0 ? "#f5222d" : value < 0 ? "#52c41a" : "#1890ff";
        return (
          <Text strong style={{ color }}>
            {formatCurrencyNoDecimal(value)}
          </Text>
        );
      },
      sorter: true,
      sortOrder:
        sortConfig?.field === "currentBalance" ? sortConfig.order : null,
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
            const rate = (pg.customRate !== undefined && pg.customRate !== null)
              ? pg.customRate
              : (pg.grading?.defaultRate ?? 0);
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
        {/* Two Column Layout */}
        <Row gutter={16} style={{ marginTop: 16 }}>
          {/* Left Column - All Clients List */}
          <Col span={8}>
            <Card
              title="All Clients Summary"
              size="small"
              style={{ height: "calc(100vh - 200px)", position: "relative" }}
            >
              <Input
                placeholder="Search by client code, name, or company..."
                prefix={<SearchOutlined />}
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                style={{ marginBottom: 16 }}
                allowClear
              />
              {clientsBalanceLoading && allClientsData.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: 60,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: "rgba(255, 255, 255, 0.8)",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 1000,
                  }}
                >
                  <Spin size="large" tip="Loading clients..." />
                </div>
              )}
              {clientsBalanceLoading && allClientsData.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40 }}>
                  <Spin size="large" />
                </div>
              ) : (
                <div
                  className="client-list-table"
                  style={{
                    height: "calc(100vh - 300px)",
                    overflow: "auto",
                  }}
                  onScroll={handleClientsScroll}
                >
                  <Table
                    dataSource={allClientsData || []}
                    columns={clientsColumns}
                    rowKey="clientId"
                    size="small"
                    sticky
                    rowClassName={(record) =>
                      record.clientId === selectedClient
                        ? "client-row-selected"
                        : ""
                    }
                    pagination={false}
                    onRow={(record) => ({
                      onClick: () => setSelectedClient(record.clientId),
                      style: { cursor: "pointer" },
                    })}
                    // scroll={{ y: null }}
                    onChange={(pagination, filters, sorter) => {
                      // Handle filter changes
                      if (filters.financeManagerName !== undefined) {
                        setFinanceManagerFilter(
                          filters.financeManagerName?.[0] || null
                        );
                      }

                      // Handle sort changes
                      if (sorter.field) {
                        setSortConfig({
                          field: sorter.field,
                          order: sorter.order || "ascend",
                        });
                      } else {
                        setSortConfig(null);
                      }
                    }}
                  />
                  {isLoadingMoreClients && (
                    <div style={{ textAlign: "center", padding: 16 }}>
                      <Spin />
                      <div style={{ marginTop: 8, color: "#999" }}>
                        Loading more clients...
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </Col>

          {/* Right Column - Selected Client Detail Ledger */}
          <Col span={16}>
            <Card
              title={
                selectedClientData
                  ? `${selectedClientData.clientCode} - ${
                      selectedClientData.displayName ||
                      selectedClientData.companyName
                    }`
                  : "Client Detail Ledger"
              }
              size="small"
              style={{ height: "calc(100vh - 200px)", overflow: "auto", position: "relative" }}
            >
              {!selectedClient ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <div>
                      <Typography.Title level={5} style={{ marginBottom: 8 }}>
                        Select a Client
                      </Typography.Title>
                      <Typography.Text type="secondary">
                        Click on "View" button from the clients list to see
                        detailed ledger
                      </Typography.Text>
                    </div>
                  }
                  style={{ marginTop: 60 }}
                />
              ) : (
                <>
                  {ledgerLoading && (
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: "rgba(255, 255, 255, 0.8)",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        zIndex: 1000,
                      }}
                    >
                      <Spin size="large" tip="Loading ledger data..." />
                    </div>
                  )}
                  {/* Date Filters */}
                  <Card style={{ marginBottom: 16 }} size="small">
                    <Row gutter={16}>
                      <Col span={8}>
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

                      <Col span={12}>
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
                        {(dateFilterType === "custom" ||
                          dateFilterType === "fy") && (
                          <RangePicker
                            value={
                              dateFilterType === "custom"
                                ? customDateRange
                                : dateRange
                            }
                            onChange={handleCustomDateChange}
                            disabled={dateFilterType === "fy"}
                            style={{ width: "100%" }}
                            format="DD/MM/YYYY"
                          />
                        )}
                      </Col>

                      <Col span={4}>
                        <div style={{ marginBottom: 8 }}>&nbsp;</div>
                        <Button
                          icon={<ReloadOutlined />}
                          onClick={handleReset}
                          style={{ width: "100%" }}
                        >
                          Reset
                        </Button>
                      </Col>
                    </Row>
                  </Card>

                  {/* Summary Statistics */}
                  {ledgerData && (
                    <>
                      <Row gutter={8} style={{ marginBottom: 16 }}>
                        <Col span={6}>
                          <Card size="small">
                            <Statistic
                              title="Opening"
                              value={opening}
                              precision={2}
                              prefix="₹"
                              valueStyle={{
                                fontSize: 16,
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
                          <Card size="small">
                            <Statistic
                              title="Closing"
                              value={closing}
                              precision={2}
                              prefix="₹"
                              valueStyle={{
                                fontSize: 16,
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
                          <Card size="small">
                            <Statistic
                              title="Transactions"
                              value={ledgerTableData.length}
                              valueStyle={{ fontSize: 16, color: "#1890ff" }}
                            />
                          </Card>
                        </Col>
                        <Col span={6}>
                          <Card size="small">
                            <Statistic
                              title="Net"
                              value={closing - opening}
                              precision={2}
                              prefix="₹"
                              valueStyle={{
                                fontSize: 16,
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
                      <Row justify="end" style={{ marginBottom: 16 }}>
                        <Space>
                          <Dropdown menu={{ items: exportMenuItems }}>
                            <Button icon={<DownloadOutlined />}>
                              Export <DownloadOutlined />
                            </Button>
                          </Dropdown>
                        </Space>
                      </Row>

                      {/* Ledger Table */}
                      {ledgerTableData.length === 0 ? (
                        <Empty description="No transactions found for the selected period" />
                      ) : (
                        <Table
                          dataSource={tableDataWithBalances()}
                          columns={columns}
                          rowKey="id"
                          size="xs"
                          sticky
                          rowClassName={(record) => {
                            if (record.isOpeningBalance)
                              return "ledger-opening-balance-row";
                            if (record.isClosingBalance)
                              return "ledger-closing-balance-row";
                            return "";
                          }}
                          pagination={{
                            pageSize: 20,
                            showSizeChanger: true,
                            showTotal: (total) =>
                              `Total ${total - 2} transactions`,
                          }}
                          scroll={{ x: 1200, y: "calc(100vh - 620px)" }}
                        />
                      )}
                    </>
                  )}
                </>
              )}
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default LedgerReport;
