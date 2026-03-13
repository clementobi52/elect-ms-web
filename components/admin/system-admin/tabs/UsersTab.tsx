// components/admin/system-admin/tabs/UsersTab.tsx
import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, MoreVertical, Eye, Edit, Trash2, UserPlus } from 'lucide-react';
import { CreateUserDialog } from '../dialogs/CreateUserDialog';
import { ViewUserDialog } from '../dialogs/ViewUserDialog';
import { EditUserDialog } from '../dialogs/EditUserDialog';
import { DeleteConfirmationDialog } from '../dialogs/DeleteConfirmationDialog';
import { User } from '../types';
import { getRoleBadgeColor } from '@/lib/types';

interface UsersTabProps {
  users: User[];
  zones: any[];
  wards: any[];
  pollingUnits: any[];
  onRefresh: () => void;
  onDelete: (type: string, id: string, name: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedRole: string;
  setSelectedRole: (role: string) => void;
  getInitials: (name: string) => string;
  getStatusBadge: (status: string) => JSX.Element;
  getAssignmentDisplay: (user: User | null) => string;
  getLocationDisplay: (user: User | null) => string;
}

export const UsersTab: React.FC<UsersTabProps> = ({
  users,
  zones,
  wards,
  pollingUnits,
  onRefresh,
  onDelete,
  searchQuery,
  setSearchQuery,
  selectedRole,
  setSelectedRole,
  getInitials,
  getStatusBadge,
  getAssignmentDisplay,
  getLocationDisplay,
}) => {
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isViewUserOpen, setIsViewUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);

  const handleViewUser = (user: User) => {
    setViewingUser(user);
    setIsViewUserOpen(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsEditUserOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    onDelete('user', user.id, user.name);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage all system users and their roles</CardDescription>
            </div>
            <Button onClick={() => setIsCreateUserOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Create User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="Polling Agent">Polling Agent</SelectItem>
                <SelectItem value="Ward Admin">Ward Admin</SelectItem>
                <SelectItem value="Zone Admin">Zone Admin</SelectItem>
                <SelectItem value="Situation Room Admin">Situation Room</SelectItem>
                <SelectItem value="System Admin">System Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Assignment</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getRoleBadgeColor(user.role)}>{user.role}</Badge>
                  </TableCell>
                  <TableCell>{getAssignmentDisplay(user)}</TableCell>
                  <TableCell>{getLocationDisplay(user)}</TableCell>
                  <TableCell>{getStatusBadge(user.status || 'active')}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewUser(user)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditUser(user)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit User
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDeleteUser(user)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CreateUserDialog
        open={isCreateUserOpen}
        onOpenChange={setIsCreateUserOpen}
        zones={zones}
        wards={wards}
        pollingUnits={pollingUnits}
        onSuccess={onRefresh}
      />

      <ViewUserDialog
        open={isViewUserOpen}
        onOpenChange={setIsViewUserOpen}
        user={viewingUser}
        getAssignmentDisplay={getAssignmentDisplay}
        getLocationDisplay={getLocationDisplay}
      />

      <EditUserDialog
        open={isEditUserOpen}
        onOpenChange={setIsEditUserOpen}
        user={editingUser}
        onSuccess={onRefresh}
      />
    </>
  );
};