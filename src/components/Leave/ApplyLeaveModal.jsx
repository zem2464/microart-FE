import React, { useState } from 'react';
import {
  Modal,
  Form,
  Input,
  DatePicker,
  TimePicker,
  Radio,
  InputNumber,
  Select,
  Space,
  message,
  Alert,
  Divider,
  Typography,
  Card,
  Tag,
  Empty,
  Checkbox,
} from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery } from '@apollo/client';
import { APPLY_LEAVE, GET_MY_LEAVES } from '../../graqhql/leave';
import { GET_HOLIDAYS } from '../../graqhql/holiday';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isBetween from 'dayjs/plugin/isBetween';

// Configure dayjs with IST timezone
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isBetween);
dayjs.tz.setDefault('Asia/Kolkata');

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

  // Get user's leaves to check for same-day short leaves
  const { data: myLeavesData } = useQuery(GET_MY_LEAVES, {
    variables: { 
      year: currentYear,
      page: 1,
      limit: 1000,
    },
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
        // Check total hours for the selected date
        const selectedDate = dayjs(values.shortLeaveDate);
        const myLeaves = myLeavesData?.myLeaves?.leaves || [];
        
        // Find all short leaves on the same date
        const sameDayLeaves = myLeaves.filter(leave => {
          if (leave.leaveType !== 'SHORT') return false;
          const leaveDate = dayjs(leave.startDate);
          return leaveDate.isSame(selectedDate, 'day');
        });

        // Calculate total hours already applied for this date
        const totalHoursOnDate = sameDayLeaves.reduce((sum, leave) => {
          return sum + (leave.hours || 0);
        }, 0);

        // Check if adding new leave would exceed 3.5 hours
        const newTotalHours = totalHoursOnDate + values.duration;
        if (newTotalHours > 3.5) {
          message.error(
            `Cannot apply. You already have ${totalHoursOnDate} hours of leave on this date. ` +
            `Adding ${values.duration} hours would exceed the 3.5-hour daily limit. ` +
            `You can apply for up to ${3.5 - totalHoursOnDate} more hours on this date.`
          );
          return;
        }

        // For short leave, use date with a static start time (9:00 AM)
        const shortLeaveDateValue = dayjs(values.shortLeaveDate);
        const startDateTime = shortLeaveDateValue
          .hour(9)
          .minute(0)
          .second(0);
        
        startDate = startDateTime.format('YYYY-MM-DD HH:mm:ss');
        endDate = startDateTime
          .add(values.duration, 'hour')
          .format('YYYY-MM-DD HH:mm:ss');
        hours = values.duration;
      } else {
        // For long leave
        if (durationType === 'HALF_DAY') {
          // For half day, use single date
          const date = dayjs(values.dateRange);
          startDate = date.hour(9).minute(0).second(0).format('YYYY-MM-DD HH:mm:ss');
          endDate = date.hour(13).minute(0).second(0).format('YYYY-MM-DD HH:mm:ss');
        } else {
          // For full day, use date range
          const [start, end] = Array.isArray(values.dateRange) 
            ? values.dateRange 
            : [values.dateRange, values.dateRange];
          // Use start of day for start date and end of day for end date
          const startDayjs = dayjs(start);
          const endDayjs = dayjs(end);
          startDate = startDayjs.startOf('day').format('YYYY-MM-DD HH:mm:ss');
          // For end date, use the same day at 23:59:59 to keep it within the same day
          endDate = endDayjs.hour(23).minute(59).second(59).format('YYYY-MM-DD HH:mm:ss');
        }
      }

      const input = {
        leaveType,
        durationType,
        startDate,
        endDate,
        hours,
        reason: values.reason,
        isPositiveLeave: values.isPositiveLeave || false,
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

            <Form.Item
              name="shortLeaveDate"
              label="Date"
              rules={[{ required: true, message: 'Please select date' }]}
              initialValue={dayjs()}
            >
              <DatePicker
                format="DD MMM YYYY"
                style={{ width: '100%' }}
                disabledDate={disabledDate}
              />
            </Form.Item>

            <Form.Item
              name="duration"
              label="Duration"
              rules={[
                { required: true, message: 'Please select duration' },
              ]}
            >
              <Select
                placeholder="Select duration"
                style={{ width: '100%' }}
                options={[
                  { label: '15 minutes', value: 0.25 },
                  { label: '30 minutes', value: 0.5 },
                  { label: '45 minutes', value: 0.75 },
                  { label: '1 hour', value: 1 },
                  { label: '1.5 hours', value: 1.5 },
                  { label: '2 hours', value: 2 },
                  { label: '2.5 hours', value: 2.5 },
                  { label: '3 hours', value: 3 },
                  { label: '3.5 hours', value: 3.5 },
                ]}
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
                initialValue={dayjs()}
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
                initialValue={[dayjs(), dayjs()]}
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

        <Form.Item
          name="isPositiveLeave"
          valuePropName="checked"
        >
          <Checkbox>
            <Space>
              <InfoCircleOutlined />
              <Text>Positive Leave</Text>
            </Space>
          </Checkbox>
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
