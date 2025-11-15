import React, { useState, useContext, useEffect } from "react";
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
} from "../../graphql/projectQueries";
import { GET_CLIENTS } from "../../graphql/clientQueries";
import { GENERATE_PROJECT_INVOICE } from "../../gql/clientLedger";
// tasks are loaded in ProjectDetail drawer when needed
import { AppDrawerContext } from "../../contexts/DrawerContext";
import dayjs from "dayjs";

const { Text } = Typography;
const { Option } = Select;

// Status display map for labels and colors
const STATUS_MAP = {
  DRAFT: { label: "Draft", color: "orange" },
  ACTIVE: { label: "Active", color: "green" },
  IN_PROGRESS: { label: "In Progress", color: "blue" },
  COMPLETED: { label: "Completed", color: "blue" },
  CANCELLED: { label: "Cancelled", color: "red" },
  REQUESTED: { label: "Pending Approval", color: "purple" },
};

// Helper function to get client display name
const getClientDisplayName = (client) => {
  console.log("Client data:", client);
  return (
    client.clientCode || "Unknown Client" + "" + (client.displayName || "")
  );
};

const ProjectManagement = () => {
  const { showProjectFormDrawer, showProjectDetailDrawer } =
    useContext(AppDrawerContext);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  
  // Pagination state
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
  });

  // Project completion modal state
  const [completeModalVisible, setCompleteModalVisible] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [actualImageCount, setActualImageCount] = useState(0);

  // Credit approval modal state
  const [creditApprovalModalVisible, setCreditApprovalModalVisible] = useState(false);
  const [selectedCreditRequest, setSelectedCreditRequest] = useState(null);
  const [approvalNotes, setApprovalNotes] = useState("");

  // Status editing state (inline editing like ClientList)
  const [editingStatus, setEditingStatus] = useState({});
  const [tempValues, setTempValues] = useState({});

  // GraphQL Queries
  const {
    data: projectsData,
    loading: projectsLoading,
    error: projectsError,
    refetch: refetchProjects,
  } = useQuery(GET_PROJECTS, {
    variables: {
      filters: {},
      page: 1,
      limit: 100,
      sortBy: "createdAt",
      sortOrder: "DESC",
    },
    fetchPolicy: "cache-and-network",
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
      refetchProjects();
    },
    onError: (error) => {
      message.error(`Error activating project: ${error.message}`);
    },
  });

  const [updateProjectStatus] = useMutation(UPDATE_PROJECT, {
    onCompleted: () => {
      message.success("Project status updated successfully!");
      refetchProjects();
    },
    onError: (error) => {
      message.error(`Error updating project status: ${error.message}`);
    },
  });

  const [completeProject] = useMutation(UPDATE_PROJECT, {
    oncompleted: () => {
      message.success("Project marked as completed — generating invoice...");
      refetchProjects();
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
          refetchProjects();
        } catch (e) {}
        try {
          refetchClients && refetchClients();
        } catch (e) {}
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
      message.success(`Credit request approved! Project activated and ${data.approveCreditRequest.tasksCreated} tasks created.`);
      setCreditApprovalModalVisible(false);
      setSelectedCreditRequest(null);
      setApprovalNotes("");
      refetchProjects();
    },
    onError: (error) => {
      message.error(`Error approving credit request: ${error.message}`);
    },
  });

  const [rejectCreditRequest] = useMutation(REJECT_CREDIT_REQUEST, {
    onCompleted: () => {
      message.success("Credit request rejected. Project reverted to draft status.");
      setCreditApprovalModalVisible(false);
      setSelectedCreditRequest(null);
      setApprovalNotes("");
      refetchProjects();
    },
    onError: (error) => {
      message.error(`Error rejecting credit request: ${error.message}`);
    },
  });

  // Normalize projects array from GraphQL response (supports projects.projects or legacy projects.data)
  const allProjects =
    projectsData?.projects?.projects || projectsData?.projects?.data || [];

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

  // Filter projects based on search and filters
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

      const projStatus = (project.status || "").toString().toUpperCase();
      const matchesStatus =
        statusFilter === "all" ||
        projStatus === (statusFilter || "").toString().toUpperCase();

      const projClientId = project.clientId || project.client?.id;
      const matchesClient =
        clientFilter === "all" ||
        projClientId === clientFilter ||
        projClientId === parseInt(clientFilter);

      return matchesSearch && matchesStatus && matchesClient;
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

  // Calculate statistics
  const stats = {
    total: filteredProjects.length,
    active: filteredProjects.filter(
      (p) => (p.status || "").toString().toUpperCase() === "ACTIVE"
    ).length,
    draft: filteredProjects.filter(
      (p) => (p.status || "").toString().toUpperCase() === "DRAFT"
    ).length,
    completed: filteredProjects.filter(
      (p) => (p.status || "").toString().toUpperCase() === "COMPLETED"
    ).length,
  };

  // Handle project actions
  const handleViewProject = (project) => {
    // Open project details in the shared drawer
    showProjectDetailDrawer(project);
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
          approvalNotes: approvalNotes || "Approved"
        }
      }
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
          approvalNotes: approvalNotes
        }
      }
    });
  };

  // Status editing handlers (inline editing like ClientList)
  const handleEditStatus = (projectId, currentStatus) => {
    setEditingStatus((prev) => ({ ...prev, [projectId]: true }));
    setTempValues((prev) => ({
      ...prev,
      [`status_${projectId}`]: currentStatus,
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
    try {
      await updateProjectStatus({
        variables: {
          id: projectId,
          input: {
            status: newStatus
          }
        }
      });
      setEditingStatus((prev) => ({ ...prev, [projectId]: false }));
      const newValues = { ...tempValues };
      delete newValues[`status_${projectId}`];
      setTempValues(newValues);
    } catch (error) {
      message.error("Failed to update project status");
    }
  };

  // Table columns
  const columns = [
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
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 180,
      render: (status, record) => {
        const isEditing = editingStatus[record.id];
        const tempValue = tempValues[`status_${record.id}`];

        const statusOptions = [
          { value: 'draft', label: 'Draft', color: 'default' },
          { value: 'active', label: 'Active', color: 'blue' },
        ];

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
                style={{ width: 120 }}
              >
                {statusOptions.map(option => (
                  <Select.Option key={option.value} value={option.value}>
                    {option.label}
                  </Select.Option>
                ))}
              </Select>
              <div className="flex space-x-1">
                <Tooltip title="Save">
                  <Button
                    type="text"
                    size="small"
                    icon={<CheckOutlined />}
                    onClick={() => handleSaveStatusEdit(record.id)}
                    style={{ color: "#52c41a" }}
                  />
                </Tooltip>
                <Tooltip title="Cancel">
                  <Button
                    type="text"
                    size="small"
                    icon={<CloseOutlined />}
                    onClick={() => handleCancelStatusEdit(record.id)}
                    style={{ color: "#ff4d4f" }}
                  />
                </Tooltip>
              </div>
            </div>
          );
        }

        const currentStatus = statusOptions.find(s => s.value === status?.toLowerCase());
        
        return (
          <div className="group">
            <div
              className="cursor-pointer hover:bg-gray-50 px-2 py-1 rounded flex items-center justify-between"
              onClick={() => handleEditStatus(record.id, status?.toLowerCase())}
              title="Click to edit status"
            >
              <Tag color={currentStatus?.color || 'default'}>
                {currentStatus?.label || status?.toUpperCase()}
              </Tag>
              <EditOutlined className="opacity-0 group-hover:opacity-100 text-xs ml-1" />
            </div>
          </div>
        );
      },
    },
    {
      title: "Work Type / Grading",
      key: "workTypeGrading",
      width: 200,
      render: (_, record) => (
        <div>
          <div>
            <Text strong>{record.workType?.name || "N/A"}</Text>
          </div>
          <div>
            <Tag color="gold" style={{ marginTop: 4 }}>
              {record.grading?.name || "N/A"} - ₹
              {record.grading?.defaultRate || 0}
            </Tag>
          </div>
        </div>
      ),
    },
    {
      title: "Tasks",
      dataIndex: "tasks",
      key: "tasks",
      width: 160,
      sorter: (a, b) =>
        ((a.tasks && a.tasks.length) || a.taskCount || 0) -
        ((b.tasks && b.tasks.length) || b.taskCount || 0),
      render: (tasks, record) => {
        // If project is a draft, tasks should remain hidden / not visible
        const status = (record.status || "").toString().toUpperCase();
        if (status === "DRAFT") {
          return (
            <div style={{ minWidth: 140, color: "#fa8c16" }}>
              Draft — tasks hidden
            </div>
          );
        }

        const all = tasks || record.tasks || [];
        const total = all.length || record.taskCount || 0;
        const completed =
          (all.filter
            ? all.filter(
                (t) => (t.status || "").toString().toUpperCase() === "COMPLETED"
              ).length
            : 0) ||
          record.completedTaskCount ||
          0;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
        return (
          <div style={{ minWidth: 140 }}>
            <div style={{ marginBottom: 6 }}>
              {total} task{total !== 1 ? "s" : ""}
            </div>
            <Progress percent={percent} size="small" />
          </div>
        );
      },
    },
    {
      title: "Deadline",
      dataIndex: "deadlineDate",
      key: "deadlineDate",
      width: 120,
      render: (date) =>
        date ? dayjs(date).format("MMM DD, YYYY") : "No deadline",
    },
    {
      title: "Budget",
      dataIndex: "estimatedCost",
      key: "estimatedCost",
      width: 100,
      render: (budget) => (budget ? `₹${budget.toLocaleString()}` : "N/A"),
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
          {(record.status || "").toString().toUpperCase() !== "COMPLETED" && (
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
          {(record.status || "").toString().toUpperCase() === "REQUESTED" && (
            <Tooltip title="Approve Credit Request">
              <Button
                type="text"
                icon={<CheckCircleOutlined />}
                style={{ color: "#722ed1" }}
                onClick={() => handleShowCreditApproval(record)}
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
            ) && (
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
            ) && (
              <Tooltip title="Generate Invoice">
                <Button
                  type="text"
                  icon={<FileTextOutlined />}
                  style={{ color: "#1890ff" }}
                  onClick={() => {
                    Modal.confirm({
                      title: "Generate Invoice",
                      content: `Generate invoice for project ${
                        record.projectCode || record.id
                      }?`,
                      okText: "Generate",
                      onOk: () =>
                        generateInvoice({
                          variables: { projectId: record.id },
                        }).then(() => {
                          // optimistically mark as invoiced locally
                          setInvoicedProjectIds((prev) =>
                            new Set(prev).add(record.id)
                          );
                        }),
                    });
                  }}
                />
              </Tooltip>
            )}

          {/* When project is already completed or has an invoice, show a quick Invoice/View button so users can open details */}
          {((record.status || "").toString().toUpperCase() === "COMPLETED" ||
            record.invoiceId ||
            record.invoice?.id ||
            invoicedProjectIds.has(record.id)) && (
            <Tooltip title="View Invoice">
              <Button
                type="text"
                icon={<FileTextOutlined />}
                onClick={() => handleViewProject(record)}
              />
            </Tooltip>
          )}

          {(record.status || "").toString().toUpperCase() !== "COMPLETED" && (
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
                        <Space size={4}>
                          <ProjectOutlined style={{ fontSize: 16, color: '#1890ff' }} />
                          <Text strong style={{ fontSize: 14 }}>Total:</Text>
                          <Tag color="blue" style={{ margin: 0, fontSize: 14, padding: '2px 8px' }}>{stats.total}</Tag>
                        </Space>
                        <Space size={4}>
                          <PlayCircleOutlined style={{ fontSize: 16, color: '#52c41a' }} />
                          <Text strong style={{ fontSize: 14 }}>Active:</Text>
                          <Tag color="green" style={{ margin: 0, fontSize: 14, padding: '2px 8px' }}>{stats.active}</Tag>
                        </Space>
                        <Space size={4}>
                          <EditOutlined style={{ fontSize: 16, color: '#faad14' }} />
                          <Text strong style={{ fontSize: 14 }}>Draft:</Text>
                          <Tag color="orange" style={{ margin: 0, fontSize: 14, padding: '2px 8px' }}>{stats.draft}</Tag>
                        </Space>
                        <Space size={4}>
                          <CheckCircleOutlined style={{ fontSize: 16, color: '#1890ff' }} />
                          <Text strong style={{ fontSize: 14 }}>Completed:</Text>
                          <Tag color="cyan" style={{ margin: 0, fontSize: 14, padding: '2px 8px' }}>{stats.completed}</Tag>
                        </Space>
                      </Space>
                    </Col>
                  </Row>
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
                        <Option value="CANCELLED">Cancelled</Option>
                      </Select>
                    </Col>
                    <Col span={4}>
                      <Select
                        placeholder="Client"
                        value={clientFilter}
                        onChange={setClientFilter}
                        style={{ width: "100%" }}
                      >
                        <Option value="all">All Clients</Option>
                        {clientsData?.clients?.data?.map((client) => (
                          <Option key={client.id} value={client.id}>
                            {getClientDisplayName(client)}
                          </Option>
                        ))}
                      </Select>
                    </Col>
                    <Col span={8} style={{ textAlign: "right" }}>
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
                    columns={columns}
                    dataSource={filteredProjects}
                    rowKey="id"
                    loading={projectsLoading}
                    pagination={{
                      current: pagination.current,
                      pageSize: pagination.pageSize,
                      total: filteredProjects.length,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total, range) =>
                        `${range[0]}-${range[1]} of ${total} projects`,
                      pageSizeOptions: [10, 25, 50, 100],
                    }}
                    onChange={(paginationConfig) => {
                      setPagination({
                        current: paginationConfig.current,
                        pageSize: paginationConfig.pageSize,
                      });
                    }}
                    scroll={{ x: 1200 }}
                    size="small"
                  />
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
          <Button 
            key="reject" 
            danger
            onClick={handleRejectCreditRequest}
          >
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
                {selectedCreditRequest.project?.client?.displayName || selectedCreditRequest.project?.client?.clientCode}
              </Descriptions.Item>
              <Descriptions.Item label="Work Type">
                {selectedCreditRequest.project?.workType?.name}
              </Descriptions.Item>
              <Descriptions.Item label="Total Cost" span={2}>
                <Text strong style={{ color: "#ff4d4f", fontSize: "16px" }}>
                  ₹{(selectedCreditRequest.requestedAmount || 0).toLocaleString()}
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
                <Tag color={(STATUS_MAP[project.status.toLowerCase()] || {}).color || "default"}>
                  {(STATUS_MAP[project.status.toLowerCase()] || {}).label || project.status}
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
