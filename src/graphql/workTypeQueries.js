import { gql } from '@apollo/client';

// Work Type Queries
export const GET_WORK_TYPES = gql`
  query GetWorkTypes {
    workTypes {
      id
      name
      description
      isActive
      taskTypes {
        id
        name
        description
      }
      createdAt
      updatedAt
    }
  }
`;

export const GET_WORK_TYPE = gql`
  query GetWorkType($id: ID!) {
    workType(id: $id) {
      id
      name
      description
      isActive
      taskTypes {
        id
        name
        description
        estimatedTime
        isActive
      }
      gradings {
        id
        name
        description
        defaultRate
        isActive
      }
      createdAt
      updatedAt
    }
  }
`;

export const GET_ACTIVE_WORK_TYPES = gql`
  query GetActiveWorkTypes {
    activeWorkTypes {
      id
      name
      description
      isActive
    }
  }
`;

export const GET_WORK_TYPE_FIELDS = gql`
  query GetWorkTypeFields($workTypeId: ID!) {
    workTypeFields(workTypeId: $workTypeId) {
      id
      fieldName
      fieldKey
      fieldType
      isRequired
      defaultValue
      placeholder
      helpText
      validation
      options {
        value
        label
        description
      }
      displayOrder
      isActive
    }
  }
`;

// Custom Field Mutations
export const CREATE_WORK_TYPE_FIELD = gql`
  mutation CreateWorkTypeField($workTypeId: ID!, $input: CreateWorkTypeFieldInput!) {
    createWorkTypeField(workTypeId: $workTypeId, input: $input) {
      id
      fieldName
      fieldKey
      fieldType
      isRequired
      defaultValue
      placeholder
      helpText
      validation
      options {
        value
        label
        description
      }
      displayOrder
      isActive
    }
  }
`;

export const UPDATE_WORK_TYPE_FIELD = gql`
  mutation UpdateWorkTypeField($id: ID!, $input: UpdateWorkTypeFieldInput!) {
    updateWorkTypeField(id: $id, input: $input) {
      id
      fieldName
      fieldKey
      fieldType
      isRequired
      defaultValue
      placeholder
      helpText
      validation
      options {
        value
        label
        description
      }
      displayOrder
      isActive
    }
  }
`;

export const DELETE_WORK_TYPE_FIELD = gql`
  mutation DeleteWorkTypeField($id: ID!) {
    deleteWorkTypeField(id: $id)
  }
`;

export const REORDER_WORK_TYPE_FIELDS = gql`
  mutation ReorderWorkTypeFields($workTypeId: ID!, $fieldIds: [ID!]!) {
    reorderWorkTypeFields(workTypeId: $workTypeId, fieldIds: $fieldIds) {
      id
      fieldName
      displayOrder
    }
  }
`;

export const GET_GRADINGS_BY_WORK_TYPE = gql`
  query GetGradingsByWorkType($workTypeIds: [ID!]!) {
    gradingsByWorkType(workTypeIds: $workTypeIds) {
      id
      name
      shortCode
      description
      defaultRate
      isActive
      workType {
        id
        name
      }
    }
  }
`;