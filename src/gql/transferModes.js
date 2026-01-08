import { gql } from "@apollo/client";

export const GET_TRANSFER_MODES = gql`
  query GetTransferModes($isActive: Boolean) {
    transferModes(isActive: $isActive) {
      id
      name
      description
      isActive
      isSystem
    }
  }
`;

export const CREATE_TRANSFER_MODE = gql`
  mutation CreateTransferMode($input: CreateTransferModeInput!) {
    createTransferMode(input: $input) {
      id
      name
      description
      isActive
      isSystem
    }
  }
`;

export const UPDATE_TRANSFER_MODE = gql`
  mutation UpdateTransferMode($id: ID!, $input: TransferModeInput!) {
    updateTransferMode(id: $id, input: $input) {
      id
      name
      description
      isActive
      isSystem
    }
  }
`;

export const DELETE_TRANSFER_MODE = gql`
  mutation DeleteTransferMode($id: ID!) {
    deleteTransferMode(id: $id)
  }
`;
