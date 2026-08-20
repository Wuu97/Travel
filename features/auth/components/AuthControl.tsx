"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

const callingCodes = [
  { code: "+86", label: "中国大陆 +86" },
  { code: "+852", label: "中国香港 +852" },
  { code: "+853", label: "中国澳门 +853" },
  { code: "+886", label: "中国台湾 +886" },
  { code: "+1", label: "美国 / 加拿大 +1" },
  { code: "+44", label: "英国 +44" },
  { code: "+81", label: "日本 +81" },
  { code: "+82", label: "韩国 +82" },
  { code: "+65", label: "新加坡 +65" },
];

type Props = {
  configured: boolean;
  error: string | null;
  onClearError: () => void;
  onRequestPhoneOtp: (phone: string) => Promise<string | null | void>;
  onSignIn: (email: string, password: string) => Promise<string | null | void>;
  onSignOut: () => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<string | null | void>;
  onVerifyPhoneOtp: (phone: string, token: string) => Promise<string | null | void>;
  ready: boolean;
  user: User | null;
};

export function AuthControl({ configured, error, onClearError, onRequestPhoneOtp, onSignIn, onSignOut, onSignUp, onVerifyPhoneOtp, ready, user }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [notice, setNotice] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [callingCode, setCallingCode] = useState("+86");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");

  useEffect(() => {
    const openAuth = () => setOpen(true);
    window.addEventListener("travel:open-auth", openAuth);
    return () => {
      window.removeEventListener("travel:open-auth", openAuth);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!configured) return <span className="auth-status">云端未配置</span>;
  if (!ready) return <span className="auth-status">正在恢复登录…</span>;
  if (user) return <div className="auth-control"><span title={user.email || user.phone}>{user.email || user.phone || "已登录"}</span><button type="button" onClick={() => void onSignOut()}>退出</button></div>;

  const isSignUp = mode === "sign-up";
  const isPasswordMismatch = notice === "两次输入的密码不一致。";
  const submit = async () => {
    if (method === "phone") {
      const phone = `${callingCode}${phoneNumber}`;
      setSubmitting(true);
      const message = phoneOtpSent
        ? await onVerifyPhoneOtp(phone, verificationCode)
        : await onRequestPhoneOtp(phone);
      setNotice(message || null);
      if (!phoneOtpSent && message === "验证码已发送，请查收短信。") setPhoneOtpSent(true);
      setSubmitting(false);
      return;
    }
    if (isSignUp && password !== confirmPassword) {
      setNotice("两次输入的密码不一致。");
      return;
    }
    setSubmitting(true);
    const message = await (isSignUp ? onSignUp(email, password) : onSignIn(email, password));
    setNotice(message || null);
    setSubmitting(false);
  };

  return <>
    <div className="auth-control"><button type="button" onClick={() => setOpen(true)}>登录 / 注册</button></div>
    {open && <div className="auth-backdrop">
      <section className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <div className="auth-dialog-title"><div><b id="auth-title">{method === "phone" ? "手机号登录或注册" : isSignUp ? "创建账户" : "登录账户"}</b><small>{method === "phone" ? "验证短信验证码后，将自动登录或创建账户。" : isSignUp ? "注册后可同步你的行程和对话。" : "登录后可同步你的行程和对话。"}</small></div><button type="button" className="auth-close" aria-label="关闭" onClick={() => { onClearError(); setNotice(null); setOpen(false); }}>×</button></div>
        <form className="auth-dialog-form" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
          <div className="auth-methods" role="group" aria-label="认证方式"><button type="button" className={method === "email" ? "selected" : ""} onClick={() => { onClearError(); setMethod("email"); setNotice(null); }}>邮箱密码</button><button type="button" className={method === "phone" ? "selected" : ""} onClick={() => { onClearError(); setMethod("phone"); setNotice(null); }}>手机验证码</button></div>
          {method === "phone" ? <>
            <label>手机号<div className="auth-phone-input"><select aria-label="国家或地区区号" value={callingCode} onChange={(event) => setCallingCode(event.target.value)}>{callingCodes.map(({ code, label }) => <option key={code} value={code}>{label}</option>)}</select><input aria-label="手机号" type="tel" inputMode="numeric" autoComplete="tel-national" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value.replace(/\D/g, ""))} placeholder="输入手机号码" pattern="\d{4,14}" minLength={4} maxLength={14} required /></div></label>
            {phoneOtpSent && <label>验证码<input aria-label="验证码" inputMode="numeric" autoComplete="one-time-code" value={verificationCode} onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, ""))} placeholder="输入短信验证码" minLength={6} maxLength={6} required /></label>}
          </> : <>
            <label>邮箱<input aria-label="邮箱" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" required /></label>
            <label>密码<input aria-label="密码" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="至少 6 位" minLength={6} required /></label>
            {isSignUp && <label>确认密码<input aria-label="确认密码" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="再次输入密码" minLength={6} required /></label>}
          </>}
          {(error || notice) && <p className={`auth-message${error || isPasswordMismatch ? " auth-message-error" : ""}`}>{error || notice}</p>}
          <button className="auth-submit" type="submit" disabled={submitting}>{submitting ? "处理中…" : method === "phone" ? phoneOtpSent ? "验证并继续" : "发送验证码" : isSignUp ? "注册" : "登录"}</button>
          {method === "phone" ? phoneOtpSent && <button type="button" className="auth-switch" onClick={() => { onClearError(); setPhoneOtpSent(false); setVerificationCode(""); setNotice(null); }} disabled={submitting}>更换手机号</button> : <button type="button" className="auth-switch" onClick={() => { onClearError(); setMode(isSignUp ? "sign-in" : "sign-up"); setNotice(null); }} disabled={submitting}>{isSignUp ? "已有账户？去登录" : "没有账户？去注册"}</button>}
        </form>
      </section>
    </div>}
  </>;
}