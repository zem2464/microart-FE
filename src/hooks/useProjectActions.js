import { useCallback } from 'react';
import { useMutation } from '@apollo/client';
import { message } from 'antd';
import { UPDATE_PROJECT, DELETE_PROJECT } from '../graphql/projectQueries';
import { UPDATE_CLIENT } from '../gql/clients';
import { GENERATE_PROJECT_INVOICE } from '../gql/clientLedger';

/**
 * Custom hook for project-related mutations
 * Encapsulates all project actions with their callbacks
 */
export const useProjectActions = ({ refetch, closeDrawer }) => {
  // Update project mutation
  const [updateProjectMutation] = useMutation(UPDATE_PROJECT, {
    onCompleted: () => {
      message.success('Project updated successfully');
      refetch?.project?.();
    },
    onError: (error) => message.error(error.message),
  });

  // Update client mutation
  const [updateClientMutation] = useMutation(UPDATE_CLIENT, {
    onCompleted: () => {
      message.success('Client notes updated');
      refetch?.project?.();
    },
    onError: (error) => message.error(error.message),
  });

  // Delete project mutation
  const [deleteProjectMutation] = useMutation(DELETE_PROJECT, {
    fetchPolicy: 'no-cache',
    onCompleted: () => {
      message.success('Project deleted');
      closeDrawer?.();
    },
    onError: (err) => message.error(err.message),
  });

  // Generate invoice mutation
  const [generateInvoiceMutation, { loading: invoicing }] = useMutation(
    GENERATE_PROJECT_INVOICE,
    {
      fetchPolicy: 'no-cache',
      onCompleted: (data) => {
        if (data?.generateProjectInvoice?.success) {
          message.success(
            data.generateProjectInvoice.message || 'Invoice generated'
          );
          refetch?.project?.();
        } else {
          message.error(
            data?.generateProjectInvoice?.message ||
              'Failed to generate invoice'
          );
        }
      },
      onError: (err) => message.error(err.message),
    }
  );

  // Wrapped action functions
  const updateProject = useCallback(
    (variables) => updateProjectMutation({ variables }),
    [updateProjectMutation]
  );

  const updateClient = useCallback(
    (variables) => updateClientMutation({ variables }),
    [updateClientMutation]
  );

  const deleteProject = useCallback(
    (variables) => deleteProjectMutation({ variables }),
    [deleteProjectMutation]
  );

  const generateInvoice = useCallback(
    (variables) => generateInvoiceMutation({ variables }),
    [generateInvoiceMutation]
  );

  return {
    updateProject,
    updateClient,
    deleteProject,
    generateInvoice,
    invoicing,
  };
};
