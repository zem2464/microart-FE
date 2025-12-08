import { gql } from '@apollo/client';

export const GET_USERS = gql`
  query GetUsers {
    users {
      id
      firstName
      lastName
      email
      roleId
      isActive
    }
  }
`;

export const SAVE_PUSH_SUBSCRIPTION = gql`
  mutation SavePushSubscription($subscription: JSON!) {
    savePushSubscription(subscription: $subscription)
  }
`;