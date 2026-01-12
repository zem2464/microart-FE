import { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import {
  GET_PROJECT_DETAIL,
  GET_AVAILABLE_USERS,
} from '../graphql/projectQueries';
import { GET_TASKS } from '../gql/tasks';
import { GET_GRADINGS_BY_WORK_TYPES } from '../gql/gradings';
import { GET_WORK_TYPES } from '../gql/workTypes';
import { GET_PROJECT_AUDIT_HISTORY } from '../gql/auditLogs';

/**
 * Custom hook to fetch all project detail data
 * Handles caching, loading states, and refetching
 */
export const useProjectDetailData = (projectId) => {
  // Preserve previous data to prevent blank screen during refetch
  const [cachedProject, setCachedProject] = useState(null);
  const [cachedTasks, setCachedTasks] = useState([]);

  // Fetch project details
  const {
    data: projectData,
    loading: projectLoading,
    error: projectError,
    refetch: refetchProject,
    networkStatus: projectNetworkStatus,
  } = useQuery(GET_PROJECT_DETAIL, {
    variables: { id: projectId },
    skip: !projectId,
    fetchPolicy: 'no-cache',
    notifyOnNetworkStatusChange: true,
  });

  // Fetch tasks separately with project filter
  const {
    data: tasksData,
    loading: tasksLoading,
    refetch: refetchTasks,
    networkStatus: tasksNetworkStatus,
  } = useQuery(GET_TASKS, {
    variables: {
      filters: projectId ? { projectId } : undefined,
      page: 1,
      limit: 500,
    },
    skip: !projectId,
    fetchPolicy: 'no-cache',
    notifyOnNetworkStatusChange: true,
  });

  // Fetch combined audit logs
  const {
    data: auditData,
    loading: auditLoading,
    refetch: refetchAudit,
  } = useQuery(GET_PROJECT_AUDIT_HISTORY, {
    variables: { projectId },
    skip: !projectId,
    fetchPolicy: 'no-cache',
  });

  // Fetch available users for assignment
  const { data: usersData, loading: usersLoading } = useQuery(
    GET_AVAILABLE_USERS,
    {
      fetchPolicy: 'cache-first',
    }
  );

  // Fetch work types
  const { data: workTypesData, loading: workTypesLoading } = useQuery(
    GET_WORK_TYPES,
    {
      fetchPolicy: 'cache-first',
    }
  );

  const project = projectData?.project || cachedProject;
  const tasks = tasksData?.tasks?.tasks || cachedTasks;

  // Cache project data
  useEffect(() => {
    if (projectData?.project) {
      setCachedProject(projectData.project);
    }
  }, [projectData?.project]);

  // Cache tasks data
  useEffect(() => {
    const newTasks = tasksData?.tasks?.tasks;
    if (Array.isArray(newTasks) && newTasks.length > 0) {
      setCachedTasks(newTasks);
    }
  }, [tasksData?.tasks?.tasks]);

  // Fetch gradings for project workTypes
  const { data: gradingsData, loading: gradingsLoading } = useQuery(
    GET_GRADINGS_BY_WORK_TYPES,
    {
      variables: {
        workTypeIds:
          project?.projectWorkTypes?.map((pwt) => pwt.workTypeId) || [],
      },
      skip: !project?.projectWorkTypes?.length,
      fetchPolicy: 'cache-first',
    }
  );

  const refetchAll = () => {
    refetchProject();
    refetchTasks();
    refetchAudit();
  };

  return {
    project,
    tasks,
    auditLogs: auditData?.projectAuditHistory || [],
    users: usersData?.availableUsers || [],
    workTypes: workTypesData?.workTypes || [],
    gradings: gradingsData,
    loading: {
      project: projectLoading && !cachedProject,
      tasks: tasksLoading && cachedTasks.length === 0,
      audit: auditLoading,
      users: usersLoading,
      workTypes: workTypesLoading,
      gradings: gradingsLoading,
    },
    error: projectError,
    refetch: {
      project: refetchProject,
      tasks: refetchTasks,
      audit: refetchAudit,
      all: refetchAll,
    },
    networkStatus: {
      project: projectNetworkStatus,
      tasks: tasksNetworkStatus,
    },
  };
};
