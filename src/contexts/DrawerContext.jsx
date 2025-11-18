
import React, { createContext, useContext, useState } from 'react';
import { Space, Button } from 'antd';
import ModuleDrawer from '../components/common/ModuleDrawer';
import TaskTypeForm from '../components/TaskTypeForm';
import TaskTypeDetail from '../components/TaskTypeDetail';
import RoleDetail from '../components/RoleDetail';
import RoleForm from '../components/RoleForm';
import UserDetail from '../components/UserDetail';
import UserForm from '../components/UserForm';
import WorkTypeForm from '../components/WorkTypeForm';
import WorkTypeDetail from '../components/WorkTypeDetail';
import GradingForm from '../components/GradingForm';
import GradingDetail from '../components/GradingDetail';
import ProjectForm from '../components/ProjectForm';
import ProjectFormFooter from '../components/ProjectFormFooter';
import ClientForm from '../pages/FrontOffice/ClientForm';
import ClientDetail from '../components/ClientDetail';
import ProjectDetail from '../components/ProjectDetail';

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
	const [projectCreditExceeded, setProjectCreditExceeded] = useState(false);
	const [projectFooterData, setProjectFooterData] = useState({ totalImageQuantity: 0, totalCalculatedBudget: 0 });
	const [projectDetailDrawer, setProjectDetailDrawer] = useState({ open: false, project: null });
	const showProjectFormDrawer = (project = null, mode = 'create', onSuccess = null) => {
		setProjectFormDrawer({ open: true, project, mode, onSuccess });
		setProjectCreditExceeded(false); // Reset on open
	};
	const closeProjectFormDrawer = () => {
		setProjectFormDrawer({ open: false, project: null, mode: 'create', onSuccess: null });
		setProjectCreditExceeded(false);
		setProjectFooterData({ totalImageQuantity: 0, totalCalculatedBudget: 0 });
	};
	const showProjectDetailDrawer = (project) => setProjectDetailDrawer({ open: true, project });
	const closeProjectDetailDrawer = () => setProjectDetailDrawer({ open: false, project: null });

	// User Drawers
	const [userFormDrawer, setUserFormDrawer] = useState({ open: false, user: null, mode: 'create', onSuccess: null });
	const [userDetailDrawer, setUserDetailDrawer] = useState({ open: false, user: null });
	const showUserFormDrawer = (user = null, mode = 'create', onSuccess = null) => setUserFormDrawer({ open: true, user, mode, onSuccess });
	const closeUserFormDrawer = () => setUserFormDrawer({ open: false, user: null, mode: 'create', onSuccess: null });
	const showUserDetailDrawer = (user) => setUserDetailDrawer({ open: true, user });
	const closeUserDetailDrawer = () => setUserDetailDrawer({ open: false, user: null });

	// WorkType Drawers
	const [workTypeFormDrawer, setWorkTypeFormDrawer] = useState({ open: false, workType: null, mode: 'create', onSuccess: null });
	const [workTypeDetailDrawer, setWorkTypeDetailDrawer] = useState({ open: false, workType: null });
	const showWorkTypeFormDrawer = (workType = null, mode = 'create', onSuccess = null) => setWorkTypeFormDrawer({ open: true, workType, mode, onSuccess });
	const closeWorkTypeFormDrawer = () => setWorkTypeFormDrawer({ open: false, workType: null, mode: 'create', onSuccess: null });
	const showWorkTypeDetailDrawer = (workType) => setWorkTypeDetailDrawer({ open: true, workType });
	const closeWorkTypeDetailDrawer = () => setWorkTypeDetailDrawer({ open: false, workType: null });

	// Grading Drawers
	const [gradingFormDrawer, setGradingFormDrawer] = useState({ open: false, grading: null, mode: 'create', onSuccess: null });
	const [gradingDetailDrawer, setGradingDetailDrawer] = useState({ open: false, grading: null });
	const showGradingFormDrawer = (grading = null, mode = 'create', onSuccess = null) => setGradingFormDrawer({ open: true, grading, mode, onSuccess });
	const closeGradingFormDrawer = () => setGradingFormDrawer({ open: false, grading: null, mode: 'create', onSuccess: null });
	const showGradingDetailDrawer = (grading) => setGradingDetailDrawer({ open: true, grading });
	const closeGradingDetailDrawer = () => setGradingDetailDrawer({ open: false, grading: null });

	// Client Drawers
	const [clientFormDrawer, setClientFormDrawer] = useState({ open: false, client: null, mode: 'create', onSuccess: null });
	const [clientFormHeader, setClientFormHeader] = useState(null);
	const [clientFormFooter, setClientFormFooter] = useState(null);
	const [clientDetailDrawer, setClientDetailDrawer] = useState({ open: false, client: null });
	const showClientFormDrawer = (client = null, mode = 'create', onSuccess = null) => setClientFormDrawer({ open: true, client, mode, onSuccess });
	const closeClientFormDrawer = () => {
		setClientFormDrawer({ open: false, client: null, mode: 'create', onSuccess: null });
		setClientFormHeader(null);
		setClientFormFooter(null);
	};
	const showClientDetailDrawer = (client) => setClientDetailDrawer({ open: true, client });
	const closeClientDetailDrawer = () => setClientDetailDrawer({ open: false, client: null });

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
		// WorkType
		showWorkTypeFormDrawer,
		closeWorkTypeFormDrawer,
		showWorkTypeDetailDrawer,
		closeWorkTypeDetailDrawer,
		// Grading
		showGradingFormDrawer,
		closeGradingFormDrawer,
		showGradingDetailDrawer,
		closeGradingDetailDrawer,
		// Client
		showClientFormDrawer,
		closeClientFormDrawer,
		showClientDetailDrawer,
		closeClientDetailDrawer,
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
					width={1200}
					placement="right"
					onClose={closeProjectFormDrawer}
					destroyOnClose
					maskClosable={false}
					footer={
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
							<Space size="large">
								<ProjectFormFooter 
									totalImageQuantity={projectFooterData.totalImageQuantity}
									totalCalculatedBudget={projectFooterData.totalCalculatedBudget}
								/>
							</Space>
							<Space>
								<Button onClick={closeProjectFormDrawer} size="middle">Cancel</Button>
								{projectCreditExceeded ? (
									<Button 
										type="primary" 
										size="middle" 
										danger
										onClick={() => {
											// Trigger the credit request submission
											const event = new CustomEvent('request-credit-approval');
											window.dispatchEvent(event);
										}}
									>
										Request Fly-on-Credit Approval
									</Button>
								) : (
									<Button type="primary" size="middle" onClick={() => {
										const form = document.querySelector('form');
										if (form) form.requestSubmit();
									}}>
										{projectFormDrawer.mode === 'edit' ? 'Update Project' : 'Save Project'}
									</Button>
								)}
							</Space>
						</div>
					}
				>
				<ProjectForm
					project={projectFormDrawer.project}
					mode={projectFormDrawer.mode}
					onClose={closeProjectFormDrawer}
					onSuccess={projectFormDrawer.onSuccess}
					onCreditExceeded={(exceeded) => setProjectCreditExceeded(exceeded)}
					onFooterDataChange={(data) => setProjectFooterData(data)}
				/>
				</ModuleDrawer>
			)}
			{/* Project Detail Drawer */}
			{projectDetailDrawer.open && (
				<ModuleDrawer
					open={projectDetailDrawer.open}
					title="Project Details"
					width={1000}
					placement="right"
					onClose={closeProjectDetailDrawer}
					destroyOnClose
					maskClosable
				>
					<React.Suspense fallback={<div>Loading...</div>}>
						{/* Lazy render project detail to keep drawer context light */}
						<ProjectDetail project={projectDetailDrawer.project} onClose={closeProjectDetailDrawer} />
					</React.Suspense>
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
					<UserForm
						open={true}
						user={userFormDrawer.user}
						onClose={closeUserFormDrawer}
						onSuccess={userFormDrawer.onSuccess}
						mode={userFormDrawer.mode}
					/>
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
					<UserDetail 
						user={userDetailDrawer.user} 
						onClose={closeUserDetailDrawer} 
					/>
				</ModuleDrawer>
			)}

			{/* WorkType Form Drawer */}
			{workTypeFormDrawer.open && (
				<ModuleDrawer
					open={workTypeFormDrawer.open}
					title={workTypeFormDrawer.mode === 'edit' ? 'Edit Work Type' : 'Add Work Type'}
					width={700}
					placement="right"
					onClose={closeWorkTypeFormDrawer}
					destroyOnClose
					maskClosable
					footer={
						<Space style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
							<Button onClick={closeWorkTypeFormDrawer} size="middle">Cancel</Button>
							<Button type="primary" size="middle" onClick={() => {
								const form = document.querySelector('form');
								if (form) form.requestSubmit();
							}}>
								{workTypeFormDrawer.mode === 'edit' ? 'Update Work Type' : 'Create Work Type'}
							</Button>
						</Space>
					}
				>
					<WorkTypeForm
						workType={workTypeFormDrawer.workType}
						mode={workTypeFormDrawer.mode}
						onClose={closeWorkTypeFormDrawer}
						onSuccess={workTypeFormDrawer.onSuccess}
					/>
				</ModuleDrawer>
			)}

			{/* WorkType Detail Drawer */}
			{workTypeDetailDrawer.open && (
				<ModuleDrawer
					open={workTypeDetailDrawer.open}
					title="Work Type Details"
					width={900}
					placement="right"
					onClose={closeWorkTypeDetailDrawer}
					destroyOnClose
					maskClosable
				>
					<WorkTypeDetail 
						workType={workTypeDetailDrawer.workType}
						onEdit={() => {
							closeWorkTypeDetailDrawer();
							showWorkTypeFormDrawer(workTypeDetailDrawer.workType, 'edit');
						}}
						onClose={closeWorkTypeDetailDrawer} 
					/>
				</ModuleDrawer>
			)}

			{/* Grading Form Drawer */}
			{gradingFormDrawer.open && (
				<ModuleDrawer
					open={gradingFormDrawer.open}
					title={gradingFormDrawer.mode === 'edit' ? 'Edit Grading' : 'Add Grading'}
					width={900}
					placement="right"
					destroyOnClose
					onClose={closeGradingFormDrawer}
					footer={null}
				>
					<GradingForm
						grading={gradingFormDrawer.grading}
						mode={gradingFormDrawer.mode}
						onCancel={closeGradingFormDrawer}
						onSuccess={() => {
							closeGradingFormDrawer();
							gradingFormDrawer.onSuccess?.();
						}}
					/>
				</ModuleDrawer>
			)}

			{/* Grading Detail Drawer */}
			{gradingDetailDrawer.open && (
				<ModuleDrawer
					open={gradingDetailDrawer.open}
					title="Grading Details"
					width={1000}
					placement="right"
					onClose={closeGradingDetailDrawer}
					destroyOnClose
					maskClosable
				>
					<GradingDetail 
						grading={gradingDetailDrawer.grading}
						onEdit={() => {
							closeGradingDetailDrawer();
							showGradingFormDrawer(gradingDetailDrawer.grading, 'edit');
						}}
						onClose={closeGradingDetailDrawer} 
					/>
				</ModuleDrawer>
			)}

			{/* Client Form Drawer */}
			{clientFormDrawer.open && (
				<ModuleDrawer
					open={clientFormDrawer.open}
					title={clientFormHeader || (clientFormDrawer.mode === 'edit' ? 'Edit Client' : 'Add Client')}
					width={800}
					placement="right"
					destroyOnClose
					onClose={closeClientFormDrawer}
					footer={clientFormFooter}
				>
					<ClientForm
						client={clientFormDrawer.client}
						mode={clientFormDrawer.mode}
						onClose={closeClientFormDrawer}
						onSuccess={(result) => {
							closeClientFormDrawer();
							if (clientFormDrawer.onSuccess) {
								clientFormDrawer.onSuccess(result);
							}
						}}
						renderHeaderInDrawer={setClientFormHeader}
						renderFooterInDrawer={setClientFormFooter}
					/>
				</ModuleDrawer>
			)}

			{/* Client Detail Drawer */}
			{clientDetailDrawer.open && (
				<ModuleDrawer
					open={clientDetailDrawer.open}
					title="Client Details"
					width={1200}
					placement="right"
					onClose={closeClientDetailDrawer}
					destroyOnClose
					maskClosable
				>
					<ClientDetail 
						client={clientDetailDrawer.client}
						onEdit={(client) => {
							closeClientDetailDrawer();
							showClientFormDrawer(client, 'edit');
						}}
						onClose={closeClientDetailDrawer} 
					/>
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

export { AppDrawerContext };


