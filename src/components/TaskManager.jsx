import React, { useState, useEffect } from "react";
import {
  Row,
  Col,
  Select,
  Typography,
  Form,
  Modal,
  message,
} from "antd";
import {
  LinkOutlined,
  CheckSquareOutlined,
} from "@ant-design/icons";
import TaskCard from "./TaskCard";

const { Option } = Select;
const { Text } = Typography;

const TaskManager = ({ 
  tasks = [], 
  onTaskUpdate, 
  availableUsers = [], 
  readOnly = false,
  workType = null,
  grading = null,
  customFields = [],
  layout = "grid", // "grid", "list", or "row"
  clientCode = null,
  projectDescription = null,
  clientPreferences = null
}) => {
  const [linkingTask, setLinkingTask] = useState(null);
  const [linkForm] = Form.useForm();

  // Enhance tasks with additional properties
  const enhanceTask = (task) => ({
    id: task.id,
    taskKey: task.taskKey || `TASK-${task.id}`,
    name: task.name || task.title || 'Untitled Task',
    description: task.description || projectDescription || 'No description provided',
    taskType: task.taskType || task.type || 'task',
    status: task.status || 'todo',
    priority: task.priority || 'medium',
    assigneeId: task.assigneeId || task.assignee?.id,
    estimatedHours: task.estimatedHours || 0,
    actualHours: task.actualHours || 0,
    dueDate: task.dueDate || null,
    dependencies: task.dependencies || [],
    comments: task.comments || [],
    customFields: task.customFields || {},
    clientCode: clientCode,
    createdAt: task.createdAt || new Date().toISOString(),
    updatedAt: task.updatedAt || new Date().toISOString(),
  });

  const [enhancedTasks, setEnhancedTasks] = useState([]);

  useEffect(() => {
    setEnhancedTasks(tasks.map(enhanceTask));
  }, [tasks]);

  // Handle task update
  const handleTaskUpdate = (taskId, updates) => {
    const updatedTasks = enhancedTasks.map(task => 
      task.id === taskId 
        ? { ...task, ...updates, updatedAt: new Date().toISOString() }
        : task
    );
    setEnhancedTasks(updatedTasks);
    if (onTaskUpdate) {
      onTaskUpdate(updatedTasks);
    }
  };

  // Open task linking modal
  const openTaskLinkModal = (task) => {
    setLinkingTask(task);
    linkForm.setFieldsValue({
      dependencies: task.dependencies,
    });
  };

  // Save task dependencies
  const handleLinkSave = async (values) => {
    try {
      handleTaskUpdate(linkingTask.id, {
        dependencies: values.dependencies || []
      });
      setLinkingTask(null);
      linkForm.resetFields();
      message.success("Dependencies updated successfully");
    } catch (error) {
      message.error("Failed to update dependencies");
    }
  };

  // Check if task is blocked
  const isTaskBlocked = (task) => {
    return task.dependencies.some(depId => {
      const depTask = enhancedTasks.find(t => t.id === depId);
      return depTask && depTask.status !== "done";
    });
  };

  // Get blocking tasks
  const getBlockingTasks = (task) => {
    return task.dependencies
      .map(depId => enhancedTasks.find(t => t.id === depId))
      .filter(t => t && t.status !== "done");
  };

  return (
    <div style={{ backgroundColor: '#F4F5F7', padding: '16px', borderRadius: '8px' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px',
        paddingBottom: '12px',
        borderBottom: '2px solid #DFE1E6'
      }}>
        <div>
          <Text style={{ fontSize: '16px', fontWeight: 600, color: '#172B4D' }}>
            Project Tasks ({enhancedTasks.length})
          </Text>
          <Text style={{ fontSize: '12px', color: '#6B778C', display: 'block' }}>
            {readOnly ? 'View task details' : 'Click on any task card to view details'}
          </Text>
        </div>
      </div>

      {/* Task List */}
      {layout === "row" ? (
        <Row gutter={[16, 16]}>
          {enhancedTasks.length === 0 ? (
            <Col span={24}>
              <div style={{
                textAlign: 'center',
                padding: '48px 16px',
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '1px solid #DFE1E6'
              }}>
                <CheckSquareOutlined style={{ fontSize: '48px', color: '#6B778C', marginBottom: '16px' }} />
                <Text style={{ fontSize: '16px', color: '#172B4D', display: 'block', marginBottom: '8px' }}>
                  No tasks yet
                </Text>
                <Text style={{ fontSize: '14px', color: '#6B778C' }}>
                  Tasks will appear here when they are added to the project
                </Text>
              </div>
            </Col>
          ) : (
            enhancedTasks.map((task) => (
              <Col key={task.id} span={24}>
                <TaskCard
                  task={task}
                  workType={workType}
                  grading={grading}
                  customFields={customFields}
                  availableUsers={availableUsers}
                  onTaskUpdate={(taskId, updates) => handleTaskUpdate(taskId, updates)}
                  readOnly={readOnly}
                  layout="row"
                  clientPreferences={clientPreferences}
                />
              </Col>
            ))
          )}
        </Row>
      ) : layout === "grid" ? (
        <Row gutter={[16, 16]}>
          {enhancedTasks.length === 0 ? (
            <Col span={24}>
              <div style={{
                textAlign: 'center',
                padding: '48px 16px',
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '1px solid #DFE1E6'
              }}>
                <CheckSquareOutlined style={{ fontSize: '48px', color: '#6B778C', marginBottom: '16px' }} />
                <Text style={{ fontSize: '16px', color: '#172B4D', display: 'block', marginBottom: '8px' }}>
                  No tasks yet
                </Text>
                <Text style={{ fontSize: '14px', color: '#6B778C' }}>
                  Tasks will appear here when they are added to the project
                </Text>
              </div>
            </Col>
          ) : (
            enhancedTasks.map((task) => (
              <Col key={task.id} xs={24} sm={12} md={8} lg={6}>
                <TaskCard
                  task={task}
                  workType={workType}
                  grading={grading}
                  customFields={customFields}
                  availableUsers={availableUsers}
                  onTaskUpdate={(taskId, updates) => handleTaskUpdate(taskId, updates)}
                  readOnly={readOnly}
                  clientPreferences={clientPreferences}
                />
              </Col>
            ))
          )}
        </Row>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {enhancedTasks.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '48px 16px',
              backgroundColor: 'white',
              borderRadius: '8px',
              border: '1px solid #DFE1E6'
            }}>
              <CheckSquareOutlined style={{ fontSize: '48px', color: '#6B778C', marginBottom: '16px' }} />
              <Text style={{ fontSize: '16px', color: '#172B4D', display: 'block', marginBottom: '8px' }}>
                No tasks yet
              </Text>
              <Text style={{ fontSize: '14px', color: '#6B778C' }}>
                Tasks will appear here when they are added to the project
              </Text>
            </div>
          ) : (
            enhancedTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                workType={workType}
                grading={grading}
                customFields={customFields}
                availableUsers={availableUsers}
                onTaskUpdate={(taskId, updates) => handleTaskUpdate(taskId, updates)}
                readOnly={readOnly}
                clientPreferences={clientPreferences}
              />
            ))
          )}
        </div>
      )}

      {/* Task Linking Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LinkOutlined style={{ color: '#0052CC' }} />
            <span>Link Issues</span>
            {linkingTask && (
              <Text style={{ 
                fontSize: '12px', 
                color: '#6B778C',
                backgroundColor: '#F4F5F7',
                padding: '2px 6px',
                borderRadius: '4px',
                marginLeft: '8px'
              }}>
                {linkingTask.taskKey}
              </Text>
            )}
          </div>
        }
        open={!!linkingTask}
        onCancel={() => {
          setLinkingTask(null);
          linkForm.resetFields();
        }}
        onOk={() => linkForm.submit()}
        width={600}
        styles={{
          header: {
            backgroundColor: '#F4F5F7',
            borderBottom: '1px solid #DFE1E6'
          }
        }}
      >
        {linkingTask && (
          <div style={{ 
            backgroundColor: '#FAFBFC', 
            padding: '16px', 
            borderRadius: '8px'
          }}>
            <Form
              form={linkForm}
              layout="vertical"
              onFinish={handleLinkSave}
            >
              <Form.Item
                name="dependencies"
                label={
                  <span style={{ fontWeight: 600, color: '#172B4D' }}>
                    This issue blocks
                  </span>
                }
                help={
                  <span style={{ color: '#6B778C' }}>
                    Select tasks that cannot start until this task is completed
                  </span>
                }
              >
                <Select
                  mode="multiple"
                  placeholder="Choose issues to block..."
                  allowClear
                  style={{ minHeight: '40px' }}
                  optionFilterProp="children"
                  showSearch
                >
                  {enhancedTasks
                    .filter(task => task.id !== linkingTask.id)
                    .map(task => (
                      <Option key={task.id} value={task.id}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Text style={{ 
                            fontSize: '11px', 
                            color: '#6B778C',
                            backgroundColor: '#F4F5F7',
                            padding: '2px 4px',
                            borderRadius: '3px'
                          }}>
                            {task.taskKey}
                          </Text>
                          <span>{task.name}</span>
                        </div>
                      </Option>
                    ))}
                </Select>
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TaskManager;