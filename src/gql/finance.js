import { gql } from "@apollo/client";

export const GET_FINANCE_DASHBOARD = gql`
  query GetFinanceDashboard {
    financeDashboard {
      totalIncome
      totalExpense
      netBalance
      upcomingExpenses {
        id
        description
        amount
        dueDate
        status
        recurringFrequency
      }
      upcomingIncomes {
        id
        description
        amount
        dueDate
        status
        recurringFrequency
      }
    }
  }
`;

export const GET_EXPENSES = gql`
  query GetExpenses($status: FinanceStatus, $isRecurring: Boolean, $limit: Int, $offset: Int) {
    expenses(status: $status, isRecurring: $isRecurring, limit: $limit, offset: $offset) {
      total
      items {
        id
        description
        amount
        category
        status
        dueDate
        paidDate
        isRecurring
        recurringFrequency
        recurringEndDate
        paymentType {
          id
          name
          type
        }
        createdAt
      }
    }
  }
`;

export const GET_INCOMES = gql`
  query GetIncomes($status: FinanceStatus, $isRecurring: Boolean, $limit: Int, $offset: Int) {
    incomes(status: $status, isRecurring: $isRecurring, limit: $limit, offset: $offset) {
      total
      items {
        id
        description
        source
        amount
        status
        dueDate
        receivedDate
        isRecurring
        recurringFrequency
        recurringEndDate
        paymentType {
          id
          name
          type
        }
        createdAt
      }
    }
  }
`;

export const GET_PAYMENT_TYPE_LEDGER = gql`
  query GetPaymentTypeLedger($paymentTypeId: ID!, $dateFrom: String, $dateTo: String) {
    paymentTypeLedger(paymentTypeId: $paymentTypeId, dateFrom: $dateFrom, dateTo: $dateTo) {
      paymentType {
        id
        name
        type
        openingBalance
        currentBalance
      }
      openingBalance
      closingBalance
      totalIncome
      totalExpense
      transactions {
        id
        date
        type
        description
        amount
        status
        balanceAfter
      }
    }
  }
`;

export const CREATE_EXPENSE = gql`
  mutation CreateExpense($input: ExpenseInput!) {
    createExpense(input: $input) {
      id
      description
      amount
      status
      dueDate
      paidDate
      isRecurring
      recurringFrequency
      paymentType {
        id
        name
      }
    }
  }
`;

export const CREATE_INCOME = gql`
  mutation CreateIncome($input: IncomeInput!) {
    createIncome(input: $input) {
      id
      description
      amount
      status
      dueDate
      receivedDate
      isRecurring
      recurringFrequency
      paymentType {
        id
        name
      }
    }
  }
`;

export const MARK_EXPENSE_PAID = gql`
  mutation MarkExpensePaid($id: ID!, $paymentTypeId: ID!, $paidDate: String, $markNextAsPaid: Boolean) {
    markExpensePaid(id: $id, paymentTypeId: $paymentTypeId, paidDate: $paidDate, markNextAsPaid: $markNextAsPaid) {
      expense {
        id
        status
        paidDate
        paymentType {
          id
          name
        }
      }
      nextExpense {
        id
        status
        dueDate
        paidDate
      }
    }
  }
`;

export const MARK_INCOME_RECEIVED = gql`
  mutation MarkIncomeReceived($id: ID!, $paymentTypeId: ID!, $receivedDate: String, $markNextAsReceived: Boolean) {
    markIncomeReceived(id: $id, paymentTypeId: $paymentTypeId, receivedDate: $receivedDate, markNextAsReceived: $markNextAsReceived) {
      income {
        id
        status
        receivedDate
        paymentType {
          id
          name
        }
      }
      nextIncome {
        id
        status
        dueDate
        receivedDate
      }
    }
  }
`;
