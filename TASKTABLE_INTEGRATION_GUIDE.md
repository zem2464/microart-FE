# TaskTable.jsx Integration Guide

## Overview
This guide shows how to integrate the TasksTable common component into the main TaskTable.jsx page (2,150 lines). Follow the same pattern used for ProjectDetailDrawer (see INTEGRATION_COMPLETE_PROJECTDETAIL.md).

## Current Structure Analysis

### Key Differences from ProjectDetailDrawer
1. **Has tabs** - Shows "My Tasks", "All Tasks", "Unassigned", grouped by work type
2. **Has filters** - Search, client filter, project filter, status, user, priority, grading
3. **More complex data structure** - Groups tasks by project, client, grading, work type
4. **Sorting/pagination** - Already fetches all tasks (10,000 limit) but has sorting controls
5. **Dashboard stats** - Shows quick stats at top

### What to Keep
- ✅ Filter controls (search, client, project, status, user, priority, grading, work type)
- ✅ Tab navigation (My Tasks, All Tasks, Unassigned)
- ✅ Data fetching and queries (GET_TASKS, GET_AVAILABLE_USERS, GET_WORK_TYPES, etc.)
- ✅ Sorting controls (sortBy, sortOrder)
- ✅ Dashboard stats computation
- ✅ Data grouping logic (groupTasksByWorkType function)

### What to Remove/Replace
- ❌ Inline editing state (editingCell, editedData)
- ❌ Allocation modal state (assignQtyModal*, assignQtySelected*, assignQtyAllocations, etc.)
- ❌ Mutation hooks for tasks (UPDATE_TASK, BULK_CREATE_TASK_ASSIGNMENTS, etc.)
- ❌ Helper functions (getUserDisplayName, getTaskTotalQuantity, openAssignQtyModal, saveTaskCell, etc.)
- ❌ generateColumnsForWorkType function
- ❌ Table component → Replace with TasksTable
- ❌ Allocation Modal JSX

## Step-by-Step Integration

### Step 1: Update Imports
```javascript
// Add these imports:
import TasksTable from "../../components/common/TasksTable";
import { generateBaseColumns } from "../../components/common/TasksTableColumns";

// Remove these imports (no longer needed):
// - InputNumber (handled by TasksTable)
// - Modal (allocation modal is in TasksTable)
// - Any task mutation imports if present
```

### Step 2: Remove State Variables
Find and remove all inline editing and allocation state:
```javascript
// Remove these useState declarations:
const [editingCell, setEditingCell] = useState({ ... });
const [editedData, setEditedData] = useState({});
const [assignQtyModalOpen, setAssignQtyModalOpen] = useState(false);
const [assignQtyModalTask, setAssignQtyModalTask] = useState(null);
const [assignQtyModalGradingRecord, setAssignQtyModalGradingRecord] = useState(null);
const [assignQtySelectedUserIds, setAssignQtySelectedUserIds] = useState([]);
const [assignQtyAllocations, setAssignQtyAllocations] = useState({});
const [assignQtyOriginalUserIds, setAssignQtyOriginalUserIds] = useState([]);
const [assignQtyOriginalAllocations, setAssignQtyOriginalAllocations] = useState({});
```

### Step 3: Remove Mutation Hooks
Remove these mutation hooks (search for "useMutation"):
```javascript
// Remove:
const [updateTask] = useMutation(UPDATE_TASK, { ... });
const [bulkCreateAssignments] = useMutation(BULK_CREATE_TASK_ASSIGNMENTS, { ... });
const [deleteAssignment] = useMutation(DELETE_TASK_ASSIGNMENT, { ... });
const [updateTaskAssignment] = useMutation(UPDATE_TASK_ASSIGNMENT, { ... });
```

### Step 4: Remove Helper Functions
Find and remove these functions (typically between query/mutation setup and render):
```javascript
// Remove these functions:
- getTaskTotalQuantity() // Move to TasksTable or keep if used elsewhere
- getUserDisplayName()
- openAssignQtyModal()
- closeAssignQtyModal()
- handleAssignQtyAutoDistribute()
- handleAssignQtyConfirm()
- isEditingCell()
- startEditCell()
- cancelEditCell()
- saveTaskCell()

// Remove these useMemo/useCallback hooks:
- assignQtyTotalAllocated
- assignQtyModalTaskTotal
- hasAssignQtyChanges
```

### Step 5: Add Setup Code for TasksTable
After the existing `filteredTasks` logic, add:
```javascript
  // Setup for TasksTable
  const baseColumns = generateBaseColumns({
    projectFilter: projectSearch || null,
    clientFilter: clientSearch || null,
    gradingFilters: gradingFilter !== 'all' ? [gradingFilter] : [],
  });

  // Filter users based on current filters
  const filteredUsers = useMemo(() => {
    if (userFilter === 'all') {
      return users; // All users
    }
    return users.filter(u => u.id === userFilter);
  }, [users, userFilter]);
```

### Step 6: Update Data Structure
The `groupTasksByWorkType` function likely already creates tasksByType. Verify it returns data in this format:
```javascript
{
  workTypeId: string,
  workTypeName: string,
  taskTypes: [...],
  gradings: [
    {
      gradingId: string,
      gradingName: string,
      gradingShortCode: string,
      imageQuantity: number,
      tasksByType: {
        [taskTypeId]: task object
      }
    }
  ]
}
```

