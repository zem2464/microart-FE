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
          displayName
        }
        projectWorkTypes {
          id
          workTypeId
          workType {
            id
            name
          }
          sequence
        }
        workTypes {
          id
          name
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
        creditRequest {
          id
          requestedAmount
          availableCredit
          creditLimit
          excessAmount
          status
          intendedStatus
          requestNotes
        }
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
        displayName
      }
      projectWorkTypes {
        id
        workTypeId
        workType {
          id
          name
          description
        }
        sequence
      }
      workTypes {
        id
        name
        description
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
      projectWorkTypes {
        id
        workTypeId
        workType {
          id
          name
        }
        sequence
      }
      workTypes {
        id
        name
      }
      projectGradings {
        id
        gradingId
        grading {
          id
          name
        }
        imageQuantity
        estimatedCost
        customRate
      }
      imageQuantity
      estimatedCost
      actualCost
      totalImageQuantity
      totalEstimatedCost
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
      workTypes {
        id
        name
      }
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

// Credit Request Mutations
export const REQUEST_CREDIT_APPROVAL = gql`
  mutation RequestCreditApproval($input: RequestCreditApprovalInput!) {
    requestCreditApproval(input: $input) {
      creditRequest {
        id
        projectId
        clientId
        requestedAmount
        availableCredit
        creditLimit
        excessAmount
        intendedStatus
        status
        requestNotes
        createdAt
      }
      project {
        id
        projectCode
        status
      }
    }
  }
`;

export const APPROVE_CREDIT_REQUEST = gql`
  mutation ApproveCreditRequest($requestId: ID!, $input: CreditRequestDecisionInput) {
    approveCreditRequest(requestId: $requestId, input: $input) {
      creditRequest {
        id
        status
        approvedBy
        approvedAt
        approvalNotes
      }
      project {
        id
        projectCode
        status
      }
      tasksCreated
    }
  }
`;

export const REJECT_CREDIT_REQUEST = gql`
  mutation RejectCreditRequest($requestId: ID!, $input: CreditRequestDecisionInput!) {
    rejectCreditRequest(requestId: $requestId, input: $input) {
      creditRequest {
        id
        status
        rejectedBy
        rejectedAt
        approvalNotes
      }
      project {
        id
        projectCode
        status
      }
    }
  }
`;

// Credit Request Queries
export const GET_PENDING_CREDIT_REQUESTS = gql`
  query GetPendingCreditRequests($clientId: ID) {
    pendingCreditRequests(clientId: $clientId) {
      id
      projectId
      clientId
      requestedAmount
      availableCredit
      creditLimit
      excessAmount
      intendedStatus
      status
      requestNotes
      requestedBy
      createdAt
      project {
        id
        projectCode
        name
        description
        status
      }
      client {
        id
        clientCode
        displayName
        companyName
      }
      requester {
        id
        firstName
        lastName
        email
      }
    }
  }
`;

export const GET_CREDIT_REQUEST = gql`
  query GetCreditRequest($id: ID!) {
    creditRequest(id: $id) {
      id
      projectId
      clientId
      requestedAmount
      availableCredit
      creditLimit
      excessAmount
      intendedStatus
      status
      requestNotes
      approvalNotes
      requestedBy
      approvedBy
      approvedAt
      rejectedBy
      rejectedAt
      createdAt
      updatedAt
      project {
        id
        projectCode
        name
        description
        status
      }
      client {
        id
        clientCode
        displayName
        companyName
        creditLimit
        creditUsed
      }
      requester {
        id
        firstName
        lastName
        email
      }
      approver {
        id
        firstName
        lastName
        email
      }
      rejector {
        id
        firstName
        lastName
        email
      }
    }
  }
`;

// Stats Query
export const GET_PROJECT_STATS = gql`
  query GetProjectStats {
    projectStats {
      stats {
        status
        count
        totalEstimatedCost
        totalActualCost
      }
      flyOnCreditCount
      flyOnCreditEstimatedCost
      flyOnCreditActualCost
      noInvoiceCount
      noInvoiceEstimatedCost
      noInvoiceActualCost
    }
  }
`;

// Comprehensive Project Detail Query for Drawer
export const GET_PROJECT_DETAIL = gql`
  query GetProjectDetail($id: ID!) {
    project(id: $id) {
      id
      projectCode
      name
      description
      status
      priority
      deadlineDate
      notes
      clientNotes
      customFields
      isActive
      createdAt
      updatedAt
      
      # Quantities and costs
      imageQuantity
      estimatedCost
      actualCost
      totalImageQuantity
      totalEstimatedCost
      totalActualCost
      
      # Client information
      client {
        id
        clientCode
        displayName
      }
      
      # Work Types
      projectWorkTypes {
        id
        workTypeId
        sequence
        workType {
          id
          name
          description
        }
      }
      
      workTypes {
        id
        name
        description
      }
      
      # Gradings with full details
      projectGradings {
        id
        gradingId
        imageQuantity
        estimatedCost
        actualCost
        customRate
        sequence
        grading {
          id
          name
          shortCode
          defaultRate
          description
          workType {
            id
            name
          }
        }
      }
      
      # Invoice and Payment Information
      invoiceId
      invoice {
        id
        invoiceNumber
        invoiceDate
        dueDate
        totalAmount
        taxAmount
        discountAmount
        paidAmount
        balanceAmount
        status
        createdAt
        updatedAt
      }
      
      # Creator and Updater
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
  }
`;
