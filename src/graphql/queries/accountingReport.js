import { gql } from '@apollo/client';

export const GET_ACCOUNTING_REPORT = gql`
  query GetAccountingReport($startDate: String, $endDate: String) {
    accountingReport(startDate: $startDate, endDate: $endDate) {
      startDate
      endDate
      directIncome {
        clientPayments
        categories {
          categoryId
          categoryName
          amount
        }
        total
      }
      directExpense {
        categories {
          categoryId
          categoryName
          amount
        }
        salariesPaid
        total
      }
      indirectIncome {
        categories {
          categoryId
          categoryName
          amount
        }
        total
      }
      indirectExpense {
        categories {
          categoryId
          categoryName
          amount
        }
        total
      }
      totalIncome
      totalExpense
      netIncome
    }
  }
`;
