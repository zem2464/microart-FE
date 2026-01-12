import React, { memo } from 'react';
import { Space, Button, Tag, Select, Tooltip, Modal } from 'antd';
import {
  EditOutlined,
  CalendarOutlined,
  ReloadOutlined,
  FilePdfOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import ProjectReminderNotesPopover from './ProjectReminderNotesPopover';

// Project status configuration
const STATUS_MAP = {
  DRAFT: { label: 'Draft', color: 'default' },
  ACTIVE: { label: 'Active', color: 'green' },
  IN_PROGRESS: { label: 'In Progress', color: 'processing' },
  REVIEW: { label: 'Review', color: 'cyan' },
  REOPEN: { label: 'Reopen', color: 'geekblue' },
  COMPLETED: { label: 'Completed', color: 'success' },
  CANCELLED: { label: 'Cancelled', color: 'error' },
  ON_HOLD: { label: 'On Hold', color: 'warning' },
  DELIVERED: { label: 'Delivered', color: 'purple' },
  REQUESTED: { label: 'Pending Approval', color: 'purple' },
};

/**
 * ProjectDetailHeader - Memoized header component for project drawer
 * Displays project info and action buttons
 */
const ProjectDetailHeader = memo(({
  project,
  statusValue,
  canEditProjects,
  canShowQuote,
  canDeleteProjects,
  canApproveProjects,
  hasInvoice,
  onEdit,
  onStatusChange,
  onDueDateClick,
  onNoteClick,
  onRefresh,
  onQuote,
  onDelete,
}) => {
  if (!project) return <span>Project Details</span>;

  const statusConfig = STATUS_MAP[project.status?.toUpperCase()] || {};
  const clientType = project?.client?.clientType;
  const isPaid = !!(
    project?.invoice?.status === 'fully_paid' ||
    (project?.invoice?.balanceAmount ?? 0) <= 0
  );

  const handleStatusChange = (value) => {
    onStatusChange(value);
  };

  const handleDelete = () => {
    Modal.confirm({
      title: 'Delete project?',
      content: 'This action cannot be undone.',
      okType: 'danger',
      onOk: () => onDelete({ id: project.id }),
    });
  };

  // Status options with filtering
  const getStatusOptions = () => {
    const options = Object.entries(STATUS_MAP).map(([key, cfg]) => ({
      value: key.toLowerCase(),
      label: cfg.label,
      color: cfg.color,
    }));

    const isCompleted = (project?.status || '').toLowerCase() === 'completed';
    const filtered = isCompleted
      ? options.filter(
          (opt) => opt.value === 'delivered' || opt.value === 'reopen'
        )
      : options;

    return filtered.map((option) => {
      let disabled = false;
      let title = '';
      if (option.value === 'delivered') {
        if (hasInvoice && clientType === 'walkIn') {
          if (!canApproveProjects) {
            disabled = true;
            title = 'Permission required to deliver walk-in projects';
          } else if (!isPaid) {
            disabled = true;
            title = 'Invoice must be paid for walk-in projects';
          }
        }
      }
      return {
        ...option,
        disabled,
        label: disabled ? (
          <Tooltip title={title}>{option.label} 🔒</Tooltip>
        ) : (
          option.label
        ),
      };
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        paddingRight: 24,
      }}
    >
      <Space size="middle">
        <span>{project.projectCode}</span>
        <span style={{ color: '#8c8c8c', fontWeight: 'normal' }}>|</span>
        <span style={{ fontWeight: 'normal' }}>{project.name}</span>
        <Tag color={statusConfig.color || 'blue'}>
          {statusConfig.label || project.status}
        </Tag>
        <ProjectReminderNotesPopover projectId={project?.id} />
      </Space>
      <Space>
        {canEditProjects && (
          <Button
            type="primary"
            icon={<EditOutlined />}
            size="small"
            onClick={onEdit}
          >
            Edit
          </Button>
        )}
        {canEditProjects && (
          <Select
            value={statusValue}
            onChange={handleStatusChange}
            style={{ width: 150 }}
            size="small"
            placeholder="Change Status"
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '')
                .toString()
                .toLowerCase()
                .includes(input.toLowerCase())
            }
            options={getStatusOptions()}
          />
        )}
        {canEditProjects && (
          <Button
            icon={<CalendarOutlined />}
            size="small"
            onClick={onDueDateClick}
          >
            Change Due Date
          </Button>
        )}
        <Button
          icon={<FileTextOutlined />}
          size="small"
          onClick={onNoteClick}
        >
          Add Note
        </Button>
        <Button icon={<ReloadOutlined />} size="small" onClick={onRefresh}>
          Refresh
        </Button>
        {canShowQuote && (
          <Button
            size="small"
            icon={<FilePdfOutlined />}
            onClick={onQuote}
          >
            View Quote
          </Button>
        )}
        {canDeleteProjects &&
          (project.status || '').toString().toUpperCase() !== 'COMPLETED' && (
            <Button danger size="small" onClick={handleDelete}>
              Delete
            </Button>
          )}
      </Space>
    </div>
  );
});

ProjectDetailHeader.displayName = 'ProjectDetailHeader';

export default ProjectDetailHeader;
