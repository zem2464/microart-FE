import { gql } from '@apollo/client';

// Work Type Queries
export const GET_WORK_TYPES = gql`
  query GetWorkTypes {
    workTypes {
      id
      name
      description
      isActive
      taskTypes {
        id
        name
        description
      }
      createdAt
      updatedAt
    }
  }
`;

export const GET_WORK_TYPE = gql`
  query GetWorkType($id: ID!) {
    workType(id: $id) {
      id
      name
      description
      isActive
      taskTypes {
        id
        name
        description
        estimatedTime
        isActive
      }
      gradings {
        id
        name
        description
        defaultRate
        isActive
      }
      createdAt
      updatedAt
    }
  }
`;

export const GET_ACTIVE_WORK_TYPES = gql`
  query GetActiveWorkTypes {
    activeWorkTypes {
      id
      name
      description
      isActive
    }
  }
`;