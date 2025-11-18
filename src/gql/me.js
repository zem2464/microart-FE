import { gql } from '@apollo/client';

export const ME_QUERY = gql`
  query Me {
    me {
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
      roleId
    }
  }
`;
