"use client";

import { ArrowLeft, ArrowRight, Loader2, Mail, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import { useEffect, useRef, useState } from "react";
import { Alert } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { PasswordInput } from "~/components/ui/password-input";
import { signIn } from "~/lib/auth-client";
import { ModeToggle } from "../_components/mode-toggle";

type Mode = "password" | "magic";

export default function SignInPage() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") ?? "/";

  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  async function onPasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const { error } = await signIn.email({ email, password });
    setPending(false);
    if (error) {
      setError(error.message ?? "Sign-in failed. Check your email and password.");
      return;
    }
    router.replace(next as Route);
    router.refresh();
  }

  async function onMagicSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const { error } = await signIn.magicLink({ email, callbackURL: next });
    setPending(false);
    if (error) {
      setError(error.message ?? "Could not send magic link.");
      return;
    }
    setMagicSent(true);
  }

  if (magicSent) {
    return (
      <div className="space-y-6">
        <div className="flex size-12 items-center justify-center rounded-full bg-amber-accent/15 text-amber-accent">
          <Mail className="size-5" />
        </div>
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Check your email
          </h1>
          <p className="text-sm leading-relaxed text-(--muted-foreground)">
            We sent a one-time sign-in link to{" "}
            <span className="font-medium text-(--foreground)">{email}</span>. The
            link expires in 10 minutes.
          </p>
        </div>
        <Alert variant="info" title="Development tip">
          The magic link is also printed to the API process stdout, so you don't need
          a real mail server while building locally.
        </Alert>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setMagicSent(false);
              setError(null);
            }}
          >
            <ArrowLeft className="size-4" /> Back to sign-in
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onMagicSubmit}
            disabled={pending}
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            Resend link
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Welcome back
        </h1>
        <p className="text-sm text-(--muted-foreground)">
          Sign in to pick up where you left off.
        </p>
      </div>

      <ModeToggle<Mode>
        label="Sign-in method"
        value={mode}
        onChange={(v) => {
          setMode(v);
          setError(null);
        }}
        options={[
          { value: "password", label: "Password" },
          { value: "magic", label: "Magic link" },
        ]}
      />

      <form
        onSubmit={mode === "password" ? onPasswordSubmit : onMagicSubmit}
        className="space-y-4"
        noValidate
      >
        <div className="space-y-1.5">
          <Label htmlFor="email">Email address</Label>
          <Input
            ref={emailRef}
            id="email"
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
        </div>

        {mode === "password" && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <button
                type="button"
                onClick={() => {
                  setMode("magic");
                  setError(null);
                }}
                className="text-xs text-(--muted-foreground) hover:text-(--foreground) transition-colors"
              >
                Forgot password?
              </button>
            </div>
            <PasswordInput
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              minLength={8}
              placeholder="At least 8 characters"
            />
          </div>
        )}

        {mode === "magic" && (
          <p className="rounded-md bg-(--muted)/50 px-3 py-2 text-xs text-(--muted-foreground)">
            <Sparkles className="mr-1.5 inline size-3.5 -translate-y-0.5 text-amber-accent" />
            We'll email you a one-time link instead of a password.
          </p>
        )}

        {error && <Alert variant="error">{error}</Alert>}

        <Button
          type="submit"
          variant="accent"
          disabled={pending}
          className="h-11 w-full text-base"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              {mode === "password" ? "Sign in" : "Send magic link"}
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-(--border)" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-(--background) px-3 text-xs uppercase tracking-wider text-(--muted-foreground)">
            New to Lecturn
          </span>
        </div>
      </div>

      <p className="text-center text-sm text-(--muted-foreground)">
        <Link
          href="/sign-up"
          className="font-medium text-(--foreground) underline-offset-4 hover:underline"
        >
          Create your account
        </Link>{" "}
        — takes about ten seconds.
      </p>
    </div>
  );
}
