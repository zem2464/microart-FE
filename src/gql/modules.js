import { gql } from '@apollo/client';

export const GET_DEFAULT_PERMISSION_MODULES = gql`
  query GetDefaultPermissionModules {
    defaultPermissionModules {
      name
      actions
    }
  }
`;
