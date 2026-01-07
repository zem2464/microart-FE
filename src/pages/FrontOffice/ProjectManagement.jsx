import React, { useState, useContext, useEffect, useCallback } from "react";
import {
  Card,
  Table,
  Space,
  Tag,
  Typography,
  Row,
  Col,
  Statistic,
  Progress,
  Timeline,
  Button,
  Modal,
  Drawer,
  Alert,
  Tooltip,
  Input,
  InputNumber,
  Select,
  message,
  Tabs,
  Badge,
  Descriptions,
  Divider,
  Empty,
} from "antd";
import {
  EyeOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ProjectOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  PauseCircleOutlined,
  FileTextOutlined,
  CopyOutlined,
  CheckOutlined,
  CloseOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  ExclamationCircleOutlined,
  FilePdfOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation } from "@apollo/client";
import {
  GET_PROJECTS,
  DELETE_PROJECT,
  ACTIVATE_PROJECT,
  UPDATE_PROJECT,
  GET_PENDING_CREDIT_REQUESTS,
  APPROVE_CREDIT_REQUEST,
  REJECT_CREDIT_REQUEST,
  GET_PROJECT_STATS,
} from "../../graphql/projectQueries";
import { GET_CLIENTS } from "../../graphql/clientQueries";
import { GET_WORK_TYPES } from "../../graphql/workTypeQueries";
import { GENERATE_PROJECT_INVOICE } from "../../gql/clientLedger";
// tasks are loaded in ProjectDetail drawer when needed
import { AppDrawerContext } from "../../contexts/DrawerContext";
import dayjs from "dayjs";
import { useReactiveVar } from "@apollo/client";
import { userCacheVar } from "../../cache/userCacheVar";
import {
  hasPermission,
  MODULES,
  ACTIONS,
  generatePermission,
} from "../../config/permissions";

const { Text } = Typography;
const { Option } = Select;

// Status display map for labels and colors
const STATUS_MAP = {
  DRAFT: { label: "Draft", color: "default" },
  ACTIVE: { label: "Active", color: "green" },
  IN_PROGRESS: { label: "In Progress", color: "processing" },
  REVIEW: { label: "Review", color: "cyan" },
  DELIVERED: { label: "Delivered", color: "purple" },
  COMPLETED: { label: "Completed", color: "success" },
  CANCELLED: { label: "Cancelled", color: "error" },
  ON_HOLD: { label: "On Hold", color: "warning" },
  REQUESTED: { label: "Pending Approval", color: "purple" },
  REOPEN: { label: "Reopen", color: "magenta" },
};

// Helper function to get client display name
const getClientDisplayName = (client) => {
  console.log("Client data:", client);
  return (
    client.clientCode || "Unknown Client" + "" + (client.displayName || "")
  );
};

