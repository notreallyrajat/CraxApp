import React from 'react';
import ErrorPlaceholderScreen from '../components/ErrorPlaceholderScreen';

export default function NetworkError() {
  return (
    <ErrorPlaceholderScreen 
      type="network" 
      onRetry={() => {
        // This is a placeholder for testing
        console.log('Retry network connection');
      }} 
    />
  );
}
