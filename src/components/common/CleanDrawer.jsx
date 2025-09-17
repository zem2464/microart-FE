import React, { useState } from 'react';
import { 
  Drawer, 
  Typography, 
  Button, 
  Space, 
  Spin, 
  Card,
  Badge,
  Tooltip,
  Descriptions,
  Collapse
} from 'antd';
import { 
  CloseOutlined, 
  FullscreenOutlined, 
  FullscreenExitOutlined,
  DownOutlined,
  RightOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Panel } = Collapse;

// Clean Drawer Header
export const CleanDrawerHeader = ({ 
  title, 
  subtitle, 
  icon, 
  status,
  actions = [],
  onClose,
  onFullscreen,
  isFullscreen = false,
  breadcrumb = null
}) => {
  return (
    <div className="bg-white border-b border-gray-100 flex-shrink-0">
      {/* Breadcrumb */}
      {breadcrumb && (
        <div className="px-6 py-2 border-b border-gray-100">
          {breadcrumb}
        </div>
      )}
      
      {/* Main Header Content */}
      <div className="flex items-center justify-between p-6 gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {icon && (
            <div className="flex items-center justify-center w-10 h-10 bg-gray-50 border border-gray-200 rounded-md text-lg text-blue-500">
              {icon}
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Title level={3} className="!m-0 !text-gray-800 !font-semibold">
                {title}
              </Title>
              {status && (
                <Badge 
                  status={status.type || 'default'} 
                  text={status.text}
                  className="text-gray-500 text-xs"
                />
              )}
            </div>
            {subtitle && (
              <Text className="text-gray-500 text-sm leading-tight">
                {subtitle}
              </Text>
            )}
          </div>
        </div>
        
        {/* Header Actions */}
        <div className="flex-shrink-0">
          <Space size="small">
            {actions.map((action, index) => (
              <Tooltip key={index} title={action.tooltip}>
                <Button
                  type={action.type || 'text'}
                  icon={action.icon}
                  onClick={action.onClick}
                  className={`border border-gray-200 bg-white text-gray-600 hover:border-blue-500 hover:text-blue-500 hover:bg-white ${action.className || ''}`}
                  size="small"
                >
                  {action.text}
                </Button>
              </Tooltip>
            ))}
            
            {onFullscreen && (
              <Tooltip title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
                <Button
                  type="text"
                  icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                  onClick={onFullscreen}
                  className="border border-gray-200 bg-white text-gray-600 hover:border-blue-500 hover:text-blue-500 hover:bg-white"
                  size="small"
                />
              </Tooltip>
            )}
            
            {onClose && (
              <Tooltip title="Close">
                <Button
                  type="text"
                  icon={<CloseOutlined />}
                  onClick={onClose}
                  className="border border-gray-200 bg-white text-gray-600 hover:border-blue-500 hover:text-blue-500 hover:bg-white"
                  size="small"
                />
              </Tooltip>
            )}
          </Space>
        </div>
      </div>
    </div>
  );
};