const ProjectManagement = () => {
  const {
    showProjectFormDrawer,
    showProjectDetailDrawer,
    showProjectDetailDrawerV2,
    showInvoiceDetailDrawer,
    showQuoteDrawer,
  } = useContext(AppDrawerContext);
  const user = useReactiveVar(userCacheVar);

  // Check if user has limited permissions
  const hasLimitedRead = hasPermission(
    user,
    generatePermission(MODULES.PROJECTS, ACTIONS.LIMTEREAD)
  );
  const hasLimitedEdit = hasPermission(
    user,
    generatePermission(MODULES.PROJECTS, ACTIONS.LIMITEDIT)
  );
  const hasFullRead = hasPermission(
    user,
    generatePermission(MODULES.PROJECTS, ACTIONS.READ)
  );
  const canApproveProjects = hasPermission(
    user,
    generatePermission(MODULES.PROJECTS, ACTIONS.APPROVE)
  );
  const canRejectProjects = hasPermission(
    user,
    generatePermission(MODULES.PROJECTS, ACTIONS.REJECT)
  );
  const canDeleteProjects = hasPermission(
    user,
    generatePermission(MODULES.PROJECTS, ACTIONS.DELETE)
  );
  const canEditProjects = hasPermission(
    user,
    generatePermission(MODULES.PROJECTS, ACTIONS.UPDATE)
  );
  const canCreateFinance = hasPermission(
    user,
    generatePermission(MODULES.FINANCE, ACTIONS.CREATE)
  );

  // Hide prices if user has limitedRead or limitedEdit (but not full read)
  const shouldHidePrices = hasLimitedRead || hasLimitedEdit;

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [workTypeFilter, setWorkTypeFilter] = useState("all");

  // Infinite scroll state
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Project completion modal state
  const [completeModalVisible, setCompleteModalVisible] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [actualImageCount, setActualImageCount] = useState(0);

  // Invoice generation modal state
  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false);
  const [projectToInvoice, setProjectToInvoice] = useState(null);

  // Credit approval modal state
  const [creditApprovalModalVisible, setCreditApprovalModalVisible] =
    useState(false);
  const [selectedCreditRequest, setSelectedCreditRequest] = useState(null);
  const [approvalNotes, setApprovalNotes] = useState("");

  // Status editing state (inline editing like ClientList)
  const [editingStatus, setEditingStatus] = useState({});
  const [tempValues, setTempValues] = useState({});

  // Build filters object for GraphQL query
  const buildFilters = useCallback(() => {
    const filters = {};

    if (statusFilter !== "all") {
      if (statusFilter === "NO_INVOICE") {
        filters.noInvoice = true;
      } else if (statusFilter !== "REQUESTED") {
        filters.status = statusFilter;
      }
    }

    if (clientFilter !== "all") {
      filters.clientId = clientFilter;
    }

    if (workTypeFilter !== "all") {
      filters.workTypeId = workTypeFilter;
    }

    return filters;
  }, [statusFilter, clientFilter, workTypeFilter]);

  // GraphQL Queries
  const {
    data: projectsData,
    loading: projectsLoading,
    error: projectsError,
    refetch: refetchProjects,
    fetchMore,
  } = useQuery(GET_PROJECTS, {
    variables: {
      filters: buildFilters(),
      page: 1,
      limit: 20,
      sortBy: "createdAt",
      sortOrder: "DESC",
    },
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
  });

  const { data: clientsData, refetch: refetchClients } = useQuery(GET_CLIENTS, {
    variables: {
      filters: {},
      page: 1,
      limit: 100,
      sortBy: "name",
      sortOrder: "ASC",
    },
    fetchPolicy: "cache-and-network",
  });

  const { data: workTypesData } = useQuery(GET_WORK_TYPES, {
    fetchPolicy: "cache-and-network",
  });

  // New stats query for accurate project counts
  const {
    data: statsData,
    loading: statsLoading,
    refetch: refetchStats,
  } = useQuery(GET_PROJECT_STATS, {
    fetchPolicy: "cache-and-network",
  });

  // project tasks are loaded inside the ProjectDetail drawer when opened
  const tasksLoading = false;

  // Track projects that already have invoices (projectId -> true)
  const [invoicedProjectIds, setInvoicedProjectIds] = useState(new Set());
  // No apollo client usage is needed now; invoice presence is returned on project objects

  // GraphQL Mutations
  const [deleteProject] = useMutation(DELETE_PROJECT, {
    oncompleted: () => {
      message.success("Project deleted successfully!");
      refetchProjects();
    },
    onError: (error) => {
      message.error(`Error deleting project: ${error.message}`);
    },
  });

  const [activateProject] = useMutation(ACTIVATE_PROJECT, {
    oncompleted: () => {
      message.success("Project activated successfully!");
    },
    onError: (error) => {
      message.error(`Error activating project: ${error.message}`);
    },
  });

  const [updateProjectStatus] = useMutation(UPDATE_PROJECT, {
    onCompleted: () => {
      message.success("Project status updated successfully!");
    },
    onError: (error) => {
      message.error(`Error updating project status: ${error.message}`);
    },
  });

  const [completeProject] = useMutation(UPDATE_PROJECT, {
    oncompleted: () => {
      message.success("Project marked as completed — generating invoice...");
      // refresh clients so any client balances / credit limits reflect the invoice
      try {
        refetchClients && refetchClients();
      } catch (e) {
        /* ignore */
      }

      // Attempt to generate invoice for this project. Leave modal open until generation completes.
      try {
        if (selectedProject && selectedProject.id) {
          generateInvoice({
            variables: { projectId: selectedProject.id },
          }).catch((err) => {
            // If invoice generation fails, still close the modal (user can retry) and show error
            message.error(`Invoice generation failed: ${err.message}`);
            setCompleteModalVisible(false);
            setSelectedProject(null);
            setActualImageCount(0);
          });
        } else {
          // No selected project (shouldn't happen) — just close modal
          setCompleteModalVisible(false);
          setSelectedProject(null);
          setActualImageCount(0);
        }
      } catch (e) {
        // Ensure modal is closed on unexpected errors
        setCompleteModalVisible(false);
        setSelectedProject(null);
        setActualImageCount(0);
      }
    },
    onError: (error) => {
      message.error(`Error completing project: ${error.message}`);
    },
  });

  const [generateInvoice] = useMutation(GENERATE_PROJECT_INVOICE, {
    onCompleted: (data) => {
      const success = data?.generateProjectInvoice?.success;
      const invoice = data?.generateProjectInvoice?.invoice;
      if (success) {
        message.success(
          data.generateProjectInvoice.message || "Invoice generated"
        );
        // mark project as invoiced locally
        if (invoice && invoice.id && invoice.projectId) {
          setInvoicedProjectIds((prev) => new Set(prev).add(invoice.projectId));
        } else if (selectedProject && selectedProject.id) {
          setInvoicedProjectIds((prev) =>
            new Set(prev).add(selectedProject.id)
          );
        }

        // If we were generating invoice from the completion flow (modal open), close modal and clear selection
        try {
          if (selectedProject) {
            setCompleteModalVisible(false);
            setSelectedProject(null);
            setActualImageCount(0);
          }
        } catch (e) {
          /* ignore */
        }

        try {
          refetchClients && refetchClients();
        } catch (e) { }
        try {
          refetchStats && refetchStats();
        } catch (e) { }
      } else {
        message.error(
          data?.generateProjectInvoice?.message || "Failed to generate invoice"
        );
      }
    },
    onError: (err) => {
      message.error(`Error generating invoice: ${err.message}`);
    },
  });

  const [approveCreditRequest] = useMutation(APPROVE_CREDIT_REQUEST, {
    onCompleted: (data) => {
      message.success(
        `Credit request approved! Project activated and ${data.approveCreditRequest.tasksCreated} tasks created.`
      );
      setCreditApprovalModalVisible(false);
      setSelectedCreditRequest(null);
      setApprovalNotes("");
    },
    onError: (error) => {
      message.error(`Error approving credit request: ${error.message}`);
    },
  });

  const [rejectCreditRequest] = useMutation(REJECT_CREDIT_REQUEST, {
    onCompleted: () => {
      message.success(
        "Credit request rejected. Project reverted to draft status."
      );
      setCreditApprovalModalVisible(false);
      setSelectedCreditRequest(null);
      setApprovalNotes("");
    },
    onError: (error) => {
      message.error(`Error rejecting credit request: ${error.message}`);
    },
  });

  // Normalize projects array from GraphQL response (supports projects.projects or legacy projects.data)
  const allProjects =
    projectsData?.projects?.projects || projectsData?.projects?.data || [];

  // Refetch projects when filters change
  useEffect(() => {
    refetchProjects({
      filters: buildFilters(),
      page: 1,
      limit: 20,
      sortBy: "createdAt",
      sortOrder: "DESC",
    });
    setPage(1); // Reset page on filter change
  }, [
    statusFilter,
    clientFilter,
    workTypeFilter,
    buildFilters,
    refetchProjects,
  ]);

  // Check if there are more items to load
  useEffect(() => {
    if (projectsData?.projects?.pagination) {
      const { page, totalPages } = projectsData.projects.pagination;
      setHasMore(page < totalPages);
    }
  }, [projectsData]);

  // Load more data for infinite scroll
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || projectsLoading) return;

    setIsLoadingMore(true);
    try {
      await fetchMore({
        variables: {
          filters: buildFilters(),
          page: page + 1,
          limit: 20,
          sortBy: "createdAt",
          sortOrder: "DESC",
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev;

          const prevProjects =
            prev?.projects?.projects || prev?.projects?.data || [];
          const newProjects =
            fetchMoreResult?.projects?.projects ||
            fetchMoreResult?.projects?.data ||
            [];

          return {
            ...fetchMoreResult,
            projects: {
              ...fetchMoreResult.projects,
              projects: [...prevProjects, ...newProjects],
              data: [...prevProjects, ...newProjects],
            },
          };
        },
      });
      setPage(page + 1);
    } catch (error) {
      console.error("Error loading more projects:", error);
      message.error("Failed to load more projects");
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, projectsLoading, fetchMore, page, buildFilters]);

  // Handle scroll event for infinite scroll (window-level)
  const handleScroll = useCallback(() => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = window.innerHeight;
    // Trigger load more when scrolled to 80% of the content
    if (scrollHeight - scrollTop <= clientHeight * 1.2) {
      loadMore();
    }
  }, [loadMore]);

  // Attach window scroll listener
  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Populate invoicedProjectIds from server-provided project.invoiceId / project.invoice
  useEffect(() => {
    const ids = new Set();
    try {
      (allProjects || []).forEach((p) => {
        if (p && (p.invoiceId || (p.invoice && p.invoice.id))) {
          ids.add(p.id);
        }
      });
      setInvoicedProjectIds(ids);
    } catch (e) {
      // ignore
    }
  }, [allProjects]);

  // Filter projects based on search (status and client filtering now handled server-side)
  const filteredProjects =
    allProjects.filter((project) => {
      const code = (
        project.projectCode ||
        project.projectNumber ||
        project.name ||
        ""
      ).toString();
      const desc = (project.description || "").toString();
      const searchLower = searchText.toString().toLowerCase();

      const matchesSearch =
        code.toLowerCase().includes(searchLower) ||
        desc.toLowerCase().includes(searchLower);

      // Additional client-side filtering for REQUESTED (fly-on-credit)
      // since this uses a relationship that's harder to filter server-side
      if (statusFilter === "REQUESTED") {
        return matchesSearch && project.creditRequest?.status === "approved";
      }

      // For other filters (NO_INVOICE, status, client), server handles it
      return matchesSearch;
    }) || [];

  // Helper function to generate folder name for copying
  const generateFolderName = (project) => {
    const parts = [];

    // 1. Project Code
    if (project.projectCode) {
      parts.push(project.projectCode);
    }

    // 2. Project Name
    if (project.name) {
      parts.push(project.name);
    }

    // 3. Grading codes with image quantities
    // First try projectGradings (multiple gradings)
    if (
      project.projectGradings &&
      Array.isArray(project.projectGradings) &&
      project.projectGradings.length > 0
    ) {
      const gradingParts = project.projectGradings
        .filter((pg) => pg.grading && pg.imageQuantity)
        .map((pg) => {
          // Use shortCode if available, otherwise use name with spaces replaced by hyphens
          let code = pg.grading.shortCode;
          if (!code && pg.grading.name) {
            code = pg.grading.name.replace(/\s+/g, "-");
          }
          if (!code) {
            code = "GR";
          }
          return `${code}-${pg.imageQuantity}`;
        })
        .join("_");
      if (gradingParts) {
        parts.push(gradingParts + `_${project?.client?.clientCode}`);
      }
    }
    // Fallback to single grading (backward compatibility)
    else if (project.grading && project.imageQuantity) {
      // Use shortCode if available, otherwise use name with spaces replaced by hyphens
      let code = project.grading.shortCode;
      if (!code && project.grading.name) {
        code = project.grading.name.replace(/\s+/g, "-");
      }
      if (!code) {
        code = "GR";
      }
      parts.push(
        `${code}-${project.imageQuantity}_${project?.client?.clientCode}`
      );
    }

    // 4. Client Code

    return parts.join(" ");
  };

  // Handler to copy folder name to clipboard
  const handleCopyFolderName = (project) => {
    const folderName = generateFolderName(project);

    // Try modern clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(folderName)
        .then(() => {
          message.success("Folder name copied to clipboard!");
        })
        .catch(() => {
          message.error("Failed to copy folder name");
        });
    } else {
      // Fallback method for older browsers or non-HTTPS contexts
      try {
        const textArea = document.createElement("textarea");
        textArea.value = folderName;
        textArea.style.position = "fixed";
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.width = "2em";
        textArea.style.height = "2em";
        textArea.style.padding = "0";
        textArea.style.border = "none";
        textArea.style.outline = "none";
        textArea.style.boxShadow = "none";
        textArea.style.background = "transparent";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);

        if (successful) {
          message.success("Folder name copied to clipboard!");
        } else {
          message.error("Failed to copy folder name");
        }
      } catch (err) {
        console.error("Failed to copy:", err);
        message.error("Failed to copy folder name");
      }
    }
  };

  // Calculate statistics using stats query for accurate total counts
  const projectStatsResponse = statsData?.projectStats || {};
  const projectStats = projectStatsResponse.stats || [];

  // Debug: Log the raw stats data
  console.log("📊 Raw projectStats from backend:", projectStatsResponse);

  // Build stats object from backend stats
  const statsMap = projectStats.reduce((acc, stat) => {
    acc[stat.status.toLowerCase()] = {
      count: stat.count,
      estimatedCost: stat.totalEstimatedCost,
      actualCost: stat.totalActualCost,
    };
    return acc;
  }, {});

  console.log("📊 statsMap after processing:", statsMap);
  console.log(
    "📊 Fly-on-Credit count from response:",
    projectStatsResponse.flyOnCreditCount
  );
  console.log(
    "📊 No Invoice count from response:",
    projectStatsResponse.noInvoiceCount
  );

  const stats = {
    total: projectStats.reduce((sum, s) => sum + s.count, 0),
    active: statsMap.active?.count || 0,
    draft: statsMap.draft?.count || 0,
    completed: statsMap.completed?.count || 0,
    inProgress: statsMap.in_progress?.count || 0,
    requested: statsMap.requested?.count || 0,
    cancelled: statsMap.cancelled?.count || 0,
    onHold: statsMap.on_hold?.count || 0,
    reopen: statsMap.reopen?.count || 0,
    flyOnCredit: projectStatsResponse.flyOnCreditCount || 0, // Use dedicated fly-on-credit count from response
    noInvoice: projectStatsResponse.noInvoiceCount || 0, // Completed projects without invoices
    notDelivered: projectStatsResponse.notDeliveredCount || 0, // Completed projects with invoice but not delivered
    totalEstimatedCost: projectStats.reduce(
      (sum, s) => sum + (s.totalEstimatedCost || 0),
      0
    ),
    totalActualCost: projectStats.reduce(
      (sum, s) => sum + (s.totalActualCost || 0),
      0
    ),
  };

  // Handle project actions
  const handleViewProject = (project) => {
    // Open redesigned Project Detail Drawer by projectId for full context
    try {
      showProjectDetailDrawerV2(project.id);
      return;
    } catch (e) {
      // Fallback to legacy project detail drawer
      showProjectDetailDrawer(project);
    }
  };

  const handleEditProject = (project) => {
    showProjectFormDrawer(project, "edit", () => {
      refetchProjects();
    });
  };

  const handleDeleteProject = (project) => {
    Modal.confirm({
      title: "Are you sure you want to delete this project?",
      content: `This will permanently delete "${project.projectCode}" and all associated data.`,
      okText: "Yes, Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: () => {
        deleteProject({
          variables: { id: project.id },
        });
      },
    });
  };

  const handleActivateProject = (project) => {
    Modal.confirm({
      title: "Activate Project",
      content: `Are you sure you want to activate "${project.projectCode}"? This will create tasks and start the project.`,
      okText: "Yes, Activate",
      cancelText: "Cancel",
      onOk: () => {
        activateProject({
          variables: { id: project.id },
        });
      },
    });
  };

  // Determine per-image rate for a project. Prefer any explicit project rate if present,
  // otherwise derive from estimatedCost / imageQuantity, fallback to grading defaultRate.
  const determineProjectRate = (proj) => {
    if (!proj) return 0;
    // common possible persisted fields: perImageRate, rate, projectRate
    const explicit =
      proj.perImageRate ?? proj.rate ?? proj.projectRate ?? proj.perImageRate;
    if (explicit !== undefined && explicit !== null) return Number(explicit);
    if (proj.estimatedCost && proj.imageQuantity) {
      const imgQ = Number(proj.imageQuantity) || 0;
      if (imgQ > 0) return Number(proj.estimatedCost) / imgQ;
    }
    return proj.grading?.defaultRate || 0;
  };

  const handleCompleteProject = (project) => {
    setSelectedProject(project);
    setActualImageCount(project.imageQuantity || 0); // Default to original quantity
    setCompleteModalVisible(true);
  };

  const handleCompleteSubmit = () => {
    if (!selectedProject || actualImageCount <= 0) {
      message.error("Please enter a valid image count");
      return;
    }
    // Calculate actual cost based on actual image count
    const rate = determineProjectRate(selectedProject);
    const actualCost = rate * actualImageCount;

    completeProject({
      variables: {
        id: selectedProject.id,
        input: {
          status: "COMPLETED",
          actualCost: actualCost,
          imageQuantity: actualImageCount, // Update with actual count
        },
      },
    });
  };

  // Credit approval handlers
  const handleShowCreditApproval = async (project) => {
    try {
      // Use the credit request from the project data
      if (!project.creditRequest) {
        message.error("No credit request found for this project");
        return;
      }

      setSelectedCreditRequest({
        id: project.creditRequest.id, // Use the actual credit request ID
        project: project,
        requestedAmount: project.creditRequest.requestedAmount,
        availableCredit: project.creditRequest.availableCredit,
        excessAmount: project.creditRequest.excessAmount,
        creditLimit: project.creditRequest.creditLimit,
        status: project.creditRequest.status,
        intendedStatus: project.creditRequest.intendedStatus,
        requestNotes: project.creditRequest.requestNotes,
      });
      setCreditApprovalModalVisible(true);
    } catch (error) {
      message.error(`Error loading credit request: ${error.message}`);
    }
  };

  const handleApproveCreditRequest = () => {
    if (!selectedCreditRequest) return;

    // We need to query the actual credit request ID for this project
    // For now, we'll use the project ID (this should be improved)
    approveCreditRequest({
      variables: {
        requestId: selectedCreditRequest.id,
        input: {
          approvalNotes: approvalNotes || "Approved",
        },
      },
    });
  };

  const handleRejectCreditRequest = () => {
    if (!selectedCreditRequest || !approvalNotes) {
      message.error("Please provide a reason for rejection");
      return;
    }

    rejectCreditRequest({
      variables: {
        requestId: selectedCreditRequest.id,
        input: {
          approvalNotes: approvalNotes,
        },
      },
    });
  };

  // Invoice generation handler
  const handleGenerateInvoice = () => {
    if (!projectToInvoice) return;

    generateInvoice({
      variables: { projectId: projectToInvoice.id },
    })
      .then(() => {
        // optimistically mark as invoiced locally
        setInvoicedProjectIds((prev) => new Set(prev).add(projectToInvoice.id));
        setInvoiceModalVisible(false);
        setProjectToInvoice(null);
      })
      .catch((err) => {
        // Error handling is in mutation onError callback
        setInvoiceModalVisible(false);
        setProjectToInvoice(null);
      });
  };

  const buildQuoteFromProject = (project) => {
    if (!project) return null;

    const now = dayjs();
    const identifier =
      project.projectCode || project.projectNumber || project.id || "PROJECT";
    const items = (project.projectGradings || []).length
      ? project.projectGradings.map((pg, idx) => {
          const quantity = Number(pg.imageQuantity || 0);
          const rate = Number(pg.customRate || pg.grading?.defaultRate || 0);
          const amount = quantity * rate;
          return {
            line: idx + 1,
            description: pg.grading?.name || "Service",
            quantity,
            rate,
            amount,
          };
        })
      : [
          {
            line: 1,
            description: project.grading?.name || "Service",
            quantity:
              project.imageQuantity ||
              project.totalImageQuantity ||
              project.imageQuantityInvoiced ||
              0,
            rate: Number(project.grading?.defaultRate || 0),
          },
        ].map((item) => ({ ...item, amount: item.quantity * item.rate }));

    const subtotal = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const discountAmount = Math.max(Number(project.discountAmount || 0), 0);
    const taxableBase = Math.max(subtotal - discountAmount, 0);
    const taxRate = Number(
      project.taxRate || project.taxPercent || project.taxPercentage || 0
    );
    const taxAmount = Math.max((taxableBase * taxRate) / 100, 0);
    const totalAmount = Math.max(taxableBase + taxAmount, 0);
    const totalImages = items.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0
    );

    return {
      quoteNumber: `QT-${identifier}-${now.format("YYMMDDHHmm")}`,
      quoteDate: now.toISOString(),
      validUntil: project.quoteValidUntil || now.add(7, "day").toISOString(),
      client: project.client,
      project,
      items,
      subtotal,
      discountAmount,
      taxRate,
      taxAmount,
      totalAmount,
      totalImages,
      notes: project.description,
    };
  };

  const handleShowQuote = (project) => {
    const draftQuote = buildQuoteFromProject(project);
    showQuoteDrawer(draftQuote);
  };

  // Status editing handlers (inline editing like ClientList)
  const handleEditStatus = (projectId, currentStatus) => {
    if (!canEditProjects) {
      message.error("You don't have permission to edit project status");
      return;
    }
    setEditingStatus((prev) => ({ ...prev, [projectId]: true }));
    setTempValues((prev) => ({
      ...prev,
      [`status_${projectId}`]: currentStatus?.toLowerCase(),
    }));
  };

  const handleCancelStatusEdit = (projectId) => {
    setEditingStatus((prev) => ({ ...prev, [projectId]: false }));
    const newValues = { ...tempValues };
    delete newValues[`status_${projectId}`];
    setTempValues(newValues);
  };

  const handleSaveStatusEdit = async (projectId) => {
    const newStatus = tempValues[`status_${projectId}`];

    // Find the project to validate
    const project = allProjects.find((p) => p.id === projectId);

    // Validate DELIVERED status change
    if (newStatus?.toLowerCase() === "delivered") {
      if (!project) {
        message.error("Project not found");
        return;
      }

      // Invoice is REQUIRED for all client types before marking as delivered
      if (!project.invoice && !project.invoiceId) {
        message.error(
          "Cannot mark as delivered: Invoice must be generated first"
        );
        return;
      }

      // Additional validation based on client type
      const clientType = project.client?.clientType;
      const hasApprovePermission = hasPermission(
        user,
        generatePermission(MODULES.PROJECTS, ACTIONS.APPROVE)
      );
      const isPaid =
        project.invoice?.status === "fully_paid" ||
        project.invoice?.balanceAmount <= 0;

      if (clientType === "walkIn") {
        // Walk-in clients: Need permission AND payment (in addition to invoice)
        if (!hasApprovePermission) {
          message.error(
            "You do not have permission to mark walk-in projects as delivered. Only users with project approval permission can do this."
          );
          return;
        }

        if (!isPaid) {
          const balance = project.invoice?.balanceAmount || 0;
          message.error(
            `Cannot mark walk-in project as delivered: Invoice must be paid first. Current balance: ₹${balance.toFixed(
              2
            )}.`
          );
          return;
        }
      }
      // Permanent clients: Invoice is sufficient (no additional checks)
    }
    
    // Validate REOPEN status change
    if (newStatus?.toLowerCase() === "reopen") {
      if (!project) {
        message.error("Project not found");
        return;
      }
      const invoicePaid =
        project.invoice?.status === "fully_paid" ||
        (project.invoice?.balanceAmount !== undefined &&
          project.invoice?.balanceAmount <= 0);
      if (invoicePaid) {
        message.error(
          "Cannot change to Reopen: invoice is fully paid/completed"
        );
        return;
      }
    }

    try {
      await updateProjectStatus({
        variables: {
          id: projectId,
          input: {
            status: newStatus.toUpperCase(),
          },
        },
      });
      setEditingStatus((prev) => ({ ...prev, [projectId]: false }));
      const newValues = { ...tempValues };
      delete newValues[`status_${projectId}`];
      setTempValues(newValues);
    } catch (error) {
      message.error(error.message || "Failed to update project status");
    }
  };

  // Table columns
  const columns = [
    {
      title: "Client",
      dataIndex: "client",
      key: "client",
      width: 150,
      render: (client) => (
        <>
          <strong>{client.clientCode} </strong>({client?.displayName || "N/A"})
        </>
      ),
    },
    {
      title: "Project",
      key: "project",
      width: 300,
      render: (_, record) => (
        <Space direction="vertical" size={2} style={{ width: "100%" }}>
          <Space>
            <Tooltip title="Copy folder name">
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={() => handleCopyFolderName(record)}
              />
            </Tooltip>
            <Text strong style={{ whiteSpace: "pre-wrap", maxWidth: 200 }}>
              {generateFolderName(record)}
            </Text>
          </Space>
        </Space>
      ),
    },

    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 180,
      render: (status, record) => {
        const isEditing = editingStatus[record.id];
        const tempValue = tempValues[`status_${record.id}`];

        // Derive options from STATUS_MAP
        const statusOptions = Object.entries(STATUS_MAP).map(
          ([key, config]) => ({
            value: key.toLowerCase(),
            label: config.label,
            color: config.color,
          })
        );

        // Check if user can select DELIVERED status
        const hasApprovePermission = hasPermission(
          user,
          generatePermission(MODULES.PROJECTS, ACTIONS.APPROVE)
        );
        const hasInvoice = record.invoice || record.invoiceId;
        const clientType = record.client?.clientType;
        const isPaid =
          record.invoice?.status === "fully_paid" ||
          record.invoice?.balanceAmount <= 0;
        const isCompleted = record.status?.toLowerCase() === "completed";

        // If project is completed AND has invoice, show ONLY delivered or reopen option
        const filteredStatusOptions =
          isCompleted && hasInvoice
            ? statusOptions.filter(
                (opt) => opt.value === "delivered" || opt.value === "reopen"
              )
            : statusOptions;

        if (isEditing) {
          return (
            <div className="flex items-center space-x-2">
              <Select
                value={tempValue}
                onChange={(value) =>
                  setTempValues((prev) => ({
                    ...prev,
                    [`status_${record.id}`]: value,
                  }))
                }
                size="small"
                style={{ width: 140 }}
              >
                {filteredStatusOptions.map((option) => {
                  // Disable DELIVERED option based on permissions
                  let disabled = false;
                  let title = "";

                  if (option.value === "delivered") {
                    if (!hasInvoice) {
                      disabled = true;
                      title = "Invoice must be generated first";
                    } else if (clientType === "walkIn") {
                      // Walk-in: Need permission AND payment
                      if (!hasApprovePermission) {
                        disabled = true;
                        title =
                          "Permission required to deliver walk-in projects";
                      } else if (!isPaid) {
                        disabled = true;
                        title = "Invoice must be paid for walk-in projects";
                      }
                    }
                    // Permanent: No restrictions
                  } else if (option.value === "reopen") {
                    // Reopen allowed only if invoice is not completed/fully paid
                    if (isPaid) {
                      disabled = true;
                      title = "Cannot reopen when invoice is fully paid";
                    }
                  }

                  return (
                    <Option
                      key={option.value}
                      value={option.value}
                      disabled={disabled}
                      title={title}
                    >
                      <Tag color={option.color}>{option.label}</Tag>
                      {disabled && (
                        <Text
                          type="secondary"
                          style={{ fontSize: "10px", marginLeft: "4px" }}
                        >
                          🔒
                        </Text>
                      )}
                    </Option>
                  );
                })}
              </Select>
              <Button
                type="primary"
                size="small"
                icon={<CheckOutlined />}
                onClick={() => handleSaveStatusEdit(record.id)}
              />
              <Button
                size="small"
                icon={<CloseOutlined />}
                onClick={() => handleCancelStatusEdit(record.id)}
              />
            </div>
          );
        }

        const statusKey = (status || "").toUpperCase();
        const statusConfig = STATUS_MAP[statusKey] || {
          label: status,
          color: "default",
        };

        return (
          <div className="group flex items-center justify-between">
            <Tag color={statusConfig.color}>{statusConfig.label}</Tag>
            {canEditProjects && (
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleEditStatus(record.id, status)}
              />
            )}
          </div>
        );
      },
    },
    {
      title: "Work Type / Grading",
      key: "workTypeGrading",
      width: 250,
      render: (_, record) => {
        // Display multiple work types
        const workTypes = record.workTypes || [];
        const gradings = record.projectGradings || [];

        return (
          <div>
            {/* Work Types */}
            <div style={{ marginBottom: 4 }}>
              {workTypes.length > 0 ? (
                workTypes.map((wt, idx) => (
                  <Tag key={wt.id} color="blue" style={{ marginBottom: 2 }}>
                    {wt.name}
                  </Tag>
                ))
              ) : (
                <Text type="secondary">No work type</Text>
              )}
            </div>

            {/* Gradings */}
            <div>
              {gradings.length > 0 ? (
                gradings.slice(0, 2).map((pg, idx) => (
                  <Tag
                    key={pg.id}
                    color="gold"
                    style={{ marginBottom: 2, fontSize: "11px" }}
                  >
                    {pg.grading?.name || pg.grading?.shortCode || "N/A"}
                    {!shouldHidePrices &&
                      ` - ₹${pg.customRate || pg.grading?.defaultRate || 0}`}
                  </Tag>
                ))
              ) : (
                <Text type="secondary" style={{ fontSize: "11px" }}>
                  No grading
                </Text>
              )}
              {gradings.length > 2 && (
                <Tag color="default" style={{ fontSize: "10px" }}>
                  +{gradings.length - 2} more
                </Tag>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: "Order Date",
      dataIndex: "createdAt",
      key: "orderDate",
      width: 120,
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
      render: (date) => (date ? dayjs(date).format("MMM DD, YYYY") : "N/A"),
    },
    {
      title: "Deadline",
      dataIndex: "deadlineDate",
      key: "deadlineDate",
      width: 120,
      render: (date) =>
        date ? dayjs(date).format("MMM DD, YYYY") : "No deadline",
    },
    !shouldHidePrices && {
      title: "Budget",
      key: "estimatedCost",
      width: 110,
      render: (_, record) => {
        const budget = record.totalEstimatedCost || record.estimatedCost || 0;
        return budget > 0 ? `₹${budget.toLocaleString()}` : "N/A";
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleViewProject(record)}
            />
          </Tooltip>
          {canEditProjects && (record.status || "").toString().toUpperCase() !== "COMPLETED" && (
            <Tooltip title="Edit">
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={() => handleEditProject(record)}
              />
            </Tooltip>
          )}
          {record.status === "DRAFT" && (
            <Tooltip title="Activate Project">
              <Button
                type="text"
                icon={<PlayCircleOutlined />}
                onClick={() => handleActivateProject(record)}
              />
            </Tooltip>
          )}
          {(record.status || "").toString().toUpperCase() === "REQUESTED" &&
            (canApproveProjects || canRejectProjects) && (
              <Tooltip title="Approve Credit Request">
                <Button
                  type="text"
                  icon={<CheckCircleOutlined />}
                  style={{ color: "#722ed1" }}
                  onClick={() => handleShowCreditApproval(record)}
                />
              </Tooltip>
            )}
          {(["ACTIVE", "IN_PROGRESS"].includes((record.status || "").toString().toUpperCase())) &&
            !(
              record.invoiceId ||
              record.invoice?.id ||
              invoicedProjectIds.has(record.id)
            ) && (
              <Tooltip title="View Quotation">
                <Button
                  type="text"
                  icon={<FilePdfOutlined />}
                  style={{ color: "#13c2c2" }}
                  onClick={() => handleShowQuote(record)}
                />
              </Tooltip>
            )}

          {(record.status || "").toString().toUpperCase() === "ACTIVE" &&
            ((record.taskCount &&
              record.completedTaskCount &&
              record.taskCount > 0 &&
              record.completedTaskCount === record.taskCount) ||
              (record.tasks &&
                record.tasks.length > 0 &&
                record.tasks.every(
                  (t) =>
                    (t.status || "").toString().toUpperCase() === "COMPLETED"
                ))) &&
            !(
              record.invoiceId ||
              record.invoice?.id ||
              invoicedProjectIds.has(record.id)
            ) &&
            (canCreateFinance || record.client?.leaderId === user?.id) && (
              <Tooltip title="Complete & Generate Invoice">
                <Button
                  type="text"
                  icon={<CheckCircleOutlined />}
                  style={{ color: "#fa8c16" }}
                  onClick={() => handleCompleteProject(record)}
                />
              </Tooltip>
            )}

          {/* If project is already completed but has no invoice, allow generating one */}
          {(record.status || "").toString().toUpperCase() === "COMPLETED" &&
            !(
              record.invoiceId ||
              record.invoice?.id ||
              invoicedProjectIds.has(record.id)
            ) &&
            (canCreateFinance || record.client?.leaderId === user?.id) && (
              <Tooltip title="Generate Invoice">
                <Button
                  type="text"
                  icon={<FileTextOutlined />}
                  style={{ color: "#1890ff" }}
                  onClick={() => {
                    setProjectToInvoice(record);
                    setInvoiceModalVisible(true);
                  }}
                />
              </Tooltip>
            )}

          {/* Show View Invoice button only when invoice is actually generated */}
          {(record.invoice?.id || record.invoiceId) && (
              <Tooltip title="View Invoice">
                <Button
                  type="text"
                  icon={<FileTextOutlined />}
                  onClick={() => {
                    const invoiceId = record.invoice?.id || record.invoiceId;
                    console.log('Opening invoice drawer with ID:', invoiceId);
                    showInvoiceDetailDrawer(invoiceId);
                  }}
                />
              </Tooltip>
            )}

          {(record.status || "").toString().toUpperCase() !== "COMPLETED" &&
            canDeleteProjects && (
              <Tooltip title="Delete">
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDeleteProject(record)}
                />
              </Tooltip>
            )}
        </Space>
      ),
    },
  ];

  if (projectsError) {
    return (
      <Alert
        message="Error Loading Projects"
        description={projectsError.message}
        type="error"
        showIcon
      />
    );
  }

  return (
    <div className="project-management">
      <div>
        {/* Filters and Actions with Inline Stats */}
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={16} align="middle" style={{ marginBottom: 12 }}>
            {/* Inline Statistics - Compact Badges */}
            <Col flex="auto">
              <Space size={16}>
                <Space
                  size={4}
                  style={{
                    cursor: "pointer",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    transition: "background-color 0.3s",
                  }}
                  className="hover:bg-gray-100"
                  onClick={() => setStatusFilter("DRAFT")}
                >
                  <EditOutlined style={{ fontSize: 16, color: "#faad14" }} />
                  <Text strong style={{ fontSize: 14 }}>
                    Draft:
                  </Text>
                  <Tag
                    color="orange"
                    style={{ margin: 0, fontSize: 14, padding: "2px 8px" }}
                  >
                    {stats.draft}
                  </Tag>
                </Space>
                <Space
                  size={4}
                  style={{
                    cursor: "pointer",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    transition: "background-color 0.3s",
                  }}
                  className="hover:bg-gray-100"
                  onClick={() => setStatusFilter("all")}
                >
                  <ProjectOutlined style={{ fontSize: 16, color: "#1890ff" }} />
                  <Text strong style={{ fontSize: 14 }}>
                    Total:
                  </Text>
                  <Tag
                    color="blue"
                    style={{ margin: 0, fontSize: 14, padding: "2px 8px" }}
                  >
                    {stats.total}
                  </Tag>
                </Space>
                <Space
                  size={4}
                  style={{
                    cursor: "pointer",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    transition: "background-color 0.3s",
                  }}
                  className="hover:bg-gray-100"
                  onClick={() => setStatusFilter("ACTIVE")}
                >
                  <PlayCircleOutlined
                    style={{ fontSize: 16, color: "#52c41a" }}
                  />
                  <Text strong style={{ fontSize: 14 }}>
                    Active:
                  </Text>
                  <Tag
                    color="green"
                    style={{ margin: 0, fontSize: 14, padding: "2px 8px" }}
                  >
                    {stats.active}
                  </Tag>
                </Space>
                <Space
                  size={4}
                  style={{
                    cursor: "pointer",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    transition: "background-color 0.3s",
                  }}
                  className="hover:bg-gray-100"
                  onClick={() => setStatusFilter("IN_PROGRESS")}
                >
                  <ClockCircleOutlined
                    style={{ fontSize: 16, color: "#1890ff" }}
                  />
                  <Text strong style={{ fontSize: 14 }}>
                    In Progress:
                  </Text>
                  <Tag
                    color="blue"
                    style={{ margin: 0, fontSize: 14, padding: "2px 8px" }}
                  >
                    {stats.inProgress}
                  </Tag>
                </Space>
                <Space
                  size={4}
                  style={{
                    cursor: "pointer",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    transition: "background-color 0.3s",
                  }}
                  className="hover:bg-gray-100"
                  onClick={() => setStatusFilter("REOPEN")}
                >
                  <ReloadOutlined style={{ fontSize: 16, color: "#eb2f96" }} />
                  <Text strong style={{ fontSize: 14 }}>
                    Reopen:
                  </Text>
                  <Tag
                    color="magenta"
                    style={{ margin: 0, fontSize: 14, padding: "2px 8px" }}
                  >
                    {stats.reopen}
                  </Tag>
                </Space>
                <Space
                  size={4}
                  style={{
                    cursor: "pointer",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    transition: "background-color 0.3s",
                    backgroundColor:
                      stats.noInvoice > 0 ? "#fff7e6" : "transparent",
                    border: stats.noInvoice > 0 ? "1px solid #ffa940" : "none",
                  }}
                  className="hover:bg-orange-100"
                  onClick={() => setStatusFilter("NO_INVOICE")}
                >
                  <ExclamationCircleOutlined
                    style={{ fontSize: 16, color: "#fa8c16" }}
                  />
                  <Text strong style={{ fontSize: 14 }}>
                    Completed (No Invoice):
                  </Text>
                  <Tag
                    color="orange"
                    style={{ margin: 0, fontSize: 14, padding: "2px 8px" }}
                  >
                    {stats.noInvoice}
                  </Tag>
                </Space>
                <Space
                  size={4}
                  style={{
                    cursor: "pointer",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    transition: "background-color 0.3s",
                    backgroundColor:
                      stats.notDelivered > 0 ? "#e6f7ff" : "transparent",
                    border:
                      stats.notDelivered > 0 ? "1px solid #1890ff" : "none",
                  }}
                  className="hover:bg-blue-100"
                  onClick={() => setStatusFilter("COMPLETED")}
                >
                  <CheckCircleOutlined
                    style={{ fontSize: 16, color: "#1890ff" }}
                  />
                  <Text strong style={{ fontSize: 14 }}>
                    Not Delivered:
                  </Text>
                  <Tag
                    color="cyan"
                    style={{ margin: 0, fontSize: 14, padding: "2px 8px" }}
                  >
                    {stats.notDelivered}
                  </Tag>
                </Space>
                <Space
                  size={4}
                  style={{
                    cursor: "pointer",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    transition: "background-color 0.3s",
                  }}
                  className="hover:bg-gray-100"
                  onClick={() => setStatusFilter("REQUESTED")}
                >
                  <CheckCircleOutlined
                    style={{ fontSize: 16, color: "#722ed1" }}
                  />
                  <Text strong style={{ fontSize: 14 }}>
                    Fly-on-Credit:
                  </Text>
                  <Tag
                    color="purple"
                    style={{ margin: 0, fontSize: 14, padding: "2px 8px" }}
                  >
                    {stats.flyOnCredit}
                  </Tag>
                </Space>
              </Space>
            </Col>
          </Row>
          {!shouldHidePrices && (
            <Row gutter={16} align="middle" style={{ marginTop: 12 }}>
              <Col flex="auto">
                <Space size={16}>
                  <Space size={4}>
                    <DollarOutlined
                      style={{ fontSize: 16, color: "#52c41a" }}
                    />
                    <Text strong style={{ fontSize: 14 }}>
                      Total Estimated:
                    </Text>
                    <Text type="success" style={{ fontSize: 14 }}>
                      ₹{stats.totalEstimatedCost?.toLocaleString() || 0}
                    </Text>
                  </Space>
                  <Space size={4}>
                    <DollarOutlined
                      style={{ fontSize: 16, color: "#1890ff" }}
                    />
                    <Text strong style={{ fontSize: 14 }}>
                      Total Actual:
                    </Text>
                    <Text style={{ fontSize: 14, color: "#1890ff" }}>
                      ₹{stats.totalActualCost?.toLocaleString() || 0}
                    </Text>
                  </Space>
                </Space>
              </Col>
            </Row>
          )}
          <Row gutter={16} align="middle">
            <Col span={8}>
              <Input
                placeholder="Search projects..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
              />
            </Col>
            <Col span={4}>
              <Select
                placeholder="Status"
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: "100%" }}
              >
                <Option value="all">All Status</Option>
                <Option value="DRAFT">Draft</Option>
                <Option value="ACTIVE">Active</Option>
                <Option value="COMPLETED">Completed</Option>
                <Option value="REOPEN">Reopen</Option>
                <Option value="REQUESTED">Fly-on-Credit</Option>
                <Option value="NO_INVOICE">No Invoice</Option>
                <Option value="CANCELLED">Cancelled</Option>
              </Select>
            </Col>
            <Col span={4}>
              <Select
                placeholder="Work Type"
                value={workTypeFilter}
                onChange={setWorkTypeFilter}
                style={{ width: "100%" }}
                allowClear={false}
              >
                <Option value="all">All Work Types</Option>
                {workTypesData?.workTypes?.map((workType) => (
                  <Option key={workType.id} value={workType.id}>
                    {workType.name}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col span={4}>
              <Select
                placeholder="Client"
                value={clientFilter}
                onChange={setClientFilter}
                style={{ width: "100%" }}
                showSearch
                allowClear
                optionFilterProp="children"
                filterOption={(input, option) => {
                  if (!input) return true;
                  const client = clientsData?.clients?.find(
                    (c) => c.id === option.value
                  );
                  if (!client) return false;
                  const searchText = [
                    client.clientCode,
                    client.displayName,
                    client.companyName,
                    client.firstName,
                    client.lastName,
                  ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();
                  return searchText.includes(input.toLowerCase());
                }}
                labelRender={(props) => {
                  if (props.value === "all") return "All Clients";
                  const client = clientsData?.clients?.find(
                    (c) => c.id === props.value
                  );
                  if (!client) return props.label;
                  return (
                    <span>
                      <strong>{client.clientCode}</strong> ({client.displayName}
                      )
                    </span>
                  );
                }}
              >
                <Option value="all">All Clients</Option>
                {clientsData?.clients?.map((client) => (
                  <Option key={client.id} value={client.id}>
                    <div>
                      <strong>{client.clientCode}</strong> ({client.displayName}
                      )
                    </div>
                  </Option>
                ))}
              </Select>
            </Col>
            <Col span={4} style={{ textAlign: "right" }}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() =>
                  showProjectFormDrawer(null, "create", refetchProjects)
                }
              >
                Create Project
              </Button>
            </Col>
          </Row>
        </Card>

        {/* Projects Table */}
        <Card>
          <Table
            columns={columns.filter(Boolean)}
            dataSource={filteredProjects}
            rowKey="id"
            loading={(projectsLoading || statsLoading) && !isLoadingMore}
            rowClassName={(record) =>
              record.creditRequest && record.creditRequest.status === "approved"
                ? "bg-yellow-50"
                : ""
            }
            pagination={false}
            scroll={{ x: 1200 }}
            size="small"
          />
          {isLoadingMore && (
            <div style={{ textAlign: "center", padding: "16px" }}>
              <Text type="secondary">Loading more projects...</Text>
            </div>
          )}
          {!hasMore && filteredProjects.length > 0 && (
            <div style={{ textAlign: "center", padding: "16px" }}>
              <Text type="secondary">No more projects to load</Text>
            </div>
          )}
        </Card>
      </div>

      {/* Project Completion Modal */}
      <Modal
        title="Complete Project"
        open={completeModalVisible}
        onOk={handleCompleteSubmit}
        onCancel={() => {
          setCompleteModalVisible(false);
          setSelectedProject(null);
          setActualImageCount(0);
        }}
        okText="Complete & Invoice"
        okButtonProps={{
          type: "primary",
          danger: false,
          style: { backgroundColor: "#52c41a", borderColor: "#52c41a" },
        }}
        width={600}
      >
        {selectedProject && (
          <div>
            <Alert
              message="Project Completion"
              description="All tasks have been completed. Please enter the actual number of images processed to calculate the final cost."
              type="info"
              showIcon
              style={{ marginBottom: 20 }}
            />

            <Descriptions
              title="Project Details"
              column={1}
              bordered
              size="small"
              style={{ marginBottom: 20 }}
            >
              <Descriptions.Item label="Project Code">
                {selectedProject.projectCode}
              </Descriptions.Item>
              <Descriptions.Item label="Client">
                {selectedProject.client?.clientCode}
              </Descriptions.Item>
              <Descriptions.Item label="Estimated Images">
                {selectedProject.imageQuantity}
              </Descriptions.Item>
              <Descriptions.Item label="Estimated Cost">
                ₹{selectedProject.estimatedCost?.toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="Rate per Image">
                ₹
                {Number(determineProjectRate(selectedProject)).toLocaleString()}
              </Descriptions.Item>
            </Descriptions>

            <Row gutter={16}>
              <Col span={12}>
                <div style={{ marginBottom: 8 }}>
                  <strong>Actual Images Processed *</strong>
                </div>
                <InputNumber
                  value={actualImageCount}
                  onChange={setActualImageCount}
                  min={1}
                  style={{ width: "100%" }}
                  placeholder="Enter actual image count"
                />
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 8 }}>
                  <strong>Calculated Actual Cost</strong>
                </div>
                <div
                  style={{
                    padding: "4px 11px",
                    backgroundColor: "#f5f5f5",
                    border: "1px solid #d9d9d9",
                    borderRadius: "6px",
                    minHeight: "32px",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      color: "#595959",
                      fontWeight: "bold",
                      fontSize: "16px",
                    }}
                  >
                    ₹
                    {(
                      (determineProjectRate(selectedProject) || 0) *
                      actualImageCount
                    )?.toLocaleString()}
                  </span>
                </div>
              </Col>
            </Row>

            <Alert
              message="Note"
              description={`The actual cost will be calculated as: ${actualImageCount} images × ₹${determineProjectRate(
                selectedProject
              ).toLocaleString()} = ₹${(
                (determineProjectRate(selectedProject) || 0) * actualImageCount
              )?.toLocaleString()}`}
              type="warning"
              showIcon
              style={{ marginTop: 16 }}
            />
          </div>
        )}
      </Modal>

      {/* Credit Approval Modal */}
      <Modal
        title="Approve Credit Request"
        open={creditApprovalModalVisible}
        onCancel={() => {
          setCreditApprovalModalVisible(false);
          setSelectedCreditRequest(null);
          setApprovalNotes("");
        }}
        footer={[
          <Button key="reject" danger onClick={handleRejectCreditRequest}>
            Reject
          </Button>,
          <Button
            key="approve"
            type="primary"
            onClick={handleApproveCreditRequest}
          >
            Approve
          </Button>,
        ]}
        width={700}
      >
        {selectedCreditRequest && (
          <div>
            <Alert
              message="Credit Limit Exceeded"
              description="This project exceeds the client's available credit limit. Review the details and approve or reject the request."
              type="warning"
              showIcon
              style={{ marginBottom: 20 }}
            />

            <Descriptions
              title="Project Details"
              column={2}
              bordered
              size="small"
              style={{ marginBottom: 20 }}
            >
              <Descriptions.Item label="Project Code" span={2}>
                {selectedCreditRequest.project?.projectCode}
              </Descriptions.Item>
              <Descriptions.Item label="Client">
                {selectedCreditRequest.project?.client?.displayName ||
                  selectedCreditRequest.project?.client?.clientCode}
              </Descriptions.Item>
              <Descriptions.Item label="Work Type">
                {selectedCreditRequest.project?.workType?.name}
              </Descriptions.Item>
              <Descriptions.Item label="Total Cost" span={2}>
                <Text strong style={{ color: "#ff4d4f", fontSize: "16px" }}>
                  ₹
                  {(
                    selectedCreditRequest.requestedAmount || 0
                  ).toLocaleString()}
                </Text>
              </Descriptions.Item>
            </Descriptions>

            <Card
              title="Credit Information"
              size="small"
              style={{ marginBottom: 20 }}
            >
              <Row gutter={[16, 16]}>
                <Col span={8}>
                  <Statistic
                    title="Available Credit"
                    value={selectedCreditRequest.availableCredit || 0}
                    prefix="₹"
                    valueStyle={{ color: "#52c41a" }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Requested Amount"
                    value={selectedCreditRequest.requestedAmount || 0}
                    prefix="₹"
                    valueStyle={{ color: "#ff4d4f" }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Excess Amount"
                    value={selectedCreditRequest.excessAmount || 0}
                    prefix="₹"
                    valueStyle={{ color: "#faad14" }}
                  />
                </Col>
              </Row>
            </Card>

            <div style={{ marginBottom: 16 }}>
              <Text strong>Approval Notes:</Text>
              <Input.TextArea
                rows={4}
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Add notes for approval or rejection (required for rejection)"
                style={{ marginTop: 8 }}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Invoice Generation Modal */}
      <Modal
        title="Generate Invoice"
        open={invoiceModalVisible}
        onOk={handleGenerateInvoice}
        onCancel={() => {
          setInvoiceModalVisible(false);
          setProjectToInvoice(null);
        }}
        okText="Generate Invoice"
        okButtonProps={{
          type: "primary",
          icon: <FileTextOutlined />,
        }}
        width={600}
      >
        {projectToInvoice && (
          <div>
            <Alert
              message="Invoice Generation"
              description="Review the project details below before generating the invoice."
              type="info"
              showIcon
              style={{ marginBottom: 20 }}
            />

            <Descriptions
              title="Project Details"
              column={1}
              bordered
              size="small"
              style={{ marginBottom: 20 }}
            >
              <Descriptions.Item label="Project Code">
                <Text strong>{projectToInvoice.projectCode}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Client">
                <Text strong>
                  {projectToInvoice.client?.displayName ||
                    projectToInvoice.client?.companyName ||
                    projectToInvoice.client?.clientCode}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag
                  color={
                    projectToInvoice.status === "completed"
                      ? "green"
                      : projectToInvoice.status === "active"
                        ? "blue"
                        : "default"
                  }
                >
                  {projectToInvoice.status?.toUpperCase()}
                </Tag>
              </Descriptions.Item>

              {/* Show grading details */}
              {projectToInvoice.projectGradings &&
                projectToInvoice.projectGradings.length > 0 ? (
                <>
                  <Descriptions.Item label="Gradings">
                    <Space
                      direction="vertical"
                      size="small"
                      style={{ width: "100%" }}
                    >
                      {projectToInvoice.projectGradings.map((pg, idx) => (
                        <div key={idx}>
                          <Text strong>{pg.grading?.name}</Text>
                          {" - "}
                          <Text>{pg.imageQuantity} images</Text>
                          {" × "}
                          <Text>
                            ₹
                            {(
                              pg.customRate ||
                              pg.grading?.defaultRate ||
                              0
                            ).toLocaleString()}
                          </Text>
                          {" = "}
                          <Text strong style={{ color: "#1890ff" }}>
                            ₹{(pg.estimatedCost || 0).toLocaleString()}
                          </Text>
                        </div>
                      ))}
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="Total Images">
                    <Text strong>
                      {projectToInvoice.totalImageQuantity || 0}
                    </Text>
                  </Descriptions.Item>
                </>
              ) : (
                <>
                  <Descriptions.Item label="Grading">
                    {projectToInvoice.grading?.name || "N/A"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Images">
                    <Text strong>{projectToInvoice.imageQuantity || 0}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Rate per Image">
                    ₹
                    {(
                      projectToInvoice.grading?.defaultRate || 0
                    ).toLocaleString()}
                  </Descriptions.Item>
                </>
              )}

              <Descriptions.Item label="Estimated Cost">
                <Text strong style={{ fontSize: "16px", color: "#52c41a" }}>
                  ₹
                  {(
                    projectToInvoice.totalEstimatedCost ||
                    projectToInvoice.estimatedCost ||
                    0
                  ).toLocaleString()}
                </Text>
              </Descriptions.Item>

              {projectToInvoice.totalActualCost > 0 && (
                <Descriptions.Item label="Actual Cost">
                  <Text strong style={{ fontSize: "16px", color: "#1890ff" }}>
                    ₹
                    {(
                      projectToInvoice.totalActualCost ||
                      projectToInvoice.actualCost ||
                      0
                    ).toLocaleString()}
                  </Text>
                </Descriptions.Item>
              )}
            </Descriptions>

            <Alert
              message="Confirmation"
              description="Click 'Generate Invoice' to create an invoice for this project. This action cannot be undone."
              type="warning"
              showIcon
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

// Project Details Component
const ProjectDetails = ({ project, tasks, tasksLoading, onBack }) => {
  const completedTasks = tasks.filter(
    (task) => task.status === "completed"
  ).length;
  const totalTasks = tasks.length;
  const progressPercent =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button onClick={onBack}>← Back to Projects</Button>
      </div>

      <Row gutter={16}>
        <Col span={16}>
          <Card title={project.projectCode} style={{ marginBottom: 16 }}>
            <Descriptions column={2}>
              <Descriptions.Item label="Project Number">
                <Text code>{project.projectNumber}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag
                  color={
                    (STATUS_MAP[project.status.toLowerCase()] || {}).color ||
                    "default"
                  }
                >
                  {(STATUS_MAP[project.status.toLowerCase()] || {}).label ||
                    project.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Client">
                {project.client ? getClientDisplayName(project.client) : "N/A"}
              </Descriptions.Item>
              <Descriptions.Item label="Work Type">
                {project.workType?.name || "N/A"}
              </Descriptions.Item>
              <Descriptions.Item label="Grading">
                {project.grading?.name || "N/A"} - ₹
                {project.grading?.defaultRate || 0}
              </Descriptions.Item>
              <Descriptions.Item label="Budget">
                {project.estimatedCost
                  ? `₹${project.estimatedCost.toLocaleString()}`
                  : "N/A"}
              </Descriptions.Item>
              <Descriptions.Item label="Deadline">
                {project.deadlineDate
                  ? dayjs(project.deadlineDate).format("MMMM DD, YYYY")
                  : "No deadline"}
              </Descriptions.Item>
              <Descriptions.Item label="Created">
                {dayjs(project.createdAt).format("MMMM DD, YYYY")}
              </Descriptions.Item>
            </Descriptions>

            {project.description && (
              <>
                <Divider />
                <Text strong>Description:</Text>
                <div style={{ marginTop: 8 }}>
                  <Text>{project.description}</Text>
                </div>
              </>
            )}
          </Card>

          <Card title="Project Tasks" loading={tasksLoading}>
            {tasks.length > 0 ? (
              <Table
                dataSource={tasks}
                rowKey="id"
                pagination={false}
                size="small"
                columns={[
                  {
                    title: "Task Number",
                    dataIndex: "taskNumber",
                    key: "taskNumber",
                    render: (text) => <Text code>{text}</Text>,
                  },
                  {
                    title: "Description",
                    dataIndex: "description",
                    key: "description",
                  },
                  {
                    title: "Status",
                    dataIndex: "status",
                    key: "status",
                    render: (status) => (
                      <Tag
                        color={
                          status === "completed"
                            ? "green"
                            : status === "IN_PROGRESS"
                              ? "blue"
                              : "orange"
                        }
                      >
                        {status}
                      </Tag>
                    ),
                  },
                  {
                    title: "Assigned To",
                    dataIndex: ["assignedTo", "firstName"],
                    key: "assignedTo",
                    render: (firstName, record) =>
                      firstName
                        ? `${firstName} ${record.assignedTo?.lastName || ""}`
                        : "Unassigned",
                  },
                  {
                    title: "Created",
                    dataIndex: "createdAt",
                    key: "createdAt",
                    render: (date) => dayjs(date).format("MMM DD, YYYY"),
                  },
                ]}
              />
            ) : (
              <Empty description="No tasks created yet" />
            )}
          </Card>
        </Col>

        <Col span={8}>
          <Card title="Project Progress" style={{ marginBottom: 16 }}>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <Progress
                type="circle"
                percent={progressPercent}
                format={() => `${completedTasks}/${totalTasks}`}
              />
            </div>
            <Statistic
              title="Tasks completed"
              value={completedTasks}
              suffix={`/ ${totalTasks}`}
            />
          </Card>

          <Card title="Project Timeline">
            <Timeline
              items={[
                {
                  children: `Created on ${dayjs(project.createdAt).format(
                    "MMM DD, YYYY"
                  )}`,
                  color: "blue",
                },
                project.status === "ACTIVE" && {
                  children: "Project activated",
                  color: "green",
                },
                project.deadlineDate && {
                  children: `Deadline: ${dayjs(project.deadlineDate).format(
                    "MMM DD, YYYY"
                  )}`,
                  color: dayjs(project.deadlineDate).isAfter(dayjs())
                    ? "orange"
                    : "red",
                },
              ].filter(Boolean)}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ProjectManagement;
