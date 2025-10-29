import { gql } from '@apollo/client';

// TaskComment Fragment
export const TASK_COMMENT_FRAGMENT = gql`
  fragment TaskCommentInfo on TaskComment {
    id
    taskId
    userId
    parentCommentId
    content
    commentType
    isInternal
    mentionedUsers
    attachments {
      id
      filename
      originalName
      mimeType
      size
      url
      uploadedAt
    }
    editedAt
    editedBy
    isDeleted
    deletedAt
    deletedBy
    createdAt
    updatedAt
    
    # Relations
    author {
      id
      firstName
      lastName
      email
    }
    
    editor {
      id
      firstName
      lastName
      email
    }
    
    deleter {
      id
      firstName
      lastName
      email
    }
    
    # Computed fields
    isEdited
    replyCount
  }
`;

// Query to get comments for a task
export const GET_TASK_COMMENTS = gql`
  query GetTaskComments(
    $taskId: ID!
    $includeDeleted: Boolean = false
    $limit: Int = 50
    $offset: Int = 0
  ) {
    taskComments(
      taskId: $taskId
      includeDeleted: $includeDeleted
      limit: $limit
      offset: $offset
    ) {
      nodes {
        ...TaskCommentInfo
        replies {
          ...TaskCommentInfo
        }
      }
      totalCount
      hasNextPage
      hasPreviousPage
    }
  }
  ${TASK_COMMENT_FRAGMENT}
`;

// Query to get a single comment
export const GET_TASK_COMMENT = gql`
  query GetTaskComment($id: ID!) {
    taskComment(id: $id) {
      ...TaskCommentInfo
      replies {
        ...TaskCommentInfo
      }
    }
  }
  ${TASK_COMMENT_FRAGMENT}
`;

// Query to get comment thread
export const GET_TASK_COMMENT_THREAD = gql`
  query GetTaskCommentThread($commentId: ID!) {
    taskCommentThread(commentId: $commentId) {
      ...TaskCommentInfo
    }
  }
  ${TASK_COMMENT_FRAGMENT}
`;

// Create a new task comment
export const CREATE_TASK_COMMENT = gql`
  mutation CreateTaskComment($input: CreateTaskCommentInput!) {
    createTaskComment(input: $input) {
      ...TaskCommentInfo
      replies {
        ...TaskCommentInfo
      }
    }
  }
  ${TASK_COMMENT_FRAGMENT}
`;

// Update an existing task comment
export const UPDATE_TASK_COMMENT = gql`
  mutation UpdateTaskComment($id: ID!, $input: UpdateTaskCommentInput!) {
    updateTaskComment(id: $id, input: $input) {
      ...TaskCommentInfo
      replies {
        ...TaskCommentInfo
      }
    }
  }
  ${TASK_COMMENT_FRAGMENT}
`;

// Delete a task comment (soft delete)
export const DELETE_TASK_COMMENT = gql`
  mutation DeleteTaskComment($id: ID!) {
    deleteTaskComment(id: $id) {
      ...TaskCommentInfo
    }
  }
  ${TASK_COMMENT_FRAGMENT}
`;

// Restore a deleted task comment
export const RESTORE_TASK_COMMENT = gql`
  mutation RestoreTaskComment($id: ID!) {
    restoreTaskComment(id: $id) {
      ...TaskCommentInfo
    }
  }
  ${TASK_COMMENT_FRAGMENT}
`;

// Permanently delete a task comment (admin only)
export const PERMANENT_DELETE_TASK_COMMENT = gql`
  mutation PermanentDeleteTaskComment($id: ID!) {
    permanentDeleteTaskComment(id: $id)
  }
`;

// Subscription for new comments
export const TASK_COMMENT_ADDED_SUBSCRIPTION = gql`
  subscription TaskCommentAdded($taskId: ID!) {
    taskCommentAdded(taskId: $taskId) {
      ...TaskCommentInfo
      replies {
        ...TaskCommentInfo
      }
    }
  }
  ${TASK_COMMENT_FRAGMENT}
`;

// Subscription for updated comments
export const TASK_COMMENT_UPDATED_SUBSCRIPTION = gql`
  subscription TaskCommentUpdated($taskId: ID!) {
    taskCommentUpdated(taskId: $taskId) {
      ...TaskCommentInfo
      replies {
        ...TaskCommentInfo
      }
    }
  }
  ${TASK_COMMENT_FRAGMENT}
`;

// Subscription for deleted comments
export const TASK_COMMENT_DELETED_SUBSCRIPTION = gql`
  subscription TaskCommentDeleted($taskId: ID!) {
    taskCommentDeleted(taskId: $taskId) {
      ...TaskCommentInfo
    }
  }
  ${TASK_COMMENT_FRAGMENT}
`;

// Helper function to create comment input
export const createCommentInput = ({
  taskId,
  content,
  commentType = 'general',
  isInternal = false,
  parentCommentId = null,
  mentionedUsers = [],
  attachments = []
}) => ({
  taskId,
  content,
  commentType,
  isInternal,
  parentCommentId,
  mentionedUsers,
  attachments
});

// Helper function to create update comment input
export const createUpdateCommentInput = ({
  content,
  isInternal,
  mentionedUsers = []
}) => ({
  content,
  isInternal,
  mentionedUsers
});