import { gql } from '@apollo/client';

// Grading Fragment
export const GRADING_FRAGMENT = gql`
  fragment GradingInfo on Grading {
    id
    name
    description
    workTypeId
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
    workType {
      id
      name
      description
    }
    taskTypes {
      id
      name
      description
      color
      icon
      isActive
      gradingTask {
        id
        gradingId
        taskTypeId
        pricePerUnit
        currency
        unit
        isActive
        createdAt
        updatedAt
        createdBy
        updatedBy
      }
    }
  }
`;

// Queries
export const GET_GRADINGS = gql`
  query GetGradings {
    gradings {
      ...GradingInfo
    }
  }
  ${GRADING_FRAGMENT}
`;

export const GET_GRADING = gql`
  query GetGrading($id: ID!) {
    grading(id: $id) {
      ...GradingInfo
    }
  }
  ${GRADING_FRAGMENT}
`;

export const GET_GRADINGS_BY_WORK_TYPE = gql`
  query GetGradingsByWorkType($workTypeId: ID!) {
    gradingsByWorkType(workTypeId: $workTypeId) {
      ...GradingInfo
    }
  }
  ${GRADING_FRAGMENT}
`;

// Mutations
export const CREATE_GRADING = gql`
  mutation CreateGrading($input: CreateGradingInput!) {
    createGrading(input: $input) {
      ...GradingInfo
    }
  }
  ${GRADING_FRAGMENT}
`;

export const UPDATE_GRADING = gql`
  mutation UpdateGrading($id: ID!, $input: UpdateGradingInput!) {
    updateGrading(id: $id, input: $input) {
      ...GradingInfo
    }
  }
  ${GRADING_FRAGMENT}
`;

export const DELETE_GRADING = gql`
  mutation DeleteGrading($id: ID!) {
    deleteGrading(id: $id)
  }
`;