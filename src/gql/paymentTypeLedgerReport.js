import { gql } from "@apollo/client";

/**
 * GraphQL queries and mutations for Payment Type Ledger Report
 */

// Get all payment types for report selection dropdown
export const GET_PAYMENT_TYPES_FOR_REPORT = gql`
  query GetPaymentTypesForReport {
    paymentTypesForReport {
      id
      name
      type
      accountNumber
      bankName
      currentBalance
      isActive
    }
  }
`;

// Get comprehensive payment type ledger report
export const GET_PAYMENT_TYPE_LEDGER_REPORT = gql`
  query GetPaymentTypeLedgerReport($filter: PaymentTypeLedgerReportFilter!) {
    paymentTypeLedgerReport(filter: $filter) {
      paymentType {
        id
        name
        type
        accountNumber
        bankName
        upiId
        openingBalance
        currentBalance
      }
      dateFrom
      dateTo
      summary {
        openingBalance
        totalDebit
        totalCredit
        closingBalance
        transactionCount
      }
      transactions {
        id
        transactionDate
        valueDate
        transactionType
        referenceNumber
        description
        particulars
        debitAmount
        creditAmount
        runningBalance
        relatedEntityType
        relatedEntityId
        categoryName
        notes
        createdBy {
          id
          firstName
          lastName
        }
      }
      typeBreakdown {
        transactionType
        count
        totalDebit
        totalCredit
      }
    }
  }
`;

// Transaction type labels for display
export const TRANSACTION_TYPE_LABELS = {
  EXPENSE: 'Expense',
  INCOME: 'Income',
  CLIENT_PAYMENT: 'Client Payment',
  SALARY_PAYMENT: 'Salary Payment',
  TRANSFER_IN: 'Transfer In',
  TRANSFER_OUT: 'Transfer Out',
  OPENING_BALANCE: 'Opening Balance'
};

// Transaction type colors for UI
export const TRANSACTION_TYPE_COLORS = {
  EXPENSE: 'red',
  INCOME: 'green',
  CLIENT_PAYMENT: 'blue',
  SALARY_PAYMENT: 'orange',
  TRANSFER_IN: 'cyan',
  TRANSFER_OUT: 'purple',
  OPENING_BALANCE: 'default'
};
