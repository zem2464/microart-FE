import { gql } from '@apollo/client';

// TaskAssignment Fragment
export const TASK_ASSIGNMENT_FRAGMENT = gql`
  fragment TaskAssignmentInfo on TaskAssignment {
    id
    taskId
    userId
    imageQuantity
    completedImageQuantity
    notes
    status
    assignedBy
    assignedDate
    isActive
    createdAt
    updatedAt
    
    user {
      id
      firstName
      lastName
      email
    }
    
    assigner {
      id
      firstName
      lastName
      email
    }
  }
`;

// Queries
export const GET_TASK_ASSIGNMENT = gql`
  query GetTaskAssignment($id: ID!) {
    taskAssignment(id: $id) {
      ...TaskAssignmentInfo
    }
  }
  ${TASK_ASSIGNMENT_FRAGMENT}
`;

export const GET_TASK_ASSIGNMENTS = gql`
  query GetTaskAssignments(
    $filters: TaskAssignmentFilterInput
    $page: Int = 1
    $limit: Int = 25
    $sortBy: String = "createdAt"
    $sortOrder: String = "DESC"
  ) {
    taskAssignments(
      filters: $filters
      page: $page
      limit: $limit
      sortBy: $sortBy
      sortOrder: $sortOrder
    ) {
      taskAssignments {
        ...TaskAssignmentInfo
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
  ${TASK_ASSIGNMENT_FRAGMENT}
`;

export const GET_TASK_ASSIGNMENTS_BY_TASK = gql`
  query GetTaskAssignmentsByTask($taskId: ID!) {
    taskAssignmentsByTask(taskId: $taskId) {
      ...TaskAssignmentInfo
    }
  }
  ${TASK_ASSIGNMENT_FRAGMENT}
`;

export const GET_TASK_ASSIGNMENTS_BY_USER = gql`
  query GetTaskAssignmentsByUser($userId: ID!) {
    taskAssignmentsByUser(userId: $userId) {
      ...TaskAssignmentInfo
      task {
        id
        taskCode
        title
        status
        project {
          id
          projectCode
          name
        }
      }
    }
  }
  ${TASK_ASSIGNMENT_FRAGMENT}
`;

// Mutations
export const CREATE_TASK_ASSIGNMENT = gql`
  mutation CreateTaskAssignment($input: TaskAssignmentCreateInput!) {
    createTaskAssignment(input: $input) {
      ...TaskAssignmentInfo
    }
  }
  ${TASK_ASSIGNMENT_FRAGMENT}
`;

export const UPDATE_TASK_ASSIGNMENT = gql`
  mutation UpdateTaskAssignment($id: ID!, $input: TaskAssignmentUpdateInput!) {
    updateTaskAssignment(id: $id, input: $input) {
      ...TaskAssignmentInfo
    }
  }
  ${TASK_ASSIGNMENT_FRAGMENT}
`;

export const DELETE_TASK_ASSIGNMENT = gql`
  mutation DeleteTaskAssignment($id: ID!) {
    deleteTaskAssignment(id: $id)
  }
`;

export const BULK_CREATE_TASK_ASSIGNMENTS = gql`
  mutation BulkCreateTaskAssignments($inputs: [TaskAssignmentCreateInput!]!) {
    bulkCreateTaskAssignments(inputs: $inputs) {
      ...TaskAssignmentInfo
    }
  }
  ${TASK_ASSIGNMENT_FRAGMENT}
`;

// Helper function to create task assignment input
export const createTaskAssignmentInput = ({
  taskId,
  userId,
  imageQuantity,
  notes
}) => {
  const input = {
    taskId,
    userId,
    imageQuantity
  };
  
  if (notes !== undefined && notes !== null) {
    input.notes = notes;
  }
  
  return input;
};

// Helper function to create task assignment update input
export const createTaskAssignmentUpdateInput = ({
  imageQuantity,
  completedImageQuantity,
  notes,
  status,
  isActive
}) => {
  const input = {};
  
  if (imageQuantity !== undefined && imageQuantity !== null) {
    input.imageQuantity = imageQuantity;
  }
  
  if (completedImageQuantity !== undefined && completedImageQuantity !== null) {
    input.completedImageQuantity = completedImageQuantity;
  }
  
  if (notes !== undefined && notes !== null) {
    input.notes = notes;
  }
  
  if (status !== undefined && status !== null) {
    input.status = status;
  }
  
  if (isActive !== undefined && isActive !== null) {
    input.isActive = isActive;
  }
  
  return input;
};
