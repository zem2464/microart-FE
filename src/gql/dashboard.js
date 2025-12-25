import { gql } from '@apollo/client';

/**
 * Front Office Dashboard Queries
 * Provides role-based dashboard data for different user types
 */

// Get users on leave (fetch all approved leaves, filter client-side)
export const GET_USERS_ON_LEAVE = gql`
  query GetUsersOnLeave {
    leaves(
      status: "APPROVED"
      page: 1
      limit: 100
    ) {
      leaves {
        id
        userId
        leaveType
        durationType
        startDate
        endDate
        hours
        user {
          id
          firstName
          lastName
          email
        }
      }
      totalCount
    }
  }
`;

// Get my task statistics for current month (for employees)
export const GET_MY_TASK_STATS = gql`
  query GetMyTaskStats($dateFrom: String!, $dateTo: String!) {
    userWorkDashboard(
      dateFrom: $dateFrom
      dateTo: $dateTo
    ) {
      users {
        userId
        userName
        totalCompletedImages
        gradingBreakdown {
          gradingId
          gradingName
          gradingShortCode
          workType
          completedImages
          projects {
            projectCode
            projectName
            imageQuantity
          }
        }
      }
      summary {
        totalUsers
        totalCompletedImages
      }
    }
  }
`;

// Get all projects overview (for admin)
export const GET_PROJECTS_OVERVIEW = gql`
  query GetProjectsOverview(
    $filters: ProjectFilterInput
    $page: Int = 1
    $limit: Int = 100
  ) {
    projects(
      filters: $filters
      page: $page
      limit: $limit
      sortBy: "updatedAt"
      sortOrder: "DESC"
    ) {
      projects {
        id
        projectCode
        name
        status
        priority
        deadlineDate
        totalImageQuantity
        taskCount
        completedTaskCount
        client {
          id
          clientCode
          displayName
          companyName
        }
        invoiceId
        invoice {
          id
          invoiceNumber
          totalAmount
          balanceAmount
          status
        }
        createdAt
        updatedAt
      }
      pagination {
        page
        limit
        totalItems
        totalPages
      }
    }
  }
`;

// Get completed projects without payment (walk-in clients)
export const GET_COMPLETED_PROJECTS_NO_PAYMENT = gql`
  query GetCompletedProjectsNoPayment($page: Int = 1, $limit: Int = 50) {
    projects(
      filters: { status: COMPLETED }
      page: $page
      limit: $limit
      sortBy: "updatedAt"
      sortOrder: "DESC"
    ) {
      projects {
        id
        projectCode
        name
        status
        deadlineDate
        totalImageQuantity
        totalEstimatedCost
        totalActualCost
        taskCount
        completedTaskCount
        client {
          id
          clientCode
          displayName
          companyName
          clientType
        }
        invoiceId
        invoice {
          id
          invoiceNumber
          totalAmount
          balanceAmount
          status
        }
        createdAt
        updatedAt
      }
      pagination {
        page
        limit
        totalItems
        totalPages
      }
    }
  }
`;

// Get pending leave approvals (for admin/manager)
export const GET_DASHBOARD_PENDING_LEAVES = gql`
  query GetDashboardPendingLeaves {
    pendingLeaveApprovals(page: 1, limit: 20) {
      leaves {
        id
        userId
        leaveType
        durationType
        startDate
        endDate
        hours
        reason
        isBackDated
        createdAt
        user {
          id
          firstName
          lastName
          email
        }
      }
      totalCount
    }
  }
`;

// Get my active projects with task breakdown
export const GET_MY_ACTIVE_PROJECTS = gql`
  query GetMyActiveProjects(
    $filters: ProjectFilterInput
    $page: Int = 1
    $limit: Int = 20
  ) {
    projects(
      filters: $filters
      page: $page
      limit: $limit
      sortBy: "updatedAt"
      sortOrder: "DESC"
    ) {
      projects {
        id
        projectCode
        name
        status
        priority
        deadlineDate
        totalImageQuantity
        taskCount
        completedTaskCount
        client {
          id
          displayName
        }
        projectWorkTypes {
          id
          workType {
            id
            name
          }
        }
        updatedAt
      }
      pagination {
        totalItems
      }
    }
  }
`;

// Get project statistics by status (for admin dashboard)
export const GET_PROJECT_STATS_BY_STATUS = gql`
  query GetProjectStatsByStatus {
    projectStats {
      totalProjects
      activeProjects
      completedProjects
      onHoldProjects
      cancelledProjects
      totalRevenue
      pendingRevenue
    }
  }
`;
