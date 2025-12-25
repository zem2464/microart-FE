import React, { useState } from 'react';
import {
  Modal,
  Form,
  Input,
  DatePicker,
  TimePicker,
  Radio,
  InputNumber,
  Space,
  message,
  Alert,
  Divider,
  Typography,
  Card,
  Tag,
  Empty,
} from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery } from '@apollo/client';
import { APPLY_LEAVE } from '../../graqhql/leave';
import { GET_HOLIDAYS } from '../../graqhql/holiday';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(isBetween);

const { TextArea } = Input;
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const ApplyLeaveModal = ({ visible, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [leaveType, setLeaveType] = useState('SHORT');
  const [durationType, setDurationType] = useState('HOURS');
  const currentYear = dayjs().year();

  // Get holidays for the current year
  const { data: holidaysData } = useQuery(GET_HOLIDAYS, {
    variables: { year: currentYear, isActive: true },
    fetchPolicy: 'cache-and-network',
  });

  const [applyLeave, { loading }] = useMutation(APPLY_LEAVE, {
    onCompleted: () => {
      message.success(
        leaveType === 'SHORT'
          ? 'Short leave applied successfully (auto-approved)'
          : 'Leave application submitted successfully. Waiting for approval.'
      );
      form.resetFields();
      onClose();
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      message.error(error.message || 'Failed to apply leave');
    },
  });

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      let startDate, endDate, hours = null;

      if (leaveType === 'SHORT') {
        // For short leave, combine date and time
        const combinedDateTime = values.shortLeaveDate
          .hour(values.shortLeaveTime.hour())
          .minute(values.shortLeaveTime.minute())
          .second(0);
        
        startDate = combinedDateTime.format('YYYY-MM-DD HH:mm:ss');
        endDate = combinedDateTime
          .add(values.hours, 'hour')
          .format('YYYY-MM-DD HH:mm:ss');
        hours = values.hours;
      } else {
        // For long leave
        const [start, end] = values.dateRange;
        
        if (durationType === 'HALF_DAY') {
          // For half day, set specific times
          startDate = start.hour(9).minute(0).second(0).format('YYYY-MM-DD HH:mm:ss');
          endDate = start.hour(13).minute(0).second(0).format('YYYY-MM-DD HH:mm:ss');
        } else {
          // For full day
          startDate = start.startOf('day').format('YYYY-MM-DD HH:mm:ss');
          endDate = end.endOf('day').format('YYYY-MM-DD HH:mm:ss');
        }
      }

      const input = {
        leaveType,
        durationType,
        startDate,
        endDate,
        hours,
        reason: values.reason,
      };

      await applyLeave({ variables: { input } });
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleLeaveTypeChange = (e) => {
    const newLeaveType = e.target.value;
    setLeaveType(newLeaveType);
    
    if (newLeaveType === 'SHORT') {
      setDurationType('HOURS');
      form.setFieldsValue({ durationType: 'HOURS' });
    } else {
      setDurationType('FULL_DAY');
      form.setFieldsValue({ durationType: 'FULL_DAY' });
    }
  };

  // Check if a date is a holiday
  const isHoliday = (date) => {
    if (!holidaysData?.holidays) return null;
    return holidaysData.holidays.find((holiday) =>
      dayjs(holiday.date).isSame(date, 'day')
    );
  };

  // Disable dates in date picker (only Sunday)
  const disabledDate = (current) => {
    if (!current) return false;
    
    // Disable only Sunday (company weekly off)
    const day = current.day();
    return day === 0;
  };

  // Custom cell render for holiday highlighting
  const dateRender = (current) => {
    const holiday = isHoliday(current);
    if (holiday) {
      return (
        <div className="ant-picker-cell-inner">
          {current.date()}
          <div style={{ fontSize: '10px', color: '#ff4d4f' }}>
            Holiday
          </div>
        </div>
      );
    }
    return <div className="ant-picker-cell-inner">{current.date()}</div>;
  };

  return (
    <Modal
      title={
        <Space>
          <CalendarOutlined />
          <span>Apply for Leave</span>
        </Space>
      }
      open={visible}
      onOk={handleSubmit}
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      confirmLoading={loading}
      width={700}
      okText="Submit Application"
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          leaveType: 'SHORT',
          durationType: 'HOURS',
          hours: 1,
        }}
      >
        {/* Leave Type Selection */}
        <Form.Item
          name="leaveType"
          label="Leave Type"
          rules={[{ required: true }]}
        >
          <Radio.Group onChange={handleLeaveTypeChange}>
            <Radio.Button value="SHORT">
              <ClockCircleOutlined /> Short Leave (Max 4 hours)
            </Radio.Button>
            <Radio.Button value="LONG">
              <CalendarOutlined /> Long Leave (Full/Half Day)
            </Radio.Button>
          </Radio.Group>
        </Form.Item>

        {leaveType === 'SHORT' ? (
          <>
            <Alert
              message="Short leaves are auto-approved and do not require manager approval"
              type="info"
              showIcon
              icon={<InfoCircleOutlined />}
              style={{ marginBottom: 16 }}
            />

            <Space direction="horizontal" style={{ width: '100%', display: 'flex' }}>
              <Form.Item
                name="shortLeaveDate"
                label="Date"
                rules={[{ required: true, message: 'Please select date' }]}
                style={{ flex: 1, marginBottom: 0 }}
              >
                <DatePicker
                  format="DD MMM YYYY"
                  style={{ width: '100%' }}
                  disabledDate={disabledDate}
                />
              </Form.Item>

              <Form.Item
                name="shortLeaveTime"
                label="Start Time"
                rules={[{ required: true, message: 'Please select time' }]}
                style={{ flex: 1, marginBottom: 0 }}
              >
                <TimePicker
                  format="HH:mm"
                  style={{ width: '100%' }}
                  minuteStep={15}
                />
              </Form.Item>
            </Space>

            <Form.Item
              name="hours"
              label="Duration (Hours)"
              rules={[
                { required: true, message: 'Please enter duration' },
                {
                  type: 'number',
                  min: 0.5,
                  max: 4,
                  message: 'Duration must be between 0.5 and 4 hours',
                },
              ]}
            >
              <InputNumber
                min={0.5}
                max={4}
                step={0.5}
                style={{ width: '100%' }}
                placeholder="Enter hours (max 4)"
              />
            </Form.Item>
          </>
        ) : (
          <>
            <Alert
              message="Long leaves require manager approval"
              type="warning"
              showIcon
              icon={<InfoCircleOutlined />}
              style={{ marginBottom: 16 }}
            />

            <Form.Item
              name="durationType"
              label="Duration Type"
              rules={[{ required: true }]}
            >
              <Radio.Group onChange={(e) => setDurationType(e.target.value)}>
                <Radio value="FULL_DAY">Full Day</Radio>
                <Radio value="HALF_DAY">Half Day</Radio>
              </Radio.Group>
            </Form.Item>

            {durationType === 'HALF_DAY' ? (
              <Form.Item
                name="dateRange"
                label="Select Date"
                rules={[{ required: true, message: 'Please select date' }]}
              >
                <DatePicker
                  format="DD MMM YYYY"
                  style={{ width: '100%' }}
                  disabledDate={disabledDate}
                  dateRender={dateRender}
                />
              </Form.Item>
            ) : (
              <Form.Item
                name="dateRange"
                label="Date Range"
                rules={[{ required: true, message: 'Please select date range' }]}
              >
                <RangePicker
                  format="DD MMM YYYY"
                  style={{ width: '100%' }}
                  disabledDate={disabledDate}
                  dateRender={dateRender}
                />
              </Form.Item>
            )}
          </>
        )}

        <Form.Item
          name="reason"
          label="Reason"
          rules={[
            { required: true, message: 'Please provide a reason' },
            { min: 10, message: 'Reason must be at least 10 characters' },
          ]}
        >
          <TextArea
            rows={4}
            placeholder="Please provide a reason for your leave"
            maxLength={500}
            showCount
          />
        </Form.Item>

        {/* Display holidays */}
        {holidaysData?.holidays && holidaysData.holidays.length > 0 && (
          <>
            <Divider>Upcoming Holidays ({currentYear})</Divider>
            <Card size="small" style={{ maxHeight: '200px', overflow: 'auto' }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                {holidaysData.holidays
                  .filter((h) => dayjs(h.date).isAfter(dayjs()))
                  .slice(0, 10)
                  .map((holiday) => (
                    <div
                      key={holiday.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Text>{holiday.name}</Text>
                      <Tag color="red">
                        {dayjs(holiday.date).format('DD MMM YYYY (ddd)')}
                      </Tag>
                    </div>
                  ))}
              </Space>
            </Card>
          </>
        )}
      </Form>
    </Modal>
  );
};

export default ApplyLeaveModal;
