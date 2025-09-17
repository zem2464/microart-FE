import { gql } from '@apollo/client';

// TaskType Fragment
export const TASK_TYPE_FRAGMENT = gql`
  fragment TaskTypeInfo on TaskType {
    id
    name
    description
    color
    icon
    isActive
    sortOrder
    createdAt
    updatedAt
    creator {
      id
      firstName
      lastName
      email
    }
    updater {
      id
      firstName
      lastName
      email
    }
  }
`;

// Queries
export const GET_TASK_TYPES = gql`
  query GetTaskTypes($filters: TaskTypeFilters) {
    taskTypes(filters: $filters) {
      ...TaskTypeInfo
    }
  }
  ${TASK_TYPE_FRAGMENT}
`;

export const GET_TASK_TYPE = gql`
  query GetTaskType($id: ID!) {
    taskType(id: $id) {
      ...TaskTypeInfo
    }
  }
  ${TASK_TYPE_FRAGMENT}
`;

export const GET_ACTIVE_TASK_TYPES = gql`
  query GetActiveTaskTypes {
    activeTaskTypes {
      ...TaskTypeInfo
    }
  }
  ${TASK_TYPE_FRAGMENT}
`;

// Mutations
export const CREATE_TASK_TYPE = gql`
  mutation CreateTaskType($input: TaskTypeInput!) {
    createTaskType(input: $input) {
      ...TaskTypeInfo
    }
  }
  ${TASK_TYPE_FRAGMENT}
`;

export const UPDATE_TASK_TYPE = gql`
  mutation UpdateTaskType($id: ID!, $input: TaskTypeUpdateInput!) {
    updateTaskType(id: $id, input: $input) {
      ...TaskTypeInfo
    }
  }
  ${TASK_TYPE_FRAGMENT}
`;

export const DELETE_TASK_TYPE = gql`
  mutation DeleteTaskType($id: ID!) {
    deleteTaskType(id: $id)
  }
`;

export const REORDER_TASK_TYPES = gql`
  mutation ReorderTaskTypes($taskTypeIds: [ID!]!) {
    reorderTaskTypes(taskTypeIds: $taskTypeIds) {
      ...TaskTypeInfo
    }
  }
  ${TASK_TYPE_FRAGMENT}
`;