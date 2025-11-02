import { gql } from '@apollo/client';

// Transaction Queries
export const GET_CLIENT_TRANSACTIONS = gql`
  query GetClientTransactions($filters: ClientTransactionFilters) {
    clientTransactions(filters: $filters) {
      id
      client {
        id
        clientCode
        firstName
        lastName
        displayName
        companyName
      }
      transactionType
      amount
      description
      referenceNumber
      paymentMethod
      paymentDate
      dueDate
      status
      status
      balanceAfter
      attachments
      notes
      creator {
        id
        firstName
        lastName
      }
      createdAt
      updatedAt
    }
  }
`;

export const GET_CLIENT_TRANSACTION = gql`
  query GetClientTransaction($id: ID!) {
    clientTransaction(id: $id) {
      id
      client {
        id
        clientCode
        firstName
        lastName
        displayName
        companyName
        email
      }
      transactionType
      amount
      description
      referenceNumber
      paymentMethod
      paymentDate
      dueDate
      status
      balanceAfter
      attachments
      notes
      creator {
        id
        firstName
        lastName
      }
      updater {
        id
        firstName
        lastName
      }
      createdAt
      updatedAt
    }
  }
`;

export const GET_TRANSACTIONS_BY_CLIENT = gql`
  query GetTransactionsByClient($clientId: ID!, $filters: ClientTransactionFilters) {
    transactionsByClient(clientId: $clientId, filters: $filters) {
      id
      transactionType
      amount
      description
      referenceNumber
      paymentMethod
      paymentDate
      dueDate
      status
      balanceAfter
      attachments
      notes
      createdAt
    }
  }
`;

export const GET_TRANSACTIONS_SUMMARY = gql`
  query GetTransactionsSummary($clientId: ID, $dateFrom: String, $dateTo: String) {
    transactionsSummary(clientId: $clientId, dateFrom: $dateFrom, dateTo: $dateTo) {
      totalTransactions
      totalInvoiced
      totalPaid
      totalPending
      totalOverdue
      averageTransactionAmount
      largestTransaction
      paymentMethods {
        method
        count
        totalAmount
      }
    }
  }
`;

export const GET_PENDING_PAYMENTS = gql`
  query GetPendingPayments {
    pendingPayments {
      id
      client {
        id
        clientCode
        firstName
        lastName
        displayName
        companyName
      }
      transactionType
      amount
      description
      referenceNumber
      paymentDate
      dueDate
      status
      balanceAfter
    }
  }
`;

export const GET_OVERDUE_PAYMENTS = gql`
  query GetOverduePayments {
    overduePayments {
      id
      client {
        id
        clientCode
        firstName
        lastName
        displayName
        companyName
      }
      transactionType
      amount
      description
      referenceNumber
      paymentDate
      dueDate
      status
      balanceAfter
    }
  }
`;

// Transaction Mutations
export const CREATE_CLIENT_TRANSACTION = gql`
  mutation CreateClientTransaction($input: ClientTransactionInput!) {
    createClientTransaction(input: $input) {
      id
      client {
        id
        clientCode
        companyName
      }
      transactionType
      amount
      description
      referenceNumber
      paymentMethod
      paymentDate
      dueDate
      status
      balanceAfter
      createdAt
    }
  }
`;

export const UPDATE_CLIENT_TRANSACTION = gql`
  mutation UpdateClientTransaction($id: ID!, $input: ClientTransactionUpdateInput!) {
    updateClientTransaction(id: $id, input: $input) {
      id
      transactionType
      amount
      description
      referenceNumber
      paymentMethod
      paymentDate
      dueDate
      status
      balanceAfter
      updatedAt
    }
  }
`;

export const DELETE_CLIENT_TRANSACTION = gql`
  mutation DeleteClientTransaction($id: ID!) {
    deleteClientTransaction(id: $id)
  }
`;

export const MARK_TRANSACTION_AS_PAID = gql`
  mutation MarkTransactionAsPaid($id: ID!, $paymentDetails: PaymentDetailsInput!) {
    markTransactionAsPaid(id: $id, paymentDetails: $paymentDetails) {
      id
      transactionType
      amount
      balanceAfter
      paymentMethod
      referenceNumber
      paymentDate
      updatedAt
    }
  }
`;

export const REVERSE_TRANSACTION = gql`
  mutation ReverseTransaction($id: ID!, $reason: String!) {
    reverseTransaction(id: $id, reason: $reason) {
      id
      transactionType
      amount
      description
      balanceAfter
      notes
      createdAt
    }
  }
`;