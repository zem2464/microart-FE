import { useQuery, useMutation, useLazyQuery } from "@apollo/client";
import { GET_CLIENTS } from "../graphql/clientQueries";
import {
  GET_WORK_TYPES,
  GET_WORK_TYPE_FIELDS,
  GET_GRADINGS_BY_WORK_TYPE,
} from "../graphql/workTypeQueries";
import {
  GET_CLIENT_PREFERENCES,
  GET_GRADING_TASKS,
  VALIDATE_PROJECT_CREDIT,
  CREATE_PROJECT,
  UPDATE_PROJECT,
  GET_AVAILABLE_USERS,
} from "../graphql/projectQueries";
import dayjs from "dayjs";
import CustomFieldRenderer from "./CustomFieldRenderer";
import TaskManager from "./TaskManager";

import React, { useState, useEffect, useCallback } from "react";
import {
  Form,
  Input,
  Select,
  Row,
  Col,
  Button,
  message,
  Card,
  Typography,
  DatePicker,
  InputNumber,
  Divider,
  Alert,
} from "antd";

const { Option } = Select;
const { Text } = Typography;

const ProjectForm = ({ project, mode, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(null);
  // client credit info is now represented by `projectCreditValidation` which
  // contains creditLimit, availableCredit, usedCredit and creditLimitEnabled
  const [projectCreditValidation, setProjectCreditValidation] = useState(null);
  const [clientPreferences, setClientPreferences] = useState(null);
  const [selectedWorkType, setSelectedWorkType] = useState(null);
  const [selectedGrading, setSelectedGrading] = useState(null);
  const [imageQuantity, setImageQuantity] = useState(0);
  const [calculatedBudget, setCalculatedBudget] = useState(0);
  const [perImageRate, setPerImageRate] = useState(null);
  const [gradingTasks, setGradingTasks] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  const [customFieldValues, setCustomFieldValues] = useState({});
  const [workTypeGradings, setWorkTypeGradings] = useState([]);
  const [projectTasks, setProjectTasks] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);

  // lazy queries used by handlers (declared early so handlers can include them in deps)
  const [refetchClientPreferences] = useLazyQuery(GET_CLIENT_PREFERENCES, {
    fetchPolicy: "network-only",
  });
  const [refetchGradingTasks] = useLazyQuery(GET_GRADING_TASKS, {
    fetchPolicy: "network-only",
  });
  const [refetchProjectCreditValidation] = useLazyQuery(VALIDATE_PROJECT_CREDIT, {
    fetchPolicy: "network-only",
  });
  const [refetchCustomFields] = useLazyQuery(GET_WORK_TYPE_FIELDS, {
    fetchPolicy: "network-only",
  });

  const [getWorkTypeGradings] = useLazyQuery(GET_GRADINGS_BY_WORK_TYPE, {
    fetchPolicy: "network-only",
  });

  

  // GraphQL Queries
  const { data: clientsData } = useQuery(GET_CLIENTS, {
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
    variables: {
      filters: {},
      page: 1,
      limit: 100,
      sortBy: "name",
      sortOrder: "ASC",
    },
    fetchPolicy: "cache-and-network",
  });

  const { data: usersData } = useQuery(GET_AVAILABLE_USERS, {
    fetchPolicy: "cache-and-network",
  });

  // GraphQL Mutations
  const [createProject] = useMutation(CREATE_PROJECT, {
    onCompleted: () => {
      message.success("Project created successfully!");
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      message.error(`Error creating project: ${error.message}`);
      setLoading(false);
    },
  });

  const [updateProject] = useMutation(UPDATE_PROJECT, {
    onCompleted: () => {
      message.success("Project updated successfully!");
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      message.error(`Error updating project: ${error.message}`);
      setLoading(false);
    },
  });

  // Helper function to get client display name - prioritize client code
  const getClientDisplayName = (client) => {
    return client.clientCode || 'Unknown Client';
  };

  // Helper function to get searchable text for client
  const getClientSearchText = (client) => {
    const searchFields = [
      client.clientCode,
      client.firstName,
      client.lastName,
      client.displayName,
      client.companyName,
      client.contactNoWork,
      client.contactNoPersonal,
      client.email,
    ];
    return searchFields.filter(Boolean).join(" ").toLowerCase();
  };

  // Filter function for client search
  const filterClients = (inputValue, option) => {
    if (!inputValue) return true;
    const client = clientsData?.clients?.find((c) => c.id === option.value);
    if (!client) return false;

    const searchText = getClientSearchText(client);
    const searchTerms = inputValue.toLowerCase().split(" ");

    return searchTerms.every((term) => searchText.includes(term));
  };

  // Client selection handler
  const handleClientSelect = async (clientId) => {
    setSelectedClientId(clientId);
  // clear any previous client credit display (we rely on projectCreditValidation)
    setClientPreferences(null);
    setProjectCreditValidation(null);

    // Reset dependent fields
    form.setFieldsValue({
      workType: undefined,
      grading: undefined,
      imageQuantity: 0,
    });
    setImageQuantity(0);
    setSelectedWorkType(null);
    setSelectedGrading(null);
    setCalculatedBudget(0);
    setGradingTasks([]);
    setCustomFields([]);
    setCustomFieldValues({});
    setWorkTypeGradings([]);
    setProjectTasks([]);

    // Only fetch if clientId is provided
    if (!clientId) {
      return;
    }

    // Fetch client preferences and credit info
    try {
      const { data } = await refetchClientPreferences({
        variables: {
          clientId: clientId,
        },
      });

      if (data?.clientPreferences) {
        // For now, we'll need to get credit info separately or add it to the backend
  // credit info is fetched separately via VALIDATE_PROJECT_CREDIT

        setClientPreferences(data.clientPreferences);
        // Also fetch a quick credit summary for this client so we can show credit info
        try {
          const creditResp = await refetchProjectCreditValidation({
            variables: { clientId: clientId },
          });
          if (creditResp?.data?.validateProjectCredit) {
            setProjectCreditValidation(creditResp.data.validateProjectCredit);
          }
        } catch (err) {
          // Non-fatal: continue without credit info
          console.warn('Failed to fetch client credit summary', err);
        }
      }
    } catch (error) {
      console.error("Error fetching client preferences:", error);
      message.error("Failed to load client preferences");
    }
  };

  // Load client preferences without resetting form (for edit mode)
  const loadClientPreferences = async (clientId) => {
    if (!clientId) return;
    
    try {
      const { data } = await refetchClientPreferences({
        variables: { clientId: clientId },
      });

      if (data?.clientPreferences) {
        setClientPreferences(data.clientPreferences);
        
        // Also fetch credit summary
        try {
          const creditResp = await refetchProjectCreditValidation({
            variables: { clientId: clientId },
          });
          if (creditResp?.data?.validateProjectCredit) {
            setProjectCreditValidation(creditResp.data.validateProjectCredit);
          }
        } catch (err) {
          console.warn('Failed to fetch client credit summary', err);
        }
      }
    } catch (error) {
      console.error("Error fetching client preferences:", error);
      message.error("Failed to load client preferences");
    }
  };

  // Work type selection handler
  const handleWorkTypeSelect = useCallback(async (workTypeId) => {
    setSelectedWorkType(workTypeId);
    form.setFieldsValue({ grading: undefined });
    setSelectedGrading(null);
    setCalculatedBudget(0);
    setGradingTasks([]);
    setCustomFields([]);
    setCustomFieldValues({});
    setWorkTypeGradings([]);
    setProjectTasks([]);

    // Only fetch if workTypeId is provided
    if (!workTypeId) {
      return;
    }

    try {
      // Fetch both custom fields and gradings for the selected work type in parallel
      const [customFieldsResult, gradingsResult] = await Promise.all([
        refetchCustomFields({
          variables: {
            workTypeId: workTypeId,
          },
        }),
        getWorkTypeGradings({
          variables: {
            workTypeIds: [workTypeId],
          },
        })
      ]);

      // Process custom fields
      if (customFieldsResult.data?.workTypeFields) {
        const fields = [...customFieldsResult.data.workTypeFields].sort((a, b) => a.displayOrder - b.displayOrder);
        setCustomFields(fields);
        
        // Initialize custom field values with default values
        const defaultValues = {};
        fields.forEach(field => {
          if (field.defaultValue) {
            try {
              defaultValues[field.fieldKey] = field.fieldType === 'checkbox' 
                ? field.defaultValue === 'true' || field.defaultValue === true
                : field.defaultValue;
            } catch (error) {
              defaultValues[field.fieldKey] = field.defaultValue;
            }
          }
        });
        setCustomFieldValues(defaultValues);
        
        // Set default values in form
        form.setFieldsValue(defaultValues);
      }

      // Process gradings
      if (gradingsResult.data?.gradingsByWorkType) {
        setWorkTypeGradings(gradingsResult.data.gradingsByWorkType.filter(grading => grading.isActive));
      }
    } catch (error) {
      console.error("Error fetching work type data:", error);
      message.error("Failed to load data for this work type");
    }
  }, [refetchCustomFields, getWorkTypeGradings]);

  // Grading selection handler
  const handleGradingSelect = async (gradingId) => {
    setSelectedGrading(gradingId);
    setCalculatedBudget(0);
    setGradingTasks([]);
    setProjectTasks([]);
  // initialize per-image rate: prefer client's custom rate if available
  const clientCustomRate = clientPreferences?.gradings?.find(g => g.grading?.id === gradingId)?.customRate;
  const gradingDefault = workTypeGradings?.find(g => g.id === gradingId)?.defaultRate;
  const initialRate = clientCustomRate !== undefined && clientCustomRate !== null ? clientCustomRate : (gradingDefault || null);
  setPerImageRate(initialRate);

    // Only fetch if gradingId is provided
    if (!gradingId) {
      return;
    }

    // Fetch grading tasks
    try {
      const { data } = await refetchGradingTasks({
        variables: {
          gradingId: gradingId,
        },
      });

      if (data?.gradingTasks) {
        setGradingTasks(data.gradingTasks);
        // Initialize project tasks with enhanced structure and preferred users
        const initialTasks = data.gradingTasks.map(gradingTask => {
          // Find preferred user for this task type from client preferences
          let preferredUserId = null;
          if (clientPreferences?.taskPreferences) {
            const taskPreference = clientPreferences.taskPreferences.find(
              pref => pref.taskType.id === gradingTask.taskType.id
            );
            
            // Use the first preferred user ID if available
            if (taskPreference && taskPreference.preferredUserIds && taskPreference.preferredUserIds.length > 0) {
              preferredUserId = taskPreference.preferredUserIds[0];
            }
          }

          return {
            id: gradingTask.taskType.id,
            taskTypeId: gradingTask.taskType.id,
            gradingTaskId: gradingTask.id,
            name: gradingTask.taskType.name,
            description: gradingTask.taskType.description || gradingTask.instructions || "",
            assigneeId: preferredUserId, // Pre-select preferred user
            status: "todo",
            priority: "B",
            estimatedHours: gradingTask.estimatedHours || 0,
            actualHours: 0,
            estimatedCost: gradingTask.employeeRate || 0,
            startDate: null,
            dueDate: null,
            dependencies: [],
            blockedBy: [],
            comments: [],
            customFields: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        });
        setProjectTasks(initialTasks);
      }
    } catch (error) {
      console.error("Error fetching grading tasks:", error);
      message.error("Failed to load grading tasks");
    }

    // Recalculate budget if we have quantity (pass initialRate to avoid stale state)
    if (imageQuantity > 0) {
      calculateBudget(gradingId, imageQuantity, initialRate);
    }
  };

  // Load work type data without resetting form (for edit mode)
  const loadWorkTypeData = async (workTypeId) => {
    if (!workTypeId) return;
    
    try {
      const [customFieldsResult, gradingsResult] = await Promise.all([
        refetchCustomFields({
          variables: { workTypeId: workTypeId },
        }),
        getWorkTypeGradings({
          variables: { workTypeIds: [workTypeId] },
        })
      ]);

      if (customFieldsResult.data?.workTypeFields) {
        const fields = [...customFieldsResult.data.workTypeFields].sort((a, b) => a.displayOrder - b.displayOrder);
        setCustomFields(fields);
      }

      if (gradingsResult.data?.gradingsByWorkType) {
        setWorkTypeGradings(gradingsResult.data.gradingsByWorkType);
      }
    } catch (error) {
      console.error("Error loading work type data:", error);
    }
  };

  // Load grading data without resetting form (for edit mode)
  const loadGradingData = async (gradingId) => {
    if (!gradingId) return;
    
    try {
      const { data } = await refetchGradingTasks({
        variables: { gradingId: gradingId },
      });

      if (data?.gradingTasks) {
        setGradingTasks(data.gradingTasks);
        
        // Create initial project tasks from grading tasks
        const initialTasks = data.gradingTasks.map((gradingTask) => {
          let preferredUserId = null;
          if (clientPreferences?.taskPreferences) {
            const taskPreference = clientPreferences.taskPreferences.find(
              pref => pref.taskType.id === gradingTask.taskType.id
            );
            
            if (taskPreference && taskPreference.preferredUserIds && taskPreference.preferredUserIds.length > 0) {
              preferredUserId = taskPreference.preferredUserIds[0];
            }
          }

          return {
            id: gradingTask.taskType.id,
            taskTypeId: gradingTask.taskType.id,
            gradingTaskId: gradingTask.id,
            name: gradingTask.taskType.name,
            description: gradingTask.taskType.description || gradingTask.instructions || "",
            assigneeId: preferredUserId,
            status: "todo",
            priority: "B",
            estimatedHours: gradingTask.estimatedHours || 0,
            actualHours: 0,
            estimatedCost: gradingTask.employeeRate || 0,
            startDate: null,
            dueDate: null,
            dependencies: [],
            blockedBy: [],
            comments: [],
            customFields: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        });
        setProjectTasks(initialTasks);
      }
    } catch (error) {
      console.error("Error loading grading data:", error);
    }
  };

  // Image quantity change handler
  const handleImageQuantityChange = (quantity) => {
    setImageQuantity(quantity || 0);
    form.setFieldsValue({ imageQuantity: quantity });

    if (selectedGrading && quantity > 0) {
      calculateBudget(selectedGrading, quantity);
    } else {
      setCalculatedBudget(0);
    }
  };

  const handlePerImageRateChange = (value) => {
    // allow null/undefined to reset
    const parsed = value === undefined || value === null ? null : Number(value);
    setPerImageRate(parsed);
    // recalc when override rate changes
    if (selectedGrading && imageQuantity > 0) {
      calculateBudget(selectedGrading, imageQuantity, parsed);
    }
  };

  // Custom field value change handler
  const handleCustomFieldChange = (fieldKey, value) => {
    setCustomFieldValues(prev => ({
      ...prev,
      [fieldKey]: value
    }));
  };

  // Budget calculation function
  const calculateBudget = async (gradingId, quantity, overrideRate = undefined) => {
    if (!gradingId || !quantity) {
      setCalculatedBudget(0);
      setProjectCreditValidation(null);
      return;
    }

    try {
      const grading = workTypeGradings?.find((g) => g.id === gradingId);
      if (grading) {
        // determine rate to use: overrideRate > perImageRate > client customRate > grading.defaultRate
        const clientCustom = clientPreferences?.gradings?.find(g => g.grading?.id === gradingId)?.customRate;
        const rateToUse = (overrideRate !== undefined && overrideRate !== null)
          ? overrideRate
          : (perImageRate !== null && perImageRate !== undefined)
            ? perImageRate
            : (clientCustom !== undefined && clientCustom !== null)
              ? clientCustom
              : grading.defaultRate || 0;

        const budget = rateToUse * quantity;
        setCalculatedBudget(budget);

        // Validate project credit if client is selected
        if (selectedClientId) {
          const { data } = await refetchProjectCreditValidation({
            variables: {
              clientId: selectedClientId,
              gradingId: gradingId,
              imageQuantity: quantity,
              estimatedCost: budget,
            },
          });

          if (data?.validateProjectCredit) {
            setProjectCreditValidation(data.validateProjectCredit);
            
            // Show warning if credit validation fails
            if (!data.validateProjectCredit.canCreateProject) {
              message.warning(data.validateProjectCredit.message);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error calculating budget:", error);
    }
  };

  

  // Set available users when users data is loaded
  useEffect(() => {
    if (usersData?.availableUsers) {
      setAvailableUsers(usersData.availableUsers);
    }
  }, [usersData]);

  // Prefetch gradings for edit mode when project data is available
  useEffect(() => {
    if (project && mode === "edit" && project.workTypeId) {
      // Prefetch gradings immediately when we have project data with workTypeId
      getWorkTypeGradings({
        variables: { workTypeIds: [project.workTypeId || project.workType?.id] },
      }).then((result) => {
        if (result.data?.gradingsByWorkType) {
          setWorkTypeGradings(result.data.gradingsByWorkType);
        }
      }).catch((error) => {
        console.error("Error prefetching gradings for edit mode:", error);
      });
    }
  }, [project, mode, getWorkTypeGradings]);

  // If client preferences load after grading was selected, prefer client custom rate
  useEffect(() => {
    if (selectedGrading && clientPreferences) {
      const clientCustom = clientPreferences?.gradings?.find(g => g.grading?.id === selectedGrading)?.customRate;
      const gradingDefault = workTypeGradings?.find(g => g.id === selectedGrading)?.defaultRate || null;
      // Only override perImageRate if user hasn't manually overridden it (i.e., it's null or equal to default)
      if ((perImageRate === null || perImageRate === gradingDefault) && clientCustom !== undefined && clientCustom !== null) {
        setPerImageRate(clientCustom);
        if (imageQuantity > 0) {
          calculateBudget(selectedGrading, imageQuantity, clientCustom);
        }
      }
    }
  }, [clientPreferences, selectedGrading, perImageRate, imageQuantity, workTypeGradings]);

  // Handle task updates
  const handleTaskUpdate = (updatedTasks) => {
    setProjectTasks(updatedTasks);
  };

  // Initialize form when project data changes
  useEffect(() => {
    if (project && mode === "edit") {
      // Async IIFE to ensure proper order
      (async () => {
        form.setFieldsValue({
          clientId: project.clientId || project.client?.id,
          workTypeId: project.workTypeId || project.workType?.id,
          gradingId: project.gradingId || project.grading?.id,
          imageQuantity: project.imageQuantity,
          deadlineDate: project.deadlineDate ? dayjs(project.deadlineDate) : null,
          description: project.description,
          notes: project.notes,
          clientNotes: project.clientNotes,
          priority: project.priority,
          status: project.status,
        });

        // Initialize state for edit mode
        const clientId = project.clientId || project.client?.id;
        const workTypeId = project.workTypeId || project.workType?.id;
        const gradingId = project.gradingId || project.grading?.id;

        if (clientId) {
          setSelectedClientId(clientId);
          await loadClientPreferences(clientId);
        }
        if (workTypeId) {
          setSelectedWorkType(workTypeId);
          await loadWorkTypeData(workTypeId);
        }
        if (gradingId) {
          setSelectedGrading(gradingId);
          await loadGradingData(gradingId);
        }
        if (project.imageQuantity) {
          setImageQuantity(project.imageQuantity);
        }
        if (project.estimatedCost) {
          setCalculatedBudget(project.estimatedCost);
        }
        if (project.customFields) {
          setCustomFieldValues(project.customFields);
        }
      })();
    } else {
      form.resetFields();
      // Reset all state for new project
      setSelectedClientId(null);
    // clear any previous client credit display (we rely on projectCreditValidation)
      setClientPreferences(null);
      setSelectedWorkType(null);
      setSelectedGrading(null);
      setImageQuantity(0);
      setCalculatedBudget(0);
      setGradingTasks([]);
      setCustomFields([]);
      setCustomFieldValues({});
      setProjectTasks([]);
    }
  }, [project, mode, form, handleWorkTypeSelect]);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      // Final credit validation before submission (for new projects)
      if (mode !== "edit" && selectedClientId && projectCreditValidation) {
        if (!projectCreditValidation.canCreateProject) {
          message.error("Cannot create project: " + projectCreditValidation.message);
          setLoading(false);
          return;
        }
      }
      // Determine desired status coming from the hidden input (set by drawer footer buttons)
      const desiredStatus = (typeof document !== 'undefined' && document.getElementById('__project_status'))
        ? String(document.getElementById('__project_status').value || '').toUpperCase()
        : (mode === 'edit' && project ? (project.status || 'DRAFT') : 'DRAFT');

      const projectData = {
        clientId: values.clientId,
        workTypeId: values.workTypeId,
        gradingId: values.gradingId,
        imageQuantity: values.imageQuantity,
        estimatedCost: calculatedBudget, // Always use calculated budget
        description: values.description,
        deadlineDate: values.deadlineDate ? values.deadlineDate.toISOString() : null,
        priority: values.priority,
        notes: values.notes,
        clientNotes: values.clientNotes,
        customFields: customFieldValues,
        // set status depending on which footer button was used
        status: desiredStatus,
        // If saving as draft, do not submit tasks to backend (tasks should be hidden until project is started)
        tasks: (desiredStatus === 'DRAFT') ? [] : projectTasks.map(task => ({
          taskTypeId: task.taskTypeId,
          gradingTaskId: task.gradingTaskId,
          name: task.name,
          title: task.name,
          description: task.description,
          instructions: task.instructions,
          status: task.status,
          priority: task.priority,
          estimatedHours: task.estimatedHours,
          estimatedCost: task.estimatedCost,
          dueDate: task.dueDate,
          assigneeId: task.assigneeId,
          notes: task.notes,
          clientNotes: task.clientNotes
        }))
      };

      if (mode === "edit" && project) {
        await updateProject({
          variables: {
            id: project.id,
            input: projectData,
          },
        });
      } else {
        await createProject({
          variables: { input: projectData },
        });
      }
    } catch (error) {
      console.error("Error saving project:", error);
      setLoading(false);
    }
  };

  // Make form submission accessible to parent component
  useEffect(() => {
    const form_element = document.querySelector("form");
    if (form_element) {
      form_element.onsubmit = (e) => {
        e.preventDefault();
        form.submit();
      };
    }
  }, [form]);

  // Check if form should be disabled due to credit issues
  const isFormDisabledByCredit = projectCreditValidation && !projectCreditValidation.canCreateProject && mode !== "edit";

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      disabled={loading || isFormDisabledByCredit}
    >
      {/* Hidden field used by drawer footer buttons to indicate desired submit status (DRAFT / ACTIVE) */}
      <input type="hidden" id="__project_status" name="__project_status" value={project?.status || "DRAFT"} />
      {/* Credit Validation Alert */}
      {projectCreditValidation && projectCreditValidation.creditLimitEnabled && !projectCreditValidation.canCreateProject && (
        <Alert
          message="Credit Limit Exceeded"
          description={projectCreditValidation.message}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" type="text">
              Contact Admin
            </Button>
          }
        />
      )}
      <Row gutter={16}>
        <Col span={10}>
          <Form.Item
            name="clientId"
            label="Client"
            rules={[{ required: true, message: "Please select a client" }]}
          >
            <Select
              placeholder="Search client by mobile, code, name, or company"
              loading={!clientsData}
              showSearch
              allowClear
              optionFilterProp="children"
              filterOption={filterClients}
              notFoundContent={!clientsData ? "Loading..." : "No clients found"}
              onChange={handleClientSelect}
              labelRender={(props) => {
                const client = clientsData?.clients?.find(
                  (c) => c.id === props.value
                );
                if (!client) return props.label;
                return (
                  <span>
                    <strong>{client.clientCode}</strong>
                  </span>
                );
              }}
            >
              {clientsData?.clients?.map((client) => (
                <Option key={client.id} value={client.id}>
                  <div>
                    <div style={{ fontWeight: "bold" }}>
                      {client.clientCode}
                    </div>
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>

        <Col span={7}>
          <Form.Item
            name="workTypeId"
            label="Work Type"
            rules={[{ required: true, message: "Please select work type" }]}
          >
            <Select
              placeholder="Select work type"
              loading={!workTypesData}
              onChange={handleWorkTypeSelect}
            >
              {workTypesData?.workTypes
                ?.filter((workType) => {
                  if (clientPreferences?.workTypes?.length > 0) {
                    return clientPreferences.workTypes.some(
                      (pref) => pref.id === workType.id
                    );
                  }
                  return true;
                })
                .map((workType) => (
                  <Option key={workType.id} value={workType.id}>
                    {workType.name}
                    {clientPreferences?.workTypes?.some(
                      (pref) => pref.id === workType.id
                    ) && (
                      <span style={{ color: "#52c41a", marginLeft: 8 }}>
                        ★ Preferred
                      </span>
                    )}
                  </Option>
                ))}
            </Select>
          </Form.Item>
        </Col>

        <Col span={7}>
          <Form.Item
            name="gradingId"
            label="Grading"
            rules={[{ required: true, message: "Please select grading" }]}
          >
            <Select
              placeholder={selectedWorkType ? "Select grading" : "Please select work type first"}
              disabled={!selectedWorkType}
              loading={false}
              onChange={handleGradingSelect}
            >
              {workTypeGradings
                ?.filter((grading) => {
                  if (clientPreferences?.gradings?.length > 0) {
                    return clientPreferences.gradings.some(
                      (pref) => pref.grading.id === grading.id
                    );
                  }
                  return true;
                })
                .map((grading) => {
                  const clientPref = clientPreferences?.gradings?.find(
                    (pref) => pref.grading?.id === grading.id
                  );
                  const displayRate = clientPref && clientPref.customRate !== undefined && clientPref.customRate !== null
                    ? clientPref.customRate
                    : grading.defaultRate;
                  return (
                    <Option key={grading.id} value={grading.id}>
                      {grading.name} - ₹{Number(displayRate || 0).toLocaleString()}
                      {clientPref && (
                        <span style={{ color: "#52c41a", marginLeft: 8 }}>
                          ★ Preferred
                        </span>
                      )}
                    </Option>
                  );
                })}
              {workTypeGradings?.length === 0 && selectedWorkType && (
                <Option disabled value="">
                  No gradings available for this work type
                </Option>
              )}
            </Select>
          </Form.Item>
        </Col>
      </Row>

      {/* Quantity, Rate override and Deadline row */}
      <Row gutter={16} style={{ marginTop: 8 }}>
        <Col span={8}>
          <Form.Item
            name="imageQuantity"
            label="Image Quantity"
            rules={[
              { required: true, message: "Please enter image quantity" },
              {
                type: "number",
                min: 1,
                message: "Quantity must be at least 1",
              },
            ]}
          >
            <InputNumber
              placeholder="Enter image quantity"
              style={{ width: "100%" }}
              min={1}
              onChange={handleImageQuantityChange}
            />
          </Form.Item>
        </Col>

        <Col span={8}>
          <Form.Item label="Rate per image (override)">
            <InputNumber
              style={{ width: "100%" }}
              min={0}
              value={perImageRate}
              formatter={(v) => (v === null || v === undefined ? "" : `₹ ${v}`)}
              parser={(v) => String(v).replace(/[₹,\s]/g, "")}
              onChange={handlePerImageRateChange}
              placeholder={selectedGrading ? "Leave empty to use client's/custom/default rate" : "Select grading to override rate"}
              disabled={!selectedGrading}
            />
          </Form.Item>
        </Col>

        <Col span={8}>
          <Form.Item
            name="deadlineDate"
            label="Project Deadline"
            rules={[{ required: true, message: "Please select deadline" }]}
          >
            <DatePicker
              placeholder="Select deadline"
              style={{ width: "100%" }}
              disabledDate={(current) => current && current < dayjs().startOf('day')}
            />
          </Form.Item>
        </Col>
      </Row>

      {/* Description row */}
      <Row gutter={16}>
        <Col span={24}>
          <Form.Item
            name="description"
            label="Project Description"
            rules={[{ required: true, message: "Please enter project description" }]}
          >
            <Input.TextArea
              placeholder="Enter project description"
              rows={3}
              style={{ width: "100%" }}
            />
          </Form.Item>
        </Col>
      </Row>

      {/* Additional Project Fields */}
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item
            name="priority"
            label="Priority"
            rules={[{ required: true, message: "Please select priority" }]}
          >
            <Select placeholder="Select priority">
              <Option value="A">A - High</Option>
              <Option value="B">B - Medium</Option>
              <Option value="C">C - Low</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="Estimated Cost (₹)">
            <div style={{ 
              padding: '4px 11px', 
              backgroundColor: '#f5f5f5', 
              border: '1px solid #d9d9d9',
              borderRadius: '6px',
              minHeight: '32px',
              display: 'flex',
              alignItems: 'center'
            }}>
              <span style={{ color: '#595959', fontWeight: 'bold' }}>
                ₹{calculatedBudget?.toLocaleString() || "0"}
              </span>
              <span style={{ color: '#8c8c8c', marginLeft: '8px', fontSize: '12px' }}>
                (Auto-calculated)
              </span>
            </div>
          </Form.Item>
        </Col>
      </Row>

      {/* Notes Section */}
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="notes"
            label="Internal Notes"
          >
            <Input.TextArea
              placeholder="Internal notes (not visible to client)"
              rows={3}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="clientNotes"
            label="Client Notes"
          >
            <Input.TextArea
              placeholder="Notes visible to client"
              rows={3}
            />
          </Form.Item>
        </Col>
      </Row>

      {/* Status field for edit mode */}
      {mode === "edit" && (
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="status"
              label="Project Status"
              rules={[{ required: true, message: "Please select status" }]}
            >
              <Select placeholder="Select status">
                <Option value="draft">Draft</Option>
                <Option value="active">Active</Option>
                <Option value="in_progress">In Progress</Option>
                <Option value="review">Review</Option>
                <Option value="completed">Completed</Option>
                <Option value="cancelled">Cancelled</Option>
                <Option value="on_hold">On Hold</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
      )}

      {/* Credit information is shown below in Project Summary (uses projectCreditValidation) */}

      
      {/* Custom Fields Section */}
      {customFields.length > 0 && (
        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col span={24}>
            <Card
              title={
                <Text strong>
                  Additional Fields for {workTypesData?.workTypes?.find(wt => wt.id === selectedWorkType)?.name}
                </Text>
              }
              size="small"
              style={{ backgroundColor: "#f9f9f9" }}
            >
              <Row gutter={16}>
                {customFields.map((field) => (
                  <Col span={field.fieldType === 'textarea' ? 24 : 12} key={field.id}>
                    <CustomFieldRenderer
                      field={field}
                      value={customFieldValues[field.fieldKey]}
                      onChange={handleCustomFieldChange}
                      disabled={loading}
                    />
                  </Col>
                ))}
              </Row>
            </Card>
          </Col>
        </Row>
      )}

      {/* Task Management Section */}
      {projectTasks.length > 0 && (
        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col span={24}>
            <Card
              title={<Text strong>Project Tasks Management</Text>}
              size="small"
              style={{ backgroundColor: "#f0f9ff" }}
            >
              <TaskManager
                tasks={projectTasks}
                onTaskUpdate={handleTaskUpdate}
                availableUsers={availableUsers}
                workType={workTypesData?.workTypes?.find(wt => wt.id === selectedWorkType)}
                grading={workTypeGradings?.find(g => g.id === selectedGrading)}
                gradingTasks={gradingTasks}
                clientPreferences={clientPreferences}
                customFields={customFieldValues ? Object.entries(customFieldValues).map(([key, value]) => {
                  const field = customFields.find(f => f.fieldKey === key);
                  return {
                    label: field ? field.fieldName : key,
                    value: value
                  };
                }) : []}
                readOnly={loading || isFormDisabledByCredit}
                layout="row"
                clientCode={selectedClientId ? (clientsData?.clients?.find(c => c.id === selectedClientId)?.clientCode || clientsData?.clients?.find(c => c.id === selectedClientId)?.code) : null}
                projectDescription={form.getFieldValue('description')}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Removed duplicate Deadline and Description fields (already present above as 'deadlineDate' and 'description') */}

      {/* --- Project Summary Section --- */}
      <Divider orientation="left">Project Summary & Credit Validation</Divider>
      <Row gutter={16}>
        <Col span={24}>
          {/* Invoice-Style Summary Card */}
          <Card 
            title={
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Project Invoice Summary</span>
                {projectCreditValidation?.creditLimitEnabled && (
                  <div style={{ fontSize: "12px", fontWeight: "normal" }}>
                    {projectCreditValidation.canCreateProject ? (
                      <span style={{ color: "#52c41a" }}>✓ Credit Approved</span>
                    ) : (
                      <span style={{ color: "#ff4d4f" }}>⚠ Credit Exceeded</span>
                    )}
                  </div>
                )}
              </div>
            }
            style={{ 
              backgroundColor: projectCreditValidation?.canCreateProject === false ? "#fff2f0" : "#f6ffed",
              borderColor: projectCreditValidation?.canCreateProject === false ? "#ffccc7" : "#b7eb8f",
              marginBottom: 16 
            }}
          >
            <Row gutter={[16, 8]}>
              {/* Main Project Details */}
              <Col span={12}>
                <div style={{ borderRight: "1px solid #f0f0f0", paddingRight: "16px" }}>
                  <Text strong style={{ fontSize: "16px", display: "block", marginBottom: "8px" }}>
                    Project Details
                  </Text>
                  <div style={{ marginBottom: "4px" }}>
                    <Text type="secondary">Client: </Text>
                    <Text>
                      {selectedClientId 
                        ? clientsData?.clients?.find(c => c.id === selectedClientId)?.displayName || "Selected Client"
                        : "Not Selected"
                      }
                    </Text>
                  </div>
                  <div style={{ marginBottom: "4px" }}>
                    <Text type="secondary">Work Type: </Text>
                    <Text>
                      {selectedWorkType 
                        ? workTypesData?.workTypes?.find(wt => wt.id === selectedWorkType)?.name || "Selected Work Type"
                        : "Not Selected"
                      }
                    </Text>
                  </div>
                  <div style={{ marginBottom: "4px" }}>
                    <Text type="secondary">Grading: </Text>
                    <Text>
                      {selectedGrading 
                        ? workTypeGradings?.find(g => g.id === selectedGrading)?.name || "Selected Grading"
                        : "Not Selected"
                      }
                    </Text>
                  </div>
                  <div style={{ marginBottom: "4px" }}>
                    <Text type="secondary">Quantity: </Text>
                    <Text strong>{imageQuantity || 0} images</Text>
                  </div>
                  <div>
                    <Text type="secondary">Rate per image: </Text>
                    {(() => {
                      const gradingObj = workTypeGradings?.find(g => g.id === selectedGrading);
                      const clientCustom = clientPreferences?.gradings?.find(g => g.grading?.id === selectedGrading)?.customRate;
                      const rateToShow = (perImageRate !== null && perImageRate !== undefined)
                        ? perImageRate
                        : (clientCustom !== undefined && clientCustom !== null)
                          ? clientCustom
                          : gradingObj?.defaultRate || 0;
                      return <Text>₹{Number(rateToShow).toLocaleString()}</Text>;
                    })()}
                  </div>
                </div>
              </Col>

              {/* Credit Information */}
              <Col span={12}>
                <Text strong style={{ fontSize: "16px", display: "block", marginBottom: "8px" }}>
                  💳 Credit Information
                </Text>
                {projectCreditValidation ? (
                  <>
                    {projectCreditValidation.creditLimitEnabled ? (
                      <>
                        <div style={{ 
                          backgroundColor: projectCreditValidation.canCreateProject ? "#f6ffed" : "#fff2f0",
                          padding: "8px",
                          borderRadius: "4px",
                          marginBottom: "8px",
                          border: `1px solid ${projectCreditValidation.canCreateProject ? "#b7eb8f" : "#ffccc7"}`
                        }}>
                          <div style={{ marginBottom: "4px" }}>
                            <Text type="secondary">Credit Limit: </Text>
                            <Text strong>₹{projectCreditValidation.creditLimit?.toLocaleString()}</Text>
                          </div>
                          <div style={{ marginBottom: "4px" }}>
                            <Text type="secondary">Used Credit: </Text>
                            <Text>₹{projectCreditValidation.usedCredit?.toLocaleString()}</Text>
                          </div>
                          <div style={{ marginBottom: "4px" }}>
                            <Text type="secondary">Available Credit: </Text>
                            <Text strong style={{ color: projectCreditValidation.availableCredit < 0 ? "#ff4d4f" : "#52c41a" }}>
                              ₹{projectCreditValidation.availableCredit?.toLocaleString()}
                            </Text>
                          </div>
                          <div style={{ marginBottom: "4px" }}>
                            <Text type="secondary">Required for Project: </Text>
                            <Text strong>₹{projectCreditValidation.requiredCredit?.toLocaleString()}</Text>
                          </div>
                          <div style={{ 
                            padding: "4px 8px", 
                            borderRadius: "4px", 
                            backgroundColor: projectCreditValidation.canCreateProject ? "#52c41a" : "#ff4d4f",
                            color: "white",
                            textAlign: "center",
                            marginTop: "8px"
                          }}>
                            <Text strong style={{ color: "white" }}>
                              {projectCreditValidation.canCreateProject ? "✓ Credit Approved" : "⚠ Credit Exceeded"}
                            </Text>
                          </div>
                        </div>
                        {!projectCreditValidation.canCreateProject && (
                          <div style={{ fontSize: "11px", color: "#ff4d4f", textAlign: "center" }}>
                            Remaining after project: ₹{(projectCreditValidation.availableCredit - projectCreditValidation.requiredCredit).toLocaleString()}
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{ 
                        textAlign: "center", 
                        padding: "20px",
                        backgroundColor: "#f6ffed",
                        borderRadius: "6px",
                        border: "1px solid #b7eb8f"
                      }}>
                        <Text style={{ color: "#52c41a", fontSize: "16px" }}>
                          ✓ Unlimited Credit - No Restrictions
                        </Text>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ 
                    textAlign: "center", 
                    padding: "20px",
                    backgroundColor: "#fafafa",
                    borderRadius: "6px",
                    border: "1px dashed #d9d9d9"
                  }}>
                    <Text type="secondary">Select client and grading to view credit information</Text>
                  </div>
                )}
              </Col>

              {/* Total Amount Section */}
              <Col span={24}>
                <div style={{ 
                  borderTop: "2px solid #f0f0f0", 
                  marginTop: "16px", 
                  paddingTop: "16px", 
                  textAlign: "center",
                  backgroundColor: projectCreditValidation?.canCreateProject === false ? "#fff1f0" : "#f9f9f9",
                  padding: "16px",
                  borderRadius: "6px"
                }}>
                  <Text strong style={{ fontSize: "18px", display: "block", marginBottom: "8px" }}>
                    Total Project Amount
                  </Text>
                  <div style={{ fontSize: "28px", fontWeight: "bold", color: projectCreditValidation?.canCreateProject === false ? "#ff4d4f" : "#1890ff" }}>
                    ₹{calculatedBudget.toLocaleString()}
                  </div>
                  {projectCreditValidation && !projectCreditValidation.canCreateProject && (
                    <div style={{ marginTop: "8px" }}>
                      <Text type="danger" style={{ fontSize: "12px" }}>
                        {projectCreditValidation.message}
                      </Text>
                    </div>
                  )}
                </div>
              </Col>

              {/* Task Breakdown (if tasks are available) */}
              {projectTasks && projectTasks.length > 0 && (
                <Col span={24}>
                  <div style={{ marginTop: "16px" }}>
                    <Text strong style={{ fontSize: "14px", display: "block", marginBottom: "8px" }}>
                      Task Breakdown
                    </Text>
                    <div style={{ maxHeight: "200px", overflowY: "auto", border: "1px solid #f0f0f0", borderRadius: "4px", padding: "8px" }}>
                      {projectTasks.map((task, index) => (
                        <div key={index} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: index < projectTasks.length - 1 ? "1px solid #f5f5f5" : "none" }}>
                          <span>{task.name || `Task ${index + 1}`}</span>
                          <span>₹{task.estimatedCost?.toLocaleString() || "0"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Col>
              )}
            </Row>
          </Card>
        </Col>
      </Row>


    </Form>
  );
};

export default ProjectForm;
