# TasksTable Common Component

## Overview

The `TasksTable` component is a reusable, production-ready table component for displaying and managing tasks. It includes:

- ✅ Inline editing for task status and assignments
- ✅ Multi-user assignment with quantity allocation
- ✅ Allocation modal for distributing image quantities
- ✅ Due date management
- ✅ Real-time updates via GraphQL mutations
- ✅ Optimistic UI updates
- ✅ Comprehensive error handling

## Usage

### Basic Example

```jsx
import TasksTable from "../../components/common/TasksTable";
import { generateBaseColumns } from "../../components/common/TasksTableColumns";

const MyComponent = () => {
  const users = []; // Array of user objects from GET_AVAILABLE_USERS query
  const currentUser = useReactiveVar(userCacheVar);
  
  // Define base columns (before task type columns)
  const baseColumns = generateBaseColumns({
    showProjectCode: true,
    showClientInfo: true,
    showOrderDate: true,
    showPriority: true,
    onProjectClick: (project) => {
      // Handle project click
      showProjectDetailDrawer(project.id);
    },
  });

  // Define task types for dynamic columns
  const taskTypes = workType?.taskTypes || [];
  
  // Prepare filtered users for work type
  const filteredUsers = useMemo(() => {
    const assignedUsers = users.filter(u => 
      u.workTypes?.some(wt => wt.id === selectedWorkTypeId)
    );
    const unassignedUsers = users.filter(u => 
      !u.workTypes?.length || 
      !u.workTypes.some(wt => wt.id === selectedWorkTypeId)
    );
    return { assignedUsers, unassignedUsers };
  }, [users, selectedWorkTypeId]);

  // Prepare data source
  const dataSource = []; // Array of row objects with tasksByType structure

  return (
    <TasksTable
      dataSource={dataSource}
      columns={baseColumns}
      users={users}
      currentUser={currentUser}
      loading={loading}
      refetchTasks={refetchTasks}
      refetchQueries={[
        {
          query: GET_TASKS,
          variables: { filters: {}, page: 1, limit: 1000 }
        }
      ]}
      taskTypes={taskTypes}
      filteredUsers={filteredUsers}
      tableLayout="fixed"
      rowClassName={(record, index) => {
        return index % 2 === 0 ? "even-row" : "odd-row";
      }}
      onRowClick={(record) => {
        console.log("Row clicked:", record);
      }}
    />
  );
};
```

## Props API

### Required Props

| Prop | Type | Description |
|------|------|-------------|
| `dataSource` | `Array` | Array of row data objects. Each row should have `projectId`, `gradingId`, and `tasksByType` |
| `columns` | `Array` | Base columns (before task type columns). Use `generateBaseColumns()` helper |
| `users` | `Array` | Array of user objects for assignment dropdowns |
| `taskTypes` | `Array` | Array of task type objects to generate dynamic columns |
| `filteredUsers` | `Object` | `{ assignedUsers: [], unassignedUsers: [] }` for work type filtering |

### Optional Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `currentUser` | `Object` | `null` | Current logged-in user for permission checks |
| `loading` | `Boolean` | `false` | Show loading spinner |
| `refetchTasks` | `Function` | `() => {}` | Callback to refetch tasks after mutations |
| `refetchQueries` | `Array` | `[]` | GraphQL queries to refetch after mutations |
| `onRowClick` | `Function` | `null` | Callback when a row is clicked |
| `tableLayout` | `String` | `"fixed"` | Ant Design table layout |
| `rowClassName` | `Function` | `null` | Function to determine row className |

## Data Structure

### Row Object Structure

Each row in `dataSource` should have:

```javascript
{
  key: "unique-row-id",
  projectId: "project-123",
  gradingId: "grading-456",
  projectCode: "PRJ-001",
  projectName: "Project Name",
  clientCode: "CLI-001",
  clientName: "Client Name",
  orderDate: "2024-01-01",
  gradingName: "Grading A",
  shortCode: "GA",
  imageQuantity: 100,
  priority: "A",
  dueDate: "2024-02-01",
  progress: 75,
  completedTasks: 3,
  totalTasks: 4,
  project: { /* full project object */ },
  grading: { /* full grading object */ },
  tasksByType: {
    "taskType-1": {
      id: "task-1",
      status: "IN_PROGRESS",
      imageQuantity: 100,
      taskCode: "TSK-001",
      taskType: { id: "taskType-1", name: "Task Type 1" },
      taskAssignments: [
        {
          id: "assignment-1",
          userId: "user-1",
          imageQuantity: 50,
          completedImageQuantity: 25,
          user: { firstName: "John", lastName: "Doe" }
        }
      ],
      // ... other task fields
    },
    "taskType-2": { /* ... */ }
  }
}
```

### Task Type Object Structure

```javascript
{
  id: "taskType-1",
  name: "Clipping Path",
  color: "#1890ff",
  WorkTypeTask: {
    order: 1 // Used for column ordering
  }
}
```

## Column Helpers

### generateBaseColumns()

Creates standard columns before task type columns.

```javascript
import { generateBaseColumns } from "../../components/common/TasksTableColumns";

const baseColumns = generateBaseColumns({
  showProjectCode: true,      // Show project code/name column
  showClientInfo: true,        // Show client code/name column
  showOrderDate: true,         // Show order date column
  showPriority: true,          // Show priority column
  onProjectClick: (project) => {
    // Optional: Handle project code click
  },
});
```

