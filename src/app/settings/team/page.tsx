"use client";

import React, { useState } from "react";
import Link from "next/link";
import { z } from "zod";
import {
  useOmniSync,
  ROLE_PERMISSIONS_MAP,
  type UserRole,
} from "@/context/OmniSyncContext";
import {
  Users,
  ShieldCheck,
  UserPlus,
  Lock,
  CheckCircle2,
  XCircle,
  Trash2,
  ArrowLeft,
  Mail,
  Building2,
} from "lucide-react";

const InviteMemberSchema = z.object({
  name: z.string().min(2, "Member name must be at least 2 characters."),
  email: z.string().email("Please enter a valid work email address."),
  role: z.enum(["OWNER", "WAREHOUSE", "SUPPORT", "VIEWER"]),
  department: z.string().min(2, "Department name is required."),
});

const ROLES_LIST: UserRole[] = ["OWNER", "WAREHOUSE", "SUPPORT", "VIEWER"];

export default function TeamManagementPage() {
  const {
    currentRole,
    setCurrentRole,
    permissions,
    teamMembers,
    inviteTeamMember,
    updateTeamMemberRole,
    removeTeamMember,
  } = useOmniSync();

  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [role, setRole] = useState<UserRole>("WAREHOUSE");
  const [department, setDepartment] = useState<string>(
    "Fulfillment & Logistics"
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const validation = InviteMemberSchema.safeParse({
      name,
      email,
      role,
      department,
    });

    if (!validation.success) {
      setFormError(validation.error.issues[0]?.message || "Invalid form data");
      return;
    }

    inviteTeamMember({
      name: validation.data.name,
      email: validation.data.email,
      role: validation.data.role,
      department: validation.data.department,
    });

    setName("");
    setEmail("");
    setRole("WAREHOUSE");
    setBanner(`Invited ${validation.data.name} as ${validation.data.role}.`);
    setTimeout(() => setBanner(null), 4000);
  };

  return (
    <div className="space-y-6 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-entry">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/settings"
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Settings</span>
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-medium text-slate-500">
              Team &amp; Access Control
            </span>
          </div>
          <h1 className="text-xl font-semibold text-slate-900">
            Team Members &amp; Roles
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage operator permissions, assign workspace roles, and control administrative access.
          </p>
        </div>

        {/* Active Role Selector */}
        <div className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200/80 shadow-xs self-start sm:self-auto">
          <span className="text-xs text-slate-500">Preview role:</span>
          <select
            aria-label="Select preview role"
            value={currentRole}
            onChange={(e) => setCurrentRole(e.target.value as UserRole)}
            className="text-xs font-semibold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
          >
            {ROLES_LIST.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>

      {banner && (
        <div
          role="status"
          className="rounded-lg bg-emerald-50 border border-emerald-200/80 p-3 flex items-center gap-2 text-xs text-emerald-800 animate-entry"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{banner}</span>
        </div>
      )}

      {/* 4 Role Definition Cards */}
      <section aria-label="Role Matrix" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Role Permission Matrix
          </h2>
          <span className="text-xs text-slate-500">
            Active: <strong className="text-slate-900 font-semibold">{currentRole}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ROLES_LIST.map((r) => {
            const spec = ROLE_PERMISSIONS_MAP[r];
            const isCurrent = currentRole === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setCurrentRole(r)}
                className={`text-left p-4 rounded-xl bg-white border transition-all cursor-pointer ${
                  isCurrent
                    ? "border-slate-900 ring-1 ring-slate-900 shadow-xs"
                    : "border-slate-200/80 hover:border-slate-300 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-slate-900">
                    {r}
                  </span>
                  {isCurrent && (
                    <span className="text-[10px] font-medium uppercase px-2 py-0.5 rounded-full bg-slate-900 text-white">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {spec.description}
                </p>

                <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                  {[
                    { label: "Financials", ok: spec.canViewFinancials },
                    { label: "Update Orders", ok: spec.canUpdateOrderStatus },
                    { label: "Stock Reassign", ok: spec.canReassignStock },
                    { label: "Team Admin", ok: spec.canManageTeam },
                  ].map((perm) => (
                    <div
                      key={perm.label}
                      className="flex items-center justify-between"
                    >
                      <span className="text-slate-600">{perm.label}</span>
                      {perm.ok ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-slate-300" />
                      )}
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Invite Member & Team List Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 4 Cols: Invite Member Form */}
        <section className="lg:col-span-4 bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-4 h-fit">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Invite Team Member
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Send access credentials with an assigned role.
            </p>
          </div>

          {!permissions.canManageTeam && (
            <div className="rounded-lg bg-amber-50 border border-amber-200/80 p-3 flex items-start gap-2 text-xs text-amber-800">
              <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">OWNER role required</p>
                <p className="mt-0.5 text-amber-700">
                  Switch to OWNER above to invite new members.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleInviteSubmit} className="space-y-3.5">
            <div>
              <label
                htmlFor="invite-name"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Full Name
              </label>
              <input
                id="invite-name"
                type="text"
                disabled={!permissions.canManageTeam}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Bilal Ahmed"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200/80 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
              />
            </div>

            <div>
              <label
                htmlFor="invite-email"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Work Email
              </label>
              <input
                id="invite-email"
                type="email"
                disabled={!permissions.canManageTeam}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="bilal@omnisync.io"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200/80 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
              />
            </div>

            <div>
              <label
                htmlFor="invite-role"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Assigned Role
              </label>
              <select
                id="invite-role"
                disabled={!permissions.canManageTeam}
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200/80 rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
              >
                {ROLES_LIST.map((r) => (
                  <option key={r} value={r}>
                    {r} — {ROLE_PERMISSIONS_MAP[r].label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="invite-dept"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Department
              </label>
              <input
                id="invite-dept"
                type="text"
                disabled={!permissions.canManageTeam}
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Fulfillment & Operations"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200/80 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
              />
            </div>

            {formError && (
              <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200/60 rounded-md p-2">
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={!permissions.canManageTeam}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-colors disabled:opacity-40 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Send Invitation</span>
            </button>
          </form>
        </section>

        {/* Right 8 Cols: Active Team Members Table */}
        <section className="lg:col-span-8 bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Workspace Team Directory
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {teamMembers.length} active operators and staff
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Member</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm bg-white">
                  {teamMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-semibold text-slate-700 shrink-0">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 text-xs sm:text-sm">
                              {member.name}
                            </p>
                            <p className="text-xs text-slate-500 font-mono">
                              {member.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {member.department}
                      </td>

                      <td className="py-3.5 px-4">
                        {permissions.canManageTeam ? (
                          <select
                            aria-label={`Change role for ${member.name}`}
                            value={member.role}
                            onChange={(e) =>
                              updateTeamMemberRole(
                                member.id,
                                e.target.value as UserRole
                              )
                            }
                            className="px-2 py-1 rounded bg-slate-50 border border-slate-200/80 text-xs font-medium text-slate-800 focus:outline-none cursor-pointer"
                          >
                            {ROLES_LIST.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/80">
                            {member.role}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          <span>Active</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {permissions.canManageTeam && member.role !== "OWNER" && (
                          <button
                            type="button"
                            onClick={() => removeTeamMember(member.id)}
                            aria-label={`Remove ${member.name}`}
                            className="p-1 rounded text-slate-400 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Remove member"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