If not, update it to match this structure. TasksTable expects `dataSource` to be an array of grading objects, each with `tasksByType`.

### Step 7: Remove generateColumnsForWorkType
Find the `generateColumnsForWorkType` function (around line 1104) and remove it entirely. This is typically a large function (300+ lines) with inline editing logic.

### Step 8: Replace Table with TasksTable
Find where the Table component is used (around line 1956) and replace it:

**Before:**
```jsx
<Table
  dataSource={workTypeGroup.gradings}
  columns={generateColumnsForWorkType(workTypeId)}
  rowKey="gradingId"
  pagination={false}
  size="small"
  scroll={{ x: "max-content" }}
  bordered
/>
```

**After:**
```jsx
<TasksTable
  dataSource={workTypeGroup.gradings || []}
  baseColumns={baseColumns}
  taskTypes={workTypeGroup.taskTypes || []}
  users={filteredUsers}
  projectId={null} // Not filtering by single project
  refetchQueries={[
    {
      query: GET_TASKS,
      variables: {
        filters: buildFilters(), // Use existing filter builder
        page: 1,
        limit: TASK_FETCH_LIMIT,
        sortBy,
        sortOrder,
      },
    },
  ]}
/>
```

### Step 9: Remove Allocation Modal JSX
Find the Modal component for allocation (typically near the end of the render) and remove the entire block (100+ lines of JSX).

### Step 10: Clean Up Imports
Update React imports to remove unused hooks:
```javascript
// Before:
import { useState, useMemo, useCallback, useEffect } from "react";

// After (if useCallback is no longer used):
import { useState, useMemo, useEffect } from "react";
```

## Refetch Configuration

The TasksTable needs a `refetchQueries` prop to refresh data after mutations. Use the existing filter logic:

```javascript
// Create a helper to build current filters
const buildFilters = useCallback(() => {
  const filters = {
    statuses: statusFilter === 'all' 
      ? ['TODO', 'IN_PROGRESS', 'REVIEW', 'REVISION', 'COMPLETED', 'CANCELLED', 'ON_HOLD']
      : [statusFilter],
  };
  
  if (userFilter !== 'all') {
    filters.userIds = [userFilter];
  }
  
  if (priorityFilter !== 'all') {
    filters.priority = priorityFilter;
  }
  
  if (gradingFilter !== 'all') {
    filters.gradingIds = [gradingFilter];
  }
  
  if (projectSearch) {
    filters.projectName = projectSearch;
  }
  
  if (clientSearch) {
    filters.clientName = clientSearch;
  }
  
  if (searchText) {
    filters.search = searchText;
  }
  
  return filters;
}, [statusFilter, userFilter, priorityFilter, gradingFilter, projectSearch, clientSearch, searchText]);
```

Then pass this to TasksTable:
```javascript
<TasksTable
  // ...other props
  refetchQueries={[
    {
      query: GET_TASKS,
      variables: {
        filters: buildFilters(),
        page: 1,
        limit: TASK_FETCH_LIMIT,
        sortBy,
        sortOrder,
      },
    },
  ]}
/>
```

## Expected File Size Reduction
- **Before:** ~2,150 lines
- **After:** ~1,300-1,400 lines
- **Expected Reduction:** ~700-850 lines (33-40%)

## Testing After Integration
1. ✅ "My Tasks" tab shows only my assigned tasks
2. ✅ "All Tasks" tab shows all tasks
3. ✅ "Unassigned" tab shows tasks with no assignments
4. ✅ Work type tabs work correctly
5. ✅ All filters work (search, client, project, status, user, priority, grading)
6. ✅ Sorting works (by created, updated, due date, etc.)
7. ✅ Inline editing works (status, assignees, due date)
8. ✅ Allocation modal works for multi-user assignments
9. ✅ Changes persist and table refreshes
10. ✅ Dashboard stats update correctly

## Key Points
- **Keep all filter logic** - TaskTable has complex filtering that ProjectDetailDrawer doesn't need
- **Keep tab logic** - TasksTable doesn't handle tabs, that's page-level logic
- **Keep data grouping** - groupTasksByWorkType is essential for organizing tasks
- **Pass correct refetch config** - Use buildFilters() to ensure mutations refresh with current view

## Common Issues
1. **tasksByType structure** - Make sure data passed to TasksTable has the correct structure
2. **Filters not working** - Ensure refetchQueries uses buildFilters() not hardcoded values
3. **Users list empty** - Pass filteredUsers, not just users
4. **baseColumns missing** - Must call generateBaseColumns() before rendering TasksTable

## Reference Files
- ✅ Completed: `frontend/src/components/ProjectDetailDrawer.jsx`
- 📖 Documentation: `frontend/INTEGRATION_COMPLETE_PROJECTDETAIL.md`
- 📖 Step-by-step: `frontend/PROJECTDETAIL_INTEGRATION_STEPS.md`
- 📦 Component: `frontend/src/components/common/TasksTable.jsx`
- 📦 Columns: `frontend/src/components/common/TasksTableColumns.js`
