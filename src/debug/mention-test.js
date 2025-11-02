// Test file to verify mention functionality
// This file can be used to debug and test the mention implementation

const testUsers = [
  { id: '1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
  { id: '2', firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' },
  { id: '3', firstName: 'Bob', lastName: 'Wilson', email: 'bob@example.com' }
];

const testMentionText = 'Hello @[John Doe](1), please review this task. cc: @[Jane Smith](2)';

const extractMentionsFromText = (text) => {
  // Extract mentions using regex to match @[display](id) format
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const mentions = [];
  let match;
  
  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push({
      id: match[2],
      display: match[1]
    });
  }
  
  return mentions;
};

console.log('Test Users:', testUsers);
console.log('Test Mention Text:', testMentionText);
console.log('Extracted Mentions:', extractMentionsFromText(testMentionText));

// Test the mention format that react-mentions expects
const mentionFormat = testUsers.map(user => ({
  id: user.id,
  display: `${user.firstName} ${user.lastName}`,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email
}));

console.log('React-mentions format:', mentionFormat);

// Export for debugging
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testUsers,
    testMentionText,
    extractMentionsFromText,
    mentionFormat
  };
}