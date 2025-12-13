import { gql } from '@apollo/client';

// User Work Dashboard Query with Pagination
export const GET_USER_WORK_DASHBOARD = gql`
  query GetUserWorkDashboard(
    $dateFrom: String
    $dateTo: String
    $userId: ID
    $limit: Int
    $offset: Int
  ) {
    userWorkDashboard(
      dateFrom: $dateFrom
      dateTo: $dateTo
      userId: $userId
      limit: $limit
      offset: $offset
    ) {
      users {
        userId
        userName
        userEmail
        totalCompletedImages
        workByDate {
          date
          completedImages
          tasks {
            taskId
            taskCode
            taskType
            projectCode
            clientName
            completedImageQuantity
            status
            gradingName
            gradingShortCode
            workType
          }
        }
        gradingBreakdown {
          gradingId
          gradingName
          gradingShortCode
          workType
          completedImages
        }
      }
      summary {
        totalUsers
        totalCompletedImages
      }
      hasMore
      totalCount
    }
  }
`;
