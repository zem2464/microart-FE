import React, { useMemo, useState } from 'react';
import { Drawer, Space, Typography, Button, Input, InputNumber, Select, Switch, DatePicker } from 'antd';

const { Title, Text } = Typography;

// Lightweight, reusable bottom-sheet for a single change on mobile/PWA
export default function SingleChangeDrawer({
  open,
  title,
  description,
  field, // { key, label, type, options?, min?, max?, required? }
  currentValue,
  onSubmit,
  onClose,
  disabled,
}) {
  const [value, setValue] = useState(currentValue);
  const [submitting, setSubmitting] = useState(false);

  const isValid = useMemo(() => {
    if (!field) return false;
    if (field.required && (value === undefined || value === null || value === '')) return false;
    if (field.type === 'number') {
      if (field.min !== undefined && value < field.min) return false;
      if (field.max !== undefined && value > field.max) return false;
    }
    return true;
  }, [field, value]);

  const handleSubmit = async () => {
    if (!isValid || disabled) return;
    try {
      setSubmitting(true);
      await onSubmit?.(value);
      onClose?.();
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = () => {
    if (!field) return null;
    const commonProps = { style: { width: '100%' }, disabled: disabled || submitting };

    switch (field.type) {
      case 'text':
        return (
          <Input
            {...commonProps}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={field.label}
          />
        );
      case 'textarea':
        return (
          <Input.TextArea
            {...commonProps}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={field.label}
            autoSize={{ minRows: 3, maxRows: 6 }}
          />
        );
      case 'number':
        return (
          <InputNumber
            {...commonProps}
            value={value}
            onChange={(v) => setValue(v)}
            min={field.min}
            max={field.max}
            style={{ width: '100%' }}
          />
        );
      case 'select':
        return (
          <Select
            {...commonProps}
            value={value}
            onChange={setValue}
            options={(field.options || []).map((opt) =>
              typeof opt === 'string' ? { label: opt, value: opt } : opt
            )}
          />
        );
      case 'multiselect':
        return (
          <Select
            {...commonProps}
            mode="multiple"
            value={Array.isArray(value) ? value : []}
            onChange={setValue}
            options={(field.options || []).map((opt) =>
              typeof opt === 'string' ? { label: opt, value: opt } : opt
            )}
          />
        );
      case 'toggle':
        return (
          <Space>
            <Switch checked={!!value} onChange={(v) => setValue(v)} disabled={disabled || submitting} />
            <Text>{field.label}</Text>
          </Space>
        );
      case 'date':
        return (
          <DatePicker
            {...commonProps}
            value={value}
            onChange={setValue}
            style={{ width: '100%' }}
          />
        );
      default:
        return <Text type="secondary">Unsupported field type: {field.type}</Text>;
    }
  };

  return (
    <Drawer
      placement="bottom"
      height="90%"
      open={open}
      onClose={onClose}
      destroyOnClose
      className="single-change-drawer"
      styles={{
        body: {
          paddingBottom: 'env(safe-area-inset-bottom)',
        },
      }}
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Title level={4} style={{ margin: 0 }}>{title}</Title>
        {description && <Text type="secondary">{description}</Text>}
        <div>
          <Text strong>{field?.label}</Text>
          <div style={{ marginTop: 8 }}>{renderField()}</div>
        </div>

        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Button onClick={onClose} size="large" disabled={submitting}>Cancel</Button>
          <Button
            type="primary"
            size="large"
            onClick={handleSubmit}
            disabled={!isValid || disabled}
            loading={submitting}
          >
            Save
          </Button>
        </Space>
      </Space>
    </Drawer>
  );
}
