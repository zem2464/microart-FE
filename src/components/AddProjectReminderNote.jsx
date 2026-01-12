import React, { useState } from 'react';
import { Input, Button, Space, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useMutation } from '@apollo/client';
import { CREATE_PROJECT_REMINDER_NOTE } from '../gql/projectReminderNotes';

const AddProjectReminderNote = ({ projectId, onSuccess }) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [createNote] = useMutation(CREATE_PROJECT_REMINDER_NOTE);

  const handleAddNote = async () => {
    if (!content.trim()) {
      message.warning('Please enter a note');
      return;
    }

    setLoading(true);
    try {
      await createNote({
        variables: {
          input: {
            projectId,
            content: content.trim()
          }
        }
      });
      message.success('Reminder note added successfully');
      setContent('');
      onSuccess?.();
    } catch (error) {
      message.error('Failed to add reminder note');
      console.error('Error adding note:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Space.Compact style={{ width: '100%' }}>
      <Input.TextArea
        placeholder="Add a reminder note for this project..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={2}
        style={{ marginBottom: 8 }}
      />
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={handleAddNote}
        loading={loading}
        block
      >
        Add Reminder Note
      </Button>
    </Space.Compact>
  );
};

export default AddProjectReminderNote;