### generateActionColumns()

Creates action columns (due date, etc.) after task type columns.

```javascript
import { generateActionColumns } from "../../components/common/TasksTableColumns";

// Inside your component with inline editing state:
const actionColumns = generateActionColumns({
  isEditingCell,
  startEditCell,
  saveTaskCell,
  cancelEditCell,
  editedData,
  setEditedData,
  isInlineUpdating,
});

// Combine all columns:
const allColumns = [...baseColumns, ...taskColumns, ...actionColumns];
```

## Features

### Inline Status Editing

Click on any task status tag to edit it inline. A dropdown appears with all available statuses.

### Multi-User Assignments

1. Click "Assign Users" or "Edit" on the assignees column
2. Select multiple users from the dropdown
3. If more than 1 user selected, an allocation modal opens
4. Distribute image quantities per user
5. Click "Auto distribute" for equal distribution
6. Save to apply changes

### Allocation Modal

The allocation modal opens when:
- Multiple users are selected for assignment
- Allows fine-grained control over image quantity per user
- Validates that total allocated ≤ task total
- Shows real-time allocation summary
- Supports auto-distribution

### Due Date Management

Click on the due date field to edit. Visual indicators show:
- Red text: Overdue tasks
- Orange text: Due within 3 days
- Relative time tooltip

## Styling

The component includes minimal inline styling. You can customize:

```css
/* Project grouping alternating colors */
.project-group-even {
  background-color: #ffffff !important;
}

.project-group-odd {
  background-color: #f5f5f5 !important;
}

.project-group-even:hover,
.project-group-odd:hover {
  background-color: #e6f7ff !important;
}

/* Task type column backgrounds */
.task-type-column-group {
  /* Columns have dynamic background based on task type color */
}
```

## GraphQL Requirements

The component requires these mutations:

```javascript
import { UPDATE_TASK } from "../../gql/tasks";
import {
  BULK_CREATE_TASK_ASSIGNMENTS,
  DELETE_TASK_ASSIGNMENT,
  UPDATE_TASK_ASSIGNMENT,
} from "../../gql/taskAssignments";
```

Ensure your GraphQL schema supports:
- `updateTask(id, input)` - Update task fields
- `bulkCreateTaskAssignments(inputs)` - Create multiple assignments
- `deleteTaskAssignment(id)` - Delete an assignment
- `updateTaskAssignment(id, input)` - Update assignment quantities

## Migration Guide

### From TaskTable.jsx

```javascript
// Before:
// All logic inline in TaskTable.jsx

// After:
import TasksTable from "../../components/common/TasksTable";
import { generateBaseColumns } from "../../components/common/TasksTableColumns";

// Extract column generation logic
const baseColumns = generateBaseColumns({ ... });

// Pass props to TasksTable
<TasksTable
  dataSource={tableDataByWorkType[activeWorkTypeId]?.rows || []}
  columns={baseColumns}
  users={users}
  currentUser={currentUser}
  loading={tasksLoading}
  refetchTasks={refetchTasks}
  refetchQueries={[...]}
  taskTypes={taskTypes}
  filteredUsers={filteredUsers}
/>
```

### From ProjectDetailDrawer.jsx

```javascript
// Before:
// Inline column generation in generateColumnsForWorkType()

// After:
import TasksTable from "../common/TasksTable";
import { generateBaseColumns } from "../common/TasksTableColumns";

// Use simpler base columns
const baseColumns = generateBaseColumns({
  showProjectCode: false, // Already in project detail
  showClientInfo: false,
  showOrderDate: false,
  showPriority: false,
});

<TasksTable
  dataSource={gradingsData}
  columns={baseColumns}
  users={users}
  currentUser={currentUser}
  loading={tasksLoading}
  refetchTasks={refetchTasks}
  refetchQueries={[...]}
  taskTypes={workType.taskTypes}
  filteredUsers={filteredUsers}
/>
```

## Best Practices

1. **Always provide refetchQueries**: Ensure UI updates after mutations
2. **Filter users by work type**: Pass `filteredUsers` prop for better UX
3. **Handle loading states**: Pass `loading` prop during data fetch
4. **Memoize dataSource**: Use `useMemo` to avoid unnecessary re-renders
5. **Validate data structure**: Ensure each row has `tasksByType` object
6. **Error handling**: Component shows user-friendly messages via `message` API

## Troubleshooting

### Tasks not updating after mutation

Ensure `refetchQueries` includes all relevant queries:

```javascript
refetchQueries={[
  {
    query: GET_TASKS,
    variables: { filters: {}, page: 1, limit: 1000 }
  },
  {
    query: GET_TASKS_DASHBOARD,
    variables: {}
  }
]}
```

### Allocation modal not opening

Check that:
1. More than 1 user is selected
2. `filteredUsers` prop is provided
3. Task has `imageQuantity` field

### Inline editing not working

Verify:
1. Task object has required fields (`id`, `status`, `taskAssignments`)
2. Mutations are imported correctly
3. User has edit permissions (if applicable)

## Support

For issues or questions, refer to:
- Main TaskTable implementation: `frontend/src/pages/FrontOffice/TaskTable.jsx`
- ProjectDetail implementation: `frontend/src/components/ProjectDetailDrawer.jsx`
- GraphQL schema: `backend/src/gql/schemas/`
