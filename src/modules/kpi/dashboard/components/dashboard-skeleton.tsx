'use client';

import React from 'react';
import { Surface } from '@heroui/react';

/** Dashboard skeleton — mirrors the final layout (filter bar, 4 cards, summary, bars, list). */
export const DashboardSkeleton: React.FC = () => {
  const block = 'animate-pulse rounded-xl bg-surface-secondary';
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className={`h-7 w-56 ${block}`} />
        <div className={`h-4 w-96 max-w-full ${block}`} />
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className={`h-12 w-36 ${block}`} />
        <div className={`h-12 w-40 ${block}`} />
        <div className={`h-12 w-40 ${block}`} />
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-24 rounded-2xl ${block}`} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-20 rounded-2xl ${block}`} />
        ))}
      </div>
      <Surface className="rounded-3xl p-5">
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`h-10 w-full ${block}`} />
          ))}
        </div>
      </Surface>
      <div className={`h-64 rounded-3xl ${block}`} />
    </div>
  );
};
