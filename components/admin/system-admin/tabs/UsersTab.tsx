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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, MoreVertical, Eye, Edit, Trash2, UserPlus, MapPin, CheckCircle, XCircle } from 'lucide-react';
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
  const [assignmentUser, setAssignmentUser] = useState<User | null>(null);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isViewUserOpen, setIsViewUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isAssignmentViewOpen, setIsAssignmentViewOpen] = useState(false);

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

  const handleAssignmentView = (user: User) => {
    setAssignmentUser(user);
    setIsAssignmentViewOpen(true);
  };

  // Helper function to get assignment details based on user role
  const getAssignmentDetails = (user: User) => {
    if (!user) return null;

    switch (user.role) {
      case 'Polling Agent':
        return {
          type: 'Polling Unit',
          id: user.pollingUnitId,
          name: user.pollingUnitName || 'Not Assigned',
          details: `Agent assigned to monitor polling unit`,
        };
      case 'Ward Admin':
        return {
          type: 'Ward',
          id: user.wardId,
          name: user.wardName || 'Not Assigned',
          details: `Administrator for ward`,
        };
      case 'Zone Admin':
        return {
          type: 'Zone',
          id: user.zoneId,
          name: user.zoneName || 'Not Assigned',
          details: `Administrator for zone`,
        };
      default:
        return {
          type: 'System',
          id: null,
          name: 'System-wide',
          details: `System administrator with full access`,
        };
    }
  };

  // Assignment View Dialog Component
  const AssignmentViewDialog = () => {
    if (!assignmentUser) return null;
    
    const assignment = getAssignmentDetails(assignmentUser);
    const isAssigned = assignment && assignment.id && assignment.name !== 'Not Assigned';

    return (
      <Dialog open={isAssignmentViewOpen} onOpenChange={setIsAssignmentViewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Assignment Details
            </DialogTitle>
            <DialogDescription>
              View and manage assignment for {assignmentUser.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* User Info */}
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Avatar className="h-10 w-10">
                <AvatarFallback>{getInitials(assignmentUser.name)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{assignmentUser.name}</p>
                <p className="text-sm text-muted-foreground">{assignmentUser.email}</p>
                <Badge className={getRoleBadgeColor(assignmentUser.role)}>
                  {assignmentUser.role}
                </Badge>
              </div>
            </div>

            {/* Assignment Status */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Assignment Status</span>
                {isAssigned ? (
                  <Badge variant="success" className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Assigned
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <XCircle className="h-3 w-3" />
                    Not Assigned
                  </Badge>
                )}
              </div>
            </div>

            {/* Assignment Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Assignment Type</label>
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-sm">{assignment?.type || 'N/A'}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {assignment?.details || ''}
                </p>
              </div>
            </div>

            {/* Assignment Details */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Assigned To</label>
              <div className="p-3 bg-primary/5 border border-primary/10 rounded-lg">
                {isAssigned ? (
                  <>
                    <p className="font-medium">{assignment?.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      ID: {assignment?.id}
                    </p>
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    This user is not currently assigned to any {assignment?.type?.toLowerCase()}
                  </p>
                )}
              </div>
            </div>

            {/* Additional Info based on role */}
            {assignmentUser.role === 'Polling Agent' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Agent Details</label>
                <div className="p-3 bg-muted/30 rounded-lg space-y-1">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Status:</span>{' '}
                    {assignmentUser.status || 'Active'}
                  </p>
                  {assignmentUser.lastActive && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Last Active:</span>{' '}
                      {new Date(assignmentUser.lastActive).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setIsAssignmentViewOpen(false);
                  handleEditUser(assignmentUser);
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Assignment
              </Button>
              <Button
                variant="default"
                className="flex-1"
                onClick={() => {
                  setIsAssignmentViewOpen(false);
                  // Navigate to assignment management or open assignment dialog
                }}
              >
                <MapPin className="h-4 w-4 mr-2" />
                Manage Assignment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
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
                <TableHead className="text-right">Actions</TableHead>
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
                        <DropdownMenuItem onClick={() => handleAssignmentView(user)}>
                          <MapPin className="h-4 w-4 mr-2" />
                          Assignment View
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
 zones={zones}
wards={wards}
pollingUnits={pollingUnits}
  onRefresh={onRefresh}
/>

      {/* Assignment View Dialog */}
      <AssignmentViewDialog />
    </>
  );
};