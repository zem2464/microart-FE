import { useQuery } from '@apollo/client';
import { GET_PROJECT_REMINDER_NOTES } from '../../gql/projectReminderNotes';

export const useProjectReminderNotes = (projectId, options = {}) => {
  const { data, loading, error, refetch } = useQuery(GET_PROJECT_REMINDER_NOTES, {
    variables: { projectId },
    skip: !projectId,
    fetchPolicy: 'cache-first',
    ...options
  });

  return {
    notes: data?.projectReminderNotes || [],
    loading,
    error,
    refetch
  };
};

export default useProjectReminderNotes;
