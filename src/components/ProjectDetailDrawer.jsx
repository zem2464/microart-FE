import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from "react";
import { useReactiveVar } from "@apollo/client";
import {
  Spin,
  Alert,
  Typography,
  Tag,
  Tooltip,
  Empty,
  Statistic,
  Row,
  Col,
  Card,
  Progress,
  Input,
  Button,
  Space,
  message,
  Descriptions,
  Table,
  Modal,
  Select,
  DatePicker,
} from "antd";
import {
  ClockCircleOutlined,
  FolderOutlined,
  CopyOutlined,
  EditOutlined,
  CalendarOutlined,
  ReloadOutlined,
  FilePdfOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
  GET_PROJECT_DETAIL,
  GET_AVAILABLE_USERS,
} from "../graphql/projectQueries";
import { GET_TASKS } from "../gql/tasks";
import { GET_GRADINGS_BY_WORK_TYPES } from "../gql/gradings";
import { GET_PROJECT_AUDIT_HISTORY } from "../gql/auditLogs";
import AuditDisplay from "./common/AuditDisplay.jsx";
import TasksTable from "./common/TasksTable";
import { generateBaseColumns } from "./common/TasksTableColumns";
import { useAppDrawer } from "../contexts/DrawerContext";
import { AppDrawerContext } from "../contexts/DrawerContext";
import ProjectDetailHeader from "./ProjectDetailHeader";
import ProjectDetailModals from "./ProjectDetailModals";
import ProjectReminderNotesPopover from "./ProjectReminderNotesPopover.jsx";
import ReminderNotesModal from "./ReminderNotesModal";
import { useProjectDetailData } from "../hooks/useProjectDetailData";
import { useProjectActions } from "../hooks/useProjectActions";
import {
  hasPermission,
  MODULES,
  ACTIONS,
  generatePermission,
} from "../config/permissions";
import { generateQuotationPDF } from "../utils/quotationPDF";
import { userCacheVar } from "../cache/userCacheVar";

const { Title, Text } = Typography;

// Project status configuration
const STATUS_MAP = {
  DRAFT: { label: "Draft", color: "default" },
  ACTIVE: { label: "Active", color: "green" },
  IN_PROGRESS: { label: "In Progress", color: "processing" },
  REVIEW: { label: "Review", color: "cyan" },
  REOPEN: { label: "Reopen", color: "geekblue" },
  COMPLETED: { label: "Completed", color: "success" },
  ON_HOLD: { label: "On Hold", color: "warning" },
  DELIVERED: { label: "Delivered", color: "purple" },
  REQUESTED: { label: "Pending Approval", color: "purple" },
};

/**
 * Optimized ProjectDetailDrawer Component
 * Refactored to use custom hooks and memoized child components
 * to prevent unnecessary re-renders and improve performance
 */
