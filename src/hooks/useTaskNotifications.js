import { useEffect } from 'react';
import { useSubscription, useReactiveVar } from '@apollo/client';
import { NOTIFICATION_CREATED_SUBSCRIPTION } from '../graphql/notifications';
import { userCacheVar } from '../cache/userCacheVar';
import notificationService from '../services/NotificationService';
import { useAppDrawer } from '../contexts/DrawerContext';

/**
 * Hook to listen for task assignment notifications and display them
 * Also handles navigation to project detail drawer on notification click
 */
export const useTaskNotifications = () => {
  const user = useReactiveVar(userCacheVar);
  const { showProjectDetailDrawerV2 } = useAppDrawer();
  
  // Subscribe to notification events for the current user
  const { data: notificationData } = useSubscription(NOTIFICATION_CREATED_SUBSCRIPTION, {
    skip: !user,
    onData: ({ data }) => {
      const notification = data?.data?.notificationCreated;
      if (!notification) return;
      
      // Handle task assignment notifications
      if (notification.type === 'assignment') {
        notificationService.playTaskSound();
        
        notificationService.showTaskNotification({
          title: notification.title,
          message: notification.message,
          projectId: notification.metadata?.projectId,
          onNavigate: (projectId) => {
            // Open project detail drawer when notification is clicked
            showProjectDetailDrawerV2(projectId);
          }
        });
        
        // Show browser notification if tab is not visible
        if (document.hidden) {
          notificationService.showBrowserNotification({
            title: notification.title,
            body: notification.message,
            icon: '/logo192.png'
          });
        }
      }
    },
    onError: (error) => {
      console.error('Notification subscription error:', error);
    }
  });

  return {
    notification: notificationData?.notificationCreated
  };
};
