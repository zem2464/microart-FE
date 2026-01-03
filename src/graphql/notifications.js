import { gql } from '@apollo/client';

export const GET_MY_NOTIFICATIONS = gql`
  query GetMyNotifications($limit: Int, $offset: Int, $onlyUnread: Boolean) {
    myNotifications(limit: $limit, offset: $offset, onlyUnread: $onlyUnread) {
      id
      type
      title
      message
      isRead
      readAt
      actionUrl
      metadata
      fromUserId
      fromUser {
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

export const GET_UNREAD_NOTIFICATION_COUNT = gql`
  query GetUnreadNotificationCount {
    unreadNotificationCount
  }
`;

export const MARK_NOTIFICATION_AS_READ = gql`
  mutation MarkNotificationAsRead($id: ID!) {
    markNotificationAsRead(id: $id) {
      id
      type
      title
      message
      isRead
      readAt
      actionUrl
      metadata
      fromUserId
      fromUser {
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

export const MARK_ALL_NOTIFICATIONS_AS_READ = gql`
  mutation MarkAllNotificationsAsRead {
    markAllNotificationsAsRead
  }
`;

export const MARK_ROOM_NOTIFICATIONS_AS_READ = gql`
  mutation MarkRoomNotificationsAsRead($roomId: ID!) {
    markRoomNotificationsAsRead(roomId: $roomId)
  }
`;

export const DELETE_NOTIFICATION = gql`
  mutation DeleteNotification($id: ID!) {
    deleteNotification(id: $id)
  }
`;

export const DELETE_ALL_READ_NOTIFICATIONS = gql`
  mutation DeleteAllReadNotifications {
    deleteAllReadNotifications
  }
`;

export const REMOVE_PUSH_SUBSCRIPTION = gql`
  mutation RemovePushSubscription($endpoint: String!) {
    removePushSubscription(endpoint: $endpoint)
  }
`;

export const NOTIFICATION_CREATED_SUBSCRIPTION = gql`
  subscription NotificationCreated {
    notificationCreated {
      id
      type
      title
      message
      isRead
      readAt
      actionUrl
      metadata
      fromUserId
      fromUser {
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
