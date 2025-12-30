import { gql } from '@apollo/client';

export const GENERATE_MONTHLY_SALARIES = gql`
  mutation GenerateMonthlySalaries($year: Int!, $month: Int!) {
    generateMonthlySalaries(year: $year, month: $month) {
      id
      userId
      user {
        id
        firstName
        lastName
        email
        payType
        salaryAmount
        monthlyHours
        paymentDetails
      }
      year
      month
      monthlySalary
      monthlyHours
      actualHours
      advancePay
      paymentType
      paymentTypeId
      paymentMethod {
        id
        name
        type
      }
      totalToPay
      isPaid
      paidDate
      paidAmount
      notes
      createdAt
      updatedAt
    }
  }
`;

export const GET_USER_SALARIES = gql`
  query GetUserSalaries($year: Int!, $month: Int!, $isPaid: Boolean) {
    userSalaries(year: $year, month: $month, isPaid: $isPaid) {
      id
      userId
      user {
        id
        firstName
        lastName
        email
        payType
        salaryAmount
        salaryType
        hourlyRate
        monthlyHours
        paymentDetails
      }
      year
      month
      monthlySalary
      monthlyHours
      actualHours
      advancePay
      paymentType
      paymentTypeId
      paymentMethod {
        id
        name
        type
      }
      totalToPay
      isPaid
      paidDate
      paidAmount
      notes
      createdAt
      updatedAt
    }
  }
`;

export const GET_USER_SALARY = gql`
  query GetUserSalary($id: ID!) {
    userSalary(id: $id) {
      id
      userId
      user {
        id
        firstName
        lastName
        email
        payType
        salaryAmount
        salaryType
        hourlyRate
        monthlyHours
        paymentDetails
      }
      year
      month
      monthlySalary
      monthlyHours
      actualHours
      advancePay
      paymentType
      paymentTypeId
      paymentMethod {
        id
        name
        type
      }
      totalToPay
      isPaid
      paidDate
      paidAmount
      notes
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_USER_SALARY = gql`
  mutation CreateUserSalary($input: CreateUserSalaryInput!) {
    createUserSalary(input: $input) {
      id
      userId
      user {
        id
        firstName
        lastName
        email
        paymentDetails
      }
      year
      month
      monthlySalary
      monthlyHours
      actualHours
      advancePay
      paymentType
      paymentTypeId
      paymentMethod {
        id
        name
        type
      }
      totalToPay
      isPaid
      paidDate
      notes
      createdAt
    }
  }
`;

export const UPDATE_USER_SALARY = gql`
  mutation UpdateUserSalary($id: ID!, $input: UpdateUserSalaryInput!) {
    updateUserSalary(id: $id, input: $input) {
      id
      userId
      user {
        id
        firstName
        lastName
        paymentDetails
      }
      year
      month
      monthlySalary
      monthlyHours
      actualHours
      advancePay
      paymentType
      paymentTypeId
      paymentMethod {
        id
        name
        type
      }
      totalToPay
      isPaid
      paidDate
      notes
      updatedAt
    }
  }
`;

export const MARK_USER_SALARY_PAID = gql`
  mutation MarkUserSalaryPaid($id: ID!, $input: MarkUserSalaryPaidInput!) {
    markUserSalaryPaid(id: $id, input: $input) {
      id
      userId
      user {
        id
        firstName
        lastName
        paymentDetails
      }
      year
      month
      monthlySalary
      monthlyHours
      actualHours
      advancePay
      paymentType
      paymentTypeId
      paymentMethod {
        id
        name
        type
      }
      totalToPay
      isPaid
      paidDate
      paidAmount
      notes
      updatedAt
    }
  }
`;

export const BULK_UPDATE_USER_SALARIES = gql`
  mutation BulkUpdateUserSalaries($updates: [UserSalaryUpdateInput!]!) {
    bulkUpdateUserSalaries(updates: $updates) {
      id
      userId
      user {
        id
        firstName
        lastName
        paymentDetails
      }
      year
      month
      monthlySalary
      monthlyHours
      actualHours
      advancePay
      paymentType
      paymentTypeId
      paymentMethod {
        id
        name
        type
      }
      totalToPay
      isPaid
      paidDate
      paidAmount
      notes
      updatedAt
    }
  }
`;
