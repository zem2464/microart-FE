import React, { useState } from "react";
import { Modal, Table, Button, Input, Space, Popconfirm, message } from "antd";
import { useQuery, useMutation } from "@apollo/client";
import {
  GET_TRANSFER_MODES,
  UPDATE_TRANSFER_MODE,
  DELETE_TRANSFER_MODE,
} from "../gql/transferModes";

const TransferModeManager = ({ visible, onClose }) => {
    const [addName, setAddName] = useState("");
    const [addLoading, setAddLoading] = useState(false);
    const [addError, setAddError] = useState("");
    const [createMode] = useMutation(require("../gql/transferModes").CREATE_TRANSFER_MODE, {
      onCompleted: () => {
        message.success("Transfer mode added");
        setAddName("");
        setAddError("");
        refetch();
      },
      onError: (err) => {
        setAddError(err.message || "Add failed");
        setAddLoading(false);
      },
    });

    const handleAdd = async () => {
      if (!addName.trim()) {
        setAddError("Name required");
        return;
      }
      setAddLoading(true);
      setAddError("");
      try {
        await createMode({
          variables: {
            input: { name: addName.trim(), description: "" },
          },
        });
      } catch (e) {
        setAddLoading(false);
      }
      setAddLoading(false);
    };
  const { data, loading, refetch } = useQuery(GET_TRANSFER_MODES, {
    variables: { isActive: true },
    fetchPolicy: "network-and-cache",
    skip: !visible,
  });

  const [updateMode, { loading: updating }] = useMutation(UPDATE_TRANSFER_MODE, {
    onCompleted: () => {
      message.success("Transfer mode updated");
      refetch();
    },
    onError: (err) => message.error(err.message || "Update failed"),
  });

  const [deleteMode, { loading: deleting }] = useMutation(DELETE_TRANSFER_MODE, {
    onCompleted: () => {
      message.success("Transfer mode deleted");
      refetch();
    },
    onError: (err) => message.error(err.message || "Delete failed"),
  });

  const modes = data?.transferModes || [];
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");

  const startEdit = (record) => {
    setEditingId(record.id);
    setEditingName(record.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  const saveEdit = async (record) => {
    if (!editingName.trim()) {
      message.warning("Name cannot be empty");
      return;
    }
    try {
      await updateMode({
        variables: {
          id: record.id,
          input: { name: editingName.trim() },
        },
      });
      cancelEdit();
    } catch (e) {}
  };

  const handleDelete = async (record) => {
    try {
      await deleteMode({ variables: { id: record.id } });
    } catch (e) {}
  };

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (text, record) =>
        editingId === record.id ? (
          <Input
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            size="small"
            autoFocus
          />
        ) : (
          text
        ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          {editingId === record.id ? (
            <>
              <Button size="small" type="primary" loading={updating} onClick={() => saveEdit(record)}>
                Save
              </Button>
              <Button size="small" onClick={cancelEdit}>Cancel</Button>
            </>
          ) : (
            <Button size="small" onClick={() => startEdit(record)} disabled={record.isSystem}>
              Edit
            </Button>
          )}
          <Popconfirm
            title="Delete this mode?"
            okText="Delete"
            cancelText="Cancel"
            onConfirm={() => handleDelete(record)}
            disabled={record.isSystem}
          >
            <Button size="small" danger loading={deleting} disabled={record.isSystem}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Modal title="Manage Transfer Modes" open={visible} onCancel={onClose} footer={null} width={600}>
      <div style={{ marginBottom: 16 }}>
        <Input.Group compact>
          <Input
            style={{ width: 300 }}
            placeholder="Add new transfer mode"
            value={addName}
            onChange={e => { setAddName(e.target.value); setAddError(""); }}
            onPressEnter={handleAdd}
            maxLength={100}
            disabled={addLoading}
          />
          <Button type="primary" loading={addLoading} onClick={handleAdd} disabled={addLoading}>
            Add
          </Button>
        </Input.Group>
        {addError && <div style={{ color: "red", marginTop: 4 }}>{addError}</div>}
      </div>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={modes}
        columns={columns}
        pagination={false}
        size="small"
      />
      <div style={{ marginTop: 12, textAlign: "right" }}>
        <Button onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
};

export default TransferModeManager;
