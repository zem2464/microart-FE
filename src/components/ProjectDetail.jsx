import React, { useState, useEffect, useRef, useCallback } from "react";
// Infinite Scroll Tasks Table:
// Replaces static tasks rendering with page-wise loading via Apollo fetchMore.
// Uses IntersectionObserver sentinel (rootMargin 300px) to prefetch next page.
// Hidden for DRAFT/REQUESTED statuses to preserve business rules.
import { useQuery, useReactiveVar } from "@apollo/client";
import {
  Card,
  Row,
  Col,
  Descriptions,
  Divider,
  Timeline,
  Empty,
  Typography,
  Progress,
} from "antd";
import { userCacheVar } from "../cache/userCacheVar";
import {
  hasPermission,
  MODULES,
  ACTIONS,
  generatePermission,
} from "../config/permissions";
import dayjs from "dayjs";
import { GET_TASKS } from "../gql/tasks";
import { GET_AVAILABLE_USERS } from "../graphql/projectQueries";
import TaskCard from "./TaskCard";

// Updated to use standardized TaskManager component for consistent task display across the app
// This replaces the previous basic table implementation with the same component used in project creation

const { Text } = Typography;

const ProjectDetail = ({ project, onClose }) => {
  const user = useReactiveVar(userCacheVar);

  // Check if user has limited permissions
  const hasLimitedRead = hasPermission(
    user,
    generatePermission(MODULES.PROJECTS, ACTIONS.LIMTEREAD)
  );
  const hasLimitedEdit = hasPermission(
    user,
    generatePermission(MODULES.PROJECTS, ACTIONS.LIMITEDIT)
  );
  const hasFullRead = hasPermission(
    user,
    generatePermission(MODULES.PROJECTS, ACTIONS.READ)
  );

  // Hide prices if user has limitedRead or limitedEdit (but not full read)
  const shouldHidePrices = hasLimitedRead || hasLimitedEdit;

  // Infinite scroll task aggregation state (tasks table replacement)
  const [tasks, setTasks] = useState(project?.tasks || []);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const sentinelRef = useRef(null);
  const [availableUsers, setAvailableUsers] = useState([]);

  // Fetch tasks if not present in project
  const {
    data: tasksData,
    loading: initialLoading,
    fetchMore,
  } = useQuery(GET_TASKS, {
    variables: {
      filters: project ? { projectId: project.id } : {},
      page: 1,
      limit: 25,
      sortBy: "createdAt",
      sortOrder: "DESC",
    },
    // Skip for draft/requested to maintain hidden tasks state
    skip:
      !project ||
      ["DRAFT", "REQUESTED"].includes(
        (project.status || "").toString().toUpperCase()
      ),
    fetchPolicy: "cache-and-network",
  });

  // Fetch available users for TaskManager
  const { data: usersData } = useQuery(GET_AVAILABLE_USERS, {
    fetchPolicy: "cache-first",
  });

  // Merge first page & subsequent pages
  useEffect(() => {
    if (tasksData?.tasks?.tasks) {
      const newTasks = tasksData.tasks.tasks;
      setTasks((prev) => {
        const existingIds = new Set(prev.map((t) => t.id));
        const merged = [...prev];
        newTasks.forEach((t) => {
          if (!existingIds.has(t.id)) merged.push(t);
        });
        return merged;
      });
      const pg = tasksData.tasks.pagination;
      if (pg) {
        setHasNextPage(!!pg.hasNextPage);
      }
    }
  }, [tasksData]);

  const loadMore = useCallback(async () => {
    if (
      !hasNextPage ||
      isFetchingMore ||
      ["DRAFT", "REQUESTED"].includes((project.status || "").toUpperCase())
    )
      return;
    setIsFetchingMore(true);
    try {
      const nextPage = page + 1;
      const { data } = await fetchMore({
        variables: { page: nextPage, limit: 25 },
      });
      const fetchedTasks = data?.tasks?.tasks || [];
      setTasks((prev) => {
        const existingIds = new Set(prev.map((t) => t.id));
        const merged = [...prev];
        fetchedTasks.forEach((t) => {
          if (!existingIds.has(t.id)) merged.push(t);
        });
        return merged;
      });
      const pg = data?.tasks?.pagination;
      if (pg) {
        setHasNextPage(!!pg.hasNextPage);
        setPage(pg.page);
      }
    } catch (e) {
      // Optional: add message.error
    } finally {
      setIsFetchingMore(false);
    }
  }, [fetchMore, hasNextPage, isFetchingMore, page, project.status]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            loadMore();
          }
        });
      },
      { root: null, rootMargin: "300px", threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  useEffect(() => {
    if (usersData?.availableUsers) {
      setAvailableUsers(usersData.availableUsers);
    }
  }, [usersData]);

  // Handle task updates from TaskManager
  const handleTaskUpdate = (updatedTask) => {
    // Update the local tasks state with the updated task
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === updatedTask.id ? { ...task, ...updatedTask } : task
      )
    );
  };

  const completedTasks = tasks.filter(
    (t) => (t.status || "").toString().toUpperCase() === "COMPLETED"
  ).length;
  const totalTasks = tasks.length;
  const progressPercent =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div>
      <Row gutter={16}>
        <Col span={16}>
          <Card
            title={project.projectCode || project.projectNumber || "Project"}
            style={{ marginBottom: 16 }}
          >
            <Descriptions column={1}>
              <Descriptions.Item label="Project Code">
                <Text code>
                  {project.projectCode || project.projectNumber || project.id}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Client">
                {project.client ? project.client.clientCode : "N/A"}
              </Descriptions.Item>
              <Descriptions.Item label="Work Type">
                {project.workType?.name || "N/A"}
              </Descriptions.Item>
              <Descriptions.Item label="Grading">
                {project.grading?.name || "N/A"}
                {!shouldHidePrices && project.grading?.defaultRate
                  ? ` (₹${project.grading.defaultRate})`
                  : ""}
              </Descriptions.Item>
              {!shouldHidePrices && (
                <Descriptions.Item label="Budget">
                  {project.estimatedCost
                    ? `₹${project.estimatedCost.toLocaleString()}`
                    : "Not set"}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Priority">
                {project.priority || "N/A"}
              </Descriptions.Item>
              <Descriptions.Item label="Deadline">
                {project.deadlineDate
                  ? dayjs(project.deadlineDate).format("YYYY-MM-DD")
                  : "Not set"}
              </Descriptions.Item>
            </Descriptions>

            {project.description && (
              <div style={{ marginTop: 12 }}>
                <Divider />
                <Text strong>Description:</Text>
                <div style={{ marginTop: 8 }}>{project.description}</div>
              </div>
            )}
          </Card>

          <Card
            title={`Tasks (${totalTasks})`}
            loading={initialLoading && tasks.length === 0}
            extra={
              hasNextPage ? (
                <Text type="secondary">Scrolling loads more…</Text>
              ) : null
            }
          >
            {/* If project is a draft or pending approval, do not show tasks and explain why */}
            {["DRAFT", "REQUESTED"].includes(
              (project.status || "").toString().toUpperCase()
            ) ? (
              <Empty
                description={
                  <span>
                    Project is in{" "}
                    {project.status === "REQUESTED"
                      ? "Pending Approval"
                      : "Draft"}{" "}
                    — tasks are hidden until the project is{" "}
                    {project.status === "REQUESTED" ? "approved" : "started"}.
                  </span>
                }
              />
            ) : totalTasks > 0 ? (
              <div
                style={{
                  maxHeight: "60vh",
                  overflowY: "auto",
                  paddingRight: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  {tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      availableUsers={availableUsers}
                      workType={project.workType}
                      grading={project.grading}
                      readOnly={false}
                      layout="list"
                      onTaskUpdate={(updatedTask) => {
                        handleTaskUpdate(updatedTask);
                      }}
                    />
                  ))}
                </div>
                {hasNextPage && (
                  <div
                    ref={sentinelRef}
                    style={{ padding: "16px 0", textAlign: "center" }}
                  >
                    <Text type="secondary">
                      {isFetchingMore ? "Loading…" : "Scroll for more tasks"}
                    </Text>
                  </div>
                )}
                {!hasNextPage && tasks.length > 0 && (
                  <div
                    style={{
                      padding: "8px 0",
                      textAlign: "center",
                      fontSize: 12,
                      color: "#888",
                    }}
                  >
                    End of task list
                  </div>
                )}
              </div>
            ) : (
              <Empty description="No tasks for this project" />
            )}
          </Card>
        </Col>

        <Col span={8}>
          <Card title="Progress" style={{ marginBottom: 16 }}>
            <div style={{ textAlign: "center" }}>
              <Progress
                type="circle"
                percent={progressPercent}
                format={() => `${completedTasks}/${totalTasks}`}
              />
            </div>
            <div style={{ marginTop: 12 }}>
              <Text>Completed: {completedTasks}</Text>
            </div>
          </Card>

          <Card title="Timeline">
            <Timeline
              items={[
                {
                  children: `Created At: ${
                    project.createdAt
                      ? dayjs(project.createdAt).format("MMM DD, YYYY")
                      : "N/A"
                  }`,
                  color: "blue",
                },
                project.deadlineDate && {
                  children: `Deadline: ${dayjs(project.deadlineDate).format(
                    "MMM DD, YYYY"
                  )}`,
                  color: dayjs(project.deadlineDate).isAfter(dayjs())
                    ? "orange"
                    : "red",
                },
              ].filter(Boolean)}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ProjectDetail;
