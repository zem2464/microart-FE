import React, { memo } from 'react';
import { Modal, DatePicker, message } from 'antd';
import dayjs from 'dayjs';
import ReminderNotesModal from './ReminderNotesModal';

/**
 * ProjectDetailModals - Manages all modals for project detail
 * Memoized to prevent unnecessary re-renders
 */
const ProjectDetailModals = memo(({
  // Status Modal
  statusModalVisible,
  statusValue,
  onStatusModalClose,
  onStatusSave,
  
  // Due Date Modal
  dueDateModalVisible,
  dueDateValue,
  onDueDateModalClose,
  onDueDateChange,
  onDueDateSave,
  
  // Reminder Notes Modal
  reminderNotesModalVisible,
  onReminderNotesClose,
  projectId,
  refetchProject,
}) => {
  return (
    <>
      {/* Status Change Modal */}
      <Modal
        title="Change Project Status"
        open={statusModalVisible}
        onOk={onStatusSave}
        onCancel={onStatusModalClose}
        okText="Save"
      >
        {/* Status select is in the header, this modal is for confirmation */}
        <p>Confirm status change?</p>
      </Modal>

      {/* Due Date Change Modal */}
      <Modal
        title="Change Due Date"
        open={dueDateModalVisible}
        onOk={onDueDateSave}
        onCancel={onDueDateModalClose}
        okText="Save"
      >
        <DatePicker
          value={dueDateValue}
          onChange={onDueDateChange}
          style={{ width: '100%' }}
          format="DD MMM YYYY"
        />
      </Modal>

      {/* Reminder Notes Modal */}
      {reminderNotesModalVisible && (
        <ReminderNotesModal
          projectId={projectId}
          visible={reminderNotesModalVisible}
          onClose={onReminderNotesClose}
          onSuccess={() => {
            onReminderNotesClose();
            refetchProject();
            message.success('Reminder note added');
          }}
        />
      )}
    </>
  );
});

ProjectDetailModals.displayName = 'ProjectDetailModals';

export default ProjectDetailModals;
