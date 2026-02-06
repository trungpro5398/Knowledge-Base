"use client";

import { useState, useEffect } from "react";
import { api, apiClient } from "@/lib/api/client";
import { Users, UserPlus, Shield, Crown, UserCheck, Trash2, Search, Loader2 } from "lucide-react";
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

interface UserSearchResult {
  id: string;
  email: string;
  name?: string;
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
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<"member" | "admin" | "owner">("member");
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<UserSearchResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCancelled = false;
    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        const params = new URLSearchParams({
          limit: "50",
          organizationId,
        });
        if (query.trim()) {
          params.set("q", query.trim());
        }
        const res = await api.get<ApiResponse<UserSearchResult[]>>(
          `/api/users/search?${params.toString()}`
        );
        if (!isCancelled) {
          setSuggestions(res.data ?? []);
        }
      } catch (searchError) {
        if (!isCancelled) {
          setSuggestions([]);
          console.error(searchError);
        }
      } finally {
        if (!isCancelled) {
          setSearching(false);
        }
      }
    }, 220);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [organizationId, query]);

  const resolveTargetUser = (): UserSearchResult | null => {
    if (selectedUser) return selectedUser;
    const normalized = query.trim().toLowerCase();
    if (!normalized) return null;
    return suggestions.find((user) => user.email.toLowerCase() === normalized) ?? null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pickedUser = resolveTargetUser();
    if (!pickedUser && !query.trim()) {
      setError("Vui lòng chọn user");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const payload = pickedUser
        ? { userId: pickedUser.id, role }
        : { email: query.trim(), role };

      await apiClient(`/api/organizations/${organizationId}/members`, {
        method: "POST",
        body: payload,
      });
      toast.success("Đã thêm member", {
        description: "User sẽ tự động thấy tất cả spaces của organization",
        duration: 5000,
      });
      setQuery("");
      setSelectedUser(null);
      setSuggestions([]);
      setShowSuggestions(false);
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
      <div className="flex flex-col md:flex-row gap-2">
        <div className="flex-1 relative">
          <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            name="member-search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedUser(null);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => {
              setTimeout(() => setShowSuggestions(false), 120);
            }}
            placeholder="Tìm theo tên hoặc email..."
            className="w-full pl-9"
            disabled={loading}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            aria-label="Tìm user để thêm"
          />

          {showSuggestions && (
            <div className="absolute z-20 mt-1 w-full rounded-lg border bg-popover shadow-lg max-h-72 overflow-auto">
              {searching ? (
                <div className="px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang tải users...
                </div>
              ) : suggestions.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  Không còn user nào phù hợp để thêm
                </div>
              ) : (
                suggestions.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-muted transition-colors"
                    onClick={() => {
                      setSelectedUser(user);
                      setQuery(user.email);
                      setShowSuggestions(false);
                      setError("");
                    }}
                  >
                    <div className="font-medium truncate">{user.name || user.email}</div>
                    <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "member" | "admin" | "owner")}
          className="border rounded px-3 h-10"
          disabled={loading}
        >
          <option value="member">Member</option>
          <option value="admin">Admin</option>
          <option value="owner">Owner</option>
        </select>
        <button type="submit" disabled={loading} className="btn-primary px-4 h-10">
          {loading ? "Đang thêm..." : "Thêm"}
        </button>
      </div>
      {selectedUser && (
        <div className="text-xs text-emerald-600 dark:text-emerald-400">
          Đã chọn: {selectedUser.name || selectedUser.email} ({selectedUser.email})
        </div>
      )}
      {error && <div className="text-sm text-destructive">{error}</div>}
    </form>
  );
}
