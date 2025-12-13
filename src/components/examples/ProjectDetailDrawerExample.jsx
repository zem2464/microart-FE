/**
 * Example: How to use the new Project Detail Drawer
 * 
 * This drawer shows comprehensive project information including:
 * - Project basic details (name, code, folder, client, status, etc.)
 * - Work Types with their Gradings
 * - Tasks grouped by Work Type and Grading
 * - Inline editing for task status, due date, and completed image quantity
 * - Invoice and payment information
 * - Statistics (total tasks, completed tasks, total images, completed images)
 */

import React from 'react';
import { Button, Space } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { useAppDrawer } from '../../contexts/DrawerContext';

const ProjectDetailDrawerExample = () => {
  const { showProjectDetailDrawerV2 } = useAppDrawer();

  // Example: Open drawer with just a project ID
  const handleViewProject = (projectId) => {
    showProjectDetailDrawerV2(projectId);
  };

  return (
    <div>
      <h3>Project Detail Drawer Example</h3>
      <Space>
        <Button
          type="primary"
          icon={<EyeOutlined />}
          onClick={() => handleViewProject('1')}
        >
          View Project #1
        </Button>
        
        <Button
          icon={<EyeOutlined />}
          onClick={() => handleViewProject('2')}
        >
          View Project #2
        </Button>
      </Space>

      {/* 
        Usage in a table:
        
        const columns = [
          {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
              <Button 
                type="link" 
                icon={<EyeOutlined />}
                onClick={() => showProjectDetailDrawerV2(record.id)}
              >
                View
              </Button>
            )
          }
        ];
      */}
    </div>
  );
};

export default ProjectDetailDrawerExample;
