import {
  useQuery,
  useMutation,
  useLazyQuery,
  useReactiveVar,
} from "@apollo/client";
import { useCacheInvalidation } from "../apolloClient/cacheInvalidationStrategy";
import useAssignmentValidator from "../hooks/useAssignmentValidator";
import { GET_CLIENTS } from "../graphql/clientQueries";
import { userCacheVar } from "../cache/userCacheVar";
import {
  hasPermission,
  MODULES,
  ACTIONS,
  generatePermission,
} from "../config/permissions";
import {
  GET_WORK_TYPES,
  GET_WORK_TYPE_FIELDS,
  GET_GRADINGS_BY_WORK_TYPE,
} from "../graphql/workTypeQueries";
import {
  GET_CLIENT_PREFERENCES,
  GET_GRADING_TASKS,
  VALIDATE_PROJECT_CREDIT,
  VALIDATE_MULTIPLE_GRADING_CREDIT,
  CREATE_PROJECT,
  UPDATE_PROJECT,
  GET_AVAILABLE_USERS,
  REQUEST_CREDIT_APPROVAL,
} from "../graphql/projectQueries";
import dayjs from "dayjs";
import CustomFieldRenderer from "./CustomFieldRenderer";
import TaskManager from "./TaskManager";
import {
  FileTextOutlined,
  PlayCircleOutlined,
  SyncOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  StopOutlined,
  PauseCircleOutlined,
} from "@ant-design/icons";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  Radio,
  Space,
} from "antd";

const { Option } = Select;
const { Text } = Typography;

