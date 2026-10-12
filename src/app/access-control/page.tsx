"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Modal } from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialogProvider";
import {
  ShieldCheck,
  ShieldAlert,
  Shield,
  Users2,
  UserCog,
  KeyRound,
  Layers,
  History,
  Search,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  AlertTriangle,
  Info,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Lock,
  Unlock,
  Key,
  Eye,
  Filter,
  UserCheck,
  UserMinus,
  Briefcase,
  Building2,
  FolderKanban,
  FileText,
  UtensilsCrossed,
  Settings,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

type ActiveTab = "users" | "roles" | "permissions" | "scopes" | "audit-logs";

export default function AccessControlPage() {
  const { success, error, toast } = useToast();
  const { confirm } = useConfirm();

  const [activeTab, setActiveTab] = useState<ActiveTab>("users");
  const [loading, setLoading] = useState(true);

  // Data states
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [permissionModules, setPermissionModules] = useState<any[]>([]);
  const [allPermissions, setAllPermissions] = useState<any[]>([]);
  const [scopesData, setScopesData] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");

  // ==================== ROLE MODAL STATES (4 TABS) ====================
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [roleModalTab, setRoleModalTab] = useState<"info" | "permissions" | "scopes" | "users">("info");
  const [editingRole, setEditingRole] = useState<any>(null);
  const [roleName, setRoleName] = useState("");
  const [roleCode, setRoleCode] = useState("");
  const [roleDesc, setRoleDesc] = useState("");
  const [roleStatus, setRoleStatus] = useState("active");
  const [roleDefaultScope, setRoleDefaultScope] = useState("system");
  const [selectedPermCodes, setSelectedPermCodes] = useState<string[]>([]);
  const [originalPermCodes, setOriginalPermCodes] = useState<string[]>([]);
  const [permSearchQuery, setPermSearchQuery] = useState("");
  const [roleSaving, setRoleSaving] = useState(false);
  const [roleAssignedUsers, setRoleAssignedUsers] = useState<any[]>([]);

  // ==================== USER ASSIGN ROLES MODAL ====================
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignUser, setAssignUser] = useState<any>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [assignSaving, setAssignSaving] = useState(false);

  // ==================== EFFECTIVE PERMISSIONS INSPECTOR MODAL ====================
  const [inspectorModalOpen, setInspectorModalOpen] = useState(false);
  const [inspectorUser, setInspectorUser] = useState<any>(null);
  const [inspectorData, setInspectorData] = useState<any>(null);
  const [inspectorLoading, setInspectorLoading] = useState(false);
  const [inspectorSearch, setInspectorSearch] = useState("");

  // ==================== USER SCOPE CONFIG MODAL ====================
  const [scopeModalOpen, setScopeModalOpen] = useState(false);
  const [scopeUser, setScopeUser] = useState<any>(null);
  const [userScopeType, setUserScopeType] = useState<string>("system");
  const [userScopeProjectIds, setUserScopeProjectIds] = useState<string[]>([]);
  const [userScopeDept, setUserScopeDept] = useState<string>("");
  const [scopeSaving, setScopeSaving] = useState(false);

  // ==================== AUDIT DETAIL MODAL ====================
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [selectedAuditLog, setSelectedAuditLog] = useState<any>(null);

  // Load all initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [uRes, rRes, pRes, sRes, aRes] = await Promise.all([
        fetch("/api/access/users"),
        fetch("/api/access/roles"),
        fetch("/api/access/permissions"),
        fetch("/api/access/scopes"),
        fetch("/api/access/audit-logs?limit=50"),
      ]);

      if (uRes.ok) {
        const uJson = await uRes.json();
        if (uJson.success) setUsers(uJson.data);
      }
      if (rRes.ok) {
        const rJson = await rRes.json();
        if (rJson.success) setRoles(rJson.data);
      }
      if (pRes.ok) {
        const pJson = await pRes.json();
        if (pJson.success) {
          setPermissionModules(pJson.data.modules);
          setAllPermissions(pJson.data.allPermissions);
        }
      }
      if (sRes.ok) {
        const sJson = await sRes.json();
        if (sJson.success) setScopesData(sJson.data);
      }
      if (aRes.ok) {
        const aJson = await aRes.json();
        if (aJson.success) setAuditLogs(aJson.data);
      }
    } catch (err) {
      console.error("Error fetching access control data:", err);
      error("Lỗi khi tải dữ liệu phân quyền.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        !searchQuery ||
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.staff?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.staff?.corporateEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.staff?.staffCode?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchRole =
        roleFilter === "all" ||
        u.roles.some((r: any) => r.id === roleFilter || r.code === roleFilter);

      const matchStatus = statusFilter === "all" || u.status === statusFilter;

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  // Filtered Roles
  const filteredRoles = useMemo(() => {
    return roles.filter((r) => {
      const matchSearch =
        !searchQuery ||
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchSearch;
    });
  }, [roles, searchQuery]);

  // Filtered Permissions
  const filteredPermissionModules = useMemo(() => {
    return permissionModules
      .filter((m) => moduleFilter === "all" || m.module === moduleFilter)
      .map((m) => ({
        ...m,
        permissions: m.permissions.filter(
          (p: any) =>
            !searchQuery ||
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.description?.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      }))
      .filter((m) => m.permissions.length > 0);
  }, [permissionModules, moduleFilter, searchQuery]);

  // ==================== ROLE ACTIONS ====================
  const handleOpenCreateRole = () => {
    setEditingRole(null);
    setRoleName("");
    setRoleCode("");
    setRoleDesc("");
    setRoleStatus("active");
    setRoleDefaultScope("system");
    setSelectedPermCodes([]);
    setOriginalPermCodes([]);
    setRoleAssignedUsers([]);
    setRoleModalTab("info");
    setRoleModalOpen(true);
  };

  const handleOpenEditRole = async (role: any) => {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleCode(role.code);
    setRoleDesc(role.description || "");
    setRoleStatus(role.status);
    setRoleDefaultScope(role.defaultScopeType);
    setRoleModalTab("info");

    try {
      const res = await fetch(`/api/access/roles/${role.id}`);
      const json = await res.json();
      if (json.success) {
        setSelectedPermCodes(json.data.permissionCodes || []);
        setOriginalPermCodes(json.data.permissionCodes || []);
        setRoleAssignedUsers(json.data.assignedUsers || []);
      }
    } catch {
      setSelectedPermCodes([]);
      setOriginalPermCodes([]);
      setRoleAssignedUsers([]);
    }

    setRoleModalOpen(true);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) {
      error("Vui lòng nhập tên vai trò.");
      return;
    }

    setRoleSaving(true);
    try {
      const isEdit = Boolean(editingRole);
      const url = isEdit ? `/api/access/roles/${editingRole.id}` : "/api/access/roles";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: roleName.trim(),
          code: roleCode.trim() || undefined,
          description: roleDesc.trim(),
          status: roleStatus,
          defaultScopeType: roleDefaultScope,
          permissionCodes: selectedPermCodes,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        error(json.error?.message || "Lỗi lưu vai trò.");
        setRoleSaving(false);
        return;
      }

      success(isEdit ? "Cập nhật vai trò thành công!" : "Tạo vai trò mới thành công!");
      setRoleModalOpen(false);
      fetchData();
    } catch {
      error("Lỗi khi kết nối đến máy chủ.");
    } finally {
      setRoleSaving(false);
    }
  };

  const handleDeleteRole = async (role: any) => {
    if (role.isSystem) {
      error("Không thể xóa vai trò hệ thống cốt lõi.");
      return;
    }

    if (role.userCount > 0) {
      error(`Vai trò này đang được gán cho ${role.userCount} người dùng. Không thể xóa.`);
      return;
    }

    const ok = await confirm({
      title: "Xóa vai trò?",
      message: `Bạn có chắc chắn muốn xóa vai trò "${role.name}" (${role.code}) không? Hành động này sẽ gỡ bỏ vai trò vĩnh viễn.`,
      confirmText: "Xóa vai trò",
      variant: "danger",
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/access/roles/${role.id}`, { method: "DELETE" });
      const json = await res.json();
      if (res.ok && json.success) {
        success("Đã xóa vai trò thành công.");
        fetchData();
      } else {
        error(json.error?.message || "Lỗi xóa vai trò.");
      }
    } catch {
      error("Lỗi khi gửi yêu cầu xóa vai trò.");
    }
  };

  // Toggle permission in role modal
  const handleTogglePerm = (code: string) => {
    setSelectedPermCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  // Toggle all permissions of a module
  const handleToggleModulePerms = (mod: any) => {
    const modCodes: string[] = mod.permissions.map((p: any) => p.code);
    const allSelected = modCodes.every((c) => selectedPermCodes.includes(c));

    if (allSelected) {
      // Unselect all
      setSelectedPermCodes((prev) => prev.filter((c) => !modCodes.includes(c)));
    } else {
      // Select non-sensitive by default, or all if confirmed
      const newCodes = Array.from(new Set([...selectedPermCodes, ...modCodes]));
      setSelectedPermCodes(newCodes);
    }
  };

  // Summary of permission changes in role modal
  const permDiffSummary = useMemo(() => {
    const added = selectedPermCodes.filter((c) => !originalPermCodes.includes(c));
    const removed = originalPermCodes.filter((c) => !selectedPermCodes.includes(c));
    return { added, removed, hasChanges: added.length > 0 || removed.length > 0 };
  }, [selectedPermCodes, originalPermCodes]);

  // ==================== USER ROLE ASSIGNMENT ====================
  const handleOpenAssignModal = (user: any) => {
    setAssignUser(user);
    setSelectedRoleIds(user.roles.map((r: any) => r.id));
    setAssignModalOpen(true);
  };

  const handleSaveUserRoles = async () => {
    if (!assignUser) return;
    setAssignSaving(true);
    try {
      const res = await fetch(`/api/access/users/${assignUser.id}/roles`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleIds: selectedRoleIds }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        error(json.error?.message || "Lỗi gán vai trò.");
        setAssignSaving(false);
        return;
      }
      success("Cập nhật vai trò người dùng thành công!");
      setAssignModalOpen(false);
      fetchData();
    } catch {
      error("Lỗi kết nối khi gán vai trò.");
    } finally {
      setAssignSaving(false);
    }
  };

  // ==================== EFFECTIVE PERMISSIONS INSPECTOR ====================
  const handleOpenInspector = async (user: any) => {
    setInspectorUser(user);
    setInspectorModalOpen(true);
    setInspectorLoading(true);
    try {
      const res = await fetch(`/api/access/users/${user.id}/roles`);
      const json = await res.json();
      if (json.success) {
        setInspectorData(json.data);
      } else {
        error("Không thể tải quyền hiệu lực của người dùng.");
      }
    } catch {
      error("Lỗi khi tải chi tiết quyền.");
    } finally {
      setInspectorLoading(false);
    }
  };

  // ==================== USER SCOPE CONFIG ====================
  const handleOpenScopeModal = (user: any) => {
    setScopeUser(user);
    const existingScopes = user.scopes || [];

    if (existingScopes.some((s: any) => s.scopeType === "system")) {
      setUserScopeType("system");
    } else if (existingScopes.some((s: any) => s.scopeType === "project")) {
      setUserScopeType("project");
      const projectIds = existingScopes
        .filter((s: any) => s.scopeType === "project" && s.targetId)
        .map((s: any) => s.targetId);
      setUserScopeProjectIds(projectIds);
    } else if (existingScopes.some((s: any) => s.scopeType === "department")) {
      setUserScopeType("department");
      const deptScope = existingScopes.find((s: any) => s.scopeType === "department");
      setUserScopeDept(deptScope?.targetName || user.staff?.department || "");
    } else if (existingScopes.some((s: any) => s.scopeType === "assigned")) {
      setUserScopeType("assigned");
    } else {
      setUserScopeType(user.primaryScope || "assigned");
    }

    setScopeModalOpen(true);
  };

  const handleSaveUserScope = async () => {
    if (!scopeUser) return;
    setScopeSaving(true);
    try {
      let scopesToSave: any[] = [];

      if (userScopeType === "system") {
        scopesToSave = [{ scopeType: "system", notes: "Truy cập toàn bộ dữ liệu hệ thống" }];
      } else if (userScopeType === "project") {
        if (userScopeProjectIds.length > 0) {
          scopesToSave = userScopeProjectIds.map((pid) => {
            const proj = scopesData?.availableTargets?.projects?.find((p: any) => p.id === pid);
            return {
              scopeType: "project",
              targetId: pid,
              targetName: proj?.name || pid,
              notes: `Phạm vi dự án ${proj?.name || pid}`,
            };
          });
        } else {
          scopesToSave = [{ scopeType: "project", notes: "Theo các dự án được phân công Level 1/2/3" }];
        }
      } else if (userScopeType === "department") {
        scopesToSave = [
          {
            scopeType: "department",
            targetName: userScopeDept || scopeUser.staff?.department || "Chung",
            notes: `Phạm vi phòng ban ${userScopeDept || scopeUser.staff?.department || "Chung"}`,
          },
        ];
      } else if (userScopeType === "assigned") {
        scopesToSave = [{ scopeType: "assigned", notes: "Chỉ dữ liệu được giao thực hiện hoặc theo dõi" }];
      } else {
        scopesToSave = [{ scopeType: "personal", notes: "Chỉ dữ liệu do chính người dùng tạo" }];
      }

      const res = await fetch(`/api/access/users/${scopeUser.id}/scopes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scopes: scopesToSave }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        error(json.error?.message || "Lỗi lưu phạm vi dữ liệu.");
        setScopeSaving(false);
        return;
      }

      success("Cập nhật phạm vi truy cập dữ liệu thành công!");
      setScopeModalOpen(false);
      fetchData();
    } catch {
      error("Lỗi kết nối khi cập nhật phạm vi.");
    } finally {
      setScopeSaving(false);
    }
  };

  // Scope label formatting
  const getScopeBadge = (scopeType: string) => {
    switch (scopeType) {
      case "system":
        return {
          label: "Toàn hệ thống",
          className: "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]",
          icon: Shield,
        };
      case "project":
        return {
          label: "Theo dự án",
          className: "bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]",
          icon: FolderKanban,
        };
      case "department":
        return {
          label: "Theo phòng ban",
          className: "bg-[#FAF5FF] text-[#7E22CE] border-[#E9D5FF]",
          icon: Building2,
        };
      case "assigned":
        return {
          label: "Dữ liệu được giao",
          className: "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]",
          icon: Briefcase,
        };
      case "personal":
        return {
          label: "Dữ liệu cá nhân",
          className: "bg-[#F1F3F6] text-[#475569] border-[#CBD5E1]",
          icon: Users2,
        };
      default:
        return {
          label: scopeType,
          className: "bg-[#F1F3F6] text-[#64748B] border-[#DDE2E9]",
          icon: Layers,
        };
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F1F3F6] min-h-screen">
      <Header
        title="Quản trị truy cập"
        subtitle="Mô hình kiểm soát truy cập phân tầng: Người dùng → Vai trò → Quyền hạn + Phạm vi dữ liệu (RBAC & Data Scopes)"
        actionButton={
          <div className="flex items-center gap-2">
            <Link
              href="/users"
              className="px-3 py-1.5 rounded-md bg-white hover:bg-[#F8FAFC] text-[#172033] font-medium text-xs flex items-center gap-1.5 transition-colors border border-[#DDE2E9] shadow-xs"
            >
              <UserCog className="w-3.5 h-3.5 text-[#2457A7]" />
              <span>Danh mục Tài khoản</span>
            </Link>
            <button
              onClick={handleOpenCreateRole}
              className="px-3.5 py-1.5 rounded-md bg-[#2457A7] hover:bg-[#1C4585] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tạo vai trò mới</span>
            </button>
          </div>
        }
      />

      <div className="p-6 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-white border border-[#DDE2E9] shadow-xs overflow-x-auto">
          {[
            { id: "users", label: "01. Người dùng và phân quyền", icon: Users2, badge: users.length },
            { id: "roles", label: "02. Vai trò", icon: ShieldCheck, badge: roles.length },
            { id: "permissions", label: "03. Danh mục quyền hạn", icon: KeyRound, badge: allPermissions.length },
            { id: "scopes", label: "04. Phạm vi truy cập", icon: Layers, badge: "5 mức" },
            { id: "audit-logs", label: "05. Nhật ký phân quyền", icon: History, badge: auditLogs.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as ActiveTab);
                  setSearchQuery("");
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                  isActive
                    ? "bg-[#18283F] text-white shadow-xs"
                    : "text-[#64748B] hover:text-[#172033] hover:bg-[#F8FAFC]"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#38BDF8]" : "text-[#94A3B8]"}`} />
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                    isActive ? "bg-[#2457A7] text-white" : "bg-[#EDF1F5] text-[#64748B]"
                  }`}
                >
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: NGƯỜI DÙNG VÀ PHÂN QUYỀN */}
        {/* ========================================================================= */}
        {activeTab === "users" && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-lg bg-white border border-[#DDE2E9] shadow-xs">
              <div className="relative w-full sm:w-80">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm tài khoản, họ tên, email, mã nhân viên..."
                  className="w-full px-3 py-1.5 pl-9 rounded-md bg-white border border-[#DDE2E9] text-[#172033] placeholder-[#94A3B8] text-xs focus:outline-none focus:ring-1 focus:ring-[#2457A7]"
                />
                <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {/* Role Filter */}
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#2457A7]"
                >
                  <option value="all">Tất cả vai trò</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#2457A7]"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="active">Đang hoạt động</option>
                  <option value="locked">Bị khóa</option>
                  <option value="inactive">Ngừng sử dụng</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="rounded-lg bg-white border border-[#DDE2E9] overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] border-b border-[#DDE2E9] text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-4">Tài khoản & Nhân sự</th>
                      <th className="py-2.5 px-3">Phòng ban</th>
                      <th className="py-2.5 px-3">Vai trò đang đảm nhiệm</th>
                      <th className="py-2.5 px-3">Phạm vi truy cập</th>
                      <th className="py-2.5 px-3">Trạng thái</th>
                      <th className="py-2.5 px-4 text-right">Thao tác phân quyền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EDF1F5] text-[#172033]">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-[#64748B]">
                          Đang tải danh sách người dùng và phân quyền...
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-[#64748B]">
                          Không tìm thấy người dùng phù hợp với điều kiện tìm kiếm.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const scopeBadge = getScopeBadge(u.primaryScope);
                        const ScopeIcon = scopeBadge.icon;
                        const hasAdmin = u.roles.some((r: any) => r.code === "admin");

                        return (
                          <tr key={u.id} className="hover:bg-[#F8FAFC] transition-colors">
                            <td className="py-2.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={`w-7 h-7 rounded-md flex items-center justify-center font-bold text-xs uppercase shrink-0 ${
                                    hasAdmin
                                      ? "bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]"
                                      : "bg-[#E5EDFA] text-[#2457A7] border border-[#BFD4F7]"
                                  }`}
                                >
                                  {u.username.charAt(0)}
                                </div>
                                <div>
                                  <div className="font-semibold text-[#172033] text-xs flex items-center gap-1.5">
                                    <span>{u.staff?.fullName || u.username}</span>
                                    {hasAdmin && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]">
                                        ADMIN
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-[#64748B] font-mono">
                                    @{u.username} {u.staff?.staffCode ? `• ${u.staff.staffCode}` : ""}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="py-2.5 px-3 text-[#172033] font-medium">
                              {u.staff?.department || "—"}
                            </td>

                            <td className="py-2.5 px-3">
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {u.roles.length > 0 ? (
                                  u.roles.map((r: any) => (
                                    <span
                                      key={r.id}
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                                        r.code === "admin"
                                          ? "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]"
                                          : r.code === "pm"
                                          ? "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]"
                                          : "bg-[#F1F3F6] text-[#334155] border-[#CBD5E1]"
                                      }`}
                                    >
                                      {r.name}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[#94A3B8] italic text-[11px]">Chưa gán vai trò</span>
                                )}
                              </div>
                            </td>

                            <td className="py-2.5 px-3">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${scopeBadge.className}`}
                              >
                                <ScopeIcon className="w-3 h-3" />
                                <span>{scopeBadge.label}</span>
                              </span>
                            </td>

                            <td className="py-2.5 px-3">
                              <span
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                                  u.status === "active"
                                    ? "bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]"
                                    : "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]"
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    u.status === "active" ? "bg-[#15803D]" : "bg-[#B91C1C]"
                                  }`}
                                />
                                {u.status === "active" ? "Hoạt động" : "Bị khóa"}
                              </span>
                            </td>

                            <td className="py-2.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleOpenAssignModal(u)}
                                  className="px-2 py-1 rounded bg-white hover:bg-[#F8FAFC] border border-[#DDE2E9] text-[#172033] text-[11px] font-medium flex items-center gap-1 shadow-xs transition-colors"
                                  title="Gán hoặc thu hồi vai trò"
                                >
                                  <Shield className="w-3 h-3 text-[#2457A7]" />
                                  <span>Gán vai trò</span>
                                </button>

                                <button
                                  onClick={() => handleOpenInspector(u)}
                                  className="px-2 py-1 rounded bg-white hover:bg-[#F8FAFC] border border-[#DDE2E9] text-[#64748B] hover:text-[#172033] text-[11px] font-medium flex items-center gap-1 shadow-xs transition-colors"
                                  title="Xem quyền hiệu lực và nguồn cấp quyền"
                                >
                                  <Eye className="w-3 h-3 text-[#64748B]" />
                                  <span>Xem quyền</span>
                                </button>

                                <button
                                  onClick={() => handleOpenScopeModal(u)}
                                  className="p-1 rounded hover:bg-[#F1F3F6] text-[#64748B] hover:text-[#172033] transition-colors"
                                  title="Cấu hình phạm vi truy cập dữ liệu"
                                >
                                  <Layers className="w-3.5 h-3.5 text-[#64748B]" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: VAI TRÒ */}
        {/* ========================================================================= */}
        {activeTab === "roles" && (
          <div className="space-y-5">
            {/* Header description banner */}
            <div className="p-4 rounded-lg bg-white border border-[#DDE2E9] shadow-xs flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-md bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="text-xs space-y-1">
                <div className="font-semibold text-[#172033] text-sm">
                  Quản lý Vai trò Công việc (Roles & Responsibilities)
                </div>
                <div className="text-[#64748B] leading-relaxed">
                  Vai trò là một nhóm quyền gom theo vị trí công việc. Nhiều người có thể dùng chung vai trò.
                  Khi thay đổi quyền hạn của vai trò, mọi tài khoản đang gán sẽ được cập nhật hiệu lực tự động.
                </div>
              </div>
            </div>

            {/* Roles Grid Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredRoles.map((r) => (
                <div
                  key={r.id}
                  className="rounded-lg bg-white border border-[#DDE2E9] p-4 shadow-xs flex flex-col justify-between hover:border-[#2457A7]/50 transition-colors"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="font-bold text-sm text-[#172033] flex items-center gap-1.5">
                          <span>{r.name}</span>
                          {r.isSystem && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1]">
                              Hệ thống
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-[11px] text-[#64748B]">
                          code: <span className="font-semibold text-[#172033]">{r.code}</span>
                        </div>
                      </div>

                      <span
                        className={`w-2 h-2 rounded-full ${
                          r.status === "active" ? "bg-[#15803D]" : "bg-[#94A3B8]"
                        }`}
                        title={r.status === "active" ? "Đang áp dụng" : "Ngừng sử dụng"}
                      />
                    </div>

                    <p className="text-xs text-[#64748B] line-clamp-2 min-h-[32px] leading-relaxed">
                      {r.description || "Không có mô tả trách nhiệm."}
                    </p>

                    <div className="pt-2 border-t border-[#EDF1F5] grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-[#F8FAFC] p-2 rounded border border-[#EDF1F5]">
                        <div className="text-[10px] text-[#64748B] font-medium">Người dùng</div>
                        <div className="text-base font-bold text-[#172033]">{r.userCount} người</div>
                      </div>
                      <div className="bg-[#F8FAFC] p-2 rounded border border-[#EDF1F5]">
                        <div className="text-[10px] text-[#64748B] font-medium">Quyền hạn</div>
                        <div className="text-base font-bold text-[#2457A7]">{r.permissionCount} quyền</div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3.5 mt-3 border-t border-[#EDF1F5] flex items-center justify-between">
                    <span className="text-[11px] text-[#64748B]">
                      Mặc định: <strong className="text-[#172033]">{r.defaultScopeType}</strong>
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditRole(r)}
                        className="px-2 py-1 rounded bg-[#F8FAFC] hover:bg-[#E5EDFA] text-[#2457A7] font-semibold text-xs border border-[#DDE2E9] hover:border-[#BFD4F7] transition-colors"
                      >
                        Cấu hình
                      </button>
                      {!r.isSystem && (
                        <button
                          onClick={() => handleDeleteRole(r)}
                          className="p-1 rounded text-[#94A3B8] hover:text-[#B91C1C] hover:bg-[#FEF2F2] transition-colors"
                          title="Xóa vai trò"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: DANH MỤC QUYỀN HẠN */}
        {/* ========================================================================= */}
        {activeTab === "permissions" && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-lg bg-white border border-[#DDE2E9] shadow-xs">
              <div className="relative w-full sm:w-80">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo tên quyền, mã quyền (vd: projects.detail.edit)..."
                  className="w-full px-3 py-1.5 pl-9 rounded-md bg-white border border-[#DDE2E9] text-[#172033] placeholder-[#94A3B8] text-xs focus:outline-none focus:ring-1 focus:ring-[#2457A7]"
                />
                <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={moduleFilter}
                  onChange={(e) => setModuleFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#2457A7]"
                >
                  <option value="all">Tất cả module ({allPermissions.length} quyền)</option>
                  {permissionModules.map((m) => (
                    <option key={m.module} value={m.module}>
                      {m.moduleName} ({m.permissions.length} quyền)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Permissions Grouped View */}
            <div className="space-y-4">
              {filteredPermissionModules.map((mod) => (
                <div key={mod.module} className="rounded-lg bg-white border border-[#DDE2E9] shadow-xs overflow-hidden">
                  <div className="px-4 py-3 bg-[#F8FAFC] border-b border-[#DDE2E9] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-[#172033] uppercase tracking-wider">
                        Module: {mod.moduleName}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E5EDFA] text-[#2457A7] border border-[#BFD4F7]">
                        {mod.permissions.length} quyền
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-[#64748B]">prefix: {mod.module}.*</span>
                  </div>

                  <div className="divide-y divide-[#EDF1F5]">
                    {mod.permissions.map((p: any) => (
                      <div
                        key={p.id}
                        className="p-3.5 hover:bg-[#F8FAFC] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-[#172033]">{p.name}</span>
                            {p.isSensitive && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                <span>Nhạy cảm</span>
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[#64748B]">{p.description}</div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[10px] text-[#64748B] uppercase font-semibold bg-[#F1F3F6] px-1.5 py-0.5 rounded border border-[#DDE2E9]">
                            {p.action}
                          </span>
                          <span className="font-mono text-xs text-[#2457A7] bg-[#EFF6FF] px-2 py-0.5 rounded border border-[#BFDBFE]">
                            {p.code}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: PHẠM VI TRUY CẬP */}
        {/* ========================================================================= */}
        {activeTab === "scopes" && (
          <div className="space-y-5">
            {/* Principles Box */}
            <div className="p-4 rounded-lg bg-white border border-[#DDE2E9] shadow-xs space-y-2 text-xs">
              <div className="font-bold text-sm text-[#172033] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#2457A7]" />
                <span>Nguyên tắc Quản lý Phạm vi Dữ liệu (Data Scoping Architecture)</span>
              </div>
              <p className="text-[#64748B] leading-relaxed">
                Có quyền chức năng (ví dụ: <code className="text-[#2457A7]">projects.detail.view</code>) không đồng nghĩa
                với việc xem được tất cả bản ghi trong hệ thống. Hệ thống áp dụng nguyên tắc:{" "}
                <strong className="text-[#172033]">Mặc định từ chối</strong> nếu dữ liệu nằm ngoài phạm vi được cấp
                của nhân sự.
              </p>
            </div>

            {/* 5 Levels Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {[
                {
                  type: "system",
                  name: "Toàn hệ thống",
                  count: scopesData?.stats?.system || 0,
                  desc: "Truy cập không giới hạn mọi dự án, phòng ban và tài liệu toàn sàn.",
                  badge: "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]",
                },
                {
                  type: "project",
                  name: "Theo dự án",
                  count: scopesData?.stats?.project || 0,
                  desc: "Chỉ truy cập các dự án được chỉ định cụ thể hoặc được phân công Level 1/2/3.",
                  badge: "bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]",
                },
                {
                  type: "department",
                  name: "Theo phòng ban",
                  count: scopesData?.stats?.department || 0,
                  desc: "Chỉ truy cập dữ liệu và tài liệu thuộc khối phòng ban của nhân sự.",
                  badge: "bg-[#FAF5FF] text-[#7E22CE] border-[#E9D5FF]",
                },
                {
                  type: "assigned",
                  name: "Dữ liệu được giao",
                  count: scopesData?.stats?.assigned || 0,
                  desc: "Chỉ truy cập các bản ghi, yêu cầu công việc được giao thực hiện hoặc theo dõi.",
                  badge: "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]",
                },
                {
                  type: "personal",
                  name: "Dữ liệu cá nhân",
                  count: scopesData?.stats?.personal || 0,
                  desc: "Chỉ truy cập bản ghi do chính tài khoản của mình khởi tạo.",
                  badge: "bg-[#F1F3F6] text-[#475569] border-[#CBD5E1]",
                },
              ].map((lvl) => (
                <div key={lvl.type} className="p-4 rounded-lg bg-white border border-[#DDE2E9] shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${lvl.badge}`}>
                      {lvl.name}
                    </span>
                    <span className="text-base font-extrabold text-[#172033]">{lvl.count}</span>
                  </div>
                  <p className="text-[11px] text-[#64748B] leading-relaxed">{lvl.desc}</p>
                </div>
              ))}
            </div>

            {/* Scope Assignments Table */}
            <div className="rounded-lg bg-white border border-[#DDE2E9] shadow-xs overflow-hidden">
              <div className="px-4 py-3 bg-[#F8FAFC] border-b border-[#DDE2E9] font-bold text-xs text-[#172033] uppercase">
                Danh sách Phân bổ Phạm vi Dữ liệu theo Người dùng
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] border-b border-[#DDE2E9] text-[11px] font-semibold text-[#64748B] uppercase">
                    <tr>
                      <th className="py-2.5 px-4">Tài khoản</th>
                      <th className="py-2.5 px-3">Mức phạm vi</th>
                      <th className="py-2.5 px-3">Mục tiêu áp dụng (Dự án / Phòng ban)</th>
                      <th className="py-2.5 px-3">Ghi chú</th>
                      <th className="py-2.5 px-4 text-right">Cấu hình</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EDF1F5] text-[#172033]">
                    {scopesData?.scopes?.length > 0 ? (
                      scopesData.scopes.map((s: any) => {
                        const badge = getScopeBadge(s.scopeType);
                        return (
                          <tr key={s.id} className="hover:bg-[#F8FAFC]">
                            <td className="py-2.5 px-4 font-semibold text-[#172033]">
                              {s.fullName} <span className="text-[#64748B] font-mono">(@{s.username})</span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badge.className}`}>
                                {badge.label}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-medium text-[#172033]">
                              {s.targetName || "Toàn bộ danh mục"}
                            </td>
                            <td className="py-2.5 px-3 text-[#64748B] text-[11px]">
                              {s.notes || "—"}
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <button
                                onClick={() => {
                                  const targetUser = users.find((u) => u.id === s.userId);
                                  if (targetUser) handleOpenScopeModal(targetUser);
                                }}
                                className="px-2 py-1 rounded bg-[#F8FAFC] hover:bg-[#E5EDFA] text-[#2457A7] text-[11px] font-medium border border-[#DDE2E9]"
                              >
                                Đổi phạm vi
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-[#64748B]">
                          Chưa có bản ghi phân bổ phạm vi riêng lẻ.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: NHẬT KÝ PHÂN QUYỀN */}
        {/* ========================================================================= */}
        {activeTab === "audit-logs" && (
          <div className="space-y-4">
            <div className="rounded-lg bg-white border border-[#DDE2E9] shadow-xs overflow-hidden">
              <div className="px-4 py-3 bg-[#F8FAFC] border-b border-[#DDE2E9] flex items-center justify-between">
                <span className="font-bold text-xs text-[#172033] uppercase">
                  Nhật ký Phân quyền & Quản trị Truy cập (Access Audit Trail)
                </span>
                <span className="text-xs text-[#64748B]">
                  Lưu trữ vết thay đổi vai trò, quyền hạn và phạm vi dữ liệu
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] border-b border-[#DDE2E9] text-[11px] font-semibold text-[#64748B] uppercase">
                    <tr>
                      <th className="py-2.5 px-4">Thời gian</th>
                      <th className="py-2.5 px-3">Người thực hiện</th>
                      <th className="py-2.5 px-3">Hành động</th>
                      <th className="py-2.5 px-3">Đối tượng</th>
                      <th className="py-2.5 px-4">Tóm tắt nội dung thay đổi</th>
                      <th className="py-2.5 px-3 text-right">Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EDF1F5] text-[#172033]">
                    {auditLogs.length > 0 ? (
                      auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-[#F8FAFC]">
                          <td className="py-2.5 px-4 text-[#64748B] font-mono text-[11px]">
                            {formatDate(log.createdAt)}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-[#172033]">
                            {log.actorName} <span className="text-[#64748B] font-mono">(@{log.actorUsername})</span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
                              {log.action}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-medium text-[#172033]">
                            {log.targetName || log.targetType}
                          </td>
                          <td className="py-2.5 px-4 text-[#475569] text-xs">
                            {log.summary}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => {
                                setSelectedAuditLog(log);
                                setAuditModalOpen(true);
                              }}
                              className="px-2 py-1 rounded bg-[#F8FAFC] hover:bg-[#F1F3F6] text-[#2457A7] text-[11px] font-semibold border border-[#DDE2E9]"
                            >
                              Xem diff
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-[#64748B]">
                          Chưa có nhật ký phân quyền nào được ghi nhận.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: TẠO / SỬA VAI TRÒ (4 TABS CHUẨN SECTION 4) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        title={editingRole ? `Cấu hình Vai trò: ${editingRole.name}` : "Tạo Vai trò mới"}
        subtitle="Định nghĩa chức trách, phạm vi trách nhiệm và tập quyền hạn chức năng"
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleSaveRole} className="space-y-4 text-xs">
          {/* Sub-tabs header */}
          <div className="flex items-center gap-1.5 border-b border-[#DDE2E9] pb-2">
            {[
              { id: "info", label: "1. Thông tin chung" },
              { id: "permissions", label: `2. Quyền chức năng (${selectedPermCodes.length})` },
              { id: "scopes", label: "3. Phạm vi dữ liệu" },
              { id: "users", label: `4. Người dùng đang áp dụng (${roleAssignedUsers.length})` },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setRoleModalTab(st.id as any)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  roleModalTab === st.id
                    ? "bg-[#2457A7] text-white shadow-xs"
                    : "text-[#64748B] hover:text-[#172033] hover:bg-[#F1F3F6]"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Sub-tab 1: Thông tin chung */}
          {roleModalTab === "info" && (
            <div className="space-y-3.5 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Tên vai trò <span className="text-[#B91C1C]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    placeholder="VD: Quản lý dự án (PM)"
                    className="w-full px-3 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] text-xs focus:ring-1 focus:ring-[#2457A7]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Mã vai trò (System Code)
                  </label>
                  <input
                    type="text"
                    disabled={editingRole?.isSystem}
                    value={roleCode}
                    onChange={(e) => setRoleCode(e.target.value)}
                    placeholder="VD: pm, member, custom_lead"
                    className="w-full px-3 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] text-xs font-mono uppercase focus:ring-1 focus:ring-[#2457A7] disabled:bg-[#F8FAFC] disabled:text-[#94A3B8]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                  Mô tả trách nhiệm & nhiệm vụ
                </label>
                <textarea
                  rows={3}
                  value={roleDesc}
                  onChange={(e) => setRoleDesc(e.target.value)}
                  placeholder="Mô tả cụ thể trách nhiệm công việc của những người giữ vai trò này..."
                  className="w-full px-3 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] text-xs focus:ring-1 focus:ring-[#2457A7]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Trạng thái hoạt động
                  </label>
                  <select
                    value={roleStatus}
                    onChange={(e) => setRoleStatus(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] text-xs focus:ring-1 focus:ring-[#2457A7]"
                  >
                    <option value="active">Đang áp dụng (Active)</option>
                    <option value="inactive">Ngừng áp dụng (Inactive)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Phạm vi dữ liệu mặc định
                  </label>
                  <select
                    value={roleDefaultScope}
                    onChange={(e) => setRoleDefaultScope(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] text-xs focus:ring-1 focus:ring-[#2457A7]"
                  >
                    <option value="system">Toàn hệ thống (System-wide)</option>
                    <option value="project">Theo dự án (Project-based)</option>
                    <option value="department">Theo phòng ban (Department-based)</option>
                    <option value="assigned">Dữ liệu được giao (Assigned-only)</option>
                    <option value="personal">Dữ liệu cá nhân (Personal-only)</option>
                  </select>
                </div>
              </div>

              {editingRole?.isSystem && (
                <div className="p-3 rounded-md bg-[#FFFBEB] border border-[#FDE68A] flex items-start gap-2.5 text-xs text-[#B45309]">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-[#B45309] mt-0.5" />
                  <div>
                    <strong>Vai trò hệ thống cốt lõi:</strong> Vai trò này được bảo vệ, không thể xóa hoặc đổi mã
                    code để bảo đảm an toàn cho các quy trình tự động.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sub-tab 2: Quyền chức năng */}
          {roleModalTab === "permissions" && (
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={permSearchQuery}
                    onChange={(e) => setPermSearchQuery(e.target.value)}
                    placeholder="Tìm quyền chức năng trong vai trò..."
                    className="w-full px-3 py-1.5 pl-8 rounded-md bg-white border border-[#DDE2E9] text-xs text-[#172033]"
                  />
                  <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-2.5 top-2" />
                </div>
                <div className="text-xs font-semibold text-[#2457A7]">
                  Đã chọn: {selectedPermCodes.length} / {allPermissions.length} quyền
                </div>
              </div>

              {/* Changes Summary Preview */}
              {permDiffSummary.hasChanges && (
                <div className="p-2.5 rounded-md bg-[#F8FAFC] border border-[#CBD5E1] text-[11px] space-y-1">
                  <div className="font-semibold text-[#172033]">Tóm tắt thay đổi quyền trước khi lưu:</div>
                  <div className="flex flex-wrap gap-2">
                    {permDiffSummary.added.length > 0 && (
                      <span className="text-[#15803D] font-medium">
                        + Thêm {permDiffSummary.added.length} quyền ({permDiffSummary.added.join(", ")})
                      </span>
                    )}
                    {permDiffSummary.removed.length > 0 && (
                      <span className="text-[#B91C1C] font-medium">
                        - Gỡ {permDiffSummary.removed.length} quyền ({permDiffSummary.removed.join(", ")})
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Modules & Permissions Tree */}
              <div className="max-h-96 overflow-y-auto space-y-3 pr-1 border border-[#DDE2E9] rounded-md p-2 bg-[#F8FAFC]">
                {permissionModules.map((mod) => {
                  const modCodes = mod.permissions.map((p: any) => p.code);
                  const isAllChecked = modCodes.every((c: string) => selectedPermCodes.includes(c));
                  const isSomeChecked =
                    !isAllChecked && modCodes.some((c: string) => selectedPermCodes.includes(c));

                  const filteredModPerms = mod.permissions.filter(
                    (p: any) =>
                      !permSearchQuery ||
                      p.name.toLowerCase().includes(permSearchQuery.toLowerCase()) ||
                      p.code.toLowerCase().includes(permSearchQuery.toLowerCase())
                  );

                  if (filteredModPerms.length === 0) return null;

                  return (
                    <div key={mod.module} className="rounded border border-[#DDE2E9] bg-white overflow-hidden">
                      <div className="px-3 py-2 bg-[#F1F3F6] border-b border-[#DDE2E9] flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isAllChecked}
                            ref={(el) => {
                              if (el) el.indeterminate = isSomeChecked;
                            }}
                            onChange={() => handleToggleModulePerms(mod)}
                            className="rounded border-[#CBD5E1] text-[#2457A7] focus:ring-[#2457A7]"
                          />
                          <span className="font-bold text-xs text-[#172033]">{mod.moduleName}</span>
                          <span className="text-[10px] text-[#64748B]">({modCodes.length} quyền)</span>
                        </label>
                      </div>

                      <div className="p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {filteredModPerms.map((p: any) => {
                          const isChecked = selectedPermCodes.includes(p.code);
                          return (
                            <label
                              key={p.id}
                              className={`p-2 rounded border flex items-start gap-2 cursor-pointer transition-colors ${
                                isChecked
                                  ? "bg-[#EFF6FF] border-[#BFDBFE]"
                                  : "bg-white border-[#EDF1F5] hover:bg-[#F8FAFC]"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleTogglePerm(p.code)}
                                className="mt-0.5 rounded border-[#CBD5E1] text-[#2457A7] focus:ring-[#2457A7]"
                              />
                              <div className="space-y-0.5 min-w-0">
                                <div className="font-semibold text-xs text-[#172033] flex items-center gap-1.5">
                                  <span>{p.name}</span>
                                  {p.isSensitive && (
                                    <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]">
                                      Nhạy cảm
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-[#64748B] font-mono truncate">{p.code}</div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sub-tab 3: Phạm vi dữ liệu */}
          {roleModalTab === "scopes" && (
            <div className="space-y-3 pt-1 text-xs">
              <div className="text-[#64748B]">
                Cấu hình phạm vi dữ liệu mặc định sẽ được gán cho các nhân sự khi áp dụng vai trò này:
              </div>

              <div className="space-y-2">
                {[
                  {
                    id: "system",
                    label: "Toàn hệ thống (System)",
                    desc: "Truy cập dữ liệu của tất cả dự án, phòng ban và tài liệu toàn sàn.",
                  },
                  {
                    id: "project",
                    label: "Theo dự án (Project)",
                    desc: "Chỉ được truy cập vào các dự án được chỉ định hoặc tham gia Level 1/2/3.",
                  },
                  {
                    id: "department",
                    label: "Theo phòng ban (Department)",
                    desc: "Chỉ được xem và thao tác dữ liệu thuộc phòng ban chuyên môn của nhân sự.",
                  },
                  {
                    id: "assigned",
                    label: "Dữ liệu được giao (Assigned)",
                    desc: "Chỉ truy cập các yêu cầu công việc hoặc bản ghi được giao phụ trách.",
                  },
                  {
                    id: "personal",
                    label: "Dữ liệu cá nhân (Personal)",
                    desc: "Chỉ được xem dữ liệu do chính mình khởi tạo.",
                  },
                ].map((sc) => (
                  <label
                    key={sc.id}
                    className={`p-3 rounded-lg border flex items-start gap-3 cursor-pointer transition-colors ${
                      roleDefaultScope === sc.id
                        ? "bg-[#EFF6FF] border-[#2457A7]"
                        : "bg-white border-[#DDE2E9] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="roleDefaultScope"
                      value={sc.id}
                      checked={roleDefaultScope === sc.id}
                      onChange={(e) => setRoleDefaultScope(e.target.value)}
                      className="mt-0.5 text-[#2457A7] focus:ring-[#2457A7]"
                    />
                    <div>
                      <div className="font-bold text-[#172033]">{sc.label}</div>
                      <div className="text-[#64748B] text-[11px] mt-0.5">{sc.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Sub-tab 4: Người dùng đang áp dụng */}
          {roleModalTab === "users" && (
            <div className="space-y-3 pt-1 text-xs">
              {roleAssignedUsers.length > 0 && (
                <div className="p-3 rounded-md bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309] flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-[#B45309] mt-0.5" />
                  <div>
                    <strong>Cảnh báo ảnh hưởng:</strong> Vai trò này đang được gán cho{" "}
                    <strong>{roleAssignedUsers.length} người dùng</strong>. Mọi thay đổi về quyền hạn sẽ ngay lập tức
                    áp dụng cho tất cả những người này!
                  </div>
                </div>
              )}

              <div className="rounded border border-[#DDE2E9] overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] border-b border-[#DDE2E9] text-[11px] font-semibold text-[#64748B]">
                    <tr>
                      <th className="py-2 px-3">Họ và tên</th>
                      <th className="py-2 px-3">Username</th>
                      <th className="py-2 px-3">Phòng ban</th>
                      <th className="py-2 px-3">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EDF1F5]">
                    {roleAssignedUsers.length > 0 ? (
                      roleAssignedUsers.map((u: any) => (
                        <tr key={u.id} className="hover:bg-[#F8FAFC]">
                          <td className="py-2 px-3 font-semibold text-[#172033]">{u.fullName}</td>
                          <td className="py-2 px-3 font-mono text-[#64748B]">@{u.username}</td>
                          <td className="py-2 px-3 text-[#172033]">{u.department}</td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                u.status === "active" ? "bg-[#F0FDF4] text-[#15803D]" : "bg-[#FEF2F2] text-[#B91C1C]"
                              }`}
                            >
                              {u.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-[#64748B]">
                          Chưa có tài khoản nào được gán vai trò này.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-[#DDE2E9]">
            <span className="text-[11px] text-[#64748B]">
              {selectedPermCodes.length} quyền được cấu hình
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRoleModalOpen(false)}
                className="px-3 py-1.5 rounded-md text-xs font-medium text-[#64748B] hover:bg-[#F1F3F6]"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={roleSaving}
                className="px-4 py-1.5 rounded-md text-xs font-semibold bg-[#2457A7] hover:bg-[#1C4585] text-white shadow-xs disabled:opacity-50"
              >
                {roleSaving ? "Đang lưu..." : editingRole ? "Lưu thay đổi vai trò" : "Tạo vai trò"}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: GÁN / THU HỒI VAI TRÒ CHO NGƯỜI DÙNG */}
      {/* ========================================================================= */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title={`Gán Vai trò: ${assignUser?.staff?.fullName || assignUser?.username}`}
        subtitle="Một tài khoản có thể đảm nhiệm nhiều vai trò công việc cùng lúc"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 rounded-md bg-[#F8FAFC] border border-[#DDE2E9] space-y-1">
            <div className="font-semibold text-[#172033]">
              Tài khoản: @{assignUser?.username} • {assignUser?.staff?.fullName || "—"}
            </div>
            <div className="text-[#64748B] text-[11px]">
              Phòng ban: {assignUser?.staff?.department || "Chưa phân bổ"}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Chọn danh sách vai trò gán cho tài khoản:
            </label>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {roles.map((r) => {
                const isChecked = selectedRoleIds.includes(r.id);
                const isAdminRole = r.code === "admin";

                return (
                  <label
                    key={r.id}
                    className={`p-3 rounded-lg border flex items-start gap-2.5 cursor-pointer transition-colors ${
                      isChecked
                        ? isAdminRole
                          ? "bg-[#FEF2F2] border-[#FECACA]"
                          : "bg-[#EFF6FF] border-[#BFDBFE]"
                        : "bg-white border-[#DDE2E9] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        setSelectedRoleIds((prev) =>
                          prev.includes(r.id) ? prev.filter((id) => id !== r.id) : [...prev, r.id]
                        );
                      }}
                      className="mt-0.5 text-[#2457A7] rounded border-[#CBD5E1] focus:ring-[#2457A7]"
                    />
                    <div className="space-y-0.5">
                      <div className="font-bold text-xs text-[#172033] flex items-center gap-2">
                        <span>{r.name}</span>
                        {isAdminRole && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#B91C1C] text-white">
                            QUẢN TRỊ VIÊN
                          </span>
                        )}
                        <span className="text-[10px] text-[#64748B] font-mono">({r.permissionCount} quyền)</span>
                      </div>
                      <div className="text-[11px] text-[#64748B]">{r.description}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {selectedRoleIds.some((id) => roles.find((r) => r.id === id)?.code === "admin") && (
            <div className="p-3 rounded-md bg-[#FEF2F2] border border-[#FECACA] flex items-start gap-2 text-xs text-[#B91C1C]">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#B91C1C]" />
              <div>
                <strong>Cảnh báo phân quyền nhạy cảm:</strong> Bạn đang cấp vai trò Quản trị viên (Admin) cho tài
                khoản này. Tài khoản sẽ có toàn quyền truy cập và thao tác toàn hệ thống.
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DDE2E9]">
            <button
              onClick={() => setAssignModalOpen(false)}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-[#64748B] hover:bg-[#F1F3F6]"
            >
              Hủy
            </button>
            <button
              onClick={handleSaveUserRoles}
              disabled={assignSaving}
              className="px-4 py-1.5 rounded-md text-xs font-semibold bg-[#2457A7] hover:bg-[#1C4585] text-white shadow-xs disabled:opacity-50"
            >
              {assignSaving ? "Đang lưu..." : "Lưu vai trò"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: XEM QUYỀN HIỆU LỰC & NGUỒN CẤP QUYỀN (SECTION 5) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={inspectorModalOpen}
        onClose={() => setInspectorModalOpen(false)}
        title={`Quyền Hiệu lực: ${inspectorUser?.staff?.fullName || inspectorUser?.username}`}
        subtitle="Tổng hợp từ các vai trò đang gán và xác định vai trò nguồn mang lại từng quyền"
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4 text-xs">
          {inspectorLoading ? (
            <div className="py-8 text-center text-[#64748B]">Đang phân tích quyền hiệu lực...</div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#DDE2E9]">
                  <div className="text-[10px] text-[#64748B] font-medium">Vai trò đảm nhiệm</div>
                  <div className="text-sm font-bold text-[#172033] mt-0.5">
                    {inspectorData?.assignedRoles?.map((r: any) => r.name).join(", ") || "Chưa có vai trò"}
                  </div>
                </div>

                <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#DDE2E9]">
                  <div className="text-[10px] text-[#64748B] font-medium">Tổng quyền hiệu lực</div>
                  <div className="text-sm font-bold text-[#2457A7] mt-0.5">
                    {inspectorData?.effectivePermissionCount || 0} quyền
                  </div>
                </div>

                <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#DDE2E9]">
                  <div className="text-[10px] text-[#64748B] font-medium">Quyền nhạy cảm</div>
                  <div className="text-sm font-bold text-[#B91C1C] mt-0.5">
                    {inspectorData?.sensitivePermissionCount || 0} quyền
                  </div>
                </div>
              </div>

              {/* Search permissions inside inspector */}
              <div className="relative">
                <input
                  type="text"
                  value={inspectorSearch}
                  onChange={(e) => setInspectorSearch(e.target.value)}
                  placeholder="Lọc quyền hiệu lực..."
                  className="w-full px-3 py-1.5 pl-8 rounded-md bg-white border border-[#DDE2E9] text-xs"
                />
                <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-2.5 top-2" />
              </div>

              {/* Permissions & Sources Table */}
              <div className="max-h-80 overflow-y-auto border border-[#DDE2E9] rounded-md">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] border-b border-[#DDE2E9] text-[10px] font-semibold text-[#64748B] uppercase">
                    <tr>
                      <th className="py-2 px-3">Quyền hiệu lực</th>
                      <th className="py-2 px-3">Mã quyền</th>
                      <th className="py-2 px-3">Nguồn cấp (Vai trò)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EDF1F5]">
                    {inspectorData?.effectivePermissions
                      ?.filter(
                        (p: any) =>
                          !inspectorSearch ||
                          p.name.toLowerCase().includes(inspectorSearch.toLowerCase()) ||
                          p.code.toLowerCase().includes(inspectorSearch.toLowerCase())
                      )
                      .map((p: any) => (
                        <tr key={p.id} className="hover:bg-[#F8FAFC]">
                          <td className="py-2 px-3 font-semibold text-[#172033]">
                            <div className="flex items-center gap-1.5">
                              <span>{p.name}</span>
                              {p.isSensitive && (
                                <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-[#FEF2F2] text-[#B91C1C]">
                                  Nhạy cảm
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-3 font-mono text-[#2457A7] text-[11px]">{p.code}</td>
                          <td className="py-2 px-3">
                            <div className="flex flex-wrap gap-1">
                              {p.sources?.map((s: any) => (
                                <span
                                  key={s.roleId}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#E5EDFA] text-[#2457A7] border border-[#BFD4F7]"
                                >
                                  {s.roleName}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setInspectorModalOpen(false)}
                  className="px-4 py-1.5 rounded-md text-xs font-semibold bg-[#2457A7] text-white hover:bg-[#1C4585]"
                >
                  Đóng
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: CẤU HÌNH PHẠM VI TRUY CẬP DỮ LIỆU */}
      {/* ========================================================================= */}
      <Modal
        isOpen={scopeModalOpen}
        onClose={() => setScopeModalOpen(false)}
        title={`Cấu hình Phạm vi: ${scopeUser?.staff?.fullName || scopeUser?.username}`}
        subtitle="Giới hạn tập dữ liệu người dùng được phép xem và thao tác"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4 text-xs">
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Chọn mức phạm vi dữ liệu:
            </label>

            <div className="space-y-2">
              {[
                { id: "system", label: "Toàn hệ thống", desc: "Truy cập dữ liệu tất cả dự án và phòng ban." },
                { id: "project", label: "Theo dự án", desc: "Chỉ truy cập các dự án được chỉ định hoặc tham gia." },
                { id: "department", label: "Theo phòng ban", desc: "Chỉ dữ liệu thuộc phòng ban chuyên môn." },
                { id: "assigned", label: "Dữ liệu được giao", desc: "Chỉ các bản ghi được giao phụ trách." },
                { id: "personal", label: "Chỉ dữ liệu cá nhân", desc: "Chỉ bản ghi do chính tài khoản tạo." },
              ].map((st) => (
                <label
                  key={st.id}
                  className={`p-2.5 rounded-lg border flex items-start gap-2.5 cursor-pointer transition-colors ${
                    userScopeType === st.id
                      ? "bg-[#EFF6FF] border-[#2457A7]"
                      : "bg-white border-[#DDE2E9] hover:bg-[#F8FAFC]"
                  }`}
                >
                  <input
                    type="radio"
                    name="userScopeType"
                    value={st.id}
                    checked={userScopeType === st.id}
                    onChange={(e) => setUserScopeType(e.target.value)}
                    className="mt-0.5 text-[#2457A7] focus:ring-[#2457A7]"
                  />
                  <div>
                    <div className="font-bold text-[#172033]">{st.label}</div>
                    <div className="text-[#64748B] text-[11px]">{st.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* If project scope selected, allow selecting specific projects */}
          {userScopeType === "project" && (
            <div className="space-y-1.5 p-3 rounded-md bg-[#F8FAFC] border border-[#DDE2E9]">
              <label className="text-[11px] font-semibold text-[#172033]">
                Dự án chỉ định cụ thể (Nếu không chọn, sẽ tự động theo phân công Level 1/2/3):
              </label>
              <div className="max-h-36 overflow-y-auto space-y-1">
                {scopesData?.availableTargets?.projects?.map((p: any) => (
                  <label key={p.id} className="flex items-center gap-2 p-1 hover:bg-white rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={userScopeProjectIds.includes(p.id)}
                      onChange={() => {
                        setUserScopeProjectIds((prev) =>
                          prev.includes(p.id) ? prev.filter((id) => id !== p.id) : [...prev, p.id]
                        );
                      }}
                      className="rounded border-[#CBD5E1] text-[#2457A7]"
                    />
                    <span className="font-medium text-[#172033]">{p.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* If department scope selected */}
          {userScopeType === "department" && (
            <div className="space-y-1.5 p-3 rounded-md bg-[#F8FAFC] border border-[#DDE2E9]">
              <label className="text-[11px] font-semibold text-[#172033]">Phòng ban áp dụng:</label>
              <input
                type="text"
                value={userScopeDept}
                onChange={(e) => setUserScopeDept(e.target.value)}
                placeholder="VD: Khối Kỹ thuật & Công nghệ"
                className="w-full px-3 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-xs"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DDE2E9]">
            <button
              onClick={() => setScopeModalOpen(false)}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-[#64748B] hover:bg-[#F1F3F6]"
            >
              Hủy
            </button>
            <button
              onClick={handleSaveUserScope}
              disabled={scopeSaving}
              className="px-4 py-1.5 rounded-md text-xs font-semibold bg-[#2457A7] hover:bg-[#1C4585] text-white shadow-xs disabled:opacity-50"
            >
              {scopeSaving ? "Đang lưu..." : "Lưu phạm vi"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: XEM CHI TIẾT NHẬT KÝ PHÂN QUYỀN (DIFF) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={auditModalOpen}
        onClose={() => setAuditModalOpen(false)}
        title="Chi tiết Nhật ký Phân quyền"
        subtitle={`Mã nhật ký: ${selectedAuditLog?.id || ""}`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-3.5 text-xs">
          <div className="p-3 rounded-md bg-[#F8FAFC] border border-[#DDE2E9] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#172033]">Hành động: {selectedAuditLog?.action}</span>
              <span className="text-[#64748B] font-mono">{formatDate(selectedAuditLog?.createdAt)}</span>
            </div>
            <div className="text-[#64748B]">
              Người thực hiện: <strong>{selectedAuditLog?.actorName}</strong> (@{selectedAuditLog?.actorUsername})
            </div>
            <div className="text-[#475569]">{selectedAuditLog?.summary}</div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="font-bold text-[11px] text-[#64748B] uppercase">Dữ liệu trước (Before):</div>
              <pre className="p-2.5 rounded-md bg-[#F1F3F6] border border-[#DDE2E9] text-[11px] font-mono overflow-x-auto max-h-48">
                {selectedAuditLog?.beforeData
                  ? JSON.stringify(selectedAuditLog.beforeData, null, 2)
                  : "(Không có dữ liệu trước)"}
              </pre>
            </div>

            <div className="space-y-1">
              <div className="font-bold text-[11px] text-[#64748B] uppercase">Dữ liệu sau (After):</div>
              <pre className="p-2.5 rounded-md bg-[#EFF6FF] border border-[#BFDBFE] text-[11px] font-mono overflow-x-auto max-h-48 text-[#1E3A8A]">
                {selectedAuditLog?.afterData
                  ? JSON.stringify(selectedAuditLog.afterData, null, 2)
                  : "(Không có dữ liệu sau)"}
              </pre>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setAuditModalOpen(false)}
              className="px-4 py-1.5 rounded-md text-xs font-semibold bg-[#2457A7] text-white hover:bg-[#1C4585]"
            >
              Đóng
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
