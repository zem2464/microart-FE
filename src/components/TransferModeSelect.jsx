import React, { useState, useEffect } from "react";
import { Select, Button, Space, Input, message, Spin } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useQuery, useMutation } from "@apollo/client";
import { GET_TRANSFER_MODES, CREATE_TRANSFER_MODE } from "../gql/transferModes";
import TransferModeManager from "./TransferModeManager";
import TransferModeManagerAddIcon from "./TransferModeManagerAddIcon";

const { Option } = Select;

const TransferModeSelect = ({
  value,
  onChange,
  placeholder = "Select transfer mode",
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newModeName, setNewModeName] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [managerVisible, setManagerVisible] = useState(false);

  // Fetch transfer modes
  const {
    data: modesData,
    loading: modesLoading,
    refetch,
  } = useQuery(GET_TRANSFER_MODES, {
    variables: { isActive: true },
    fetchPolicy: "network-and-cache",
  });

  // Create transfer mode mutation
  const [createMode, { loading: creatingMode }] = useMutation(
    CREATE_TRANSFER_MODE,
    {
      onSuccess: () => {
        message.success("Transfer mode created successfully");
        setIsCreating(false);
        setNewModeName("");
        setSearchValue("");
        setNotFound(false);
        refetch();
      },
      onError: (error) => {
        message.error(error.message || "Failed to create transfer mode");
      },
    }
  );

  const modes = modesData?.transferModes || [];

  const handleCreateMode = async () => {
    if (!newModeName.trim()) {
      message.warning("Please enter a transfer mode name");
      return;
    }

    try {
      await createMode({
        variables: {
          input: {
            name: newModeName,
            description: `Created by user on ${new Date().toLocaleDateString()}`,
          },
        },
      });
    } catch (error) {
      console.error("Error creating transfer mode:", error);
    }
  };

  const handleSearch = (val) => {
    setSearchValue(val);
    if (val && !modes.some((m) => m.name.toLowerCase() === val.toLowerCase())) {
      setNotFound(true);
      setNewModeName(val);
    } else {
      setNotFound(false);
      setNewModeName("");
    }
  };

  return (
    <Spin spinning={modesLoading}>
      <div style={{ display: "flex", gap: 4 }}>
        <Select
          value={value}
          onChange={onChange}
          onSearch={handleSearch}
          placeholder={placeholder}
          showSearch
          optionFilterProp="children"
          style={{ flex: 1 }}
          notFoundContent={
            notFound ? (
              <div style={{ padding: "8px 0" }}>
                {isCreating ? (
                  <div style={{ padding: "8px" }}>
                    <Input
                      value={newModeName}
                      onChange={(e) => setNewModeName(e.target.value)}
                      placeholder="Enter mode name"
                      size="small"
                      onPressEnter={handleCreateMode}
                      autoFocus
                    />
                    <Space style={{ marginTop: "8px", width: "100%" }}>
                      <Button
                        size="small"
                        type="primary"
                        loading={creatingMode}
                        onClick={handleCreateMode}
                      >
                        Create
                      </Button>
                      <Button
                        size="small"
                        onClick={() => {
                          setIsCreating(false);
                          setNewModeName("");
                          setSearchValue("");
                          setNotFound(false);
                        }}
                      >
                        Cancel
                      </Button>
                    </Space>
                  </div>
                ) : (
                  <Button
                    type="dashed"
                    block
                    icon={<PlusOutlined />}
                    onClick={() => setIsCreating(true)}
                    size="small"
                  >
                    Create "{searchValue}"
                  </Button>
                )}
              </div>
            ) : (
              "No transfer modes found"
            )
          }
        >
          {modes.map((mode) => (
            <Option key={mode.id} value={mode.name}>
              {mode.name}
            </Option>
          ))}
        </Select>
        <Button
          icon={<TransferModeManagerAddIcon />}
          onClick={() => setManagerVisible(true)}
          title="Manage transfer modes"
        />
      </div>
      <TransferModeManager
        visible={managerVisible}
        onClose={() => {
          setManagerVisible(false);
          refetch();
        }}
      />
    </Spin>
  );
};

export default TransferModeSelect;
