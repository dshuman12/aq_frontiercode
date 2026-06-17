"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardBody, CardMeta, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { authClient, useSession } from "~/lib/auth-client";

export default function AccountSettingsPage() {
  const { data, refetch } = useSession();
  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<string | null>(null);

  useEffect(() => {
    if (data?.user?.name) setName(data.user.name);
  }, [data?.user?.name]);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setSavingName(true);
    setNameMsg(null);
    const { error } = await authClient.updateUser({ name });
    setSavingName(false);
    if (error) {
      setNameMsg(error.message ?? "Update failed");
      return;
    }
    setNameMsg("Saved.");
    refetch();
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setSavingPw(true);
    setPwMsg(null);
    const { error } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    });
    setSavingPw(false);
    if (error) {
      setPwMsg(error.message ?? "Password change failed");
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setPwMsg("Password updated. Other sessions were revoked.");
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="font-display text-2xl font-semibold">Account</h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          Update your name and password.
        </p>
      </header>

      <Card>
        <CardBody>
          <form onSubmit={handleSaveName} className="space-y-4">
            <div className="space-y-1">
              <CardTitle className="text-base">Profile</CardTitle>
              <CardMeta>Email is locked once you're signed in.</CardMeta>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={data?.user?.email ?? ""} disabled />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
              />
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={savingName} variant="accent">
                {savingName && <Loader2 className="size-4 animate-spin" />}
                Save
              </Button>
              {nameMsg && (
                <span className="text-sm text-[var(--muted-foreground)]">{nameMsg}</span>
              )}
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-1">
              <CardTitle className="text-base">Change password</CardTitle>
              <CardMeta>Other devices are signed out automatically.</CardMeta>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="currentPw">Current password</Label>
              <Input
                id="currentPw"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newPw">New password</Label>
              <Input
                id="newPw"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={savingPw} variant="default">
                {savingPw && <Loader2 className="size-4 animate-spin" />}
                Update password
              </Button>
              {pwMsg && (
                <span className="text-sm text-[var(--muted-foreground)]">{pwMsg}</span>
              )}
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
