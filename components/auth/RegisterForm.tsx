"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useState } from "react";

import {
  ErrorMessage,
  FooterPrompt,
  GoogleButton,
  OrDivider,
  SubmitButton,
} from "@/components/auth/AuthButtons";
import { AuthField } from "@/components/auth/AuthField";
import { signUp } from "@/lib/auth";
import { isEmail, MIN_PASSWORD_LENGTH, passwordProblem } from "@/lib/validation";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  // Next keeps visited pages alive but hidden, so a typed password must not outlast the page.
  useLayoutEffect(
    () => () => {
      setName("");
      setEmail("");
      setPassword("");
      setError(null);
      setConfirming(false);
    },
    [],
  );

  const submit = async () => {
    if (!name.trim()) {
      setError("Enter your name.");
      return;
    }
    if (!isEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Choose a password of at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    setError(null);
    const result = await signUp(name, email, password);
    if (result.error) setError(result.error);
    else if (result.confirm) setConfirming(true);
    else {
      router.replace("/");
      router.refresh();
    }
  };

  if (confirming) {
    return (
      <>
        <h1 className="text-[28px] leading-[34px] font-bold tracking-tight text-text">
          Check your email
        </h1>
        <p className="mt-2 text-[15px] leading-[22px] text-muted">
          We sent a link to {email.trim()}. Open it to confirm, then log in.
        </p>
        <Link
          href="/login"
          className="mt-8 flex h-12 items-center justify-center rounded-xl bg-primary text-base font-semibold text-ink transition-colors hover:bg-primary-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Go to log in
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="text-[28px] leading-[34px] font-bold tracking-tight text-text">
        Create your account
      </h1>

      <form action={submit} noValidate className="mt-8 flex flex-col gap-4">
        <AuthField
          label="Name"
          name="name"
          autoComplete="name"
          autoCapitalize="words"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <AuthField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <AuthField
          label="Password"
          secure
          name="password"
          autoComplete="new-password"
          error={passwordProblem(password)}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <ErrorMessage message={error} />
        <SubmitButton label="Create account" />
      </form>

      <OrDivider />
      <GoogleButton onError={setError} />

      <FooterPrompt prompt="Already have an account?" action="Log in" href="/login" />
    </>
  );
}
