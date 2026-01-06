import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Result } from 'antd';

/**
 * NotFound Component
 * 404 error page for routes that don't exist
 */
const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Result
        status="404"
        title="404"
        subTitle="Sorry, the page you visited does not exist."
        extra={
          <Button type="primary" onClick={() => navigate('/')}>
            Back Home
          </Button>
        }
      />
    </div>
  );
};

export default NotFound;
