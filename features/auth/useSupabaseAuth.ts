"use client";

import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "./supabase";

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
    if (!client) return setError("尚未配置 Supabase 云端服务。");
    setError(null);
    const { data, error: signUpError } = await client.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (signUpError) {
      setError(signUpError.message);
      return signUpError.message;
    }
    if (data.user?.identities?.length === 0) {
      return "该邮箱已注册，请直接登录。";
    }
    return data.session ? "注册并登录成功。" : "注册成功，请查收验证邮件后登录。";
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

  return { accessToken, clearError, configured: isSupabaseConfigured(), error, ready, requestPhoneOtp, signInWithPassword, signOut, signUpWithPassword, user, verifyPhoneOtp };
}