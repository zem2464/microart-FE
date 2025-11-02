// Test component to verify mention functionality without duplication
import React, { useState } from 'react';
import MentionInput from '../MentionInput';

const MentionTest = () => {
  const [value, setValue] = useState('');
  const [mentions, setMentions] = useState([]);

  const testUsers = [
    { id: '1', firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com' },
    { id: '2', firstName: 'Jane', lastName: 'Smith', email: 'jane.smith@example.com' },
    { id: '3', firstName: 'Bob', lastName: 'Wilson', email: 'bob.wilson@example.com' }
  ];

  const handleChange = (newValue) => {
    setValue(newValue);
    console.log('Value changed to:', newValue);
  };

  const handleMentionChange = (newMentions) => {
    setMentions(newMentions);
    console.log('Mentions changed to:', newMentions);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px' }}>
      <h2>Mention Input Test</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <label>Test typing @ to mention users:</label>
        <MentionInput
          value={value}
          onChange={handleChange}
          onMentionChange={handleMentionChange}
          users={testUsers}
          placeholder="Type @ to mention users..."
          rows={4}
        />
      </div>

      <div style={{ marginTop: '20px' }}>
        <h3>Debug Info:</h3>
        <div><strong>Current Value:</strong> {value}</div>
        <div><strong>Current Mentions:</strong> {JSON.stringify(mentions, null, 2)}</div>
        <div><strong>Available Users:</strong> {testUsers.length}</div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h3>Expected Behavior:</h3>
        <ul>
          <li>Type @ to see user suggestions</li>
          <li>Selected users should show as @John Doe (not duplicated)</li>
          <li>Mentions should be highlighted in blue</li>
          <li>No duplicate text should appear</li>
        </ul>
      </div>
    </div>
  );
};

export default MentionTest;