import { gql } from '@apollo/client';

// Client Queries
export const GET_CLIENTS = gql`
  query GetClients(
    $filters: ClientFilters
    $page: Int
    $limit: Int
    $sortBy: String
    $sortOrder: String
  ) {
    clients(
      filters: $filters
      page: $page
      limit: $limit
      sortBy: $sortBy
      sortOrder: $sortOrder
    ) {
      id
      clientCode
      clientType
      firstName
      lastName
      displayName
      companyName
      email
      contactNoWork
      contactNoPersonal
      phone
      address
      pincode
      colorCorrectionStyle
      hasCustomRates
      transferMode
      priority
      clientNotes
      isGstEnabled
      gstNumber
      panCard
      creditDays
      creditAmountLimit
      openingBalance
      accountMessage
      isActive
      totalBalance
      totalPaid
      totalDue
      lastTransactionDate
      country {
        id
        name
        code
      }
      state {
        id
        name
      }
      city {
        id
        name
      }
      workTypeAssociations {
        id
        workType {
          id
          name
        }
        customGradingRate
        isActive
      }
      serviceProviders {
        id
        firstName
        lastName
        email
      }
      createdAt
      updatedAt
    }
    clientsCount(filters: $filters)
  }
`;

export const GET_CLIENT = gql`
  query GetClient($id: ID!) {
    client(id: $id) {
      id
      clientCode
      clientType
      firstName
      lastName
      displayName
      companyName
      email
      contactNoWork
      contactNoPersonal
      address
      pincode
      colorCorrectionStyle
      hasCustomRates
      transferMode
      priority
      clientNotes
      isGstEnabled
      gstNumber
      panCard
      creditDays
      isCreditEnabled
      creditAmountLimit
      openingBalance
      openingBalanceType
      accountMessage
      isActive
      totalBalance
      totalPaid
      totalDue
      lastTransactionDate
      country {
        id
        name
        code
        currency
        dialCode
      }
      state {
        id
        name
        code
      }
      city {
        id
        name
      }
      workTypeAssociations {
        id
        workType {
          id
          name
          description
        }
        customGradingRate
        isActive
      }
      gradings {
        id
        gradingId
        isDefault
        customRate
        currency
        unit
        effectiveRate
        grading {
          id
          name
          shortCode
          description
          defaultRate
          currency
          unit
          workTypeId
          workType {
            id
            name
          }
          taskTypes {
            id
            name
            description
          }
        }
      }
      taskPreferences {
        id
        gradingId
        taskId
        preferredUserIds
        task {
          id
          name
        }
        preferredUsers {
          id
          firstName
          lastName
          email
        }
      }
      serviceProviders {
        id
        firstName
        lastName
        email
        contactPersonal
      }
      leader {
        id
        firstName
        lastName
        email
      }
      transactions {
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
        notes
        createdAt
      }
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

export const GET_STATES = gql`
  query GetStates($countryId: ID!) {
    statesByCountry(countryId: $countryId) {
      id
      name
      code
      country {
        id
        name
      }
    }
  }
`;

export const GET_ACTIVE_CLIENTS = gql`
  query GetActiveClients {
    activeClients {
      id
      clientCode
      companyName
      contactPersonName
      email
      phone
      businessType
      priority
      totalBalance
      country {
        name
      }
      state {
        name
      }
      city {
        name
      }
    }
  }
`;

export const GET_CLIENTS_SUMMARY = gql`
  query GetClientsSummary {
    clientsSummary {
      totalClients
      activeClients
      inactiveClients
      permanentClients
      walkinClients
      clientsWithBalance
      totalOutstandingAmount
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

// Client Mutations
export const CREATE_CLIENT = gql`
  mutation CreateClient($input: ClientInput!) {
    createClient(input: $input) {
      id
      clientCode
      firstName
      lastName
      displayName
      companyName
      email
      clientType
      priority
      transferMode
      isActive
      createdAt
    }
  }
`;

export const UPDATE_CLIENT = gql`
  mutation UpdateClient($id: ID!, $input: ClientUpdateInput!) {
    updateClient(id: $id, input: $input) {
      id
      clientCode
      firstName
      lastName
      displayName
      companyName
      email
      clientType
      priority
      transferMode
      isActive
      updatedAt
    }
  }
`;

export const DELETE_CLIENT = gql`
  mutation DeleteClient($id: ID!) {
    deleteClient(id: $id)
  }
`;



// Work Type Association Queries & Mutations
export const GET_CLIENT_WORK_TYPES = gql`
  query GetClientWorkTypes($clientId: ID!) {
    clientWorkTypesByClient(clientId: $clientId) {
      id
      workType {
        id
        name
        description
      }
      customGradingRate
      isActive
      createdAt
    }
  }
`;

export const CREATE_CLIENT_WORK_TYPE_ASSOCIATION = gql`
  mutation CreateClientWorkTypeAssociation($input: ClientWorkTypeAssociationInput!) {
    createClientWorkTypeAssociation(input: $input) {
      id
      workType {
        id
        name
      }
      customGradingRate
      isActive
    }
  }
`;

// Service Provider Queries & Mutations
export const GET_CLIENT_SERVICE_PROVIDERS = gql`
  query GetClientServiceProviders($clientId: ID!) {
    serviceProvidersByClient(clientId: $clientId) {
      id
      user {
        id
        firstName
        lastName
        email
        contactPersonal
      }
      assignedDate
      isActive
      createdAt
    }
  }
`;

export const ASSIGN_SERVICE_PROVIDER = gql`
  mutation AssignServiceProvider($input: ClientServiceProviderInput!) {
    assignServiceProviderToClient(input: $input) {
      id
      user {
        id
        firstName
        lastName
        email
      }
      assignedDate
      isActive
    }
  }
`;

export const REMOVE_SERVICE_PROVIDER = gql`
  mutation RemoveServiceProvider($id: ID!) {
    removeServiceProviderFromClient(id: $id)
  }
`;

// Location Queries
export const GET_COUNTRIES = gql`
  query GetCountries {
    countries {
      id
      name
      code
      currency
      dialCode
    }
  }
`;

export const GET_CITIES = gql`
  query GetCities($stateId: ID!) {
    citiesByState(stateId: $stateId) {
      id
      name
      postalCode
      state {
        id
        name
      }
    }
  }
`;

// Stats Queries
export const GET_CLIENT_STATS = gql`
  query GetClientStats($filters: ClientFilters) {
    clientsSummary(filters: $filters) {
      totalClients
      activeClients
      inactiveClients
      permanentClients
      walkinClients
      clientsWithBalance
      totalOutstandingAmount
    }
  }
`;

// Transaction Queries
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
      balanceAfter
      attachments
      notes
      createdAt
    }
  }
`;