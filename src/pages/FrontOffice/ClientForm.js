import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Select,
  Row,
  Col,
  Button,
  message,
  Divider,
  Switch,
  InputNumber,
  Typography,
  Space,
  Steps
} from 'antd';
import {
  UserOutlined,
  BankOutlined,
  EnvironmentOutlined
} from '@ant-design/icons';
import { useMutation, useQuery } from '@apollo/client';
import { 
  CREATE_CLIENT, 
  UPDATE_CLIENT, 
  GET_COUNTRIES, 
  GET_STATES, 
  GET_CITIES 
} from '../../gql/clients';

const { TextArea } = Input;
const { Option } = Select;
const { Text } = Typography;
const { Step } = Steps;

const ClientForm = ({ client, onClose, onSuccess }) => {
  // Additional queries for dynamic fields
  const { data: workTypesData } = useQuery(require('../../gql/workTypes').GET_WORK_TYPES, {
    fetchPolicy: 'network-and-cache'
  });
  const { data: usersData } = useQuery(require('../../gql/users').GET_USERS, {
    fetchPolicy: 'network-and-cache'
  });
  const [selectedWorkTypes, setSelectedWorkTypes] = useState([]);
  const [selectedGrading, setSelectedGrading] = useState(null);
  const [isGSTEnabled, setIsGSTEnabled] = useState(false);
  const [hasCustomRates, setHasCustomRates] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [taskUserAssignments, setTaskUserAssignments] = useState({});
  
  const { data: gradingsData } = useQuery(require('../../gql/gradings').GET_GRADINGS_BY_WORK_TYPES, {
    variables: { workTypeIds: selectedWorkTypes },
    skip: selectedWorkTypes.length === 0,
    fetchPolicy: 'network-and-cache'
  });
  
  const { data: tasksData } = useQuery(require('../../gql/tasks').GET_TASKS_BY_GRADING, {
    variables: { gradingId: selectedGrading, workTypeId: selectedWorkTypes[0] },
    skip: !selectedGrading || selectedWorkTypes.length === 0,
    fetchPolicy: 'network-and-cache'
  });

  // Handler for work type selection
  const handleWorkTypesChange = (values) => {
    setSelectedWorkTypes(values);
    setSelectedGrading(null);
    setSelectedTasks([]);
    setTaskUserAssignments({});
    form.setFieldsValue({ workTypes: values, gradings: [], tasks: [], customRates: {} });
  };
  
  // Handler for grading selection
  const handleGradingChange = (gradingId) => {
    setSelectedGrading(gradingId);
    setSelectedTasks([]);
    setTaskUserAssignments({});
    form.setFieldsValue({ gradings: gradingId, tasks: [], customRates: {} });
  };
  
  // Handler for task selection
  const handleTasksChange = (taskIds) => {
    setSelectedTasks(taskIds);
    // Reset user assignments for deselected tasks
    const newAssignments = {};
    taskIds.forEach(taskId => {
      if (taskUserAssignments[taskId]) {
        newAssignments[taskId] = taskUserAssignments[taskId];
      }
    });
    setTaskUserAssignments(newAssignments);
  };
  
  // Handler for user assignment to tasks
  const handleTaskUserAssignment = (taskId, userIds) => {
    setTaskUserAssignments(prev => ({
      ...prev,
      [taskId]: userIds
    }));
  };
  
  // Handler for GST toggle
  const handleGSTToggle = (checked) => {
    setIsGSTEnabled(checked);
    if (!checked) {
      form.setFieldsValue({ gstNo: undefined, gstRate: undefined });
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

  // GraphQL queries and mutations
  const { data: countriesData } = useQuery(GET_COUNTRIES, {
    fetchPolicy: 'network-and-cache'
  });
  const { data: statesData } = useQuery(GET_STATES, {
    variables: { countryId: selectedCountry },
    skip: !selectedCountry,
    fetchPolicy: 'network-and-cache'
  });
  const { data: citiesData } = useQuery(GET_CITIES, {
    variables: { stateId: selectedState },
    skip: !selectedState,
    fetchPolicy: 'network-and-cache'
  });

  const [createClient] = useMutation(CREATE_CLIENT, {
    onCompleted: () => {
      message.success('Client created successfully');
      onSuccess?.();
    },
    onError: (error) => {
      message.error(error.message);
      setLoading(false);
    }
  });

  const [updateClient] = useMutation(UPDATE_CLIENT, {
    onCompleted: () => {
      message.success('Client updated successfully');
      onSuccess?.();
    },
    onError: (error) => {
      message.error(error.message);
      setLoading(false);
    }
  });



  // Initialize form with client data
  useEffect(() => {
    if (client) {
      form.setFieldsValue({
        ...client,
        countryId: client.country?.id,
        stateId: client.state?.id,
        cityId: client.city?.id,
      });
      setSelectedCountry(client.country?.id);
      setSelectedState(client.state?.id);
      
      // Initialize state values from client data
      if (client.workTypes) {
        setSelectedWorkTypes(client.workTypes);
      }
      if (client.selectedGrading) {
        setSelectedGrading(client.selectedGrading);
      }
      if (client.isGSTEnabled !== undefined) {
        setIsGSTEnabled(client.isGSTEnabled);
      }
      if (client.hasCustomRates !== undefined) {
        setHasCustomRates(client.hasCustomRates);
      }
      if (client.selectedTasks) {
        setSelectedTasks(client.selectedTasks);
      }
      if (client.taskUserAssignments) {
        setTaskUserAssignments(client.taskUserAssignments);
      }
    }
  }, [client, form]);

  // Handle form submission
  const handleSubmit = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      
      const input = {
        ...values,
        isActive: values.isActive !== false,
      };

      if (client) {
        await updateClient({ variables: { id: client.id, input } });
      } else {
        await createClient({ variables: { input } });
      }
    } catch (error) {
      console.error('Form validation error:', error);
      setLoading(false);
    }
  };

  // Step navigation
  const nextStep = () => {
    form.validateFields()
      .then(() => {
        setCurrentStep(currentStep + 1);
      })
      .catch((errorInfo) => {
        console.log('Validation failed:', errorInfo);
      });
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  // Handle country change
  const handleCountryChange = (countryId) => {
    console.log('Country changed:', countryId);
    setSelectedCountry(countryId);
    setSelectedState(null);
    form.setFieldsValue({ stateId: undefined, cityId: undefined });
  };

  // Handle state change
  const handleStateChange = (stateId) => {
    console.log('State changed:', stateId);
    setSelectedState(stateId);
    form.setFieldsValue({ cityId: undefined });
  };

  // Debug logging for states data
  console.log('States data:', statesData);
  console.log('Selected country:', selectedCountry);
  console.log('Selected state:', selectedState);

  // Step configurations
  const steps = [
    {
      title: 'Basic Information',
      icon: <UserOutlined />
    },
    {
      title: 'Contact & Location',
      icon: <EnvironmentOutlined />
    },
    {
      title: 'Business Details',
      icon: <BankOutlined />
    }
  ];

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
                  label="Client Type"
                  rules={[{ required: true, message: 'Please select client type!' }]}
                >
                  <Select placeholder="Select client type" size="middle">
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
                  label="First Name"
                  rules={[{ required: true, message: 'Please enter first name!' }]}
                >
                  <Input placeholder="Enter first name" size="middle" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="lastName"
                  label="Last Name"
                >
                  <Input placeholder="Enter last name" size="middle" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="displayName"
                  label="Display Name"
                >
                  <Input placeholder="Enter display name (optional)" size="middle" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="companyName"
                  label="Company Name"
                >
                  <Input placeholder="Enter company name (optional)" size="middle" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="isActive"
                  label="Active"
                  valuePropName="checked"
                  initialValue={true}
                >
                  <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="contactNoWork"
                  label="Contact No (Work)"
                >
                  <Input placeholder="Enter work contact number" size="middle" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="contactNoPersonal"
                  label="Contact No (Personal)"
                >
                  <Input placeholder="Enter personal contact number" size="middle" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="designation"
                  label="Designation"
                >
                  <Input placeholder="Enter designation" size="middle" />
                </Form.Item>
              </Col>
              {/* currentBalance removed per UI update */}
            </Row>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="email"
                  label="Email"
                  rules={[
                    { type: 'email', message: 'Please enter a valid email!' },
                    { required: true, message: 'Please enter email!' }
                  ]}
                >
                  <Input placeholder="Enter email address" size="middle" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="phone"
                  label="Phone"
                  rules={[{ required: true, message: 'Please enter phone number!' }]}
                >
                  <Input placeholder="Enter phone number" size="middle" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="alternatePhone"
                  label="Alternate Phone"
                >
                  <Input placeholder="Enter alternate phone" size="middle" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="website"
                  label="Website"
                >
                  <Input placeholder="Enter website URL" size="middle" />
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left">Address Information</Divider>

            <Form.Item
              name="address"
              label="Street Address"
              rules={[{ required: true, message: 'Please enter address!' }]}
            >
              <TextArea rows={2} placeholder="Enter full address" />
            </Form.Item>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="countryId"
                  label="Country"
                  rules={[{ required: true, message: 'Please select country!' }]}
                >
                  <Select
                    placeholder="Select country"
                    size="middle"
                    onChange={handleCountryChange}
                    showSearch
                    optionFilterProp="children"
                  >
                    {countriesData?.countries?.map(country => (
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
                  label="State"
                  rules={[{ required: true, message: 'Please select state!' }]}
                >
                  <Select
                    placeholder="Select state"
                    size="middle"
                    onChange={handleStateChange}
                    disabled={!selectedCountry}
                    showSearch
                    optionFilterProp="children"
                    value={form.getFieldValue('stateId')}
                  >
                    {statesData?.statesByCountry?.map(state => (
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
                  label="City"
                  rules={[{ required: true, message: 'Please select city!' }]}
                >
                  <Select
                    placeholder="Select city"
                    size="middle"
                    disabled={!selectedState}
                    showSearch
                    optionFilterProp="children"
                  >
                    {citiesData?.citiesByState?.map(city => (
                      <Option key={city.id} value={city.id}>
                        {city.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              {/* postalCode and timezone removed per UI update */}
            </Row>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            {/* Work Info */}
            <Divider orientation="left">Work Information</Divider>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="workTypes"
                  label="Work Types"
                  rules={[{ required: true, message: 'Select at least one work type!' }]}
                >
                  <Select
                    mode="multiple"
                    placeholder="Select work types"
                    size="middle"
                    onChange={handleWorkTypesChange}
                    value={selectedWorkTypes}
                  >
                    {workTypesData?.workTypes?.map(wt => (
                      <Option key={wt.id} value={wt.id}>{wt.name}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                                <Form.Item
                  name="gradings"
                  label="Grading"
                  rules={[{ required: true, message: 'Please select a grading!' }]}
                >
                  <Select
                    placeholder="Select grading"
                    size="middle"
                    disabled={selectedWorkTypes.length === 0}
                    onChange={handleGradingChange}
                  >
                    {gradingsData?.gradingsByWorkType?.map(grading => (
                      <Option key={grading.id} value={grading.id}>
                        {grading.name} - Default Rate: ₹{grading.defaultRate}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            
            {/* Tasks and User Assignment Section */}
            {selectedGrading && (
              <>
                <Row gutter={16}>
                  <Col span={24}>
                    <Form.Item
                      name="tasks"
                      label="Select Tasks"
                      rules={[{ required: true, message: 'Please select at least one task!' }]}
                    >
                      <Select
                        mode="multiple"
                        placeholder="Select tasks for this client"
                        size="middle"
                        onChange={handleTasksChange}
                      >
                        {tasksData?.tasksByGrading?.map(task => (
                          <Option key={task.id} value={task.id}>
                            {task.name} - {task.description}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
                
                {/* User Assignment for each selected task */}
                {selectedTasks.length > 0 && (
                  <Row gutter={16}>
                    <Col span={24}>
                      <Divider>User Assignments</Divider>
                      {selectedTasks.map(taskId => {
                        const task = tasksData?.tasksByGrading?.find(t => t.id === taskId);
                        return (
                          <Row key={taskId} gutter={16} style={{ marginBottom: 16 }}>
                            <Col span={8}>
                              <Text strong>{task?.name}</Text>
                            </Col>
                            <Col span={16}>
                              <Select
                                mode="multiple"
                                placeholder={`Assign users to ${task?.name}`}
                                size="middle"
                                style={{ width: '100%' }}
                                onChange={(userIds) => handleTaskUserAssignment(taskId, userIds)}
                              >
                                {usersData?.users?.map(user => (
                                  <Option key={user.id} value={user.id}>
                                    {user.firstName} {user.lastName} ({user.email})
                                  </Option>
                                ))}
                              </Select>
                            </Col>
                          </Row>
                        );
                      })}
                    </Col>
                  </Row>
                )}
              </>
            )}

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="hasCustomRates"
                  label="Custom Rate Plan"
                  valuePropName="checked"
                  initialValue={false}
                >
                  <Switch checkedChildren="Yes" unCheckedChildren="No" onChange={handleCustomRateToggle} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="colorCorrectionStyle"
                  label="Color Correction Style"
                >
                  <Input placeholder="Enter color correction style (optional)" size="middle" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="serviceProviders"
                  label="Service Providers (Employees)"
                >
                  <Select mode="multiple" placeholder="Select employees" size="middle">
                    {usersData?.users?.map(user => (
                      <Option key={user.id} value={user.id}>{user.firstName} {user.lastName}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="transferMode"
                  label="Transfer Mode"
                >
                  <Select placeholder="Select transfer mode" size="middle">
                    <Option value="email">Email</Option>
                    <Option value="ftp">FTP</Option>
                    <Option value="cloud">Cloud Storage</Option>
                    <Option value="physical">Physical Media</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="priority"
                  label="Priority"
                  rules={[{ required: true, message: 'Select priority!' }]}
                >
                  <Select placeholder="Select priority" size="middle">
                    <Option value="A">A (Top Priority)</Option>
                    <Option value="B">B (Basic)</Option>
                    <Option value="C">C (Least Priority)</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="notes"
                  label="Client Notes"
                >
                  <TextArea rows={2} placeholder="Special requests or notes from client" />
                </Form.Item>
              </Col>
            </Row>

            {/* Custom Rate Section */}
            {hasCustomRates && selectedGrading && selectedTasks.length > 0 && (
              <>
                <Divider orientation="left">Custom Rates</Divider>
                <Row gutter={16}>
                  <Col span={24}>
                    {selectedTasks.map(taskId => {
                      const task = tasksData?.tasksByGrading?.find(t => t.id === taskId);
                      const grading = gradingsData?.gradingsByWorkType?.find(g => g.id === selectedGrading);
                      return (
                        <Row key={taskId} gutter={16} style={{ marginBottom: 16 }}>
                          <Col span={8}>
                            <Text strong>{task?.name}</Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              Default Rate: ₹{grading?.defaultRate || 0}
                            </Text>
                          </Col>
                          <Col span={16}>
                            <Form.Item
                              name={['customRates', taskId]}
                              label="Custom Rate (₹)"
                            >
                              <InputNumber
                                placeholder={`Enter custom rate (Default: ₹${grading?.defaultRate || 0})`}
                                size="middle"
                                style={{ width: '100%' }}
                                formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                parser={value => value.replace(/₹\s?|(,*)/g, '')}
                              />
                            </Form.Item>
                          </Col>
                        </Row>
                      );
                    })}
                  </Col>
                </Row>
              </>
            )}

            {/* Financial Info */}
            <Divider orientation="left">Financial Information</Divider>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="isGSTEnabled"
                  label="GST Enabled"
                  valuePropName="checked"
                  initialValue={false}
                >
                  <Switch checkedChildren="Yes" unCheckedChildren="No" onChange={handleGSTToggle} />
                </Form.Item>
              </Col>
              {isGSTEnabled && (
                <>
                  <Col span={8}>
                    <Form.Item
                      name="gstNo"
                      label="GST Number"
                      rules={[{ required: true, message: 'GST number is required when GST is enabled!' }]}
                    >
                      <Input placeholder="Enter GST number" size="middle" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name="gstRate"
                      label="GST Rate (%)"
                      rules={[{ required: true, message: 'GST rate is required!' }]}
                    >
                      <InputNumber
                        placeholder="Enter GST rate"
                        size="middle"
                        style={{ width: '100%' }}
                        min={0}
                        max={100}
                        formatter={value => `${value}%`}
                        parser={value => value.replace('%', '')}
                      />
                    </Form.Item>
                  </Col>
                </>
              )}
              {!isGSTEnabled && (
                <Col span={16}>
                  <Form.Item
                    name="panCard"
                    label="PAN Card"
                  >
                    <Input placeholder="Enter PAN card number" size="middle" />
                  </Form.Item>
                </Col>
              )}
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="creditDays"
                  label="Credit in Days"
                >
                  <InputNumber placeholder="Enter credit days" size="middle" style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="creditAmount"
                  label="Credit in Amount (₹)"
                >
                  <InputNumber placeholder="Enter credit amount" size="middle" style={{ width: '100%' }} formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={value => value.replace(/₹\s?|(,*)/g, '')} />
                </Form.Item>
              </Col>

            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="accountMessage"
                  label="Account Related Message"
                >
                  <TextArea rows={2} placeholder="Message for account/credit management" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="leader"
                  label="Client Leader (for transactions)"
                >
                  <Select placeholder="Select leader" size="middle">
                    {usersData?.users?.map(user => (
                      <Option key={user.id} value={user.id}>{user.firstName} {user.lastName}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="py-4">
      {/* Steps */}
      <Steps current={currentStep} className="mb-8">
        {steps.map(step => (
          <Step key={step.title} title={step.title} icon={step.icon} />
        ))}
      </Steps>

      {/* Form */}
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
      >
        {renderStepContent()}
      </Form>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8 pt-4 border-t">
        <div>
          {currentStep > 0 && (
            <Button onClick={prevStep}>
              Previous
            </Button>
          )}
        </div>
        <Space>
          <Button onClick={onClose}>
            Cancel
          </Button>
          {currentStep < steps.length - 1 ? (
            <Button type="primary" onClick={nextStep}>
              Next
            </Button>
          ) : (
            <Button
              type="primary"
              onClick={handleSubmit}
              loading={loading}
            >
              {client ? 'Update Client' : 'Create Client'}
            </Button>
          )}
        </Space>
      </div>
    </div>
  );
};

export default ClientForm;