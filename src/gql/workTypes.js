import { gql } from '@apollo/client';

// WorkType Fragment
export const WORK_TYPE_FRAGMENT = gql`
  fragment WorkTypeInfo on WorkType {
    id
    name
    description
    isActive
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
    taskTypes {
      id
      name
      description
      color
      icon
      isActive
      WorkTypeTask {
        id
        order
        isRequired
      }
    }
  }
`;

// Queries
export const GET_WORK_TYPES = gql`
  query GetWorkTypes($filters: WorkTypeFiltersInput) {
    workTypes(filters: $filters) {
      ...WorkTypeInfo
    }
  }
  ${WORK_TYPE_FRAGMENT}
`;

export const GET_WORK_TYPE = gql`
  query GetWorkType($id: ID!) {
    workType(id: $id) {
      ...WorkTypeInfo
    }
  }
  ${WORK_TYPE_FRAGMENT}
`;

export const GET_WORK_TYPES_BY_TASK_TYPE = gql`
  query GetWorkTypesByTaskType($taskTypeId: ID!) {
    workTypesByTaskType(taskTypeId: $taskTypeId) {
      ...WorkTypeInfo
    }
  }
  ${WORK_TYPE_FRAGMENT}
`;

// Mutations
export const CREATE_WORK_TYPE = gql`
  mutation CreateWorkType($input: CreateWorkTypeInput!) {
    createWorkType(input: $input) {
      ...WorkTypeInfo
    }
  }
  ${WORK_TYPE_FRAGMENT}
`;

export const UPDATE_WORK_TYPE = gql`
  mutation UpdateWorkType($id: ID!, $input: UpdateWorkTypeInput!) {
    updateWorkType(id: $id, input: $input) {
      ...WorkTypeInfo
    }
  }
  ${WORK_TYPE_FRAGMENT}
`;

export const DELETE_WORK_TYPE = gql`
  mutation DeleteWorkType($id: ID!) {
    deleteWorkType(id: $id)
  }
`;