import { gql } from '@apollo/client';

// User Work Dashboard Query
export const GET_USER_WORK_DASHBOARD = gql`
  query GetUserWorkDashboard($dateFrom: String, $dateTo: String, $userId: ID) {
    userWorkDashboard(dateFrom: $dateFrom, dateTo: $dateTo, userId: $userId) {
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
    }
  }
`;
