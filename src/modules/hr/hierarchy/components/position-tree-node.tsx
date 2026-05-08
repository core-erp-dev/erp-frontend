'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  UserPlus,
  User,
} from 'lucide-react';
import { PositionTree } from '../types';

interface PositionTreeNodeProps {
  position: PositionTree;
  depth?: number;
  onAddSubordinate: (parentId: number) => void;
  onEdit: (position: PositionTree) => void;
  onDelete: (position: PositionTree) => void;
  onAssignUser: (position: PositionTree) => void;
  isLoading?: boolean;
}

export const PositionTreeNode: React.FC<PositionTreeNodeProps> = ({
  position,
  depth = 0,
  onAddSubordinate,
  onEdit,
  onDelete,
  onAssignUser,
  isLoading = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(depth < 2);
  const hasChildren = position.children && position.children.length > 0;

  if (isLoading) {
    return (
      <div className="mb-4">
        <Skeleton className="h-32 w-full" />
        <div className="ml-8 mt-2">
          <Skeleton className="h-28 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="mb-3">
      <Card
        className={`transition-all duration-200 ${
          depth > 0 ? `ml-${Math.min(depth * 4, 16)}` : ''
        }`}
        style={{ marginLeft: depth > 0 ? `${Math.min(depth * 16, 64)}px` : 0 }}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Expand/Collapse Button */}
              {hasChildren ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              ) : (
                <div className="w-6" />
              )}

              {/* Position Info */}
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-base">
                    {position.positionName}
                  </h3>
                  <span className="text-xs px-2 py-0.5 bg-muted rounded text-muted-foreground">
                    {position.positionCode}
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded">
                    Level {position.positionLevel}
                  </span>
                </div>
                {position.parentName && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Reports to: {position.parentName}
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => onAddSubordinate(position.id)}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Sub-ordinate
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => onAssignUser(position)}
              >
                <UserPlus className="h-3 w-3 mr-1" />
                Add Staff
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onEdit(position)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => onDelete(position)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Assigned Users Info */}
        <CardContent className="pt-0">
          {position.assignedUsers && position.assignedUsers.length > 0 ? (
            <div className="space-y-1.5">
              {position.assignedUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-2.5 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 shrink-0">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">
                      {user.fullName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.nip} • {user.email}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No staff assigned
            </p>
          )}

          {/* Child Count */}
          {hasChildren && (
            <p className="text-xs text-muted-foreground mt-2">
              {position.children.length} sub-ordinate
              {position.children.length !== 1 ? 's' : ''}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Render Children */}
      {hasChildren && isExpanded && (
        <div className="mt-2">
          {position.children.map((child) => (
            <PositionTreeNode
              key={child.id}
              position={child}
              depth={depth + 1}
              onAddSubordinate={onAddSubordinate}
              onEdit={onEdit}
              onDelete={onDelete}
              onAssignUser={onAssignUser}
            />
          ))}
        </div>
      )}
    </div>
  );
};
