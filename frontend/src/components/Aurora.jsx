import React from 'react';

/** Aurora animated background — futuristic ambient light. */
export const Aurora = ({ className = '' }) => (
  <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
    <div className="aurora" />
    <div className="grain" />
  </div>
);

export default Aurora;
