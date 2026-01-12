import { gql } from '@apollo/client';

export const GET_PROJECT_REMINDER_NOTES = gql`
  query GetProjectReminderNotes($projectId: ID!) {
    projectReminderNotes(projectId: $projectId) {
      id
      projectId
      content
      createdBy
      isActive
      createdAt
      updatedAt
      creator {
        id
        firstName
        lastName
        email
      }
      seenBy {
        id
        noteId
        userId
        seenAt
        user {
          id
          firstName
          lastName
          email
        }
      }
    }
  }
`;

export const GET_PROJECT_REMINDER_NOTE = gql`
  query GetProjectReminderNote($id: ID!) {
    projectReminderNote(id: $id) {
      id
      projectId
      content
      isActive
      createdAt
      updatedAt
      creator {
        id
        firstName
        lastName
        email
      }
      seenBy {
        id
        noteId
        userId
        seenAt
        user {
          id
          firstName
          lastName
          email
        }
      }
    }
  }
`;

export const CREATE_PROJECT_REMINDER_NOTE = gql`
  mutation CreateProjectReminderNote($input: CreateProjectReminderNoteInput!) {
    createProjectReminderNote(input: $input) {
      id
      projectId
      content
      isActive
      createdAt
      creator {
        id
        firstName
        lastName
        email
      }
    }
  }
`;

export const UPDATE_PROJECT_REMINDER_NOTE = gql`
  mutation UpdateProjectReminderNote($id: ID!, $content: String!) {
    updateProjectReminderNote(id: $id, content: $content) {
      id
      projectId
      content
      isActive
      updatedAt
      creator {
        id
        firstName
        lastName
        email
      }
      seenBy {
        id
        userId
        seenAt
        user {
          id
          firstName
          lastName
          email
        }
      }
    }
  }
`;

export const DELETE_PROJECT_REMINDER_NOTE = gql`
  mutation DeleteProjectReminderNote($id: ID!) {
    deleteProjectReminderNote(id: $id) {
      success
      message
      affectedCount
    }
  }
`;

export const MARK_REMINDER_NOTE_AS_SEEN = gql`
  mutation MarkReminderNoteAsSeen($input: MarkReminderNoteAsSeenInput!) {
    markReminderNoteAsSeen(input: $input) {
      id
      noteId
      userId
      seenAt
      user {
        id
        firstName
        lastName
        email
      }
    }
  }
`;
