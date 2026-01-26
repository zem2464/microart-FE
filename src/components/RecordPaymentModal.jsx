import React, { useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  Button,
  Row,
  Col,
  Space,
  Spin,
} from 'antd';
import { useQuery } from '@apollo/client';
import { GET_PAYMENT_TYPES } from '../gql/paymentTypes';
import { GET_CLIENTS } from '../gql/clients';
import { usePayment } from '../contexts/PaymentContext';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

const RecordPaymentModal = () => {
  const [form] = Form.useForm();
  const {
    isModalOpen,
    preSelectedClientId,
    recordingPayment,
    closePaymentModal,
    handleRecordPayment,
  } = usePayment();

  // Fetch payment types
  const { data: paymentTypesData, loading: paymentTypesLoading } = useQuery(
    GET_PAYMENT_TYPES
  );

  // Fetch clients
  const { data: clientsData, loading: clientsLoading } = useQuery(GET_CLIENTS);

  // Pre-fill client if provided
  useEffect(() => {
    if (preSelectedClientId && isModalOpen) {
      form.setFieldsValue({ clientId: preSelectedClientId });
    }
  }, [preSelectedClientId, isModalOpen, form]);

  const handleSubmit = (values) => {
    const paymentInput = {
      clientId: values.clientId,
      paymentTypeId: values.paymentTypeId,
      amount: values.amount,
      paymentDate: values.paymentDate.format('YYYY-MM-DD'),
      referenceNumber: values.referenceNumber,
      notes: values.notes,
    };

    // Add chequeDate if provided
    if (values.chequeDate) {
      paymentInput.chequeDate = values.chequeDate.format('YYYY-MM-DD');
    }

    handleRecordPayment(paymentInput);
  };

  const handleCancel = () => {
    form.resetFields();
    closePaymentModal();
  };

  return (
    <Modal
      title="Record Client Payment"
      open={isModalOpen}
      onCancel={handleCancel}
      footer={null}
      width={700}
      destroyOnClose
    >
      <Spin spinning={recordingPayment}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            paymentDate: dayjs(),
          }}
        >
          {/* Client Select - Hidden if pre-selected */}
          {!preSelectedClientId && (
            <Form.Item
              name="clientId"
              label="Client"
              rules={[{ required: true, message: 'Please select a client' }]}
            >
              <Select
                placeholder="Select client"
                showSearch
                loading={clientsLoading}
                filterOption={(input, option) => {
                  const children = option?.children;
                  // Handle case where children might be an array or non-string
                  const searchText = Array.isArray(children) 
                    ? children.join(' ') 
                    : String(children ?? '');
                  return searchText.toLowerCase().includes(input.toLowerCase());
                }}
              >
                {clientsData?.clients?.map((client) => (
                  <Option key={client.id} value={client.id}>
                    {client.displayName || ''} ({client.clientCode || ''})
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="paymentTypeId"
                label="Payment Type"
                rules={[
                  { required: true, message: 'Please select payment type' },
                ]}
              >
                <Select
                  placeholder="Select payment type"
                  loading={paymentTypesLoading}
                >
                  {paymentTypesData?.paymentTypes?.map((type) => (
                    <Option key={type.id} value={type.id}>
                      {type.name} ({type.type})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="amount"
                label="Amount"
                rules={[{ required: true, message: 'Please enter amount' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0.01}
                  precision={2}
                  formatter={(value) =>
                    `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                  }
                  parser={(value) => value.replace(/₹\s?|(,*)/g, '')}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="paymentDate"
                label="Payment Date"
                rules={[
                  { required: true, message: 'Please select payment date' },
                ]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="referenceNumber" label="Reference Number">
                <Input placeholder="Cheque/Transaction reference" />
              </Form.Item>
            </Col>
          </Row>

          {/* Conditional Cheque Date field */}
          <Form.Item noStyle shouldUpdate>
            {({ getFieldValue }) => {
              const paymentTypeId = getFieldValue('paymentTypeId');
              const selectedType = paymentTypesData?.paymentTypes?.find(
                (pt) => pt.id === paymentTypeId
              );

              // Show cheque date for CHEQUE payment type
              if (selectedType?.type === 'CHEQUE') {
                return (
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item name="chequeDate" label="Cheque Date">
                        <DatePicker style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                  </Row>
                );
              }
              return null;
            }}
          </Form.Item>

          <Form.Item name="notes" label="Notes">
            <TextArea rows={3} placeholder="Additional notes..." />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={recordingPayment}>
                Record Payment
              </Button>
              <Button onClick={handleCancel}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Spin>
    </Modal>
  );
};

export default RecordPaymentModal;
