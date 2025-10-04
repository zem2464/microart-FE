import { gql } from '@apollo/client';

// Task Queries
export const GET_TASKS = gql`
  query GetTasks {
    tasks {
      id
      name
      description
      workType {
        id
        name
      }
      grading {
        id
        name
      }
      isActive
      createdAt
    }
  }
`;

export const GET_TASKS_BY_GRADING = gql`
  query GetTasksByGrading($gradingId: ID!, $workTypeId: ID!) {
    tasksByGrading(gradingId: $gradingId, workTypeId: $workTypeId) {
      id
      name
      description
      workType {
        id
        name
      }
      grading {
        id
        name
      }
      isActive
      createdAt
    }
  }
`;

export const GET_TASK = gql`
  query GetTask($id: ID!) {
    task(id: $id) {
      id
      name
      description
      workType {
        id
        name
      }
      grading {
        id
        name
      }
      isActive
      createdAt
      updatedAt
    }
  }
`;

// Task Mutations
export const CREATE_TASK = gql`
  mutation CreateTask($input: TaskInput!) {
    createTask(input: $input) {
      id
      name
      description
      workType {
        id
        name
      }
      grading {
        id
        name
      }
      isActive
      createdAt
    }
  }
`;

export const UPDATE_TASK = gql`
  mutation UpdateTask($id: ID!, $input: TaskUpdateInput!) {
    updateTask(id: $id, input: $input) {
      id
      name
      description
      workType {
        id
        name
      }
      grading {
        id
        name
      }
      isActive
      updatedAt
    }
  }
`;

export const DELETE_TASK = gql`
  mutation DeleteTask($id: ID!) {
    deleteTask(id: $id)
  }
`;