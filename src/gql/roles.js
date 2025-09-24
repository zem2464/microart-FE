import { gql } from '@apollo/client';

export const GET_ROLES = gql`
  query Roles {
    roles {
      id
      name
      description
      roleType
      permissions
      createdBy
      updatedBy
      deletedAt
    }
  }
`;

export const CREATE_ROLE = gql`
  mutation CreateRole($input: CreateRoleInput!) {
    createRole(input: $input) {
      id
      name
      description
      roleType
      permissions
      createdBy
      updatedBy
      deletedAt
    }
  }
`;

export const UPDATE_ROLE = gql`
  mutation UpdateRole($id: ID!, $input: UpdateRoleInput!) {
    updateRole(id: $id, input: $input) {
      id
      name
      description
      roleType
      permissions
      createdBy
      updatedBy
      deletedAt
    }
  }
`;

export const DELETE_ROLE = gql`
  mutation DeleteRole($id: ID!) {
    deleteRole(id: $id)
  }
`;
