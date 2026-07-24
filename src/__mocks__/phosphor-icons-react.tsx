import React from 'react';

function createIcon(name: string) {
  const Icon = ({ className }: { className?: string }) =>
    React.createElement('span', { className, 'data-testid': `icon-${name}` });
  Icon.displayName = name;
  return Icon;
}

export const ChartBar = createIcon('ChartBar');
export const Buildings = createIcon('Buildings');
export const ClipboardText = createIcon('ClipboardText');
export const Article = createIcon('Article');
export const Checks = createIcon('Checks');
export const CaretDown = createIcon('CaretDown');
export const CaretRight = createIcon('CaretRight');
export const Tray = createIcon('Tray');
export const Plus = createIcon('Plus');
export const PencilSimple = createIcon('PencilSimple');
export const X = createIcon('X');
