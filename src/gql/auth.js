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
          roleType
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
  mutation SetInitialPassword($email: String!, $newPassword: String!) {
    setInitialPassword(email: $email, newPassword: $newPassword) {
      success
      message
    }
  }
`;
