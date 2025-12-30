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
  query GetExpenses($status: FinanceStatus, $type: ExpenseIncomeType, $categoryId: ID, $isRecurring: Boolean, $limit: Int, $offset: Int) {
    expenses(status: $status, type: $type, categoryId: $categoryId, isRecurring: $isRecurring, limit: $limit, offset: $offset) {
      total
      items {
        id
        description
        amount
        category
        type
        categoryId
        expenseCategory {
          id
          name
          type
          description
        }
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
  query GetIncomes($status: FinanceStatus, $type: ExpenseIncomeType, $categoryId: ID, $isRecurring: Boolean, $limit: Int, $offset: Int) {
    incomes(status: $status, type: $type, categoryId: $categoryId, isRecurring: $isRecurring, limit: $limit, offset: $offset) {
      total
      items {
        id
        description
        source
        amount
        type
        categoryId
        incomeCategory {
          id
          name
          type
          description
        }
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
      type
      categoryId
      expenseCategory {
        id
        name
        type
      }
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
      type
      categoryId
      incomeCategory {
        id
        name
        type
      }
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

export const UPDATE_EXPENSE = gql`
  mutation UpdateExpense($id: ID!, $paymentTypeId: ID) {
    updateExpense(id: $id, paymentTypeId: $paymentTypeId) {
      id
      paymentType {
        id
        name
        type
      }
    }
  }
`;

export const UPDATE_INCOME = gql`
  mutation UpdateIncome($id: ID!, $paymentTypeId: ID) {
    updateIncome(id: $id, paymentTypeId: $paymentTypeId) {
      id
      paymentType {
        id
        name
        type
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

// Category Queries and Mutations
export const GET_EXPENSE_INCOME_CATEGORIES = gql`
  query GetExpenseIncomeCategories($type: ExpenseIncomeType, $applicableTo: ApplicableTo, $isActive: Boolean) {
    expenseIncomeCategories(type: $type, applicableTo: $applicableTo, isActive: $isActive) {
      id
      name
      type
      applicableTo
      description
      isActive
      createdAt
      updatedAt
    }
  }
`;

export const GET_EXPENSE_INCOME_CATEGORY = gql`
  query GetExpenseIncomeCategory($id: ID!) {
    expenseIncomeCategory(id: $id) {
      id
      name
      type
      applicableTo
      description
      isActive
    }
  }
`;

export const CREATE_EXPENSE_INCOME_CATEGORY = gql`
  mutation CreateExpenseIncomeCategory($input: ExpenseIncomeCategoryInput!) {
    createExpenseIncomeCategory(input: $input) {
      id
      name
      type
      applicableTo
      description
      isActive
    }
  }
`;

export const UPDATE_EXPENSE_INCOME_CATEGORY = gql`
  mutation UpdateExpenseIncomeCategory($id: ID!, $input: ExpenseIncomeCategoryInput!) {
    updateExpenseIncomeCategory(id: $id, input: $input) {
      id
      name
      type
      applicableTo
      description
      isActive
    }
  }
`;

export const DELETE_EXPENSE_INCOME_CATEGORY = gql`
  mutation DeleteExpenseIncomeCategory($id: ID!) {
    deleteExpenseIncomeCategory(id: $id)
  }
`;

export const GET_CATEGORY_REPORT = gql`
  query GetCategoryReport($type: ExpenseIncomeType, $dateFrom: String, $dateTo: String) {
    categoryReport(type: $type, dateFrom: $dateFrom, dateTo: $dateTo) {
      items {
        category {
          id
          name
          type
        }
        totalExpense
        totalIncome
        netBalance
        expenseCount
        incomeCount
      }
      totalExpense
      totalIncome
      netBalance
    }
  }
`;
