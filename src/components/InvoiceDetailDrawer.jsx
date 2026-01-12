import React from 'react';
import { Card, Row, Col, Button, message, Typography, Descriptions, Table, Tag, Space, Spin } from 'antd';
import { FilePdfOutlined } from '@ant-design/icons';
import { useQuery } from '@apollo/client';
import dayjs from 'dayjs';
import { generateInvoicePDF } from '../utils/invoicePDF';
import { GET_INVOICE_BY_ID } from '../gql/clientLedger';

const { Text } = Typography;

const InvoiceDetailDrawer = ({ invoice, invoiceId, onClose, onExtraRender }) => {
  console.log('InvoiceDetailDrawer rendered with:', { invoice, invoiceId });
  
  // If invoiceId is provided but not invoice object, fetch from backend
  const { data, loading, error } = useQuery(GET_INVOICE_BY_ID, {
    variables: { invoiceId },
    skip: !invoiceId || !!invoice, // Skip if invoice object is already provided
    onCompleted: (data) => {
      console.log('GET_INVOICE_BY_ID completed with data:', data);
    },
    onError: (error) => {
      console.error('GET_INVOICE_BY_ID error:', error);
    }
  });

  console.log('Query state:', { data, loading, error, skip: !invoiceId || !!invoice });

  // Use fetched data if invoice wasn't provided directly
  const invoiceData = invoice || data?.invoice;
  
  console.log('invoiceData:', invoiceData);

  const handleDownloadPDF = React.useCallback(async () => {
    if (!invoiceData) return;
    try {
      message.loading({ content: 'Generating PDF...', key: 'pdf' });
      await generateInvoicePDF(invoiceData);
      message.success({
        content: 'Invoice downloaded successfully!',
        key: 'pdf',
        duration: 2,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      message.error({
        content: 'Failed to generate invoice PDF',
        key: 'pdf',
        duration: 2,
      });
    }
  }, [invoiceData]);

  // Render extra button for drawer header - must be before any early returns
  React.useEffect(() => {
    if (onExtraRender && invoiceData) {
      const extraButton = (
        <Button 
          type="primary" 
          icon={<FilePdfOutlined />}
          onClick={handleDownloadPDF}
        >
          Download PDF
        </Button>
      );
      onExtraRender(extraButton);
    }
  }, [invoiceData, onExtraRender, handleDownloadPDF]);

  if (loading) {
    return (
      <div style={{ padding: '100px', textAlign: 'center' }}>
        <Spin size="large" tip="Loading invoice details..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px' }}>
        <Card>
          <Text type="danger">Error loading invoice: {error.message}</Text>
        </Card>
      </div>
    );
  }
  
  if (!invoiceData) {
    console.log('No invoice data available, returning null');
    return null;
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Invoice Header */}
      <Card size="small">
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Text type="secondary">Invoice Number</Text>
            <div><Text strong style={{ fontSize: '16px' }}>{invoiceData.invoiceNumber}</Text></div>
          </Col>
          <Col span={12}>
            <Text type="secondary">Invoice Date</Text>
            <div><Text strong>{dayjs(invoiceData.invoiceDate).format('DD MMMM YYYY')}</Text></div>
          </Col>
          <Col span={24}>
            <Text type="secondary">Total Amount</Text>
            <div>
              <Text strong style={{ 
                fontSize: '24px',
                color: '#fa8c16'
              }}>
                ₹{parseFloat(invoiceData.totalAmount).toLocaleString()}
              </Text>
            </div>
          </Col>
        </Row>
      </Card>

      <Card 
        title={<Text strong>Invoice Information</Text>}
        size="small"
        style={{ borderColor: '#fa8c16' }}
      >
        <Descriptions bordered column={2} size="small">
          <Descriptions.Item label="Invoice Number" span={1}>
            <Text strong>{invoiceData.invoiceNumber}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Status" span={1}>
            <Tag 
              color={
                invoiceData.status === 'FULLY_PAID' ? 'green' :
                invoiceData.status === 'PARTIAL_PAID' ? 'orange' : 
                invoiceData.status === 'OVERDUE' ? 'red' : 'blue'
              }
            >
              {invoiceData.status.replace('_', ' ')}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Invoice Date" span={1}>
            {dayjs(invoiceData.invoiceDate).format('DD MMM YYYY')}
          </Descriptions.Item>
          <Descriptions.Item label="Due Date" span={1}>
            {invoiceData.dueDate ? (
              <Text type={dayjs(invoiceData.dueDate).isBefore(dayjs()) ? 'danger' : undefined}>
                {dayjs(invoiceData.dueDate).format('DD MMM YYYY')}
                {dayjs(invoiceData.dueDate).isBefore(dayjs()) && ' (Overdue)'}
              </Text>
            ) : '-'}
          </Descriptions.Item>
          {invoiceData.project && (
            <>
              <Descriptions.Item label="Project Code" span={1}>
                {invoiceData.project.projectCode}
              </Descriptions.Item>
              <Descriptions.Item label="Project Name" span={1}>
                {invoiceData.project.name}
              </Descriptions.Item>
            </>
          )}
          {invoiceData.project?.description && (
            <Descriptions.Item label="Description" span={2}>
              {invoiceData.project.description}
            </Descriptions.Item>
          )}
        </Descriptions>

        {/* Grading Items Table */}
        {invoiceData.project?.projectGradings?.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <Text strong style={{ fontSize: '14px', marginBottom: 8, display: 'block' }}>
              Service Details
            </Text>
            <Table
              size="small"
              bordered
              pagination={false}
              dataSource={invoiceData.project.projectGradings}
              rowKey={(record, idx) => idx}
              columns={[
                {
                  title: 'Grading',
                  dataIndex: ['grading', 'name'],
                  key: 'grading',
                  width: '30%',
                  render: (name) => <Text strong>{name}</Text>,
                },
                {
                  title: 'Image Qty',
                  dataIndex: 'imageQuantity',
                  key: 'quantity',
                  width: '20%',
                  align: 'center',
                  render: (qty) => <Text>{qty}</Text>,
                },
                {
                  title: 'Rate',
                  dataIndex: 'customRate',
                  key: 'rate',
                  width: '20%',
                  align: 'right',
                  render: (rate, record) => {
                    const finalRate = (rate !== undefined && rate !== null) ? rate : (record.grading?.defaultRate || 0);
                    return <Text>₹{parseFloat(finalRate).toFixed(2)}</Text>;
                  },
                },
                {
                  title: 'Amount',
                  key: 'amount',
                  width: '30%',
                  align: 'right',
                  render: (_, record) => {
                    const finalRate = (record.customRate !== undefined && record.customRate !== null) ? record.customRate : (record.grading?.defaultRate || 0);
                    const amount = parseFloat(record.imageQuantity) * parseFloat(finalRate);
                    return <Text strong>₹{amount.toFixed(2)}</Text>;
                  },
                },
              ]}
              summary={(pageData) => {
                const totalAmount = pageData.reduce(
                  (sum, item) => {
                    const finalRate = (item.customRate !== undefined && item.customRate !== null) ? item.customRate : (item.grading?.defaultRate || 0);
                    return sum + (parseFloat(item.imageQuantity) * parseFloat(finalRate));
                  },
                  0
                );
                return (
                  <Table.Summary.Row style={{ backgroundColor: '#fafafa' }}>
                    <Table.Summary.Cell colSpan={3} align="right">
                      <Text strong>Subtotal:</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell align="right">
                      <Text strong style={{ fontSize: '16px' }}>
                        ₹{totalAmount.toFixed(2)}
                      </Text>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                );
              }}
            />
          </div>
        )}

        {/* Invoice Amount Summary */}
        <Card size="small" style={{ marginTop: 16, backgroundColor: '#fafafa' }}>
          <Row gutter={[16, 8]}>
            <Col span={12}>
              <Text type="secondary">Subtotal:</Text>
            </Col>
            <Col span={12} style={{ textAlign: 'right' }}>
              <Text strong>₹{parseFloat(invoiceData.subtotalAmount || 0).toLocaleString()}</Text>
            </Col>
            {invoiceData.taxAmount > 0 && (
              <>
                <Col span={12}>
                  <Text type="secondary">Tax (GST):</Text>
                </Col>
                <Col span={12} style={{ textAlign: 'right' }}>
                  <Text>₹{parseFloat(invoiceData.taxAmount).toLocaleString()}</Text>
                </Col>
              </>
            )}
            {invoiceData.discountAmount > 0 && (
              <>
                <Col span={12}>
                  <Text type="secondary">Discount:</Text>
                </Col>
                <Col span={12} style={{ textAlign: 'right' }}>
                  <Text type="danger">-₹{parseFloat(invoiceData.discountAmount).toLocaleString()}</Text>
                </Col>
              </>
            )}
            <Col span={24}><hr style={{ margin: '8px 0', border: 'none', borderTop: '1px solid #d9d9d9' }} /></Col>
            <Col span={12}>
              <Text strong style={{ fontSize: '16px' }}>Total Invoice Amount:</Text>
            </Col>
            <Col span={12} style={{ textAlign: 'right' }}>
              <Text strong style={{ fontSize: '18px' }}>
                ₹{parseFloat(invoiceData.totalAmount).toLocaleString()}
              </Text>
            </Col>
            <Col span={12}>
              <Text type="secondary">Paid:</Text>
            </Col>
            <Col span={12} style={{ textAlign: 'right' }}>
              <Text style={{ color: '#52c41a', fontSize: '16px' }}>
                ₹{parseFloat(invoiceData.paidAmount || 0).toLocaleString()}
              </Text>
            </Col>
            <Col span={12}>
              <Text strong style={{ fontSize: '16px' }}>Balance Due:</Text>
            </Col>
            <Col span={12} style={{ textAlign: 'right' }}>
              <Text strong style={{ fontSize: '18px', color: invoiceData.balanceAmount > 0 ? '#f5222d' : '#52c41a' }}>
                ₹{parseFloat(invoiceData.balanceAmount || 0).toLocaleString()}
              </Text>
            </Col>
          </Row>
        </Card>

        {/* Payment Allocations */}
        {invoiceData.allocations && invoiceData.allocations.length > 0 && (
          <Card size="small" style={{ marginTop: 16 }} title={<Text strong>Payment Allocations</Text>}>
            <Table
              size="small"
              bordered
              pagination={false}
              dataSource={invoiceData.allocations}
              rowKey="id"
              columns={[
                {
                  title: 'Payment #',
                  dataIndex: ['payment', 'paymentNumber'],
                  key: 'paymentNumber',
                  width: '25%',
                  render: (paymentNumber) => <Text strong>{paymentNumber}</Text>,
                },
                {
                  title: 'Date',
                  dataIndex: 'allocationDate',
                  key: 'allocationDate',
                  width: '20%',
                  render: (date) => dayjs(date).format('DD MMM YYYY'),
                },
                {
                  title: 'Payment Method',
                  key: 'paymentMethod',
                  width: '25%',
                  render: (_, record) => (
                    <Tag color="blue">
                      {record.payment?.paymentType?.name || 'N/A'}
                    </Tag>
                  ),
                },
                {
                  title: 'Amount',
                  dataIndex: 'allocatedAmount',
                  key: 'allocatedAmount',
                  width: '20%',
                  align: 'right',
                  render: (amount) => (
                    <Text strong style={{ color: '#52c41a' }}>
                      ₹{parseFloat(amount).toLocaleString()}
                    </Text>
                  ),
                },
                {
                  title: 'Type',
                  dataIndex: 'isAutoAllocated',
                  key: 'isAutoAllocated',
                  width: '10%',
                  align: 'center',
                  render: (isAuto) => (
                    <Tag color={isAuto ? 'cyan' : 'purple'} style={{ fontSize: '11px' }}>
                      {isAuto ? 'Auto' : 'Manual'}
                    </Tag>
                  ),
                },
              ]}
              summary={(pageData) => {
                const totalAllocated = pageData.reduce(
                  (sum, item) => sum + parseFloat(item.allocatedAmount),
                  0
                );
                return (
                  <Table.Summary.Row style={{ backgroundColor: '#f0f0f0' }}>
                    <Table.Summary.Cell colSpan={3} align="right">
                      <Text strong>Total Paid:</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell align="right">
                      <Text strong style={{ fontSize: '14px', color: '#52c41a' }}>
                        ₹{totalAllocated.toLocaleString()}
                      </Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell />
                  </Table.Summary.Row>
                );
              }}
            />
          </Card>
        )}
      </Card>

      {/* Created By */}
      {invoiceData.createdByUser && (
        <Card size="small">
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="Created By" span={1}>
              {invoiceData.createdByUser.firstName} {invoiceData.createdByUser.lastName}
            </Descriptions.Item>
            {invoiceData.createdAt && (
              <Descriptions.Item label="Created At" span={1}>
                {dayjs(invoiceData.createdAt).format('DD MMM YYYY, hh:mm A')}
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>
      )}
    </Space>
  );
};

export default InvoiceDetailDrawer;
