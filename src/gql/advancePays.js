import { gql } from '@apollo/client';

export const GET_ADVANCE_PAYS = gql`
  query GetAdvancePays($userId: ID, $fromDate: String, $toDate: String, $isDeducted: Boolean) {
    advancePays(userId: $userId, fromDate: $fromDate, toDate: $toDate, isDeducted: $isDeducted) {
      id
      userId
      user {
        id
        firstName
        lastName
        email
      }
      amount
      paymentType
      paymentDate
      remarks
      isDeducted
      deductedMonth
      deductedYear
      createdAt
      updatedAt
    }
  }
`;

export const GET_ADVANCE_PAY = gql`
  query GetAdvancePay($id: ID!) {
    advancePay(id: $id) {
      id
      userId
      user {
        id
        firstName
        lastName
        email
      }
      amount
      paymentType
      paymentDate
      remarks
      isDeducted
      deductedMonth
      deductedYear
      createdAt
      updatedAt
    }
  }
`;

export const GET_USER_ADVANCE_PAYS_FOR_MONTH = gql`
  query GetUserAdvancePaysForMonth($userId: ID!, $year: Int!, $month: Int!) {
    userAdvancePaysByMonth(userId: $userId, year: $year, month: $month) {
      id
      amount
      paymentType
      paymentDate
      remarks
      createdAt
    }
  }
`;

export const CREATE_ADVANCE_PAY = gql`
  mutation CreateAdvancePay(
    $userId: ID!
    $amount: Float!
    $paymentType: String!
    $paymentDate: String!
    $remarks: String
  ) {
    createAdvancePay(
      userId: $userId
      amount: $amount
      paymentType: $paymentType
      paymentDate: $paymentDate
      remarks: $remarks
    ) {
      id
      userId
      user {
        id
        firstName
        lastName
        email
      }
      amount
      paymentType
      paymentDate
      remarks
      isDeducted
      createdAt
    }
  }
`;

export const UPDATE_ADVANCE_PAY = gql`
  mutation UpdateAdvancePay($id: ID!, $input: UpdateAdvancePayInput!) {
    updateAdvancePay(id: $id, input: $input) {
      id
      userId
      user {
        id
        firstName
        lastName
      }
      amount
      paymentType
      paymentDate
      remarks
      isDeducted
      updatedAt
    }
  }
`;

export const DELETE_ADVANCE_PAY = gql`
  mutation DeleteAdvancePay($id: ID!) {
    deleteAdvancePay(id: $id)
  }
`;
