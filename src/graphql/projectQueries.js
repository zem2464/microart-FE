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
        name
        description
        client {
          id
          clientCode
        }
        workType {
          id
          name
        }
        grading {
          id
          name
          shortCode
          defaultRate
        }
        projectGradings {
          id
          gradingId
          grading {
            id
            name
            shortCode
            defaultRate
          }
          imageQuantity
          estimatedCost
          actualCost
          customRate
          sequence
        }
        invoiceId
        invoice {
          id
          invoiceNumber
          totalAmount
          status
        }
        # Backward compatibility fields
        imageQuantity
        estimatedCost
        actualCost
        # New total fields
        totalImageQuantity
        totalEstimatedCost
        totalActualCost
        deadlineDate
        status
        priority
        notes
        taskCount
        completedTaskCount
        isActive
        customFields
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
      name
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
        shortCode
        defaultRate
      }
      projectGradings {
        id
        gradingId
        grading {
          id
          name
          shortCode
          defaultRate
        }
        imageQuantity
        estimatedCost
        actualCost
        customRate
        sequence
      }
      # Backward compatibility fields
      imageQuantity
      estimatedCost
      actualCost
      # New total fields
      totalImageQuantity
      totalEstimatedCost
      totalActualCost
      deadlineDate
      status
      priority
      notes
      clientNotes
      customFields
      isActive
      taskTypes {
        id
        name
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
      invoiceId
      invoice {
        id
        invoiceNumber
        totalAmount
        status
      }
    }
  }
`;

// Project Mutations
export const CREATE_PROJECT = gql`
  mutation CreateProject($input: ProjectCreateInput!) {
    createProject(input: $input) {
      id
      projectCode
      name
      description
      status
      customFields
      createdAt
    }
  }
`;

export const UPDATE_PROJECT = gql`
  mutation UpdateProject($id: ID!, $input: ProjectUpdateInput!) {
    updateProject(id: $id, input: $input) {
      id
      projectCode
      name
      description
      client {
        id
        clientCode
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
      notes
      clientNotes
      customFields
      isActive
      taskCount
      completedTaskCount
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
      taskTypes {
        id
        name
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
    clientPreferences(clientId: $clientId) {
      workTypes {
        id
        name
        description
      }
      gradings {
        id
        grading {
          id
          name
          defaultRate
        }
        currency
        unit
        customRate
        isDefault
      }
      taskPreferences {
        id
        taskType {
          id
          name
          description
          color
          icon
        }
        preferredUserIds
        gradingId
      }
    }
  }
`;

export const VALIDATE_CLIENT_CREDIT = gql`
  query ValidateClientCredit($clientId: ID!, $gradingId: ID!, $imageQuantity: Int!) {
    validateClientCredit(clientId: $clientId, gradingId: $gradingId, imageQuantity: $imageQuantity) {
      isValid
      message
      availableCredit
      requiredCredit
      creditLimitEnabled
      creditLimit
      usedCredit
      rate
    }
  }
`;

export const VALIDATE_PROJECT_CREDIT = gql`
  query ValidateProjectCredit($clientId: ID!, $gradingId: ID, $imageQuantity: Int, $estimatedCost: Float) {
    validateProjectCredit(clientId: $clientId, gradingId: $gradingId, imageQuantity: $imageQuantity, estimatedCost: $estimatedCost) {
      isValid
      canCreateProject
      message
      availableCredit
      requiredCredit
      creditLimit
      usedCredit
      creditLimitEnabled
    }
  }
`;

export const GET_GRADING_TASKS = gql`
  query GetGradingTasks($gradingId: ID!) {
    gradingTasks(gradingId: $gradingId) {
      id
      gradingId
      taskTypeId
      sequence
      estimatedHours
      employeeRate
      currency
      unit
      instructions
      isActive
      taskType {
        id
        name
        description
        color
        icon
      }
      createdAt
      updatedAt
    }
  }
`;

export const GET_AVAILABLE_USERS = gql`
  query GetAvailableUsers {
    availableUsers {
      id
      firstName
      lastName
      email
      contactPersonal
      role {
        id
        name
      }
      isEmployee
    }
  }
`;

export const VALIDATE_MULTIPLE_GRADING_CREDIT = gql`
  query ValidateMultipleGradingCredit($clientId: ID!, $projectGradings: [ProjectGradingInput!]!) {
    validateMultipleGradingCredit(clientId: $clientId, projectGradings: $projectGradings) {
      isValid
      canCreateProject
      message
      availableCredit
      requiredCredit
      creditLimit
      usedCredit
      creditLimitEnabled
    }
  }
`;