import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useReactiveVar, useApolloClient } from "@apollo/client";
import {
  Spin,
  Alert,
  Typography,
  Tag,
  Empty,
  Statistic,
  Row,
  Col,
  Card,
  Tooltip,
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
  EditOutlined,
  CalendarOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  FolderOutlined,
  CopyOutlined,
  FilePdfOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
  GET_PROJECT_DETAIL,
  GET_AVAILABLE_USERS,
  ACTIVATE_PROJECT,
  DELETE_PROJECT,
  UPDATE_PROJECT,
} from "../graphql/projectQueries";
import { UPDATE_CLIENT } from "../gql/clients";
import { GET_TASKS } from "../gql/tasks";
// Use work types query that includes sortOrder for proper ordering
import { GET_WORK_TYPES } from "../gql/workTypes";
import { GET_PROJECT_AUDIT_HISTORY } from "../gql/auditLogs";
import AuditDisplay from "./common/AuditDisplay.jsx";
import TasksTable from "./common/TasksTable";
import { generateBaseColumns } from "./common/TasksTableColumns";
import { useAppDrawer } from "../contexts/DrawerContext";
import { AppDrawerContext } from "../contexts/DrawerContext";
import { GENERATE_PROJECT_INVOICE } from "../gql/clientLedger";
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
  CANCELLED: { label: "Cancelled", color: "error" },
  ON_HOLD: { label: "On Hold", color: "warning" },
  DELIVERED: { label: "Delivered", color: "purple" },
  REQUESTED: { label: "Pending Approval", color: "purple" },
};

