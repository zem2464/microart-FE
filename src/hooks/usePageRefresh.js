/**
 * usePageRefresh - Custom hook for managing page-level data refreshes
 * 
 * This hook provides a robust pattern for pages to refresh their data
 * when relevant mutations occur anywhere in the app.
 * 
 * Usage:
 * const { refetchProjects, refetchTasks } = usePageRefresh();
 * 
 * It automatically:
 * - Subscribes to cache invalidation events
 * - Calls refetch functions at the right time
 * - Handles cleanup on unmount
 * - Prevents duplicate/race condition refetches with debouncing
 */

import { useEffect, useRef, useCallback } from 'react';
import { useCacheInvalidation } from '../apolloClient/cacheInvalidationStrategy';
import cacheInvalidationManager from '../apolloClient/cacheInvalidationStrategy';

const REFETCH_DELAY = 500; // ms - debounce rapid refetches
const EMPTY_REFETCH_FUNCTIONS = Object.freeze({});
const EMPTY_SUBSCRIPTION_EVENTS = Object.freeze({});

/**
 * Hook for managing page-level data refreshes
 * @param {Object} refetchFunctions - Object with refetch functions: { refetchProjects, refetchTasks, etc. }
 * @param {Object} subscriptionEvents - Events to subscribe to: { projectEvents: [...], taskEvents: [...] }
 */
export function usePageRefresh(
  refetchFunctions = EMPTY_REFETCH_FUNCTIONS,
  subscriptionEvents = EMPTY_SUBSCRIPTION_EVENTS
) {
  const { onEvent, EVENTS } = useCacheInvalidation();
  const unsubscribersRef = useRef([]);
  const refetchTimeoutsRef = useRef({});
  const effectiveRefetchFunctions = refetchFunctions || EMPTY_REFETCH_FUNCTIONS;
  const effectiveSubscriptionEvents =
    subscriptionEvents || EMPTY_SUBSCRIPTION_EVENTS;

  /**
   * Setup debounced refetch to prevent race conditions
   */
  const setupDebouncedRefetch = useCallback((refetchName, refetchFn) => {
    return () => {
      // Clear pending refetch
      if (refetchTimeoutsRef.current[refetchName]) {
        clearTimeout(refetchTimeoutsRef.current[refetchName]);
      }

      // Schedule new refetch with delay
      refetchTimeoutsRef.current[refetchName] = setTimeout(async () => {
        try {
          console.log(`[usePageRefresh] Executing refetch: ${refetchName}`);
          if (typeof refetchFn === 'function') {
            await refetchFn();
          }
        } catch (error) {
          console.error(`[usePageRefresh] Error in ${refetchName}:`, error);
        }
        delete refetchTimeoutsRef.current[refetchName];
      }, REFETCH_DELAY);
    };
  }, []);

  /**
   * Subscribe to events and trigger refetches
   */
  useEffect(() => {
    // Default subscriptions if not provided
    const defaultProjectEvents = [
      EVENTS.PROJECT_CREATED,
      EVENTS.PROJECT_UPDATED,
      EVENTS.PROJECT_DELETED,
    ];

    const defaultTaskEvents = [
      EVENTS.TASK_CREATED,
      EVENTS.TASK_UPDATED,
      EVENTS.TASK_STATUS_CHANGED,
      EVENTS.TASK_ASSIGNMENT_CHANGED,
      EVENTS.TASKS_BULK_UPDATED,
    ];

    // Setup project refetch
    if (effectiveRefetchFunctions.refetchProjects) {
      const projectsRefetch = setupDebouncedRefetch(
        'projects',
        effectiveRefetchFunctions.refetchProjects
      );

      const projectEventList =
        effectiveSubscriptionEvents.projectEvents || defaultProjectEvents;
      projectEventList.forEach(event => {
        const unsubscribe = onEvent(event, projectsRefetch);
        unsubscribersRef.current.push(unsubscribe);
      });
    }

    // Setup task refetch
    if (effectiveRefetchFunctions.refetchTasks) {
      const tasksRefetch = setupDebouncedRefetch(
        'tasks',
        effectiveRefetchFunctions.refetchTasks
      );

      const taskEventList =
        effectiveSubscriptionEvents.taskEvents || defaultTaskEvents;
      taskEventList.forEach(event => {
        const unsubscribe = onEvent(event, tasksRefetch);
        unsubscribersRef.current.push(unsubscribe);
      });
    }

    // Setup generic all-data refetch
    if (effectiveRefetchFunctions.refetchAll) {
      const allRefetch = setupDebouncedRefetch(
        'all',
        effectiveRefetchFunctions.refetchAll
      );

      const unsubscribe = onEvent(EVENTS.REFRESH_ALL_DATA, allRefetch);
      unsubscribersRef.current.push(unsubscribe);
    }

    // Cleanup on unmount
    return () => {
      // Clear all timeouts
      Object.values(refetchTimeoutsRef.current).forEach(timeout => {
        clearTimeout(timeout);
      });
      refetchTimeoutsRef.current = {};

      // Unsubscribe from all events
      unsubscribersRef.current.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
      unsubscribersRef.current = [];
    };
  }, [
    effectiveRefetchFunctions,
    effectiveSubscriptionEvents,
    onEvent,
    setupDebouncedRefetch,
    EVENTS,
  ]);

  return {
    triggerProjectRefresh: () => {
      cacheInvalidationManager.publishEvent(EVENTS.PROJECT_UPDATED, {});
    },
    triggerTaskRefresh: () => {
      cacheInvalidationManager.publishEvent(EVENTS.TASK_UPDATED, {});
    },
    triggerAllRefresh: () => {
      cacheInvalidationManager.publishEvent(EVENTS.REFRESH_ALL_DATA, {});
    },
  };
}

export default usePageRefresh;
