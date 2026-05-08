'use client';

import React from 'react';

interface HeaderProps {
  title?: string;
  actions?: React.ReactNode;
}

export function Header({ title, actions }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between bg-[#f5f5f5] px-8">
      <h1 className="text-xl font-semibold text-foreground">
        {title || 'erpsystem'}
      </h1>

      <div className="flex items-center gap-3">
        {actions}
      </div>
    </header>
  );
}