const ProjectDetailDrawer = ({ projectId, onAction }) => {
  const currentUser = useReactiveVar(userCacheVar);
  const { updateProjectDetailDrawerTitle, closeProjectDetailDrawerV2 } = useAppDrawer();
  const drawerCtx = React.useContext(AppDrawerContext);

  // Local state
  const [projectNotesInput, setProjectNotesInput] = useState("");
  const [clientNotesInput, setClientNotesInput] = useState("");
  const [quoteVisible, setQuoteVisible] = useState(false);
  const [quoteData, setQuoteData] = useState(null);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [statusValue, setStatusValue] = useState("");
  const [dueDateModalVisible, setDueDateModalVisible] = useState(false);
  const [dueDateValue, setDueDateValue] = useState(null);
  const [reminderNotesModalVisible, setReminderNotesModalVisible] = useState(false);

  // Custom hook for data fetching (eliminates ~150 lines of query code)
  const {
    project,
    tasks,
    auditLogs,
    users,
    workTypes: allWorkTypes,
    gradings: gradingsData,
    loading,
    error,
    refetch,
  } = useProjectDetailData(projectId);

  // Custom hook for mutations (eliminates ~100 lines of mutation code)
  const {
    updateProject: updateProjectMutation,
    updateClient: updateClientMutation,
    deleteProject: deleteProjectMutation,
    generateInvoice,
    invoicing,
  } = useProjectActions({
    refetch,
    onAction,
    closeDrawer: closeProjectDetailDrawerV2,
  });

  // Aliases for backward compatibility with existing code
  const auditData = { projectAuditHistory: auditLogs };
  const auditLoading = loading.audit;
  const isInitialLoad = loading.project;
  const isRefetching = false; // Network status not exposed from hook
  const cachedProject = project; // Hook handles caching internally

  // Permissions
  const hasLimitedRead = hasPermission(
    currentUser,
    generatePermission(MODULES.PROJECTS, ACTIONS.LIMTEREAD)
  );
  const hasLimitedEdit = hasPermission(
    currentUser,
    generatePermission(MODULES.PROJECTS, ACTIONS.LIMITEDIT)
  );
  const canShowQuote =
    ["ACTIVE", "IN_PROGRESS", "COMPLETED", "DELIVERED"].includes(
      (project?.status || "").toString().toUpperCase()
    ) &&
    !(project?.invoiceId || project?.invoice?.id) &&
    !hasLimitedRead &&
    !hasLimitedEdit;
  const hasInvoice = !!(project?.invoiceId || project?.invoice?.id);
  const completedTasks = tasks.filter(
    (task) => (task.status || "").toString().toUpperCase() === "COMPLETED"
  ).length;
  const totalTasks = tasks.length || 0;
  const allTasksCompleted = totalTasks > 0 && completedTasks === totalTasks;

  const canCreateFinance = hasPermission(
    currentUser,
    generatePermission(MODULES.FINANCE, ACTIONS.CREATE)
  );
  const canDeleteProjects = hasPermission(
    currentUser,
    generatePermission(MODULES.PROJECTS, ACTIONS.DELETE)
  );
  const canApproveProjects = hasPermission(
    currentUser,
    generatePermission(MODULES.PROJECTS, ACTIONS.APPROVE)
  );
  const canEditProjects = hasPermission(
    currentUser,
    generatePermission(MODULES.PROJECTS, ACTIONS.UPDATE)
  );

  // Memoized helper functions
  const buildQuoteFromProject = useCallback((proj) => {
    if (!proj) return null;
    const now = dayjs();
    const identifier =
      proj.projectCode || proj.projectNumber || proj.id || "PROJECT";
    const items = (proj.projectGradings || []).length
      ? proj.projectGradings.map((pg, idx) => {
        const quantity = Number(pg.imageQuantity || 0);
        const rate = Number(
          pg.customRate !== undefined && pg.customRate !== null
            ? pg.customRate
            : pg.grading?.defaultRate || 0
        );
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
          description: proj.grading?.name || "Service",
          quantity:
            proj.imageQuantity ||
            proj.totalImageQuantity ||
            proj.imageQuantityInvoiced ||
            0,
          rate: Number(proj.grading?.defaultRate || 0),
        },
      ].map((item) => ({ ...item, amount: item.quantity * item.rate }));

    const subtotal = items.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0
    );
    const discountAmount = Math.max(Number(proj.discountAmount || 0), 0);
    const taxableBase = Math.max(subtotal - discountAmount, 0);
    const taxRate = Number(
      proj.taxRate || proj.taxPercent || proj.taxPercentage || 0
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
      validUntil: proj.quoteValidUntil || now.add(7, "day").toISOString(),
      client: proj.client,
      project: proj,
      items,
      subtotal,
      discountAmount,
      taxRate,
      taxAmount,
      totalAmount,
      totalImages,
      notes: proj.description,
    };
  }, []);

  const handleOpenQuote = useCallback(() => {
    const draft = buildQuoteFromProject(project);
    setQuoteData(draft);
    setQuoteVisible(true);
  }, [project, buildQuoteFromProject]);

  const handleEditProject = useCallback(() => {
    drawerCtx?.showProjectFormDrawer?.(project, "edit", () => {
      refetch.all();
    });
  }, [project, drawerCtx, refetch]);

  const handleSaveStatus = useCallback(async (nextValue) => {
    const valueToSave = (nextValue ?? statusValue) || "";
    if (!valueToSave) return;

    // Validate DELIVERED status change
    if (valueToSave.toLowerCase() === "delivered") {
      if (!project) {
        message.error("Project not found");
        return;
      }

      // If project has invoice, validate based on client type
      if (project.invoice || project.invoiceId) {
        const clientType = project.client?.clientType;
        const hasApprovePermission = hasPermission(
          currentUser,
          generatePermission(MODULES.PROJECTS, ACTIONS.APPROVE)
        );
        const isPaid =
          project.invoice?.status === "fully_paid" ||
          (project.invoice?.balanceAmount !== undefined &&
            project.invoice?.balanceAmount <= 0);

        if (clientType === "walkIn") {
          // Walk-in clients with invoice: Need permission AND payment
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
        // Permanent clients with invoice: No additional checks
      }
      // Projects without invoice can be marked as delivered (no validation required)
    }

    // Validate REOPEN status change
    if (valueToSave.toLowerCase() === "reopen") {
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
      message.loading({ content: "Updating status...", key: "status" });
      await updateProjectMutation({
        id: project.id,
        input: { status: valueToSave.toUpperCase() },
      });
      message.success({
        content: "Status updated",
        key: "status",
        duration: 2,
      });
      setStatusModalVisible(false);
      setStatusValue(valueToSave);
      // Refetch handled by mutation hook
    } catch (err) {
      message.error({ content: err.message, key: "status" });
    }
  }, [statusValue, updateProjectMutation, project, currentUser]);

  // Memoize the title element to prevent unnecessary re-renders
  const titleElement = useMemo(() => {
    if (!project) return "Project Details";

    const statusConfig = STATUS_MAP[project.status?.toUpperCase()] || {};
    const clientType = project?.client?.clientType;
    const isPaid = !!(
      project?.invoice?.status === "fully_paid" ||
      (project?.invoice?.balanceAmount ?? 0) <= 0
    );

    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          paddingRight: 24,
        }}
      >
        <Space size="middle">
          <span>{project.projectCode}</span>
          <span style={{ color: "#8c8c8c", fontWeight: "normal" }}>|</span>
          <span style={{ fontWeight: "normal" }}>{project.name}</span>
          <Tag color={statusConfig.color || "blue"}>
            {statusConfig.label || project.status}
          </Tag>
          <ProjectReminderNotesPopover projectId={project?.id} />
        </Space>
        <Space>
          {canEditProjects &&
            !project.invoice && !project.invoiceId && (
              <Button
                type="primary"
                icon={<EditOutlined />}
                size="small"
                onClick={handleEditProject}
              >
                Edit
              </Button>
            )}
          {canEditProjects &&
            (project.invoice || project.invoiceId) && (
              <Tooltip title="Cannot edit: Invoice generated">
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  size="small"
                  disabled
                  style={{ opacity: 0.5, cursor: "not-allowed" }}
                >
                  Edit
                </Button>
              </Tooltip>
            )}
          {canEditProjects && (
            <Select
              value={statusValue}
              onChange={(value) => {
                // Save immediately with the selected value to avoid stale state
                setStatusValue(value);
                handleSaveStatus(value);
              }}
              style={{ width: 150 }}
              size="small"
              placeholder="Change Status"
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? "")
                  .toString()
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              options={(() => {
                const options = Object.entries(STATUS_MAP).map(
                  ([key, cfg]) => ({
                    value: key.toLowerCase(),
                    label: cfg.label,
                    color: cfg.color,
                  })
                );
                const isCompleted =
                  (project?.status || "").toLowerCase() === "completed";
                const isDelivered =
                  (project?.status || "").toLowerCase() === "delivered";

                // If project has invoice OR is delivered (without invoice), only show REOPEN option
                let filtered;
                if (hasInvoice || isDelivered) {
                  // Projects with invoices or delivered: Only allow changing to REOPEN
                  filtered = options.filter((opt) => opt.value === "reopen");
                } else if (isCompleted) {
                  // If project is completed (no invoice), show ONLY delivered or reopen option
                  filtered = options.filter(
                    (opt) => opt.value === "delivered" || opt.value === "reopen"
                  );
                } else {
                  // All other statuses: show all options
                  filtered = options;
                }

                return filtered.map((option) => {
                  let disabled = false;
                  let title = "";

                  if (option.value === "delivered") {
                    // Only restrict if project has invoice AND is walk-in client AND invoice not paid
                    if (hasInvoice && clientType === "walkIn") {
                      // Walk-in with invoice: Need permission AND payment
                      if (!canApproveProjects) {
                        disabled = true;
                        title =
                          "Permission required to deliver walk-in projects";
                      } else if (!isPaid) {
                        disabled = true;
                        title = "Invoice must be paid for walk-in projects";
                      }
                    }
                    // For projects without invoice or permanent clients: No restrictions
                  } else if (option.value === "reopen") {
                    // Reopen allowed only if invoice is not completed/fully paid
                    if (isPaid) {
                      disabled = true;
                      title = "Cannot reopen when invoice is fully paid";
                    }
                  }

                  return {
                    ...option,
                    disabled,
                    label: disabled ? (
                      <Tooltip title={title}>{option.label} 🔒</Tooltip>
                    ) : (
                      option.label
                    ),
                  };
                });
              })()}
            />
          )}
          {canEditProjects && (
            <Button
              icon={<CalendarOutlined />}
              size="small"
              onClick={() => setDueDateModalVisible(true)}
            >
              Change Due Date
            </Button>
          )}
          <Button
            icon={<FileTextOutlined />}
            size="small"
            onClick={() => setReminderNotesModalVisible(true)}
          >
            Add Note
          </Button>
          <Button
            icon={<ReloadOutlined />}
            size="small"
            onClick={() => {
              refetch.project();
              refetch.tasks();
              refetch.audit();
            }}
          >
            Refresh
          </Button>
          {(project.status || "").toString().toUpperCase() === "ACTIVE" &&
            allTasksCompleted &&
            !(project.invoiceId || project.invoice?.id) &&
            !hasLimitedRead &&
            !hasLimitedEdit &&
            (canCreateFinance || project.client?.leaderId === currentUser?.id) && (
              <Tooltip title="Complete & Generate Invoice">
                <Button
                  size="small"
                  icon={<FileTextOutlined />}
                  style={{ color: "#fa8c16" }}
                  onClick={() => {
                    // Implement complete project logic similar to ProjectManagement
                    message.info("Complete & Generate Invoice functionality");
                  }}
                >
                  Complete & Invoice
                </Button>
              </Tooltip>
            )}
          {["COMPLETED", "DELIVERED"].includes(
            (project.status || "").toString().toUpperCase()
          ) &&
            !(project.invoiceId || project.invoice?.id) &&
            !hasLimitedRead &&
            !hasLimitedEdit &&
            (canCreateFinance || project.client?.leaderId === currentUser?.id) && (
              <Tooltip title="Generate Invoice">
                <Button
                  size="small"
                  icon={<FileTextOutlined />}
                  style={{ color: "#1890ff" }}
                  onClick={() => {
                    if (generateInvoice && project?.id) {
                      generateInvoice({ projectId: project.id });
                    }
                  }}
                >
                  Generate Invoice
                </Button>
              </Tooltip>
            )}
          {(project.invoice?.id || project.invoiceId) &&
            !hasLimitedRead &&
            !hasLimitedEdit && (
              <Tooltip title="View Invoice">
                <Button
                  size="small"
                  icon={<FileTextOutlined />}
                  onClick={() => {
                    const invoiceId = project.invoice?.id || project.invoiceId;
                    if (drawerCtx?.showInvoiceDetailDrawer) {
                      drawerCtx.showInvoiceDetailDrawer(invoiceId);
                    }
                  }}
                >
                  View Invoice
                </Button>
              </Tooltip>
            )}
          {canShowQuote && (
            <Button
              size="small"
              icon={<FilePdfOutlined />}
              onClick={handleOpenQuote}
            >
              View Quote
            </Button>
          )}
          {![("COMPLETED"), "DELIVERED"].includes(
            (project.status || "").toString().toUpperCase()
          ) &&
            canDeleteProjects && (
              <Tooltip title="Delete">
                <Button
                  danger
                  size="small"
                  onClick={() => {
                    Modal.confirm({
                      title: "Delete project?",
                      content: "This action cannot be undone.",
                      okType: "danger",
                      onOk: () =>
                        deleteProjectMutation({ id: project.id }),
                    });
                  }}
                >
                  Delete
                </Button>
              </Tooltip>
            )}
        </Space>
      </div>
    );
  }, [
    project,
    statusValue,
    canEditProjects,
    canShowQuote,
    canDeleteProjects,
    canApproveProjects,
    hasInvoice,
    handleEditProject,
    handleSaveStatus,
    handleOpenQuote,
    deleteProjectMutation,
    refetch.project,
    refetch.tasks,
    refetch.audit,
  ]);

  // Track previous title key values to prevent unnecessary updates
  const prevTitleKey = useRef("");

  // Update drawer title when title element changes
  useEffect(() => {
    if (project) {
      setStatusValue((project.status || "").toLowerCase());
      setDueDateValue(
        project.deadlineDate ? dayjs(project.deadlineDate) : null
      );
    }
  }, [project]);

  // Update drawer title only when meaningful values change
  useEffect(() => {
    // Create a key from values that should trigger title update
    const titleKey = `${project?.id}-${project?.projectCode}-${project?.name}-${project?.status}-${statusValue}`;

    // Only update if the key has actually changed
    if (titleKey !== prevTitleKey.current) {
      prevTitleKey.current = titleKey;
      updateProjectDetailDrawerTitle(titleElement);
    }
  }, [project?.id, project?.projectCode, project?.name, project?.status, statusValue, titleElement, updateProjectDetailDrawerTitle]);

  useEffect(() => {
    setProjectNotesInput(project?.notes || "");
    const clientNotesFromTasks =
      Array.isArray(tasks) && tasks.length > 0
        ? tasks[0]?.project?.client?.clientNotes || tasks[0]?.clientNotes
        : null;
    setClientNotesInput(clientNotesFromTasks || "");
  }, [project?.notes, tasks]);

  const handleUpdateNotes = async () => {
    try {
      const mutations = [];
      if (project?.id) {
        mutations.push(
          updateProjectMutation({
            id: project.id,
            input: { notes: projectNotesInput },
          })
        );
      }
      const clientId = project?.client?.id || tasks[0]?.project?.client?.id;
      if (clientId && clientNotesInput) {
        mutations.push(
          updateClientMutation({
            id: clientId,
            input: { clientNotes: clientNotesInput },
          })
        );
      }
      await Promise.all(mutations);
      message.success("Notes updated successfully");
      refetch.all();
    } catch (e) {
      message.error(`Failed to update notes: ${e.message}`);
    }
  };

  // Base columns for TasksTable - show all columns except project/client/dates
  const baseColumns = generateBaseColumns({
    showProjectCode: false, // Hide project column (we're in project detail)
    showClientInfo: false, // Hide client column (we're in project detail)
    showOrderDate: false, // Hide order date (shown in header)
    showGrading: true, // Show grading column (multiple gradings per project)
    showPriority: true, // Show priority
  });

  // Generate folder name matching ProjectManagement format
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
    if (
      project.projectGradings &&
      Array.isArray(project.projectGradings) &&
      project.projectGradings.length > 0
    ) {
      const gradingParts = project.projectGradings
        .filter((pg) => pg.grading && pg.imageQuantity)
        .map((pg) => {
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

    return parts.join(" ");
  };

  // Handler to copy folder name to clipboard
  const handleCopyFolderName = () => {
    if (!project) return;
    const folderName = generateFolderName(project);

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
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = folderName;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        message.success("Folder name copied to clipboard!");
      } catch (err) {
        message.error("Failed to copy folder name");
      }
      document.body.removeChild(textArea);
    }
  };

  const handleSaveDueDate = async () => {
    try {
      message.loading({ content: "Updating due date...", key: "due" });
      await updateProjectMutation({
        id: project.id,
        input: {
          deadlineDate: dueDateValue
            ? dueDateValue.toDate().toISOString()
            : null,
        },
      });
      message.success({ content: "Due date updated", key: "due", duration: 2 });
      setDueDateModalVisible(false);
      // Refetch handled by mutation hook
    } catch (err) {
      message.error({ content: err.message, key: "due" });
    }
  };

  const handleDownloadQuote = async () => {
    if (!quoteData) return;
    try {
      message.loading({ content: "Generating quote PDF...", key: "quote-pdf" });
      await generateQuotationPDF(quoteData);
      message.success({
        content: "Quotation downloaded",
        key: "quote-pdf",
        duration: 2,
      });
    } catch (err) {
      console.error("Quote PDF error", err);
      message.error({
        content: "Failed to generate quotation",
        key: "quote-pdf",
        duration: 2,
      });
    }
  };

  // Structure data for table display using projectWorkTypes
  const getWorkTypeTabsData = () => {
    if (
      !project ||
      !project.projectWorkTypes ||
      project.projectWorkTypes.length === 0
    )
      return [];

    const projectGradings = project.projectGradings || [];
    if (projectGradings.length === 0) return [];

    // Sort projectWorkTypes by workType.sortOrder to maintain BackOffice configuration order
    const sortedProjectWorkTypes = [...project.projectWorkTypes].sort(
      (a, b) => {
        const workTypeA = allWorkTypes.find((wt) => wt.id === a.workTypeId);
        const workTypeB = allWorkTypes.find((wt) => wt.id === b.workTypeId);
        const sortOrderA = workTypeA?.sortOrder ?? 999;
        const sortOrderB = workTypeB?.sortOrder ?? 999;

        // Sort by sortOrder first, then by name
        if (sortOrderA !== sortOrderB) {
          return sortOrderA - sortOrderB;
        }
        const nameA = workTypeA?.name || "";
        const nameB = workTypeB?.name || "";
        return nameA.localeCompare(nameB);
      }
    );

    // Create tabs based on sorted projectWorkTypes
    return sortedProjectWorkTypes
      .map((projectWorkType) => {
        const workTypeId = projectWorkType.workTypeId;
        const workTypeName = projectWorkType.workType?.name || "Unknown";

        // Find the full work type configuration with task types
        const fullWorkType = allWorkTypes.find((wt) => wt.id === workTypeId);
        const taskTypes = fullWorkType?.taskTypes || [];

        // Filter gradings to only include those belonging to this workType
        // If grading.workType is null, use gradings data or tasks data to determine workType
        const workTypeGradings = projectGradings.filter((pg) => {
          const gradingId = pg.gradingId || pg.grading?.id;
          const gradingWorkTypeId = pg.grading?.workType?.id;

          // Primary: If grading already has workType populated, use it
          if (gradingWorkTypeId) {
            return String(gradingWorkTypeId) === String(workTypeId);
          }

          // Fallback 1: Check gradings data fetched from GraphQL
          // This query returns all gradings for the project's workTypes with workType populated
          if (gradingsData?.gradingsByWorkType?.length > 0) {
            const fetchedGrading = gradingsData.gradingsByWorkType.find(
              (g) => String(g.id) === String(gradingId)
            );
            // If grading is found in fetched data and matches this workType, include it
            if (fetchedGrading?.workType?.id) {
              return String(fetchedGrading.workType.id) === String(workTypeId);
            }
            // If grading not in fetched data, exclude it (doesn't belong to any project workType)
            return false;
          }

          // Fallback 2: If gradings data not loaded yet, check tasks for workType info
          const hasTaskInWorkType = tasks.some((task) => {
            const taskGradingId = task.gradingTask?.grading?.id;
            if (String(taskGradingId) !== String(gradingId)) return false;

            const taskProjectGradings = task.project?.projectGradings || [];
            const matchingGrading = taskProjectGradings.find(
              (tpg) => String(tpg.grading?.id) === String(gradingId)
            );
            const taskGradingWorkTypeId =
              matchingGrading?.grading?.workType?.id;
            return (
              taskGradingWorkTypeId &&
              String(taskGradingWorkTypeId) === String(workTypeId)
            );
          });

          return hasTaskInWorkType;
        });

        // Map each grading to a row with its tasks
        const gradings = workTypeGradings
          .map((projectGrading) => {
            const grading = projectGrading.grading;
            if (!grading) return null;

            const gradingId = projectGrading.gradingId || grading.id;

            // Get ALL tasks for this specific grading
            const gradingTasks = tasks.filter((task) => {
              const taskGradingId = task.gradingTask?.grading?.id;
              return (
                taskGradingId && String(taskGradingId) === String(gradingId)
              );
            });

            // Organize tasks by task type for display
            const tasksByType = {};
            gradingTasks.forEach((task) => {
              const taskTypeId = task.taskType?.id
                ? String(task.taskType.id)
                : "no-tasktype";
              tasksByType[taskTypeId] = task;
            });

            // Prefer shortCode from tasks.project.projectGradings for the matching grading
            const shortCodeFromTasks = gradingTasks
              .map((task) => {
                const direct = task.gradingTask?.grading?.shortCode || null;
                if (direct) return direct;
                const pg = task.project?.projectGradings || [];
                const match = pg.find((g) => g.grading?.id === grading.id);
                return match?.grading?.shortCode || null;
              })
              .find((code) => !!code);

            // Get dueDate from first task
            const firstTask = gradingTasks[0];
            const taskDueDate = firstTask?.dueDate || null;

            return {
              gradingId: gradingId,
              gradingName: grading.name || grading.shortCode || null,
              gradingShortCode: shortCodeFromTasks || grading.shortCode || null,
              imageQuantity: projectGrading.imageQuantity,
              estimatedCost: projectGrading.estimatedCost,
              actualCost: projectGrading.actualCost,
              tasksByType,
              projectId: project.id,
              orderDate: project.createdAt,
              dueDate: taskDueDate,
              priority: project.priority,
            };
          })
          .filter(Boolean); // Remove null gradings

        // Show workType even if no gradings (might have tasks without gradings)
        // Only skip if workType has no gradings at all in the project
        if (workTypeGradings.length === 0) return null;

        return {
          workTypeId,
          workTypeName,
          taskTypes,
          gradings,
        };
      })
      .filter(Boolean); // Remove null work types
  };

  const workTypeTabs = getWorkTypeTabsData() || [];

  if (error) {
    return (
      <Alert
        message="Error Loading Project"
        description={error.message}
        type="error"
        showIcon
      />
    );
  }

  // Show spinner only on initial load, not on refetch
  if (isInitialLoad) {
    return (
      <div style={{ textAlign: "center", padding: "100px 0" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!project) {
    return <Empty description="Project not found" />;
  }

  return (
    <div style={{ padding: "0", position: "relative", overflow: "auto" }}>
      {/* Subtle loading indicator when refetching - doesn't block content */}
      {isRefetching && cachedProject && (
        <div
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            gap: 8,
            backgroundColor: "rgba(24, 144, 255, 0.1)",
            padding: "8px 16px",
            borderRadius: "4px",
            border: "1px solid #1890ff",
          }}
        >
          <Spin size="small" />
          <span style={{ color: "#1890ff", fontSize: "12px" }}>
            Updating...
          </span>
        </div>
      )}

      {/* Project Details Card */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 12]}>
          {/* Client Row */}
          <Col span={24}>
            <Space>
              <Text strong>Client:</Text>
              <Text>
                {project.client?.displayName} ({project.client?.clientCode})
              </Text>
            </Space>
          </Col>

          {/* Dates Row */}
          <Col span={8}>
            <Space>
              <CalendarOutlined style={{ color: "#1890ff" }} />
              <Text strong>Order Date:</Text>
              <Text>
                {project.createdAt
                  ? dayjs(project.createdAt).format("DD-MM-YYYY")
                  : "-"}
              </Text>
            </Space>
          </Col>
          <Col span={8}>
            <Space>
              <ClockCircleOutlined style={{ color: "#faad14" }} />
              <Text strong>Due Date:</Text>
              <Text>
                {tasks[0]?.dueDate
                  ? dayjs(tasks[0].dueDate).format("DD-MM-YYYY")
                  : "-"}
              </Text>
            </Space>
          </Col>
          <Col span={8}>
            <Space>
              <CalendarOutlined style={{ color: "#52c41a" }} />
              <Text strong>Deadline:</Text>
              <Text>
                {project.deadlineDate
                  ? dayjs(project.deadlineDate).format("DD-MM-YYYY")
                  : "-"}
              </Text>
            </Space>
          </Col>

          {/* Folder Name Row */}
          <Col span={24}>
            <Space>
              <FolderOutlined />
              <Text strong>Folder Name:</Text>
              <Space size={4}>
                <Tooltip title="Copy folder name">
                  <Button
                    type="text"
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={handleCopyFolderName}
                    style={{ padding: "0 4px" }}
                  />
                </Tooltip>
                <Text copyable>{generateFolderName(project)}</Text>
              </Space>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Notes Section */}
      <Card
        title={<Title level={4}>Notes</Title>}
        size="small"
        style={{ marginBottom: 16 }}
      >
        <Row gutter={12}>
          <Col span={12}>
            <Text strong>Project Internal Notes:</Text>
            <Input.TextArea
              rows={4}
              value={projectNotesInput}
              onChange={(e) => setProjectNotesInput(e.target.value)}
              placeholder="Enter project internal notes"
              disabled={!canEditProjects}
            />
          </Col>
          <Col span={12}>
            <Text strong>Client Notes:</Text>
            <Input.TextArea
              rows={4}
              value={clientNotesInput}
              onChange={(e) => setClientNotesInput(e.target.value)}
              placeholder="Enter client notes"
              disabled={!canEditProjects}
            />
          </Col>
        </Row>
        <div style={{ marginTop: 12, textAlign: "right" }}>
          <Button
            type="primary"
            onClick={handleUpdateNotes}
            disabled={!canEditProjects}
          >
            Update Notes
          </Button>
        </div>
      </Card>

      {/* Client Information Section */}
      {project?.client && (
        <Card
          title={<Title level={4}>Client Information</Title>}
          size="small"
          style={{ marginBottom: 16 }}
        >
          <Row gutter={[24, 12]}>
            {/* Client Notes */}
            <Col span={8}>
              <Text
                style={{
                  fontSize: "12px",
                  color: "#6B778C",
                  display: "block",
                  marginBottom: "8px",
                }}
              >
                <strong>Client Notes</strong>
              </Text>
              {project.client.clientNotes ? (
                <Tag
                  color="blue"
                  style={{
                    fontSize: "13px",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    maxWidth: "100%",
                    whiteSpace: "normal",
                    height: "auto",
                  }}
                >
                  {project.client.clientNotes}
                </Tag>
              ) : (
                <Tag
                  style={{
                    fontSize: "13px",
                    padding: "6px 12px",
                    borderRadius: "6px",
                  }}
                >
                  -
                </Tag>
              )}
            </Col>

            {/* Color Correction Style */}
            <Col span={8}>
              <Text
                style={{
                  fontSize: "12px",
                  color: "#6B778C",
                  display: "block",
                  marginBottom: "8px",
                }}
              >
                <strong>Color Correction Style</strong>
              </Text>
              {project.client.colorCorrectionStyle ? (
                <Tag
                  color="cyan"
                  style={{
                    fontSize: "13px",
                    padding: "6px 12px",
                    borderRadius: "6px",
                  }}
                >
                  {project.client.colorCorrectionStyle}
                </Tag>
              ) : (
                <Tag
                  style={{
                    fontSize: "13px",
                    padding: "6px 12px",
                    borderRadius: "6px",
                  }}
                >
                  -
                </Tag>
              )}
            </Col>

            {/* Transfer Mode */}
            <Col span={8}>
              <Text
                style={{
                  fontSize: "12px",
                  color: "#6B778C",
                  display: "block",
                  marginBottom: "8px",
                }}
              >
                <strong>Transfer Mode</strong>
              </Text>
              {project.client.transferMode ? (
                <Tag
                  color="purple"
                  style={{
                    fontSize: "13px",
                    padding: "6px 12px",
                    borderRadius: "6px",
                  }}
                >
                  {project.client.transferMode}
                </Tag>
              ) : (
                <Tag
                  style={{
                    fontSize: "13px",
                    padding: "6px 12px",
                    borderRadius: "6px",
                  }}
                >
                  -
                </Tag>
              )}
            </Col>
          </Row>
        </Card>
      )}

      {/* Custom Fields Section */}
      {project?.customFields &&
        typeof project.customFields === "object" &&
        Object.keys(project.customFields).length > 0 && (
          <Card
            title={<Title level={4}>Additional Fields</Title>}
            size="small"
            style={{ marginBottom: 16 }}
          >
            <Row gutter={[24, 12]}>
              {Object.entries(project.customFields).map(
                ([fieldKey, fieldValue], index) => {
                  // Format field label from key
                  const formatFieldLabel = (key) => {
                    return key
                      .replace(/([A-Z])/g, " $1") // Add space before capital letters
                      .replace(/_/g, " ") // Replace underscores with spaces
                      .trim()
                      .split(" ")
                      .map(
                        (word) => word.charAt(0).toUpperCase() + word.slice(1)
                      )
                      .join(" ");
                  };

                  // Format field value for display
                  const formatFieldValue = (value) => {
                    if (value === null || value === undefined || value === "") {
                      return "-";
                    }
                    if (Array.isArray(value)) {
                      return value.join(", ");
                    }
                    if (typeof value === "boolean") {
                      return value ? "Yes" : "No";
                    }
                    return String(value);
                  };

                  return (
                    <Col span={8} key={`${fieldKey}-${index}`}>
                      <Text
                        style={{
                          fontSize: "12px",
                          color: "#6B778C",
                          display: "block",
                          marginBottom: "8px",
                        }}
                      >
                        <strong>{formatFieldLabel(fieldKey)}</strong>
                      </Text>
                      <Tag
                        color="blue"
                        style={{
                          fontSize: "13px",
                          padding: "6px 12px",
                          borderRadius: "6px",
                          maxWidth: "100%",
                          whiteSpace: "normal",
                          height: "auto",
                        }}
                      >
                        {formatFieldValue(fieldValue)}
                      </Tag>
                    </Col>
                  );
                }
              )}
            </Row>
          </Card>
        )}

      {/* Work Types Tables */}
      {workTypeTabs.length === 0 ? (
        <Card
          title={<Title level={4}>Tasks by Work Type & Grading</Title>}
          size="small"
        >
          <Empty description="No tasks found for this project" />
        </Card>
      ) : (
        workTypeTabs.map((workType, index) => {
          const totalTaskCount = Array.isArray(workType?.gradings)
            ? workType.gradings.reduce((sum, g) => {
              return sum + Object.keys(g?.tasksByType || {}).length;
            }, 0)
            : 0;

          return (
            <Card
              key={index}
              title={
                <Space>
                  <Title level={4} style={{ margin: 0 }}>
                    {workType.workTypeName}
                  </Title>
                  <Tag color="blue">{totalTaskCount} tasks</Tag>
                </Space>
              }
              size="small"
              style={{ marginBottom: 16 }}
            >
              <TasksTable
                dataSource={workType.gradings || []}
                columns={baseColumns}
                taskTypes={workType.taskTypes || []}
                users={users}
                projectId={projectId}
                refetchTasks={refetch.all}
              />
            </Card>
          );
        })
      )}

      {/* Audit Logs (History) */}
      <Card
        title={<Title level={4}>Audit History</Title>}
        size="small"
        style={{ marginTop: 16 }}
      >
        <AuditDisplay
          auditLogs={auditData?.projectAuditHistory || []}
          loading={auditLoading}
        />
      </Card>

      <Modal
        title="Quotation Preview"
        open={quoteVisible}
        onCancel={() => setQuoteVisible(false)}
        width={900}
        footer={[
          <Button key="close" onClick={() => setQuoteVisible(false)}>
            Close
          </Button>,
          <Button
            key="pdf"
            type="primary"
            icon={<FilePdfOutlined />}
            onClick={handleDownloadQuote}
            disabled={!quoteData}
          >
            Download PDF
          </Button>,
        ]}
      >
        {quoteData ? (
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <Card size="small">
              <Row gutter={[16, 12]}>
                <Col span={8}>
                  <Text type="secondary">Quote Number</Text>
                  <div>
                    <Text strong>{quoteData.quoteNumber}</Text>
                  </div>
                </Col>
                <Col span={8}>
                  <Text type="secondary">Quote Date</Text>
                  <div>
                    <Text strong>
                      {dayjs(quoteData.quoteDate).format("DD MMM YYYY")}
                    </Text>
                  </div>
                </Col>
                <Col span={8}>
                  <Text type="secondary">Valid Until</Text>
                  <div>
                    <Text
                      strong
                      type={
                        dayjs(quoteData.validUntil).isBefore(dayjs())
                          ? "danger"
                          : undefined
                      }
                    >
                      {dayjs(quoteData.validUntil).format("DD MMM YYYY")}
                    </Text>
                  </div>
                </Col>
              </Row>
            </Card>

            <Card size="small" title={<Text strong>Client & Project</Text>}>
              <Descriptions bordered size="small" column={2}>
                <Descriptions.Item label="Client" span={1}>
                  {quoteData.client?.displayName ||
                    quoteData.client?.companyName ||
                    quoteData.client?.clientCode ||
                    "N/A"}
                </Descriptions.Item>
                <Descriptions.Item label="Contact" span={1}>
                  {quoteData.client?.email ||
                    quoteData.client?.contactNoPersonal ||
                    quoteData.client?.mobile ||
                    "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Project Code" span={1}>
                  {quoteData.project?.projectCode || "N/A"}
                </Descriptions.Item>
                <Descriptions.Item label="Project Name" span={1}>
                  {quoteData.project?.name ||
                    quoteData.project?.description ||
                    "N/A"}
                </Descriptions.Item>
                <Descriptions.Item label="Images" span={1}>
                  {quoteData.totalImages}
                </Descriptions.Item>
                <Descriptions.Item label="Status" span={1}>
                  <Tag color="blue">Active</Tag>
                </Descriptions.Item>
                {quoteData.notes && (
                  <Descriptions.Item label="Notes" span={2}>
                    {quoteData.notes}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>

            <Card size="small" title={<Text strong>Service Details</Text>}>
              <Table
                dataSource={quoteData.items}
                rowKey={(record) => `${record.line}-${record.description}`}
                size="small"
                pagination={false}
                bordered
                columns={[
                  {
                    title: "#",
                    dataIndex: "line",
                    width: "5%",
                    align: "center",
                  },
                  {
                    title: "Description",
                    dataIndex: "description",
                    width: "45%",
                    render: (value) => <Text strong>{value}</Text>,
                  },
                  {
                    title: "Qty",
                    dataIndex: "quantity",
                    width: "15%",
                    align: "center",
                  },
                  {
                    title: "Rate",
                    dataIndex: "rate",
                    width: "15%",
                    align: "right",
                    render: (rate) => `₹${Number(rate || 0).toLocaleString()}`,
                  },
                  {
                    title: "Amount",
                    dataIndex: "amount",
                    width: "20%",
                    align: "right",
                    render: (amount) => (
                      <Text strong>
                        ₹{Number(amount || 0).toLocaleString()}
                      </Text>
                    ),
                  },
                ]}
                summary={() => (
                  <Table.Summary fixed>
                    <Table.Summary.Row style={{ backgroundColor: "#fafafa" }}>
                      <Table.Summary.Cell colSpan={3}>
                        <Text strong>Subtotal</Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell colSpan={2} align="right">
                        <Text strong>
                          ₹{quoteData.subtotal.toLocaleString()}
                        </Text>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                    {quoteData.discountAmount > 0 && (
                      <Table.Summary.Row style={{ backgroundColor: "#fafafa" }}>
                        <Table.Summary.Cell colSpan={3}>
                          <Text strong>Discount</Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell colSpan={2} align="right">
                          <Text type="danger">
                            -₹{quoteData.discountAmount.toLocaleString()}
                          </Text>
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                    )}
                    <Table.Summary.Row style={{ backgroundColor: "#fafafa" }}>
                      <Table.Summary.Cell colSpan={3}>
                        <Text strong>
                          Tax
                          {quoteData.taxRate ? ` (${quoteData.taxRate}%)` : ""}
                        </Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell colSpan={2} align="right">
                        <Text>₹{quoteData.taxAmount.toLocaleString()}</Text>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                    <Table.Summary.Row style={{ backgroundColor: "#e6fffb" }}>
                      <Table.Summary.Cell colSpan={3}>
                        <Text strong style={{ fontSize: "16px" }}>
                          Total Quote Amount
                        </Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell colSpan={2} align="right">
                        <Text
                          strong
                          style={{ fontSize: "16px", color: "#13c2c2" }}
                        >
                          ₹{quoteData.totalAmount.toLocaleString()}
                        </Text>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                )}
              />
            </Card>
          </Space>
        ) : (
          <Empty description="No quotation data" />
        )}
      </Modal>

      <Modal
        title="Change Status"
        open={statusModalVisible}
        onCancel={() => {
          setStatusModalVisible(false);
        }}
        onOk={handleSaveStatus}
        okButtonProps={{ disabled: !statusValue }}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Text>Select new status</Text>
          <Select
            value={statusValue}
            onChange={setStatusValue}
            style={{ width: "100%" }}
            options={(() => {
              const options = Object.entries(STATUS_MAP).map(([key, cfg]) => ({
                value: key.toLowerCase(),
                label: cfg.label,
              }));

              // If completed, show only "delivered" or "reopen" (invoice not required)
              if (
                (project?.status || "").toString().toUpperCase() === "COMPLETED"
              ) {
                return options.filter(
                  (opt) => opt.value === "delivered" || opt.value === "reopen"
                );
              }

              return options;
            })()}
          />
        </Space>
      </Modal>

      <Modal
        title="Change Due Date"
        open={dueDateModalVisible}
        onCancel={() => setDueDateModalVisible(false)}
        onOk={handleSaveDueDate}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Text>Select new due date</Text>
          <DatePicker
            style={{ width: "100%" }}
            value={dueDateValue}
            onChange={setDueDateValue}
            format="DD MMM YYYY"
            allowClear
          />
        </Space>
      </Modal>

      {/* Reminder Notes Modal */}
      <ReminderNotesModal
        visible={reminderNotesModalVisible}
        projectId={projectId}
        onClose={() => setReminderNotesModalVisible(false)}
        onSuccess={() => refetch.all()}
      />
    </div>
  );
};

export default ProjectDetailDrawer;
