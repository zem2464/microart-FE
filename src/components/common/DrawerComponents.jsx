import React from 'react';
import { Drawer, Typography, Button, Space, Divider, Spin } from 'antd';
import { CloseOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

// Enhanced Drawer Header Component
export const DrawerHeader = ({ 
  title, 
  subtitle, 
  icon, 
  extra,
  showDivider = true 
}) => (
  <div className="drawer-header">
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        {icon && <span className="text-lg">{icon}</span>}
        <div>
          <Title level={4} className="mb-0">{title}</Title>
          {subtitle && <Text type="secondary" className="text-sm">{subtitle}</Text>}
        </div>
      </div>
      {extra && <div className="extra-content">{extra}</div>}
    </div>
    {showDivider && <Divider className="my-4" />}
  </div>
);

// Enhanced Drawer Content Component
export const DrawerContent = ({ 
  children, 
  loading = false, 
  className = "" 
}) => (
  <div className={`drawer-content ${className}`}>
    {loading ? (
      <div className="flex justify-center items-center h-32">
        <Spin size="large" />
      </div>
    ) : (
      children
    )}
  </div>
);

// Enhanced Drawer Footer Component
export const DrawerFooter = ({ 
  primaryAction,
  secondaryAction,
  loading = false,
  showDivider = true,
  align = "right" // left, center, right, space-between
}) => (
  <div className="drawer-footer">
    {showDivider && <Divider className="my-4" />}
    <div className={`flex ${
      align === 'left' ? 'justify-start' :
      align === 'center' ? 'justify-center' :
      align === 'space-between' ? 'justify-between' :
      'justify-end'
    }`}>
      <Space>
        {secondaryAction && (
          <Button 
            {...secondaryAction.props}
            disabled={loading}
          >
            {secondaryAction.text}
          </Button>
        )}
        {primaryAction && (
          <Button 
            type="primary" 
            loading={loading}
            {...primaryAction.props}
          >
            {primaryAction.text}
          </Button>
        )}
      </Space>
    </div>
  </div>
);

// Main Enhanced Drawer Component
export const EnhancedDrawer = ({
  open,
  onClose,
  title,
  subtitle,
  icon,
  headerExtra,
  children,
  footer,
  width = "responsive", // "responsive", "small", "medium", "large", "xlarge", or number
  placement = "right",
  loading = false,
  destroyOnClose = true,
  maskClosable = true,
  className = "",
  bodyStyle,
  ...otherProps
}) => {
  // Responsive width calculation
  const getDrawerWidth = () => {
    if (typeof width === 'number') return width;
    
    switch (width) {
      case 'small': return 400;
      case 'medium': return 600;
      case 'large': return 800;
      case 'xlarge': return 1000;
      case 'responsive':
      default:
        // Responsive widths based on screen size
        if (typeof window !== 'undefined') {
          const screenWidth = window.innerWidth;
          if (screenWidth >= 1400) return 800;
          if (screenWidth >= 1200) return 700;
          if (screenWidth >= 992) return 600;
          if (screenWidth >= 768) return 500;
          return '90vw'; // Mobile
        }
        return 600;
    }
  };

  const customBodyStyle = {
    padding: 0,
    height: 'calc(100vh - 55px)', // Account for header
    display: 'flex',
    flexDirection: 'column',
    ...bodyStyle
  };

  return (
    <Drawer
      title={null} // We'll use custom header
      width={getDrawerWidth()}
      placement={placement}
      open={open}
      onClose={onClose}
      destroyOnClose={destroyOnClose}
      maskClosable={maskClosable && !loading}
      keyboard={!loading}
      className={`enhanced-drawer ${className}`}
      bodyStyle={customBodyStyle}
      closable={false} // We'll add custom close button
      {...otherProps}
    >
      <div className="drawer-layout">
        {/* Custom Header */}
        <div className="drawer-header-section" style={{ padding: '16px 24px 0' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <DrawerHeader 
                title={title}
                subtitle={subtitle}
                icon={icon}
                extra={headerExtra}
                showDivider={false}
              />
            </div>
            <Button 
              type="text" 
              icon={<CloseOutlined />} 
              onClick={onClose}
              disabled={loading}
              className="close-btn"
            />
          </div>
          <Divider className="my-0" />
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto" style={{ padding: '24px' }}>
          <DrawerContent loading={loading}>
            {children}
          </DrawerContent>
        </div>

        {/* Footer Area */}
        {footer && (
          <div style={{ padding: '0 24px 16px' }}>
            {footer}
          </div>
        )}
      </div>
    </Drawer>
  );
};

// Convenience hooks for common drawer patterns
export const useEnhancedDrawer = () => {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const openDrawer = React.useCallback(() => setOpen(true), []);
  const closeDrawer = React.useCallback(() => setOpen(false), []);
  const setDrawerLoading = React.useCallback((loadingState) => setLoading(loadingState), []);

  return {
    open,
    loading,
    openDrawer,
    closeDrawer,
    setDrawerLoading
  };
};

// Form Drawer Hook
export const useFormDrawer = () => {
  const drawer = useEnhancedDrawer();
  
  const openFormDrawer = React.useCallback((config) => {
    drawer.openDrawer();
    return config;
  }, [drawer]);

  return {
    ...drawer,
    openFormDrawer
  };
};

// Detail Drawer Hook  
export const useDetailDrawer = () => {
  const drawer = useEnhancedDrawer();
  
  const openDetailDrawer = React.useCallback((config) => {
    drawer.openDrawer();
    return config;
  }, [drawer]);

  return {
    ...drawer,
    openDetailDrawer
  };
};