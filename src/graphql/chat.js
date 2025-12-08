import { gql } from '@apollo/client';

// Fragment for chat room member
export const CHAT_ROOM_MEMBER_FRAGMENT = gql`
  fragment ChatRoomMemberFields on ChatRoomMember {
    id
    role
    lastReadMessageId
    lastReadAt
    isMuted
    joinedAt
    user {
      id
      firstName
      lastName
      email
      isOnline
      lastSeen
    }
  }
`;

// Fragment for chat message
export const CHAT_MESSAGE_FRAGMENT = gql`
  fragment ChatMessageFields on ChatMessage {
    id
    chatRoom {
      id
    }
    content
    messageType
    isEdited
    editedAt
    isDeleted
    createdAt
    sender {
      id
      firstName
      lastName
      email
    }
    parentMessage {
      id
      content
      sender {
        id
        firstName
        lastName
      }
    }
    reactions {
      emoji
      userIds
    }
  }
`;

// Fragment for chat room
export const CHAT_ROOM_FRAGMENT = gql`
  fragment ChatRoomFields on ChatRoom {
    id
    name
    type
    isPrivate
    description
    avatarUrl
    createdAt
    updatedAt
    membership {
      role
      lastReadMessageId
      lastReadAt
      isMuted
    }
    project {
      id
      projectCode
    }
  }
`;

// Get all my chat rooms
export const GET_MY_CHAT_ROOMS = gql`
  ${CHAT_ROOM_FRAGMENT}
  query GetMyChatRooms {
    me {
      id
      firstName
      lastName
    }
    myChatRooms {
      ...ChatRoomFields
      unreadCount
      lastMessage {
        id
        content
        createdAt
        sender {
          id
          firstName
          lastName
        }
      }
      members {
        id
        lastReadMessageId
        lastReadAt
        user {
          id
          firstName
          lastName
          isOnline
          lastSeen
        }
      }
    }
  }
`;

// Get a specific chat room
export const GET_CHAT_ROOM = gql`
  ${CHAT_ROOM_FRAGMENT}
  ${CHAT_ROOM_MEMBER_FRAGMENT}
  query GetChatRoom($id: ID!, $limit: Int, $beforeId: ID) {
    chatRoom(id: $id, limit: $limit, beforeId: $beforeId) {
      ...ChatRoomFields
      members {
        ...ChatRoomMemberFields
      }
      messages(limit: $limit, beforeId: $beforeId) {
        id
        content
        messageType
        createdAt
        isEdited
        editedAt
        sender {
          id
          firstName
          lastName
          email
        }
      }
    }
  }
`;

// Get messages for a room
export const GET_CHAT_MESSAGES = gql`
  ${CHAT_MESSAGE_FRAGMENT}
  query GetChatMessages($roomId: ID!, $limit: Int, $beforeId: ID) {
    chatMessages(roomId: $roomId, limit: $limit, beforeId: $beforeId) {
      ...ChatMessageFields
    }
  }
`;

// Search users for chat
export const SEARCH_USERS_FOR_CHAT = gql`
  query SearchUsersForChat($query: String!) {
    searchUsersForChat(query: $query) {
      id
      firstName
      lastName
      email
    }
  }
`;

// Create direct room
export const CREATE_DIRECT_ROOM = gql`
  ${CHAT_ROOM_FRAGMENT}
  mutation CreateDirectRoom($input: CreateDirectRoomInput!) {
    createDirectRoom(input: $input) {
      ...ChatRoomFields
      members {
        id
        user {
          id
          firstName
          lastName
        }
      }
    }
  }
`;

// Create group room
export const CREATE_GROUP_ROOM = gql`
  ${CHAT_ROOM_FRAGMENT}
  mutation CreateGroupRoom($input: CreateGroupRoomInput!) {
    createGroupRoom(input: $input) {
      ...ChatRoomFields
      members {
        id
        user {
          id
          firstName
          lastName
        }
      }
    }
  }
`;

// Create project room
export const CREATE_PROJECT_ROOM = gql`
  ${CHAT_ROOM_FRAGMENT}
  mutation CreateProjectRoom($input: CreateProjectRoomInput!) {
    createProjectRoom(input: $input) {
      ...ChatRoomFields
      members {
        id
        user {
          id
          firstName
          lastName
        }
      }
    }
  }
`;

// Send message
export const SEND_MESSAGE = gql`
  ${CHAT_MESSAGE_FRAGMENT}
  mutation SendMessage($input: SendMessageInput!) {
    sendMessage(input: $input) {
      ...ChatMessageFields
    }
  }
`;

// Edit message
export const EDIT_MESSAGE = gql`
  ${CHAT_MESSAGE_FRAGMENT}
  mutation EditMessage($input: EditMessageInput!) {
    editMessage(input: $input) {
      ...ChatMessageFields
    }
  }
`;

// Delete message
export const DELETE_MESSAGE = gql`
  mutation DeleteMessage($messageId: ID!) {
    deleteMessage(messageId: $messageId)
  }
`;

// Add reaction
export const ADD_REACTION = gql`
  ${CHAT_MESSAGE_FRAGMENT}
  mutation AddReaction($input: AddReactionInput!) {
    addReaction(input: $input) {
      ...ChatMessageFields
    }
  }
`;

// Remove reaction
export const REMOVE_REACTION = gql`
  ${CHAT_MESSAGE_FRAGMENT}
  mutation RemoveReaction($input: AddReactionInput!) {
    removeReaction(input: $input) {
      ...ChatMessageFields
    }
  }
`;

// Mark chat as read
export const MARK_CHAT_AS_READ = gql`
  mutation MarkChatAsRead($roomId: ID!, $messageId: ID!) {
    markChatAsRead(roomId: $roomId, messageId: $messageId)
  }
`;

// Subscribe to new messages
export const CHAT_MESSAGE_ADDED = gql`
  ${CHAT_MESSAGE_FRAGMENT}
  subscription ChatMessageAdded($roomId: ID) {
    chatMessageAdded(roomId: $roomId) {
      ...ChatMessageFields
    }
  }
`;

// Subscribe to message updates
export const CHAT_MESSAGE_UPDATED = gql`
  ${CHAT_MESSAGE_FRAGMENT}
  subscription ChatMessageUpdated($roomId: ID!) {
    chatMessageUpdated(roomId: $roomId) {
      ...ChatMessageFields
    }
  }
`;

// Subscribe to message deletes
export const CHAT_MESSAGE_DELETED = gql`
  subscription ChatMessageDeleted($roomId: ID!) {
    chatMessageDeleted(roomId: $roomId) {
      id
      chatRoomId
    }
  }
`;

// Subscribe to read status updates
export const CHAT_READ_UPDATED = gql`
  ${CHAT_ROOM_MEMBER_FRAGMENT}
  subscription ChatReadUpdated($roomId: ID!) {
    chatReadUpdated(roomId: $roomId) {
      ...ChatRoomMemberFields
    }
  }
`;
