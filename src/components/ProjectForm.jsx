import React, { useState, useEffect } from "react";
import {
  Form,
  Input,
  Select,
  DatePicker,
  Row,
  Col,
  message,
  Card,
  Typography,
  InputNumber,
} from "antd";
import { useMutation, useQuery, useLazyQuery } from "@apollo/client";
import {
  CREATE_PROJECT,
  UPDATE_PROJECT,
  GET_CLIENT_PREFERENCES,
  VALIDATE_CLIENT_CREDIT,
  GET_GRADING_TASKS,
} from "../graphql/projectQueries";
import { GET_CLIENTS } from "../graphql/clientQueries";
import { GET_WORK_TYPES } from "../graphql/workTypeQueries";
import { GET_GRADINGS } from "../graphql/gradingQueries";
import dayjs from "dayjs";

const { TextArea } = Input;
const { Option } = Select;
const { Text } = Typography;

const ProjectForm = ({ project, mode, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [clientCreditInfo, setClientCreditInfo] = useState(null);
  const [clientPreferences, setClientPreferences] = useState(null);
  const [selectedWorkType, setSelectedWorkType] = useState(null);
  const [selectedGrading, setSelectedGrading] = useState(null);
  const [imageQuantity, setImageQuantity] = useState(0);
  const [calculatedBudget, setCalculatedBudget] = useState(0);
  const [gradingTasks, setGradingTasks] = useState([]);

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

  const { data: gradingsData } = useQuery(GET_GRADINGS, {
    variables: {
      filters: {},
      page: 1,
      limit: 100,
      sortBy: "name",
      sortOrder: "ASC",
    },
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

  // Helper function to get client display name
  const getClientDisplayName = (client) => {
    if (client.displayName) return client.displayName;
    if (client.companyName) return client.companyName;
    return `${client.firstName} ${client.lastName || ""}`.trim();
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
    setClientCreditInfo(null);
    setClientPreferences(null);

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

      if (data?.client) {
        setClientCreditInfo({
          isCreditEnabled: data.client.isCreditEnabled,
          creditLimit: data.client.creditAmountLimit,
          availableCredit: data.client.availableCredit,
        });

        // Process client preferences to extract grading objects
        if (data.client.preferences) {
          const processedPreferences = {
            ...data.client.preferences,
            gradings:
              data.client.preferences.gradings?.map((cg) => cg.grading) || [],
          };
          setClientPreferences(processedPreferences);
        }
      }
    } catch (error) {
      console.error("Error fetching client preferences:", error);
      message.error("Failed to load client preferences");
    }
  };

  // Work type selection handler
  const handleWorkTypeSelect = (workTypeId) => {
    setSelectedWorkType(workTypeId);
    form.setFieldsValue({ grading: undefined });
    setSelectedGrading(null);
    setCalculatedBudget(0);
    setGradingTasks([]);
  };

  // Grading selection handler
  const handleGradingSelect = async (gradingId) => {
    setSelectedGrading(gradingId);
    setCalculatedBudget(0);
    setGradingTasks([]);

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

      if (data?.grading?.tasks) {
        setGradingTasks(data.grading.tasks);
      }
    } catch (error) {
      console.error("Error fetching grading tasks:", error);
      message.error("Failed to load grading tasks");
    }

    // Recalculate budget if we have quantity
    if (imageQuantity > 0) {
      calculateBudget(gradingId, imageQuantity);
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

  // Budget calculation function
  const calculateBudget = async (gradingId, quantity) => {
    if (!gradingId || !quantity) {
      setCalculatedBudget(0);
      return;
    }

    try {
      const grading = gradingsData?.gradings?.find((g) => g.id === gradingId);
      if (grading && grading.defaultRate) {
        const budget = grading.defaultRate * quantity;
        setCalculatedBudget(budget);

        // Validate credit if enabled
        if (clientCreditInfo?.isCreditEnabled && selectedClientId) {
          const { data } = await refetchCreditValidation({
            variables: {
              clientId: selectedClientId,
              gradingId: gradingId,
              quantity: quantity,
            },
          });

          if (
            data?.validateClientCredit &&
            !data.validateClientCredit.isValid
          ) {
            message.warning(data.validateClientCredit.message);
          }
        }
      }
    } catch (error) {
      console.error("Error calculating budget:", error);
    }
  };

  // Add lazy queries for client preferences and grading tasks
  const [refetchClientPreferences] = useLazyQuery(GET_CLIENT_PREFERENCES, {
    fetchPolicy: "network-only",
  });
  const [refetchGradingTasks] = useLazyQuery(GET_GRADING_TASKS, {
    fetchPolicy: "network-only",
  });
  const [refetchCreditValidation] = useLazyQuery(VALIDATE_CLIENT_CREDIT, {
    fetchPolicy: "network-only",
  });

  // Initialize form when project data changes
  useEffect(() => {
    if (project && mode === "edit") {
      form.setFieldsValue({
        clientId: project.clientId,
        workTypeId: project.workTypeId,
        gradingId: project.gradingId,
        imageQuantity: project.imageQuantity,
        deadline: project.deadline ? dayjs(project.deadline) : null,
        budget: project.budget,
        description: project.description,
      });

      // Initialize state for edit mode
      if (project.clientId) {
        setSelectedClientId(project.clientId);
        // Note: Client preferences will be loaded when user interacts with the form
      }
      if (project.workTypeId) {
        setSelectedWorkType(project.workTypeId);
      }
      if (project.gradingId) {
        setSelectedGrading(project.gradingId);
        // Note: Grading tasks will be loaded when user interacts with the form
      }
      if (project.imageQuantity) {
        setImageQuantity(project.imageQuantity);
      }
    } else {
      form.resetFields();
      // Reset all state for new project
      setSelectedClientId(null);
      setClientCreditInfo(null);
      setClientPreferences(null);
      setSelectedWorkType(null);
      setSelectedGrading(null);
      setImageQuantity(0);
      setCalculatedBudget(0);
      setGradingTasks([]);
    }
  }, [project, mode, form]);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const projectData = {
        clientId: values.clientId,
        workTypeId: values.workTypeId,
        gradingId: values.gradingId,
        imageQuantity: values.imageQuantity,
        estimatedCost: calculatedBudget,
        description: values.description,
        deadline: values.deadline ? values.deadline.toISOString() : null,
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

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      disabled={loading}
    >
      <Row gutter={16}>
        <Col span={24}>
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
                    <strong>{client.clientCode}</strong> -{" "}
                    {getClientDisplayName(client)}
                  </span>
                );
              }}
            >
              {clientsData?.clients?.map((client) => (
                <Option key={client.id} value={client.id}>
                  <div>
                    <div style={{ fontWeight: "bold" }}>
                      {getClientDisplayName(client)}
                    </div>
                    <div style={{ fontSize: "12px", color: "#666" }}>
                      Code: {client.clientCode}
                      {(client.contactNoWork || client.contactNoPersonal) && (
                        <span>
                          {" | Mobile: "}
                          {client.contactNoWork || client.contactNoPersonal}
                        </span>
                      )}
                      {client.email && <span> | Email: {client.email}</span>}
                    </div>
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
      </Row>

      {/* Credit Information Display */}
      {clientCreditInfo && clientCreditInfo.isCreditEnabled && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={24}>
            <Card
              size="small"
              style={{ backgroundColor: "#f6ffed", borderColor: "#b7eb8f" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <Text strong style={{ color: "#52c41a" }}>
                    🟢 Credit Enabled Client
                  </Text>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div>
                    <Text>Credit Limit: </Text>
                    <Text strong style={{ fontSize: "16px", color: "#1890ff" }}>
                      ₹{clientCreditInfo.creditLimit?.toLocaleString()}
                    </Text>
                  </div>
                  <div>
                    <Text>Available Credit: </Text>
                    <Text
                      strong
                      style={{
                        fontSize: "16px",
                        color:
                          clientCreditInfo.availableCredit > 0
                            ? "#52c41a"
                            : "#ff4d4f",
                      }}
                    >
                      ₹{clientCreditInfo.availableCredit?.toLocaleString()}
                    </Text>
                  </div>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      )}

      <Row gutter={16}>
        <Col span={12}>
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
                  // If client preferences exist, filter by preferred work types
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
        <Col span={12}>
          <Form.Item
            name="gradingId"
            label="Grading"
            rules={[{ required: true, message: "Please select grading" }]}
          >
            <Select
              placeholder="Select grading"
              loading={!gradingsData}
              onChange={handleGradingSelect}
            >
              {gradingsData?.gradings
                ?.filter((grading) => {
                  // If client preferences exist, filter by preferred gradings
                  if (clientPreferences?.gradings?.length > 0) {
                    return clientPreferences.gradings.some(
                      (pref) => pref.id === grading.id
                    );
                  }
                  return true;
                })
                .map((grading) => (
                  <Option key={grading.id} value={grading.id}>
                    {grading.name} - ₹{grading.defaultRate}
                    {clientPreferences?.gradings?.some(
                      (pref) => pref.id === grading.id
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
      </Row>

      {/* Image Quantity and Budget Section */}
      <Row gutter={16}>
        <Col span={12}>
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

        {/* Budget Display */}
        {calculatedBudget > 0 && (
          <Col span={12}>
            <div style={{ marginTop: 30 }}>
              <Card
                size="small"
                style={{ backgroundColor: "#f0f9ff", borderColor: "#91d5ff" }}
              >
                <div style={{ textAlign: "center" }}>
                  <Text>Estimated Budget</Text>
                  <div
                    style={{
                      fontSize: "20px",
                      fontWeight: "bold",
                      color: "#1890ff",
                    }}
                  >
                    ₹{calculatedBudget.toLocaleString()}
                  </div>
                  {clientCreditInfo?.isCreditEnabled && (
                    <div
                      style={{ fontSize: "12px", color: "#666", marginTop: 4 }}
                    >
                      {calculatedBudget <= clientCreditInfo.availableCredit ? (
                        <Text style={{ color: "#52c41a" }}>
                          ✓ Within available credit
                        </Text>
                      ) : (
                        <Text style={{ color: "#ff4d4f" }}>
                          ⚠ Exceeds available credit
                        </Text>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </Col>
        )}
      </Row>

      {/* Grading Tasks Display */}
      {gradingTasks.length > 0 && (
        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col span={24}>
            <Card
              title={<Text strong>Tasks for Selected Grading</Text>}
              size="small"
              style={{ backgroundColor: "#fafafa" }}
            >
              <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                {gradingTasks.map((task) => (
                  <Card
                    key={task.id}
                    size="small"
                    style={{ marginBottom: 8, backgroundColor: "white" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <Text strong>{task.name}</Text>
                        <div style={{ fontSize: "12px", color: "#666" }}>
                          Type: {task.taskType?.name} | Est. Hours:{" "}
                          {task.estimatedHours} | Rate: ₹{task.hourlyRate}/hr
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        {task.preferredUsers?.length > 0 && (
                          <div style={{ fontSize: "12px" }}>
                            <Text style={{ color: "#52c41a" }}>
                              ★ Preferred Users:
                            </Text>
                            <div>
                              {task.preferredUsers.map((user) => (
                                <div key={user.id} style={{ color: "#666" }}>
                                  {user.firstName} {user.lastName}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          </Col>
        </Row>
      )}

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="deadline" label="Deadline">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="budget" label="Budget">
            <Input type="number" placeholder="Enter budget amount" prefix="$" />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item name="description" label="Description">
        <TextArea rows={4} placeholder="Enter project description" />
      </Form.Item>
    </Form>
  );
};

export default ProjectForm;
