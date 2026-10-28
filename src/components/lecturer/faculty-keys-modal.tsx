"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { useToast } from "@/components/ui/toast";
import { FacultyVerificationKey } from "@/types/database";
import {
  Key,
  Plus,
  Copy,
  Check,
  ShieldCheck,
  Trash2,
  Users,
  Building2,
  RefreshCw,
} from "lucide-react";

interface FacultyKeysModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
}

export function FacultyKeysModal({
  isOpen,
  onClose,
  currentUserId,
}: FacultyKeysModalProps) {
  const toast = useToast();
  const [keys, setKeys] = useState<FacultyVerificationKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form fields
  const [customCode, setCustomCode] = useState("");
  const [department, setDepartment] = useState("Computer Science & Engineering");
  const [note, setNote] = useState("");
  const [maxUses, setMaxUses] = useState("1");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Revoke state
  const [keyToRevoke, setKeyToRevoke] = useState<FacultyVerificationKey | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  // Copy state
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/faculty-keys");
      const data = await res.json();
      if (data.success && Array.isArray(data.keys)) {
        setKeys(data.keys);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchKeys();
    }
  }, [isOpen]);

  const handleGenerateRandomCode = () => {
    const r1 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const r2 = Math.random().toString(36).substring(2, 6).toUpperCase();
    setCustomCode(`FAC-${r1}-${r2}`);
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/faculty-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyCode: customCode.trim() ? customCode.trim().toUpperCase() : undefined,
          department: department.trim(),
          note: note.trim() || undefined,
          maxUses: maxUses === "unlimited" ? null : parseInt(maxUses, 10),
          createdBy: currentUserId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to create verification key.");
      }

      setKeys([data.key, ...keys]);
      setCustomCode("");
      setNote("");
      setShowAddForm(false);
      toast.success("Verification Key Generated! 🔑", `Key ${data.key.key_code} is ready.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error creating key";
      setError(msg);
      toast.error("Failed to Create Key", msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeKey = async () => {
    if (!keyToRevoke) return;
    setIsRevoking(true);

    try {
      const res = await fetch(`/api/auth/faculty-keys?id=${keyToRevoke.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to revoke key.");
      }

      setKeys((prev) =>
        prev.map((k) => (k.id === keyToRevoke.id ? { ...k, is_active: false } : k)),
      );
      toast.success("Key Revoked", `Verification key ${keyToRevoke.key_code} was deactivated.`);
      setKeyToRevoke(null);
    } catch (err: unknown) {
      toast.error("Revoke Failed", err instanceof Error ? err.message : "Error revoking key");
    } finally {
      setIsRevoking(false);
    }
  };

  const handleCopy = (keyText: string, id: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(keyText);
      setCopiedKeyId(id);
      toast.success("Copied to Clipboard", keyText);
      setTimeout(() => setCopiedKeyId(null), 2000);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <div className="space-y-6 font-sans">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-proxi-green uppercase tracking-wider font-mono">
                  Academic Staff Governance
                </span>
                <Badge variant="neutral">{keys.length} Keys</Badge>
              </div>
              <h2 className="text-xl font-bold text-proxi-ink tracking-tight flex items-center gap-2">
                <Key className="w-5 h-5 text-emerald-600" />
                Faculty Verification Keys
              </h2>
              <p className="text-xs text-slate-500">
                Generate and distribute authorization keys for new lecturers to register.
              </p>
            </div>

            <Button
              size="sm"
              onClick={() => {
                setShowAddForm(!showAddForm);
                if (!showAddForm && !customCode) handleGenerateRandomCode();
              }}
              className="shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              {showAddForm ? "Cancel" : "Generate Key"}
            </Button>
          </div>

          {/* New Key Form */}
          {showAddForm && (
            <form
              onSubmit={handleCreateKey}
              className="p-4 bg-emerald-50/40 rounded-2xl border border-emerald-200/80 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  New Faculty Authorization Key
                </h4>
                <button
                  type="button"
                  onClick={handleGenerateRandomCode}
                  className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  Generate Random
                </button>
              </div>

              {error && <Alert variant="error">{error}</Alert>}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Verification Key Code"
                  placeholder="e.g. FAC-89XA-39KP"
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                  required
                />
                <Input
                  label="Department"
                  placeholder="Computer Science & Engineering"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Recipient Note (Optional)"
                  placeholder="e.g. Issued for Prof. Adeleke"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 font-sans">
                    Usage Allowance
                  </label>
                  <select
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    className="w-full h-[42px] px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="1">Single Use (1 Lecturer Registration)</option>
                    <option value="5">5 Registrations</option>
                    <option value="10">10 Registrations</option>
                    <option value="unlimited">Unlimited Uses (Department Master)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1 border-t border-emerald-200/50">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={isSubmitting}>
                  Activate Key
                </Button>
              </div>
            </form>
          )}

          {/* Keys List */}
          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {loading ? (
              <div className="py-8 text-center text-xs text-slate-500">
                Loading verification keys...
              </div>
            ) : keys.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                No custom keys created yet. The institutional master key is active.
              </div>
            ) : (
              keys.map((k) => (
                <div
                  key={k.id}
                  className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                    k.is_active
                      ? "bg-white border-slate-200/90 hover:border-emerald-300 shadow-xs"
                      : "bg-slate-50/60 border-slate-200 opacity-60"
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-xs bg-slate-100 text-slate-900 px-2.5 py-1 rounded-md border border-slate-200 tracking-wider">
                        {k.key_code}
                      </span>
                      {k.is_active ? (
                        <Badge variant="success" size="sm">
                          {k.max_uses === null
                            ? "Unlimited Master Key"
                            : `${k.used_count}/${k.max_uses} Used`}
                        </Badge>
                      ) : (
                        <Badge variant="neutral" size="sm">
                          Revoked
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span>{k.department}</span>
                      {k.note && (
                        <>
                          <span>•</span>
                          <span className="text-slate-700 font-medium italic">
                            &quot;{k.note}&quot;
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(k.key_code, k.id)}
                      className="text-xs h-8 px-2.5 gap-1.5"
                    >
                      {copiedKeyId === k.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy Key
                        </>
                      )}
                    </Button>

                    {k.is_active && (
                      <button
                        type="button"
                        onClick={() => setKeyToRevoke(k)}
                        title="Revoke Key"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* Revoke Confirmation Modal */}
      <ConfirmModal
        isOpen={keyToRevoke !== null}
        onClose={() => setKeyToRevoke(null)}
        onConfirm={handleRevokeKey}
        title={`Revoke Key "${keyToRevoke?.key_code}"?`}
        description={`This verification key will be deactivated immediately. Anyone attempting to register with this key will be rejected.`}
        confirmText="Revoke Key"
        cancelText="Keep Active"
        variant="danger"
        isLoading={isRevoking}
      />
    </>
  );
}

