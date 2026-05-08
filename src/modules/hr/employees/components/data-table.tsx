'use client';

import React, { useState } from 'react';
import { Search, Edit, Trash2, Loader2, UserPlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CoreUser } from '../types';

interface DataTableProps {
  users: CoreUser[];
  isLoading?: boolean;
  onEdit: (user: CoreUser) => void;
  onDelete: (user: CoreUser) => void;
  onAssignPosition: (user: CoreUser) => void;
}

export const DataTable: React.FC<DataTableProps> = ({
  users,
  isLoading = false,
  onEdit,
  onDelete,
  onAssignPosition,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Client-side search filter
  const filteredUsers = users.filter(
    (user) =>
      user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.nip.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, NIP, or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Data Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Full Name</TableHead>
              <TableHead>NIP</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Primary Position</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  {searchQuery
                    ? 'No users found matching your search.'
                    : 'No users found. Create your first user to get started.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.fullName}</TableCell>
                  <TableCell>{user.nip}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.roles?.length > 0 ? (
                      <Badge variant="outline" className="font-normal">
                        {user.roles[0].roleCode}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm italic">
                        No role
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.primaryPosition ? (
                      <Badge variant="outline" className="font-normal">
                        {user.primaryPosition.positionName}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm italic">
                        Unassigned
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? 'success' : 'destructive'}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onAssignPosition(user)}
                        className="h-8 w-8"
                        title="Assign Position"
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(user)}
                        className="h-8 w-8"
                        title="Edit User"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(user)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        title="Deactivate User"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Results count */}
      {!isLoading && filteredUsers.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Showing {filteredUsers.length} of {users.length} users
        </p>
      )}
    </div>
  );
};
