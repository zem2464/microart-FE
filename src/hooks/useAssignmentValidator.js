/**
 * useAssignmentValidator Hook
 * 
 * Provides robust validation for task assignments in ProjectForm
 * Validates user existence, permissions, and assignment structure
 */

import { useCallback } from 'react';

export const useAssignmentValidator = () => {
  /**
   * Validate that assignee exists in available users
   */
  const validateAssigneeExists = useCallback((assigneeId, availableUsers) => {
    if (!assigneeId) {
      // null is valid (unassigned)
      return { valid: true, assigneeId: null };
    }

    const user = availableUsers.find(u => u.id === assigneeId);
    if (!user) {
      return {
        valid: false,
        error: `User with ID "${assigneeId}" not found in available users`,
        assigneeId
      };
    }

    return { valid: true, assigneeId, user };
  }, []);

  /**
   * Validate assignment change from old to new
   */
  const validateAssignmentChange = useCallback((
    taskId,
    oldAssigneeId,
    newAssigneeId,
    availableUsers,
    projectTasks = []
  ) => {
    const errors = [];
    const warnings = [];

    // Check if task exists
    const task = projectTasks.find(t => t.id === taskId);
    if (!task) {
      errors.push(`Task with ID "${taskId}" not found`);
      return { valid: false, errors, warnings };
    }

    // Validate new assignee if provided
    if (newAssigneeId) {
      const userValidation = validateAssigneeExists(newAssigneeId, availableUsers);
      if (!userValidation.valid) {
        errors.push(userValidation.error);
      }
    }

    // Warning: Assigning to same user
    if (oldAssigneeId === newAssigneeId && newAssigneeId !== null) {
      warnings.push(`Assignee unchanged (still assigned to ${
        availableUsers.find(u => u.id === newAssigneeId)?.firstName
      })`);
    }

    // Warning: Unassigning (removing assignee)
    if (oldAssigneeId && !newAssigneeId) {
      const oldUser = availableUsers.find(u => u.id === oldAssigneeId);
      warnings.push(`Task will be unassigned from ${oldUser?.firstName || 'user'}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }, [validateAssigneeExists]);

  /**
   * Validate all assignments in projectTasks array
   * Returns comprehensive validation report
   */
  const validateAllAssignments = useCallback((projectTasks, availableUsers) => {
    const report = {
      valid: true,
      totalTasks: projectTasks.length,
      assignedTasks: 0,
      unassignedTasks: 0,
      invalidAssignments: [],
      validAssignments: [],
      errors: []
    };

    projectTasks.forEach((task, index) => {
      const assigneeId = task.assigneeId;

      if (!assigneeId) {
        report.unassignedTasks++;
        report.validAssignments.push({
          taskId: task.id,
          taskName: task.name || task.title,
          status: 'unassigned'
        });
      } else {
        const validation = validateAssigneeExists(assigneeId, availableUsers);

        if (validation.valid) {
          report.assignedTasks++;
          report.validAssignments.push({
            taskId: task.id,
            taskName: task.name || task.title,
            assigneeId,
            assigneeName: `${validation.user.firstName} ${validation.user.lastName}`.trim(),
            status: 'valid'
          });
        } else {
          report.valid = false;
          report.invalidAssignments.push({
            taskId: task.id,
            taskName: task.name || task.title,
            assigneeId,
            error: validation.error
          });
          report.errors.push(
            `Task "${task.name || task.title}": ${validation.error}`
          );
        }
      }
    });

    return report;
  }, [validateAssigneeExists]);

  /**
   * Get formatted error message for UI display
   */
  const formatValidationError = useCallback((validation) => {
    if (validation.valid) {
      return null;
    }

    if (Array.isArray(validation.errors)) {
      return validation.errors.join('\n');
    }

    return validation.error || 'Validation failed';
  }, []);

  /**
   * Get formatted assignment summary for review
   */
  const getAssignmentSummary = useCallback((projectTasks, availableUsers) => {
    const report = validateAllAssignments(projectTasks, availableUsers);

    const lines = [
      `📋 Assignment Summary`,
      `Total Tasks: ${report.totalTasks}`,
      `✅ Assigned: ${report.assignedTasks}`,
      `⏳ Unassigned: ${report.unassignedTasks}`
    ];

    if (report.invalidAssignments.length > 0) {
      lines.push(`❌ Invalid: ${report.invalidAssignments.length}`);
      report.invalidAssignments.forEach(inv => {
        lines.push(`  - ${inv.taskName}: ${inv.error}`);
      });
    }

    return lines.join('\n');
  }, [validateAllAssignments]);

  /**
   * Get list of users that are not assigned to any task
   */
  const getUnusedUsers = useCallback((projectTasks, availableUsers) => {
    const assignedUserIds = new Set(
      projectTasks
        .filter(t => t.assigneeId)
        .map(t => t.assigneeId)
    );

    return availableUsers.filter(u => !assignedUserIds.has(u.id));
  }, []);

  /**
   * Get assignment statistics
   */
  const getAssignmentStats = useCallback((projectTasks, availableUsers) => {
    const stats = {
      totalTasks: projectTasks.length,
      assignedTasks: 0,
      unassignedTasks: 0,
      usersUsed: 0,
      usersUnused: 0,
      assignmentsByUser: {} // { userId: taskCount }
    };

    projectTasks.forEach(task => {
      if (task.assigneeId) {
        stats.assignedTasks++;
        const userId = task.assigneeId;
        stats.assignmentsByUser[userId] = (stats.assignmentsByUser[userId] || 0) + 1;
      } else {
        stats.unassignedTasks++;
      }
    });

    stats.usersUsed = Object.keys(stats.assignmentsByUser).length;
    stats.usersUnused = availableUsers.length - stats.usersUsed;

    return stats;
  }, []);

  /**
   * Build assignment validation context for component updates
   */
  const buildValidationContext = useCallback((projectTasks, availableUsers) => {
    const validation = validateAllAssignments(projectTasks, availableUsers);
    const stats = getAssignmentStats(projectTasks, availableUsers);
    const unused = getUnusedUsers(projectTasks, availableUsers);

    return {
      validation,
      stats,
      unused,
      isValid: validation.valid,
      summary: getAssignmentSummary(projectTasks, availableUsers)
    };
  }, [validateAllAssignments, getAssignmentStats, getUnusedUsers, getAssignmentSummary]);

  return {
    validateAssigneeExists,
    validateAssignmentChange,
    validateAllAssignments,
    formatValidationError,
    getAssignmentSummary,
    getUnusedUsers,
    getAssignmentStats,
    buildValidationContext
  };
};

export default useAssignmentValidator;
