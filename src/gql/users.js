import { gql } from '@apollo/client';

export const GET_USERS = gql`
  query Users {
    users {
      id
      firstName
      lastName
      email
      contactPersonal
      contactHome
      dateOfBirth
      joiningDate
      address
      roleId
      role {
        id
        name
        roleType
        permissions
      }
      isEmployee
      isServiceProvider
      payType
      salaryType
      salaryAmount
      hourlyRate
      monthlyHours
      paymentDetails
      canLogin
      hasSetInitialPassword
      isActive
      isSystemDefine
      createdBy
      updatedBy
      deletedAt
      createdAt
      updatedAt
      userWorkTypes {
        id
        workTypeId
        isActive
        workType {
          id
          name
        }
      }
      workTypes {
        id
        name
      }
    }
  }
`;

export const GET_USER = gql`
  query User($id: ID!) {
    user(id: $id) {
      id
      firstName
      lastName
      email
      contactPersonal
      contactHome
      dateOfBirth
      joiningDate
      address
      roleId
      role {
        id
        name
        roleType
        permissions
      }
      isEmployee
      isServiceProvider
      payType
      salaryType
      salaryAmount
      hourlyRate
      monthlyHours
      paymentDetails
      canLogin
      hasSetInitialPassword
      isActive
      isSystemDefine
      createdBy
      updatedBy
      deletedAt
      createdAt
      updatedAt
      userWorkTypes {
        id
        workTypeId
        isActive
        workType {
          id
          name
        }
      }
      workTypes {
        id
        name
      }
    }
  }
`;

export const CREATE_USER = gql`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      id
      firstName
      lastName
      email
      contactPersonal
      contactHome
      dateOfBirth
      joiningDate
      address
      roleId
      role {
        id
        name
        roleType
      }
      isServiceProvider
      isEmployee
      payType
      salaryType
      salaryAmount
      hourlyRate
      monthlyHours
      paymentDetails
      canLogin
      hasSetInitialPassword
      isActive
      createdBy
      updatedBy
      userWorkTypes {
        id
        workTypeId
        isActive
        workType {
          id
          name
        }
      }
      workTypes {
        id
        name
      }
    }
  }
`;

export const UPDATE_USER = gql`
  mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
    updateUser(id: $id, input: $input) {
      id
      firstName
      lastName
      email
      contactPersonal
      contactHome
      dateOfBirth
      joiningDate
      address
      roleId
      role {
        id
        name
        roleType
      }
      isEmployee
      isServiceProvider
      payType
      salaryType
      salaryAmount
      hourlyRate
      monthlyHours
      paymentDetails
      canLogin
      hasSetInitialPassword
      isActive
      updatedBy
      userWorkTypes {
        id
        workTypeId
        isActive
        workType {
          id
          name
        }
      }
      workTypes {
        id
        name
      }
    }
  }
`;

export const DELETE_USER = gql`
  mutation DeleteUser($id: ID!) {
    deleteUser(id: $id)
  }
`;