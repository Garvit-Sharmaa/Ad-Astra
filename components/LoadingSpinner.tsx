import React from 'react';

const LoadingSpinner = () => {
  return (
    <div className="typing-indicator flex items-center justify-center space-x-1.5">
       <span className="bg-current"></span>
       <span className="bg-current"></span>
       <span className="bg-current"></span>
    </div>
  );
};

export default LoadingSpinner;