// Clean Drawer Content using Descriptions
export const CleanDrawerContent = ({ 
  children, 
  loading = false,
  padding = true 
}) => {
  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="flex items-center justify-center h-48">
          <Spin size="large" />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 overflow-y-auto bg-gray-50 ${padding ? 'p-6' : ''}`}>
      {children}
    </div>
  );
};

// Form Section for forms and editable content
export const CleanFormSection = ({
  title,
  children,
  extra = null,
  className = ""
}) => {
  return (
    <Card 
      title={title} 
      extra={extra}
      className={`mb-4 border border-gray-200 rounded-md shadow-sm transition-all duration-200 hover:shadow-md ${className}`}
      headStyle={{ 
        background: 'white', 
        borderBottom: '1px solid #f0f0f0', 
        padding: '0 24px',
        minHeight: '48px',
        fontWeight: 600,
        color: '#262626',
        fontSize: '14px'
      }}
      bodyStyle={{ padding: '24px' }}
    >
      <div className="space-y-4">
        {children}
      </div>
    </Card>
  );
};

// Descriptions Section with clean styling
export const CleanDescriptionsSection = ({
  title,
  items = [],
  column = 1,
  bordered = true,
  layout = "horizontal",
  size = "default",
  colon = true,
  extra = null,
  className = ""
}) => {
  return (
    <Card 
      title={title} 
      extra={extra}
      className={`mb-4 border border-gray-200 rounded-md shadow-sm transition-all duration-200 hover:shadow-md ${className}`}
      headStyle={{ 
        background: 'white', 
        borderBottom: '1px solid #f0f0f0', 
        padding: '0 24px',
        minHeight: '48px',
        fontWeight: 600,
        color: '#262626',
        fontSize: '14px'
      }}
      bodyStyle={{ padding: '16px 24px' }}
    >
      <Descriptions
        column={column}
        bordered={bordered}
        layout={layout}
        size={size}
        colon={colon}
        items={items}
      />
    </Card>
  );
};

// Collapsible Section for audit logs and other expandable content
export const CleanCollapsibleSection = ({
  title,
  children,
  defaultExpanded = false,
  extra = null,
  className = ""
}) => {
  return (
    <Card 
      className={`mb-4 border border-gray-200 rounded-md shadow-sm transition-all duration-200 hover:shadow-md ${className}`}
      bodyStyle={{ padding: 0 }}
    >
      <Collapse 
        defaultActiveKey={defaultExpanded ? ['1'] : []}
        ghost
        expandIcon={({ isActive }) => 
          isActive ? <DownOutlined /> : <RightOutlined />
        }
      >
        <Panel 
          header={title} 
          key="1" 
          extra={extra}
          className="font-semibold text-gray-800"
          style={{
            padding: '16px 24px',
            background: 'white',
            borderBottom: '1px solid #f0f0f0'
          }}
        >
          <div className="p-6">
            {children}
          </div>
        </Panel>
      </Collapse>
    </Card>
  );
};

// Clean Drawer Footer
export const CleanDrawerFooter = ({ 
  children, 
  actions = [],
  primaryAction = null,
  secondaryActions = []
}) => {
  return (
    <div className="bg-white border-t border-gray-200 flex-shrink-0">
      <div className="flex items-center justify-between p-4 gap-4">
        <div className="flex-1 min-w-0">
          {children}
        </div>
        
        <div className="flex-shrink-0">
          <Space>
            {secondaryActions.map((action, index) => (
              <Button
                key={index}
                type={action.type || 'default'}
                icon={action.icon}
                onClick={action.onClick}
                loading={action.loading}
                disabled={action.disabled}
                className={action.className}
              >
                {action.text}
              </Button>
            ))}
            
            {actions.map((action, index) => (
              <Button
                key={index}
                type={action.type || 'default'}
                icon={action.icon}
                onClick={action.onClick}
                loading={action.loading}
                disabled={action.disabled}
                className={action.className}
              >
                {action.text}
              </Button>
            ))}
            
            {primaryAction && (
              <Button
                type={primaryAction.type || 'primary'}
                icon={primaryAction.icon}
                onClick={primaryAction.onClick}
                loading={primaryAction.loading}
                disabled={primaryAction.disabled}
                className={primaryAction.className}
              >
                {primaryAction.text}
              </Button>
            )}
          </Space>
        </div>
      </div>
    </div>
  );
};

// Main Clean Drawer Component
export const CleanDrawer = ({
  open,
  onClose,
  title,
  subtitle,
  icon,
  status,
  children,
  width = 720,
  placement = 'right',
  closable = false,
  maskClosable = true,
  loading = false,
  headerActions = [],
  footer = null,
  breadcrumb = null,
  className = "",
  bodyStyle = {},
  headerStyle = {},
  ...drawerProps
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const drawerWidth = isFullscreen ? '100vw' : width;

  return (
    <Drawer
      title={null}
      placement={placement}
      onClose={onClose}
      open={open}
      width={drawerWidth}
      height={isFullscreen ? '100vh' : undefined}
      closable={closable}
      maskClosable={maskClosable}
      className={`${isFullscreen ? 'fullscreen' : ''} ${className}`}
      bodyStyle={{
        padding: 0,
        height: '100%',
        ...bodyStyle
      }}
      headerStyle={headerStyle}
      {...drawerProps}
    >
      <div className="h-full flex flex-col bg-white">
        <CleanDrawerHeader
          title={title}
          subtitle={subtitle}
          icon={icon}
          status={status}
          actions={headerActions}
          onClose={onClose}
          onFullscreen={handleFullscreen}
          isFullscreen={isFullscreen}
          breadcrumb={breadcrumb}
        />
        
        <CleanDrawerContent loading={loading}>
          {children}
        </CleanDrawerContent>
        
        {footer && (
          <CleanDrawerFooter {...footer} />
        )}
      </div>
    </Drawer>
  );
};

export default CleanDrawer;