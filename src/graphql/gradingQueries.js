import { gql } from '@apollo/client';

// Grading Queries
export const GET_GRADINGS = gql`
  query GetGradings {
    gradings {
      id
      name
      description
      defaultRate
      workType {
        id
        name
      }
      taskTypes {
        id
        name
        description
      }
      isActive
      createdAt
      updatedAt
    }
  }
`;

export const GET_GRADING = gql`
  query GetGrading($id: ID!) {
    grading(id: $id) {
      id
      name
      description
      defaultRate
      workType {
        id
        name
        description
      }
      taskTypes {
        id
        name
        description
        estimatedTime
        isActive
      }
      isActive
      createdAt
      updatedAt
    }
  }
`;

export const GET_GRADINGS_BY_WORK_TYPE = gql`
  query GetGradingsByWorkType($workTypeIds: [ID!]!) {
    gradingsByWorkType(workTypeIds: $workTypeIds) {
      id
      name
      description
      defaultRate
      workType {
        id
        name
      }
      isActive
    }
  }
`;