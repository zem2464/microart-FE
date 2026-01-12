import React, { useState } from 'react';
import { Modal, Input, Button, Space, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useMutation } from '@apollo/client';
import { CREATE_PROJECT_REMINDER_NOTE } from '../gql/projectReminderNotes';

const ReminderNotesModal = ({ visible, projectId, onClose, onSuccess }) => {
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
      onClose();
    } catch (error) {
      message.error('Failed to add reminder note');
      console.error('Error adding note:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setContent('');
    onClose();
  };

  return (
    <Modal
      title="Add Reminder Note"
      open={visible}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          onClick={handleAddNote}
          icon={<PlusOutlined />}
        >
          Add Note
        </Button>,
      ]}
    >
      <div style={{ marginBottom: 16 }}>
        <Input.TextArea
          placeholder="Add a reminder note for this project..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          autoFocus
        />
      </div>
    </Modal>
  );
};

export default ReminderNotesModal;
