import React, { createContext, useContext, useState } from 'react';
import { Drawer } from 'antd';

// Import your drawer components here
import TaskTypeForm from '../components/TaskTypeForm';
import TaskTypeDetail from '../components/TaskTypeDetail';
// Add more drawer components as needed

const AppDrawerContext = createContext();

export const AppDrawerProvider = ({ children }) => {
  // TaskType Drawers
  const [taskTypeFormDrawer, setTaskTypeFormDrawer] = useState({
    open: false,
    taskType: null,
    mode: 'create', // 'create' or 'edit'
    onSuccess: null,
  });

  const [taskTypeDetailDrawer, setTaskTypeDetailDrawer] = useState({
    open: false,
    taskType: null,
  });

  // Project Drawers (for future use)
  const [projectFormDrawer, setProjectFormDrawer] = useState({
    open: false,
    project: null,
    mode: 'create',
    onSuccess: null,
  });

  const [projectDetailDrawer, setProjectDetailDrawer] = useState({
    open: false,
    project: null,
  });

  // User Drawers (for future use)
  const [userFormDrawer, setUserFormDrawer] = useState({
    open: false,
    user: null,
    mode: 'create',
    onSuccess: null,
  });

  const [userDetailDrawer, setUserDetailDrawer] = useState({
    open: false,
    user: null,
  });

  // TaskType Drawer Methods
  const showTaskTypeFormDrawer = (taskType = null, mode = 'create', onSuccess = null) => {
    setTaskTypeFormDrawer({
      open: true,
      taskType,
      mode,
      onSuccess,
    });
  };

  const closeTaskTypeFormDrawer = () => {
    setTaskTypeFormDrawer({
      open: false,
      taskType: null,
      mode: 'create',
      onSuccess: null,
    });
  };

  const showTaskTypeDetailDrawer = (taskType) => {
    setTaskTypeDetailDrawer({
      open: true,
      taskType,
    });
  };

  const closeTaskTypeDetailDrawer = () => {
    setTaskTypeDetailDrawer({
      open: false,
      taskType: null,
    });
  };

  // Project Drawer Methods (for future use)
  const showProjectFormDrawer = (project = null, mode = 'create', onSuccess = null) => {
    setProjectFormDrawer({
      open: true,
      project,
      mode,
      onSuccess,
    });
  };

  const closeProjectFormDrawer = () => {
    setProjectFormDrawer({
      open: false,
      project: null,
      mode: 'create',
      onSuccess: null,
    });
  };

  const showProjectDetailDrawer = (project) => {
    setProjectDetailDrawer({
      open: true,
      project,
    });
  };

  const closeProjectDetailDrawer = () => {
    setProjectDetailDrawer({
      open: false,
      project: null,
    });
  };

  // User Drawer Methods (for future use)
  const showUserFormDrawer = (user = null, mode = 'create', onSuccess = null) => {
    setUserFormDrawer({
      open: true,
      user,
      mode,
      onSuccess,
    });
  };

  const closeUserFormDrawer = () => {
    setUserFormDrawer({
      open: false,
      user: null,
      mode: 'create',
      onSuccess: null,
    });
  };

  const showUserDetailDrawer = (user) => {
    setUserDetailDrawer({
      open: true,
      user,
    });
  };

  const closeUserDetailDrawer = () => {
    setUserDetailDrawer({
      open: false,
      user: null,
    });
  };

  const value = {
    // TaskType Methods
    showTaskTypeFormDrawer,
    closeTaskTypeFormDrawer,
    showTaskTypeDetailDrawer,
    closeTaskTypeDetailDrawer,
    
    // Project Methods
    showProjectFormDrawer,
    closeProjectFormDrawer,
    showProjectDetailDrawer,
    closeProjectDetailDrawer,
    
    // User Methods
    showUserFormDrawer,
    closeUserFormDrawer,
    showUserDetailDrawer,
    closeUserDetailDrawer,
  };

  return (
    <AppDrawerContext.Provider value={value}>
      {children}
      
      {/* TaskType Form Drawer */}
      {taskTypeFormDrawer.open && (
        <Drawer
          title={taskTypeFormDrawer.mode === 'create' ? 'Add Task Type' : 'Edit Task Type'}
          width={600}
          placement="right"
          open={taskTypeFormDrawer.open}
          onClose={closeTaskTypeFormDrawer}
          destroyOnClose
          maskClosable
        >
          <TaskTypeForm
            open={true}
            taskType={taskTypeFormDrawer.taskType}
            mode={taskTypeFormDrawer.mode}
            onSuccess={(result) => {
              closeTaskTypeFormDrawer();
              if (taskTypeFormDrawer.onSuccess) {
                taskTypeFormDrawer.onSuccess(result);
              }
            }}
            onClose={closeTaskTypeFormDrawer}
          />
        </Drawer>
      )}

      {/* TaskType Detail Drawer */}
      {taskTypeDetailDrawer.open && (
        <Drawer
          title="Task Type Details"
          width={800}
          placement="right"
          open={taskTypeDetailDrawer.open}
          onClose={closeTaskTypeDetailDrawer}
          destroyOnClose
          maskClosable
        >
          <TaskTypeDetail
            open={true}
            taskType={taskTypeDetailDrawer.taskType}
            onClose={closeTaskTypeDetailDrawer}
            onEdit={(taskType) => {
              closeTaskTypeDetailDrawer();
              showTaskTypeFormDrawer(taskType, 'edit');
            }}
          />
        </Drawer>
      )}

      {/* Future Project Form Drawer */}
      {projectFormDrawer.open && (
        <Drawer
          title={projectFormDrawer.mode === 'create' ? 'Add Project' : 'Edit Project'}
          width={600}
          placement="right"
          open={projectFormDrawer.open}
          onClose={closeProjectFormDrawer}
          destroyOnClose
          maskClosable
        >
          {/* Project form component will go here */}
          <div>Project Form Component (To be implemented)</div>
        </Drawer>
      )}

      {/* Future Project Detail Drawer */}
      {projectDetailDrawer.open && (
        <Drawer
          title="Project Details"
          width={800}
          placement="right"
          open={projectDetailDrawer.open}
          onClose={closeProjectDetailDrawer}
          destroyOnClose
          maskClosable
        >
          {/* Project detail component will go here */}
          <div>Project Detail Component (To be implemented)</div>
        </Drawer>
      )}

      {/* Future User Form Drawer */}
      {userFormDrawer.open && (
        <Drawer
          title={userFormDrawer.mode === 'create' ? 'Add User' : 'Edit User'}
          width={600}
          placement="right"
          open={userFormDrawer.open}
          onClose={closeUserFormDrawer}
          destroyOnClose
          maskClosable
        >
          {/* User form component will go here */}
          <div>User Form Component (To be implemented)</div>
        </Drawer>
      )}

      {/* Future User Detail Drawer */}
      {userDetailDrawer.open && (
        <Drawer
          title="User Details"
          width={800}
          placement="right"
          open={userDetailDrawer.open}
          onClose={closeUserDetailDrawer}
          destroyOnClose
          maskClosable
        >
          {/* User detail component will go here */}
          <div>User Detail Component (To be implemented)</div>
        </Drawer>
      )}
    </AppDrawerContext.Provider>
  );
};

export const useAppDrawer = () => {
  const context = useContext(AppDrawerContext);
  if (!context) {
    throw new Error('useAppDrawer must be used within an AppDrawerProvider');
  }
  return context;
};