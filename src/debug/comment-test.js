// Comment Mention and Sorting Test Cases

const testComments = [
  {
    id: '1',
    content: 'Hello @[John Doe](user1), please review this task.',
    author: { firstName: 'Jane', lastName: 'Smith' },
    createdAt: '2024-10-29T10:00:00Z'
  },
  {
    id: '2', 
    content: 'Thanks @[Jane Smith](user2) for the update. @[Bob Wilson](user3) can you help?',
    author: { firstName: 'John', lastName: 'Doe' },
    createdAt: '2024-10-29T11:00:00Z'
  },
  {
    id: '3',
    content: 'This looks good to me!',
    author: { firstName: 'Bob', lastName: 'Wilson' },
    createdAt: '2024-10-29T09:00:00Z'
  }
];

const testUsers = [
  { id: 'user1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
  { id: 'user2', firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' },
  { id: 'user3', firstName: 'Bob', lastName: 'Wilson', email: 'bob@example.com' }
];

// Test mention parsing
const renderCommentContent = (content, users) => {
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }
    
    const [fullMatch, displayName, userId] = match;
    const user = users.find(u => u.id === userId);
    const mentionDisplay = user ? `${user.firstName} ${user.lastName}` : displayName;
    
    parts.push(`@${mentionDisplay}`);
    lastIndex = match.index + fullMatch.length;
  }
  
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }
  
  return parts.join('');
};

// Test sorting
const getSortedComments = (comments, sortOrder = 'desc') => {
  return [...comments].sort((a, b) => {
    const dateA = new Date(a.createdAt);
    const dateB = new Date(b.createdAt);
    
    return sortOrder === 'desc' 
      ? dateB.getTime() - dateA.getTime()
      : dateA.getTime() - dateB.getTime();
  });
};

console.log('=== COMMENT MENTION AND SORTING TEST ===');

// Test mention rendering
console.log('\n1. Mention Rendering Test:');
testComments.forEach(comment => {
  const rendered = renderCommentContent(comment.content, testUsers);
  console.log(`Original: ${comment.content}`);
  console.log(`Rendered: ${rendered}`);
  console.log('---');
});

// Test sorting
console.log('\n2. Comment Sorting Test:');
console.log('Latest first (desc):');
getSortedComments(testComments, 'desc').forEach((comment, index) => {
  console.log(`${index + 1}. ${comment.author.firstName}: ${comment.createdAt}`);
});

console.log('\nOldest first (asc):');
getSortedComments(testComments, 'asc').forEach((comment, index) => {
  console.log(`${index + 1}. ${comment.author.firstName}: ${comment.createdAt}`);
});

export { renderCommentContent, getSortedComments, testComments, testUsers };