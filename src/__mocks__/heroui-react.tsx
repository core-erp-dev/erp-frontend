import React from 'react';

export const Surface = ({ children, className }: { children: React.ReactNode; className?: string }) =>
  React.createElement('div', { className }, children);
