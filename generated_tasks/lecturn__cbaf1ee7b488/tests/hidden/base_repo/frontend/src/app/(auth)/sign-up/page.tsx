"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Alert } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { PasswordInput } from "~/components/ui/password-input";
import { signUp } from "~/lib/auth-client";
import { PasswordStrength, scorePassword } from "../_components/password-strength";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const strength = scorePassword(password);
  const passwordTooWeak = password.length > 0 && strength.value < 1;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const { error } = await signUp.email({ name, email, password });
    setPending(false);
    if (error) {
      setError(error.message ?? "Sign-up failed.");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Create your account
        </h1>
        <p className="text-sm text-(--muted-foreground)">
          A starter library is provisioned automatically on first sign-in.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input
            ref={nameRef}
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ada Lovelace"
            required
            autoComplete="name"
            minLength={1}
            maxLength={80}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email address</Label>
          <Input
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

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            minLength={8}
            placeholder="At least 8 characters"
            aria-invalid={passwordTooWeak || undefined}
          />
          <PasswordStrength password={password} />
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <Button
          type="submit"
          variant="accent"
          disabled={pending || passwordTooWeak}
          className="h-11 w-full text-base"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              Create account <ArrowRight className="size-4" />
            </>
          )}
        </Button>

        <p className="text-center text-xs text-(--muted-foreground)">
          By signing up you agree this is your own self-hosted instance and you'll
          back up your own data.
        </p>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-(--border)" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-(--background) px-3 text-xs uppercase tracking-wider text-(--muted-foreground)">
            Already registered
          </span>
        </div>
      </div>

      <p className="text-center text-sm text-(--muted-foreground)">
        <Link
          href="/sign-in"
          className="font-medium text-(--foreground) underline-offset-4 hover:underline"
        >
          Sign in instead
        </Link>
      </p>
    </div>
  );
}
