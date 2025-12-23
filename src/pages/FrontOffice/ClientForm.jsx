import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Form,
  Input,
  Select,
  Row,
  Col,
  Button,
  message,
  Alert,
  Divider,
  Switch,
  InputNumber,
  Typography,
  Space,
  Steps,
} from "antd";
import {
  UserOutlined,
  BankOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery } from "@apollo/client";
import {
  CREATE_CLIENT,
  UPDATE_CLIENT,
  GET_CLIENT,
  GET_COUNTRIES,
  GET_STATES,
  GET_CITIES,
} from "../../gql/clients";
import { buildGradingsPayload } from "./clientFormUtils";
import { GET_WORK_TYPES } from "../../gql/workTypes";
import { GET_USERS } from "../../gql/users";
import { GET_GRADINGS_BY_WORK_TYPES } from "../../gql/gradings";

const { TextArea } = Input;
const { Option } = Select;
const { Text } = Typography;
const { Step } = Steps;

const ClientForm = ({
  client,
  onClose,
  onSuccess,
  renderHeaderInDrawer,
  renderFooterInDrawer,
}) => {
  // Additional queries for dynamic fields
  const { data: workTypesData } = useQuery(GET_WORK_TYPES, {
    fetchPolicy: "network-and-cache",
  });
  const { data: usersData, loading: usersLoading } = useQuery(GET_USERS, {
    fetchPolicy: "network-and-cache",
  });
  const [selectedWorkTypes, setSelectedWorkTypes] = useState([]);
  const [selectedGradings, setSelectedGradings] = useState([]); // Changed to array for multiple selection
  const [gradingCustomRates, setGradingCustomRates] = useState({}); // Store custom rates per grading
  const [gradingTaskAssignments, setGradingTaskAssignments] = useState({}); // Store task-employee assignments per grading
  const [skippedAssignments, setSkippedAssignments] = useState([]); // Store skipped invalid task assignments for inline UI
  const [clientType, setClientType] = useState("permanent"); // Track client type
  const [isGSTEnabled, setIsGSTEnabled] = useState(false);
  const [isCreditEnabled, setIsCreditEnabled] = useState(true); // Default to enabled
  const [hasCustomRates, setHasCustomRates] = useState(false);

  const { data: gradingsData } = useQuery(GET_GRADINGS_BY_WORK_TYPES, {
    variables: { workTypeIds: selectedWorkTypes },
    skip: selectedWorkTypes.length === 0,
    fetchPolicy: "network-only", // Always fetch fresh data, especially important for edit mode
  });

  // Handler for work type selection
  const handleWorkTypesChange = (values) => {
    console.log("WorkTypes changed to:", values);

    // Update state immediately
    setSelectedWorkTypes(values);

    // Also update form value to keep them in sync
    form.setFieldsValue({ workTypes: values });

    // Only clear gradings if work types actually changed to prevent unnecessary resets
    const currentWorkTypes = selectedWorkTypes || [];
    const workTypesChanged =
      JSON.stringify(currentWorkTypes.sort()) !== JSON.stringify(values.sort());

    if (workTypesChanged) {
      // Clear related grading data when work types change
      setSelectedGradings([]);
      setGradingCustomRates({});
      setGradingTaskAssignments({});
      form.setFieldsValue({ gradings: [] });

      console.log("Cleared gradings due to work type change");
    }
  };

  useEffect(() => {
    console.log("Grading Custom Rates updated: ", gradingCustomRates);
  }, [gradingCustomRates]);

  // Handler for client type change
  const handleClientTypeChange = (value) => {
    const previousType = clientType;
    setClientType(value);
    
    // Reset Business Details fields if switching to Walk-in
    if (value === "walkIn") {
      // Reset state toggles for walk-in
      setIsCreditEnabled(false);

      form.setFieldsValue({
        isGstEnabled: false,
        gstNumber: undefined,
        panCard: undefined,
        isCreditEnabled: false,
        creditDays: undefined,
        creditAmountLimit: undefined,
        openingBalance: undefined,
        openingBalanceType: undefined,
        accountMessage: undefined,
      });
      
      // Clear business details (work types, gradings, task preferences)
      setSelectedWorkTypes([]);
      setSelectedGradings([]);
      setGradingCustomRates({});
      setGradingTaskAssignments({});
      form.setFieldsValue({
        workTypes: [],
        gradings: [],
      });
      
      // If on step 1, move back to step 0 since walk-in has only 1 step
      if (currentStep === 1) {
        setCurrentStep(0);
      }
    } else if (value === "permanent" && previousType === "walkIn") {
      // When converting from walk-in to permanent, show a message
      message.info("Permanent clients require Work Types and Gradings. Please fill Business Details in the next step.");
    }
  };

  // Handler for multiple grading selection
  const handleGradingsChange = (gradingIds) => {
    console.log("Gradings changed to:", gradingIds);
    setSelectedGradings(gradingIds);

    // Also update form value to keep them in sync
    form.setFieldsValue({ gradings: gradingIds });

    // Remove custom rates for deselected gradings, preserve explicit zero values
    const newCustomRates = {};
    gradingIds.forEach((id) => {
      if (Object.prototype.hasOwnProperty.call(gradingCustomRates, id)) {
        newCustomRates[id] = gradingCustomRates[id];
      }
    });
    setGradingCustomRates(newCustomRates);

    // Remove task assignments for deselected gradings
    const newTaskAssignments = {};
    gradingIds.forEach((id) => {
      if (Object.prototype.hasOwnProperty.call(gradingTaskAssignments, id)) {
        newTaskAssignments[id] = gradingTaskAssignments[id];
      }
    });
    setGradingTaskAssignments(newTaskAssignments);
  };

  // Handler for custom rate change for a grading
  const handleGradingCustomRateChange = (gradingId, rate) => {
    console.log("Updating custom rate for grading", gradingId, "to", rate);
    setGradingCustomRates((prev) => ({
      ...prev,
      [gradingId]: rate,
    }));
  };

  // Handler for task-employee assignment for a specific grading
  const handleGradingTaskAssignment = (gradingId, taskId, userIds) => {
    setGradingTaskAssignments((prev) => ({
      ...prev,
      [gradingId]: {
        ...(prev[gradingId] || {}),
        [taskId]: userIds,
      },
    }));
  };

  // Handler for GST toggle
  const handleGSTToggle = (checked) => {
    setIsGSTEnabled(checked);
    if (!checked) {
      form.setFieldsValue({ gstNo: undefined, gstRate: undefined });
    }
  };

  // Handler for credit toggle
  const handleCreditToggle = (checked) => {
    setIsCreditEnabled(checked);
    if (!checked) {
      form.setFieldsValue({
        creditDays: undefined,
        creditAmount: undefined,
      });
    }
  };

  // Handler for custom rate plan toggle
  const handleCustomRateToggle = (checked) => {
    setHasCustomRates(checked);
    if (!checked) {
      form.setFieldsValue({ customRates: {} });
    }
  };
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedState, setSelectedState] = useState(null);
  const [loading, setLoading] = useState(false);

  // Watch form field values - this will re-render when the field changes
  const formWorkTypes = Form.useWatch("workTypes", form);

  // Sync form work types with component state for gradings query
  // Only update if the values actually changed to prevent infinite loops
  useEffect(() => {
    const workTypes = formWorkTypes || [];

    // Only update if array length changed or content changed
    if (
      workTypes.length !== selectedWorkTypes.length ||
      !workTypes.every((val, idx) => val === selectedWorkTypes[idx])
    ) {
      console.log("Syncing selectedWorkTypes from form watch:", workTypes);
      setSelectedWorkTypes(workTypes);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formWorkTypes]);

  // Form layout configuration
  const formItemLayout = {
    labelCol: { span: 24 },
    wrapperCol: { span: 24 },
  };

  // GraphQL queries and mutations
  const { data: countriesData } = useQuery(GET_COUNTRIES, {
    fetchPolicy: "network-and-cache",
  });
  const { data: statesData } = useQuery(GET_STATES, {
    variables: { countryId: selectedCountry },
    skip: !selectedCountry,
    fetchPolicy: "network-and-cache",
  });
  const { data: citiesData } = useQuery(GET_CITIES, {
    variables: { stateId: selectedState },
    skip: !selectedState,
    fetchPolicy: "network-and-cache",
  });

  // Fetch full client data when editing (includes workTypeAssociations, gradings, taskPreferences)
  const { data: fullClientData, loading: clientLoading } = useQuery(
    GET_CLIENT,
    {
      variables: { id: client?.id },
      skip: !client?.id,
      fetchPolicy: "network-only",
    }
  );

  console.log("ClientForm Debug:", {
    clientId: client?.id,
    fullClientData,
    clientLoading,
    hasTaskPreferences: fullClientData?.client?.taskPreferences?.length || 0,
    serviceProviders: fullClientData?.client?.serviceProviders,
    serviceProvidersWithNestedData: fullClientData?.client?.serviceProviders?.map(sp => ({
      id: sp.id,
      serviceProviderId: sp.serviceProviderId,
      hasServiceProviderObject: !!sp.serviceProvider,
      serviceProviderData: sp.serviceProvider
    }))
  });

  // Merge users from API with service providers from client data to ensure all users are available as options
  const userOptions = useMemo(() => {
    const users = usersData?.users || [];
    const serviceProviders = fullClientData?.client?.serviceProviders || [];
    
    console.log("Computing userOptions:", {
      usersCount: users.length,
      serviceProvidersCount: serviceProviders.length,
      hasUsersData: !!usersData,
      hasFullClientData: !!fullClientData,
      rawServiceProviders: serviceProviders
    });
    
    // Create a map to avoid duplicates
    const userMap = new Map();
    
    // Add all users from the API who are marked as service providers
    users.forEach(user => {
      if (user.isServiceProvider) {
        userMap.set(user.id, user);
      }
    });
    
    // Add service providers from client (if they're not already in the list)
    serviceProviders.forEach(sp => {
      if (sp.serviceProvider && sp.serviceProvider.id) {
        const user = sp.serviceProvider;
        console.log("Adding service provider user to options:", {
          userId: user.id,
          userName: `${user.firstName} ${user.lastName}`,
          wasAlreadyInList: userMap.has(user.id)
        });
        userMap.set(user.id, user);
      }
    });
    
    const result = Array.from(userMap.values());
    console.log("Computed userOptions count:", result.length, "IDs:", result.map(u => u.id));
    return result;
  }, [usersData, fullClientData]);

  const [createClient] = useMutation(CREATE_CLIENT, {
    onCompleted: () => {
      message.success("Client created successfully");
      onSuccess?.();
    },
    onError: (error) => {
      message.error(error.message);
      setLoading(false);
    },
  });

  const [updateClient] = useMutation(UPDATE_CLIENT, {
    onCompleted: () => {
      message.success("Client updated successfully");
      onSuccess?.();
    },
    onError: (error) => {
      message.error(error.message);
      setLoading(false);
    },
  });

  // Initialize form with client data
  useEffect(() => {
    // Use full client data if available (includes workTypeAssociations, gradings, taskPreferences)
    // Otherwise use the client prop passed from the list
    const clientData = fullClientData?.client || client;

    if (clientData) {
      const clientType = clientData.clientType || "permanent";

      // Extract work type IDs from workTypeAssociations or from gradings if empty
      let workTypeIds =
        clientData.workTypeAssociations?.map((wta) => wta.workType.id) || [];

      // If workTypeAssociations is empty, extract work types from gradings
      if (workTypeIds.length === 0 && clientData.gradings?.length > 0) {
        const workTypeIdsFromGradings = clientData.gradings
          .map((g) => g.grading?.workType?.id)
          .filter((id) => id); // Remove undefined/null values

        // Remove duplicates
        workTypeIds = [...new Set(workTypeIdsFromGradings)];
      }

      console.log("workTypeIds", clientData);

      // Extract grading IDs and custom rates (preserve explicit zero values)
      const gradingIds = clientData.gradings?.map((g) => g.gradingId) || [];
      const customRates = {};
      clientData.gradings?.forEach((g) => {
        if (g.customRate !== undefined && g.customRate !== null) {
          customRates[g.gradingId] = g.customRate;
        }
      });

      console.log("Grading IDs Debug:", {
        rawGradings: clientData.gradings,
        extractedGradingIds: gradingIds,
        extractedCustomRates: customRates,
      });

      console.log("Task Preferences Debug:", {
        rawTaskPreferences: clientData.taskPreferences,
        taskPreferencesLength: clientData.taskPreferences?.length || 0,
        selectedGradings: gradingIds,
        gradingCustomRates: customRates,
      });

      // Extract service provider IDs with multiple fallback strategies
      let serviceProviderIds = [];

      if (
        clientData.serviceProviders &&
        Array.isArray(clientData.serviceProviders)
      ) {
        serviceProviderIds = clientData.serviceProviders
          .map((sp) => {
            // Handle nested structure: { serviceProvider: { id: ... } }
            if (sp.serviceProvider && sp.serviceProvider.id) {
              return sp.serviceProvider.id;
            }
            // Handle direct ID structure: { id: ... }
            if (sp.id) {
              return sp.id;
            }
            // Handle string ID
            if (typeof sp === "string") {
              return sp;
            }
            return null;
          })
          .filter((id) => id !== null);
      }

      console.log("Service Providers Debug:", {
        raw: clientData.serviceProviders,
        extracted: serviceProviderIds,
        length: serviceProviderIds.length,
      });

      // Check if all service provider IDs have corresponding user options
      const allServiceProvidersInOptions = serviceProviderIds.length === 0 || serviceProviderIds.every(id =>
        userOptions.some(user => user.id === id)
      );
      
      console.log("Service Provider Availability Check:", {
        serviceProviderIds,
        userOptionsIds: userOptions.map(u => u.id),
        allServiceProvidersInOptions,
        usersLoading,
        comparison: serviceProviderIds.map(spId => ({
          serviceProviderId: spId,
          foundInOptions: userOptions.some(u => u.id === spId),
          matchingUser: userOptions.find(u => u.id === spId)
        }))
      });

      // Build complete form data object
      const formData = {
        ...clientData,
        clientType: clientType,
        countryId: clientData.country?.id,
        stateId: clientData.state?.id,
        cityId: clientData.city?.id,
        phone: clientData.phone || clientData.contactNoWork,
        workTypes: workTypeIds,
        gradings: gradingIds,
        // Only set service providers if all users are available in options
        // This prevents showing IDs instead of names
        ...(allServiceProvidersInOptions && { serviceProviders: serviceProviderIds }),
        leader: clientData.leader?.id,
        notes: clientData.clientNotes,
        isCreditEnabled: clientData.isCreditEnabled,
        creditAmountLimit: clientData.creditAmountLimit,
        creditDays: clientData.creditDays,
      };

      console.log("Form Data being set:", formData);

      // Set all form fields in a single call
      form.setFieldsValue(formData);

      // Update state variables
      setSelectedCountry(clientData.country?.id);
      setSelectedState(clientData.state?.id);
      setClientType(clientType);
      setSelectedWorkTypes(workTypeIds);
      setSelectedGradings(gradingIds);
      setGradingCustomRates(customRates);

      // Initialize task preferences from client data
      if (clientData.taskPreferences && clientData.taskPreferences.length > 0) {
        console.log(
          "Setting task assignments from client data:",
          clientData.taskPreferences
        );
        const taskAssignments = {};
        clientData.taskPreferences.forEach((pref) => {
          console.log("Processing task preference:", pref);
          if (!taskAssignments[pref.gradingId]) {
            taskAssignments[pref.gradingId] = {};
          }
          taskAssignments[pref.gradingId][pref.taskId] = pref.preferredUserIds;
        });
        console.log("Final task assignments:", taskAssignments);
        setGradingTaskAssignments(taskAssignments);
      } else {
        console.log("No task preferences found in client data");
      }

      // Initialize other toggles
      if (clientData.isGstEnabled !== undefined) {
        setIsGSTEnabled(clientData.isGstEnabled);
      }
      if (clientData.isCreditEnabled !== undefined) {
        setIsCreditEnabled(clientData.isCreditEnabled);
      }
      if (clientData.hasCustomRates !== undefined) {
        setHasCustomRates(clientData.hasCustomRates);
      }
    } else {
      // Set default values for new clients
      form.setFieldsValue({ 
        clientType: "permanent",
        isCreditEnabled: true,
        creditDays: 30
      });
      setClientType("permanent"); // Also update state
      setIsCreditEnabled(true); // Enable credit limit by default
    }
    // Removed 'form' from dependencies to prevent infinite loops
    // Form instance is stable and accessed within the effect
    // Added userOptions and usersLoading to ensure form waits for user data
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, fullClientData, userOptions, usersLoading]);

  // Separate effect to handle grading population after work types are loaded
  // This ensures gradings query has completed before we try to set grading values
  useEffect(() => {
    const clientData = fullClientData?.client || client;

    // Early return if no client data (e.g., adding new client)
    if (!clientData || !clientData.id) {
      return;
    }

    // Only run this when we have client data AND gradingsData is available
    if (gradingsData?.gradingsByWorkType && selectedWorkTypes.length > 0) {
      const gradingIds = clientData.gradings?.map((g) => g.gradingId) || [];

      // Skip if no gradings to populate
      if (gradingIds.length === 0) {
        return;
      }

      // Only update if we haven't set gradings yet or if they're different
      const currentGradings = form.getFieldValue("gradings") || [];
      const gradingsChanged =
        JSON.stringify(currentGradings.sort()) !==
        JSON.stringify(gradingIds.sort());

      if (gradingsChanged) {
        // Verify that all grading IDs exist in the fetched data
        const availableGradingIds = gradingsData.gradingsByWorkType.map(
          (g) => g.id
        );
        const validGradingIds = gradingIds.filter((id) =>
          availableGradingIds.includes(id)
        );

        if (validGradingIds.length > 0) {
          console.log("Setting gradings from client data:", validGradingIds);
          form.setFieldsValue({ gradings: validGradingIds });
          setSelectedGradings(validGradingIds);
        }
      }
    }
    // Removed 'form' from dependencies to prevent infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gradingsData, selectedWorkTypes, client?.id, fullClientData?.client?.id]);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    try {
      setLoading(true);

      // Validate ALL required fields from ALL steps
      await form.validateFields(["clientType", "firstName", "email"]);

      // Get all form values
      const values = form.getFieldsValue(true);

      // Debug: Log all form values to see what's being collected
      console.log("All form values:", values);
      console.log(
        "Grading Custom Rates updated: update function",
        gradingCustomRates
      );
      // Ensure required fields are present
      if (!values.firstName) {
        message.error("First name is required");
        setLoading(false);
        setCurrentStep(0); // Go back to first step
        return;
      }

      // Warn if permanent client has no work types or gradings
      const finalClientType = values.clientType || clientType || "permanent";
      if (finalClientType === "permanent") {
        const hasWorkTypes = values.workTypes && values.workTypes.length > 0;
        const hasGradings = values.gradings && values.gradings.length > 0;
        
        if (!hasWorkTypes || !hasGradings) {
          message.warning(
            "Permanent clients typically have Work Types and Gradings configured. You can add them later if needed."
          );
        }
      }

      // Transform data for backend
      const input = {
        ...values,
        clientType: finalClientType,
        isActive: values.isActive !== false,
      };

      // Transform serviceProviders - extract only IDs if full objects are present
      if (input.serviceProviders && Array.isArray(input.serviceProviders)) {
        input.serviceProviders = input.serviceProviders
          .map((sp) => {
            // Handle nested structure: { serviceProvider: { id: ... } }
            if (sp.serviceProvider && sp.serviceProvider.id) {
              return sp.serviceProvider.id;
            }
            // Handle direct ID structure: { id: ... }
            if (sp.id) {
              return sp.id;
            }
            // Handle string ID
            if (typeof sp === "string") {
              return sp;
            }
            return null;
          })
          .filter((id) => id !== null);
      }

      // Transform gradings - support both single ID (string) and multiple IDs (array)
      if (input.gradings) {
        if (typeof input.gradings === "string") {
          // Single grading selected (old behavior)
          input.gradings = [
            {
              gradingId: input.gradings,
              customRate: null,
              currency: "INR",
              unit: "image",
            },
          ];
        } else if (Array.isArray(input.gradings)) {
          // Use helper to normalize grading items (strings or objects) into full grading payloads
          // Import kept at top of file
          console.log("*-*-*-*-*--*-*-*1111", input.gradings);
          console.log("*-*-*-*-*--*-*-*1111", gradingCustomRates);

          input.gradings = buildGradingsPayload(
            input.gradings,
            gradingCustomRates,
            gradingsData
          );
          console.log("*-*-*-*-*--*-*-*", input.gradings);
        }
      }

      // Transform task preferences for gradings
      // These are preferred employees per task that will be used when creating projects
      // Format: gradingTaskAssignments = { gradingId: { taskId: [userIds] } }
      // Backend expects: taskPreferences: [{ gradingId, taskId, preferredUserIds }]
      // Always include taskPreferences in the payload.
      // If there are no assignments, send an empty array so backend clears preferences.
      input.taskPreferences = [];
      // Collect skipped invalid assignments to show a user-facing warning
      const skippedTaskAssignments = [];
      if (
        gradingTaskAssignments &&
        Object.keys(gradingTaskAssignments).length > 0
      ) {
        Object.entries(gradingTaskAssignments).forEach(([gradingId, tasks]) => {
          Object.entries(tasks).forEach(([taskId, userIds]) => {
            // Validate that this taskId still exists under the grading to avoid sending invalid IDs
            const gradingObj = gradingsData?.gradingsByWorkType?.find(
              (g) => g.id === gradingId
            );
            const availableTaskIds =
              gradingObj?.taskTypes?.map((t) => t.id) || [];
            if (!availableTaskIds.includes(taskId)) {
              // Track skipped assignment for UX feedback instead of silently skipping
              skippedTaskAssignments.push(`${taskId} (grading ${gradingId})`);
              console.warn(
                `Skipping invalid taskId ${taskId} for grading ${gradingId}`
              );
              return; // skip invalid task ids
            }

            if (userIds && userIds.length > 0) {
              input.taskPreferences.push({
                gradingId,
                taskId,
                preferredUserIds: userIds,
              });
            }
          });
        });
      }

      // If any assignments were skipped because the taskId is no longer valid, notify the user
      if (skippedTaskAssignments.length > 0) {
        const preview = skippedTaskAssignments.slice(0, 5).join(", ");
        const more =
          skippedTaskAssignments.length > 5
            ? ` and ${skippedTaskAssignments.length - 5} more`
            : "";
        // Keep transient warning
        message.warn(
          `Some task assignments were skipped because the task no longer exists: ${preview}${more}`
        );
        console.info("Skipped task assignments:", skippedTaskAssignments);
        // Save skipped assignments for inline UI so user can edit/dismiss
        setSkippedAssignments(skippedTaskAssignments);
      } else {
        // Clear any previous skipped assignments
        setSkippedAssignments([]);
      }
      console.log("Task Preferences being sent:", input.taskPreferences);

      // Remove fields that are not in the GraphQL schema or will be processed separately
      delete input.openingBalanceType; // This is handled by the backend based on openingBalance value

      // For updates, remove read-only fields that are not part of ClientUpdateInput
      if (client) {
        const updateInput = { ...input };
        console.log(
          "Submitting client UPDATE with input:",
          JSON.stringify(updateInput, null, 2)
        );
        // Defensive: ensure gradings payload is always sent on update.
        // If the form transformed gradings already (array of objects), use that.
        // Otherwise fall back to existing client gradings so we don't accidentally clear them.
        let gradingsPayload = null;
        if (
          Array.isArray(input.gradings) &&
          input.gradings.length > 0 &&
          input.gradings[0].gradingId
        ) {
          // Already transformed into grading objects by earlier logic
          gradingsPayload = input.gradings;
        } else if (
          Array.isArray(form.getFieldValue("gradings")) &&
          form.getFieldValue("gradings").length > 0
        ) {
          // Form has selected grading IDs — build full objects preserving custom rates
          const gradingIdsFromForm = form.getFieldValue("gradings");
          gradingsPayload = gradingIdsFromForm.map((gradingId) => {
            const gradingData = gradingsData?.gradingsByWorkType?.find(
              (g) => g.id === gradingId
            );
            const customRaw = Object.prototype.hasOwnProperty.call(
              gradingCustomRates,
              gradingId
            )
              ? gradingCustomRates[gradingId]
              : undefined;
            const customRate = (function () {
              if (customRaw === undefined) return null;
              if (customRaw === null) return null;
              if (typeof customRaw === "number") return customRaw;
              const s = String(customRaw).trim();
              if (s === "") return null;
              const p = parseFloat(s);
              return Number.isFinite(p) ? p : null;
            })();

            return {
              gradingId,
              customRate,
              currency: gradingData?.currency || "INR",
              unit: gradingData?.unit || "image",
            };
          });
        } else if (
          fullClientData?.client?.gradings &&
          fullClientData.client.gradings.length > 0
        ) {
          // No changes in form; preserve existing gradings from server
          gradingsPayload = fullClientData.client.gradings.map((g) => ({
            gradingId: g.gradingId,
            customRate: g.customRate !== undefined ? g.customRate : null,
            currency: g.currency || "INR",
            unit: g.unit || "image",
          }));
        }

        if (gradingsPayload !== null) {
          updateInput.gradings = gradingsPayload;
        }
        // Remove read-only fields that are fetched but shouldn't be sent in update
        delete updateInput.__typename;
        delete updateInput.id;
        delete updateInput.clientCode; // clientCode is auto-generated on type change
        // clientType can now be updated - backend will generate new code if type changes
        delete updateInput.createdAt;
        delete updateInput.updatedAt;
        delete updateInput.totalBalance;
        delete updateInput.totalPaid;
        delete updateInput.totalDue;
        delete updateInput.lastTransactionDate;
        delete updateInput.country;
        delete updateInput.state;
        delete updateInput.city;
        delete updateInput.workTypeAssociations;
        delete updateInput.transactions;
        delete updateInput.creator;
        delete updateInput.phone; // 'phone' is used internally, backend expects contactNoWork

        console.log(
          "Submitting client UPDATE with input:",
          JSON.stringify(updateInput, null, 2)
        );
        await updateClient({
          variables: { id: client.id, input: updateInput },
        });
      } else {
        console.log(
          "Submitting client CREATE with input:",
          JSON.stringify(input, null, 2)
        );
        await createClient({ variables: { input } });
      }
    } catch (error) {
      console.error("Form validation/submission error:", error);
      message.error("Please fill in all required fields");
      setLoading(false);
      // If validation failed, go back to the step with errors
      if (error.errorFields && error.errorFields.length > 0) {
        const firstErrorField = error.errorFields[0].name[0];
        // Determine which step has the error
        if (
          [
            "clientType",
            "firstName",
            "lastName",
            "displayName",
            "companyName",
            "email",
            "phone",
            "address",
            "pincode",
            "countryId",
            "stateId",
            "cityId",
          ].includes(firstErrorField)
        ) {
          setCurrentStep(0);
        } else {
          setCurrentStep(1);
        }
      }
    }
  }, [
    form,
    client,
    clientType,
    updateClient,
    createClient,
    setLoading,
    gradingsData,
    gradingCustomRates,
    gradingTaskAssignments,
  ]);

  // Helper to get field names for current step
  const getCurrentStepFields = useCallback(() => {
    switch (currentStep) {
      case 0: // Client Information (Basic + Contact + Address + Financial for Walk-in)
        return [
          "clientType",
          "firstName",
          "email",
          "phone",
          "address",
          "countryId",
          "stateId",
          "cityId",
          "isGSTEnabled",
          "gstNo",
          "gstRate",
          "panCard",
          "isCreditEnabled",
          "creditDays",
          "creditAmountLimit",
          "openingBalance",
          "openingBalanceType",
        ];
      case 1: // Business Details (Work Info only, Financial moved to Step 0)
        return ["workTypes", "gradings"];
      default:
        return [];
    }
  }, [currentStep]);

  // Step navigation
  const nextStep = useCallback(() => {
    // Get fields for current step to validate only those
    const currentStepFields = getCurrentStepFields();

    form
      .validateFields(currentStepFields)
      .then(() => {
        setCurrentStep(currentStep + 1);
      })
      .catch((errorInfo) => {
        console.log("Validation failed:", errorInfo);
        message.error("Please fill in all required fields before proceeding");
      });
  }, [form, currentStep, getCurrentStepFields]);

  const prevStep = useCallback(() => {
    setCurrentStep(currentStep - 1);
  }, [currentStep]);

  // Handle country change
  const handleCountryChange = (countryId) => {
    console.log("Country changed:", countryId);
    setSelectedCountry(countryId);
    setSelectedState(null);
    form.setFieldsValue({ stateId: undefined, cityId: undefined });
  };

  // Handle state change
  const handleStateChange = (stateId) => {
    console.log("State changed:", stateId);
    setSelectedState(stateId);
    form.setFieldsValue({ cityId: undefined });
  };

  // Disable autofill on Select components for country, state, city
  useEffect(() => {
    const disableAutofill = () => {
      // Find all Select search inputs and disable autofill
      const selects = document.querySelectorAll('#client-form-prevent-autofill .ant-select-selection-search-input');
      selects.forEach(input => {
        input.setAttribute('autocomplete', 'chrome-off');
        input.setAttribute('autocomplete', 'disabled');
        input.setAttribute('autocomplete', 'nope');
        input.setAttribute('data-lpignore', 'true');
        input.setAttribute('data-form-type', 'other');
        // Disable autofill on input
        input.autocomplete = 'off';
      });
    };

    // Run on mount and after DOM updates
    disableAutofill();
    const timer = setTimeout(disableAutofill, 100);
    const timer2 = setTimeout(disableAutofill, 500);

    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
    };
  }, [currentStep]); // Re-run when step changes

  console.log("workTypes", selectedWorkTypes);
  // Step configurations - dynamic based on client type
  const steps = useMemo(
    () =>
      clientType === "walkIn"
        ? [
            {
              title: "Client Information",
              icon: <UserOutlined />,
            },
          ]
        : [
            {
              title: "Client Information",
              icon: <UserOutlined />,
            },
            {
              title: "Business Details",
              icon: <BankOutlined />,
            },
          ],
    [clientType]
  );

  // Step content components
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="clientType"
                  label={
                    <span>
                      Client Type <span style={{ color: "red" }}>*</span>
                    </span>
                  }
                  rules={[
                    { required: true, message: "Please select client type!" },
                  ]}
                  tooltip={
                    client
                      ? "Changing client type will generate a new client code (e.g., PC-00001 ↔ WC-00001)"
                      : undefined
                  }
                >
                  <Select
                    placeholder="Select client type"
                    size="middle"
                    onChange={handleClientTypeChange}
                  >
                    <Option value="permanent">Permanent</Option>
                    <Option value="walkIn">Walk-in</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="firstName"
                  label={
                    <span>
                      First Name <span style={{ color: "red" }}>*</span>
                    </span>
                  }
                  rules={[
                    { required: true, message: "Please enter first name!" },
                  ]}
                >
                  <Input 
                    placeholder="Enter first name" 
                    size="middle" 
                    autoComplete="new-password"
                    data-form-type="other"
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="lastName" label="Last Name">
                  <Input 
                    placeholder="Enter last name" 
                    size="middle" 
                    autoComplete="new-password"
                    data-form-type="other"
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="displayName"
                  label={
                    <span>
                      Display Name<span style={{ color: "red" }}>*</span>
                    </span>
                  }
                  required={true}
                >
                  <Input
                    placeholder="Enter display name"
                    size="middle"
                    autoComplete="new-password"
                    data-form-type="other"
                    rules={[
                      {
                        required: true,
                        message: "Please enter display name!",
                      },
                    ]}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="companyName" label="Company Name">
                  <Input
                    placeholder="Enter company name"
                    size="middle"
                    autoComplete="new-password"
                    data-form-type="other"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="isActive"
                  label="Active"
                  valuePropName="checked"
                  initialValue={true}
                >
                  <Switch
                    checkedChildren="Active"
                    unCheckedChildren="Inactive"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left">Contact Information</Divider>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="email"
                  label={
                    <span>
                      Email <span style={{ color: "red" }}>*</span>
                    </span>
                  }
                  rules={[
                    { type: "email", message: "Please enter a valid email!" },
                    { required: true, message: "Please enter email!" },
                  ]}
                  extra={
                    client ? (
                      <Text type="secondary" style={{ fontSize: "12px" }}>
                        Email cannot be changed after client creation
                      </Text>
                    ) : null
                  }
                >
                  <Input
                    placeholder="Enter email address"
                    size="middle"
                    disabled={!!client}
                    readOnly={!!client}
                    autoComplete="new-password"
                    data-form-type="other"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="phone"
                  label={
                    <span>
                      Phone <span style={{ color: "red" }}>*</span>
                    </span>
                  }
                  rules={[
                    { required: true, message: "Please enter phone number!" },
                  ]}
                >
                  <Input 
                    placeholder="Enter phone number" 
                    size="middle" 
                    autoComplete="new-password"
                    data-form-type="other"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left">Address Information</Divider>

            {clientType !== "walkIn" && (
              <Form.Item name="address" label={<span>Street Address</span>}>
                <TextArea 
                  rows={2} 
                  placeholder="Enter full address" 
                  autoComplete="new-password"
                  data-form-type="other"
                />
              </Form.Item>
            )}

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="countryId"
                  label={
                    <span>
                      Country <span style={{ color: "red" }}>*</span>
                    </span>
                  }
                  rules={[
                    { required: true, message: "Please select country!" },
                  ]}
                  autoComplete="new-password"
                >
                  <Select
                    placeholder="Select country"
                    size="middle"
                    onChange={handleCountryChange}
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    dropdownStyle={{ zIndex: 9999 }}
                  >
                    {countriesData?.countries?.map((country) => (
                      <Option key={country.id} value={country.id}>
                        {country.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="stateId"
                  label={
                    <span>
                      State <span style={{ color: "red" }}>*</span>
                    </span>
                  }
                  rules={[{ required: true, message: "Please select state!" }]}
                  autoComplete="new-password"
                >
                  <Select
                    placeholder="Select state"
                    size="middle"
                    onChange={handleStateChange}
                    disabled={!selectedCountry}
                    value={form.getFieldValue("stateId")}
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    dropdownStyle={{ zIndex: 9999 }}
                  >
                    {statesData?.statesByCountry?.map((state) => (
                      <Option key={state.id} value={state.id}>
                        {state.name}
                      </Option>
                    )) || []}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="cityId"
                  label={
                    <span>
                      City
                    </span>
                  }
                  rules={[{ required: false, message: "Please select city!" }]}
                  autoComplete="new-password"
                >
                  <Select
                    placeholder="Select city"
                    size="middle"
                    disabled={!selectedState}
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    dropdownStyle={{ zIndex: 9999 }}
                  >
                    {citiesData?.citiesByState?.map((city) => (
                      <Option key={city.id} value={city.id}>
                        {city.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            {/* Work Info */}
            <Divider orientation="left">Work Information</Divider>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="workTypes" label="Work Types">
                  <Select
                    mode="multiple"
                    placeholder="Select work types"
                    size="middle"
                    onChange={handleWorkTypesChange}
                    value={selectedWorkTypes}
                  >
                    {workTypesData?.workTypes?.map((wt) => (
                      <Option key={wt.id} value={wt.id}>
                        {wt.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="gradings" label="Gradings">
                  <Select
                    mode="multiple"
                    placeholder="Select gradings"
                    size="middle"
                    disabled={!formWorkTypes || formWorkTypes.length === 0}
                    onChange={handleGradingsChange}
                    value={selectedGradings}
                    loading={!gradingsData && selectedWorkTypes.length > 0}
                    notFoundContent={
                      !formWorkTypes || formWorkTypes.length === 0
                        ? "Please select work types first"
                        : !gradingsData
                        ? "Loading gradings..."
                        : "No gradings found"
                    }
                  >
                    {(() => {
                      const gradings = gradingsData?.gradingsByWorkType || [];
                      
                      // Group gradings by work type
                      const groupedByWorkType = gradings.reduce((acc, grading) => {
                        const workTypeName = grading.workType?.name || "Other";
                        if (!acc[workTypeName]) {
                          acc[workTypeName] = [];
                        }
                        acc[workTypeName].push(grading);
                        return acc;
                      }, {});

                      const workTypeNames = Object.keys(groupedByWorkType);

                      // If only one work type, don't group
                      if (workTypeNames.length === 1) {
                        return gradings.map((grading) => (
                          <Option key={grading.id} value={grading.id}>
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
                            {grading.name} - Default Rate: ₹{grading.defaultRate}/
                            {grading.unit}
                          </Option>
                        ));
                      }

                      // Multiple work types - group them
                      return workTypeNames.map((workTypeName) => (
                        <Select.OptGroup key={workTypeName} label={workTypeName}>
                          {groupedByWorkType[workTypeName].map((grading) => (
                            <Option key={grading.id} value={grading.id}>
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
                              {grading.name} - Default Rate: ₹{grading.defaultRate}/
                              {grading.unit}
                            </Option>
                          ))}
                        </Select.OptGroup>
                      ));
                    })()}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="hasCustomRates"
                  label="Custom Rate Plan"
                  valuePropName="checked"
                  initialValue={false}
                >
                  <Switch
                    checkedChildren="Yes"
                    unCheckedChildren="No"
                    onChange={handleCustomRateToggle}
                  />
                </Form.Item>
              </Col>
            </Row>

            {/* Grading Details - Custom Rates and Task Assignments */}
            {selectedGradings.length > 0 && (
              <>
                <Divider orientation="left">Grading Details</Divider>
                {/* Inline alert for skipped task assignments (if any) */}
                {skippedAssignments && skippedAssignments.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <Alert
                      type="warning"
                      showIcon
                      message={`Some task assignments were skipped (${skippedAssignments.length})`}
                      description={
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div style={{ maxWidth: "80%" }}>
                            {skippedAssignments.slice(0, 5).map((s, idx) => (
                              <div key={s + idx} style={{ fontSize: 12 }}>
                                {s}
                              </div>
                            ))}
                            {skippedAssignments.length > 5 && (
                              <div style={{ fontSize: 12 }}>
                                and {skippedAssignments.length - 5} more...
                              </div>
                            )}
                          </div>
                          <div>
                            <Button
                              size="small"
                              type="link"
                              onClick={() => setCurrentStep(0)}
                            >
                              Edit
                            </Button>
                            <Button
                              size="small"
                              onClick={() => setSkippedAssignments([])}
                            >
                              Dismiss
                            </Button>
                          </div>
                        </div>
                      }
                    />
                  </div>
                )}
                {selectedGradings.map((gradingId) => {
                  const grading = gradingsData?.gradingsByWorkType?.find(
                    (g) => g.id === gradingId
                  );
                  if (!grading) return null;

                  return (
                    <div
                      key={gradingId}
                      style={{
                        marginBottom: 32,
                        padding: 16,
                        border: "1px solid #f0f0f0",
                        borderRadius: 8,
                      }}
                    >
                      <Row gutter={16} style={{ marginBottom: 16 }}>
                        <Col span={24}>
                          <Text
                            strong
                            style={{ fontSize: "16px", color: "#1890ff" }}
                          >
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
                          </Text>
                          <Text type="secondary" style={{ marginLeft: 16 }}>
                            Default Rate: ₹{grading.defaultRate}/{grading.unit}
                          </Text>
                        </Col>
                      </Row>

                      {/* Custom Rate Input */}
                      {hasCustomRates && (
                        <Row gutter={16} style={{ marginBottom: 16 }}>
                          <Col span={12}>
                            <Text>Custom Rate (optional):</Text>
                            <InputNumber
                              style={{ width: "100%", marginTop: 8 }}
                              placeholder={`Default: ₹${grading.defaultRate}`}
                              prefix="₹"
                              min={0}
                              value={gradingCustomRates[gradingId]}
                              onChange={(value) =>
                                handleGradingCustomRateChange(gradingId, value)
                              }
                            />
                          </Col>
                        </Row>
                      )}

                      {grading.taskTypes && grading.taskTypes.length > 0 && (
                        <>
                          <Text
                            strong
                            style={{
                              display: "block",
                              marginTop: 16,
                              marginBottom: 8,
                            }}
                          >
                            Preferred Employees for Tasks
                          </Text>
                          {grading.taskTypes.map((task) => {
                            console.log(
                              `Rendering task ${task.id} for grading ${gradingId}:`,
                              {
                                task,
                                gradingId,
                                currentValue:
                                  gradingTaskAssignments[gradingId]?.[
                                    task.id
                                  ] || [],
                                allAssignments: gradingTaskAssignments,
                              }
                            );
                            return (
                              <Row
                                key={task.id}
                                gutter={16}
                                style={{ marginBottom: 12 }}
                              >
                                <Col span={8}>
                                  <Text>{task.name}</Text>
                                </Col>
                                <Col span={16}>
                                  <Select
                                    mode="multiple"
                                    placeholder={`Select employees for ${task.name}`}
                                    size="small"
                                    style={{ width: "100%" }}
                                    value={
                                      gradingTaskAssignments[gradingId]?.[
                                        task.id
                                      ] || []
                                    }
                                    onChange={(userIds) =>
                                      handleGradingTaskAssignment(
                                        gradingId,
                                        task.id,
                                        userIds
                                      )
                                    }
                                  >
                                    {usersData?.users?.map((user) => (
                                      <Option key={user.id} value={user.id}>
                                        {user.firstName} {user.lastName}
                                      </Option>
                                    ))}
                                  </Select>
                                </Col>
                              </Row>
                            );
                          })}
                        </>
                      )}
                    </div>
                  );
                })}
              </>
            )}

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="colorCorrectionStyle"
                  label="Color Correction Style"
                >
                  <Input
                    placeholder="Enter color correction style (optional)"
                    size="middle"
                    autoComplete="new-password"
                    data-form-type="other"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="serviceProviders"
                  label="Service Providers (Employees)"
                >
                  <Select
                    mode="multiple"
                    placeholder="Select employees"
                    size="middle"
                    loading={usersLoading}
                    showSearch
                    optionFilterProp="children"
                    filterOption={(input, option) =>
                      option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                    }
                    tagRender={(props) => {
                      const { label, value, closable, onClose } = props;
                      const user = userOptions.find(u => u.id === value);
                      const displayName = user ? `${user.firstName} ${user.lastName}` : value;
                      
                      return (
                        <span
                          style={{
                            marginRight: 3,
                            padding: '0 7px',
                            border: '1px solid #d9d9d9',
                            borderRadius: '2px',
                            background: '#fafafa',
                            display: 'inline-flex',
                            alignItems: 'center',
                            fontSize: '14px',
                            lineHeight: '22px',
                            height: '24px',
                          }}
                        >
                          {displayName}
                          {closable && (
                            <span
                              onClick={onClose}
                              style={{
                                marginLeft: 5,
                                cursor: 'pointer',
                                fontSize: '12px',
                                color: '#00000073',
                              }}
                            >
                              ✕
                            </span>
                          )}
                        </span>
                      );
                    }}
                  >
                    {userOptions.map((user) => (
                      <Option key={user.id} value={user.id}>
                        {user.firstName} {user.lastName}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="priority"
                  label={<span>Priority</span>}
                  rules={[{ message: "Select priority!" }]}
                >
                  <Select placeholder="Select priority" size="middle">
                    <Option value="A">A (Top Priority)</Option>
                    <Option value="B">B (Basic)</Option>
                    <Option value="C">C (Least Priority)</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="transferMode" label="Transfer Mode">
                  <Select placeholder="Select transfer mode" size="middle">
                    <Option value="email">Email</Option>
                    <Option value="ftp">FTP</Option>
                    <Option value="cloud_storage">Cloud Storage (Drive/Dropbox/WeTransfer)</Option>
                    <Option value="physical_drive">Physical Drive</Option>
                    <Option value="download_link">Download Link</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                                <Form.Item name="notes" label="Client Notes">
                  <TextArea
                    rows={3}
                    placeholder="Enter any notes or special instructions about this client"
                    size="middle"
                    autoComplete="new-password"
                    data-form-type="other"
                  />
                </Form.Item>
              </Col>
            </Row>

            {/* Custom rates are now handled per grading in Work Information */}

            <Divider orientation="left">Financial Information</Divider>
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  name="leader"
                  label="Leader"
                  tooltip="Person in charge of this client"
                >
                  <Select
                    placeholder="Select a leader"
                    size="middle"
                    showSearch
                    optionFilterProp="children"
                    loading={usersLoading}
                    filterOption={(input, option) =>
                      (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {usersData?.users?.map((user) => (
                      <Option key={user.id} value={user.id}>
                        {user.firstName} {user.lastName}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="isGSTEnabled"
                  label="GST Enabled"
                  valuePropName="checked"
                  initialValue={false}
                >
                  <Switch
                    checkedChildren="Yes"
                    unCheckedChildren="No"
                    onChange={handleGSTToggle}
                  />
                </Form.Item>
              </Col>
              {clientType !== "walkIn" && (
                <Col span={8}>
                  <Form.Item
                    name="isCreditEnabled"
                    label="Credit Limit Enabled"
                    valuePropName="checked"
                    initialValue={true}
                  >
                    <Switch
                      checkedChildren="Yes"
                      unCheckedChildren="No"
                      onChange={handleCreditToggle}
                    />
                  </Form.Item>
                </Col>
              )}
            </Row>

            <Row gutter={16}>
              {isGSTEnabled && (
                <>
                  <Col span={8}>
                    <Form.Item
                      name="gstNo"
                      label={
                        <span>
                          GST Number <span style={{ color: "red" }}>*</span>
                        </span>
                      }
                      rules={[
                        {
                          required: isGSTEnabled,
                          message:
                            "GST number is required when GST is enabled!",
                        },
                      ]}
                    >
                      <Input 
                        placeholder="Enter GST number" 
                        size="middle" 
                        autoComplete="new-password"
                        data-form-type="other"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name="gstRate"
                      label={
                        <span>
                          GST Rate (%) <span style={{ color: "red" }}>*</span>
                        </span>
                      }
                      rules={[
                        {
                          required: isGSTEnabled,
                          message: "GST rate is required when GST is enabled!",
                        },
                      ]}
                    >
                      <InputNumber
                        placeholder="Enter GST rate"
                        size="middle"
                        style={{ width: "100%" }}
                        min={0}
                        max={100}
                        formatter={(value) => `${value}%`}
                        parser={(value) => value.replace("%", "")}
                      />
                    </Form.Item>
                  </Col>
                </>
              )}
              <Col span={isGSTEnabled ? 8 : 16}>
                <Form.Item name="panCard" label="PAN Card">
                  <Input 
                    placeholder="Enter PAN card number" 
                    size="middle" 
                    autoComplete="new-password"
                    data-form-type="other"
                  />
                </Form.Item>
              </Col>
            </Row>

            {/* Credit and Opening Balance fields only for permanent clients */}
            {clientType !== "walkIn" && (
              <>
                {isCreditEnabled && (
                  <Row gutter={16}>
                    <Col span={8}>
                      <Form.Item 
                        name="creditDays" 
                        label="Credit in Days"
                        initialValue={30}
                      >
                        <InputNumber
                          placeholder="Enter credit days"
                          size="middle"
                          style={{ width: "100%" }}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item
                        name="creditAmountLimit"
                        label="Credit in Amount (₹)"
                      >
                        <InputNumber
                          placeholder="Enter credit amount"
                          size="middle"
                          style={{ width: "100%" }}
                          formatter={(value) =>
                            `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                          }
                          parser={(value) => value.replace(/₹\s?|(,*)/g, "")}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                )}

                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item
                      name="openingBalance"
                      label="Opening Balance (₹)"
                    >
                      <InputNumber
                        placeholder="Enter opening balance"
                        size="middle"
                        style={{ width: "100%" }}
                        formatter={(value) =>
                          `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                        }
                        parser={(value) => value.replace(/₹\s?|(,*)/g, "")}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name="openingBalanceType"
                      label="Opening Balance Type"
                      initialValue="to_receive"
                    >
                      <Select placeholder="Select balance type" size="middle">
                        <Option value="to_receive">
                          To Receive (We owe them)
                        </Option>
                        <Option value="to_pay">To Pay (They owe us)</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
              </>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // Expose header and footer for parent drawer
  const renderHeader = useCallback(
    () => (
      <Steps current={currentStep} size="small">
        {steps.map((step) => (
          <Step key={step.title} title={step.title} icon={step.icon} />
        ))}
      </Steps>
    ),
    [currentStep, steps]
  );

  const renderFooter = useCallback(
    () => (
      <div className="flex justify-between w-full">
        <div>
          {currentStep > 0 && <Button onClick={prevStep}>Previous</Button>}
        </div>
        <Space>
          <Button onClick={onClose}>Cancel</Button>
          {currentStep < steps.length - 1 ? (
            <Button type="primary" onClick={nextStep}>
              Next
            </Button>
          ) : (
            <Button type="primary" onClick={handleSubmit} loading={loading}>
              {client ? "Update Client" : "Create Client"}
            </Button>
          )}
        </Space>
      </div>
    ),
    [
      currentStep,
      steps,
      loading,
      client,
      prevStep,
      nextStep,
      handleSubmit,
      onClose,
    ]
  );

  // Notify parent about header and footer when rendering in drawer mode
  useEffect(() => {
    if (renderHeaderInDrawer && renderHeader) {
      const header = renderHeader();
      renderHeaderInDrawer(header);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, clientType]);

  useEffect(() => {
    if (renderFooterInDrawer && renderFooter) {
      const footer = renderFooter();
      renderFooterInDrawer(footer);
    }
    // Re-run when handleSubmit changes so the footer's Update button
    // always calls the latest callback (which captures the latest gradingCustomRates).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, loading, clientType, handleSubmit]);

  return (
    <>
      <style>
        {`
          #client-form-prevent-autofill input:-webkit-autofill,
          #client-form-prevent-autofill input:-webkit-autofill:hover,
          #client-form-prevent-autofill input:-webkit-autofill:focus,
          #client-form-prevent-autofill input:-webkit-autofill:active,
          #client-form-prevent-autofill textarea:-webkit-autofill,
          #client-form-prevent-autofill textarea:-webkit-autofill:hover,
          #client-form-prevent-autofill textarea:-webkit-autofill:focus,
          #client-form-prevent-autofill textarea:-webkit-autofill:active {
            -webkit-box-shadow: 0 0 0 30px white inset !important;
            -webkit-text-fill-color: #000 !important;
            transition: background-color 5000s ease-in-out 0s;
          }
          
          /* Prevent autofill dropdown on Select components */
          #client-form-prevent-autofill .ant-select-selection-search-input {
            -webkit-autofill: none !important;
            autocomplete: off !important;
          }
          
          #client-form-prevent-autofill .ant-select-selection-search-input::-webkit-credentials-auto-fill-button {
            visibility: hidden;
            pointer-events: none;
            position: absolute;
            right: 0;
          }
        `}
      </style>
      <Form
        form={form}
        layout="vertical"
        requiredMark="optional"
        autoComplete="off"
        name="client-form-prevent-autofill"
        id="client-form-prevent-autofill"
        initialValues={{
          clientType: "permanent",
          isActive: true,
        }}
        {...formItemLayout}
      >
        {renderStepContent()}
      </Form>
    </>
  );
};

export default ClientForm;
