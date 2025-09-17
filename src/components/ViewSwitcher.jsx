import React from 'react';
import { Button, Switch, Tooltip, Space, Typography } from 'antd';
import { SwapOutlined, UserOutlined, SettingOutlined } from '@ant-design/icons';
import { useViewMode } from '../contexts/ViewModeContext';

const { Text } = Typography;

const ViewSwitcher = ({ style = {}, size = 'default' }) => {
  const { effectiveLayout, canSwitchViews, toggleView } = useViewMode();

  // Don't render if user can't switch views
  if (!canSwitchViews) {
    return null;
  }

  const isBackOffice = effectiveLayout === 'backoffice';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', ...style }}>
      <Tooltip title={`Switch to ${isBackOffice ? 'Employee' : 'Admin'} View`}>
        <Space align="center">
          <SettingOutlined 
            style={{ 
              fontSize: size === 'small' ? '14px' : '16px',
              color: isBackOffice ? '#1890ff' : '#8c8c8c'
            }} 
          />
          <Switch
            checked={!isBackOffice}
            onChange={toggleView}
            size={size}
            checkedChildren={<UserOutlined />}
            unCheckedChildren={<SettingOutlined />}
          />
          <UserOutlined 
            style={{ 
              fontSize: size === 'small' ? '14px' : '16px',
              color: !isBackOffice ? '#1890ff' : '#8c8c8c'
            }} 
          />
          {size !== 'small' && (
            <Text type="secondary" style={{ fontSize: '12px', marginLeft: '4px' }}>
              {isBackOffice ? 'Admin' : 'Employee'}
            </Text>
          )}
        </Space>
      </Tooltip>
    </div>
  );
};

// Alternative button-style switcher
export const ViewSwitcherButton = ({ style = {} }) => {
  const { effectiveLayout, canSwitchViews, toggleView } = useViewMode();

  if (!canSwitchViews) {
    return null;
  }

  const isBackOffice = effectiveLayout === 'backoffice';

  return (
    <Tooltip title={`Switch to ${isBackOffice ? 'Employee' : 'Admin'} View`}>
      <Button
        type="text"
        icon={<SwapOutlined />}
        onClick={toggleView}
        style={style}
      >
        {isBackOffice ? 'Switch to Employee View' : 'Switch to Admin View'}
      </Button>
    </Tooltip>
  );
};

export default ViewSwitcher;