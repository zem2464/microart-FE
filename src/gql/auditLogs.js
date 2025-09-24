import { gql } from '@apollo/client';

export const GET_RECORD_AUDIT_LOGS = gql`
  query GetRecordAuditLogs($tableName: String!, $recordId: ID!) {
    recordAuditLogs(tableName: $tableName, recordId: $recordId) {
      id
      action
      description
      status
      timestamp
      userEmail
      userRole
      oldValues
      newValues
      changedFields
      metadata
      user {
        id
        firstName
        lastName
        email
      }
    }
  }
`;

export const GET_AUDIT_LOGS = gql`
  query GetAuditLogs($filters: AuditLogFilters) {
    auditLogs(filters: $filters) {
      id
      action
      tableName
      recordId
      userId
      userEmail
      userRole
      ipAddress
      userAgent
      requestUrl
      requestMethod
      oldValues
      newValues
      changedFields
      description
      metadata
      status
      errorMessage
      timestamp
      user {
        id
        firstName
        lastName
        email
      }
    }
  }
`;

export const GET_AUDIT_LOG = gql`
  query GetAuditLog($id: ID!) {
    auditLog(id: $id) {
      id
      action
      tableName
      recordId
      userId
      userEmail
      userRole
      ipAddress
      userAgent
      requestUrl
      requestMethod
      oldValues
      newValues
      changedFields
      description
      metadata
      status
      errorMessage
      timestamp
      user {
        id
        firstName
        lastName
        email
      }
    }
  }
`;