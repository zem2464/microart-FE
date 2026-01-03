import React, { useState, useEffect } from 'react';
import { Badge, Dropdown, List, Button, Typography, Empty, Spin, message as antMessage } from 'antd';
import { BellOutlined, CheckOutlined, DeleteOutlined, CloseOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useSubscription } from '@apollo/client';
import {
  GET_MY_NOTIFICATIONS,
  GET_UNREAD_NOTIFICATION_COUNT,
  MARK_NOTIFICATION_AS_READ,
  MARK_ALL_NOTIFICATIONS_AS_READ,
  DELETE_NOTIFICATION,
  DELETE_ALL_READ_NOTIFICATIONS,
  NOTIFICATION_CREATED_SUBSCRIPTION
} from '../graphql/notifications';
import { useNavigate } from 'react-router-dom';
import notificationService from '../services/NotificationService';
import { useAppDrawer } from '../contexts/DrawerContext';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Text } = Typography;

const NotificationDropdown = () => {
  const [open, setOpen] = useState(false);
  const [playSound, setPlaySound] = useState(true);
  const navigate = useNavigate();
  const { showProjectDetailDrawerV2 } = useAppDrawer();

  // Fetch notifications
  const { data, loading, refetch } = useQuery(GET_MY_NOTIFICATIONS, {
    variables: { limit: 20, onlyUnread: false },
    fetchPolicy: 'cache-and-network'
  });

  // Fetch unread count
  const { data: countData, refetch: refetchCount } = useQuery(GET_UNREAD_NOTIFICATION_COUNT, {
    fetchPolicy: 'cache-and-network',
    pollInterval: 30000 // Poll every 30 seconds
  });

  // Mutations
  const [markAsRead] = useMutation(MARK_NOTIFICATION_AS_READ);
  const [markAllAsRead] = useMutation(MARK_ALL_NOTIFICATIONS_AS_READ);
  const [deleteNotification] = useMutation(DELETE_NOTIFICATION);
  const [deleteAllRead] = useMutation(DELETE_ALL_READ_NOTIFICATIONS);

  // Subscribe to new notifications
  useSubscription(NOTIFICATION_CREATED_SUBSCRIPTION, {
    onData: ({ data: subData }) => {
      if (subData?.data?.notificationCreated) {
        const notification = subData.data.notificationCreated;
        
        // Skip message notifications - they're handled by ChatContext
        if (notification.type === 'message') {
          console.log('[NotificationDropdown] Skipping message notification, handled by ChatContext');
          refetch();
          refetchCount();
          return;
        }
        
        // Play sound based on notification type (for non-message notifications)
        if (playSound) {
          notificationService.playSoundByType(notification.type);
        }

        // Show browser notification if window is not focused
        if (document.hidden) {
          notificationService.showBrowserNotification({
            title: notification.title,
            body: notification.message,
            icon: '/logo192.png'
          });
        }

        // Force refetch to update the list immediately
        refetch();
        refetchCount();
      }
    },
    // Force subscription to update cache
    fetchPolicy: 'network-only'
  });

  const notifications = data?.myNotifications || [];
  const unreadCount = countData?.unreadNotificationCount || 0;

  const handleNotificationClick = async (notification) => {
    // Close dropdown first for better UX
    setOpen(false);

    // Mark as read immediately (even if already read, for consistency)
    try {
      await markAsRead({ 
        variables: { id: notification.id },
        // Optimistic response for instant UI update
        optimisticResponse: {
          markNotificationAsRead: {
            ...notification,
            isRead: true,
            readAt: new Date().toISOString(),
            __typename: 'Notification'
          }
        }
      });
      // Refetch to ensure UI is in sync
      refetch();
      refetchCount();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      // Continue with navigation even if mark-as-read fails
    }

    // Handle navigation based on notification type
    if (notification.type === 'assignment' && notification.metadata?.projectId) {
      // For task assignment notifications, open project drawer
      showProjectDetailDrawerV2(notification.metadata.projectId);
    } else if (notification.actionUrl) {
      // For other notifications, navigate to action URL
      navigate(notification.actionUrl);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      refetch();
      refetchCount();
      antMessage.success('All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      antMessage.error('Failed to mark all as read');
    }
  };

  const handleDelete = async (e, notificationId) => {
    e.stopPropagation();
    try {
      await deleteNotification({ variables: { id: notificationId } });
      refetch();
      refetchCount();
    } catch (error) {
      console.error('Failed to delete notification:', error);
      antMessage.error('Failed to delete notification');
    }
  };

  const handleClearAll = async () => {
    try {
      await deleteAllRead();
      refetch();
      refetchCount();
      antMessage.success('All read notifications cleared');
    } catch (error) {
      console.error('Failed to clear all notifications:', error);
      antMessage.error('Failed to clear all notifications');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'message':
        return '💬';
      case 'mention':
        return '@';
      case 'assignment':
        return '📋';
      case 'system':
        return '🔔';
      default:
        return '🔔';
    }
  };

  const dropdownContent = (
    <div style={{ 
      width: 380, 
      maxHeight: 500, 
      overflow: 'hidden', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      border: '1px solid #d9d9d9'
    }}>
      {/* Header */}
      <div style={{ 
        padding: '12px 16px', 
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fafafa'
      }}>
        <Text strong style={{ fontSize: 16 }}>
          Notifications {unreadCount > 0 && `(${unreadCount})`}
        </Text>
        <div style={{ display: 'flex', gap: 8 }}>
          {unreadCount > 0 && (
            <Button 
              type="link" 
              size="small" 
              icon={<CheckOutlined />}
              onClick={handleMarkAllAsRead}
              style={{ padding: '0 8px' }}
            >
              Read All
            </Button>
          )}
          {notifications.length > 0 && (
            <Button 
              type="link" 
              size="small" 
              icon={<DeleteOutlined />}
              onClick={handleClearAll}
              danger
              style={{ padding: '0 8px' }}
            >
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {loading && (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <Spin />
          </div>
        )}
        
        {!loading && notifications.length === 0 && (
          <Empty 
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No notifications"
            style={{ padding: '40px 0' }}
          />
        )}
        
        {!loading && notifications.length > 0 && (
          <List
            dataSource={notifications}
            renderItem={(notification) => (
              <List.Item
                key={notification.id}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  backgroundColor: notification.isRead ? 'transparent' : '#f0f7ff',
                  borderBottom: '1px solid #f0f0f0'
                }}
                onClick={() => handleNotificationClick(notification)}
              >
                <div style={{ width: '100%', display: 'flex', gap: 12 }}>
                  {/* Icon */}
                  <div style={{ fontSize: 20 }}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text strong style={{ fontSize: 13 }}>
                        {notification.title}
                      </Text>
                      <Button
                        type="text"
                        size="small"
                        icon={<CloseOutlined />}
                        onClick={(e) => handleDelete(e, notification.id)}
                        style={{ marginLeft: 8 }}
                      />
                    </div>
                    <Text 
                      style={{ 
                        fontSize: 12, 
                        color: '#666',
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {notification.message}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#999', display: 'block', marginTop: 4 }}>
                      {dayjs(notification.createdAt).fromNow()}
                    </Text>
                  </div>
                </div>
              </List.Item>
            )}
          />
        )}
      </div>
    </div>
  );

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      dropdownRender={() => dropdownContent}
      trigger={['click']}
      placement="bottomRight"
    >
      <div onClick={() => setOpen(!open)}>
        <Badge count={unreadCount} size="small" offset={[-5, 5]}>
          <Button 
            type="text" 
            icon={<BellOutlined style={{ fontSize: 18 }} />}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          />
        </Badge>
      </div>
    </Dropdown>
  );
};

export default NotificationDropdown;
