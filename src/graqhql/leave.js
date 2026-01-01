import { gql } from '@apollo/client';

// Leave Queries
export const GET_LEAVES = gql`
  query GetLeaves($userId: ID, $status: String, $year: Int, $page: Int, $limit: Int) {
    leaves(userId: $userId, status: $status, year: $year, page: $page, limit: $limit) {
      leaves {
        id
        userId
        leaveType
        durationType
        startDate
        endDate
        hours
        reason
        status
        approvedBy
        approvedAt
        rejectionReason
        isBackDated
        isPositiveLeave
        createdAt
        updatedAt
        user {
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
      }
      totalCount
      page
      limit
      totalPages
    }
  }
`;

export const GET_MY_LEAVES = gql`
  query GetMyLeaves($status: String, $year: Int, $page: Int, $limit: Int) {
    myLeaves(status: $status, year: $year, page: $page, limit: $limit) {
      leaves {
        id
        userId
        leaveType
        durationType
        startDate
        endDate
        hours
        reason
        status
        approvedBy
        approvedAt
        rejectionReason
        isBackDated
        isPositiveLeave
        createdAt
        updatedAt
        user {
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
      }
      totalCount
      page
      limit
      totalPages
    }
  }
`;

export const GET_PENDING_LEAVE_APPROVALS = gql`
  query GetPendingLeaveApprovals($page: Int, $limit: Int) {
    pendingLeaveApprovals(page: $page, limit: $limit) {
      leaves {
        id
        userId
        leaveType
        durationType
        startDate
        endDate
        hours
        reason
        status
        isBackDated
        isPositiveLeave
        createdAt
        user {
          id
          firstName
          lastName
          email
        }
      }
      totalCount
      page
      limit
      totalPages
    }
  }
`;

export const GET_LEAVE = gql`
  query GetLeave($id: ID!) {
    leave(id: $id) {
      id
      userId
      leaveType
      durationType
      startDate
      endDate
      hours
      reason
      status
      approvedBy
      approvedAt
      rejectionReason
      isBackDated
      isPositiveLeave
      createdAt
      updatedAt
      user {
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
    }
  }
`;

// Leave Mutations
export const APPLY_LEAVE = gql`
  mutation ApplyLeave($input: LeaveInput!) {
    applyLeave(input: $input) {
      id
      userId
      leaveType
      durationType
      startDate
      endDate
      hours
      reason
      status
      isBackDated
      isPositiveLeave
      createdAt
      user {
        id
        firstName
        lastName
        email
      }
    }
  }
`;

export const UPDATE_LEAVE = gql`
  mutation UpdateLeave($id: ID!, $input: LeaveInput!) {
    updateLeave(id: $id, input: $input) {
      id
      userId
      leaveType
      durationType
      startDate
      endDate
      hours
      reason
      status
      isBackDated
      isPositiveLeave
      updatedAt
    }
  }
`;

export const CANCEL_LEAVE = gql`
  mutation CancelLeave($id: ID!) {
    cancelLeave(id: $id) {
      id
      status
      rejectionReason
      approvedAt
    }
  }
`;

export const APPROVE_LEAVE = gql`
  mutation ApproveLeave($input: LeaveApprovalInput!) {
    approveLeave(input: $input) {
      id
      status
      approvedBy
      approvedAt
      approver {
        id
        firstName
        lastName
        email
      }
    }
  }
`;

export const REJECT_LEAVE = gql`
  mutation RejectLeave($input: LeaveApprovalInput!) {
    rejectLeave(input: $input) {
      id
      status
      approvedBy
      approvedAt
      rejectionReason
      approver {
        id
        firstName
        lastName
        email
      }
    }
  }
`;
