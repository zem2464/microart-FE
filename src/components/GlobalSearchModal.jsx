import React, { useState, useEffect } from "react";
import { Modal, Input, List, Typography, Tag, Empty, Spin, Avatar } from "antd";
import {
  SearchOutlined,
  ProjectOutlined,
  UserOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import { useQuery } from "@apollo/client";
import { SEARCH_PROJECTS } from "../graphql/projectQueries";
import { useAppDrawer } from "../contexts/DrawerContext";
import dayjs from "dayjs";
import { useRef } from "react";

const { Text } = Typography;
const { Search } = Input;

const GlobalSearchModal = ({ open, onClose }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const { showProjectDetailDrawerV2 } = useAppDrawer();
  const searchRef = useRef();
  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (open) {
      // Delay focus slightly to ensure modal is fully rendered
      setTimeout(() => {
        searchRef.current?.input?.focus();
      }, 100);
    }
  }, [open]);

  // Query projects with search
  const { data, loading, error } = useQuery(SEARCH_PROJECTS, {
    variables: {
      search: debouncedSearchTerm,
    },
    skip: !debouncedSearchTerm || debouncedSearchTerm.length < 2,
    fetchPolicy: "network-only",
  });

  const handleProjectClick = (projectId) => {
    showProjectDetailDrawerV2(projectId);
    // Keep search modal open for multiple project lookups
  };

  const handleClose = () => {
    onClose();
    setSearchTerm("");
  };

  const projects = data?.projects?.projects || [];
  const normalizedSearch = debouncedSearchTerm.trim();
  const lowerSearch = normalizedSearch.toLowerCase();
  const isNumericSearch = /^\d+$/.test(normalizedSearch);
  const filteredProjects = projects.filter((project) => {
    const code = project.projectCode?.toLowerCase() || "";
    const name = project.name?.toLowerCase() || "";

    if (!normalizedSearch) return false;

    if (isNumericSearch) {
      // Exact match on project code when input is numeric
      return code === lowerSearch;
    }

    // Text search: match project code or project name (case-insensitive)
    return code.includes(lowerSearch) || name.includes(lowerSearch);
  });

  const getStatusColor = (status) => {
    const statusColors = {
      "Not Started": "default",
      "In Progress": "processing",
      Completed: "success",
      "On Hold": "warning",
      Cancelled: "error",
    };
    return statusColors[status] || "default";
  };

  const getPriorityColor = (priority) => {
    const priorityColors = {
      Low: "default",
      Medium: "warning",
      High: "error",
      Urgent: "error",
    };
    return priorityColors[priority] || "default";
  };

  const highlightMatch = (text, search) => {
    if (!search || !text) return text;

    const parts = text.toString().split(new RegExp(`(${search})`, "gi"));
    return parts.map((part, index) =>
      part.toLowerCase() === search.toLowerCase() ? (
        <span key={index} className="bg-yellow-200 font-semibold">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <SearchOutlined className="text-blue-500" />
          <span>Global Project Search</span>
        </div>
      }
      open={open}
      onCancel={handleClose}
      footer={null}
      width={800}
      destroyOnClose
      closeIcon={<CloseCircleOutlined />}
    >
      <div className="mb-4">
        <Search
          placeholder="Search by project code, name, client code, or client name..."
          size="large"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          allowClear
          autoFocus
          ref={searchRef}
        />
        {searchTerm && searchTerm.length < 2 && (
          <Text type="secondary" className="text-xs mt-1 block">
            Please enter at least 2 characters to search
          </Text>
        )}
      </div>

      <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
        {loading && (
          <div className="flex justify-center items-center py-8">
            <Spin size="large" tip="Searching projects..." />
          </div>
        )}

        {error && (
          <Empty
            description={
              <span className="text-red-500">
                Error loading projects: {error.message}
              </span>
            }
          />
        )}

        {!loading &&
          !error &&
          debouncedSearchTerm &&
          debouncedSearchTerm.length >= 2 && (
            <>
              {filteredProjects.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No projects found"
                />
              ) : (
                <>
                  <Text type="secondary" className="text-sm mb-2 block">
                    Found {filteredProjects.length} project
                    {filteredProjects.length !== 1 ? "s" : ""}
                  </Text>
                  <List
                    dataSource={filteredProjects}
                    renderItem={(project) => (
                      <List.Item
                        className="cursor-pointer hover:bg-gray-50 transition-colors rounded-lg px-4"
                        onClick={() => handleProjectClick(project.id)}
                      >
                        <List.Item.Meta
                          avatar={
                            <Avatar
                              icon={<ProjectOutlined />}
                              className="bg-blue-500"
                              size="large"
                            />
                          }
                          title={
                            <div className="flex items-center gap-2 flex-wrap">
                              <Text strong className="text-base">
                                {highlightMatch(
                                  project.projectCode,
                                  normalizedSearch
                                )}
                              </Text>
                              <Text className="text-gray-600">
                                {highlightMatch(project.name, normalizedSearch)}
                              </Text>
                              <Tag color={getStatusColor(project.status)}>
                                {project.status}
                              </Tag>
                              {project.priority && (
                                <Tag color={getPriorityColor(project.priority)}>
                                  {project.priority}
                                </Tag>
                              )}
                            </div>
                          }
                          description={
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <UserOutlined className="text-gray-400" />
                                <Text type="secondary">
                                  Client: {project.client?.displayName || "N/A"}{" "}
                                  ({project.client?.clientCode || "N/A"})
                                </Text>
                              </div>
                              {project.description && (
                                <Text
                                  type="secondary"
                                  className="text-xs line-clamp-1"
                                >
                                  {project.description}
                                </Text>
                              )}
                              <div className="flex items-center gap-4 text-xs">
                                {project.totalImageQuantity > 0 && (
                                  <Text type="secondary">
                                    Images: {project.totalImageQuantity}
                                  </Text>
                                )}
                                {project.deadlineDate && (
                                  <Text type="secondary">
                                    Deadline:{" "}
                                    {dayjs(project.deadlineDate).format(
                                      "MMM D, YYYY"
                                    )}
                                  </Text>
                                )}
                                {project.taskCount > 0 && (
                                  <Text type="secondary">
                                    Tasks: {project.completedTaskCount}/
                                    {project.taskCount}
                                  </Text>
                                )}
                              </div>
                            </div>
                          }
                        />
                      </List.Item>
                    )}
                  />
                </>
              )}
            </>
          )}

        {!debouncedSearchTerm && (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Start typing to search for projects..."
          />
        )}
      </div>
    </Modal>
  );
};

export default GlobalSearchModal;
