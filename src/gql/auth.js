import { gql } from '@apollo/client';

export const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      user {
        id
        email
        firstName
        lastName
        role {
          id
          name
          permissions
        }
      }
    }
  }
`;

export const LOGOUT_QUERY = gql`
  query Logout {
    logout
  }
`;

export const LOGOUT_MUTATION = gql`
  mutation Logout {
    logout
  }
`;

export const SET_INITIAL_PASSWORD_MUTATION = gql`
  mutation SetInitialPassword($email: String!, $password: String!, $deviceInfo: DeviceInfoInput) {
    setInitialPassword(email: $email, password: $password, deviceInfo: $deviceInfo) {
      user {
        id
        email
        firstName
        lastName
        role {
          id
          name
          permissions
        }
      }
    }
  }
`;

export const CHANGE_EXPIRE_PASSWORD_MUTATION = gql`
  mutation ChangeExpirePassword($email: String!, $password: String!, $newPassword: String!, $deviceInfo: DeviceInfoInput) {
    changeExpirePassword(email: $email, password: $password, newPassword: $newPassword, deviceInfo: $deviceInfo) {
      user {
        id
        email
        firstName
        lastName
        role {
          id
          name
          permissions
        }
      }
    }
  }
`;
