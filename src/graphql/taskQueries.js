import { gql } from '@apollo/client';

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
        id
        taskCode
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
        }
        gradingTask {
          id
          grading {
            id
            name
          }
        }
        assignee {
          id
          firstName
          lastName
          email
        }
        status
        priority
        deadlineDate
        notes
        clientNotes
        internalNotes
        startDate
        completedDate
        createdAt
        updatedAt
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

export const GET_TASK = gql`
  query GetTask($id: ID!) {
    task(id: $id) {
      id
      taskCode
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
        workType {
          id
          name
        }
        grading {
          id
          name
          defaultRate
        }
      }
      taskType {
        id
        name
        description
        estimatedTime
      }
      gradingTask {
        id
        grading {
          id
          name
        }
      }
      assignee {
        id
        firstName
        lastName
        email
      }
      assignedBy {
        id
        firstName
        lastName
      }
      status
      priority
      deadlineDate
      notes
      clientNotes
      internalNotes
      startDate
      completedDate
      estimatedTime
      actualTime
      creator {
        id
        firstName
        lastName
      }
      createdAt
      updatedAt
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
      id
      taskCode
      status
      message
    }
  }
`;

export const ASSIGN_TASK = gql`
  mutation AssignTask($id: ID!, $assigneeId: ID!) {
    assignTask(id: $id, assigneeId: $assigneeId) {
      id
      assignee {
        id
        firstName
        lastName
      }
      message
    }
  }
`;

export const UPDATE_TASK_STATUS = gql`
  mutation UpdateTaskStatus($id: ID!, $status: TaskStatus!) {
    updateTaskStatus(id: $id, status: $status) {
      id
      status
      message
    }
  }
`;

export const DELETE_TASK = gql`
  mutation DeleteTask($id: ID!) {
    deleteTask(id: $id) {
      success
      message
    }
  }
`;