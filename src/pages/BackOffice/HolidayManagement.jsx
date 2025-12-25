import React, { useState } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  DatePicker,
  Switch,
  Space,
  message,
  Popconfirm,
  Card,
  Select,
  Typography,
  Tag,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation } from '@apollo/client';
import {
  GET_HOLIDAYS,
  CREATE_HOLIDAY,
  UPDATE_HOLIDAY,
  DELETE_HOLIDAY,
} from '../../graqhql/holiday';
import dayjs from 'dayjs';

const { Title } = Typography;
const { TextArea } = Input;

const HolidayManagement = () => {
  const currentYear = dayjs().year();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [form] = Form.useForm();

  // Queries
  const { data, loading, refetch } = useQuery(GET_HOLIDAYS, {
    variables: { year: selectedYear, isActive: null },
    fetchPolicy: 'cache-and-network',
  });

  // Mutations
  const [createHoliday, { loading: creating }] = useMutation(CREATE_HOLIDAY, {
    onCompleted: () => {
      message.success('Holiday created successfully');
      setIsModalVisible(false);
      form.resetFields();
      refetch();
    },
    onError: (error) => {
      message.error(error.message || 'Failed to create holiday');
    },
  });

  const [updateHoliday, { loading: updating }] = useMutation(UPDATE_HOLIDAY, {
    onCompleted: () => {
      message.success('Holiday updated successfully');
      setIsModalVisible(false);
      setEditingHoliday(null);
      form.resetFields();
      refetch();
    },
    onError: (error) => {
      message.error(error.message || 'Failed to update holiday');
    },
  });

  const [deleteHoliday, { loading: deleting }] = useMutation(DELETE_HOLIDAY, {
    onCompleted: () => {
      message.success('Holiday deleted successfully');
      refetch();
    },
    onError: (error) => {
      message.error(error.message || 'Failed to delete holiday');
    },
  });

  // Handlers
  const handleAdd = () => {
    setEditingHoliday(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingHoliday(record);
    form.setFieldsValue({
      name: record.name,
      date: dayjs(record.date),
      description: record.description,
      isActive: record.isActive,
    });
    setIsModalVisible(true);
  };

  const handleDelete = (id) => {
    deleteHoliday({ variables: { id } });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const input = {
        name: values.name,
        date: values.date.format('YYYY-MM-DD'),
        description: values.description || null,
        isActive: values.isActive !== undefined ? values.isActive : true,
      };

      if (editingHoliday) {
        await updateHoliday({
          variables: { id: editingHoliday.id, input },
        });
      } else {
        await createHoliday({
          variables: { input },
        });
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  // Generate year options
  const yearOptions = [];
  for (let i = currentYear - 2; i <= currentYear + 5; i++) {
    yearOptions.push({ label: i.toString(), value: i });
  }

  // Table columns
  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date) => dayjs(date).format('DD MMM YYYY (dddd)'),
      sorter: (a, b) => dayjs(a.date).unix() - dayjs(b.date).unix(),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
      filters: [
        { text: 'Active', value: true },
        { text: 'Inactive', value: false },
      ],
      onFilter: (value, record) => record.isActive === value,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Are you sure you want to delete this holiday?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}
        >
          <Title level={3}>
            <CalendarOutlined /> Holiday Management
          </Title>
          <Space>
            <Select
              value={selectedYear}
              onChange={setSelectedYear}
              options={yearOptions}
              style={{ width: 120 }}
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
            >
              Add Holiday
            </Button>
          </Space>
        </div>

        <Table
          dataSource={data?.holidays || []}
          columns={columns}
          loading={loading || deleting}
          rowKey="id"
          pagination={{
            pageSize: 25,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} holidays`,
          }}
        />
      </Card>

      <Modal
        title={editingHoliday ? 'Edit Holiday' : 'Add Holiday'}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingHoliday(null);
          form.resetFields();
        }}
        confirmLoading={creating || updating}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ isActive: true }}
        >
          <Form.Item
            name="name"
            label="Holiday Name"
            rules={[
              { required: true, message: 'Please enter holiday name' },
            ]}
          >
            <Input placeholder="e.g., New Year, Christmas" />
          </Form.Item>

          <Form.Item
            name="date"
            label="Date"
            rules={[{ required: true, message: 'Please select date' }]}
          >
            <DatePicker style={{ width: '100%' }} format="DD MMM YYYY" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <TextArea
              rows={3}
              placeholder="Optional description about the holiday"
            />
          </Form.Item>

          <Form.Item
            name="isActive"
            label="Active"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default HolidayManagement;
