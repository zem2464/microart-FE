import { gql } from '@apollo/client';

// Payment Types Queries
export const GET_PAYMENT_TYPES = gql`
  query GetPaymentTypes {
    paymentTypes {
      id
      name
      type
      accountNumber
      bankName
      upiId
      currentBalance
      isActive
      sortOrder
      createdAt
      updatedAt
    }
  }
`;

export const GET_PAYMENT_TYPE = gql`
  query GetPaymentType($id: ID!) {
    paymentType(id: $id) {
      id
      name
      type
      accountNumber
      bankName
      upiId
      description
      openingBalance
      currentBalance
      isActive
      sortOrder
      createdAt
      updatedAt
    }
  }
`;

// Payment Types Mutations
export const CREATE_PAYMENT_TYPE = gql`
  mutation CreatePaymentType($input: PaymentTypeInput!) {
    createPaymentType(input: $input) {
      id
      name
      type
      accountNumber
      bankName
      upiId
      currentBalance
      isActive
      sortOrder
      createdAt
    }
  }
`;

export const UPDATE_PAYMENT_TYPE = gql`
  mutation UpdatePaymentType($id: ID!, $input: PaymentTypeUpdateInput!) {
    updatePaymentType(id: $id, input: $input) {
      id
      name
      type
      accountNumber
      bankName
      upiId
      currentBalance
      isActive
      sortOrder
      updatedAt
    }
  }
`;