const ProjectForm = ({
  project,
  mode,
  onClose,
  onSuccess,
  onCreditExceeded,
  onFooterDataChange,
}) => {
  // ✅ Call hook at component top level (React Rules of Hooks)
  const assignmentValidator = useAssignmentValidator();
  
  const [form] = Form.useForm();
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

  // Hide prices if user has limitedRead or limitedEdit (but not full read)
  const shouldHidePrices = hasLimitedRead || hasLimitedEdit;

  const [loading, setLoading] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [creditExceeded, setCreditExceeded] = useState(false);
  // client credit info is now represented by `projectCreditValidation` which
  // contains creditLimit, availableCredit, usedCredit and creditLimitEnabled
  const [projectCreditValidation, setProjectCreditValidation] = useState(null);
  const [clientPreferences, setClientPreferences] = useState(null);
  const [selectedWorkTypes, setSelectedWorkTypes] = useState([]);
  // Multiple gradings support
  const [selectedGradings, setSelectedGradings] = useState([]);
  const [totalImageQuantity, setTotalImageQuantity] = useState(0);
  const [totalCalculatedBudget, setTotalCalculatedBudget] = useState(0);

  // Backward compatibility
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
  const [currentStatus, setCurrentStatus] = useState("draft"); // Track current form status

  // Track original gradings for limited edit permission
  const [originalGradingIds, setOriginalGradingIds] = useState([]);

  // Helper functions for field restrictions based on project status
  const isActiveProject =
    project &&
    mode === "edit" &&
    (project.status === "active" ||
      project.status === "in_progress" ||
      project.status === "completed" ||
      project.status === "delivered");

  const isDraftProject =
    project && mode === "edit" && project.status === "draft";

  // Check if project is fly-on-credit (has approved credit request)
  const isFlyOnCredit =
    project &&
    mode === "edit" &&
    project.creditRequest &&
    project.creditRequest.status === "approved";

  // Allow editing for fly-on-credit projects when status is active or draft
  // Users can edit all fields, but cannot save if the total cost changes
  const canEditFlyOnCreditProject =
    isFlyOnCredit &&
    (project.status === "active" || project.status === "draft");

  // Check if total cost has changed for fly-on-credit projects
  const [costChanged, setCostChanged] = useState(false);
  const [costIncreasedButWithinCredit, setCostIncreasedButWithinCredit] = useState(false);

  useEffect(() => {
    if (isFlyOnCredit && mode === "edit") {
      const newTotalCost = totalCalculatedBudget || calculatedBudget;
      const originalApprovedAmount =
        project?.creditRequest?.requestedAmount ||
        project?.totalEstimatedCost ||
        project?.estimatedCost ||
        0;
      const hasChanged = Math.abs(newTotalCost - originalApprovedAmount) > 0.01;
      setCostChanged(hasChanged);

      // Check if cost increased but is within available credit
      const costIncreased = newTotalCost > originalApprovedAmount;
      const hasAvailableCredit = projectCreditValidation &&
        projectCreditValidation.canCreateProject === true;
      const increasedButWithinCredit = costIncreased && hasAvailableCredit;
      setCostIncreasedButWithinCredit(increasedButWithinCredit);

      // Cost tracking silently
    }
  }, [isFlyOnCredit, mode, project, totalCalculatedBudget, calculatedBudget, projectCreditValidation]);

  // Update parent with footer data whenever totals change
  useEffect(() => {
    if (onFooterDataChange) {
      onFooterDataChange({
        totalImageQuantity,
        totalCalculatedBudget,
        shouldHidePrices,
      });
    }
  }, [
    totalImageQuantity,
    totalCalculatedBudget,
    shouldHidePrices,
    onFooterDataChange,
  ]);

  // Fields that can be edited in active projects (basic details only)
  const isFieldEditableInActive = (fieldName) => {
    const editableFields = [
      "description",
      "notes",
      "deadlineDate",
      "imageQuantity",
      "priority",
      "status",
    ];
    return editableFields.includes(fieldName);
  };

  // Helper functions for multiple grading management
  const updateGradingQuantity = (index, quantity) => {
    const newGradings = [...selectedGradings];
    if (newGradings[index]) {
      newGradings[index] = { ...newGradings[index], imageQuantity: quantity };
      setSelectedGradings(newGradings);

      // Trigger credit validation after quantity change
      setTimeout(() => {
        validateMultipleGradingsCredit(newGradings);
      }, 100);
    }
  };

  const updateGradingCustomRate = (index, customRate) => {
    const newGradings = [...selectedGradings];
    if (newGradings[index]) {
      newGradings[index] = { ...newGradings[index], customRate: customRate };
      setSelectedGradings(newGradings);

      // Trigger credit validation after rate change
      setTimeout(() => {
        validateMultipleGradingsCredit(newGradings);
      }, 100);
    }
  };

  const calculateGradingCost = (gradingData) => {
    if (!gradingData || !gradingData.imageQuantity) return 0;

    // Use custom rate if provided, otherwise check client preferences, then default rate
    let rate = gradingData.customRate;
    if (rate === undefined || rate === null) {
      if (clientPreferences) {
        const clientCustomGrading = clientPreferences.gradings?.find(
          (g) => g.grading?.id === gradingData.gradingId
        );
        rate = clientCustomGrading?.customRate;
      }
      if (rate === undefined || rate === null) {
        rate = gradingData.grading?.defaultRate || 0;
      }
    }

    return rate * gradingData.imageQuantity;
  };

  const calculateTotalCost = () => {
    return selectedGradings.reduce(
      (total, sg) => total + calculateGradingCost(sg),
      0
    );
  };

  const calculateTotalQuantity = () => {
    return selectedGradings.reduce(
      (total, sg) => total + (sg.imageQuantity || 0),
      0
    );
  };

  // lazy queries used by handlers (declared early so handlers can include them in deps)
  const [refetchClientPreferences] = useLazyQuery(GET_CLIENT_PREFERENCES, {
    fetchPolicy: "network-only",
  });
  const [refetchGradingTasks] = useLazyQuery(GET_GRADING_TASKS, {
    fetchPolicy: "network-only",
  });
  const [refetchProjectCreditValidation] = useLazyQuery(
    VALIDATE_PROJECT_CREDIT,
    {
      fetchPolicy: "network-only",
    }
  );
  const [refetchMultipleGradingCreditValidation] = useLazyQuery(
    VALIDATE_MULTIPLE_GRADING_CREDIT,
    {
      fetchPolicy: "network-only",
    }
  );
  const [refetchCustomFields] = useLazyQuery(GET_WORK_TYPE_FIELDS, {
    fetchPolicy: "network-only",
  });

  const [getWorkTypeGradings] = useLazyQuery(GET_GRADINGS_BY_WORK_TYPE, {
    fetchPolicy: "network-only",
  });

  // GraphQL Queries
  const { data: clientsData } = useQuery(GET_CLIENTS, {
    variables: {
      filters: { isActive: true },
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

  // Mapping of workTypeId -> project-specific sequence (fallbacks to global sort order)
  const workTypeSequenceMap = useMemo(() => {
    const mapping = new Map();

    if (project?.projectWorkTypes?.length) {
      [...project.projectWorkTypes]
        .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
        .forEach((pwt, index) => {
          mapping.set(pwt.workTypeId, pwt.sequence ?? index);
        });
      return mapping;
    }

    if (workTypesData?.workTypes?.length) {
      workTypesData.workTypes.forEach((wt, index) => {
        mapping.set(wt.id, wt.sortOrder ?? index);
      });
    }

    return mapping;
  }, [project?.projectWorkTypes, workTypesData?.workTypes]);

  // Mapping of workTypeId -> taskTypeId -> order (uses WorkTypeTask.order to align with TaskTable dynamic columns)
  const workTypeTaskOrderMap = useMemo(() => {
    const mapping = new Map();

    (workTypesData?.workTypes || []).forEach((wt) => {
      const taskOrderMap = new Map();
      [...(wt.taskTypes || [])]
        .sort(
          (a, b) => (a.WorkTypeTask?.order ?? 0) - (b.WorkTypeTask?.order ?? 0)
        )
        .forEach((tt, index) => {
          taskOrderMap.set(tt.id, tt.WorkTypeTask?.order ?? index);
        });
      mapping.set(wt.id, taskOrderMap);
    });

    return mapping;
  }, [workTypesData?.workTypes]);

  const orderTasksByWorkTypeSequence = useCallback(
    (tasks = []) => {
      if (!Array.isArray(tasks) || tasks.length === 0) {
        return Array.isArray(tasks) ? tasks : [];
      }

      return [...tasks]
        .map((task, index) => {
          const workTypeId =
            task.workTypeId ||
            task.workType?.id ||
            task.grading?.workType?.id ||
            task.grading?.workTypeId ||
            null;
          const taskTypeId = task.taskTypeId || task.taskType?.id || null;

          const mappingOrder =
            (workTypeId !== null
              ? workTypeSequenceMap.get(workTypeId)
              : undefined) ?? task.workType?.sortOrder ?? index;

          const taskSequence = task.sequence ?? 0;

          const taskTypeOrder = (() => {
            if (workTypeId && taskTypeId && workTypeTaskOrderMap.has(workTypeId)) {
              const orderMap = workTypeTaskOrderMap.get(workTypeId);
              if (orderMap && orderMap.has(taskTypeId)) {
                return orderMap.get(taskTypeId);
              }
            }
            return Number.MAX_SAFE_INTEGER; // place unknown task types at the end within worktype
          })();

          return { task, mappingOrder, taskTypeOrder, taskSequence, index };
        })
        .sort((a, b) => {
          if (a.mappingOrder !== b.mappingOrder) {
            return a.mappingOrder - b.mappingOrder;
          }
          if (a.taskTypeOrder !== b.taskTypeOrder) {
            return a.taskTypeOrder - b.taskTypeOrder;
          }
          if (a.taskSequence !== b.taskSequence) {
            return a.taskSequence - b.taskSequence;
          }
          return a.index - b.index;
        })
        .map(({ task }) => task);
    },
    [workTypeSequenceMap, workTypeTaskOrderMap]
  );

  const setOrderedProjectTasks = useCallback(
    (tasks = []) => {
      setProjectTasks(orderTasksByWorkTypeSequence(tasks));
    },
    [orderTasksByWorkTypeSequence]
  );

  // Cache invalidation
  const { publishEvent, EVENTS } = useCacheInvalidation();

  // GraphQL Mutations
  const [createProject] = useMutation(CREATE_PROJECT, {
    onCompleted: () => {
      message.success("Project created successfully!");
      // Publish event so all pages refresh
      publishEvent(EVENTS.PROJECT_CREATED, { action: 'create' });
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
      // Publish event so all pages refresh
      publishEvent(EVENTS.PROJECT_UPDATED, { action: 'update' });
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      message.error(`Error updating project: ${error.message}`);
      setLoading(false);
    },
  });

  const [requestCreditApproval] = useMutation(REQUEST_CREDIT_APPROVAL, {
    onCompleted: (data) => {
      setLoading(false);
      message.success("Credit approval request submitted successfully!");
      message.info(
        "Your request has been sent to admin and client leader for approval."
      );
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      console.error("Credit approval error:", error);
      setLoading(false);
      message.error(`Error requesting credit approval: ${error.message}`);
    },
  });

  // Helper function to get client display name - prioritize client code
  const getClientDisplayName = (client) => {
    return client.clientCode || "Unknown Client";
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

    const trimmedInput = inputValue.trim();

    // Check if input contains only digits
    const isNumericSearch = /^\d+$/.test(trimmedInput);

    if (isNumericSearch) {
      // Search only in clientCode number part (e.g., "CL-123" -> "123")
      const clientCodeNumber = client.clientCode?.split("-")[1] || "";
      return clientCodeNumber == trimmedInput;
    } else {
      // Search in all text fields
      const searchText = getClientSearchText(client);
      const searchTerms = trimmedInput.toLowerCase().split(" ");
      return searchTerms.every((term) => searchText.includes(term));
    }
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
    setSelectedWorkTypes([]);
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

    // Populate client notes from selected client (only in create mode)
    if (mode === "create") {
      const selectedClient = clientsData?.clients?.find((c) => c.id === clientId);
      if (selectedClient) {
        // Set notes field with client notes (empty string if no notes)
        form.setFieldsValue({
          notes: selectedClient.clientNotes || "",
        });
      }
    }

    // Fetch client preferences and credit info
    try {
      const { data } = await refetchClientPreferences({
        variables: {
          clientId: clientId,
        },
      });

      if (data?.clientPreferences) {
        console.log(
          "🔍 DEBUG: clientPreferences data received:",
          data.clientPreferences
        );
        console.log(
          "🔍 DEBUG: workTypes in clientPreferences:",
          data.clientPreferences.workTypes
        );

        // For now, we'll need to get credit info separately or add it to the backend
        // credit info is fetched separately via VALIDATE_PROJECT_CREDIT

        setClientPreferences(data.clientPreferences);
        // Also fetch credit info for this client
        // If we have multiple gradings selected, validate those; otherwise get general credit info
        if (selectedGradings.length > 0) {
          setTimeout(() => {
            validateMultipleGradingsCredit(selectedGradings);
          }, 200);
        } else if (selectedGrading && imageQuantity > 0) {
          // Legacy single grading validation
          try {
            const creditResp = await refetchProjectCreditValidation({
              variables: {
                clientId: clientId,
                gradingId: selectedGrading,
                imageQuantity: imageQuantity,
                estimatedCost: calculatedBudget,
              },
            });
            if (creditResp?.data?.validateProjectCredit) {
              setProjectCreditValidation(creditResp.data.validateProjectCredit);
            }
          } catch (err) {
            console.warn("Failed to fetch client credit validation", err);
          }
        } else {
          // Just get general credit info without specific project details
          try {
            const creditResp = await refetchProjectCreditValidation({
              variables: {
                clientId: clientId,
                estimatedCost: 0, // No project selected yet
              },
            });
            if (creditResp?.data?.validateProjectCredit) {
              setProjectCreditValidation(creditResp.data.validateProjectCredit);
            }
          } catch (err) {
            console.warn("Failed to fetch client credit summary", err);
          }
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
        console.log("Client preferences received:", data.clientPreferences);
        console.log(
          "Work types from preferences:",
          data.clientPreferences.workTypes
        );
        console.log(
          "Gradings from preferences:",
          data.clientPreferences.gradings
        );
        console.log(
          "Task preferences from preferences:",
          data.clientPreferences.taskPreferences
        );

        setClientPreferences(data.clientPreferences);

        // Also fetch credit summary (for edit mode, validate current project state)
        if (selectedGradings.length > 0) {
          setTimeout(() => {
            validateMultipleGradingsCredit(selectedGradings);
          }, 200);
        } else if (selectedGrading && imageQuantity > 0) {
          try {
            const creditResp = await refetchProjectCreditValidation({
              variables: {
                clientId: clientId,
                gradingId: selectedGrading,
                imageQuantity: imageQuantity,
                estimatedCost: calculatedBudget,
              },
            });
            if (creditResp?.data?.validateProjectCredit) {
              setProjectCreditValidation(creditResp.data.validateProjectCredit);
            }
          } catch (err) {
            console.warn("Failed to fetch client credit validation", err);
          }
        } else {
          try {
            const creditResp = await refetchProjectCreditValidation({
              variables: {
                clientId: clientId,
                estimatedCost: 0, // No project selected yet
              },
            });
            if (creditResp?.data?.validateProjectCredit) {
              setProjectCreditValidation(creditResp.data.validateProjectCredit);
            }
          } catch (err) {
            console.warn("Failed to fetch client credit summary", err);
          }
        }
      } else {
        console.log("No client preferences received or data is empty:", data);
      }
    } catch (error) {
      console.error("Error fetching client preferences:", error);
      message.error("Failed to load client preferences");
    }
  };

  // Work type selection handler - updated to handle multiple work types
  const handleWorkTypeSelect = useCallback(
    async (workTypeIds, existingCustomFieldValues = null) => {
      // Work type selection processing

      setSelectedWorkTypes(workTypeIds || []);

      // Clear all grading-related states when work types change
      setSelectedGrading(null);
      setCalculatedBudget(0);
      setGradingTasks([]);
      setCustomFields([]);

      // Clear selected gradings (multiple grading support)
      setSelectedGradings([]);
      setTotalImageQuantity(0);
      setTotalCalculatedBudget(0);

      // Clear project tasks
      setProjectTasks([]);

      // Determine if we're in edit mode with existing values
      const hasExistingValues =
        existingCustomFieldValues &&
        typeof existingCustomFieldValues === "object" &&
        !Array.isArray(existingCustomFieldValues) &&
        Object.keys(existingCustomFieldValues).length > 0;

      // Only clear custom field values if not in edit mode with existing values
      if (!hasExistingValues) {
        // Clearing custom field values
        setCustomFieldValues({});
      } else {
        // Preserving custom field values
      }
      setWorkTypeGradings([]);

      // Only fetch if workTypeIds is provided and has values
      if (!workTypeIds || workTypeIds.length === 0) {
        return;
      }

      try {
        // Fetch custom fields for the first work type (or merge from all work types if needed)
        // For now, using the first work type for custom fields
        const primaryWorkTypeId = workTypeIds[0];

        // Fetch both custom fields and gradings for all selected work types in parallel
        const [customFieldsResult, gradingsResult] = await Promise.all([
          refetchCustomFields({
            variables: {
              workTypeId: primaryWorkTypeId,
            },
          }),
          getWorkTypeGradings({
            variables: {
              workTypeIds: workTypeIds,
            },
          }),
        ]);

        // Process custom fields
        if (customFieldsResult.data?.workTypeFields) {
          const fields = [...customFieldsResult.data.workTypeFields].sort(
            (a, b) => a.displayOrder - b.displayOrder
          );
          console.log("Fetched work type fields:", fields);
          setCustomFields(fields);

          // If we have existing custom field values (edit mode), use those
          if (hasExistingValues) {
            console.log(
              "Setting existing custom field values:",
              existingCustomFieldValues
            );
            setCustomFieldValues(existingCustomFieldValues);
            // Set existing values in form
            form.setFieldsValue(existingCustomFieldValues);
            console.log("Form fields set with existing values");
          } else {
            // Initialize custom field values with default values (create mode)
            console.log("Setting default custom field values");
            const defaultValues = {};
            fields.forEach((field) => {
              if (field.defaultValue) {
                try {
                  defaultValues[field.fieldKey] =
                    field.fieldType === "checkbox"
                      ? field.defaultValue === "true" ||
                      field.defaultValue === true
                      : field.defaultValue;
                } catch (error) {
                  defaultValues[field.fieldKey] = field.defaultValue;
                }
              }
            });
            console.log("Default values:", defaultValues);
            setCustomFieldValues(defaultValues);

            // Set default values in form
            form.setFieldsValue(defaultValues);
          }
        }

        // Process gradings
        if (gradingsResult.data?.gradingsByWorkType) {
          setWorkTypeGradings(
            gradingsResult.data.gradingsByWorkType.filter(
              (grading) => grading.isActive
            )
          );
        }
      } catch (error) {
        console.error("Error fetching work type data:", error);
        message.error("Failed to load data for this work type");
      }
    },
    [refetchCustomFields, getWorkTypeGradings, form]
  );

  // Grading selection handler
  const handleGradingSelect = async (gradingId) => {
    setSelectedGrading(gradingId);
    setCalculatedBudget(0);
    setGradingTasks([]);
    setProjectTasks([]);
    // initialize per-image rate: prefer client's custom rate if available
    const clientCustomRate = clientPreferences?.gradings?.find(
      (g) => g.grading?.id === gradingId
    )?.customRate;
    const gradingDefault = workTypeGradings?.find(
      (g) => g.id === gradingId
    )?.defaultRate;
    const initialRate =
      clientCustomRate !== undefined &&
        clientCustomRate !== null
        ? clientCustomRate
        : gradingDefault || null;
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
        // Filter to only include active grading tasks
        const activeGradingTasks = data.gradingTasks.filter(
          (gt) => gt.isActive === true
        );
        setGradingTasks(activeGradingTasks);

        // Only initialize project tasks when status is active (create mode) or active projects (edit mode)
        if (
          currentStatus === "active" ||
          (mode === "edit" && isActiveProject)
        ) {
          // Get project deadline from form
          const projectDeadline = form.getFieldValue("deadlineDate");

          // Initialize project tasks with enhanced structure and preferred users
          const initialTasks = activeGradingTasks.map((gradingTask) => {
            // Find preferred user for this task type from client preferences
            let preferredUserId = null;
            if (clientPreferences?.taskPreferences) {
              const taskPreference = clientPreferences.taskPreferences.find(
                (pref) => pref.taskType.id === gradingTask.taskType.id
              );

              // Use the first preferred user ID if available
              if (
                taskPreference &&
                taskPreference.preferredUserIds &&
                taskPreference.preferredUserIds.length > 0
              ) {
                preferredUserId = taskPreference.preferredUserIds[0];
              }
            }

            // Get the current grading and worktype data
            const currentGrading = workTypeGradings?.find(
              (g) => g.id === gradingId
            );
            const currentWorkType = workTypesData?.workTypes?.find(
              (wt) => wt.id === (selectedWorkTypes && selectedWorkTypes[0])
            );

            return {
              // Use gradingTask.id as the stable unique identifier to avoid collisions across tasks
              id: gradingTask.id,
              taskKey: gradingTask.id,
              taskTypeId: gradingTask.taskType.id,
              gradingTaskId: gradingTask.id,
              name: gradingTask.taskType.name,
              description:
                gradingTask.taskType.description ||
                gradingTask.instructions ||
                "",
              assigneeId: preferredUserId, // Pre-select preferred user
              status: "todo",
              priority: "B",
              estimatedHours: gradingTask.estimatedHours || 0,
              actualHours: 0,
              estimatedCost: gradingTask.employeeRate || 0,
              startDate: null,
              dueDate: projectDeadline ? projectDeadline.toISOString() : null,
              dependencies: [],
              blockedBy: [],
              comments: [],
              customFields: {},
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              // Add worktype and grading info for grouping
              workType: currentWorkType,
              workTypeId: currentWorkType?.id,
              grading: currentGrading,
              gradingId: currentGrading?.id,
              gradingName: currentGrading?.name,
              sequence: gradingTask.sequence || 0,
            };
          });
          setOrderedProjectTasks(initialTasks);
        }
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

  // Multiple grading selection handler
  const handleMultipleGradingSelect = async (selectedGradingIds) => {
    const currentSelectedIds = selectedGradings.map((sg) => sg.gradingId);

    // Find newly added and removed gradings
    const addedIds = selectedGradingIds.filter(
      (id) => !currentSelectedIds.includes(id)
    );
    const removedIds = currentSelectedIds.filter(
      (id) => !selectedGradingIds.includes(id)
    );

    // Check if trying to remove original gradings from a started project
    // This applies to ALL users, not just those with limited edit permission
    if (mode === "edit" && isActiveProject && originalGradingIds.length > 0) {
      const attemptedRemoveOriginal = removedIds.filter((id) =>
        originalGradingIds.includes(id)
      );

      if (attemptedRemoveOriginal.length > 0) {
        message.warning(
          "You cannot remove existing gradings from a started project. You can only add new gradings and adjust quantities or prices."
        );

        // Restore original gradings that user tried to remove
        const restoredIds = selectedGradingIds.concat(attemptedRemoveOriginal);

        // Update the select to show the restored state
        // We need to filter out the removed ones first, then add back the originals
        const validRemovedIds = removedIds.filter(
          (id) => !originalGradingIds.includes(id)
        );

        let newSelectedGradings = [...selectedGradings];
        newSelectedGradings = newSelectedGradings.filter(
          (sg) => !validRemovedIds.includes(sg.gradingId)
        );

        setSelectedGradings(newSelectedGradings);
        return; // Exit early to prevent further processing
      }
    }

    let newSelectedGradings = [...selectedGradings];

    // Remove unselected gradings (only those allowed to be removed)
    newSelectedGradings = newSelectedGradings.filter(
      (sg) => !removedIds.includes(sg.gradingId)
    );

    // Add newly selected gradings
    addedIds.forEach((gradingId) => {
      const grading = workTypeGradings?.find((g) => g.id === gradingId);
      if (grading) {
        // Check if client has a custom rate for this grading
        const clientPref = clientPreferences?.gradings?.find(
          (pref) => pref.grading?.id === gradingId
        );
        const clientCustomRate =
          clientPref &&
            clientPref.customRate !== undefined &&
            clientPref.customRate !== null
            ? clientPref.customRate
            : null;

        newSelectedGradings.push({
          gradingId: gradingId,
          grading: grading,
          imageQuantity: 1, // Default quantity
          customRate: clientCustomRate, // Pre-fill with client's custom rate if available
          sequence: newSelectedGradings.length + 1,
        });
      }
    });

    setSelectedGradings(newSelectedGradings);

    // If this is the first selection or all selections were removed, handle legacy state
    if (newSelectedGradings.length === 0) {
      setSelectedGrading(null);
      setCalculatedBudget(0);
      setGradingTasks([]);
      setProjectTasks([]);
    } else if (newSelectedGradings.length === 1) {
      // For single selection, maintain backward compatibility
      const singleGrading = newSelectedGradings[0];
      setSelectedGrading(singleGrading.gradingId);

      // Set per-image rate for single selection
      const clientCustomRate = clientPreferences?.gradings?.find(
        (g) => g.grading?.id === singleGrading.gradingId
      )?.customRate;
      const gradingDefault = singleGrading.grading?.defaultRate;
      const initialRate =
        clientCustomRate !== undefined &&
          clientCustomRate !== null
          ? clientCustomRate
          : gradingDefault || null;
      setPerImageRate(initialRate);

      // Fetch grading tasks for the single selection
      if (singleGrading.gradingId) {
        try {
          const { data } = await refetchGradingTasks({
            variables: {
              gradingId: singleGrading.gradingId,
            },
          });

          if (data?.gradingTasks) {
            // Filter to only include active grading tasks
            const activeGradingTasks = data.gradingTasks.filter(
              (gt) => gt.isActive === true
            );
            setGradingTasks(activeGradingTasks);

            // Initialize project tasks if needed
            if (
              currentStatus === "active" ||
              (mode === "edit" && isActiveProject)
            ) {
              // Get project deadline from form
              const projectDeadline = form.getFieldValue("deadlineDate");

              const currentGrading = singleGrading.grading;
              const currentWorkType = workTypesData?.workTypes?.find(
                (wt) => wt.id === (selectedWorkTypes && selectedWorkTypes[0])
              );

              const initialTasks = activeGradingTasks.map((gradingTask) => {
                let preferredUserId = null;
                if (
                  clientPreferences?.taskPreferences &&
                  gradingTask?.taskType
                ) {
                  const taskPreference = clientPreferences.taskPreferences.find(
                    (pref) => pref?.taskType?.id === gradingTask.taskType.id
                  );
                  if (
                    taskPreference &&
                    taskPreference.preferredUserIds &&
                    taskPreference.preferredUserIds.length > 0
                  ) {
                    preferredUserId = taskPreference.preferredUserIds[0];
                  }
                }

                return {
                  // Stable task identity for validation and updates
                  id: gradingTask.id,
                  taskKey: gradingTask.id,
                  gradingTaskId: gradingTask.id,
                  taskTypeId: gradingTask?.taskType?.id,
                  name:
                    gradingTask?.taskType?.name ||
                    gradingTask.name ||
                    "Unnamed Task",
                  title:
                    gradingTask?.taskType?.name ||
                    gradingTask.name ||
                    "Unnamed Task",
                  description:
                    gradingTask.description ||
                    gradingTask?.taskType?.description ||
                    "",
                  instructions: gradingTask.instructions || "",
                  status: "todo",
                  priority: gradingTask.priority || "B",
                  estimatedHours: gradingTask.estimatedHours || 0,
                  estimatedCost: gradingTask.estimatedCost || 0,
                  dueDate: projectDeadline
                    ? projectDeadline.toISOString()
                    : null,
                  assigneeId: preferredUserId,
                  notes: "",
                  taskType: gradingTask.taskType,
                  gradingTask: gradingTask,
                  customFields: {},
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  workType: currentWorkType,
                  workTypeId: currentWorkType?.id,
                  grading: currentGrading,
                  gradingId: currentGrading?.id,
                  gradingName: currentGrading?.name,
                  sequence: gradingTask.sequence || 0,
                };
              });
              setOrderedProjectTasks(initialTasks);
            }
          }
        } catch (error) {
          console.error("Error fetching grading tasks:", error);
          message.error("Failed to load grading tasks");
        }
      }
    } else {
      // Multiple selections - fetch tasks for all gradings and combine them
      setSelectedGrading(null);
      setPerImageRate(null);

      // Fetch tasks for all selected gradings
      try {
        const taskPromises = newSelectedGradings.map((sg) =>
          refetchGradingTasks({
            variables: {
              gradingId: sg.gradingId,
            },
          })
        );

        const taskResults = await Promise.all(taskPromises);

        // Combine all tasks from all gradings and filter to only include active ones
        const allGradingTasks = taskResults
          .flatMap((result) => result.data?.gradingTasks || [])
          .filter((gt) => gt.isActive === true);

        setGradingTasks(allGradingTasks);

        // Initialize project tasks if status is active
        if (
          currentStatus === "active" ||
          (mode === "edit" && isActiveProject)
        ) {
          // Get project deadline from form
          const projectDeadline = form.getFieldValue("deadlineDate");

          const initialTasks = allGradingTasks.map((gradingTask) => {
            let preferredUserId = null;
            if (clientPreferences?.taskPreferences && gradingTask?.taskType) {
              const taskPreference = clientPreferences.taskPreferences.find(
                (pref) => pref?.taskType?.id === gradingTask.taskType.id
              );
              if (
                taskPreference &&
                taskPreference.preferredUserIds &&
                taskPreference.preferredUserIds.length > 0
              ) {
                preferredUserId = taskPreference.preferredUserIds[0];
              }
            }

            // Find which grading this task belongs to by matching gradingId
            const selectedGradingObj = newSelectedGradings.find(
              (sg) => sg.gradingId === gradingTask.gradingId
            );
            const taskGrading = selectedGradingObj?.grading;
            
            // Get the correct worktype for this grading (not all the same)
            const taskWorkType = taskGrading?.workType || 
              workTypesData?.workTypes?.find(
                (wt) => wt.id === taskGrading?.workTypeId
              );

            return {
              // Ensure each task has a stable unique id/key (gradingTask.id)
              id: gradingTask.id,
              taskKey: gradingTask.id,
              gradingTaskId: gradingTask.id,
              taskTypeId: gradingTask?.taskType?.id,
              name:
                gradingTask?.taskType?.name ||
                gradingTask.name ||
                "Unnamed Task",
              title:
                gradingTask?.taskType?.name ||
                gradingTask.name ||
                "Unnamed Task",
              description:
                gradingTask.description ||
                gradingTask?.taskType?.description ||
                "",
              instructions: gradingTask.instructions || "",
              status: "todo",
              priority: gradingTask.priority || "B",
              estimatedHours: gradingTask.estimatedHours || 0,
              estimatedCost: gradingTask.estimatedCost || 0,
              dueDate: projectDeadline ? projectDeadline.toISOString() : null,
              assigneeId: preferredUserId,
              notes: "",
              taskType: gradingTask.taskType,
              gradingTask: gradingTask,
              customFields: {},
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              workType: taskWorkType,
              workTypeId: taskWorkType?.id,
              grading: taskGrading,
              gradingId: taskGrading?.id,
              gradingName: taskGrading?.name,
              sequence: gradingTask.sequence || 0,
            };
          });
          setOrderedProjectTasks(initialTasks);
        }
      } catch (error) {
        console.error("Error fetching tasks for multiple gradings:", error);
        message.error("Failed to load tasks for selected gradings");
      }
    }

    // Trigger credit validation for the new grading selection
    if (newSelectedGradings.length > 0 && selectedClientId) {
      setTimeout(() => {
        validateMultipleGradingsCredit(newSelectedGradings);
      }, 200);
    } else {
      setProjectCreditValidation(null);
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
        }),
      ]);

      if (customFieldsResult.data?.workTypeFields) {
        const fields = [...customFieldsResult.data.workTypeFields].sort(
          (a, b) => a.displayOrder - b.displayOrder
        );
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
        // Filter to only include active grading tasks
        const activeGradingTasks = data.gradingTasks.filter(
          (gt) => gt.isActive === true
        );
        setGradingTasks(activeGradingTasks);

        // Only create project tasks when status is active (create mode) or active projects (edit mode)
        if (
          currentStatus === "active" ||
          (mode === "edit" && isActiveProject)
        ) {
          // Get project deadline from form
          const projectDeadline = form.getFieldValue("deadlineDate");

          // Create initial project tasks from grading tasks
          const initialTasks = activeGradingTasks.map((gradingTask) => {
            let preferredUserId = null;
            if (clientPreferences?.taskPreferences) {
              const taskPreference = clientPreferences.taskPreferences.find(
                (pref) => pref.taskType.id === gradingTask.taskType.id
              );

              if (
                taskPreference &&
                taskPreference.preferredUserIds &&
                taskPreference.preferredUserIds.length > 0
              ) {
                preferredUserId = taskPreference.preferredUserIds[0];
              }
            }

            return {
              id: gradingTask.taskType.id,
              taskTypeId: gradingTask.taskType.id,
              gradingTaskId: gradingTask.id,
              name: gradingTask.taskType.name,
              description:
                gradingTask.taskType.description ||
                gradingTask.instructions ||
                "",
              assigneeId: preferredUserId,
              status: "todo",
              priority: "B",
              estimatedHours: gradingTask.estimatedHours || 0,
              actualHours: 0,
              estimatedCost: gradingTask.employeeRate || 0,
              startDate: null,
              dueDate: projectDeadline ? projectDeadline.toISOString() : null,
              dependencies: [],
              blockedBy: [],
              comments: [],
              customFields: {},
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
          });
          setOrderedProjectTasks(initialTasks);
        }
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

  // Custom field value change handler
  const handleCustomFieldChange = (fieldKey, value) => {
    // Prevent storing tree node objects or other complex objects
    // Only allow primitive values: string, number, boolean, or arrays of primitives
    if (value !== null && value !== undefined) {
      if (typeof value === "object" && !Array.isArray(value)) {
        console.warn(
          "Attempted to set non-primitive value for custom field:",
          fieldKey,
          value
        );
        return; // Don't store object values
      }
      if (
        Array.isArray(value) &&
        value.some((v) => typeof v === "object" && v !== null)
      ) {
        console.warn(
          "Attempted to set array with objects for custom field:",
          fieldKey,
          value
        );
        // Filter out objects from array
        value = value.filter((v) => typeof v !== "object" || v === null);
      }
    }

    setCustomFieldValues((prev) => ({
      ...prev,
      [fieldKey]: value,
    }));
  };

  // Budget calculation function
  const calculateBudget = async (
    gradingId,
    quantity,
    overrideRate = undefined
  ) => {
    if (!gradingId || !quantity) {
      setCalculatedBudget(0);
      setProjectCreditValidation(null);
      return;
    }

    try {
      const grading = workTypeGradings?.find((g) => g.id === gradingId);
      if (grading) {
        // determine rate to use: overrideRate > perImageRate > client customRate > grading.defaultRate
        const clientCustom = clientPreferences?.gradings?.find(
          (g) => g.grading?.id === gradingId
        )?.customRate;
        const rateToUse =
          overrideRate !== undefined && overrideRate !== null
            ? overrideRate
            : perImageRate !== null && perImageRate !== undefined
              ? perImageRate
              : clientCustom !== undefined && clientCustom !== null
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
            // BUT skip if:
            // 1. Project is already in fly-on-credit mode (status='requested')
            // 2. Project has an approved credit request
            // 3. Creating new project and credit exceeded (fly-on-credit flow active)
            const isInFlyOnCreditMode =
              project?.status === "requested" ||
              project?.creditRequest?.status === "approved" ||
              currentStatus === "requested";
            const isNewProjectWithExceededCredit =
              mode === "create" && !data.validateProjectCredit.canCreateProject;

            // Don't show warning if in fly-on-credit mode or if this is a new exceeded project
            if (
              !data.validateProjectCredit.canCreateProject &&
              !isInFlyOnCreditMode &&
              !isNewProjectWithExceededCredit
            ) {
              message.warning(data.validateProjectCredit.message);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error calculating budget:", error);
    }
  };

  // Credit validation for multiple gradings
  const validateMultipleGradingsCredit = async (
    gradings = selectedGradings
  ) => {
    if (!selectedClientId || !gradings || gradings.length === 0) {
      setProjectCreditValidation(null);
      return;
    }

    try {
      // Prepare project gradings data for validation
      const projectGradingsData = gradings.map((sg) => {
        const grading = workTypeGradings?.find((g) => g.id === sg.gradingId);
        const clientPref = clientPreferences?.gradings?.find(
          (pref) => pref.grading?.id === sg.gradingId
        );

        // Use same priority logic as display: customRate > clientPref.customRate > grading.defaultRate
        const effectiveRate =
          sg.customRate !== undefined &&
            sg.customRate !== null
            ? sg.customRate
            : clientPref &&
              clientPref.customRate !== undefined &&
              clientPref.customRate !== null
              ? clientPref.customRate
              : grading?.defaultRate || 0;

        return {
          gradingId: sg.gradingId,
          imageQuantity: sg.imageQuantity || 0,
          customRate: effectiveRate, // Send the calculated effective rate instead of just the custom rate
        };
      });

      const { data } = await refetchMultipleGradingCreditValidation({
        variables: {
          clientId: selectedClientId,
          projectGradings: projectGradingsData,
        },
      });

      if (data?.validateMultipleGradingCredit) {
        setProjectCreditValidation(data.validateMultipleGradingCredit);

        const exceeded = !data.validateMultipleGradingCredit.canCreateProject;
        console.log("💰 Credit validation result:", {
          canCreateProject: data.validateMultipleGradingCredit.canCreateProject,
          exceeded,
          message: data.validateMultipleGradingCredit.message,
          availableCredit: data.validateMultipleGradingCredit.availableCredit,
          requiredCredit: data.validateMultipleGradingCredit.requiredCredit,
        });
        setCreditExceeded(exceeded);

        // Notify parent component about credit exceeded status
        if (onCreditExceeded) {
          console.log("📢 Notifying parent about credit exceeded:", exceeded);
          onCreditExceeded(exceeded, data.validateMultipleGradingCredit);
        }

        // Show warning if credit validation fails
        // BUT skip if:
        // 1. Project is already in fly-on-credit mode (status='requested')
        // 2. Project has an approved credit request
        // 3. Creating new project and credit exceeded (fly-on-credit flow active)
        // 4. Credit was already exceeded before this validation (user already knows)
        const isInFlyOnCreditMode =
          project?.status === "requested" ||
          project?.creditRequest?.status === "approved" ||
          currentStatus === "requested";
        const isNewProjectWithExceededCredit = mode === "create" && exceeded;
        const wasAlreadyExceeded = creditExceeded; // Credit was already exceeded before adding this grading

        // Don't show warning if in fly-on-credit mode, if this is a new exceeded project, or if credit was already exceeded
        if (
          exceeded &&
          !isInFlyOnCreditMode &&
          !isNewProjectWithExceededCredit &&
          !wasAlreadyExceeded
        ) {
          message.warning(data.validateMultipleGradingCredit.message);
        }
      }
    } catch (error) {
      console.error("Error validating multiple gradings credit:", error);
    }
  };

  // Set available users when users data is loaded
  useEffect(() => {
    if (usersData?.availableUsers) {
      setAvailableUsers(usersData.availableUsers);
    }
  }, [usersData]);

  // Listen for credit approval request event from parent drawer
  useEffect(() => {
    const handleCreditRequestEvent = () => {
      handleRequestCreditApproval();
    };

    window.addEventListener(
      "request-credit-approval",
      handleCreditRequestEvent
    );

    return () => {
      window.removeEventListener(
        "request-credit-approval",
        handleCreditRequestEvent
      );
    };
  }, []);

  // Prefetch gradings for edit mode when project data is available
  useEffect(() => {
    if (
      project &&
      mode === "edit" &&
      (project.projectWorkTypes?.length > 0 || project.workTypes?.length > 0)
    ) {
      // Prefetch gradings immediately when we have project data with workTypes
      const workTypeIds =
        project.projectWorkTypes?.map((pwt) => pwt.workTypeId) ||
        project.workTypes?.map((wt) => wt.id) ||
        [];

      if (workTypeIds.length > 0) {
        getWorkTypeGradings({
          variables: {
            workTypeIds: workTypeIds,
          },
        })
          .then((result) => {
            if (result.data?.gradingsByWorkType) {
              setWorkTypeGradings(result.data.gradingsByWorkType);
            }
          })
          .catch((error) => {
            console.error("Error prefetching gradings for edit mode:", error);
          });
      }
    }
  }, [project, mode, getWorkTypeGradings]);

  // If client preferences load after grading was selected, prefer client custom rate
  useEffect(() => {
    if (selectedGrading && clientPreferences) {
      const clientCustom = clientPreferences?.gradings?.find(
        (g) => g.grading?.id === selectedGrading
      )?.customRate;
      const gradingDefault =
        workTypeGradings?.find((g) => g.id === selectedGrading)?.defaultRate ||
        null;
      // Only override perImageRate if user hasn't manually overridden it (i.e., it's null or equal to default)
      if (
        (perImageRate === null || perImageRate === gradingDefault) &&
        clientCustom !== undefined &&
        clientCustom !== null
      ) {
        setPerImageRate(clientCustom);
        if (imageQuantity > 0) {
          calculateBudget(selectedGrading, imageQuantity, clientCustom);
        }
      }
    }
  }, [
    clientPreferences,
    selectedGrading,
    perImageRate,
    imageQuantity,
    workTypeGradings,
  ]);

  // Update totals when selectedGradings changes
  useEffect(() => {
    const newTotalQuantity = calculateTotalQuantity();
    const newTotalCost = calculateTotalCost();

    setTotalImageQuantity(newTotalQuantity);
    setTotalCalculatedBudget(newTotalCost);

    // Update backward compatibility fields
    setImageQuantity(newTotalQuantity);
    setCalculatedBudget(newTotalCost);

    // Trigger credit validation if we have selected client and gradings
    // Also check if status is active or being changed to active to show fly-on-credit button
    if (selectedClientId && selectedGradings.length > 0) {
      setTimeout(() => {
        console.log(
          "🔍 Triggering credit validation from selectedGradings change"
        );
        validateMultipleGradingsCredit(selectedGradings);
      }, 100);
    } else if (selectedClientId && selectedGradings.length === 0) {
      // No gradings selected, reset credit exceeded state
      setCreditExceeded(false);
      if (onCreditExceeded) {
        onCreditExceeded(false, null);
      }
    }
  }, [selectedGradings, selectedClientId]);

  // Handle task updates
  const handleTaskUpdate = (updatedTasks) => {
    setOrderedProjectTasks(updatedTasks);
  };

  // Initialize form when project data changes
  useEffect(() => {
    if (project && mode === "edit") {
      // Async IIFE to ensure proper order
      (async () => {
        console.log("=== ProjectForm Edit Mode Initialization ===");
        console.log("Project data:", project);
        console.log("Project customFields:", project.customFields);
        console.log("Project notes:", project.notes);

        // Get work types from projectWorkTypes junction table
        const workTypeIds =
          project.projectWorkTypes && project.projectWorkTypes.length > 0
            ? [...project.projectWorkTypes]
              .sort((a, b) => a.sequence - b.sequence) // Sort by sequence (operate on a copy)
              .map((pwt) => pwt.workTypeId)
            : project.workTypes && project.workTypes.length > 0
              ? project.workTypes.map((wt) => wt.id)
              : [];

        form.setFieldsValue({
          clientId: project.clientId || project.client?.id,
          workTypeIds: workTypeIds,
          gradingId: project.gradingId || project.grading?.id, // Keep for backward compatibility
          imageQuantity: project.imageQuantity || project.totalImageQuantity,
          deadlineDate: project.deadlineDate
            ? dayjs(project.deadlineDate)
            : null,
          name: project.name,
          description: project.description,
          notes: project.notes,
          priority: project.priority,
          status: project.status,
        });

        // Initialize state for edit mode
        const clientId = project.clientId || project.client?.id;
        const gradingId = project.gradingId || project.grading?.id;

        if (clientId) {
          setSelectedClientId(clientId);
          await loadClientPreferences(clientId);
        }
        if (workTypeIds && workTypeIds.length > 0) {
          setSelectedWorkTypes(workTypeIds);
          // Pass existing custom field values to preserve them in edit mode
          console.log(
            "Calling handleWorkTypeSelect with customFields:",
            project.customFields
          );
          await handleWorkTypeSelect(workTypeIds, project.customFields || null);
        }

        // Initialize multiple gradings or fallback to single grading
        if (project.projectGradings && project.projectGradings.length > 0) {
          const mappedGradings = project.projectGradings.map((pg) => ({
            gradingId: pg.gradingId || pg.grading?.id,
            grading: pg.grading,
            imageQuantity: pg.imageQuantity || 0,
            customRate: pg.customRate,
            sequence: pg.sequence,
          }));
          setSelectedGradings(mappedGradings);

          // Track original grading IDs for limited edit permission
          const originalIds = mappedGradings.map((g) => g.gradingId);
          setOriginalGradingIds(originalIds);
        } else if (gradingId) {
          // Backward compatibility: convert single grading to multiple
          const singleGrading = {
            gradingId: gradingId,
            grading: project.grading,
            imageQuantity: project.imageQuantity || 0,
            customRate: null,
            sequence: 1,
          };
          setSelectedGradings([singleGrading]);
          setSelectedGrading(gradingId);

          // Track original grading ID for limited edit permission
          setOriginalGradingIds([gradingId]);

          await loadGradingData(gradingId);
        }

        // Set totals (will be updated by useEffect)
        if (project.totalImageQuantity !== undefined) {
          setTotalImageQuantity(project.totalImageQuantity);
          setImageQuantity(project.totalImageQuantity);
        } else if (project.imageQuantity) {
          setImageQuantity(project.imageQuantity);
        }

        if (project.totalEstimatedCost !== undefined) {
          setTotalCalculatedBudget(project.totalEstimatedCost);
          setCalculatedBudget(project.totalEstimatedCost);
        } else if (project.estimatedCost) {
          setCalculatedBudget(project.estimatedCost);
        }
        // Custom fields are now set by handleWorkTypeSelect with existing values

        // Initialize current status
        setCurrentStatus(project.status || "draft");
      })();
    } else {
      form.resetFields();
      // Set default values for new project
      form.setFieldsValue({ status: "active" });

      // Reset all state for new project
      setSelectedClientId(null);
      setCurrentStatus("active"); // Reset status for new project
      // clear any previous client credit display (we rely on projectCreditValidation)
      setClientPreferences(null);
      setSelectedWorkTypes([]);
      setSelectedGrading(null);
      setImageQuantity(0);
      setCalculatedBudget(0);
      setGradingTasks([]);
      setCustomFields([]);
      setCustomFieldValues({});
      setProjectTasks([]);
    }
  }, [project, mode, form, handleWorkTypeSelect]);

  // Handler for requesting credit approval
  const handleRequestCreditApproval = async () => {
    setLoading(true);
    try {
      // Get all form values
      const values = form.getFieldsValue();

      console.log("Form values:", values);
      console.log("Selected client ID:", selectedClientId);
      console.log("Selected gradings:", selectedGradings);
      console.log("Mode:", mode);
      console.log("Existing project:", project);

      // Validate required fields
      if (!values.clientId && !selectedClientId) {
        message.error("Please select a client");
        setLoading(false);
        return;
      }

      if (!values.workTypeIds || values.workTypeIds.length === 0) {
        message.error("Please select at least one work type");
        setLoading(false);
        return;
      }

      // Validate grading selection
      if (selectedGradings.length === 0 && !values.gradingId) {
        message.error("Please select at least one grading");
        setLoading(false);
        return;
      }

      // Validate that all selected gradings have image quantities
      const invalidGradings = selectedGradings.filter(
        (sg) => !sg.gradingId || (sg.imageQuantity || 0) <= 0
      );
      if (invalidGradings.length > 0) {
        message.error(
          "Please ensure all selected gradings have valid image quantities"
        );
        setLoading(false);
        return;
      }

      // Prepare project gradings data
      const projectGradingsInput = selectedGradings.map((sg, index) => ({
        gradingId: sg.gradingId,
        imageQuantity: sg.imageQuantity || 0,
        customRate: sg.customRate,
        sequence: index + 1,
      }));

      // Calculate totals
      const totalImageQty = projectGradingsInput.reduce(
        (sum, pg) => sum + pg.imageQuantity,
        0
      );
      const totalEstCost = calculateTotalCost();

      // Clean custom field values - ensure only serializable data
      // Exclude tree node properties (key, value, children) and only include valid custom field keys
      const cleanCustomFields = {};
      if (customFieldValues && typeof customFieldValues === "object") {
        Object.keys(customFieldValues).forEach((key) => {
          // Skip tree node properties
          if (key === "key" || key === "value" || key === "children") {
            return;
          }

          const value = customFieldValues[key];
          // Only include primitive values and arrays of primitives
          if (value !== null && value !== undefined) {
            if (
              typeof value === "string" ||
              typeof value === "number" ||
              typeof value === "boolean"
            ) {
              cleanCustomFields[key] = value;
            } else if (Array.isArray(value)) {
              cleanCustomFields[key] = value.filter(
                (v) =>
                  typeof v === "string" ||
                  typeof v === "number" ||
                  typeof v === "boolean"
              );
            }
          }
        });
      }

      console.log("Original customFieldValues:", customFieldValues);
      console.log("Cleaned customFields:", cleanCustomFields);

      // Prepare project data
      const projectData = {
        clientId: values.clientId || selectedClientId,
        // Send multiple work types as projectWorkTypes array
        projectWorkTypes:
          values.workTypeIds && values.workTypeIds.length > 0
            ? values.workTypeIds.map((wtId, index) => ({
              workTypeId: wtId,
              sequence: index + 1,
            }))
            : [],
        name: values.name,
        description: values.description || "",
        deadlineDate: values.deadlineDate
          ? dayjs(values.deadlineDate).toISOString()
          : null,
        status: "requested", // Important: Set status to requested
        intendedStatus: values.status || "active", // Store the intended status after approval
        requestNotes: `Project cost exceeds credit limit. Total cost: ₹${totalEstCost.toLocaleString()}, Available credit: ₹${projectCreditValidation?.availableCredit?.toLocaleString() || 0
          }`,
        priority: values.priority || "B",
        notes: values.notes || "",
        clientNotes: values.clientNotes || "",
        projectGradings: projectGradingsInput,
        customFields: cleanCustomFields,
        // Include calculated totals
        imageQuantity: totalImageQty,
        estimatedCost: totalEstCost,
      };

      // Check if we're in edit mode - update existing project instead of creating new one
      if (mode === "edit" && project?.id) {
        console.log(
          "Updating existing project with credit request:",
          project.id
        );

        // Update the existing project with status='requested'
        await updateProject({
          variables: {
            id: project.id,
            input: projectData,
          },
        });

        console.log("Project updated successfully with credit request");
        message.success("Credit approval request submitted successfully!");
        message.info(
          "Your request has been sent to admin and client leader for approval."
        );
        setLoading(false);
        onSuccess?.();
        onClose();
      } else {
        console.log("Creating new project with credit request");

        // Create new project with status='requested' - backend will auto-create credit request
        const { data } = await createProject({
          variables: { input: projectData },
        });

        if (data?.createProject) {
          console.log(
            "Project created successfully with credit request:",
            data.createProject.id
          );
          message.success("Credit approval request submitted successfully!");
          message.info(
            "Your request has been sent to admin and client leader for approval."
          );
          setLoading(false);
          onSuccess?.();
          onClose();
        }
      }
    } catch (error) {
      console.error("Error requesting credit approval:", error);
      message.error(`Failed to request credit approval: ${error.message}`);
      setLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      // ========== ASSIGNMENT VALIDATION (NEW) ==========
      // Validate all task assignments before form submission
      const { validateAllAssignments, formatValidationError } = assignmentValidator;
      
      const assignmentValidation = validateAllAssignments(projectTasks, availableUsers);
      
      if (!assignmentValidation.valid) {
        const errorMsg = `Invalid assignments detected:\n${formatValidationError(assignmentValidation)}`;
        console.error('[ProjectForm] Assignment validation failed:', assignmentValidation);
        message.error('Cannot save project: ' + assignmentValidation.errors[0]);
        setLoading(false);
        return;
      }

      // Log assignment summary
      console.log('[ProjectForm] Assignment validation passed:', {
        totalTasks: assignmentValidation.totalTasks,
        assigned: assignmentValidation.assignedTasks,
        unassigned: assignmentValidation.unassignedTasks,
        validAssignments: assignmentValidation.validAssignments
      });
      // ================================================

      // Validate grading selection only for active status
      const submittedStatus = values.status || currentStatus || "draft";
      if (
        submittedStatus === "active" &&
        selectedGradings.length === 0 &&
        !values.gradingId
      ) {
        message.error("Please select at least one grading for active projects");
        setLoading(false);
        return;
      }

      // Validate that all selected gradings have image quantities (only for active status)
      if (submittedStatus === "active") {
        const invalidGradings = selectedGradings.filter(
          (sg) => !sg.gradingId || (sg.imageQuantity || 0) <= 0
        );
        if (invalidGradings.length > 0) {
          message.error(
            "Please ensure all selected gradings have valid image quantities"
          );
          setLoading(false);
          return;
        }
      }

      // Final credit validation before submission
      // Skip validation for draft projects and edit mode with approved credit request
      const hasApprovedCredit = project?.creditRequest?.status === "approved";

      // For fly-on-credit projects with approved credit, validate that total cost hasn't increased beyond available credit
      if (mode === "edit" && hasApprovedCredit) {
        const newTotalCost = totalCalculatedBudget || calculatedBudget;
        const originalApprovedAmount =
          project?.creditRequest?.requestedAmount ||
          project?.totalEstimatedCost ||
          project?.estimatedCost ||
          0;

        console.log("💰 Fly-on-credit validation:", {
          newTotalCost,
          originalApprovedAmount,
          difference: Math.abs(newTotalCost - originalApprovedAmount),
          projectCreditValidation,
        });

        // Allow small rounding differences (< 0.01)
        if (Math.abs(newTotalCost - originalApprovedAmount) > 0.01) {
          // Cost has changed - check if it exceeds the original approved amount
          if (newTotalCost > originalApprovedAmount) {
            // Cost increased: check if client has sufficient available credit
            // If projectCreditValidation shows the new cost is within available credit, allow it
            const hasAvailableCredit = projectCreditValidation &&
              projectCreditValidation.canCreateProject === true;

            if (!hasAvailableCredit) {
              message.error(
                `Cannot update project: The approved amount was ₹${originalApprovedAmount.toLocaleString()}. ` +
                `New amount is ₹${newTotalCost.toLocaleString()}. ` +
                `Insufficient credit available. ${projectCreditValidation?.message || 'Please increase client credit limit.'}`
              );
              setLoading(false);
              return;
            }
            // If we get here, cost increased but client has sufficient credit - allow it
            console.log("✅ Cost increased but client has sufficient available credit - allowing update");
          } else {
            // Cost decreased - always allow
            console.log("✅ Cost decreased - allowing update");
          }
        }
      }

      // Only validate credit for non-draft projects
      if (submittedStatus !== "draft") {
        if (mode !== "edit" && selectedClientId && projectCreditValidation) {
          if (!projectCreditValidation.canCreateProject) {
            message.error(
              "Cannot create project: " + projectCreditValidation.message
            );
            setLoading(false);
            return;
          }
        } else if (
          mode === "edit" &&
          !hasApprovedCredit &&
          selectedClientId &&
          projectCreditValidation
        ) {
          // For edit mode without approved credit, still validate
          if (!projectCreditValidation.canCreateProject) {
            message.error(
              "Cannot update project: " + projectCreditValidation.message
            );
            setLoading(false);
            return;
          }
        }
      }
      // Always use the form field value for status (both create and edit mode)
      const desiredStatus = values.status || currentStatus || "draft";
      console.log(
        "🔧 Form status:",
        values.status,
        "current status:",
        currentStatus,
        "final:",
        desiredStatus
      );

      const projectData = {
        clientId: values.clientId,
        // Send multiple work types as projectWorkTypes array
        projectWorkTypes:
          values.workTypeIds && values.workTypeIds.length > 0
            ? values.workTypeIds.map((wtId, index) => ({
              workTypeId: wtId,
              sequence: index + 1,
            }))
            : [],
        // Send multiple gradings or fallback to single grading for backward compatibility
        projectGradings:
          selectedGradings.length > 0
            ? selectedGradings.map((sg, index) => ({
              gradingId: sg.gradingId,
              imageQuantity: sg.imageQuantity || 0,
              customRate: sg.customRate,
              sequence: index + 1,
            }))
            : values.gradingId
              ? [
                {
                  gradingId: values.gradingId,
                  imageQuantity: values.imageQuantity || 0,
                  customRate: null,
                  sequence: 1,
                },
              ]
              : [],
        // Backward compatibility fields - no longer send workTypeId/gradingId directly
        imageQuantity: totalImageQuantity || values.imageQuantity,
        estimatedCost: totalCalculatedBudget || calculatedBudget, // Use total budget
        name: values.name,
        description: values.description,
        deadlineDate: values.deadlineDate
          ? values.deadlineDate.toISOString()
          : null,
        priority: values.priority,
        notes: values.notes,
        // Clean customFieldValues to ensure proper format
        // If customFieldValues has 'key', 'value', 'children' properties, it's a tree node object - skip it
        customFields:
          customFieldValues &&
            typeof customFieldValues === "object" &&
            !customFieldValues.key &&
            !customFieldValues.value &&
            !customFieldValues.children
            ? Object.keys(customFieldValues).reduce((acc, key) => {
              const value = customFieldValues[key];
              // Only include if value is a primitive type or array of primitives
              if (value !== null && value !== undefined) {
                if (typeof value !== "object") {
                  acc[key] = value;
                } else if (Array.isArray(value)) {
                  // For arrays, ensure all elements are primitives
                  const primitiveValues = value.filter(
                    (v) =>
                      v !== null && v !== undefined && typeof v !== "object"
                  );
                  if (primitiveValues.length > 0) {
                    acc[key] = primitiveValues;
                  }
                }
              }
              return acc;
            }, {})
            : {},
        // In edit mode, use form field value; in create mode, use footer button value
        status: desiredStatus,
      };

      console.log("🚀 Project data being sent:", projectData);
      console.log("📋 Custom fields being sent:", projectData.customFields);
      console.log("🔍 Original customFieldValues:", customFieldValues);

      if (mode === "edit" && project) {
        // Update project - don't include tasks field as ProjectUpdateInput doesn't support it
        await updateProject({
          variables: {
            id: project.id,
            input: projectData,
          },
        });
      } else {
        // Create project - include tasks field as ProjectCreateInput supports it
        const mappedTasks = projectTasks.map((task) => ({
          taskTypeId: task.taskTypeId,
          gradingTaskId: task.gradingTaskId,
          name: task.name || task.title || "Unnamed Task",
          title: task.title || task.name || "Unnamed Task",
          description: task.description || "",
          instructions: task.instructions || "",
          status: task.status || "todo",
          priority: task.priority || "B",
          estimatedHours: task.estimatedHours || 0,
          estimatedCost: task.estimatedCost || 0,
          dueDate: task.dueDate,
          assigneeId: task.assigneeId,
          notes: task.notes || values.notes || "", // Use project notes as default
        }));

        // Filter out tasks without required fields (taskTypeId and gradingTaskId are required by backend)
        const validTasks = mappedTasks.filter(
          (task) => task.taskTypeId && task.gradingTaskId
        );

        console.log("📝 Total tasks in projectTasks:", projectTasks.length);
        console.log("🔍 Mapped tasks:", mappedTasks.length);
        console.log("✅ Valid tasks after filtering:", validTasks.length);
        if (validTasks.length !== projectTasks.length) {
          console.warn("⚠️ Some tasks were filtered out:", {
            original: projectTasks.length,
            valid: validTasks.length,
            filtered: projectTasks.length - validTasks.length,
            invalidTasks: mappedTasks.filter(
              (t) => !t.taskTypeId || !t.gradingTaskId
            ),
          });
        }

        const createProjectData = {
          ...projectData,
          // If saving as draft, do not submit tasks to backend (tasks should be hidden until project is started)
          tasks: desiredStatus === "draft" ? [] : validTasks,
        };

        await createProject({
          variables: { input: createProjectData },
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

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      disabled={loading}
      autoComplete="off"
    >
      {/* Status is now handled by the form field directly */}
      {/* Credit Validation Alert */}
      {projectCreditValidation &&
        projectCreditValidation.creditLimitEnabled &&
        !projectCreditValidation.canCreateProject &&
        !shouldHidePrices && (
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

      {/* Fly-on-Credit Cost Change Warning - Only show if cost changed AND NOT within available credit */}
      {isFlyOnCredit && costChanged && !costIncreasedButWithinCredit && !shouldHidePrices && (
        <Alert
          message="Cost Changed - Cannot Save"
          description={
            <div>
              <p>
                This project has an approved fly-on-credit request for{" "}
                <strong>
                  ₹
                  {(
                    project?.creditRequest?.requestedAmount || 0
                  ).toLocaleString()}
                </strong>
                .
              </p>
              <p>
                Current total:{" "}
                <strong>
                  ₹
                  {(totalCalculatedBudget || calculatedBudget).toLocaleString()}
                </strong>
              </p>
              <p style={{ marginBottom: 0 }}>
                The cost has increased beyond available credit.
                {projectCreditValidation?.message && (
                  <>
                    <br />
                    {projectCreditValidation.message}
                  </>
                )}
                Please restore the original grading quantities and rates, or increase the client's credit limit.
              </p>
            </div>
          }
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Fly-on-Credit Cost Increase Within Available Credit Notice */}
      {isFlyOnCredit && costIncreasedButWithinCredit && !shouldHidePrices && (
        <Alert
          message="Cost Increased - Within Available Credit"
          description={
            <div>
              <p>
                This project's approved fly-on-credit request was for{" "}
                <strong>
                  ₹
                  {(
                    project?.creditRequest?.requestedAmount || 0
                  ).toLocaleString()}
                </strong>
                .
              </p>
              <p>
                New total:{" "}
                <strong>
                  ₹
                  {(totalCalculatedBudget || calculatedBudget).toLocaleString()}
                </strong>
              </p>
              <p style={{ marginBottom: 0 }}>
                ✓ The cost has increased, but the client has sufficient available credit to cover the new amount.
                You can proceed with the update.
              </p>
            </div>
          }
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Fly-on-Credit Info Notice */}
      {isFlyOnCredit && !costChanged && (
        <Alert
          message="Fly-on-Credit Project"
          description={
            <div>
              <p style={{ marginBottom: 0 }}>
                This project has an approved credit request
                {!shouldHidePrices && (
                  <>
                    {" "}for <strong>₹{(
                      project?.creditRequest?.requestedAmount || 0
                    ).toLocaleString()}</strong>
                  </>
                )}
                . You can edit project details
                {!shouldHidePrices && ", but the total cost must remain unchanged"}
                .
              </p>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Active Project Field Restriction Notice */}
      {isActiveProject && !isFlyOnCredit && (
        <Alert
          message="Active Project - Limited Editing"
          description="This project is active. You can edit basic details like description, notes, deadline, quantity, and priority. You can also add new gradings, but cannot change work types or remove existing gradings."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Limited Edit Permission Notice */}
      {hasLimitedEdit && mode === "edit" && (
        <Alert
          message="Limited Edit Permission"
          description="You can add new gradings and adjust quantities or prices, but you cannot remove existing gradings or change the selected work types."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Project Status and Project Name Row */}
      <Row gutter={16}>
        <Col span={6}>
          <Form.Item
            name="status"
            label="Project Status"
            rules={[
              { required: true, message: "Please select project status" },
            ]}
            initialValue="active"
          >
            <Select
              placeholder="Select status"
              onChange={async (value) => {
                // Update form state and current status
                setCurrentStatus(value);
                form.setFieldsValue({ status: value });

                // If changing to active, validate credit
                if (value === "active") {
                  // Check if we have necessary data for credit validation
                  if (selectedClientId && selectedGradings.length > 0) {
                    // Trigger credit validation
                    await validateMultipleGradingsCredit(selectedGradings);
                  } else if (
                    selectedClientId &&
                    selectedGrading &&
                    imageQuantity > 0
                  ) {
                    // Legacy single grading validation
                    try {
                      const creditResp = await refetchProjectCreditValidation({
                        variables: {
                          clientId: selectedClientId,
                          gradingId: selectedGrading,
                          imageQuantity: imageQuantity,
                          estimatedCost: calculatedBudget,
                        },
                      });
                      if (creditResp?.data?.validateProjectCredit) {
                        setProjectCreditValidation(
                          creditResp.data.validateProjectCredit
                        );
                        const exceeded =
                          !creditResp.data.validateProjectCredit
                            .canCreateProject;
                        setCreditExceeded(exceeded);
                        if (onCreditExceeded) {
                          onCreditExceeded(
                            exceeded,
                            creditResp.data.validateProjectCredit
                          );
                        }
                      }
                    } catch (err) {
                      console.warn(
                        "Failed to fetch client credit validation",
                        err
                      );
                    }
                  }

                  // If changing to active and we have grading selected, load/regenerate tasks
                  if (selectedGradings.length > 0 && gradingTasks.length > 0) {
                    // Regenerate tasks from existing grading tasks for multiple gradings
                    const initialTasks = gradingTasks
                      .filter(
                        (gradingTask) =>
                          gradingTask &&
                          gradingTask.taskType &&
                          gradingTask.isActive === true
                      ) // Filter out invalid grading tasks and inactive tasks
                      .map((gradingTask) => {
                        let preferredUserId = null;
                        if (
                          clientPreferences?.taskPreferences &&
                          gradingTask.taskType?.id
                        ) {
                          const taskPreference =
                            clientPreferences.taskPreferences.find(
                              (pref) =>
                                pref.taskType?.id === gradingTask.taskType?.id
                            );
                          if (
                            taskPreference &&
                            taskPreference.preferredUserIds &&
                            taskPreference.preferredUserIds.length > 0
                          ) {
                            preferredUserId =
                              taskPreference.preferredUserIds[0];
                          }
                        }

                        return {
                          // Ensure stable identity when regenerating tasks on status change
                          id: gradingTask.id,
                          taskKey: gradingTask.id,
                          gradingTaskId: gradingTask.id,
                          taskTypeId:
                            gradingTask.taskType?.id || gradingTask.taskTypeId,
                          name:
                            gradingTask.taskType?.name ||
                            gradingTask.name ||
                            "Unnamed Task",
                          title:
                            gradingTask.taskType?.name ||
                            gradingTask.name ||
                            "Unnamed Task",
                          description:
                            gradingTask.description ||
                            gradingTask.taskType?.description ||
                            "",
                          instructions: gradingTask.instructions || "",
                          status: "todo",
                          priority: gradingTask.priority || "B",
                          estimatedHours: gradingTask.estimatedHours || 0,
                          estimatedCost: gradingTask.estimatedCost || 0,
                          dueDate: null,
                          assigneeId: preferredUserId,
                          notes: "",
                          taskType: gradingTask.taskType,
                          gradingTask: gradingTask,
                          customFields: {},
                          createdAt: new Date().toISOString(),
                          updatedAt: new Date().toISOString(),
                        };
                      });
                    setOrderedProjectTasks(initialTasks);
                  } else if (selectedGrading && gradingTasks.length === 0) {
                    // If we have a single grading but no tasks loaded yet, fetch them
                    handleGradingSelect(selectedGrading);
                  }
                } else if (value === "draft") {
                  // Clear tasks when changing back to draft
                  setProjectTasks([]);
                }
              }}
              style={{ width: "100%" }}
            >
              {/* Draft Option - Only show if project is currently draft or in create mode */}
              {(mode === "create" ||
                (mode === "edit" && project?.status === "draft")) && (
                  <Option value="draft">
                    <FileTextOutlined style={{ marginRight: 6 }} />
                    Draft
                  </Option>
                )}

              {/* Active Option */}
              <Option value="active">
                <PlayCircleOutlined style={{ marginRight: 6 }} />
                Active
              </Option>

              {/* Other status options for active projects in edit mode */}
              {mode === "edit" &&
                (project?.status === "active" ||
                  project?.status === "in_progress" ||
                  project?.status === "completed") && (
                  <>
                    <Option value="in_progress">
                      <SyncOutlined style={{ marginRight: 6 }} />
                      In Progress
                    </Option>

                    <Option value="review">
                      <EyeOutlined style={{ marginRight: 6 }} />
                      Review
                    </Option>

                    <Option value="completed">
                      <CheckCircleOutlined style={{ marginRight: 6 }} />
                      Completed
                    </Option>

                    <Option value="cancelled">
                      <StopOutlined style={{ marginRight: 6 }} />
                      Cancelled
                    </Option>

                    <Option value="on_hold">
                      <PauseCircleOutlined style={{ marginRight: 6 }} />
                      On Hold
                    </Option>
                  </>
                )}
            </Select>
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item
            name="name"
            label="Project Name"
            rules={[{ required: true, message: "Please enter project name" }]}
          >
            <Input
              placeholder="Enter project name"
              style={{ width: "100%" }}
              autoComplete="off"
            />
          </Form.Item>
        </Col>

        <Col span={6}>
          <Form.Item
            name="deadlineDate"
            label="Deadline"
            rules={[{ required: false, message: "Please select deadline" }]}
          >
            <DatePicker
              placeholder="Select deadline"
              style={{ width: "100%" }}
              disabledDate={(current) =>
                current && current < dayjs().startOf("day")
              }
            />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item
            name="priority"
            label="Priority"
            rules={[{ required: false, message: "Please select priority" }]}
          >
            <Select placeholder="Select priority">
              <Option value="A">A - High</Option>
              <Option value="B">B - Medium</Option>
              <Option value="C">C - Low</Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={8}>
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
              disabled={isActiveProject && !canEditFlyOnCreditProject}
              labelRender={(props) => {
                const client = clientsData?.clients?.find(
                  (c) => c.id === props.value
                );
                if (!client) return props.label;
                return (
                  <span>
                    <strong>{client.clientCode}</strong>({client.displayName})
                  </span>
                );
              }}
            >
              {clientsData?.clients?.map((client) => (
                <Option key={client.id} value={client.id}>
                  <div>
                    <div title={client.companyName}>
                      <strong>{client.clientCode}</strong> ({client.displayName}
                      ) - ({client.companyName})
                    </div>
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>

        <Col span={8}>
          <Form.Item
            name="workTypeIds"
            label="Work Types"
            rules={[
              {
                required: currentStatus === "active",
                message: "Please select at least one work type",
              },
            ]}
          >
            <Select
              mode="multiple"
              placeholder="Select work types"
              loading={!workTypesData}
              onChange={(workTypeIds) => handleWorkTypeSelect(workTypeIds)}
              disabled={isActiveProject}
            >
              {(() => {
                const workTypes = workTypesData?.workTypes || [];
                const hasPreferences = clientPreferences?.workTypes?.length > 0;

                if (!hasPreferences) {
                  // No preferences - show all work types in single group
                  return workTypes.map((workType) => (
                    <Option key={workType.id} value={workType.id}>
                      {workType.name}
                    </Option>
                  ));
                }

                // Group work types: preferred and others
                const preferredWorkTypes = workTypes.filter((wt) =>
                  clientPreferences.workTypes.some((pref) => pref.id === wt.id)
                );
                const otherWorkTypes = workTypes.filter(
                  (wt) =>
                    !clientPreferences.workTypes.some(
                      (pref) => pref.id === wt.id
                    )
                );

                return (
                  <>
                    {preferredWorkTypes.length > 0 && (
                      <Select.OptGroup label="Preferred Work Types">
                        {preferredWorkTypes.map((workType) => (
                          <Option key={workType.id} value={workType.id}>
                            {workType.name}
                            <span style={{ color: "#52c41a", marginLeft: 8 }}>
                              ★
                            </span>
                          </Option>
                        ))}
                      </Select.OptGroup>
                    )}
                    {otherWorkTypes.length > 0 && (
                      <Select.OptGroup label="Other Work Types">
                        {otherWorkTypes.map((workType) => (
                          <Option key={workType.id} value={workType.id}>
                            {workType.name}
                          </Option>
                        ))}
                      </Select.OptGroup>
                    )}
                  </>
                );
              })()}
            </Select>
          </Form.Item>
        </Col>

        <Col span={8}>
          <Form.Item
            label="Grading Selection"
            rules={[
              {
                required: currentStatus === "active",
                message: "Please select at least one grading",
              },
            ]}
          >
            <Select
              mode="multiple"
              placeholder={
                selectedWorkTypes && selectedWorkTypes.length > 0
                  ? "Select gradings"
                  : "Please select work types first"
              }
              disabled={
                !selectedWorkTypes ||
                selectedWorkTypes.length === 0
              }
              value={selectedGradings.map((sg) => sg.gradingId)}
              onChange={handleMultipleGradingSelect}
              style={{ width: "100%" }}
              optionLabelProp="label"
            >
              {(() => {
                const gradings = workTypeGradings || [];

                if (gradings.length === 0) {
                  return (
                    <Option disabled value="">
                      {selectedWorkTypes && selectedWorkTypes.length > 0
                        ? "No gradings available for selected work types"
                        : "Please select work types first"}
                    </Option>
                  );
                }

                // Show all gradings for selected work types
                // (client preferences are used for default/preferred selection, not filtering)
                const filteredGradings = gradings;

                // Group gradings by work type
                const groupedByWorkType = filteredGradings.reduce(
                  (acc, grading) => {
                    const workTypeName = grading.workType?.name || "Other";
                    if (!acc[workTypeName]) {
                      acc[workTypeName] = [];
                    }
                    acc[workTypeName].push(grading);
                    return acc;
                  },
                  {}
                );

                // If only one work type, don't group
                const workTypeNames = Object.keys(groupedByWorkType);
                if (workTypeNames.length === 1) {
                  return filteredGradings.map((grading) => {
                    const clientPref = clientPreferences?.gradings?.find(
                      (pref) => pref.grading?.id === grading.id
                    );
                    const displayRate =
                      clientPref &&
                        clientPref.customRate !== undefined &&
                        clientPref.customRate !== null
                        ? clientPref.customRate
                        : grading.defaultRate;
                    const shortCodeDisplay = grading.shortCode
                      ? `[${grading.shortCode}] `
                      : "";
                    const priceDisplay = shouldHidePrices ? '' : ` - ₹${Number(displayRate || 0).toLocaleString()}`;
                    const label = `${shortCodeDisplay}${grading.name}${priceDisplay}`;
                    return (
                      <Option key={grading.id} value={grading.id} label={label}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <span>
                            {grading.shortCode && (
                              <span
                                style={{
                                  color: "#1890ff",
                                  fontWeight: "bold",
                                  marginRight: 4,
                                }}
                              >
                                [{grading.shortCode}]
                              </span>
                            )}
                            {grading.name}
                            {!shouldHidePrices && (
                              <>
                                {' - ₹'}
                                {Number(displayRate || 0).toLocaleString()}
                              </>
                            )}
                          </span>
                          {clientPref && (
                            <span style={{ color: "#52c41a", marginLeft: 8 }}>
                              ★ Preferred
                            </span>
                          )}
                        </div>
                      </Option>
                    );
                  });
                }

                // Multiple work types - group them
                return workTypeNames.map((workTypeName) => (
                  <Select.OptGroup key={workTypeName} label={workTypeName}>
                    {groupedByWorkType[workTypeName].map((grading) => {
                      const clientPref = clientPreferences?.gradings?.find(
                        (pref) => pref.grading?.id === grading.id
                      );
                      const displayRate =
                        clientPref &&
                          clientPref.customRate !== undefined &&
                          clientPref.customRate !== null
                          ? clientPref.customRate
                          : grading.defaultRate;
                      const shortCodeDisplay = grading.shortCode
                        ? `[${grading.shortCode}] `
                        : "";
                      const priceDisplay = shouldHidePrices ? '' : ` - ₹${Number(displayRate || 0).toLocaleString()}`;
                      const label = `${shortCodeDisplay}${grading.name}${priceDisplay}`;
                      return (
                        <Option
                          key={grading.id}
                          value={grading.id}
                          label={label}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <span>
                              {grading.shortCode && (
                                <span
                                  style={{
                                    color: "#1890ff",
                                    fontWeight: "bold",
                                    marginRight: 4,
                                  }}
                                >
                                  [{grading.shortCode}]
                                </span>
                              )}
                              {grading.name}
                              {!shouldHidePrices && (
                                <>
                                  {' - ₹'}
                                  {Number(displayRate || 0).toLocaleString()}
                                </>
                              )}
                            </span>
                            {clientPref && (
                              <span style={{ color: "#52c41a", marginLeft: 8 }}>
                                ★ Preferred
                              </span>
                            )}
                          </div>
                        </Option>
                      );
                    })}
                  </Select.OptGroup>
                ));
              })()}
            </Select>
          </Form.Item>
        </Col>
      </Row>

      {/* Individual Grading Quantities */}
      {selectedGradings.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ marginBottom: 12, color: "#1890ff" }}>
            Image Quantities per Grading
          </h4>
          <Row gutter={16}>
            {selectedGradings.map((selectedGrading, index) => {
              const grading = workTypeGradings?.find(
                (g) => g.id === selectedGrading.gradingId
              );
              const clientPref = clientPreferences?.gradings?.find(
                (pref) => pref.grading?.id === selectedGrading.gradingId
              );

              // Priority: customRate > clientPref.customRate > grading.defaultRate
              const effectiveRate =
                selectedGrading.customRate !== undefined &&
                  selectedGrading.customRate !== null
                  ? selectedGrading.customRate
                  : clientPref &&
                    clientPref.customRate !== undefined &&
                    clientPref.customRate !== null
                    ? clientPref.customRate
                    : grading?.defaultRate || 0;

              const defaultRate = grading?.defaultRate || 0;
              const clientCustomRate =
                clientPref &&
                  clientPref.customRate !== undefined &&
                  clientPref.customRate !== null
                  ? clientPref.customRate
                  : null;
              const hasCustomRate =
                selectedGrading.customRate !== undefined &&
                selectedGrading.customRate !== null;
              const isUsingClientRate =
                !hasCustomRate && clientCustomRate !== null;

              return (
                <Col span={8} key={`${selectedGrading.gradingId}-${index}`}>
                  <div
                    style={{
                      padding: 16,
                      border: "1px solid #d9d9d9",
                      borderRadius: 8,
                      backgroundColor: "#fafafa",
                      marginBottom: 16,
                    }}
                  >
                    <div
                      style={{
                        marginBottom: 12,
                        fontWeight: 500,
                        color: "#262626",
                      }}
                    >
                      {grading?.shortCode && (
                        <span
                          style={{
                            color: "#1890ff",
                            fontWeight: "bold",
                            marginRight: 4,
                          }}
                        >
                          [{grading.shortCode}]
                        </span>
                      )}
                      {grading?.name || "Unknown Grading"}
                      {!shouldHidePrices && (
                        <div
                          style={{
                            fontSize: 12,
                            color: "#8c8c8c",
                            fontWeight: "normal",
                            marginTop: 2,
                          }}
                        >
                          Default: ₹{Number(defaultRate).toLocaleString()}/image
                        </div>
                      )}
                    </div>

                    <Row gutter={8}>
                      <Col span={shouldHidePrices ? 24 : 12}>
                        <div
                          style={{
                            marginBottom: 4,
                            fontSize: 12,
                            fontWeight: 500,
                          }}
                        >
                          Image Quantity
                        </div>
                        <InputNumber
                          placeholder="Quantity"
                          value={selectedGrading.imageQuantity}
                          min={1}
                          onChange={(value) =>
                            updateGradingQuantity(index, value || 0)
                          }
                          // Allow editing quantity when updating a project (edit mode).
                          // Preserve original restriction for other modes: disable only
                          // when project is active and not eligible for fly-on-credit edits.
                          disabled={
                            mode !== "edit" &&
                            isActiveProject &&
                            !canEditFlyOnCreditProject
                          }
                          style={{ width: "100%" }}
                          size="small"
                        />
                      </Col>
                      {!shouldHidePrices && (
                        <Col span={12}>
                          <div
                            style={{
                              marginBottom: 4,
                              fontSize: 12,
                              fontWeight: 500,
                            }}
                          >
                            Custom Rate
                            <span
                              style={{ color: "#8c8c8c", fontWeight: "normal" }}
                            >
                              {" "}
                              (₹/image)
                            </span>
                            {isUsingClientRate && (
                              <span
                                style={{
                                  color: "#52c41a",
                                  fontSize: 10,
                                  marginLeft: 4,
                                }}
                              >
                                ★ Client Rate
                              </span>
                            )}
                          </div>
                          <InputNumber
                            placeholder={
                              clientCustomRate
                                ? `Client: ${clientCustomRate}`
                                : `Default: ${defaultRate}`
                            }
                            value={selectedGrading.customRate}
                            min={0}
                            // precision={2}
                            onChange={(value) =>
                              updateGradingCustomRate(index, value)
                            }
                            disabled={
                              isActiveProject && !canEditFlyOnCreditProject
                            }
                            style={{
                              width: "100%",
                              backgroundColor: hasCustomRate
                                ? "#e6f7ff"
                                : isUsingClientRate
                                  ? "#f6ffed"
                                  : undefined,
                            }}
                            size="small"
                          />
                        </Col>
                      )}
                    </Row>

                    {!shouldHidePrices && (
                      <div
                        style={{
                          marginTop: 12,
                          padding: "8px 12px",
                          backgroundColor: "#f0f0f0",
                          borderRadius: 4,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span style={{ fontSize: 12, color: "#595959" }}>
                          Estimated Cost:
                        </span>
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: "#1890ff",
                          }}
                        >
                          ₹
                          {(
                            (selectedGrading.imageQuantity || 0) * effectiveRate
                          ).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </Col>
              );
            })}
          </Row>
        </div>
      )}

      {/* Description and Client Notes - Side by Side */}
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="description"
            label="Project Description"
          >
            <Input.TextArea
              placeholder="Enter project description"
              rows={2}
              style={{ width: "100%" }}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="notes" label="Client Notes">
            <Input.TextArea
              placeholder="Client notes from client form"
              rows={2}
              autoComplete="off"
            />
          </Form.Item>
        </Col>
      </Row>

      {/* Client Details Section - Read Only */}
      {selectedClientId && clientsData?.clients && (
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Color Correction Style">
              <Input
                value={clientsData?.clients?.find((c) => c.id === selectedClientId)?.colorCorrectionStyle || "Not specified"}
                disabled
                style={{ backgroundColor: "#f5f5f5" }}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Transfer Mode">
              <Input
                value={clientsData?.clients?.find((c) => c.id === selectedClientId)?.transferMode || "Not specified"}
                disabled
                style={{ backgroundColor: "#f5f5f5" }}
              />
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
                  Additional Fields for{" "}
                  {selectedWorkTypes && selectedWorkTypes.length > 0
                    ? workTypesData?.workTypes?.find(
                      (wt) => wt.id === selectedWorkTypes[0]
                    )?.name
                    : "Work Type"}
                </Text>
              }
              size="small"
              style={{ backgroundColor: "#f9f9f9" }}
            >
              <Row gutter={16}>
                {(customFields || []).map((field) => (
                  <Col span={12} key={field.id}>
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

      {/* Draft Project Task Notice */}
      {(currentStatus === "draft" || (mode === "edit" && isDraftProject)) && (
        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col span={24}>
            <Card
              size="small"
              style={{
                backgroundColor: "#fff7e6",
                border: "1px solid #ffd666",
              }}
            >
              <div style={{ textAlign: "center", color: "#d89614" }}>
                <Typography.Text>
                  📋{" "}
                  <strong>
                    Tasks will be created automatically when this project is
                    activated.
                  </strong>
                  <br />
                  Tasks are based on the selected grading and will be assigned
                  according to client preferences.
                </Typography.Text>
              </div>
            </Card>
          </Col>
        </Row>
      )}

      {/* Task Management Section - Show for active projects in both create and edit mode */}
      {projectTasks.length > 0 &&
        (currentStatus === "active" ||
          (mode === "edit" && isActiveProject)) && (
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
                  workType={
                    selectedWorkTypes && selectedWorkTypes.length > 0
                      ? workTypesData?.workTypes?.find(
                        (wt) => wt.id === selectedWorkTypes[0]
                      )
                      : null
                  }
                  grading={workTypeGradings?.find(
                    (g) => g.id === selectedGrading
                  )}
                  gradingTasks={gradingTasks}
                  clientPreferences={clientPreferences}
                  customFields={
                    customFieldValues
                      ? Object.entries(customFieldValues).map(
                        ([key, value]) => {
                          const field = customFields.find(
                            (f) => f.fieldKey === key
                          );
                          return {
                            label: field ? field.fieldName : key,
                            value: value,
                          };
                        }
                      )
                      : []
                  }
                  readOnly={loading}
                  layout="table"
                  clientCode={
                    selectedClientId
                      ? clientsData?.clients?.find(
                        (c) => c.id === selectedClientId
                      )?.clientCode ||
                      clientsData?.clients?.find(
                        (c) => c.id === selectedClientId
                      )?.code
                      : null
                  }
                  projectDescription={form.getFieldValue("description")}
                />
              </Card>
            </Col>
          </Row>
        )}

      {/* Removed duplicate Deadline and Description fields (already present above as 'deadlineDate' and 'description') */}
    </Form>
  );
};

export default ProjectForm;
