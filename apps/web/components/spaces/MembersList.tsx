"use client";

import { useState, useEffect } from "react";
import { api, apiClient } from "@/lib/api/client";
import { Users, UserPlus, Shield, Edit2, Eye, FileEdit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { ApiResponse } from "@/lib/api/types";

interface Member {
  user_id: string;
  space_id: string;
  role: "viewer" | "editor" | "admin";
  created_at: string;
  user_email: string;
  user_name?: string;
}

interface MembersListProps {
  spaceId: string;
}

const roleLabels = {
  viewer: "Viewer",
  editor: "Editor",
  admin: "Admin",
};

const roleIcons = {
  viewer: Eye,
  editor: FileEdit,
  admin: Shield,
};

export function MembersList({ spaceId }: MembersListProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const res = await api.get<ApiResponse<Member[]>>(`/api/spaces/${spaceId}/members`);
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
  }, [spaceId]);

  const handleRemoveMember = async (userId: string, userEmail: string) => {
    if (!confirm(`Xác nhận xóa ${userEmail} khỏi space?`)) return;

    try {
      await apiClient(`/api/spaces/${spaceId}/members/${userId}`, { method: "DELETE" });
      toast.success("Đã xóa member");
      loadMembers();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Xóa thất bại";
      toast.error(message);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: "viewer" | "editor" | "admin") => {
    try {
      await apiClient(`/api/spaces/${spaceId}/members/${userId}`, {
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
          <Users className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Members ({members.length})</h2>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-primary h-9 px-3 text-sm gap-2"
        >
          <UserPlus className="h-4 w-4" />
          Thêm member
        </button>
      </div>

      {showAddForm && (
        <AddMemberForm spaceId={spaceId} onSuccess={() => { setShowAddForm(false); loadMembers(); }} />
      )}

      {members.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Chưa có members nào</p>
        </div>
      ) : (
        <div className="border rounded-lg divide-y">
          {members.map((member) => {
            const RoleIcon = roleIcons[member.role];
            return (
              <div key={member.user_id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary">
                      {member.user_name?.[0]?.toUpperCase() ?? member.user_email[0]?.toUpperCase() ?? "?"}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{member.user_name || member.user_email}</div>
                    <div className="text-sm text-muted-foreground truncate">{member.user_email}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <RoleIcon className="h-4 w-4 text-muted-foreground" />
                    <select
                      value={member.role}
                      onChange={(e) => handleUpdateRole(member.user_id, e.target.value as "viewer" | "editor" | "admin")}
                      className="text-sm border rounded px-2 py-1 bg-background"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveMember(member.user_id, member.user_email)}
                  className="ml-4 p-2 text-destructive hover:bg-destructive/10 rounded transition-colors"
                  title="Xóa member"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AddMemberForm({ spaceId, onSuccess }: { spaceId: string; onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"viewer" | "editor" | "admin">("viewer");
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
      await apiClient(`/api/spaces/${spaceId}/members/by-email`, {
        method: "POST",
        body: { email: email.trim(), role },
      });
      toast.success("Đã thêm member", {
        description: "User cần refresh trang để thấy space mới",
        duration: 5000,
      });
      setEmail("");
      setRole("viewer");
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
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
          className="flex-1"
          disabled={loading}
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "viewer" | "editor" | "admin")}
          className="border rounded px-3"
          disabled={loading}
        >
          <option value="viewer">Viewer</option>
          <option value="editor">Editor</option>
          <option value="admin">Admin</option>
        </select>
        <button type="submit" disabled={loading} className="btn-primary px-4">
          {loading ? "Đang thêm..." : "Thêm"}
        </button>
      </div>
      {error && <div className="text-sm text-destructive">{error}</div>}
    </form>
  );
}
