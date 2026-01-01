import { gql } from '@apollo/client';

export const TEST_PUSH_NOTIFICATION = gql`
  mutation TestPushNotification($userId: ID, $title: String, $body: String) {
    testPushNotification(userId: $userId, title: $title, body: $body)
  }
`;
