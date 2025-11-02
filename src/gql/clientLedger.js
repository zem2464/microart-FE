import { gql } from '@apollo/client';

// Client Ledger Queries
export const GET_CLIENT_LEDGER_SUMMARY = gql`
  query GetClientLedgerSummary($clientId: ID!) {
    clientLedgerSummary(clientId: $clientId) {
      client {
        id
        clientCode
        displayName
        companyName
        creditLimit
        currentBalance
        isCreditEnabled
        creditDays
      }
      summary {
        totalInvoiced
        totalPaid
        totalOutstanding
        totalCreditBlocked
        availableCredit
        creditUtilization
      }
      invoices {
        id
        invoiceNumber
        projectCode
        invoiceDate
        dueDate
        totalAmount
        paidAmount
        balanceAmount
        status
        project {
          id
          projectCode
          description
        }
      }
      payments {
        id
        paymentNumber
        paymentDate
        amount
        totalAllocated
        unallocatedAmount
        status
        paymentType {
          id
          name
          type
        }
        allocations {
          id
          allocatedAmount
          invoice {
            id
            invoiceNumber
          }
        }
      }
    }
  }
`;

export const GET_CLIENT_TRANSACTIONS = gql`
  query GetClientTransactions(
    $clientId: ID!
    $filters: ClientTransactionFilters
    $pagination: PaginationInput
  ) {
    clientTransactions(
      clientId: $clientId
      filters: $filters
      pagination: $pagination
    ) {
      transactions {
        id
        transactionType
        amount
        balanceAfter
        description
        transactionDate
        referenceNumber
        project {
          id
          projectCode
          description
        }
        invoice {
          id
          invoiceNumber
        }
        payment {
          id
          paymentNumber
        }
        createdBy {
          id
          firstName
          lastName
        }
      }
      pagination {
        page
        limit
        totalItems
        totalPages
        hasNext
        hasPrevious
      }
    }
  }
`;

export const GET_CLIENT_LEDGER_RANGE = gql`
  query GetClientLedgerRange($clientId: ID!, $dateFrom: String!, $dateTo: String!, $pagination: PaginationInput) {
    clientLedgerRange(clientId: $clientId, dateFrom: $dateFrom, dateTo: $dateTo, pagination: $pagination) {
      openingBalance
      closingBalance
      transactions {
        id
        transactionType
        amount
        debitAmount
        creditAmount
        balanceAfter
        description
        transactionDate
        referenceNumber
        status
        project {
          id
          projectCode
          description
        }
        invoice {
          id
          invoiceNumber
        }
        payment {
          id
          paymentNumber
        }
        createdBy {
          id
          firstName
          lastName
        }
        createdAt
      }
      pagination {
        page
        limit
        totalItems
        totalPages
        hasNext
        hasPrevious
      }
    }
  }
`;

export const GET_CLIENT_CREDIT_BLOCKED_PROJECTS = gql`
  query GetClientCreditBlockedProjects($clientId: ID!) {
    clientCreditBlockedProjects(clientId: $clientId) {
      id
      projectCode
      description
      creditBlockedAmount
      creditBlockedAt
      estimatedCost
      actualCost
      workType {
        id
        name
      }
      grading {
        id
        name
      }
      createdAt
    }
  }
`;

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
    }
  }
`;

export const GET_CLIENT_INVOICES = gql`
  query GetClientInvoices(
    $clientId: ID!
    $filters: InvoiceFilters
    $pagination: PaginationInput
  ) {
    clientInvoices(
      clientId: $clientId
      filters: $filters
      pagination: $pagination
    ) {
      invoices {
        id
        invoiceNumber
        projectCode
        invoiceDate
        dueDate
        subtotalAmount
        taxAmount
        discountAmount
        totalAmount
        paidAmount
        balanceAmount
        status
        imageQuantityInvoiced
        ratePerImage
        creditBlockedAmount
        creditBlockedAt
        creditReleasedAt
        project {
          id
          projectCode
          description
          workType {
            id
            name
          }
        }
        allocations {
          id
          allocatedAmount
          allocationDate
          isAutoAllocated
          payment {
            id
            paymentNumber
            paymentDate
            paymentType {
              name
              type
            }
          }
        }
      }
      pagination {
        page
        limit
        totalItems
        totalPages
        hasNext
        hasPrevious
      }
    }
  }
`;

export const GET_CLIENT_PAYMENTS = gql`
  query GetClientPayments(
    $clientId: ID!
    $filters: PaymentFilters
    $pagination: PaginationInput
  ) {
    clientPayments(
      clientId: $clientId
      filters: $filters
      pagination: $pagination
    ) {
      payments {
        id
        paymentNumber
        paymentDate
        amount
        totalAllocated
        unallocatedAmount
        status
        referenceNumber
        bankName
        chequeDate
        notes
        paymentType {
          id
          name
          type
          accountNumber
          bankName
          upiId
        }
        allocations {
          id
          allocatedAmount
          allocationDate
          isAutoAllocated
          invoice {
            id
            invoiceNumber
            totalAmount
            project {
              projectCode
            }
          }
        }
      }
      pagination {
        page
        limit
        totalItems
        totalPages
        hasNext
        hasPrevious
      }
    }
  }
`;

// Client Ledger Mutations
export const RECORD_CLIENT_PAYMENT = gql`
  mutation RecordClientPayment($input: ClientPaymentInput!) {
    recordClientPayment(input: $input) {
      success
      message
      payment {
        id
        paymentNumber
        paymentDate
        amount
        totalAllocated
        unallocatedAmount
        status
        paymentType {
          name
          type
        }
      }
      allocations {
        invoiceId
        invoiceNumber
        allocatedAmount
      }
    }
  }
`;

export const ALLOCATE_PAYMENT_TO_INVOICE = gql`
  mutation AllocatePaymentToInvoice($input: PaymentAllocationInput!) {
    allocatePaymentToInvoice(input: $input) {
      success
      message
      allocation {
        id
        allocatedAmount
        payment {
          paymentNumber
          unallocatedAmount
        status
        }
        invoice {
          invoiceNumber
          balanceAmount
        status
        }
      }
    }
  }
`;

export const GENERATE_PROJECT_INVOICE = gql`
  mutation GenerateProjectInvoice($projectId: ID!) {
    generateProjectInvoice(projectId: $projectId) {
      success
      message
      invoice {
        id
        invoiceNumber
        totalAmount
        dueDate
      }
    }
  }
`;

export const BLOCK_CREDIT_FOR_PROJECT = gql`
  mutation BlockCreditForProject($projectId: ID!) {
    blockCreditForProject(projectId: $projectId) {
      success
      message
      project {
        id
        creditBlockedAmount
        creditBlockedAt
      }
      client {
        availableCredit
        creditUtilization
      }
    }
  }
`;

export const RELEASE_BLOCKED_CREDIT = gql`
  mutation ReleaseBlockedCredit($projectId: ID!) {
    releaseBlockedCredit(projectId: $projectId) {
      success
      message
      project {
        id
        creditReleasedAt
      }
      client {
        availableCredit
        creditUtilization
      }
    }
  }
`;