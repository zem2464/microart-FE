import { gql } from '@apollo/client';

// Project Queries
export const GET_PROJECTS = gql`
  query GetProjects(
    $filters: ProjectFilterInput
    $page: Int = 1
    $limit: Int = 25
    $sortBy: String = "createdAt"
    $sortOrder: String = "DESC"
    $search: String
  ) {
    projects(
      filters: $filters
      page: $page
      limit: $limit
      sortBy: $sortBy
      sortOrder: $sortOrder
      search: $search
    ) {
      projects {
        id
        projectCode
        description
        client {
          id
          clientCode
          firstName
          lastName
          displayName
          companyName
        }
        workType {
          id
          name
        }
        grading {
          id
          name
          defaultRate
        }
        imageQuantity
        estimatedCost
        actualCost
        deadlineDate
        status
        priority
        isActive
        createdAt
        updatedAt
      }
      pagination {
        page
        limit
        totalItems
        totalPages
        hasNextPage
        hasPreviousPage
      }
    }
  }
`;

export const GET_PROJECT = gql`
  query GetProject($id: ID!) {
    project(id: $id) {
      id
      projectCode
      description
      client {
        id
        clientCode
        firstName
        lastName
        displayName
        companyName
        email
        contactNoWork
      }
      workType {
        id
        name
        description
      }
      grading {
        id
        name
        defaultRate
      }
      imageQuantity
      estimatedCost
      actualCost
      deadlineDate
      status
      priority
      notes
      clientNotes
      isActive
      tasks {
        id
        taskCode
        taskType {
          id
          name
        }
        status
        priority
        assignee {
          id
          firstName
          lastName
        }
        createdAt
      }
      creator {
        id
        firstName
        lastName
      }
      updater {
        id
        firstName
        lastName
      }
      createdAt
      updatedAt
    }
  }
`;

// Project Mutations
export const CREATE_PROJECT = gql`
  mutation CreateProject($input: ProjectCreateInput!) {
    createProject(input: $input) {
      id
      projectCode
      status
      message
    }
  }
`;

export const UPDATE_PROJECT = gql`
  mutation UpdateProject($id: ID!, $input: ProjectUpdateInput!) {
    updateProject(id: $id, input: $input) {
      id
      projectCode
      status
      message
    }
  }
`;

export const DELETE_PROJECT = gql`
  mutation DeleteProject($id: ID!) {
    deleteProject(id: $id) {
      success
      message
    }
  }
`;

export const ACTIVATE_PROJECT = gql`
  mutation ActivateProject($id: ID!) {
    activateProject(id: $id) {
      id
      status
      message
      tasks {
        id
        taskCode
        taskType {
          name
        }
      }
    }
  }
`;

// Helper Queries for Project Creation
export const GET_CLIENT_PREFERENCES = gql`
  query GetClientPreferences($clientId: ID!) {
    client(id: $clientId) {
      id
      isCreditEnabled
      creditAmountLimit
      availableCredit
      preferences {
        id
        workTypes {
          id
          name
        }
        gradings {
          id
          grading {
            id
            name
            defaultRate
          }
        }
        taskTypes {
          id
          name
          preferredUsers {
            id
            firstName
            lastName
            email
          }
        }
      }
    }
  }
`;

export const VALIDATE_CLIENT_CREDIT = gql`
  query ValidateClientCredit($clientId: ID!, $gradingId: ID!, $quantity: Int!) {
    validateClientCredit(clientId: $clientId, gradingId: $gradingId, quantity: $quantity) {
      isValid
      availableCredit
      requiredCredit
      message
    }
  }
`;

export const GET_GRADING_TASKS = gql`
  query GetGradingTasks($gradingId: ID!) {
    grading(id: $gradingId) {
      id
      name
      tasks {
        id
        name
        taskType {
          id
          name
        }
        estimatedHours
        hourlyRate
        preferredUsers {
          id
          firstName
          lastName
          email
        }
      }
    }
  }
`;