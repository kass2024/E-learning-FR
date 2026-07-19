import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Users, Loader2, Pencil, Trash2, ShieldOff, ShieldCheck, ArrowRightCircle } from "lucide-react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { createUser, getUsers, updateUser, deleteUser, UserPayload } from "@/api/axios";
import { useDashboardQuery } from "@/hooks/useDashboardQuery";
import { invalidateDashboardCache } from "@/lib/dashboardCache";
import { TableSkeleton } from "@/components/admin/TableSkeleton";
import { startAdminViewAs } from "@/lib/adminImpersonation";

type UserRow = UserPayload & { id?: number };

const UserManagement = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const {
    data: usersData,
    loading: loadingUsers,
    reload: reloadUsers,
  } = useDashboardQuery<any[]>("users-list", getUsers);
  const users = useMemo(() => {
    const all = Array.isArray(usersData) ? usersData : [];
    return all.filter(
      (u: any) =>
        u.role === "admin" || u.role === "instructor" || u.role === "staff" || u.role === "partner_company"
    );
  }, [usersData]);
  const refreshUsers = async () => {
    invalidateDashboardCache("users-list");
    await reloadUsers();
    setPage(1);
  };
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("staff");
  const [status, setStatus] = useState("Active");
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [phone, setPhone] = useState("");
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);

  const loadUsers = refreshUsers;

  const handleViewAsInstructor = (user: UserRow) => {
    if ((user.role ?? "").toLowerCase() !== "instructor") return;

    const displayName = user.name || user.email || "";

    const started = startAdminViewAs({
      viewAsRole: "instructor",
      viewAsName: displayName || "Instructor",
      viewAsEmail: user.email ?? null,
      returnPath: "/dashboard/users",
    });

    if (!started) {
      toast({
        variant: "destructive",
        title: "Could not switch view",
        description: "You do not have permission to preview as this instructor.",
        duration: 4000,
      });
      return;
    }

    toast({
      variant: "success" as any,
      title: "Switched to instructor view",
      description: "You are now viewing the dashboard as this instructor.",
      duration: 4000,
    });

    navigate("/dashboard/instructor");
  };

  const handleEditUser = (user: UserRow) => {
    const [first = "", last = ""] = (user.name ?? "").split(" ", 2);
    setFirstName(first);
    setLastName(last);
    setEmail(user.email ?? "");
    setPhone((user as any).phone ?? "");
    setRole(user.role ?? "admin");
    setStatus(user.status ?? "Active");
    setEditingUser(user);
    setIsDialogOpen(true);
  };

  const handleToggleStatus = async (user: UserRow) => {
    if (!user.id) return;
    const currentStatus = (user.status ?? "Active").toLowerCase();
    const nextStatus = currentStatus === "inactive" ? "Active" : "Inactive";
    try {
      await updateUser(user.id, { status: nextStatus });
      toast({
        title: "Status updated",
        description: `User status changed to ${nextStatus}.`,
        duration: 4000,
      });
      await loadUsers();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.response?.data?.message || "Failed to update status.",
        duration: 4000,
      });
    }
  };

  const handleDeleteUser = async (user: UserRow) => {
    if (!user.id) return;
    const confirmed = window.confirm(`Are you sure you want to delete ${user.name ?? "this user"}?`);
    if (!confirmed) return;
    try {
      await deleteUser(user.id);
      toast({
        variant: "destructive",
        title: "User deleted",
        description: "The user has been deleted.",
        duration: 4000,
      });
      await loadUsers();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.response?.data?.message || "Failed to delete user.",
        duration: 4000,
      });
    }
  };

  const normalizedSearch = search.trim().toLowerCase();
  const filteredUsers = normalizedSearch
    ? users.filter((user) => {
        const name = (user.name ?? "").toLowerCase();
        const emailValue = (user.email ?? "").toLowerCase();
        const roleValue = (user.role ?? "").toLowerCase();
        return (
          name.includes(normalizedSearch) ||
          emailValue.includes(normalizedSearch) ||
          roleValue.includes(normalizedSearch)
        );
      })
    : users;

  const total = filteredUsers.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, total);
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  const handleChangePage = (newPage: number) => {
    if (newPage < 1 || newPage > pageCount) return;
    setPage(newPage);
  };

  const handleExport = () => {
    if (!filteredUsers.length) {
      toast({
        title: "Nothing to export",
        description: "There are no users matching the current filters.",
        duration: 4000,
      });
      return;
    }

    const header = ["Name", "Email", "Role", "Status"];
    const rows = filteredUsers.map((u) => [
      u.name ?? "",
      u.email ?? "",
      u.role ?? "",
      u.status ?? "",
    ]);

    const csvContent = [header, ...rows]
      .map((cols) =>
        cols
          .map((value) => {
            const safe = String(value ?? "");
            if (safe.includes("\"") || safe.includes(",") || safe.includes("\n")) {
              return `"${safe.replace(/"/g, '""')}"`;
            }
            return safe;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "users.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Export started",
      description: "Your CSV file is being downloaded.",
      duration: 4000,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    const fullName = `${firstName} ${lastName}`.trim();
    const payloadName = fullName || email;
    try {
      if (editingUser && editingUser.id) {
        await updateUser(editingUser.id, { name: payloadName, email, role, status, phone });
      } else {
        await createUser({ name: payloadName, email, password: "12345678", role, status, phone });
      }
      toast({
        variant: "success" as any,
        title: "Success",
        description: editingUser ? "User updated successfully" : "User added successfully",
        duration: 4000,
      });
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setRole("staff");
      setStatus("Active");
      setEditingUser(null);
      setIsDialogOpen(false);
      await loadUsers();
    } catch (error: any) {
      const status = error?.response?.status;
      const message =
        status === 404
          ? "User API not found. Please ensure the /users endpoint exists on the server."
          : error?.response?.data?.message || "Failed to create user. Please try again.";
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
        duration: 4000,
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">Users List</h1>
            <p className="text-sm text-muted-foreground">Manage admin and instructor accounts.</p>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="hero"
              onClick={() => {
                setFirstName("");
                setLastName("");
                setEmail("");
                setPhone("");
                setRole("staff");
                setStatus("Active");
                setEditingUser(null);
              }}
            >
              Create User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingUser ? "Edit User" : "Create User"}</DialogTitle>
              <DialogDescription>
                {editingUser ? "Update the user details." : "Add a new admin or instructor user."}
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 234 567 890"
                />
              </div>

              <div className="flex flex-col md:flex-row md:items-end md:gap-4">
                <div className="space-y-2 md:flex-1 min-w-[140px]">
                  <Label htmlFor="role">Role</Label>
                  <select
                    id="role"
                    className="w-full border border-input bg-background rounded-md px-3 py-2 text-sm"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="admin">Admin</option>
                    <option value="staff">Staff</option>
                    <option value="instructor">Instructor</option>
                    <option value="partner_company">Partner Company</option>
                  </select>
                </div>

                <div className="space-y-2 md:flex-1 min-w-[140px] mt-3 md:mt-0">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    className="w-full border border-input bg-background rounded-md px-3 py-2 text-sm"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Close
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={creating}>
                  {creating ? "Saving..." : "Save changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Users List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4 text-sm">
            <div className="flex items-center gap-2">
              <span>Show</span>
              <select
                className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value) || 10);
                  setPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span>entries</span>
            </div>
            <div className="flex items-center gap-3 justify-end">
              <div className="flex items-center gap-2">
                <span>Search:</span>
                <Input
                  placeholder=""
                  className="h-8 w-[200px] text-sm"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <Button variant="outline" size="sm" onClick={handleExport}>
                Export CSV
              </Button>
            </div>
          </div>
          {loadingUsers ? (
            <TableSkeleton rows={8} cols={7} />
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="border border-border rounded-md">
                <TableHeader>
                  <TableRow className="border-b border-border text-xs text-muted-foreground bg-muted/40">
                    <TableHead className="w-[40px] text-center">#</TableHead>
                    <TableHead className="w-[220px]">Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="w-[120px]">Role</TableHead>
                    <TableHead className="w-[140px]">Phone</TableHead>
                    <TableHead className="w-[110px]">Status</TableHead>
                    <TableHead className="w-[140px]">Joining Date</TableHead>
                    <TableHead className="w-[140px] text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.map((user, index) => {
                    const currentStatus = user.status ?? "Active";
                    const isInactive = currentStatus.toLowerCase() === "inactive";
                    const phone = (user as any).phone ?? "-";
                    const createdAt = (user as any).created_at || (user as any).createdAt;
                    const joiningDate = createdAt
                      ? new Date(createdAt).toLocaleDateString(undefined, {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "-";
                    return (
                      <TableRow key={user.id ?? user.email} className="border-b border-border last:border-0">
                        <TableCell className="text-center text-muted-foreground">
                          {startIndex + index + 1}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">{user.name}</TableCell>
                        <TableCell className="text-muted-foreground">{user.email}</TableCell>
                        <TableCell className="text-muted-foreground capitalize">{user.role ?? "-"}</TableCell>
                        <TableCell className="text-muted-foreground">{phone}</TableCell>
                        <TableCell>
                          <Badge variant={isInactive ? "outline" : "default"}>{currentStatus}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{joiningDate}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEditUser(user)}
                              title="Edit user"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            {((user.role ?? "").toLowerCase() === "instructor") && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-3"
                                onClick={() => handleViewAsInstructor(user)}
                                title="View as instructor"
                              >
                                <ArrowRightCircle className="w-4 h-4 mr-1" />
                                View as
                              </Button>
                            )}
                            <Button
                              variant={isInactive ? "outline" : "secondary"}
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleToggleStatus(user)}
                              title={isInactive ? "Activate user" : "Deactivate user"}
                            >
                              {isInactive ? (
                                <ShieldCheck className="w-4 h-4" />
                              ) : (
                                <ShieldOff className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleDeleteUser(user)}
                              title="Delete user"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mt-4 text-xs text-muted-foreground">
                <div>
                  {total === 0
                    ? "Showing 0 to 0 of 0 entries"
                    : `Showing ${startIndex + 1} to ${endIndex} of ${total} entries`}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-3"
                    onClick={() => handleChangePage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <div className="h-7 min-w-[32px] rounded-md border border-input bg-background px-2 flex items-center justify-center text-foreground">
                    {currentPage}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-3"
                    onClick={() => handleChangePage(currentPage + 1)}
                    disabled={currentPage === pageCount}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagement;
