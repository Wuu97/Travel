"use client";

import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "./supabase";

export type SignUpResult =
  | { status: "success"; message: string }
  | { status: "existing-confirmed" }
  | { status: "existing-unverified" }
  | { status: "error"; message: string };

export function useSupabaseAuth() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(() => !isSupabaseConfigured());
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) return;

    let active = true;
    void client.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) setError(sessionError.message);
      setAccessToken(data.session?.access_token ?? null);
      setUser(data.session?.user ?? null);
      setReady(true);
    });
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      setAccessToken(session?.access_token ?? null);
      setUser(session?.user ?? null);
      setReady(true);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const signInWithPassword = async (email: string, password: string) => {
    const client = getSupabaseBrowserClient();
    if (!client) return setError("尚未配置 Supabase 云端服务。");
    setError(null);
    const { error: signInError } = await client.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) setError(signInError.message);
    return signInError?.message ?? "登录成功。";
  };

  const signUpWithPassword = async (email: string, password: string) => {
    const client = getSupabaseBrowserClient();
    if (!client) {
      const message = "尚未配置 Supabase 云端服务。";
      setError(message);
      return { status: "error", message } as SignUpResult;
    }
    setError(null);
    const requestStartedAt = Date.now();
    const { data, error: signUpError } = await client.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    });
    if (signUpError) {
      if (signUpError.code === "email_not_confirmed") return { status: "existing-unverified" } as SignUpResult;
      if (signUpError.code === "email_exists" || /already registered/i.test(signUpError.message)) return { status: "existing-confirmed" } as SignUpResult;
      setError(signUpError.message);
      return { status: "error", message: signUpError.message } as SignUpResult;
    }
    if (data.user?.identities?.length === 0) {
      return { status: "existing-confirmed" } as SignUpResult;
    }
    const createdAt = data.user?.created_at ? new Date(data.user.created_at).getTime() : requestStartedAt;
    if (!data.session && !data.user?.email_confirmed_at && createdAt < requestStartedAt - 5000) return { status: "existing-unverified" } as SignUpResult;
    return { status: "success", message: data.session ? "注册并登录成功。" : "注册成功，请查收验证邮件后登录。" } as SignUpResult;
  };

  const resendSignupEmail = async (email: string) => {
    const client = getSupabaseBrowserClient();
    if (!client) return setError("尚未配置 Supabase 云端服务。");
    setError(null);
    const { error: resendError } = await client.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    });
    if (resendError) { setError(resendError.message); return resendError.message; }
    return "验证邮件已重新发送，请查收邮箱。";
  };

  const requestPhoneOtp = async (phone: string) => {
    const client = getSupabaseBrowserClient();
    if (!client) return setError("尚未配置 Supabase 云端服务。");
    setError(null);
    const { error: otpError } = await client.auth.signInWithOtp({ phone });
    if (otpError) {
      setError(otpError.message);
      return otpError.message;
    }
    return "验证码已发送，请查收短信。";
  };

  const verifyPhoneOtp = async (phone: string, token: string) => {
    const client = getSupabaseBrowserClient();
    if (!client) return setError("尚未配置 Supabase 云端服务。");
    setError(null);
    const { error: verifyError } = await client.auth.verifyOtp({ phone, token, type: "sms" });
    if (verifyError) {
      setError(verifyError.message);
      return verifyError.message;
    }
    return "手机号验证成功，已登录。";
  };

  const signOut = async () => {
    const client = getSupabaseBrowserClient();
    if (!client) return;
    const { error: signOutError } = await client.auth.signOut();
    if (signOutError) setError(signOutError.message);
  };

  const clearError = () => setError(null);

  return { accessToken, clearError, configured: isSupabaseConfigured(), error, ready, requestPhoneOtp, resendSignupEmail, signInWithPassword, signOut, signUpWithPassword, user, verifyPhoneOtp };
}
