import React from "react";
import {
  Input,
  InputNumber,
  DatePicker,
  Select,
  Checkbox,
  Form,
  Typography,
} from "antd";
import dayjs from "dayjs";

const { TextArea } = Input;
const { Option } = Select;
const { Text } = Typography;

const CustomFieldRenderer = ({ field, value, onChange, disabled = false }) => {
  const {
    fieldType,
    fieldName,
    fieldKey,
    isRequired,
    placeholder,
    helpText,
    validation,
    options,
  } = field;

  // Parse options for select fields
  const parsedOptions = options
    ? Array.isArray(options)
      ? options
      : JSON.parse(options)
    : [];

  // Parse validation rules
  const parsedValidation = validation
    ? typeof validation === "object"
      ? validation
      : JSON.parse(validation)
    : {};

  // Handle value changes
  const handleChange = (newValue) => {
    onChange(fieldKey, newValue);
  };

  // Generate form rules based on field configuration
  const getFormRules = () => {
    const rules = [];

    if (isRequired) {
      rules.push({
        required: true,
        message: `${fieldName} is required`,
      });
    }

    // Add type-specific validation rules
    switch (fieldType) {
      case "number":
        if (parsedValidation.min !== undefined) {
          rules.push({
            type: "number",
            min: parsedValidation.min,
            message: `${fieldName} must be at least ${parsedValidation.min}`,
          });
        }
        if (parsedValidation.max !== undefined) {
          rules.push({
            type: "number",
            max: parsedValidation.max,
            message: `${fieldName} must not exceed ${parsedValidation.max}`,
          });
        }
        break;

      case "email":
        rules.push({
          type: "email",
          message: `Please enter a valid email address`,
        });
        break;

      case "url":
        rules.push({
          type: "url",
          message: `Please enter a valid URL`,
        });
        break;

      case "tel":
        if (parsedValidation.pattern) {
          rules.push({
            pattern: new RegExp(parsedValidation.pattern),
            message: `Please enter a valid phone number`,
          });
        }
        break;

      case "text":
      case "textarea":
        if (parsedValidation.minLength !== undefined) {
          rules.push({
            min: parsedValidation.minLength,
            message: `${fieldName} must be at least ${parsedValidation.minLength} characters`,
            rows: 2,
          });
        }
        if (parsedValidation.maxLength !== undefined) {
          rules.push({
            max: parsedValidation.maxLength,
            message: `${fieldName} must not exceed ${parsedValidation.maxLength} characters`,
          });
        }
        if (parsedValidation.pattern) {
          rules.push({
            pattern: new RegExp(parsedValidation.pattern),
            message:
              parsedValidation.patternMessage ||
              `${fieldName} format is invalid`,
          });
        }
        break;

      case "date":
      case "datetime":
        if (parsedValidation.min || parsedValidation.max) {
          rules.push({
            validator: (_, val) => {
              if (!val) return Promise.resolve();

              // Ensure val is a dayjs object
              let dateValue = val;
              if (!dayjs.isDayjs(val)) {
                dateValue = dayjs(val);
              }

              if (!dateValue.isValid()) {
                return Promise.reject(
                  new Error(`Please enter a valid ${fieldType}`)
                );
              }

              if (parsedValidation.min) {
                const minDate = dayjs(parsedValidation.min);
                if (minDate.isValid() && dateValue.isBefore(minDate)) {
                  return Promise.reject(
                    new Error(`${fieldName} must be after ${parsedValidation.min}`)
                  );
                }
              }

              if (parsedValidation.max) {
                const maxDate = dayjs(parsedValidation.max);
                if (maxDate.isValid() && dateValue.isAfter(maxDate)) {
                  return Promise.reject(
                    new Error(`${fieldName} must be before ${parsedValidation.max}`)
                  );
                }
              }

              return Promise.resolve();
            },
          });
        }
        break;

      case "select":
        if (parsedOptions.length > 0) {
          rules.push({
            validator: (_, val) => {
              if (!val && !isRequired) return Promise.resolve();
              if (parsedOptions.some((opt) => opt.value === val)) {
                return Promise.resolve();
              }
              return Promise.reject(
                new Error(`Please select a valid ${fieldName}`)
              );
            },
          });
        }
        break;

      case "multiselect":
        if (parsedOptions.length > 0) {
          rules.push({
            validator: (_, val) => {
              if ((!val || val.length === 0) && !isRequired)
                return Promise.resolve();
              if (
                Array.isArray(val) &&
                val.every((v) => parsedOptions.some((opt) => opt.value === v))
              ) {
                return Promise.resolve();
              }
              return Promise.reject(
                new Error(`Please select valid options for ${fieldName}`)
              );
            },
          });
        }
        break;

      default:
        break;
    }

    return rules;
  };

  // Render the appropriate input component based on field type
  const renderInput = () => {
    switch (fieldType) {
      case "text":
        return (
          <Input
            placeholder={placeholder}
            disabled={disabled}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
          />
        );

      case "textarea":
        return (
          <TextArea
            placeholder={placeholder}
            disabled={disabled}
            rows={2}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
          />
        );

      case "number":
        return (
          <InputNumber
            placeholder={placeholder}
            disabled={disabled}
            style={{ width: "100%" }}
            min={parsedValidation.min}
            max={parsedValidation.max}
            value={value}
            onChange={handleChange}
          />
        );

      case "date":
        return (
          <DatePicker
            placeholder={placeholder}
            disabled={disabled}
            style={{ width: "100%" }}
          />
        );

      case "datetime":
        return (
          <DatePicker
            showTime
            placeholder={placeholder}
            disabled={disabled}
            style={{ width: "100%" }}
          />
        );

      case "select":
        return (
          <Select
            placeholder={placeholder}
            disabled={disabled}
            allowClear
            style={{ width: "100%" }}
            value={value}
            onChange={handleChange}
          >
            {parsedOptions.map((option) => (
              <Option key={option.value} value={option.value}>
                {option.label}
                {option.description && (
                  <div style={{ fontSize: "12px", color: "#666" }}>
                    {option.description}
                  </div>
                )}
              </Option>
            ))}
          </Select>
        );

      case "multiselect":
        return (
          <Select
            mode="multiple"
            placeholder={placeholder}
            disabled={disabled}
            allowClear
            style={{ width: "100%" }}
            value={value || []}
            onChange={handleChange}
          >
            {parsedOptions.map((option) => (
              <Option key={option.value} value={option.value}>
                {option.label}
                {option.description && (
                  <div style={{ fontSize: "12px", color: "#666" }}>
                    {option.description}
                  </div>
                )}
              </Option>
            ))}
          </Select>
        );

      case "checkbox":
        return (
          <Checkbox
            disabled={disabled}
            checked={value}
            onChange={(e) => handleChange(e.target.checked)}
          >
            {placeholder || "Check this option"}
          </Checkbox>
        );

      case "email":
        return (
          <Input
            type="email"
            placeholder={placeholder || "Enter email address"}
            disabled={disabled}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
          />
        );

      case "url":
        return (
          <Input
            type="url"
            placeholder={placeholder || "Enter URL (https://...)"}
            disabled={disabled}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
          />
        );

      case "tel":
        return (
          <Input
            type="tel"
            placeholder={placeholder || "Enter phone number"}
            disabled={disabled}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
          />
        );

      default:
        return (
          <Input
            placeholder={placeholder}
            disabled={disabled}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
          />
        );
    }
  };

  const dateFormItemProps = (fieldType === "date" || fieldType === "datetime") ? {
    getValueProps: (val) => ({
      value: val ? dayjs(val) : null,
    }),
    getValueFromEvent: (val) => {
      if (!val) return null;
      return fieldType === "date" ? val.format("YYYY-MM-DD") : val.toISOString();
    },
  } : {};

  return (
    <Form.Item
      name={fieldKey}
      label={fieldName}
      rules={getFormRules()}
      help={helpText}
      {...dateFormItemProps}
      initialValue={(function () {
        // Ensure initialValue type matches component type to avoid rc-picker errors
        if ((fieldType === "date" || fieldType === "datetime") && field.defaultValue) {
          const dv = dayjs(field.defaultValue);
          return dv.isValid() ? (fieldType === "date" ? dv.format("YYYY-MM-DD") : dv.toISOString()) : null;
        }
        return field.defaultValue;
      })()}
    >
      {renderInput()}
    </Form.Item>
  );
};

export default CustomFieldRenderer;
