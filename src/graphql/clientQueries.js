import { gql } from '@apollo/client';

// Client Queries
export const GET_CLIENTS = gql`
  query GetClients($filters: ClientFilters) {
    clients(filters: $filters) {
      id
      clientCode
      firstName
      lastName
      displayName
      companyName
      email
      contactNoWork
      contactNoPersonal
      countryId
      stateId
      cityId
      country {
        id
        name
      }
      state {
        id
        name
      }
      city {
        id
        name
      }
      address
      pincode
      leaderId
      leader {
        id
        firstName
        lastName
        email
      }
      isActive
      isCreditEnabled
      creditAmountLimit
      totalBalance
      totalPaid
      totalDue
      createdAt
      updatedAt
    }
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
      countryId
      stateId
      cityId
      country {
        id
        name
      }
      state {
        id
        name
      }
      city {
        id
        name
      }
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
      leaderId
      leader {
        id
        firstName
        lastName
        email
      }
      workTypeAssociations {
        id
        workType {
          id
          name
        }
        isActive
      }
      gradings {
        id
        grading {
          id
          name
          defaultRate
        }
        customRate
        isActive
      }
      taskPreferences {
        id
        gradingId
        taskId
        preferredUserIds
      }
      totalBalance
      totalPaid
      totalDue
      lastTransactionDate
      createdBy
      updatedBy
      createdAt
      updatedAt
    }
  }
`;

export const GET_CLIENT_BY_CODE = gql`
  query GetClientByCode($clientCode: String!) {
    clientByCode(clientCode: $clientCode) {
      id
      clientCode
      firstName
      lastName
      displayName
      companyName
      email
      contactNoWork
      isActive
      totalBalance
      totalPaid
      totalDue
    }
  }
`;

export const GET_ACTIVE_CLIENTS = gql`
  query GetActiveClients {
    activeClients {
      id
      clientCode
      firstName
      lastName
      displayName
      companyName
      email
      isActive
      totalBalance
    }
  }
`;