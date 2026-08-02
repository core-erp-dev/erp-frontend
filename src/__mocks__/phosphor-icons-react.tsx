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
export const ArrowCounterClockwise = createIcon('ArrowCounterClockwise');
export const Check = createIcon('Check');
export const Trash = createIcon('Trash');
export const House = createIcon('House');
export const Play = createIcon('Play');
export const Copy = createIcon('Copy');
export const FloppyDisk = createIcon('FloppyDisk');
export const MagnifyingGlass = createIcon('MagnifyingGlass');
export const ArrowsClockwise = createIcon('ArrowsClockwise');
export const Eye = createIcon('Eye');
export const PencilLine = createIcon('PencilLine');
export const Prohibit = createIcon('Prohibit');
export const Wrench = createIcon('Wrench');
export const SquaresFour = createIcon('SquaresFour');
export const Warning = createIcon('Warning');
