import React from 'react';
import ErrorPlaceholderScreen from '../components/ErrorPlaceholderScreen';

export default function DatabaseError() {
  return (
    <ErrorPlaceholderScreen 
      type="database" 
      onRetry={() => {
        // This is a placeholder for testing
        console.log('Retry database connection');
      }} 
    />
  );
}
