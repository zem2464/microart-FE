import React from "react";
import {
  Drawer,
  Space,
  Button,
  Card,
  Row,
  Col,
  Typography,
  Descriptions,
  Table,
  Tag,
} from "antd";
import { FilePdfOutlined, SendOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const { Text } = Typography;

const QuoteDrawer = ({ open, onClose, quoteData, onDownload, onEmail, emailDisabled }) => {
  return (
    <Drawer
      title={
        <Space>
          <FilePdfOutlined style={{ color: "#13c2c2" }} />
          <span>Quotation Preview</span>
        </Space>
      }
      placement="right"
      width={880}
      onClose={onClose}
      open={open}
      extra={
        <Space>
          <Button
            icon={<SendOutlined />}
            onClick={onEmail}
            disabled={emailDisabled}
          >
            Email Client
          </Button>
          <Button
            type="primary"
            icon={<FilePdfOutlined />}
            onClick={onDownload}
            disabled={!quoteData}
          >
            Download PDF
          </Button>
        </Space>
      }
    >
      {quoteData ? (
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <CardSection quoteData={quoteData} />
          <ClientProjectSection quoteData={quoteData} />
          <ServicesTable quoteData={quoteData} />
        </Space>
      ) : null}
    </Drawer>
  );
};

const CardSection = ({ quoteData }) => (
  <div>
    <Row gutter={[16, 16]}>
      <Col span={12}>
        <Text type="secondary">Quote Number</Text>
        <div>
          <Text strong style={{ fontSize: "16px" }}>
            {quoteData.quoteNumber}
          </Text>
        </div>
      </Col>
      <Col span={12}>
        <Text type="secondary">Quote Date</Text>
        <div>
          <Text strong>
            {dayjs(quoteData.quoteDate).format("DD MMMM YYYY")}
          </Text>
        </div>
      </Col>
      <Col span={12}>
        <Text type="secondary">Valid Until</Text>
        <div>
          <Text strong type={dayjs(quoteData.validUntil).isBefore(dayjs()) ? "danger" : undefined}>
            {dayjs(quoteData.validUntil).format("DD MMMM YYYY")}
          </Text>
        </div>
      </Col>
      <Col span={12}>
        <Text type="secondary">Estimated Total</Text>
        <div>
          <Text strong style={{ fontSize: "22px", color: "#13c2c2" }}>
            ₹{quoteData.totalAmount.toLocaleString()}
          </Text>
        </div>
      </Col>
    </Row>
  </div>
);

const ClientProjectSection = ({ quoteData }) => (
  <div>
    <Descriptions bordered column={2} size="small">
      <Descriptions.Item label="Client" span={1}>
        {quoteData.client?.displayName ||
          quoteData.client?.companyName ||
          quoteData.client?.clientCode ||
          "N/A"}
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
  </div>
);

const ServicesTable = ({ quoteData }) => (
  <div>
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
              <Text strong style={{ fontSize: "16px" }}>
                Total Quote Amount
+              </Text>
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
  </div>
);

export default QuoteDrawer;
