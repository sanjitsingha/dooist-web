"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useLayoutEffect, useState } from "react";

import {
  ErrorMessage,
  FooterPrompt,
  GoogleButton,
  OrDivider,
  SubmitButton,
} from "@/components/auth/AuthButtons";
import { AuthField } from "@/components/auth/AuthField";
import { logIn } from "@/lib/auth";
import { isEmail } from "@/lib/validation";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Next keeps visited pages alive but hidden, so a typed password must not outlast the page.
  useLayoutEffect(
    () => () => {
      setEmail("");
      setPassword("");
      setError(null);
    },
    [],
  );

  const submit = async () => {
    if (!isEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Enter your password.");
      return;
    }
    setError(null);
    const problem = await logIn(email, password);
    if (problem) {
      setError(problem);
      return;
    }
    router.replace("/");
    router.refresh();
  };

  return (
    <>
      <h1 className="text-[28px] leading-[34px] font-bold tracking-tight text-text">
        Log in to your account
      </h1>

      <form action={submit} noValidate className="mt-8 flex flex-col gap-4">
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
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        {error ? (
          <ErrorMessage message={error} />
        ) : (
          <Suspense fallback={null}>
            <CallbackError />
          </Suspense>
        )}
        <SubmitButton label="Log in" />
      </form>

      <OrDivider />
      <GoogleButton onError={setError} />

      <FooterPrompt prompt="New here?" action="Create an account" href="/register" />
    </>
  );
}

/** Shown when coming back from Google or a confirmation link that couldn't finish signing in. */
function CallbackError() {
  const failed = useSearchParams().get("error") === "callback";
  return (
    <ErrorMessage
      message={
        failed ? "That link couldn’t sign you in. If you just confirmed your email, log in here." : null
      }
    />
  );
}
