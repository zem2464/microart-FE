import { gql } from '@apollo/client';

// Holiday Queries
export const GET_HOLIDAYS = gql`
  query GetHolidays($year: Int, $isActive: Boolean) {
    holidays(year: $year, isActive: $isActive) {
      id
      name
      date
      description
      isActive
      createdAt
      updatedAt
    }
  }
`;

export const GET_HOLIDAY = gql`
  query GetHoliday($id: ID!) {
    holiday(id: $id) {
      id
      name
      date
      description
      isActive
      createdAt
      updatedAt
    }
  }
`;

// Holiday Mutations
export const CREATE_HOLIDAY = gql`
  mutation CreateHoliday($input: HolidayInput!) {
    createHoliday(input: $input) {
      id
      name
      date
      description
      isActive
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_HOLIDAY = gql`
  mutation UpdateHoliday($id: ID!, $input: HolidayInput!) {
    updateHoliday(id: $id, input: $input) {
      id
      name
      date
      description
      isActive
      createdAt
      updatedAt
    }
  }
`;

export const DELETE_HOLIDAY = gql`
  mutation DeleteHoliday($id: ID!) {
    deleteHoliday(id: $id)
  }
`;

export const BULK_CREATE_HOLIDAYS = gql`
  mutation BulkCreateHolidays($holidays: [HolidayInput!]!) {
    bulkCreateHolidays(holidays: $holidays) {
      id
      name
      date
      description
      isActive
    }
  }
`;