const ProjectDetailDrawer = ({ projectId }) => {
  const currentUser = useReactiveVar(userCacheVar);
  const { updateProjectDetailDrawerTitle } = useAppDrawer();
  const drawerCtx = React.useContext(AppDrawerContext);
  const client = useApolloClient();

  // State declarations
  const [projectNotesInput, setProjectNotesInput] = useState("");
  const [clientNotesInput, setClientNotesInput] = useState("");
  const [quoteVisible, setQuoteVisible] = useState(false);
  const [quoteData, setQuoteData] = useState(null);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [statusValue, setStatusValue] = useState("");
  const [dueDateModalVisible, setDueDateModalVisible] = useState(false);
  const [dueDateValue, setDueDateValue] = useState(null);
  const [statusSelectOpen, setStatusSelectOpen] = useState(false);

  // Fetch project details
  const { data, loading, error, refetch } = useQuery(GET_PROJECT_DETAIL, {
    variables: { id: projectId },
    skip: !projectId,
    fetchPolicy: "no-cache",
  });

  // Fetch tasks separately with project filter - include all statuses including completed
  const {
    data: tasksData,
    loading: tasksLoading,
    refetch: refetchTasks,
  } = useQuery(GET_TASKS, {
    variables: { projectId },
    skip: !projectId,
    fetchPolicy: "no-cache",
  });

  // Fetch combined audit logs for project and all its tasks (like Jira ticket history)
  const {
    data: auditData,
    loading: auditLoading,
    refetch: refetchAudit,
  } = useQuery(GET_PROJECT_AUDIT_HISTORY, {
    variables: { projectId },
    skip: !projectId,
    fetchPolicy: "no-cache",
  });

  // Fetch available users for assignment
  const {
    data: usersData,
    loading: usersLoading,
  } = useQuery(GET_AVAILABLE_USERS, {
    variables: { limit: 1000, offset: 0 },
    fetchPolicy: "cache-first",
  });

  // Fetch work types
  const {
    data: workTypesData,
    loading: workTypesLoading,
  } = useQuery(GET_WORK_TYPES, {
    fetchPolicy: "cache-first",
  });

  // Mutations
  const [updateProject] = useMutation(UPDATE_PROJECT, {
    onCompleted: () => {
      message.success("Project updated successfully");
      refetch();
    },
    onError: (error) => message.error(error.message),
  });

  const [updateClient] = useMutation(UPDATE_CLIENT, {
    onCompleted: () => {
      message.success("Client notes updated");
      refetch();
    },
    onError: (error) => message.error(error.message),
  });

  // Mutations - Using cache eviction and refetchQueries to ensure updates reflect
  const project = data?.project;
  const tasks = tasksData?.tasks?.tasks || [];
  const canShowQuote =
    ["ACTIVE", "IN_PROGRESS"].includes((project?.status || "").toString().toUpperCase()) &&
    !(project?.invoiceId || project?.invoice?.id);
  const hasInvoice = !!(project?.invoiceId || project?.invoice?.id);
  const completedTasks = tasks.filter((task) => (task.status || "").toString().toUpperCase() === "COMPLETED").length;
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
  
  // Update drawer title when project loads
  useEffect(() => {
    if (project) {
      setStatusValue((project.status || "").toLowerCase());
      setDueDateValue(project.deadlineDate ? dayjs(project.deadlineDate) : null);
      const statusConfig = STATUS_MAP[project.status?.toUpperCase()] || {};
      const titleElement = (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingRight: 24 }}>
          <Space size="middle">
            <span>{project.projectCode}</span>
            <span style={{ color: '#8c8c8c', fontWeight: 'normal' }}>|</span>
            <span style={{ fontWeight: 'normal' }}>{project.name}</span>
            <Tag color={statusConfig.color || 'blue'}>
              {statusConfig.label || project.status}
            </Tag>
          </Space>
          <Space>
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
                options={(() => {
                  const options = Object.entries(STATUS_MAP).map(([key, cfg]) => ({
                    value: key.toLowerCase(),
                    label: cfg.label,
                    color: cfg.color,
                  }));
                  const isCompleted = (project?.status || "").toLowerCase() === "completed";
                  const filtered = isCompleted && hasInvoice
                    ? options.filter((opt) => opt.value === "delivered")
                    : options;

                  const clientType = project?.client?.clientType;
                  const isPaid = !!(project?.invoice?.status === "fully_paid" || (project?.invoice?.balanceAmount ?? 0) <= 0);

                  return filtered.map((option) => {
                    let disabled = false;
                    let title = "";
                    if (option.value === "delivered") {
                      if (!hasInvoice) {
                        disabled = true;
                        title = "Invoice must be generated first";
                      } else if (clientType === "walkIn") {
                        if (!canApproveProjects) {
                          disabled = true;
                          title = "Permission required to deliver walk-in projects";
                        } else if (!isPaid) {
                          disabled = true;
                          title = "Invoice must be paid for walk-in projects";
                        }
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
              icon={<ReloadOutlined />}
              size="small"
              onClick={() => {
                refetch();
                refetchTasks();
                refetchAudit();
              }}
            >
              Refresh
            </Button>
            {canShowQuote && (
              <Button
                size="small"
                icon={<FilePdfOutlined />}
                onClick={handleOpenQuote}
              >
                View Quote
              </Button>
            )}
            {canDeleteProjects && (project.status || '').toString().toUpperCase() !== 'COMPLETED' && (
              <Button
                danger
                size="small"
                onClick={() => {
                  Modal.confirm({
                    title: 'Delete project?',
                    content: 'This action cannot be undone.',
                    okType: 'danger',
                    onOk: () => deleteProject({ variables: { id: project.id } }),
                  });
                }}
              >
                Delete
              </Button>
            )}
          </Space>
        </div>
      );
      updateProjectDetailDrawerTitle(titleElement);
    }
  }, [project, statusValue, dueDateValue, canEditProjects]);

  React.useEffect(() => {
    setProjectNotesInput(project?.notes || "");
      const clientNotesFromTasks = Array.isArray(tasks) && tasks.length > 0
        ? (tasks[0]?.project?.client?.clientNotes || tasks[0]?.clientNotes)
        : null;
      setClientNotesInput(clientNotesFromTasks || "");
    }, [project?.notes, tasks]);

    const handleUpdateNotes = async () => {
      try {
        const mutations = [];
        if (project?.id) {
          mutations.push(updateProject({ variables: { id: project.id, input: { notes: projectNotesInput } } }));
        }
        const clientId = project?.client?.id || (tasks[0]?.project?.client?.id);
        if (clientId) {
          mutations.push(updateClient({ variables: { id: clientId, input: { clientNotes: clientNotesInput } } }));
        }
        await Promise.all(mutations);
        message.success("Notes updated successfully");
        refetch();
        refetchTasks();
      } catch (e) {
        message.error(`Failed to update notes: ${e.message}`);
      }
    };
  const users = usersData?.availableUsers || [];
  const allWorkTypes = workTypesData?.workTypes || [];

  const [activateProject, { loading: activating }] = useMutation(ACTIVATE_PROJECT, {
    fetchPolicy: "no-cache",
    onCompleted: () => {
      message.success("Project activated");
      refetch();
    },
    onError: (err) => message.error(err.message),
  });

  const [deleteProject, { loading: deleting }] = useMutation(DELETE_PROJECT, {
    fetchPolicy: "no-cache",
    onCompleted: () => {
      message.success("Project deleted");
      drawerCtx?.closeProjectDetailDrawerV2?.();
    },
    onError: (err) => message.error(err.message),
  });

  const [generateInvoice, { loading: invoicing }] = useMutation(GENERATE_PROJECT_INVOICE, {
    fetchPolicy: "no-cache",
    onCompleted: (data) => {
      if (data?.generateProjectInvoice?.success) {
        message.success(data.generateProjectInvoice.message || "Invoice generated");
        refetch();
      } else {
        message.error(data?.generateProjectInvoice?.message || "Failed to generate invoice");
      }
    },
    onError: (err) => message.error(err.message),
  });

  // Base columns for TasksTable - show all columns except project/client/dates
  const baseColumns = generateBaseColumns({
    showProjectCode: false, // Hide project column (we're in project detail)
    showClientInfo: false,  // Hide client column (we're in project detail)
    showOrderDate: false,   // Hide order date (shown in header)
    showGrading: true,      // Show grading column (multiple gradings per project)
    showPriority: true,     // Show priority
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

  const buildQuoteFromProject = (proj) => {
    if (!proj) return null;
    const now = dayjs();
    const identifier = proj.projectCode || proj.projectNumber || proj.id || "PROJECT";
    const items = (proj.projectGradings || []).length
      ? proj.projectGradings.map((pg, idx) => {
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
            description: proj.grading?.name || "Service",
            quantity:
              proj.imageQuantity ||
              proj.totalImageQuantity ||
              proj.imageQuantityInvoiced ||
              0,
            rate: Number(proj.grading?.defaultRate || 0),
          },
        ].map((item) => ({ ...item, amount: item.quantity * item.rate }));

    const subtotal = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const discountAmount = Math.max(Number(proj.discountAmount || 0), 0);
    const taxableBase = Math.max(subtotal - discountAmount, 0);
    const taxRate = Number(proj.taxRate || proj.taxPercent || proj.taxPercentage || 0);
    const taxAmount = Math.max((taxableBase * taxRate) / 100, 0);
    const totalAmount = Math.max(taxableBase + taxAmount, 0);
    const totalImages = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

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
  };

  const handleOpenQuote = () => {
    const draft = buildQuoteFromProject(project);
    setQuoteData(draft);
    setQuoteVisible(true);
  };

  const handleEditProject = () => {
    drawerCtx?.showProjectFormDrawer?.(project, 'edit', () => {
      refetch();
      refetchTasks();
    });
  };

  const handleSaveStatus = async (nextValue) => {
    const valueToSave = (nextValue ?? statusValue) || "";
    if (!valueToSave) return;
    try {
      message.loading({ content: "Updating status...", key: "status" });
      await updateProject({ variables: { id: project.id, input: { status: valueToSave.toUpperCase() } } });
      message.success({ content: "Status updated", key: "status", duration: 2 });
      setStatusModalVisible(false);
      setStatusSelectOpen(false);
      refetch();
    } catch (err) {
      message.error({ content: err.message, key: "status" });
    }
  };

  const handleSaveDueDate = async () => {
    try {
      message.loading({ content: "Updating due date...", key: "due" });
      await updateProject({
        variables: {
          id: project.id,
          input: { deadlineDate: dueDateValue ? dueDateValue.toDate().toISOString() : null },
        },
      });
      message.success({ content: "Due date updated", key: "due", duration: 2 });
      setDueDateModalVisible(false);
      refetch();
    } catch (err) {
      message.error({ content: err.message, key: "due" });
    }
  };

  const handleDownloadQuote = async () => {
    if (!quoteData) return;
    try {
      message.loading({ content: "Generating quote PDF...", key: "quote-pdf" });
      await generateQuotationPDF(quoteData);
      message.success({ content: "Quotation downloaded", key: "quote-pdf", duration: 2 });
    } catch (err) {
      console.error("Quote PDF error", err);
      message.error({ content: "Failed to generate quotation", key: "quote-pdf", duration: 2 });
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
    const sortedProjectWorkTypes = [...project.projectWorkTypes].sort((a, b) => {
      const workTypeA = allWorkTypes.find((wt) => wt.id === a.workTypeId);
      const workTypeB = allWorkTypes.find((wt) => wt.id === b.workTypeId);
      const sortOrderA = workTypeA?.sortOrder ?? 999;
      const sortOrderB = workTypeB?.sortOrder ?? 999;
      
      // Sort by sortOrder first, then by name
      if (sortOrderA !== sortOrderB) {
        return sortOrderA - sortOrderB;
      }
      const nameA = workTypeA?.name || '';
      const nameB = workTypeB?.name || '';
      return nameA.localeCompare(nameB);
    });

    // Create tabs based on sorted projectWorkTypes
    return sortedProjectWorkTypes
      .map((projectWorkType) => {
        const workTypeId = projectWorkType.workTypeId;
        const workTypeName = projectWorkType.workType?.name || "Unknown";

        // Find the full work type configuration with task types
        const fullWorkType = allWorkTypes.find((wt) => wt.id === workTypeId);
        const taskTypes = fullWorkType?.taskTypes || [];

        // Get all gradings for this project (we'll show all gradings in each work type tab)
        const gradings = projectGradings
          .map((projectGrading) => {
            const grading = projectGrading.grading;
            if (!grading) return null;

            // Verify this grading belongs to the current work type
            const gradingWorkTypeId = grading.workType?.id;
            if (gradingWorkTypeId !== workTypeId) {
              // Skip gradings that don't belong to this work type
              return null;
            }

            // Get all tasks for this grading, organized by task type
            const tasksByType = {};
            // Match tasks to current grading via gradingTask.grading.id
            const gradingTasks = tasks.filter((task) => {
              const taskGradingId = task.gradingTask?.grading?.id;
              return taskGradingId === grading.id;
            });

            // Organize tasks by task type - only include tasks for this work type
            gradingTasks.forEach((task) => {
              const taskTypeId = task.taskType?.id;
              // Check if this task type belongs to the current work type
              if (taskTypeId && taskTypes.find((tt) => tt.id === taskTypeId)) {
                tasksByType[taskTypeId] = task;
              }
            });

            // Only include this grading if it has tasks for this work type
            if (Object.keys(tasksByType).length === 0) return null;

            // Prefer shortCode from tasks.project.projectGradings for the matching grading
            // Prefer task.gradingTask.grading.shortCode; fallback to tasks.project.projectGradings[].grading.shortCode
            const shortCodeFromTasks = gradingTasks
              .map((task) => {
                const direct = task.gradingTask?.grading?.shortCode || null;
                if (direct) return direct;
                const pg = task.project?.projectGradings || [];
                const match = pg.find((g) => g.grading?.id === grading.id);
                return match?.grading?.shortCode || null;
              })
              .find((code) => !!code);

            // Get dueDate from first task (tasks have dueDate field)
            const firstTask = gradingTasks[0];
            const taskDueDate = firstTask?.dueDate || null;

            return {
              gradingId: grading.id,
              gradingName: grading.name || null,
              gradingShortCode: shortCodeFromTasks || grading.shortCode || null,
              imageQuantity: projectGrading.imageQuantity,
              estimatedCost: projectGrading.estimatedCost,
              actualCost: projectGrading.actualCost,
              tasksByType,
              // Add project-level fields for columns from main project query
              projectId: project.id,
              orderDate: project.createdAt, // Use createdAt as orderDate (like main TaskTable)
              dueDate: taskDueDate, // Get dueDate from task (tasks have dueDate, not projects)
              priority: project.priority,
            };
          })
          .filter(Boolean); // Remove null gradings

        // Only return work type if it has gradings with tasks
        if (gradings.length === 0) return null;

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

  if (loading || tasksLoading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Spin size="large" />
      </div>
    );
  }

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

  if (!project) {
    return <Empty description="Project not found" />;
  }

  const totalImages = project.totalImageQuantity || project.imageQuantity || 0;
  const completedImages = tasks.reduce(
    (sum, task) => sum + (task.completedImageQuantity || 0),
    0
  );

  return (
    <div style={{ padding: "0" }}>
      {/* Project Statistics */}
      {/* <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Total Tasks"
              value={totalTasks}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Completed"
              value={completedTasks}
              suffix={`/ ${totalTasks}`}
              valueStyle={{ color: "#3f8600" }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Total Images"
              value={totalImages}
              prefix={<FileImageOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Completed Images"
              value={completedImages}
              suffix={`/ ${totalImages}`}
              valueStyle={{ color: "#3f8600" }}
              prefix={<FileImageOutlined />}
            />
          </Card>
        </Col>
      </Row> */}

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

      <Card size="small" style={{ marginBottom: 16 }} title={<Text strong>Actions</Text>}>
        <Space wrap>
          {canEditProjects && <Button onClick={handleEditProject}>Edit Project</Button>}
          {canApproveProjects && (project.status || '').toString().toUpperCase() === 'DRAFT' && (
            <Button onClick={() => activateProject({ variables: { id: project.id } })} loading={activating}>
              Activate
            </Button>
          )}
          {(
            ((project.status || '').toString().toUpperCase() === 'ACTIVE' && allTasksCompleted) ||
            (project.status || '').toString().toUpperCase() === 'COMPLETED'
          ) &&
            !hasInvoice &&
            (canCreateFinance || project?.client?.leaderId === currentUser?.id) && (
              <Button
                type="primary"
                loading={invoicing}
                onClick={() => generateInvoice({ variables: { projectId: project.id } })}
              >
                Generate Invoice
              </Button>
            )}
          {hasInvoice && (
            <Button onClick={() => drawerCtx?.showInvoiceDetailDrawer?.(project.invoiceId || project.invoice?.id)}>
              View Invoice
            </Button>
          )}
          {canShowQuote && (
            <Button icon={<FilePdfOutlined />} onClick={handleOpenQuote}>
              View Quote
            </Button>
          )}
          {canDeleteProjects && (project.status || '').toString().toUpperCase() !== 'COMPLETED' && (
            <Button
              danger
              loading={deleting}
              onClick={() => {
                Modal.confirm({
                  title: 'Delete project?',
                  content: 'This action cannot be undone.',
                  okType: 'danger',
                  onOk: () => deleteProject({ variables: { id: project.id } }),
                });
              }}
            >
              Delete
            </Button>
          )}
        </Space>
      </Card>

      {/* Notes Section */}
      <Card title={<Title level={4}>Notes</Title>} size="small" style={{ marginBottom: 16 }}>
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
        <div style={{ marginTop: 12, textAlign: 'right' }}>
          <Button type="primary" onClick={handleUpdateNotes} disabled={!canEditProjects}>
            Update Notes
          </Button>
        </div>
      </Card>

      {/* Custom Fields Section */}
      {project?.customFields && typeof project.customFields === "object" && Object.keys(project.customFields).length > 0 && (
        <Card title={<Title level={4}>Additional Fields</Title>} size="small" style={{ marginBottom: 16 }}>
          <Row gutter={[16, 12]}>
            {Object.entries(project.customFields).map(([fieldKey, fieldValue], index) => {
              // Format field label from key
              const formatFieldLabel = (key) => {
                return key
                  .replace(/([A-Z])/g, " $1") // Add space before capital letters
                  .replace(/_/g, " ") // Replace underscores with spaces
                  .trim()
                  .split(" ")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
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
                <Col span={12} key={`${fieldKey}-${index}`}>
                  <div
                    style={{
                      padding: "12px",
                      backgroundColor: "#F0F9FF",
                      borderRadius: "4px",
                      border: "1px solid #B5E7FB",
                    }}
                  >
                    <Text style={{ fontSize: "12px", color: "#6B778C", display: "block", marginBottom: "6px" }}>
                      <strong>{formatFieldLabel(fieldKey)}</strong>
                    </Text>
                    <div
                      style={{
                        padding: "8px",
                        backgroundColor: "#FFFFFF",
                        borderRadius: "4px",
                        border: "1px solid #E8E8E8",
                      }}
                    >
                      <Text style={{ fontSize: "12px", color: "#172B4D" }}>
                        {formatFieldValue(fieldValue)}
                      </Text>
                    </div>
                  </div>
                </Col>
              );
            })}
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
                refetchQueries={[
                  {
                    query: GET_TASKS,
                    variables: {
                      filters: { 
                        projectId: projectId,
                        statuses: ["TODO", "IN_PROGRESS", "REVIEW", "REVISION", "COMPLETED", "CANCELLED", "ON_HOLD"],
                        includeInactive: true
                      },
                      page: 1,
                      limit: 1000,
                      sortBy: "createdAt",
                      sortOrder: "DESC",
                    },
                  },
                ]}
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
                  <div><Text strong>{quoteData.quoteNumber}</Text></div>
                </Col>
                <Col span={8}>
                  <Text type="secondary">Quote Date</Text>
                  <div><Text strong>{dayjs(quoteData.quoteDate).format("DD MMM YYYY")}</Text></div>
                </Col>
                <Col span={8}>
                  <Text type="secondary">Valid Until</Text>
                  <div>
                    <Text strong type={dayjs(quoteData.validUntil).isBefore(dayjs()) ? "danger" : undefined}>
                      {dayjs(quoteData.validUntil).format("DD MMM YYYY")}
                    </Text>
                  </div>
                </Col>
              </Row>
            </Card>

            <Card size="small" title={<Text strong>Client & Project</Text>}>
              <Descriptions bordered size="small" column={2}>
                <Descriptions.Item label="Client" span={1}>
                  {quoteData.client?.displayName || quoteData.client?.companyName || quoteData.client?.clientCode || "N/A"}
                </Descriptions.Item>
                <Descriptions.Item label="Contact" span={1}>
                  {quoteData.client?.email || quoteData.client?.contactNoPersonal || quoteData.client?.mobile || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Project Code" span={1}>
                  {quoteData.project?.projectCode || "N/A"}
                </Descriptions.Item>
                <Descriptions.Item label="Project Name" span={1}>
                  {quoteData.project?.name || quoteData.project?.description || "N/A"}
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
                  { title: "#", dataIndex: "line", width: "5%", align: "center" },
                  { title: "Description", dataIndex: "description", width: "45%", render: (value) => <Text strong>{value}</Text> },
                  { title: "Qty", dataIndex: "quantity", width: "15%", align: "center" },
                  { title: "Rate", dataIndex: "rate", width: "15%", align: "right", render: (rate) => `₹${Number(rate || 0).toLocaleString()}` },
                  { title: "Amount", dataIndex: "amount", width: "20%", align: "right", render: (amount) => <Text strong>₹{Number(amount || 0).toLocaleString()}</Text> },
                ]}
                summary={() => (
                  <Table.Summary fixed>
                    <Table.Summary.Row style={{ backgroundColor: "#fafafa" }}>
                      <Table.Summary.Cell colSpan={3}>
                        <Text strong>Subtotal</Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell colSpan={2} align="right">
                        <Text strong>₹{quoteData.subtotal.toLocaleString()}</Text>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                    {quoteData.discountAmount > 0 && (
                      <Table.Summary.Row style={{ backgroundColor: "#fafafa" }}>
                        <Table.Summary.Cell colSpan={3}>
                          <Text strong>Discount</Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell colSpan={2} align="right">
                          <Text type="danger">-₹{quoteData.discountAmount.toLocaleString()}</Text>
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                    )}
                    <Table.Summary.Row style={{ backgroundColor: "#fafafa" }}>
                      <Table.Summary.Cell colSpan={3}>
                        <Text strong>
                          Tax{quoteData.taxRate ? ` (${quoteData.taxRate}%)` : ""}
                        </Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell colSpan={2} align="right">
                        <Text>₹{quoteData.taxAmount.toLocaleString()}</Text>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                    <Table.Summary.Row style={{ backgroundColor: "#e6fffb" }}>
                      <Table.Summary.Cell colSpan={3}>
                        <Text strong style={{ fontSize: "16px" }}>Total Quote Amount</Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell colSpan={2} align="right">
                        <Text strong style={{ fontSize: "16px", color: "#13c2c2" }}>
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
          setStatusSelectOpen(false);
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
            open={statusSelectOpen}
            onDropdownVisibleChange={(open) => setStatusSelectOpen(open)}
            options={(() => {
              const options = Object.entries(STATUS_MAP).map(([key, cfg]) => ({
                value: key.toLowerCase(),
                label: cfg.label,
              }));
              
              // If completed and invoiced, only show "delivered" option
              if ((project?.status || '').toString().toUpperCase() === 'COMPLETED' && hasInvoice) {
                return options.filter(opt => opt.value === 'delivered');
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
    </div>
  );
};

export default ProjectDetailDrawer;
