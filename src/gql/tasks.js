import { gql } from '@apollo/client';

// Task Fragment
export const TASK_FRAGMENT = gql`
  fragment TaskInfo on Task {
    id
    taskCode
    title
    description
    instructions
    status
    priority
    estimatedHours
    actualHours
    estimatedCost
    actualCost
    estimatedTime
    actualTime
    dueDate
    deadlineDate
    startDate
    completedDate
    notes
    clientNotes
    internalNotes
    isActive
    assignedDate
    createdAt
    updatedAt
    
    project {
      id
      projectCode
      description
      deadlineDate
      imageQuantity
      client {
        id
        clientCode
        colorCorrectionStyle
        transferMode
        clientNotes
      }
    }
    
    taskType {
      id
      name
      description
      color
      icon
    }
    
    gradingTask {
      id
      grading {
        id
        name
        defaultRate
      }
    }
    
    assignee {
      id
      firstName
      lastName
      email
    }
    
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
    
    assignedBy {
      id
      firstName
      lastName
      email
    }
    
    # Additional computed fields
    clientColorStyle
    clientTransferMode
    projectDeadlineDate
    projectDescription
    projectImageQuantity
    taskManager {
      id
      firstName
      lastName
      email
    }
  }
`;

// Task Queries
export const GET_TASKS = gql`
  query GetTasks(
    $filters: TaskFilterInput
    $page: Int = 1
    $limit: Int = 25
    $sortBy: String = "createdAt"
    $sortOrder: String = "DESC"
    $search: String
  ) {
    tasks(
      filters: $filters
      page: $page
      limit: $limit
      sortBy: $sortBy
      sortOrder: $sortOrder
      search: $search
    ) {
      tasks {
        ...TaskInfo
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
  ${TASK_FRAGMENT}
`;

export const GET_TASK = gql`
  query GetTask($id: ID!) {
    task(id: $id) {
      ...TaskInfo
    }
  }
  ${TASK_FRAGMENT}
`;

export const GET_MY_TASKS = gql`
  query GetMyTasks(
    $status: TaskStatus
    $priority: Priority
    $page: Int = 1
    $limit: Int = 25
  ) {
    myTasks(
      status: $status
      priority: $priority
      page: $page
      limit: $limit
    ) {
      tasks {
        ...TaskInfo
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
  ${TASK_FRAGMENT}
`;

export const GET_TASKS_BY_GRADING = gql`
  query GetTasksByGrading($gradingId: ID!, $workTypeId: ID!) {
    tasksByGrading(gradingId: $gradingId, workTypeId: $workTypeId) {
      id
      name
      description
      isActive
      createdAt
    }
  }
`;

// Task Mutations
export const CREATE_TASK = gql`
  mutation CreateTask($input: TaskCreateInput!) {
    createTask(input: $input) {
      id
      taskCode
      status
      message
    }
  }
`;

export const UPDATE_TASK = gql`
  mutation UpdateTask($id: ID!, $input: TaskUpdateInput!) {
    updateTask(id: $id, input: $input) {
      ...TaskInfo
    }
  }
  ${TASK_FRAGMENT}
`;

export const ASSIGN_TASK = gql`
  mutation AssignTask($input: TaskAssignmentInput!) {
    assignTask(input: $input) {
      ...TaskInfo
    }
  }
  ${TASK_FRAGMENT}
`;

export const UPDATE_TASK_STATUS = gql`
  mutation UpdateTaskStatus($id: ID!, $status: TaskStatus!, $notes: String) {
    updateTaskStatus(id: $id, status: $status, notes: $notes) {
      ...TaskInfo
    }
  }
  ${TASK_FRAGMENT}
`;

export const START_TASK = gql`
  mutation StartTask($id: ID!) {
    startTask(id: $id) {
      ...TaskInfo
    }
  }
  ${TASK_FRAGMENT}
`;

export const COMPLETE_TASK = gql`
  mutation CompleteTask($id: ID!, $actualHours: Float, $notes: String) {
    completeTask(id: $id, actualHours: $actualHours, notes: $notes) {
      ...TaskInfo
    }
  }
  ${TASK_FRAGMENT}
`;

export const DELETE_TASK = gql`
  mutation DeleteTask($id: ID!) {
    deleteTask(id: $id) {
      success
      message
    }
  }
`;

// Bulk operations
export const BULK_ASSIGN_TASKS = gql`
  mutation BulkAssignTasks($taskIds: [ID!]!, $assigneeId: ID!) {
    bulkAssignTasks(taskIds: $taskIds, assigneeId: $assigneeId) {
      success
      message
      affectedCount
    }
  }
`;

export const BULK_UPDATE_TASK_STATUS = gql`
  mutation BulkUpdateTaskStatus($taskIds: [ID!]!, $status: TaskStatus!, $notes: String) {
    bulkUpdateTaskStatus(taskIds: $taskIds, status: $status, notes: $notes) {
      success
      message
      affectedCount
    }
  }
`;

export const BULK_DELETE_TASKS = gql`
  mutation BulkDeleteTasks($taskIds: [ID!]!) {
    bulkDeleteTasks(taskIds: $taskIds) {
      success
      message
      affectedCount
    }
  }
`;

// Task subscriptions
export const TASK_UPDATED_SUBSCRIPTION = gql`
  subscription TaskUpdated($taskId: ID!) {
    taskUpdated(taskId: $taskId) {
      ...TaskInfo
    }
  }
  ${TASK_FRAGMENT}
`;

export const TASK_ASSIGNED_SUBSCRIPTION = gql`
  subscription TaskAssigned($assigneeId: ID) {
    taskAssigned(assigneeId: $assigneeId) {
      ...TaskInfo
    }
  }
  ${TASK_FRAGMENT}
`;

export const TASK_STATUS_CHANGED_SUBSCRIPTION = gql`
  subscription TaskStatusChanged($taskId: ID!) {
    taskStatusChanged(taskId: $taskId) {
      ...TaskInfo
    }
  }
  ${TASK_FRAGMENT}
`;

// Helper function to create task update input
export const createTaskUpdateInput = ({
  title,
  description,
  instructions,
  status,
  priority,
  assigneeId,
  estimatedHours,
  actualHours,
  estimatedCost,
  actualCost,
  dueDate,
  notes,
  clientNotes,
  internalNotes
}) => ({
  title,
  description,
  instructions,
  status,
  priority,
  assigneeId,
  estimatedHours,
  actualHours,
  estimatedCost,
  actualCost,
  dueDate,
  notes,
  clientNotes,
  internalNotes
});