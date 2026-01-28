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
  Tooltip,
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
import { useQuery, useReactiveVar } from "@apollo/client";
import dayjs from "dayjs";
import { GET_ALL_CLIENTS_BALANCE_SUMMARY } from "../../gql/clientLedger";
import { GET_CLIENT_LEDGER_RANGE } from "../../gql/clientLedger";
import { userCacheVar } from "../../cache/userCacheVar";
import {
  hasPermission,
  MODULES,
  ACTIONS,
  generatePermission,
} from "../../config/permissions";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { font } from "../../fonts/Noto_Sans/NotoSans.base64.js";
import { boldFont } from "../../fonts/Noto_Sans/NotoSans-bold.js";

const BRAND_COLORS = {
  primary: '#667eea', // matches logo background
  primaryDark: '#4c51bf',
  accent: '#f6f8ff',
  text: '#1f2a44',
};

const COMPANY_DETAILS = {
  name: 'The Image Care',
  contactName: 'Rohit Ramani',
  address:
    '204 MBC, Meridian Business Centre, Lajamni Chowk, opposite Opera Business Center, Shanti Niketan Society, Mota Varachha, Surat, Gujarat 394105',
  phone: '+91 9904530103',
  upiId: 'asmitaramani99@okhdfcbank',
  bank: {
    bankName: 'HDFC',
    accountName: 'ASHMITABEN RAMANI',
    accountNumber: '50100088829930',
    ifsc: 'HDFC0001684',
  },
};

// Simple helper to fetch and inline a public asset
const loadImageAsDataURL = async (path) => {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error('Error loading image', path, err);
    return null;
  }
};

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

