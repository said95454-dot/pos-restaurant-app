import React from 'react';

/** Aurora animated background — restaurant warm lights with futuristic hints. */
export const Aurora = ({ className = '' }) => (
  <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
    <div className="aurora" />
    <div className="kitchen-pattern" />
    <div className="grain" />
  </div>
);

export default Aurora;
