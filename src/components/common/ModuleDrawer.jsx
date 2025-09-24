import React from 'react';
import { Drawer, Space, Button } from 'antd';

const ModuleDrawer = ({
  open,
  title,
  width = 400,
  placement = 'right',
  onClose,
  destroyOnClose = true,
  maskClosable = true,
  footer,
  children,
  ...rest
}) => (
  <Drawer
    title={title}
    width={width}
    placement={placement}
    open={open}
    onClose={onClose}
    destroyOnClose={destroyOnClose}
    maskClosable={maskClosable}
    footer={footer}
    {...rest}
  >
    {children}
  </Drawer>
);

export default ModuleDrawer;
