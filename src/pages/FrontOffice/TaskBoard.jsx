import React from 'react';
import { Row, Col, Card, Tag, Typography, Button } from 'antd';
import { PlusOutlined, UserOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const TaskBoard = () => {
  const tasks = {
    todo: [
      {
        id: 1,
        title: 'Photo color correction',
        project: 'Wedding Photography',
        priority: 'high',
        assignee: 'John Doe',
        dueDate: '2024-01-20'
      },
      {
        id: 2,
        title: 'Background removal',
        project: 'Product Catalog',
        priority: 'medium',
        assignee: 'Jane Smith',
        dueDate: '2024-01-22'
      }
    ],
    inProgress: [
      {
        id: 3,
        title: 'Portrait retouching',
        project: 'Corporate Headshots',
        priority: 'urgent',
        assignee: 'Mike Johnson',
        dueDate: '2024-01-18'
      }
    ],
    review: [
      {
        id: 4,
        title: 'Album layout design',
        project: 'Wedding Photography',
        priority: 'medium',
        assignee: 'Sarah Wilson',
        dueDate: '2024-01-19'
      }
    ],
    completed: [
      {
        id: 5,
        title: 'Image optimization',
        project: 'Fashion Portfolio',
        priority: 'low',
        assignee: 'Tom Brown',
        dueDate: '2024-01-15'
      }
    ]
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'default',
      medium: 'blue',
      high: 'orange',
      urgent: 'red'
    };
    return colors[priority] || 'default';
  };

  const TaskCard = ({ task }) => (
    <Card size="small" className="mb-2 card-shadow hover:shadow-md transition-shadow">
      <Title level={5} className="mb-2">{task.title}</Title>
      <Text type="secondary" className="block mb-2">{task.project}</Text>
      <div className="flex justify-between items-center">
        <Tag color={getPriorityColor(task.priority)}>{task.priority}</Tag>
        <div className="flex items-center text-xs text-gray-500">
          <UserOutlined className="mr-1" />
          {task.assignee}
        </div>
      </div>
      <Text type="secondary" className="text-xs block mt-2">Due: {task.dueDate}</Text>
    </Card>
  );

  const columns = [
    { title: 'To Do', key: 'todo', tasks: tasks.todo, color: 'bg-gray-50' },
    { title: 'In Progress', key: 'inProgress', tasks: tasks.inProgress, color: 'bg-blue-50' },
    { title: 'Review', key: 'review', tasks: tasks.review, color: 'bg-yellow-50' },
    { title: 'Completed', key: 'completed', tasks: tasks.completed, color: 'bg-green-50' }
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <Title level={3} className="mb-0">Task Board</Title>
        <Button type="primary" icon={<PlusOutlined />}>
          Add Task
        </Button>
      </div>

      <Row gutter={16}>
        {columns.map(column => (
          <Col xs={24} sm={12} lg={6} key={column.key}>
            <Card 
              title={column.title} 
              className={`${column.color} border-0 h-full`}
              extra={<span className="text-gray-500">{column.tasks.length}</span>}
            >
              <div className="min-h-96">
                {column.tasks.map(task => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default TaskBoard;