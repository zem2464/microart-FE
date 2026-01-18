/**
 * Global Cache Invalidation Strategy
 * 
 * This module provides a centralized approach to handle Apollo Client cache invalidation
 * across different pages and components. Instead of relying on individual refetchQueries
 * (which can have cache key mismatches), we implement a robust pub/sub pattern combined
 * with direct refetch callbacks.
 * 
 * Architecture:
 * 1. Mutation Cache Invalidation Events - Published when mutations complete
 * 2. Global Refetch Callbacks - Subscribed by pages that need live updates
 * 3. Cache Key Normalization - Ensures all queries use consistent variables
 */

import { EventEmitter } from 'events';

// Create a global event emitter for cache invalidation
class CacheInvalidationManager extends EventEmitter {
  constructor() {
    super();
    this.maxListeners = 100; // Support many subscribers
    
    // Register all cache invalidation events
    this.EVENTS = {
      // Project events
      PROJECT_CREATED: 'project:created',
      PROJECT_UPDATED: 'project:updated',
      PROJECT_DELETED: 'project:deleted',
      
      // Task events
      TASK_CREATED: 'task:created',
      TASK_UPDATED: 'task:updated',
      TASK_STATUS_CHANGED: 'task:status_changed',
      TASK_ASSIGNMENT_CHANGED: 'task:assignment_changed',
      TASK_DELETED: 'task:deleted',
      
      // Bulk operations
      TASKS_BULK_UPDATED: 'tasks:bulk_updated',
      
      // Generic refresh all
      REFRESH_ALL_DATA: 'refresh:all',
    };
  }

  /**
   * Publish cache invalidation event
   * Called when mutations complete successfully
   */
  publishEvent(eventType, payload = {}) {
    console.log(`[CacheInvalidation] Publishing ${eventType}`, payload);
    this.emit(eventType, payload);
    // Also broadcast via DOM CustomEvent to bridge any duplicated module instances
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      try {
        window.dispatchEvent(new CustomEvent(eventType, { detail: payload }));
      } catch (err) {
        // Swallow errors from invalid event names in environments that disallow them
      }
    }
  }

  /**
   * Subscribe to specific cache invalidation event
   * Returns unsubscribe function for cleanup
   */
  onEvent(eventType, callback) {
    this.on(eventType, callback);
    
    // Return unsubscribe function
    return () => {
      this.removeListener(eventType, callback);
    };
  }

  /**
   * Subscribe to multiple events
   */
  onMultipleEvents(eventTypes, callback) {
    const unsubscribers = eventTypes.map(
      eventType => this.onEvent(eventType, callback)
    );

    // Return combined unsubscribe function
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }

  /**
   * Clear all listeners (useful for testing/cleanup)
   */
  clearAllListeners() {
    this.removeAllListeners();
  }
}

// Export singleton instance
export const cacheInvalidationManager = new CacheInvalidationManager();

/**
 * Hook for using cache invalidation in React components
 */
export function useCacheInvalidation() {
  return {
    publishEvent: (eventType, payload) => 
      cacheInvalidationManager.publishEvent(eventType, payload),
    onEvent: (eventType, callback) => 
      cacheInvalidationManager.onEvent(eventType, callback),
    onMultipleEvents: (eventTypes, callback) =>
      cacheInvalidationManager.onMultipleEvents(eventTypes, callback),
    EVENTS: cacheInvalidationManager.EVENTS,
  };
}

export default cacheInvalidationManager;
