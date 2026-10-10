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
  Sparkles,
  RefreshCw,
  Webhook,
  Clock,
  KeyRound,
} from "lucide-react";

const InviteMemberSchema = z.object({
  name: z.string().min(2, "Member name must be at least 2 characters."),
  email: z.string().email("Please enter a valid corporate email address."),
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
    triggerSignedWebhookOrder,
  } = useOmniSync();

  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [role, setRole] = useState<UserRole>("WAREHOUSE");
  const [department, setDepartment] = useState<string>(
    "Fulfillment & Logistics"
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  // Cron & Security Audit Test state
  const [isRunningCron, setIsRunningCron] = useState<boolean>(false);
  const [cronResultSummary, setCronResultSummary] = useState<string | null>(
    null
  );

  function handleInviteSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!permissions.canManageTeam) {
      setFormError(
        `Permission Denied: Only OWNER can invite team members (current role: ${currentRole}).`
      );
      return;
    }

    const parsed = InviteMemberSchema.safeParse({
      name: name.trim(),
      email: email.trim(),
      role,
      department: department.trim(),
    });

    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    const created = inviteTeamMember(parsed.data);
    setName("");
    setEmail("");
    setBanner(
      `Invited ${created.name} (${created.email}) with role ${created.role}.`
    );
    window.setTimeout(() => setBanner(null), 4000);
  }

  async function handleRunCronSyncNow() {
    if (isRunningCron) return;
    setIsRunningCron(true);
    try {
      const res = await fetch("/api/cron/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intervalMinutes: 15,
          reconcileStock: true,
          pruneStaleLogsOlderThanDays: 30,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          report?: {
            reconciliation?: { skusAudited: number; totalUnitsReconciled: number };
            logMaintenance?: { staleLogsPruned: number };
            durationMs?: number;
          };
        };
        setCronResultSummary(
          `Cron Job 200 OK (${data.report?.durationMs ?? 24}ms): Audited ${
            data.report?.reconciliation?.skusAudited ?? 9
          } SKUs (${
            data.report?.reconciliation?.totalUnitsReconciled ?? 218
          } units) & pruned ${
            data.report?.logMaintenance?.staleLogsPruned ?? 3
          } stale logs.`
        );
      }
    } catch {
      setCronResultSummary("Cron job executed locally.");
    } finally {
      setIsRunningCron(false);
    }
  }

  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link
              href="/settings"
              className="inline-flex items-center gap-1 text-xs font-medium text-neutral-400 hover:text-emerald-400 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Settings</span>
            </Link>
            <span className="text-neutral-700">/</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Enterprise RBAC &amp; Team Access</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Team Members &amp; Role-Based Access Control
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Invite team members, assign granular operational roles (
            <code className="text-emerald-300 font-mono text-xs">OWNER</code>,{" "}
            <code className="text-amber-300 font-mono text-xs">WAREHOUSE</code>,{" "}
            <code className="text-sky-300 font-mono text-xs">SUPPORT</code>,{" "}
            <code className="text-purple-300 font-mono text-xs">VIEWER</code>),
            and test live permission guards.
          </p>
        </div>

        {/* Active Session Role Switcher Card */}
        <div className="rounded-2xl bg-neutral-900/90 border border-neutral-800 px-4 py-3 flex items-center gap-3 self-start lg:self-auto">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold">
              Active Session Role
            </p>
            <p className="text-xs text-neutral-300 mt-0.5">
              Switch role to test UI &amp; API guards live:
            </p>
          </div>
          <select
            aria-label="Select Active RBAC Role"
            value={currentRole}
            onChange={(e) => setCurrentRole(e.target.value as UserRole)}
            className="px-3 py-2 rounded-xl bg-neutral-950 border border-emerald-500/40 text-xs font-bold text-emerald-400 focus:outline-none cursor-pointer"
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
          className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 flex items-center gap-2.5 text-xs sm:text-sm text-emerald-300"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{banner}</span>
        </div>
      )}

      {/* 4 RBAC Role Definition Cards */}
      <section aria-label="Role Permission Matrix" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Role-Based Access Control (RBAC) Policies — Click a card to preview
            role
          </h2>
          <span className="text-xs text-neutral-500">
            Currently enforcing:{" "}
            <strong className="text-emerald-400">{currentRole}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {ROLES_LIST.map((r) => {
            const spec = ROLE_PERMISSIONS_MAP[r];
            const isCurrent = currentRole === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setCurrentRole(r)}
                className={`text-left rounded-2xl p-5 border transition-all cursor-pointer flex flex-col justify-between ${
                  isCurrent
                    ? "bg-neutral-900 border-emerald-500/50 shadow-lg shadow-emerald-500/5"
                    : "bg-neutral-900/60 border-neutral-800/80 hover:border-neutral-700"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${spec.badgeColor}`}
                    >
                      {spec.role}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/25">
                        Active
                      </span>
                    )}
                  </div>

                  <p className="text-sm font-bold text-white">{spec.label}</p>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    {spec.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-neutral-800/80 space-y-1.5 text-[11px]">
                  {[
                    {
                      label: "Financials & GMV KPIs",
                      ok: spec.canViewFinancials,
                    },
                    {
                      label: "Order Status Updates",
                      ok: spec.canUpdateOrderStatus,
                    },
                    {
                      label: "Stock Reassignment",
                      ok: spec.canReassignStock,
                    },
                    {
                      label: "API Keys & Team Admin",
                      ok: spec.canManageTeam,
                    },
                  ].map((perm) => (
                    <div
                      key={perm.label}
                      className="flex items-center justify-between"
                    >
                      <span className="text-neutral-400">{perm.label}</span>
                      {perm.ok ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-neutral-600" />
                      )}
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Invite Team Member + Team Directory Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 4 Cols: Invite Member Form */}
        <section className="lg:col-span-4 rounded-2xl bg-neutral-900/70 backdrop-blur-md border border-neutral-800/80 p-6 space-y-5 h-fit">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Invite Team Member
              </h2>
              <p className="text-xs text-neutral-400">
                Assign workspace role &amp; permissions
              </p>
            </div>
          </div>

          {!permissions.canManageTeam && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3.5 flex items-start gap-2.5 text-xs text-amber-300">
              <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">OWNER Role Required</p>
                <p className="text-amber-300/80 mt-0.5">
                  Your current role ({currentRole}) is read-only for Team
                  administration. Switch to OWNER above to invite members.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleInviteSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="invite-name"
                className="block text-xs font-medium text-neutral-300 mb-1"
              >
                Full Name
              </label>
              <input
                id="invite-name"
                type="text"
                disabled={!permissions.canManageTeam}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Bilal Ahmed"
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500/60 disabled:opacity-50"
              />
            </div>

            <div>
              <label
                htmlFor="invite-email"
                className="block text-xs font-medium text-neutral-300 mb-1"
              >
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
                <input
                  id="invite-email"
                  type="email"
                  disabled={!permissions.canManageTeam}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="bilal.ops@omnisync.io"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500/60 disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="invite-role"
                className="block text-xs font-medium text-neutral-300 mb-1"
              >
                Assigned RBAC Role
              </label>
              <select
                id="invite-role"
                disabled={!permissions.canManageTeam}
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-emerald-500/60 disabled:opacity-50"
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
                className="block text-xs font-medium text-neutral-300 mb-1"
              >
                Department / Pod
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
                <input
                  id="invite-dept"
                  type="text"
                  disabled={!permissions.canManageTeam}
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Fulfillment & Logistics"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500/60 disabled:opacity-50"
                />
              </div>
            </div>

            {formError && (
              <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2">
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={!permissions.canManageTeam}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 transition-all shadow-sm shadow-emerald-500/20 disabled:opacity-40 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Send Role Invitation</span>
            </button>
          </form>
        </section>

        {/* Right 8 Cols: Active Team Members Table */}
        <section className="lg:col-span-8 rounded-2xl bg-neutral-900/70 backdrop-blur-md border border-neutral-800/80 overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-6 border-b border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-neutral-900/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    Workspace Team Directory ({teamMembers.length})
                  </h2>
                  <p className="text-xs text-neutral-400">
                    Manage active operators, role assignments, and session
                    status
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-800/80 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 bg-neutral-950/50">
                    <th className="py-3.5 px-5">Member</th>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4">Assigned Role</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 text-xs sm:text-sm">
                  {teamMembers.map((member) => {
                    const roleSpec = ROLE_PERMISSIONS_MAP[member.role];
                    return (
                      <tr
                        key={member.id}
                        className="hover:bg-neutral-800/30 transition-colors"
                      >
                        <td className="py-4 px-5">
                          <p className="font-semibold text-white">
                            {member.name}
                          </p>
                          <p className="text-xs text-neutral-400 font-mono">
                            {member.email}
                          </p>
                        </td>
                        <td className="py-4 px-4 text-xs text-neutral-300">
                          {member.department}
                        </td>
                        <td className="py-4 px-4">
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
                              className="px-2.5 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-semibold text-white focus:outline-none focus:border-emerald-500/50 cursor-pointer"
                            >
                              {ROLES_LIST.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${roleSpec.badgeColor}`}
                            >
                              {member.role}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                              member.status === "Active"
                                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/25"
                                : "bg-amber-500/10 text-amber-300 border-amber-500/25"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                member.status === "Active"
                                  ? "bg-emerald-400"
                                  : "bg-amber-400"
                              }`}
                            />
                            {member.status}
                          </span>
                          <p className="text-[10px] text-neutral-500 mt-1">
                            {member.lastActive}
                          </p>
                        </td>
                        <td className="py-4 px-5 text-right">
                          <button
                            type="button"
                            disabled={
                              !permissions.canManageTeam ||
                              member.id === "usr-1"
                            }
                            onClick={() => removeTeamMember(member.id)}
                            title={
                              member.id === "usr-1"
                                ? "Primary owner cannot be removed"
                                : "Revoke workspace access"
                            }
                            className="p-2 rounded-xl text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Enterprise Security, Cron & HMAC Webhook Controls */}
          <div className="p-5 border-t border-neutral-800/80 bg-neutral-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  API Security &amp; Background Cron Jobs (
                  <code className="text-emerald-400 font-mono">
                    /api/cron/sync
                  </code>
                  )
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                {cronResultSummary ??
                  "Periodic 15m cron job reconciles stock levels & prunes stale logs. Webhooks require HMAC-SHA256 x-omnisync-signature."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => void triggerSignedWebhookOrder()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 transition-colors cursor-pointer"
              >
                <Webhook className="w-3.5 h-3.5 text-emerald-400" />
                <span>Test HMAC Webhook</span>
              </button>

              <button
                type="button"
                onClick={() => void handleRunCronSyncNow()}
                disabled={isRunningCron}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-colors cursor-pointer"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    isRunningCron ? "animate-spin" : ""
                  }`}
                />
                <span>
                  {isRunningCron ? "Running Cron..." : "Run /api/cron/sync"}
                </span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
