import React from "react";
import { Draggable } from "react-beautiful-dnd";
import TaskCard from "./TaskCard";

// Performance optimized component that prevents unnecessary re-renders
// Following react-beautiful-dnd documentation recommendations
const TaskList = React.memo(function TaskList({ 
  tasks, 
  onTaskClick, 
  availableUsers, 
  updatingTasks 
}) {
  return (
    <div>
      {tasks.map((task, index) => {
        const taskId = String(task.id);
        // Use stable key that doesn't change during drag operations
        const stableKey = `task-${taskId}`;
        
        // Add validation for task ID
        if (!taskId || taskId === 'undefined' || taskId === 'null') {
          console.warn('Invalid task ID detected:', task);
          return null;
        }

        const dragDisabled = updatingTasks.has(taskId);
        
        // Only allow click to open modal if not dragging
        const handleCardClick = (e) => {
          // Prevent click if dragging or if task is updating
          if (window.__isDraggingTask || dragDisabled) return;
          onTaskClick && onTaskClick(task);
        };
        return (
          <Draggable
            key={stableKey}
            draggableId={taskId}
            index={index}
            isDragDisabled={dragDisabled}
          >
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.draggableProps}
                {...provided.dragHandleProps}
                style={{
                  ...provided.draggableProps.style,
                  transform: snapshot.isDragging
                    ? `${provided.draggableProps.style?.transform} rotate(5deg) scale(1.05)`
                    : provided.draggableProps.style?.transform,
                  boxShadow: snapshot.isDragging
                    ? "0 8px 25px rgba(0,0,0,0.15)"
                    : "none",
                  zIndex: snapshot.isDragging ? 1000 : "auto",
                  transition: snapshot.isDragging 
                    ? "none" 
                    : "all 0.2s ease",
                  opacity: dragDisabled ? 0.5 : 1,
                  cursor: dragDisabled ? 'not-allowed' : 'grab',
                  pointerEvents: dragDisabled ? 'none' : 'auto',
                }}
                data-drag-disabled={dragDisabled ? 'true' : undefined}
              >
                {dragDisabled && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(255,0,0,0.08)',
                    color: '#c00',
                    zIndex: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    fontSize: 12,
                    pointerEvents: 'none',
                  }}>
                    Drag Disabled
                  </div>
                )}
                <TaskCard 
                  task={task} 
                  onTaskClick={handleCardClick}
                  availableUsers={availableUsers}
                  layout="board"
                  readOnly={true}
                  isUpdating={dragDisabled}
                />
              </div>
            )}
          </Draggable>
        );
      })}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary rerenders during drag
  
  // Compare tasks array by length and task IDs
  if (prevProps.tasks.length !== nextProps.tasks.length) return false;
  
  // Quick comparison of task IDs to detect if the list has changed
  for (let i = 0; i < prevProps.tasks.length; i++) {
    if (prevProps.tasks[i]?.id !== nextProps.tasks[i]?.id) return false;
  }
  
  // Compare updatingTasks Set size
  const prevUpdatingSize = prevProps.updatingTasks?.size || 0;
  const nextUpdatingSize = nextProps.updatingTasks?.size || 0;
  if (prevUpdatingSize !== nextUpdatingSize) return false;
  
  // Compare availableUsers array length (shallow comparison)
  const prevUsersLength = prevProps.availableUsers?.length || 0;
  const nextUsersLength = nextProps.availableUsers?.length || 0;
  if (prevUsersLength !== nextUsersLength) return false;
  
  // If onTaskClick reference changed, re-render (though this should be stable with useCallback)
  if (prevProps.onTaskClick !== nextProps.onTaskClick) return false;
  
  return true; // Props are considered equal, skip re-render
});

export default TaskList;