"use client";

import { useState, useEffect } from "react";
import { api, apiClient } from "@/lib/api/client";
import { Users, UserPlus, Shield, Crown, UserCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { ApiResponse } from "@/lib/api/types";

interface OrganizationMember {
  user_id: string;
  organization_id: string;
  role: "member" | "admin" | "owner";
  created_at: string;
  user_email: string;
  user_name?: string;
}

interface OrganizationMembersListProps {
  organizationId: string;
}

const roleLabels = {
  member: "Member",
  admin: "Admin",
  owner: "Owner",
};

const roleIcons = {
  member: UserCheck,
  admin: Shield,
  owner: Crown,
};

export function OrganizationMembersList({ organizationId }: OrganizationMembersListProps) {
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const res = await api.get<ApiResponse<OrganizationMember[]>>(
        `/api/organizations/${organizationId}/members`
      );
      setMembers(res.data ?? []);
    } catch (error) {
      toast.error("Không thể tải danh sách members");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const handleRemoveMember = async (userId: string, userEmail: string) => {
    if (!confirm(`Xác nhận xóa ${userEmail} khỏi organization?`)) return;

    try {
      await apiClient(`/api/organizations/${organizationId}/members/${userId}`, {
        method: "DELETE",
      });
      toast.success("Đã xóa member");
      loadMembers();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Xóa thất bại";
      toast.error(message);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: "member" | "admin" | "owner") => {
    try {
      await apiClient(`/api/organizations/${organizationId}/members/${userId}`, {
        method: "PATCH",
        body: { role: newRole },
      });
      toast.success("Đã cập nhật role");
      loadMembers();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Cập nhật thất bại";
      toast.error(message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-muted-foreground">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          <h2 className="text-lg font-semibold">Members ({members.length})</h2>
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-primary h-9 px-3 text-sm gap-2"
        >
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          Thêm member
        </button>
      </div>

      {showAddForm && (
        <AddMemberForm
          organizationId={organizationId}
          onSuccess={() => {
            setShowAddForm(false);
            loadMembers();
          }}
        />
      )}

      {members.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" aria-hidden="true" />
          <p>Chưa có members nào</p>
        </div>
      ) : (
        <div className="border rounded-lg divide-y">
          {members.map((member) => {
            const RoleIcon = roleIcons[member.role];
            return (
              <div
                key={member.user_id}
                className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary">
                      {member.user_name?.[0]?.toUpperCase() ??
                        member.user_email[0]?.toUpperCase() ??
                        "?"}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">
                      {member.user_name || member.user_email}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">{member.user_email}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <RoleIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <select
                      value={member.role}
                      onChange={(e) =>
                        handleUpdateRole(
                          member.user_id,
                          e.target.value as "member" | "admin" | "owner"
                        )
                      }
                      className="text-sm border rounded px-2 py-1 bg-background"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                      <option value="owner">Owner</option>
                    </select>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveMember(member.user_id, member.user_email)}
                  className="ml-4 p-2 text-destructive hover:bg-destructive/10 rounded transition-colors"
                  title="Xóa member"
                  aria-label={`Xóa member ${member.user_email}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AddMemberForm({
  organizationId,
  onSuccess,
}: {
  organizationId: string;
  onSuccess: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin" | "owner">("member");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Vui lòng nhập email");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await apiClient(`/api/organizations/${organizationId}/members`, {
        method: "POST",
        body: { email: email.trim(), role },
      });
      toast.success("Đã thêm member", {
        description: "User sẽ tự động thấy tất cả spaces của organization",
        duration: 5000,
      });
      setEmail("");
      setRole("member");
      onSuccess();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Thêm member thất bại";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-4 space-y-3 bg-card">
      <div className="flex gap-2">
        <input
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
          className="flex-1"
          disabled={loading}
          autoComplete="email"
          autoCapitalize="none"
          inputMode="email"
          spellCheck={false}
          aria-label="Email thành viên"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "member" | "admin" | "owner")}
          className="border rounded px-3"
          disabled={loading}
        >
          <option value="member">Member</option>
          <option value="admin">Admin</option>
          <option value="owner">Owner</option>
        </select>
        <button type="submit" disabled={loading} className="btn-primary px-4">
          {loading ? "Đang thêm..." : "Thêm"}
        </button>
      </div>
      {error && <div className="text-sm text-destructive">{error}</div>}
    </form>
  );
}
