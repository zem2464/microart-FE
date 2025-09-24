import React from "react";
import { Form, Input, Button } from "antd";

const RoleForm = ({ initialValues = {}, onSubmit, loading }) => {
  const [form] = Form.useForm();

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={initialValues}
      onFinish={onSubmit}
    >
      <Form.Item name="name" label="Role Name" rules={[{ required: true }]}> <Input /> </Form.Item>
      <Form.Item name="description" label="Description"> <Input.TextArea /> </Form.Item>
      <Form.Item name="permissions" label="Permissions"> <Input /> </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading}>Save</Button>
      </Form.Item>
    </Form>
  );
};

export default RoleForm;
