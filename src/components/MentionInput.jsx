import React from 'react';
import { Mention, MentionsInput } from 'react-mentions';
import { Avatar } from 'antd';
import './MentionInput.css';

const MentionInputComponent = ({ 
  value, 
  onChange, 
  onMentionChange,
  placeholder = "Add a comment...", 
  users = [], 
  disabled = false,
  rows = 3,
  style = {}
}) => {
  // Transform users for react-mentions format - ensure clean display names
  const mentionUsers = users.map(user => {
    const firstName = user.firstName?.trim() || '';
    const lastName = user.lastName?.trim() || '';
    const fullName = `${firstName} ${lastName}`.trim();
    
    return {
      id: user.id,
      display: fullName || user.email || 'Unknown User',
      firstName: firstName,
      lastName: lastName,
      email: user.email || ''
    };
  });

  const mentionStyle = {
    control: {
      backgroundColor: '#fff',
      fontSize: 14,
      fontWeight: 'normal',
      border: '1px solid #d9d9d9',
      borderRadius: '6px',
      minHeight: `${rows * 22 + 16}px`,
      padding: '4px 11px',
      transition: 'border-color 0.3s, box-shadow 0.3s',
    },
    '&multiLine': {
      control: {
        fontFamily: 'inherit',
        minHeight: `${rows * 22 + 16}px`,
      },
      highlighter: {
        padding: '4px 11px',
        border: '1px solid transparent',
      },
      input: {
        padding: '4px 11px',
        border: '1px solid transparent',
        minHeight: `${rows * 22 + 16}px`,
        outline: 'none',
        resize: 'none',
      },
    },
    suggestions: {
      list: {
        backgroundColor: 'white',
        border: '1px solid #d9d9d9',
        borderRadius: '6px',
        fontSize: 14,
        maxHeight: '200px',
        overflow: 'auto',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        zIndex: 1000,
      },
      item: {
        padding: '8px 12px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        '&focused': {
          backgroundColor: '#f0f0f0',
        },
      },
    },
  };

  const renderUserSuggestion = (suggestion, search, highlightedDisplay, index, focused) => {
    // Use the display name from suggestion to avoid duplication
    const displayName = suggestion.display || `${suggestion.firstName} ${suggestion.lastName}`;
    
    return (
      <div 
        key={suggestion.id}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          padding: '8px 12px',
          backgroundColor: focused ? '#f0f0f0' : 'transparent',
          cursor: 'pointer'
        }}
      >
        <Avatar size="small" style={{ backgroundColor: '#1890ff' }}>
          {suggestion.firstName?.charAt(0)}
        </Avatar>
        <div>
          <div style={{ fontWeight: 500, fontSize: '14px' }}>
            {displayName}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {suggestion.email}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ position: 'relative', ...style }}>
      <MentionsInput
        value={value}
        onChange={(event, newValue, newPlainTextValue, mentions) => {
          onChange(newValue);
          if (onMentionChange) {
            onMentionChange(mentions);
          }
        }}
        style={mentionStyle}
        placeholder={placeholder}
        disabled={disabled}
        allowedChars={/^[A-Za-z\s\-_]*$/}
        forceSuggestionsAboveCursor
        a11ySuggestionsListLabel="Suggested users"
        singleLine={false}
      >
        <Mention
          trigger="@"
          data={mentionUsers}
          renderSuggestion={renderUserSuggestion}
          markup="@[__display__](__id__)"
          displayTransform={(id, display) => `@${display}`}
          style={{
            backgroundColor: '#e6f7ff',
            color: '#1890ff',
            fontWeight: 'bold',
            borderRadius: '3px',
            padding: '1px 3px',
            textDecoration: 'none',
          }}
          appendSpaceOnAdd={true}
        />
      </MentionsInput>
    </div>
  );
};

export default MentionInputComponent;