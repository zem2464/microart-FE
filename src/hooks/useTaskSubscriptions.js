import { useEffect } from 'react';
import { useSubscription } from '@apollo/client';
import { message } from 'antd';
import { 
  TASK_UPDATED_SUBSCRIPTION,
  TASK_ASSIGNED_SUBSCRIPTION,
  TASK_STATUS_CHANGED_SUBSCRIPTION
} from '../gql/tasks';
import {
  TASK_COMMENT_ADDED_SUBSCRIPTION,
  TASK_COMMENT_UPDATED_SUBSCRIPTION,
  TASK_COMMENT_DELETED_SUBSCRIPTION
} from '../gql/taskComments';

/**
 * Custom hook for managing task-related subscriptions
 * @param {string} taskId - ID of the task to subscribe to
 * @param {string} assigneeId - ID of the assignee (optional, for assignment notifications)
 * @param {Object} options - Configuration options
 * @param {Function} options.onTaskUpdated - Callback when task is updated
 * @param {Function} options.onTaskAssigned - Callback when task is assigned
 * @param {Function} options.onTaskStatusChanged - Callback when task status changes
 * @param {Function} options.onCommentAdded - Callback when comment is added
 * @param {Function} options.onCommentUpdated - Callback when comment is updated
 * @param {Function} options.onCommentDeleted - Callback when comment is deleted
 * @param {boolean} options.showNotifications - Whether to show toast notifications
 * @param {boolean} options.enabled - Whether subscriptions are enabled
 */