const LedgerReport = () => {
  const user = useReactiveVar(userCacheVar);

  // Check if user has limited read permission
  const hasLimitedRead = hasPermission(
    user,
    generatePermission(MODULES.PROJECTS, ACTIONS.LIMTEREAD)
  );

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
    // Positive = We Owe Client (Credit), Negative = Client Owes Us (Debit)
    let running = opening;
    return txs.map((t) => {
      const debit = Number(t.debitAmount || 0);
      const credit = Number(t.creditAmount || 0);
      // New balance = Old Balance + Credit - Debit
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

  // Calculate transaction totals
  const transactionDebit = ledgerTableData.reduce((sum, tx) => sum + tx.debit, 0);
  const transactionCredit = ledgerTableData.reduce((sum, tx) => sum + tx.credit, 0);

  // Include opening balance in totals
  // In this system: Positive = we owe client (credit), Negative = client owes us (debit)
  const totalDebit = transactionDebit + (opening < 0 ? Math.abs(opening) : 0);
  const totalCredit = transactionCredit + (opening > 0 ? opening : 0);

  const calculatedClosing = opening + transactionCredit - transactionDebit;

  // Debug logging for closing balance calculation
  console.log('=== LEDGER BALANCE DEBUG ===', {
    opening,
    transactionDebit,
    transactionCredit,
    calculatedClosing,
    backendClosing: closing,
    difference: closing - calculatedClosing,
    lastTxRunningBalance: ledgerTableData.length > 0 ? ledgerTableData[ledgerTableData.length - 1]?.runningBalance : null
  });

  // Verify backend closing matches calculated closing
  React.useEffect(() => {
    if (ledgerTableData.length > 0) {
      const lastRunningBalance = ledgerTableData[ledgerTableData.length - 1]?.runningBalance;
      if (Math.abs(lastRunningBalance - closing) > 0.01) {
        console.warn('Closing balance mismatch:', {
          backend: closing,
          calculated: lastRunningBalance,
          difference: closing - lastRunningBalance
        });
      }
    }
  }, [ledgerTableData, closing]);

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

    const openingLabel = opening > 0 ? " (CR)" : opening < 0 ? " (DR)" : "";
    const closingLabel = closing > 0 ? " (CR)" : closing < 0 ? " (DR)" : "";

    // Prepare Excel data with header information (similar to HMS-FE)
    const excelData = [
      [`${COMPANY_DETAILS.name} - Client Ledger Report`],
      [
        `Client: ${selectedClientData?.displayName ||
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
      ["Opening Balance", `${formatCurrency(Math.abs(opening))}${openingLabel}`],
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

      // Format project code with project name
      let particularsText = row.description || "-";
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
          return `${pg.grading?.name || pg.grading?.shortCode} (qty) ${qty} × ₹${rate.toFixed(2)} = ₹${total.toFixed(2)}`;
        });
        detailsText = lines.join(", ");
      }

      // Format running balance with DR/CR
      const balanceLabel = row.runningBalance > 0 ? " (CR)" : row.runningBalance < 0 ? " (DR)" : "";
      const formattedBalance = `${formatCurrency(Math.abs(row.runningBalance))}${balanceLabel}`;

      excelData.push([
        row.invoice?.project?.createdAt
          ? dayjs(row.invoice.project.createdAt).format("DD/MM/YYYY")
          : "-",
        row.invoice?.invoiceDate
          ? dayjs(row.invoice.invoiceDate).format("DD/MM/YYYY")
          : "-",
        workDays,
        row.invoice?.invoiceNumber || "-",
        particularsText,
        detailsText,
        row.debit > 0 ? row.debit : "",
        row.credit > 0 ? row.credit : "",
        formattedBalance,
      ]);
    });

    // Add closing balance section
    excelData.push([]);
    excelData.push(["CLOSING BALANCE"]);
    excelData.push(["Closing Balance", `${formatCurrency(Math.abs(closing))}${closingLabel}`]);

    const ws = XLSX.utils.aoa_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Client Ledger");

    const fileName = `${selectedClientData?.displayName ||
      selectedClientData?.companyName ||
      "Client"
      }_Ledger_${dateRange[0].format("DD-MMM-YYYY")}_to_${dateRange[1].format(
        "DD-MMM-YYYY"
      )}.xlsx`;
    XLSX.writeFile(wb, fileName);
    message.success("Excel file downloaded successfully");
  };

  // Export to PDF
  const handleExportPDF = async () => {
    if (!ledgerTableData.length) {
      message.warning("No data to export");
      return;
    }

    const hideLoading = message.loading("Generating PDF...", 0);

    try {
      const doc = new jsPDF({ orientation: "landscape" });

      // Add Noto Sans fonts for proper rupee symbol rendering
      doc.addFileToVFS("NotoSans-Regular.ttf", font);
      doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
      doc.addFileToVFS("NotoSans-Bold.ttf", boldFont);
      doc.addFont("NotoSans-Bold.ttf", "NotoSans", "bold");

      const pageWidth = doc.internal.pageSize.getWidth();

      let yPos = 8;

      // Load Logo
      const logoPng = await loadImageAsDataURL(`${window.location.origin}/assets/icon.png`);

      // ===== HEADER =====
      if (logoPng) {
        const logoSize = 26;
        const logoX = (pageWidth - logoSize) / 2;
        doc.addImage(logoPng, 'PNG', logoX, yPos, logoSize, logoSize);
      }

      doc.setFontSize(14);
      doc.setFont('NotoSans', 'bold');
      doc.setTextColor(BRAND_COLORS.primary);
      doc.text('CLIENT LEDGER REPORT', pageWidth / 2, yPos + 22, { align: 'center' });

      yPos += 26;

      // ===== COMPANY AND CLIENT INFO =====
      // Left side - Company details
      doc.setFontSize(10);
      doc.setFont('NotoSans', 'bold');
      doc.setTextColor(BRAND_COLORS.text);
      doc.text(COMPANY_DETAILS.name, 14, yPos);

      doc.setFontSize(8);
      doc.setFont('NotoSans', 'normal');
      // Wrap address
      const addressLines = doc.splitTextToSize(COMPANY_DETAILS.address, pageWidth / 2 - 30);
      let leftBlockY = yPos + 5;
      addressLines.forEach((line, idx) => {
        doc.text(line, 14, leftBlockY + idx * 4);
      });
      leftBlockY += addressLines.length * 4;
      doc.text(`Phone: ${COMPANY_DETAILS.phone}`, 14, leftBlockY + 4);
      doc.text(`Contact: ${COMPANY_DETAILS.contactName}`, 14, leftBlockY + 8);

      // Right side - Client Details
      const rightX = pageWidth / 2 + 20;
      doc.setFontSize(10);
      doc.setFont('NotoSans', 'bold');
      doc.text('Client Details:', rightX, yPos);

      doc.setFont('NotoSans', 'normal');
      doc.setTextColor(BRAND_COLORS.text);

      // Client Name
      const clientName = selectedClientData?.displayName || selectedClientData?.companyName || "N/A";
      doc.text(clientName, rightX, yPos + 5);
      doc.text(`Client Code: ${selectedClientData?.clientCode || "N/A"}`, rightX, yPos + 9);

      const periodText = `Period: ${dateRange[0].format("DD MMM YYYY")} to ${dateRange[1].format("DD MMM YYYY")}`;
      doc.text(periodText, rightX, yPos + 14);

      // Adjust yPos for content
      yPos = Math.max(leftBlockY + 16, yPos + 25);

      // Opening Balance Line
      doc.setFontSize(10);
      doc.setFont("NotoSans", "bold");
      doc.setTextColor(40);

      const openingLabel = opening > 0 ? " (CR)" : opening < 0 ? " (DR)" : "";
      doc.text(`Opening Balance: ${formatCurrencyNoDecimal(Math.abs(opening))}${openingLabel}`, 14, yPos);

      // Prepare table data
      const tableData = ledgerTableData.map((row) => {
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

        // Format project code with project name
        let particularsText = row.description || "-";
        if (project?.projectCode) {
          particularsText = project.projectCode;
          if (project.name) {
            particularsText += ` - ${project.name}`;
          }
        }

        // Format project gradings details same as table with new lines for PDF
        if (project?.projectGradings?.length > 0) {
          const lines = getSortedProjectGradings(project).map((pg) => {
            const qty = pg.imageQuantity || 0;
            const rate = (pg.customRate !== undefined && pg.customRate !== null)
              ? pg.customRate
              : (pg.grading?.defaultRate ?? 0);
            const total = qty * rate;
            const gradingName = pg.grading?.name || pg.grading?.shortCode || "N/A";
            const gradingCode = pg.grading?.shortCode || '';
            const gradingLabel = gradingCode && gradingCode !== gradingName
              ? `${gradingName} (${gradingCode})`
              : gradingName;
            // Format without work type name, just grading details
            return `${gradingLabel}: ${qty} x ₹${Math.round(rate)} = ₹${Math.round(total)}`;
          });
          detailsText = lines.join("\n");
        }

        const balanceLabel = row.runningBalance > 0 ? " (CR)" : row.runningBalance < 0 ? " (DR)" : "";
        const formattedBalance = `${formatCurrencyNoDecimal(Math.abs(row.runningBalance))}${balanceLabel}`;

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
          row.debit > 0 ? formatCurrencyNoDecimal(row.debit) : "",
          row.credit > 0 ? formatCurrencyNoDecimal(row.credit) : "",
          formattedBalance,
        ];
      });

      // Add table
      autoTable(doc, {
        startY: yPos + 4,
        head: [
          [
            "Order Date",
            "Inv. Date",
            "Days",
            "Inv. No.",
            "Particulars",
            "Details",
            "Debit",
            "Credit",
            "Balance",
          ],
        ],
        body: tableData,
        styles: { fontSize: 8, font: "NotoSans" },
        headStyles: {
          fillColor: [102, 126, 234], // Brand primary
          fontStyle: "bold",
          font: "NotoSans",
        },
        margin: { left: 14, right: 14 },
        columnStyles: {
          2: { cellWidth: 15, halign: "center" },
          5: { cellWidth: 70 },
          6: { halign: 'right' },
          7: { halign: 'right' },
          8: { halign: 'right' },
        },
      });

      // Add closing balance
      const finalY = doc.lastAutoTable.finalY;
      doc.setFontSize(10);
      doc.setFont("NotoSans", "bold");
      doc.setTextColor(40);

      const closingLabel = closing > 0 ? " (CR)" : closing < 0 ? " (DR)" : "";
      doc.text(`Closing Balance: ${formatCurrencyNoDecimal(Math.abs(closing))}${closingLabel}`, 14, finalY + 10);

      // Add footer with Generated on
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setFont("NotoSans", "normal");
      doc.setTextColor(100);
      doc.text(
        `Generated on: ${dayjs().format("DD MMM YYYY, HH:mm")}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );

      const fileName = `${selectedClientData?.displayName ||
        selectedClientData?.companyName ||
        "Client"
        }_Ledger_${dateRange[0].format("DD-MMM-YYYY")}_to_${dateRange[1].format(
          "DD-MMM-YYYY"
        )}.pdf`;
      doc.save(fileName);
      hideLoading();
      message.success("PDF file downloaded successfully");
    } catch (error) {
      hideLoading();
      console.error("PDF Export Error:", error);
      message.error("Failed to export PDF");
    }
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
        `Client: ${selectedClientData?.displayName ||
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
            return `${pg.grading?.name || pg.grading?.shortCode
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

      const fileName = `${selectedClientData?.displayName ||
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
            text: `*Client Ledger Report*\n\nClient: ${selectedClientData?.displayName ||
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

      const whatsappMessage = `*Client Ledger Report*%0A%0A*Client:* ${selectedClientData?.displayName ||
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
        )}%0A*Total Transactions:* ${ledgerTableData.length
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
      title: "Code",
      dataIndex: "clientCode",
      key: "clientCode",
      width: 60,
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: "Client Name",
      key: "displayName",
      width: 140,
      ellipsis: true,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500, fontSize: 11 }}>
            {record.displayName || record.companyName}
          </div>
          {record.displayName &&
            record.companyName &&
            record.displayName !== record.companyName && (
              <div style={{ fontSize: 10, color: "#666" }}>
                {record.companyName}
              </div>
            )}
        </div>
      ),
    },
    {
      title: "FM",
      dataIndex: "financeManagerName",
      key: "financeManagerName",
      width: 80,
      ellipsis: true,
      render: (text) => text || "-",
      filters: financeManagers.map((manager) => ({
        text: manager,
        value: manager,
      })),
      filteredValue: financeManagerFilter ? [financeManagerFilter] : null,
    },
    {
      title: "Balance",
      dataIndex: "currentBalance",
      key: "currentBalance",
      width: 90,
      align: "right",
      render: (value, record) => {
        // If this is the currently selected client, use the calculated closing balance
        // This ensures the sidebar list matches the detail view
        let displayValue = value;
        
        if (selectedClient === record.clientId && ledgerData?.clientLedgerRange) {
           displayValue = Number(ledgerData.clientLedgerRange.closingBalance ?? value);
        }

        const color =
          displayValue > 0 ? "#52c41a" : displayValue < 0 ? "#f5222d" : "#1890ff";
        const label = displayValue > 0 ? "(CR)" : displayValue < 0 ? "(DR)" : "";
        return (
          <Space direction="vertical" size={0} align="end">
            <Text strong style={{ color, fontSize: 11 }}>
              {formatCurrencyNoDecimal(Math.abs(displayValue))}
            </Text>
            <Text style={{ color, fontSize: 9, opacity: 0.8 }}>{label}</Text>
          </Space>
        );
      },
      sorter: true,
      sortOrder:
        sortConfig?.field === "currentBalance" ? sortConfig.order : null,
    },
  ];

  // Ledger table columns
  const columns = [
    ...(hasLimitedRead ? [] : [
      {
        title: "Invoice",
        key: "invoiceInfo",
        width: 130,
        render: (_, r) => {
          if (r.isBalanceRow) return null;

          // For payment records, show payment number and date
          if (r.payment) {
            return (
              <div style={{ fontSize: 11 }}>
                <div>{r.payment?.paymentNumber || "Payment"}</div>
                <div style={{ color: "#999" }}>
                  {r.payment?.paymentDate
                    ? dayjs(r.payment.paymentDate).format("DD/MM/YY")
                    : "-"}
                </div>
              </div>
            );
          }

          return (
            <div style={{ fontSize: 11 }}>
              <div>{r.invoice?.invoiceNumber || "-"}</div>
              <div style={{ color: "#999" }}>
                {r.invoice?.invoiceDate
                  ? dayjs(r.invoice.invoiceDate).format("DD/MM/YY")
                  : "-"}
              </div>
            </div>
          );
        },
      },
    ]),
    {
      title: "Particulars",
      key: "particulars",
      width: hasLimitedRead ? 250 : 180,
      ellipsis: true,
      render: (_, r) => {
        if (r.isBalanceRow) {
          return (
            <Text
              strong
              style={{
                fontSize: 13,
                color: r.isOpeningBalance ? "#1890ff" : "#52c41a",
              }}
            >
              {r.description}
            </Text>
          );
        }

        // For payment records, show payment type and reference
        if (r.payment) {
          const paymentType = r.payment?.paymentType?.name || r.payment?.paymentType?.type || "Payment";
          const refNum = r.payment?.referenceNumber ? ` (${r.payment.referenceNumber})` : "";
          return (
            <Tooltip title={`${paymentType}${refNum}`}>
              <span style={{ fontSize: 11 }}>{paymentType}{refNum}</span>
            </Tooltip>
          );
        }

        const project = r.invoice?.project;
        if (project) {
          const fullText = `${project.projectCode}${project.name || project.description ? ' - ' + (project.name || project.description) : ''}`;
          return (
            <Tooltip title={fullText}>
              <div style={{ fontSize: 11 }}>
                <div style={{ fontWeight: 500 }}>{project.projectCode}</div>
                <div style={{ fontSize: 10, color: "#666" }}>
                  {project.name || project.description}
                </div>
              </div>
            </Tooltip>
          );
        }
        return (
          <Tooltip title={r.description || "-"}>
            <span style={{ fontSize: 11 }}>{r.description || "-"}</span>
          </Tooltip>
        );
      },
    },
    {
      title: "Details",
      key: "details",
      ellipsis: true,
      render: (_, r) => {
        if (r.isBalanceRow) return null;

        // For payment records, show payment type and reference details
        if (r.payment) {
          const paymentType = r.payment?.paymentType?.name || r.payment?.paymentType?.type || "Payment";
          const refNum = r.payment?.referenceNumber ? `Ref: ${r.payment.referenceNumber}` : "";
          const bankName = r.payment?.bankName ? `Bank: ${r.payment.bankName}` : "";
          const chequeDate = r.payment?.chequeDate ? `Cheque: ${dayjs(r.payment.chequeDate).format("DD/MM/YY")}` : "";

          const details = [paymentType, refNum, bankName, chequeDate].filter(Boolean);
          return (
            <div style={{ fontSize: 10, lineHeight: "1.4" }}>
              {details.map((detail, idx) => (
                <div key={idx}>{detail}</div>
              ))}
            </div>
          );
        }

        const project = r.invoice?.project;
        if (project?.projectGradings?.length > 0) {
          const lines = getSortedProjectGradings(project).map((pg) => {
            const qty = pg.imageQuantity || 0;
            const rate = (pg.customRate !== undefined && pg.customRate !== null)
              ? pg.customRate
              : (pg.grading?.defaultRate ?? 0);
            const total = qty * rate;
            const gradingName = pg.grading?.name || "N/A";
            const gradingCode = pg.grading?.shortCode || '';
            const gradingLabel = gradingCode ? `${gradingName} (${gradingCode})` : gradingName;
            // Format without work type name, just grading details
            return `${gradingLabel}: ${qty} × ₹${Math.round(rate)} = ₹${Math.round(total)}`;
          });
          return (
            <div style={{ fontSize: 10, lineHeight: "1.4" }}>
              {lines.map((line, idx) => (
                <div key={idx}>{line}</div>
              ))}
            </div>
          );
        }
        return <span style={{ fontSize: 11 }}>{r.description || "-"}</span>;
      },
    },
    ...(hasLimitedRead ? [] : [
      {
        title: "Debit",
        dataIndex: "debit",
        key: "debit",
        width: 90,
        align: "right",
        render: (v, r) => {
          if (r.isBalanceRow) return null;
          return v > 0 ? <span style={{ fontSize: 11, color: "#ff4d4f", fontWeight: 500 }}>{formatCurrencyNoDecimal(v)}</span> : "-";
        },
      },
      {
        title: "Credit",
        dataIndex: "credit",
        key: "credit",
        width: 90,
        align: "right",
        render: (v, r) => {
          if (r.isBalanceRow) return null;
          return v > 0 ? <span style={{ fontSize: 11, color: "#52c41a", fontWeight: 500 }}>{formatCurrencyNoDecimal(v)}</span> : "-";
        },
      },
      {
        title: "Balance",
        dataIndex: "runningBalance",
        key: "runningBalance",
        width: 100,
        align: "right",
        render: (v, r) => {
          const color = v > 0 ? "#52c41a" : v < 0 ? "#f5222d" : "#1890ff";
          const fontWeight = r.isBalanceRow ? 600 : 500;
          const fontSize = r.isBalanceRow ? 13 : 11;
          return (
            <Text style={{ color, fontWeight, fontSize }}>
              {formatCurrencyNoDecimal(v)}
            </Text>
          );
        },
      },
    ]),
  ];

  return (
    <div className="ledger-report">
      <Card bodyStyle={{ padding: '8px' }}>
        {/* Two Column Layout */}
        <Row gutter={8}>
          {/* Left Column - All Clients List */}
          <Col span={8}>
            <Card
              title="All Clients Summary"
              size="small"
              bodyStyle={{ padding: '8px' }}
              headStyle={{ padding: '0 12px', minHeight: '38px' }}
              style={{ height: "calc(100vh - 100px)", position: "relative" }}
            >
              <Input
                placeholder="Search clients..."
                prefix={<SearchOutlined />}
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                style={{ marginBottom: 8 }}
                size="small"
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
                    height: "calc(100vh - 190px)",
                    overflow: "auto",
                  }}
                  onScroll={handleClientsScroll}
                >
                  <Table
                    dataSource={allClientsData || []}
                    columns={clientsColumns}
                    rowKey="clientId"
                    size="small"
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
                  ? `${selectedClientData.clientCode} - ${selectedClientData.displayName ||
                  selectedClientData.companyName
                  }`
                  : "Client Detail Ledger"
              }
              size="small"
              bodyStyle={{ padding: '8px' }}
              headStyle={{ padding: '0 12px', minHeight: '38px' }}
              style={{ height: "calc(100vh - 100px)", overflow: "auto", position: "relative" }}
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
                  <Space direction="horizontal" style={{ width: "100%", marginBottom: 8 }} size={4}>
                    <Select
                      value={dateFilterType}
                      onChange={handleDateFilterChange}
                      style={{ width: 130 }}
                      size="small"
                    >
                      <Option value="monthly">Monthly</Option>
                      <Option value="fy">FY</Option>
                      <Option value="yearly">Yearly</Option>
                      <Option value="custom">Custom</Option>
                    </Select>

                    {dateFilterType === "monthly" && (
                      <DatePicker
                        picker="month"
                        value={selectedMonth}
                        onChange={handleMonthChange}
                        style={{ width: 180 }}
                        format="MMM YYYY"
                        placeholder="Month"
                        size="small"
                      />
                    )}
                    {dateFilterType === "yearly" && (
                      <DatePicker
                        picker="year"
                        value={selectedYear}
                        onChange={handleYearChange}
                        style={{ width: 180 }}
                        format="YYYY"
                        placeholder="Year"
                        size="small"
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
                          style={{ width: 260 }}
                          format="DD/MM/YY"
                          size="small"
                        />
                      )}

                    <Button
                      icon={<ReloadOutlined />}
                      onClick={handleReset}
                      size="small"
                    />

                    <div style={{ flex: 1 }} />

                    <Dropdown menu={{ items: exportMenuItems }}>
                      <Button icon={<DownloadOutlined />} size="small">
                        Export
                      </Button>
                    </Dropdown>
                  </Space>

                  {/* Summary Statistics */}
                  {ledgerData && (
                    <>
                      <Row gutter={4} style={{ marginBottom: 8 }}>
                        <Col span={5}>
                          <Card size="small" bodyStyle={{ padding: '6px 10px' }}>
                            <div style={{ fontSize: 10, color: '#999', marginBottom: 1 }}>
                              Opening {opening > 0 ? "(CR)" : opening < 0 ? "(DR)" : ""}
                            </div>
                            <div style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: opening > 0 ? "#52c41a" : opening < 0 ? "#f5222d" : "#1890ff"
                            }}>
                              {formatCurrencyNoDecimal(Math.abs(opening))}
                              <span style={{ fontSize: 9, marginLeft: 2 }}>
                                {opening > 0 ? "Credit" : opening < 0 ? "Debit" : ""}
                              </span>
                            </div>
                          </Card>
                        </Col>
                        <Col span={5}>
                          <Card size="small" bodyStyle={{ padding: '6px 10px' }}>
                            <div style={{ fontSize: 10, color: '#999', marginBottom: 1 }}>Total Debit</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#ff4d4f" }}>
                              {formatCurrencyNoDecimal(totalDebit)}
                            </div>
                          </Card>
                        </Col>
                        <Col span={5}>
                          <Card size="small" bodyStyle={{ padding: '6px 10px' }}>
                            <div style={{ fontSize: 10, color: '#999', marginBottom: 1 }}>Total Credit</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#52c41a" }}>
                              {formatCurrencyNoDecimal(totalCredit)}
                            </div>
                          </Card>
                        </Col>
                        <Col span={5}>
                          <Card size="small" bodyStyle={{ padding: '6px 10px' }}>
                            <div style={{ fontSize: 10, color: '#999', marginBottom: 1 }}>
                              Closing {closing > 0 ? "(CR)" : closing < 0 ? "(DR)" : ""}
                            </div>
                            <div style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: closing > 0 ? "#52c41a" : closing < 0 ? "#f5222d" : "#1890ff"
                            }}>
                              {formatCurrencyNoDecimal(Math.abs(closing))}
                              <span style={{ fontSize: 9, marginLeft: 2 }}>
                                {closing > 0 ? "Credit balance" : closing < 0 ? "Debit balance" : ""}
                              </span>
                            </div>
                          </Card>
                        </Col>
                        <Col span={4}>
                          <Card size="small" bodyStyle={{ padding: '6px 10px' }}>
                            <div style={{ fontSize: 10, color: '#999', marginBottom: 1 }}>Txns</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#1890ff" }}>
                              {ledgerTableData.length}
                            </div>
                          </Card>
                        </Col>
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
                          rowClassName={(record) => {
                            if (record.isOpeningBalance)
                              return "ledger-opening-balance-row";
                            if (record.isClosingBalance)
                              return "ledger-closing-balance-row";
                            return "";
                          }}
                          pagination={false}
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
