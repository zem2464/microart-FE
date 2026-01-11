import React from "react";
import {
  Form,
  Input,
  Select,
  Button,
  message,
  Space,
  DatePicker,
  Switch,
  InputNumber,
  Spin,
} from "antd";
import { useMutation, useQuery } from "@apollo/client";
import { CREATE_USER, UPDATE_USER, GET_USERS } from "../gql/users";
import { GET_ROLES } from "../gql/roles";
import { GET_WORK_TYPES } from "../gql/workTypes";
import dayjs from "dayjs";

const { Option } = Select;
const { TextArea } = Input;

const UserForm = ({ open, onClose, user, onSuccess }) => {
  const [form] = Form.useForm();
  const isEditing = !!user;

  // Fetch roles for dropdown
  const { data: rolesData, loading: rolesLoading } = useQuery(GET_ROLES, {
    fetchPolicy: "cache-and-network",
  });

  // Fetch work types for dropdown
  const { data: workTypesData, loading: workTypesLoading } = useQuery(GET_WORK_TYPES, {
    fetchPolicy: "cache-and-network",
  });

  // Apollo mutations
  const [createUser] = useMutation(CREATE_USER, {
    refetchQueries: [{ query: GET_USERS }],
    onCompleted: () => {
      message.success("User created successfully!");
      form.resetFields();
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      message.error(`Failed to create user: ${error.message}`);
    },
  });

  const [updateUser] = useMutation(UPDATE_USER, {
    refetchQueries: [{ query: GET_USERS }],
    onCompleted: () => {
      message.success("User updated successfully!");
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      message.error(`Failed to update user: ${error.message}`);
    },
  });

  // Reset and set form values when drawer opens
  React.useEffect(() => {
    if (open && !rolesLoading && !workTypesLoading) {
      form.resetFields();
      if (user) {
        // Extract workTypeIds from user's workTypes
        const workTypeIds = user.workTypes?.map(wt => wt.id) || [];
        
        form.setFieldsValue({
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          email: user.email || "",
          contactPersonal: user.contactPersonal || "",
          contactHome: user.contactHome || "",
          dateOfBirth: user.dateOfBirth ? dayjs(user.dateOfBirth) : null,
          joiningDate: user.joiningDate ? dayjs(user.joiningDate) : null,
          address: user.address || "",
          roleId: user.roleId || "",
          isEmployee: user.isEmployee ?? true,
          payType: user.payType || "fixed",
          salaryType: user.salaryType || "monthly",
          salaryAmount: user.salaryAmount || 0,
          hourlyRate: user.hourlyRate || 0,
          monthlyHours: user.monthlyHours || 0,
          paymentDetails: user.paymentDetails || "",
          canLogin: user.canLogin ?? true,
          isActive: user.isActive ?? true,
          isServiceProvider: user.isServiceProvider ?? false,
          workTypeIds: workTypeIds,
        });
      } else {
        // Set default values for new user
        form.setFieldsValue({
          isEmployee: true,
          payType: "fixed",
          salaryType: "monthly",
          salaryAmount: 0,
          hourlyRate: 0,
          monthlyHours: 0,
          canLogin: true,
          isActive: true,
          isServiceProvider: false,
          workTypeIds: [],
        });
      }
    }
    if (!open) {
      form.resetFields();
    }
  }, [open, user, rolesLoading, workTypesLoading, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      // Format dates for backend
      const formattedValues = {
        ...values,
        dateOfBirth: values.dateOfBirth ? values.dateOfBirth.format('YYYY-MM-DD') : null,
        joiningDate: values.joiningDate ? values.joiningDate.format('YYYY-MM-DD') : null,
      };

      if (isEditing) {
        await updateUser({ variables: { id: user.id, input: formattedValues } });
      } else {
        await createUser({ variables: { input: formattedValues } });
      }
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  if (rolesLoading || workTypesLoading) return <Spin />;

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      style={{ maxWidth: 500 }}
    >
      {/* Personal Information */}
      <div style={{ marginBottom: 24 }}>
        <h4 style={{ marginBottom: 16, fontWeight: 600 }}>Personal Information</h4>
        
        <Form.Item
          name="firstName"
          label="First Name"
          rules={[{ required: true, message: "Please enter first name" }]}
        >
          <Input placeholder="First name" maxLength={50} size="middle" />
        </Form.Item>

        <Form.Item
          name="lastName"
          label="Last Name"
          rules={[{ required: true, message: "Please enter last name" }]}
        >
          <Input placeholder="Last name" maxLength={50} size="middle" />
        </Form.Item>

        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: "Please enter email" },
            { type: "email", message: "Please enter a valid email" }
          ]}
        >
          <Input placeholder="Email address" maxLength={100} size="middle" />
        </Form.Item>

        <Form.Item
          name="dateOfBirth"
          label="Date of Birth"
        >
          <DatePicker 
            style={{ width: '100%' }} 
            size="middle"
            placeholder="Select date of birth"
          />
        </Form.Item>
      </div>

      {/* Contact Information */}
      <div style={{ marginBottom: 24 }}>
        <h4 style={{ marginBottom: 16, fontWeight: 600 }}>Contact Information</h4>
        
        <Form.Item
          name="contactPersonal"
          label="Personal Contact"
        >
          <Input placeholder="Personal phone number" size="middle" />
        </Form.Item>

        <Form.Item
          name="contactHome"
          label="Home Contact"
        >
          <Input placeholder="Home phone number" size="middle" />
        </Form.Item>

        <Form.Item
          name="address"
          label="Address"
        >
          <TextArea
            placeholder="Full address"
            maxLength={300}
            size="middle"
            autoSize={{ minRows: 2, maxRows: 4 }}
          />
        </Form.Item>

        <Form.Item
          name="paymentDetails"
          label="Payment Details"
          tooltip="Bank account details, UPI ID, or other payment information for salary disbursement"
        >
          <TextArea
            placeholder="Enter bank account details, UPI ID, IFSC code, etc."
            maxLength={500}
            size="middle"
            autoSize={{ minRows: 3, maxRows: 6 }}
          />
        </Form.Item>
      </div>

      {/* Employment Information */}
      <div style={{ marginBottom: 24 }}>
        <h4 style={{ marginBottom: 16, fontWeight: 600 }}>Employment Information</h4>
        
        <Form.Item
          name="roleId"
          label="Role"
          rules={[{ required: true, message: "Please select a role" }]}
        >
          <Select
            placeholder="Select role"
            size="middle"
            showSearch
            optionFilterProp="children"
            style={{ width: "100%" }}
            loading={rolesLoading}
          >
            {rolesData?.roles?.map((role) => (
              <Option key={role.id} value={role.id}>
                {role.name} ({role.roleType})
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="workTypeIds"
          label="Work Types"
          tooltip="Select which work types this user can work on"
        >
          <Select
            mode="multiple"
            placeholder="Select work types"
            size="middle"
            showSearch
            optionFilterProp="children"
            style={{ width: "100%" }}
            loading={workTypesLoading}
            allowClear
          >
            {workTypesData?.workTypes
              ?.filter(wt => wt.isActive)
              .map((workType) => (
                <Option key={workType.id} value={workType.id}>
                  {workType.name}
                </Option>
              ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="isEmployee"
          label="Is Employee"
          valuePropName="checked"
          initialValue={true}
        >
          <Switch />
        </Form.Item>

        <Form.Item
          name="isServiceProvider"
          label="Is Service Provider"
          valuePropName="checked"
          initialValue={false}
          tooltip="Enable this to allow the user to be assigned as a service provider to clients"
        >
          <Switch />
        </Form.Item>
      </div>

      {/* Employee Information */}
      <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => 
        prevValues.isEmployee !== currentValues.isEmployee
      }>
        {({ getFieldValue }) =>
          getFieldValue('isEmployee') && (
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ marginBottom: 16, fontWeight: 600 }}>Employee Information</h4>
              
              <Form.Item
                name="joiningDate"
                label="Joining Date"
                rules={[{ required: true, message: "Please select joining date" }]}
              >
                <DatePicker 
                  style={{ width: '100%' }} 
                  size="middle"
                  placeholder="Select joining date"
                />
              </Form.Item>

              <Form.Item
                name="monthlyHours"
                label="Monthly Hours"
                rules={[{ required: true, message: "Please enter monthly hours" }]}
              >
                <InputNumber
                  placeholder="Total hours per month"
                  min={0}
                  precision={2}
                  style={{ width: '100%' }}
                  size="middle"
                  addonAfter="hours"
                />
              </Form.Item>

              <Form.Item
                name="payType"
                label="Pay Type"
                rules={[{ required: true, message: "Please select pay type" }]}
              >
                <Select placeholder="Select pay type" size="middle">
                  <Option value="fixed">Fixed Salary</Option>
                  <Option value="hourly">Hourly Rate</Option>
                </Select>
              </Form.Item>

              <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => 
                prevValues.payType !== currentValues.payType
              }>
                {({ getFieldValue }) => {
                  const payType = getFieldValue('payType');
                  return payType && (
                    <>
                      {payType === 'fixed' && (
                        <>
                          <Form.Item
                            name="salaryType"
                            label="Salary Period"
                            rules={[{ required: true, message: "Please select salary period" }]}
                          >
                            <Select placeholder="Select salary period" size="middle">
                              <Option value="monthly">Monthly</Option>
                              <Option value="yearly">Yearly</Option>
                            </Select>
                          </Form.Item>
                          
                          <Form.Item
                            name="salaryAmount"
                            label="Fixed Salary Amount"
                            rules={[{ required: true, message: "Please enter salary amount" }]}
                          >
                            <InputNumber
                              placeholder="Fixed salary amount"
                              min={0}
                              precision={2}
                              style={{ width: '100%' }}
                              size="middle"
                              formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                              parser={value => value.replace(/\$\s?|(,*)/g, '')}
                            />
                          </Form.Item>
                        </>
                      )}
                      
                      {payType === 'hourly' && (
                        <Form.Item
                          name="hourlyRate"
                          label="Hourly Rate"
                          rules={[{ required: true, message: "Please enter hourly rate" }]}
                        >
                          <InputNumber
                            placeholder="Hourly rate"
                            min={0}
                            precision={2}
                            style={{ width: '100%' }}
                            size="middle"
                            formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={value => value.replace(/\$\s?|(,*)/g, '')}
                            addonAfter="per hour"
                          />
                        </Form.Item>
                      )}
                    </>
                  );
                }}
              </Form.Item>
            </div>
          )
        }
      </Form.Item>

      {/* System Settings */}
      <div style={{ marginBottom: 24 }}>
        <h4 style={{ marginBottom: 16, fontWeight: 600 }}>System Settings</h4>
        
        <Form.Item
          name="canLogin"
          label="Can Login"
          valuePropName="checked"
          initialValue={true}
        >
          <Switch />
        </Form.Item>

        <Form.Item
          name="isActive"
          label="Is Active"
          valuePropName="checked"
          initialValue={true}
        >
          <Switch />
        </Form.Item>
      </div>
    </Form>
  );
};

export default UserForm;