export const useTaskSubscriptions = (taskId, assigneeId = null, options = {}) => {
  const {
    onTaskUpdated,
    onTaskAssigned,
    onTaskStatusChanged,
    onCommentAdded,
    onCommentUpdated,
    onCommentDeleted,
    showNotifications = true,
    enabled = true
  } = options;

  // Task update subscription
  const { 
    data: taskUpdatedData,
    loading: taskUpdatedLoading,
    error: taskUpdatedError 
  } = useSubscription(TASK_UPDATED_SUBSCRIPTION, {
    variables: { taskId },
    skip: !enabled || !taskId,
    onData: ({ data }) => {
      if (data?.data?.taskUpdated) {
        const updatedTask = data.data.taskUpdated;
        
        if (showNotifications) {
          message.info(`Task "${updatedTask.title}" was updated by another user`);
        }
        
        onTaskUpdated?.(updatedTask);
      }
    },
    onError: (error) => {
      console.error('Task update subscription error:', error);
    }
  });

  // Task assignment subscription
  const {
    data: taskAssignedData,
    loading: taskAssignedLoading,
    error: taskAssignedError
  } = useSubscription(TASK_ASSIGNED_SUBSCRIPTION, {
    variables: { assigneeId },
    skip: !enabled || !assigneeId,
    onData: ({ data }) => {
      if (data?.data?.taskAssigned) {
        const assignedTask = data.data.taskAssigned;
        
        if (showNotifications) {
          message.info(`You have been assigned to task "${assignedTask.title}"`);
        }
        
        onTaskAssigned?.(assignedTask);
      }
    },
    onError: (error) => {
      console.error('Task assignment subscription error:', error);
    }
  });

  // Task status change subscription
  const {
    data: taskStatusData,
    loading: taskStatusLoading,
    error: taskStatusError
  } = useSubscription(TASK_STATUS_CHANGED_SUBSCRIPTION, {
    variables: { taskId },
    skip: !enabled || !taskId,
    onData: ({ data }) => {
      if (data?.data?.taskStatusChanged) {
        const statusChangedTask = data.data.taskStatusChanged;
        
        if (showNotifications) {
          message.info(`Task "${statusChangedTask.title}" status changed to ${statusChangedTask.status}`);
        }
        
        onTaskStatusChanged?.(statusChangedTask);
      }
    },
    onError: (error) => {
      console.error('Task status subscription error:', error);
    }
  });

  // Comment added subscription
  const {
    data: commentAddedData,
    loading: commentAddedLoading,
    error: commentAddedError
  } = useSubscription(TASK_COMMENT_ADDED_SUBSCRIPTION, {
    variables: { taskId },
    skip: !enabled || !taskId,
    onData: ({ data }) => {
      if (data?.data?.taskCommentAdded) {
        const newComment = data.data.taskCommentAdded;
        
        if (showNotifications) {
          message.info(`New comment added by ${newComment.author?.firstName} ${newComment.author?.lastName}`);
        }
        
        onCommentAdded?.(newComment);
      }
    },
    onError: (error) => {
      console.error('Comment added subscription error:', error);
    }
  });

  // Comment updated subscription
  const {
    data: commentUpdatedData,
    loading: commentUpdatedLoading,
    error: commentUpdatedError
  } = useSubscription(TASK_COMMENT_UPDATED_SUBSCRIPTION, {
    variables: { taskId },
    skip: !enabled || !taskId,
    onData: ({ data }) => {
      if (data?.data?.taskCommentUpdated) {
        const updatedComment = data.data.taskCommentUpdated;
        
        if (showNotifications) {
          message.info('A comment was updated');
        }
        
        onCommentUpdated?.(updatedComment);
      }
    },
    onError: (error) => {
      console.error('Comment updated subscription error:', error);
    }
  });

  // Comment deleted subscription
  const {
    data: commentDeletedData,
    loading: commentDeletedLoading,
    error: commentDeletedError
  } = useSubscription(TASK_COMMENT_DELETED_SUBSCRIPTION, {
    variables: { taskId },
    skip: !enabled || !taskId,
    onData: ({ data }) => {
      if (data?.data?.taskCommentDeleted) {
        const deletedComment = data.data.taskCommentDeleted;
        
        if (showNotifications) {
          message.info('A comment was deleted');
        }
        
        onCommentDeleted?.(deletedComment);
      }
    },
    onError: (error) => {
      console.error('Comment deleted subscription error:', error);
    }
  });

  // Log subscription errors
  useEffect(() => {
    const errors = [
      taskUpdatedError,
      taskAssignedError,
      taskStatusError,
      commentAddedError,
      commentUpdatedError,
      commentDeletedError
    ].filter(Boolean);

    if (errors.length > 0) {
      console.error('Subscription errors:', errors);
      if (showNotifications) {
        message.error('Real-time updates may not be working properly');
      }
    }
  }, [
    taskUpdatedError,
    taskAssignedError,
    taskStatusError,
    commentAddedError,
    commentUpdatedError,
    commentDeletedError,
    showNotifications
  ]);

  return {
    // Loading states
    loading: {
      taskUpdated: taskUpdatedLoading,
      taskAssigned: taskAssignedLoading,
      taskStatus: taskStatusLoading,
      commentAdded: commentAddedLoading,
      commentUpdated: commentUpdatedLoading,
      commentDeleted: commentDeletedLoading
    },
    
    // Error states
    errors: {
      taskUpdated: taskUpdatedError,
      taskAssigned: taskAssignedError,
      taskStatus: taskStatusError,
      commentAdded: commentAddedError,
      commentUpdated: commentUpdatedError,
      commentDeleted: commentDeletedError
    },
    
    // Data
    data: {
      taskUpdated: taskUpdatedData?.taskUpdated,
      taskAssigned: taskAssignedData?.taskAssigned,
      taskStatus: taskStatusData?.taskStatusChanged,
      commentAdded: commentAddedData?.taskCommentAdded,
      commentUpdated: commentUpdatedData?.taskCommentUpdated,
      commentDeleted: commentDeletedData?.taskCommentDeleted
    },
    
    // Utility functions
    hasErrors: Object.values({
      taskUpdatedError,
      taskAssignedError,
      taskStatusError,
      commentAddedError,
      commentUpdatedError,
      commentDeletedError
    }).some(Boolean),
    
    isLoading: Object.values({
      taskUpdatedLoading,
      taskAssignedLoading,
      taskStatusLoading,
      commentAddedLoading,
      commentUpdatedLoading,
      commentDeletedLoading
    }).some(Boolean)
  };
};

/**
 * Simpler hook for just task updates
 */
export const useTaskUpdates = (taskId, options = {}) => {
  return useTaskSubscriptions(taskId, null, {
    ...options,
    onTaskAssigned: undefined, // Don't subscribe to assignments
  });
};

/**
 * Hook for comment subscriptions only
 */
export const useTaskCommentSubscriptions = (taskId, options = {}) => {
  return useTaskSubscriptions(taskId, null, {
    ...options,
    onTaskUpdated: undefined,
    onTaskAssigned: undefined,
    onTaskStatusChanged: undefined,
  });
};