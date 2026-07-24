import { useState } from 'react';
import { MoreHorizontal, Plus } from 'lucide-react';
import { useUsers } from '../hooks/useUsers';

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminUsersPage() {
  const { users, isLoading, error } = useUsers();

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-sm font-sans text-muted-foreground mb-1">Administration / Users</p>
          <h1 className="font-display text-headline text-foreground">Manage Users</h1>
          <p className="font-sans text-muted-foreground mt-1 text-body">
            System access and role management
          </p>
        </div>
        <Button className="shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      {error ? (
        <div className="p-6 text-center text-destructive font-sans">Error: {error}</div>
      ) : (
        <Card className="shadow-sm">
          <CardHeader className="border-b border-border bg-muted/50 pb-4">
            <CardTitle className="font-sans text-title">System Users</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-sans font-semibold text-muted-foreground uppercase tracking-wider text-xs">Name</TableHead>
                  <TableHead className="font-sans font-semibold text-muted-foreground uppercase tracking-wider text-xs">Email</TableHead>
                  <TableHead className="font-sans font-semibold text-muted-foreground uppercase tracking-wider text-xs">Role</TableHead>
                  <TableHead className="font-sans font-semibold text-muted-foreground uppercase tracking-wider text-xs">Status</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-[100px]" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-[80px]" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                    </TableRow>
                  ))
                ) : users?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center font-sans text-muted-foreground">
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  users?.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-sans font-medium text-foreground">
                        {user.firstName} {user.lastName}
                      </TableCell>
                      <TableCell className="font-sans text-muted-foreground">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-sans font-normal tracking-wide bg-background text-foreground border-border">
                          {user.role?.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={user.status} />
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger className={buttonVariants({ variant: "ghost" }) + " h-8 w-8 p-0"}>
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[160px]">
                            <DropdownMenuLabel className="font-sans text-xs">Actions</DropdownMenuLabel>
                            <DropdownMenuItem className="font-sans cursor-pointer">Edit details</DropdownMenuItem>
                            <DropdownMenuItem className="font-sans cursor-pointer">Change role</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="font-sans cursor-pointer text-destructive focus:bg-destructive focus:text-destructive-foreground">
                              Suspend account
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const isOk = status === 'ACTIVE';
  const variant = isOk ? 'secondary' : 'destructive';
  return (
    <Badge variant={variant} className="font-sans">
      {status}
    </Badge>
  );
}
