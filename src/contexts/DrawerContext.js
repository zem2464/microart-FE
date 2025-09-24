
import React, { createContext, useContext, useState } from 'react';
import { Space, Button } from 'antd';
import ModuleDrawer from '../components/common/ModuleDrawer';
import TaskTypeForm from '../components/TaskTypeForm';
import TaskTypeDetail from '../components/TaskTypeDetail';
import RoleDetail from '../components/RoleDetail';
import RoleForm from '../components/RoleForm';

const AppDrawerContext = createContext();

export const AppDrawerProvider = ({ children }) => {
	// Common Drawer
	const [drawer, setDrawer] = useState({ open: false, type: null, data: null, onSubmit: null });
	const showDrawer = (type, data = null, onSubmit = null) => setDrawer({ open: true, type, data, onSubmit });
	const closeDrawer = () => setDrawer({ open: false, type: null, data: null, onSubmit: null });
	// Role Detail Drawer
	const [roleDetailDrawer, setRoleDetailDrawer] = useState({ open: false, role: null });
	const showRoleDetailDrawer = (role) => setRoleDetailDrawer({ open: true, role });
	const closeRoleDetailDrawer = () => setRoleDetailDrawer({ open: false, role: null });

	// Role Form Drawer
	const [roleFormDrawer, setRoleFormDrawer] = useState({ open: false, role: null, mode: 'create', onSuccess: null });
	const showRoleFormDrawer = (role = null, mode = 'create', onSuccess = null) => setRoleFormDrawer({ open: true, role, mode, onSuccess });
	const closeRoleFormDrawer = () => setRoleFormDrawer({ open: false, role: null, mode: 'create', onSuccess: null });

	// TaskType Drawers
	const [taskTypeFormDrawer, setTaskTypeFormDrawer] = useState({ open: false, taskType: null, mode: 'create', onSuccess: null });
	const [taskTypeDetailDrawer, setTaskTypeDetailDrawer] = useState({ open: false, taskType: null });
	const showTaskTypeFormDrawer = (taskType = null, mode = 'create', onSuccess = null) => setTaskTypeFormDrawer({ open: true, taskType, mode, onSuccess });
	const closeTaskTypeFormDrawer = () => setTaskTypeFormDrawer({ open: false, taskType: null, mode: 'create', onSuccess: null });
	const showTaskTypeDetailDrawer = (taskType) => setTaskTypeDetailDrawer({ open: true, taskType });
	const closeTaskTypeDetailDrawer = () => setTaskTypeDetailDrawer({ open: false, taskType: null });

	// Project Drawers
	const [projectFormDrawer, setProjectFormDrawer] = useState({ open: false, project: null, mode: 'create', onSuccess: null });
	const [projectDetailDrawer, setProjectDetailDrawer] = useState({ open: false, project: null });
	const showProjectFormDrawer = (project = null, mode = 'create', onSuccess = null) => setProjectFormDrawer({ open: true, project, mode, onSuccess });
	const closeProjectFormDrawer = () => setProjectFormDrawer({ open: false, project: null, mode: 'create', onSuccess: null });
	const showProjectDetailDrawer = (project) => setProjectDetailDrawer({ open: true, project });
	const closeProjectDetailDrawer = () => setProjectDetailDrawer({ open: false, project: null });

	// User Drawers
	const [userFormDrawer, setUserFormDrawer] = useState({ open: false, user: null, mode: 'create', onSuccess: null });
	const [userDetailDrawer, setUserDetailDrawer] = useState({ open: false, user: null });
	const showUserFormDrawer = (user = null, mode = 'create', onSuccess = null) => setUserFormDrawer({ open: true, user, mode, onSuccess });
	const closeUserFormDrawer = () => setUserFormDrawer({ open: false, user: null, mode: 'create', onSuccess: null });
	const showUserDetailDrawer = (user) => setUserDetailDrawer({ open: true, user });
	const closeUserDetailDrawer = () => setUserDetailDrawer({ open: false, user: null });

	const value = {
		// Role
		showRoleFormDrawer,
		closeRoleFormDrawer,
		showRoleDetailDrawer,
		closeRoleDetailDrawer,
		// TaskType
		showTaskTypeFormDrawer,
		closeTaskTypeFormDrawer,
		showTaskTypeDetailDrawer,
		closeTaskTypeDetailDrawer,
		// Project
		showProjectFormDrawer,
		closeProjectFormDrawer,
		showProjectDetailDrawer,
		closeProjectDetailDrawer,
		// User
		showUserFormDrawer,
		closeUserFormDrawer,
		showUserDetailDrawer,
		closeUserDetailDrawer,
	};

	return (
		<AppDrawerContext.Provider value={value}>
			{children}
			{/* Role Form Drawer */}
			{roleFormDrawer.open && (
				<ModuleDrawer
					open={roleFormDrawer.open}
					title={roleFormDrawer.mode === 'edit' ? 'Edit Role' : 'Add Role'}
					width={400}
					placement="right"
					onClose={closeRoleFormDrawer}
					destroyOnClose
					maskClosable
					footer={
						<Space style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
							<Button onClick={closeRoleFormDrawer} size="middle">Cancel</Button>
							<Button type="primary" size="middle" onClick={() => {
								const form = document.querySelector('form');
								if (form) form.requestSubmit();
							}}>
								{roleFormDrawer.mode === 'edit' ? 'Update Role' : 'Create Role'}
							</Button>
						</Space>
					}
				>
					<RoleForm
						open={true}
						role={roleFormDrawer.role}
						onClose={closeRoleFormDrawer}
						onSuccess={roleFormDrawer.onSuccess}
						mode={roleFormDrawer.mode}
					/>
				</ModuleDrawer>
			)}
			{/* Role Detail Drawer */}
			{roleDetailDrawer.open && (
				<ModuleDrawer
					open={roleDetailDrawer.open}
					title="Role Details"
					width={400}
					placement="right"
					onClose={closeRoleDetailDrawer}
					destroyOnClose
					maskClosable
				>
					<RoleDetail role={roleDetailDrawer.role} onClose={closeRoleDetailDrawer} />
				</ModuleDrawer>
			)}
			{/* TaskType Form Drawer */}
			{taskTypeFormDrawer.open && (
				<ModuleDrawer
					open={taskTypeFormDrawer.open}
					title={taskTypeFormDrawer.mode === 'edit' ? 'Edit Task Type' : 'Add Task Type'}
					width={600}
					placement="right"
					onClose={closeTaskTypeFormDrawer}
					destroyOnClose
					maskClosable
					footer={
						<Space style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
							<Button onClick={closeTaskTypeFormDrawer} size="middle">Cancel</Button>
							<Button type="primary" size="middle" onClick={() => {
								const form = document.querySelector('form');
								if (form) form.requestSubmit();
							}}>
								{taskTypeFormDrawer.mode === 'edit' ? 'Update Task Type' : 'Create Task Type'}
							</Button>
						</Space>
					}
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
				</ModuleDrawer>
			)}
			{/* TaskType Detail Drawer */}
			{taskTypeDetailDrawer.open && (
				<ModuleDrawer
					open={taskTypeDetailDrawer.open}
					title="Task Type Details"
					width={800}
					placement="right"
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
				</ModuleDrawer>
			)}
			{/* Project Form Drawer */}
			{projectFormDrawer.open && (
				<ModuleDrawer
					open={projectFormDrawer.open}
					title={projectFormDrawer.mode === 'edit' ? 'Edit Project' : 'Add Project'}
					width={600}
					placement="right"
					onClose={closeProjectFormDrawer}
					destroyOnClose
					maskClosable
					footer={
						<Space style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
							<Button onClick={closeProjectFormDrawer} size="middle">Cancel</Button>
							<Button type="primary" size="middle" onClick={() => {
								const form = document.querySelector('form');
								if (form) form.requestSubmit();
							}}>
								{projectFormDrawer.mode === 'edit' ? 'Update Project' : 'Create Project'}
							</Button>
						</Space>
					}
				>
					<div>Project Form Component (To be implemented)</div>
				</ModuleDrawer>
			)}
			{/* Project Detail Drawer */}
			{projectDetailDrawer.open && (
				<ModuleDrawer
					open={projectDetailDrawer.open}
					title="Project Details"
					width={800}
					placement="right"
					onClose={closeProjectDetailDrawer}
					destroyOnClose
					maskClosable
				>
					<div>Project Detail Component (To be implemented)</div>
				</ModuleDrawer>
			)}
			{/* User Form Drawer */}
			{userFormDrawer.open && (
				<ModuleDrawer
					open={userFormDrawer.open}
					title={userFormDrawer.mode === 'edit' ? 'Edit User' : 'Add User'}
					width={600}
					placement="right"
					onClose={closeUserFormDrawer}
					destroyOnClose
					maskClosable
					footer={
						<Space style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
							<Button onClick={closeUserFormDrawer} size="middle">Cancel</Button>
							<Button type="primary" size="middle" onClick={() => {
								const form = document.querySelector('form');
								if (form) form.requestSubmit();
							}}>
								{userFormDrawer.mode === 'edit' ? 'Update User' : 'Create User'}
							</Button>
						</Space>
					}
				>
					<div>User Form Component (To be implemented)</div>
				</ModuleDrawer>
			)}
			{/* User Detail Drawer */}
			{userDetailDrawer.open && (
				<ModuleDrawer
					open={userDetailDrawer.open}
					title="User Details"
					width={800}
					placement="right"
					onClose={closeUserDetailDrawer}
					destroyOnClose
					maskClosable
				>
					<div>User Detail Component (To be implemented)</div>
				</ModuleDrawer>
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


