import { gql } from '@apollo/client';

export const GET_USER_GRADING_RATES_BY_FILTER = gql`
  query UserGradingRatesByFilter($taskTypeId: ID, $gradingId: ID, $userId: ID) {
    userGradingRatesByFilter(taskTypeId: $taskTypeId, gradingId: $gradingId, userId: $userId) {
      id
      userId
      taskTypeId
      gradingId
      employeeRate
      effectiveFrom
      effectiveTo
      isActive
      user {
        id
        firstName
        lastName
        email
      }
      taskType {
        id
        name
      }
      grading {
        id
        name
        shortCode
        employeeRate
      }
      createdAt
      updatedAt
    }
  }
`;

export const GET_USER_GRADING_RATES_BY_USER = gql`
  query UserGradingRatesByUser($userId: ID!) {
    userGradingRatesByUser(userId: $userId) {
      id
      userId
      taskTypeId
      gradingId
      employeeRate
      effectiveFrom
      effectiveTo
      isActive
      taskType {
        id
        name
      }
      grading {
        id
        name
        shortCode
        employeeRate
      }
      createdAt
      updatedAt
    }
  }
`;

export const GET_EFFECTIVE_USER_GRADING_RATE = gql`
  query EffectiveUserGradingRate($userId: ID!, $taskTypeId: ID!, $gradingId: ID!, $effectiveDate: String) {
    effectiveUserGradingRate(userId: $userId, taskTypeId: $taskTypeId, gradingId: $gradingId, effectiveDate: $effectiveDate) {
      id
      userId
      taskTypeId
      gradingId
      employeeRate
      effectiveFrom
      effectiveTo
      isActive
      isDefault
      user {
        id
        firstName
        lastName
        email
      }
      taskType {
        id
        name
      }
      grading {
        id
        name
        shortCode
        employeeRate
      }
    }
  }
`;

export const SET_USER_GRADING_RATE = gql`
  mutation SetUserGradingRate($input: UserGradingRateInput!) {
    setUserGradingRate(input: $input) {
      id
      userId
      taskTypeId
      gradingId
      employeeRate
      effectiveFrom
      effectiveTo
      isActive
      user {
        id
        firstName
        lastName
        email
      }
      taskType {
        id
        name
      }
      grading {
        id
        name
        shortCode
        employeeRate
      }
    }
  }
`;

export const DELETE_USER_GRADING_RATE = gql`
  mutation DeleteUserGradingRate($id: Int!) {
    deleteUserGradingRate(id: $id) {
      success
      message
    }
  }
`;

export const BULK_SET_USER_GRADING_RATES = gql`
  mutation BulkSetUserGradingRates($taskTypeId: ID!, $gradingId: ID!, $rates: [BulkUserRateInput!]!) {
    bulkSetUserGradingRates(taskTypeId: $taskTypeId, gradingId: $gradingId, rates: $rates) {
      success
      message
      count
    }
  }
`;

// Query to get all task types for selection
export const GET_TASK_TYPES = gql`
  query TaskTypes {
    taskTypes {
      id
      name
      isActive
    }
  }
`;

// Query to get grading tasks (task types mapped to a grading)
export const GET_GRADING_TASKS = gql`
  query GradingTasks($gradingId: ID!) {
    gradingTasks(gradingId: $gradingId) {
      id
      gradingId
      taskTypeId
      employeeRate
      taskType {
        id
        name
      }
    }
  }
`;

// Query to get all users (for selection)
export const GET_ALL_USERS = gql`
  query Users {
    users {
      id
      firstName
      lastName
      email
      isActive
      role {
        id
        name
        roleType
      }
    }
  }
`;

// Query to get all gradings
export const GET_GRADINGS = gql`
  query Gradings {
    gradings {
      id
      name
      shortCode
      employeeRate
    }
  }
`;
