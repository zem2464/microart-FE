import { gql } from '@apollo/client';

export const GET_REMINDERS = gql`
  query Reminders($completed: Boolean, $assignedToMe: Boolean, $page: Int, $limit: Int) {
    reminders(completed: $completed, assignedToMe: $assignedToMe, page: $page, limit: $limit) {
      success
      message
      total
      reminders {
        id
        title
        description
        dueDate
        priority
        completed
        completedAt
        flagged
        createdBy
        creator {
          id
          firstName
          lastName
          email
        }
        assignedUsers {
          id
          firstName
          lastName
          email
        }
        createdAt
        updatedAt
      }
    }
  }
`;

export const GET_MY_REMINDERS = gql`
  query MyReminders($completed: Boolean, $createdByMe: Boolean, $assignedByMeOnly: Boolean, $page: Int, $limit: Int) {
    myReminders(completed: $completed, createdByMe: $createdByMe, assignedByMeOnly: $assignedByMeOnly, page: $page, limit: $limit) {
      success
      message
      total
      reminders {
        id
        title
        description
        dueDate
        priority
        completed
        completedAt
        flagged
        createdBy
        creator {
          id
          firstName
          lastName
          email
        }
        assignedUsers {
          id
          firstName
          lastName
          email
        }
        assignments {
          id
          userId
          isCompleted
          completedAt
          user {
            id
            firstName
            lastName
            email
          }
        }
        myAssignment {
          id
          userId
          isCompleted
          completedAt
        }
        createdAt
        updatedAt
      }
    }
  }
`;

export const GET_REMINDER = gql`
  query Reminder($id: ID!) {
    reminder(id: $id) {
      id
      title
      description
      dueDate
      priority
      completed
      completedAt
      flagged
      createdBy
      creator {
        id
        firstName
        lastName
        email
      }
      assignedUsers {
        id
        firstName
        lastName
        email
      }
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_REMINDER = gql`
  mutation CreateReminder($input: CreateReminderInput!) {
    createReminder(input: $input) {
      success
      message
      reminder {
        id
        title
        description
        dueDate
        priority
        completed
        completedAt
        flagged
        createdBy
        creator {
          id
          firstName
          lastName
          email
        }
        assignedUsers {
          id
          firstName
          lastName
          email
        }
        createdAt
        updatedAt
      }
    }
  }
`;

export const UPDATE_REMINDER = gql`
  mutation UpdateReminder($id: ID!, $input: UpdateReminderInput!) {
    updateReminder(id: $id, input: $input) {
      success
      message
      reminder {
        id
        title
        description
        dueDate
        priority
        completed
        completedAt
        flagged
        createdBy
        creator {
          id
          firstName
          lastName
          email
        }
        assignedUsers {
          id
          firstName
          lastName
          email
        }
        createdAt
        updatedAt
      }
    }
  }
`;

export const DELETE_REMINDER = gql`
  mutation DeleteReminder($id: ID!) {
    deleteReminder(id: $id) {
      success
      message
    }
  }
`;

export const TOGGLE_REMINDER_COMPLETE = gql`
  mutation ToggleReminderComplete($id: ID!) {
    toggleReminderComplete(id: $id) {
      success
      message
      reminder {
        id
        title
        description
        dueDate
        priority
        completed
        completedAt
        flagged
        createdBy
        creator {
          id
          firstName
          lastName
          email
        }
        assignedUsers {
          id
          firstName
          lastName
          email
        }
        createdAt
        updatedAt
      }
    }
  }
`;

export const TOGGLE_REMINDER_FLAG = gql`
  mutation ToggleReminderFlag($id: ID!) {
    toggleReminderFlag(id: $id) {
      success
      message
      reminder {
        id
        title
        description
        dueDate
        priority
        completed
        completedAt
        flagged
        createdBy
        creator {
          id
          firstName
          lastName
          email
        }
        assignedUsers {
          id
          firstName
          lastName
          email
        }
        createdAt
        updatedAt
      }
    }
  }
`;

export const GET_TODAY_PENDING_REMINDERS_COUNT = gql`
  query TodayPendingRemindersCount {
    todayPendingRemindersCount
  }
`;
