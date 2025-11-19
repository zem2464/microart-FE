// Example usage of the enhanced TaskCard with real-time functionality
import React, { useEffect, useRef, useState, useCallback } from 'react';
// Infinite scrolling implementation: loads tasks page-by-page using Apollo fetchMore
// Removes traditional pagination; sentinel at bottom triggers next page load when visible.
import { useQuery } from '@apollo/client';
import { Card, Row, Col, Spin, Alert } from 'antd';
import TaskCard from './TaskCard';
import { GET_TASKS } from '../gql/tasks';
import { GET_AVAILABLE_USERS } from '../graphql/projectQueries';

const TaskDashboard = () => {
  // Local aggregated tasks state for infinite scrolling
  const [allTasks, setAllTasks] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const { data: tasksData, loading: tasksLoading, error: tasksError, fetchMore } = useQuery(GET_TASKS, {
    variables: {
      page: 1,
      limit: 25,
      sortBy: 'createdAt',
      sortOrder: 'DESC'
    },
    fetchPolicy: 'cache-and-network'
  });

  // Fetch available users for assignment
  const { data: usersData, loading: usersLoading } = useQuery(GET_AVAILABLE_USERS);

  // Handle task updates
  const handleTaskUpdate = (updatedTask) => {
    console.log('Task updated:', updatedTask);
    // The cache will automatically update thanks to Apollo Client's normalization
    // You can perform additional actions here like analytics tracking
  };

  // Merge first page
  useEffect(() => {
    if (tasksData?.tasks?.tasks) {
      const newTasks = tasksData.tasks.tasks;
      setAllTasks(prev => {
        // Avoid duplicate IDs when refetching
        const existingIds = new Set(prev.map(t => t.id));
        const merged = [...prev];
        newTasks.forEach(t => { if (!existingIds.has(t.id)) merged.push(t); });
        return merged;
      });
      const pg = tasksData.tasks.pagination;
      if (pg) {
        setHasNextPage(!!pg.hasNextPage);
      }
    }
  }, [tasksData]);

  const loadMore = useCallback(async () => {
    if (!hasNextPage || isFetchingMore) return;
    setIsFetchingMore(true);
    try {
      const nextPage = currentPage + 1;
      const { data } = await fetchMore({
        variables: { page: nextPage, limit: 25 }
      });
      const fetchedTasks = data?.tasks?.tasks || [];
      setAllTasks(prev => {
        const existingIds = new Set(prev.map(t => t.id));
        const merged = [...prev];
        fetchedTasks.forEach(t => { if (!existingIds.has(t.id)) merged.push(t); });
        return merged;
      });
      const pg = data?.tasks?.pagination;
      if (pg) {
        setHasNextPage(!!pg.hasNextPage);
        setCurrentPage(pg.page);
      }
    } catch (e) {
      // Silently fail; user will see alert if initial load failed
      // Could add toast here if desired
    } finally {
      setIsFetchingMore(false);
    }
  }, [fetchMore, hasNextPage, currentPage, isFetchingMore]);

  // IntersectionObserver sentinel
  const sentinelRef = useRef(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          loadMore();
        }
      });
    }, { root: null, rootMargin: '300px', threshold: 0 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  if ((tasksLoading && allTasks.length === 0) || usersLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (tasksError) {
    return (
      <Alert
        message="Error loading tasks"
        description={tasksError.message}
        type="error"
        showIcon
      />
    );
  }

  const tasks = allTasks;
  const users = usersData?.availableUsers || [];

  return (
    <div style={{ padding: '24px' }}>
      <h1>Task Dashboard</h1>
      <p>Real-time collaborative task management with live comments and updates</p>
      
      <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: 8 }}>
        <Row gutter={[16, 16]}>
          {tasks.map((task) => (
            <Col xs={24} sm={12} md={8} lg={6} key={task.id}>
              <TaskCard
                task={task}
                availableUsers={users}
                onTaskUpdate={handleTaskUpdate}
                layout="grid"
              />
            </Col>
          ))}
        </Row>
        {/* Sentinel for infinite scrolling */}
        {hasNextPage && (
          <div ref={sentinelRef} style={{ padding: '24px 0', textAlign: 'center' }}>
            <Spin spinning={isFetchingMore} />
          </div>
        )}
        {!hasNextPage && tasks.length > 0 && (
          <div style={{ padding: '12px 0', textAlign: 'center', fontSize: 12, color: '#888' }}>
            End of task list
          </div>
        )}
      </div>

      {tasks.length === 0 && (
        <Card style={{ textAlign: 'center', marginTop: '50px' }}>
          <p>No tasks found</p>
        </Card>
      )}
    </div>
  );
};

export default TaskDashboard;