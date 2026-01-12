import { useEffect } from 'react';
import { useSubscription } from '@apollo/client';
import { message } from 'antd';
import { 
  PROJECT_UPDATED_SUBSCRIPTION,
  PROJECT_TASKS_UPDATED_SUBSCRIPTION
} from '../graphql/projectQueries';

/**
 * Custom hook for managing project-related subscriptions
 * @param {string} projectId - ID of the project to subscribe to
 * @param {Object} options - Configuration options
 * @param {Function} options.onProjectUpdated - Callback when project is updated
 * @param {Function} options.onProjectTasksUpdated - Callback when project's tasks are updated
 * @param {boolean} options.showNotifications - Whether to show toast notifications
 * @param {boolean} options.enabled - Whether subscriptions are enabled
 */
export const useProjectSubscriptions = (projectId, options = {}) => {
  const {
    onProjectUpdated,
    onProjectTasksUpdated,
    showNotifications = false, // Default false to avoid spam
    enabled = true
  } = options;

  // Project update subscription
  const { 
    data: projectUpdatedData,
    loading: projectUpdatedLoading,
    error: projectUpdatedError 
  } = useSubscription(PROJECT_UPDATED_SUBSCRIPTION, {
    variables: { projectId },
    skip: !enabled || !projectId,
    onData: ({ data }) => {
      if (data?.data?.projectUpdated) {
        const updatedProject = data.data.projectUpdated;
        
        if (showNotifications) {
          message.info(`Project "${updatedProject.projectCode}" was updated`);
        }
        
        onProjectUpdated?.(updatedProject);
      }
    },
    onError: (error) => {
      console.error('Project update subscription error:', error);
    }
  });

  // Project tasks update subscription
  const {
    data: projectTasksUpdatedData,
    loading: projectTasksUpdatedLoading,
    error: projectTasksUpdatedError
  } = useSubscription(PROJECT_TASKS_UPDATED_SUBSCRIPTION, {
    variables: { projectId },
    skip: !enabled || !projectId,
    onData: ({ data }) => {
      if (data?.data?.projectTasksUpdated) {
        const taskUpdate = data.data.projectTasksUpdated;
        
        if (showNotifications) {
          message.info(`Task in project was ${taskUpdate.updateType.toLowerCase()}`);
        }
        
        onProjectTasksUpdated?.(taskUpdate);
      }
    },
    onError: (error) => {
      console.error('Project tasks subscription error:', error);
    }
  });

  // Log subscription errors
  useEffect(() => {
    const errors = [
      projectUpdatedError,
      projectTasksUpdatedError
    ].filter(Boolean);

    if (errors.length > 0) {
      console.error('Project subscription errors:', errors);
      if (showNotifications) {
        message.error('Real-time updates may not be working properly');
      }
    }
  }, [projectUpdatedError, projectTasksUpdatedError, showNotifications]);

  return {
    loading: projectUpdatedLoading || projectTasksUpdatedLoading,
    errors: {
      projectUpdatedError,
      projectTasksUpdatedError
    }
  };
};
