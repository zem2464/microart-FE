import React, { useState, useMemo } from 'react';
import { Modal, Descriptions, Tag, Avatar, Button, Space, Tooltip } from 'antd';
import { UserOutlined, ClockCircleOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isBetween from 'dayjs/plugin/isBetween';

// Configure dayjs with IST timezone
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isBetween);
dayjs.tz.setDefault('Asia/Kolkata');

const localizer = momentLocalizer(moment);

// Helper to extract date from ISO string without timezone conversion
const getDateOnly = (isoString) => {
  if (!isoString) return null;
  return isoString.split('T')[0];
};

const LeaveCalendar = ({ leaves = [], holidays = [] }) => {
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Get event color based on leave type and status
  const getEventColor = (event) => {
    // Holiday events
    if (event.type === 'holiday') {
      return '#722ed1'; // Purple for holidays
    }
    
    // Positive leave gets green color
    if (event.isPositiveLeave) {
      return '#52c41a'; // Green for positive leave
    }
    
    // Regular leaves get orange color
    return '#faad14'; // Orange for regular leave
  };

  // Convert leaves to calendar events
  const events = useMemo(() => {
    // Create leave events
    const leaveEvents = leaves.map(leave => {
      const displayName = leave.user
        ? `${leave.user.firstName} ${leave.user.lastName}`
        : 'Unknown';
      
      // Parse dates in UTC to get the actual stored date
      const startDate = dayjs.utc(leave.startDate);
      const endDate = dayjs.utc(leave.endDate);
      
      // Extract date-only strings in UTC (the actual stored dates)
      const startDateStr = startDate.format('YYYY-MM-DD');
      const endDateStr = endDate.format('YYYY-MM-DD');
      
      const totalDays = endDate.diff(startDate, 'day') + 1;
      
      let leaveType = '';
      if (leave.leaveType === 'SHORT') {
        leaveType = `Short (${leave.hours}h)`;
      } else {
        leaveType = leave.durationType === 'FULL_DAY' ? 'Full Day' : 'Half Day';
      }

      // For short leaves (< 4 hours), show as half-day all-day event
      if (leave.leaveType === 'SHORT' && leave.hours < 4) {
        const sameDay = startDate.startOf('day');
        return {
          id: leave.id,
          title: `${displayName} - ${leaveType}`,
          start: new Date(startDateStr),
          end: new Date(startDateStr),
          resource: leave,
          allDay: true,
        };
      }

      // For longer short leaves (>= 4 hours), use actual start/end times in IST
      if (leave.leaveType === 'SHORT') {
        return {
          id: leave.id,
          title: `${displayName} - ${leaveType}`,
          start: dayjs(leave.startDate).toDate(),
          end: dayjs(leave.endDate).toDate(),
          resource: leave,
          allDay: false,
        };
      }

      // For full/half day leaves, use all-day events
      // Create local Date objects to avoid timezone issues with React Big Calendar
      const startDateParts = startDateStr.split('-');
      const endDateParts = endDateStr.split('-');
      
      const startLocalDate = new Date(
        parseInt(startDateParts[0]), 
        parseInt(startDateParts[1]) - 1, 
        parseInt(startDateParts[2])
      );
      
      let calendarEndDate;
      if (totalDays === 1) {
        // Single day leave - end date should be same as start date for calendar
        calendarEndDate = startLocalDate;
      } else {
        // Multi-day leaves - add 1 day to end date for React Big Calendar's exclusive end
        calendarEndDate = new Date(
          parseInt(endDateParts[0]), 
          parseInt(endDateParts[1]) - 1, 
          parseInt(endDateParts[2]) + 1
        );
      }

      return {
        id: leave.id,
        title: `${displayName} - ${leaveType}`,
        start: startLocalDate,
        end: calendarEndDate,
        resource: leave,
        allDay: true,
      };
    });

    // Create holiday events
    const holidayEvents = holidays.map(holiday => ({
      id: `holiday-${holiday.id}`,
      title: holiday.name,
      start: new Date(holiday.date),
      end: new Date(holiday.date),
      resource: { type: 'holiday', ...holiday },
      allDay: true,
    }));

    return [...leaveEvents, ...holidayEvents];
  }, [leaves, holidays]);

  // Handle event selection
  const handleSelectEvent = (event) => {
    // Don't open modal for holidays
    if (event.resource.type === 'holiday') {
      return;
    }
    setSelectedLeave(event.resource);
    setModalVisible(true);
  };

  // Custom event component for half-width short leaves
  const CustomEvent = ({ event }) => {
    const resource = event.resource;
    
    // Handle holiday events
    if (resource.type === 'holiday') {
      const tooltipContent = (
        <div style={{ maxWidth: '300px' }}>
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>{resource.name}</div>
          {resource.description && (
            <div style={{ fontSize: '12px' }}>{resource.description}</div>
          )}
          <div style={{ fontSize: '12px', marginTop: '4px' }}>
            <strong>Date:</strong> {dayjs(resource.date).format('MMM D, YYYY')}
          </div>
        </div>
      );

      return (
        <Tooltip title={tooltipContent} placement="top">
          <div style={{ 
            height: '100%', 
            display: 'flex', 
            alignItems: 'center',
            fontSize: '11px',
            fontWeight: 500,
            padding: '0 4px'
          }}>
            {resource.name}
          </div>
        </Tooltip>
      );
    }

    // Handle leave events
    const leave = resource;
    const displayName = leave.user
      ? `${leave.user.firstName} ${leave.user.lastName}`
      : 'Unknown';
    
    // Parse dates based on leave type
    const startDate = leave.leaveType === 'SHORT' 
      ? dayjs(leave.startDate) 
      : dayjs.utc(leave.startDate);
    const endDate = leave.leaveType === 'SHORT' 
      ? dayjs(leave.endDate) 
      : dayjs.utc(leave.endDate);
    const totalDays = endDate.diff(startDate, 'day') + 1;
    
    let leaveType = '';
    if (leave.leaveType === 'SHORT') {
      leaveType = `Short Leave - ${leave.hours} hour(s)`;
    } else {
      leaveType = leave.durationType === 'FULL_DAY' ? 'Full Day' : 'Half Day';
    }
    
    const statusText = leave.status.replace('_', ' ');
    
    const tooltipContent = (
      <div style={{ maxWidth: '300px' }}>
        <div style={{ fontWeight: 600, marginBottom: '4px' }}>{displayName}</div>
        <div style={{ fontSize: '12px' }}>
          <div><strong>Type:</strong> {leaveType}</div>
          <div><strong>Status:</strong> {statusText}</div>
          <div>
            <strong>Date:</strong> {startDate.format('MMM D, YYYY')}
            {totalDays > 1 ? ` - ${endDate.format('MMM D, YYYY')}` : ''}
          </div>
          {totalDays > 1 && <div><strong>Duration:</strong> {totalDays} day(s)</div>}
          {leave.reason && <div><strong>Reason:</strong> {leave.reason}</div>}
          {leave.isPositiveLeave && <div style={{ color: '#13c2c2' }}><strong>✓ Positive Leave</strong></div>}
        </div>
      </div>
    );
    
    return (
      <Tooltip title={tooltipContent} placement="top">
        <div
          style={{
            width: '100%',
            height: '100%',
            padding: '2px 4px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          {leave.isPositiveLeave && (
            <span style={{ 
              display: 'inline-block',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#fff',
              flexShrink: 0,
              border: '1px solid rgba(255,255,255,0.8)',
              boxShadow: '0 0 0 1px rgba(0,0,0,0.1)'
            }} />
          )}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {event.title}
          </span>
        </div>
      </Tooltip>
    );
  };

  // Custom event style
  const eventStyleGetter = (event) => {
    const resource = event.resource;
    const color = getEventColor(resource);
    
    // Holiday styling - full width
    if (resource.type === 'holiday') {
      return {
        style: {
          backgroundColor: color,
          borderRadius: '4px',
          opacity: 0.85,
          color: 'white',
          border: '0px',
          display: 'block',
          fontSize: '12px',
          fontWeight: 500,
          width: '100%',
          maxWidth: '100%',
        }
      };
    }
    
    const leave = resource;
    
    // Determine width based on leave type
    let width = '100%'; // Default for full day
    
    if (leave.leaveType === 'SHORT' && leave.hours < 4) {
      width = '25%'; // Short leave gets 25% width
    } else if (leave.durationType === 'HALF_DAY') {
      width = '50%'; // Half day gets 50% width
    }
    
    return {
      style: {
        backgroundColor: color,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '12px',
        fontWeight: 500,
        width: width,
        maxWidth: width,
      }
    };
  };

  const getStatusTag = (status) => {
    const statusConfig = {
      PENDING: { color: 'orange', text: 'Pending' },
      APPROVED: { color: 'green', text: 'Approved' },
      REJECTED: { color: 'red', text: 'Rejected' },
      AUTO_APPROVED: { color: 'blue', text: 'Auto Approved' },
    };

    const config = statusConfig[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const getLeaveTypeTag = (leaveType, durationType, hours) => {
    if (leaveType === 'SHORT') {
      return (
        <Tag color="blue" icon={<ClockCircleOutlined />}>
          Short Leave ({hours}h)
        </Tag>
      );
    }
    
    const durationText = durationType === 'FULL_DAY' ? 'Full Day' : 'Half Day';
    return <Tag color="purple">{durationText}</Tag>;
  };

  // Custom toolbar
  const CustomToolbar = (toolbar) => {
    const goToBack = () => {
      toolbar.onNavigate('PREV');
    };

    const goToNext = () => {
      toolbar.onNavigate('NEXT');
    };

    const goToToday = () => {
      toolbar.onNavigate('TODAY');
    };

    const label = () => {
      const date = moment(toolbar.date);
      return (
        <span style={{ fontSize: '18px', fontWeight: 600 }}>
          {date.format('MMMM YYYY')}
        </span>
      );
    };

    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '16px',
        padding: '8px 0'
      }}>
        <Space>
          <Button onClick={goToToday}>Today</Button>
          <Button icon={<LeftOutlined />} onClick={goToBack} />
          <Button icon={<RightOutlined />} onClick={goToNext} />
        </Space>
        <div>{label()}</div>
        <div style={{ width: '200px' }}></div>
      </div>
    );
  };

  return (
    <>
      <style>{`
        .rbc-date-cell {
          text-align: center !important;
        }
        .rbc-date-cell .rbc-button-link {
          display: flex;
          justify-content: center;
          align-items: center;
          text-align: center;
          padding: 8px !important;
          margin: 0 !important;
          width: 100%;
        }
      `}</style>
      
      {/* Legend */}
      <div style={{ 
        background: '#fff', 
        padding: '16px', 
        borderRadius: '8px', 
        marginBottom: '16px',
        border: '1px solid #f0f0f0'
      }}>
        <div style={{ fontWeight: 600, marginBottom: '12px', fontSize: '14px' }}>
          Legend
        </div>
        <Space size="large" wrap>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              width: '24px', 
              height: '14px', 
              backgroundColor: '#722ed1', 
              borderRadius: '3px',
              opacity: 0.85
            }} />
            <span style={{ fontSize: '13px' }}>Holidays</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              width: '24px', 
              height: '14px', 
              backgroundColor: '#52c41a', 
              borderRadius: '3px',
              opacity: 0.9
            }} />
            <span style={{ fontSize: '13px' }}>Positive Leave</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              width: '24px', 
              height: '14px', 
              backgroundColor: '#faad14', 
              borderRadius: '3px',
              opacity: 0.9
            }} />
            <span style={{ fontSize: '13px' }}>Regular Leave</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              width: '24px', 
              height: '14px', 
              backgroundColor: '#1890ff', 
              borderRadius: '3px',
              opacity: 0.9,
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                backgroundColor: '#fff',
                border: '1px solid rgba(255,255,255,0.8)'
              }} />
            </div>
            <span style={{ fontSize: '13px' }}>Full Day</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              width: '12px', 
              height: '14px', 
              backgroundColor: '#faad14', 
              borderRadius: '3px',
              opacity: 0.9
            }} />
            <span style={{ fontSize: '13px' }}>Half Day</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              width: '6px', 
              height: '14px', 
              backgroundColor: '#faad14', 
              borderRadius: '3px',
              opacity: 0.9
            }} />
            <span style={{ fontSize: '13px' }}>Short Leave (&lt;4h)</span>
          </div>
        </Space>
      </div>

      <div style={{ height: '700px', background: '#fff', padding: '16px', borderRadius: '8px' }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventStyleGetter}
          views={['month', 'day', 'agenda']}
          defaultView="month"
          components={{
            toolbar: CustomToolbar,
            event: CustomEvent
          }}
          popup
          step={60}
          showMultiDayTimes
        />
      </div>

      <Modal
        title={selectedLeave?.user ? `${selectedLeave.user.firstName} ${selectedLeave.user.lastName}'s Leave` : 'Leave Details'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={700}
      >
        {selectedLeave && (
          <div 
            style={{ 
              padding: '16px', 
              border: '1px solid #f0f0f0', 
              borderRadius: '8px',
              background: '#fafafa',
              borderLeft: `4px solid ${getEventColor(selectedLeave)}`
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
              <Avatar 
                icon={<UserOutlined />} 
                size={48}
                style={{ marginRight: '12px', backgroundColor: '#1890ff' }}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: '18px' }}>
                  {selectedLeave.user ? `${selectedLeave.user.firstName} ${selectedLeave.user.lastName}` : 'Unknown User'}
                </div>
                <div style={{ fontSize: '13px', color: '#888' }}>
                  {selectedLeave.user?.email}
                </div>
              </div>
            </div>

            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="Status">
                {getStatusTag(selectedLeave.status)}
              </Descriptions.Item>
              <Descriptions.Item label="Type">
                {getLeaveTypeTag(selectedLeave.leaveType, selectedLeave.durationType, selectedLeave.hours)}
              </Descriptions.Item>
              <Descriptions.Item label="Start Date">
                {selectedLeave.leaveType === 'SHORT'
                  ? dayjs(selectedLeave.startDate).format('MMM D, YYYY HH:mm')
                  : dayjs.utc(selectedLeave.startDate).format('MMM D, YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="End Date">
                {selectedLeave.leaveType === 'SHORT'
                  ? dayjs(selectedLeave.endDate).format('MMM D, YYYY HH:mm')
                  : dayjs.utc(selectedLeave.endDate).format('MMM D, YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="Duration" span={2}>
                <Tag color="blue">
                  {dayjs(selectedLeave.endDate).diff(dayjs(selectedLeave.startDate), 'day') + 1} day(s)
                </Tag>
              </Descriptions.Item>
              {selectedLeave.reason && (
                <Descriptions.Item label="Reason" span={2}>
                  {selectedLeave.reason}
                </Descriptions.Item>
              )}
              {selectedLeave.approver && (
                <Descriptions.Item label="Approved By" span={2}>
                  {`${selectedLeave.approver.firstName} ${selectedLeave.approver.lastName}`}
                  {selectedLeave.approvedAt && ` on ${dayjs(selectedLeave.approvedAt).format('MMM D, YYYY')}`}
                </Descriptions.Item>
              )}
              {selectedLeave.rejectionReason && (
                <Descriptions.Item label="Rejection Reason" span={2}>
                  {selectedLeave.rejectionReason}
                </Descriptions.Item>
              )}
              {selectedLeave.isBackDated && (
                <Descriptions.Item label="Back Dated" span={2}>
                  <Tag color="orange">Yes</Tag>
                </Descriptions.Item>
              )}
            </Descriptions>
          </div>
        )}
      </Modal>
    </>
  );
};

export default LeaveCalendar;
