"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import type { SignUpResult } from "../useSupabaseAuth";
import { useModalBehavior } from "../../shared/hooks/useModalBehavior";
import { CustomSelect } from "../../shared/components/CustomSelect";
import { IconButton } from "../../shared/components/IconButton";
import { Button } from "../../shared/components/Button";

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
  onResendSignupEmail: (email: string) => Promise<string | null | void>;
  onSignIn: (email: string, password: string) => Promise<string | null | void>;
  onSignOut: () => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<SignUpResult>;
  onVerifyPhoneOtp: (phone: string, token: string) => Promise<string | null | void>;
  ready: boolean;
  showTrigger?: boolean;
  user: User | null;
};

type RegistrationField = "email" | "password" | "confirmPassword";

function getRegistrationError(field: RegistrationField, values: Record<RegistrationField, string>) {
  if (field === "email") {
    if (!values.email.trim()) return "请输入邮箱地址";
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email) ? "" : "请输入正确的邮箱地址";
  }
  if (field === "password") {
    if (!values.password) return "请输入密码";
    return values.password.length >= 6 ? "" : "密码至少需要 6 位";
  }
  if (!values.confirmPassword) return "请再次输入密码";
  return values.confirmPassword === values.password ? "" : "两次输入的密码不一致";
}

export function AuthControl({ configured, error, onClearError, onRequestPhoneOtp, onResendSignupEmail, onSignIn, onSignOut, onSignUp, onVerifyPhoneOtp, ready, showTrigger = true, user }: Props) {
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
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<RegistrationField, string>>>({});
  const [touchedFields, setTouchedFields] = useState<Partial<Record<RegistrationField, boolean>>>({});
  const [emailAccountState, setEmailAccountState] = useState<"registered" | "unverified" | null>(null);
  const [emailAccountFeedback, setEmailAccountFeedback] = useState<string | null>(null);

  useEffect(() => {
    const openAuth = () => setOpen(true);
    window.addEventListener("travel:open-auth", openAuth);
    return () => {
      window.removeEventListener("travel:open-auth", openAuth);
    };
  }, []);

  const closeDialog = () => {
    onClearError();
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setNotice(null);
    setPhoneNumber("");
    setPhoneOtpSent(false);
    setVerificationCode("");
    setRegisteredEmail(null);
    setFieldErrors({});
    setTouchedFields({});
    setEmailAccountState(null);
    setEmailAccountFeedback(null);
    setMethod("email");
    setMode("sign-in");
    setOpen(false);
  };
  useModalBehavior(open, closeDialog);

  if (!configured) return showTrigger ? <span className="auth-status">云端未配置</span> : null;
  if (!ready) return showTrigger ? <span className="auth-status">正在恢复登录…</span> : null;
  if (user) return showTrigger ? <div className="auth-control"><span title={user.email || user.phone}>{user.email || user.phone || "已登录"}</span><Button size="sm" type="button" variant="ghost" onClick={() => void onSignOut()}>退出</Button></div> : null;

  const isSignUp = mode === "sign-up";
  const registrationValues = () => ({ email, password, confirmPassword });
  const registrationErrors = isSignUp ? (Object.fromEntries(([
    "email", "password", "confirmPassword",
  ] as RegistrationField[]).map((field) => [field, getRegistrationError(field, registrationValues())])) as Record<RegistrationField, string>) : null;
  const canSubmitRegistration = !registrationErrors || !Object.values(registrationErrors).some(Boolean);
  const validateField = (field: RegistrationField, values = registrationValues()) => {
    const error = getRegistrationError(field, values);
    setFieldErrors((current) => ({ ...current, [field]: error }));
    return !error;
  };
  const updateRegistrationField = (field: RegistrationField, value: string) => {
    const values = { ...registrationValues(), [field]: value };
    if (field === "email") { setEmail(value); setEmailAccountState(null); setEmailAccountFeedback(null); }
    if (field === "password") setPassword(value);
    if (field === "confirmPassword") setConfirmPassword(value);
    if (touchedFields[field]) validateField(field, values);
    if (field === "password" && touchedFields.confirmPassword) validateField("confirmPassword", values);
  };
  const blurRegistrationField = (field: RegistrationField) => {
    setTouchedFields((current) => ({ ...current, [field]: true }));
    validateField(field);
  };
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
    if (isSignUp) {
      const values = registrationValues();
      const nextErrors = Object.fromEntries((["email", "password", "confirmPassword"] as RegistrationField[]).map((field) => [field, getRegistrationError(field, values)]));
      setTouchedFields({ email: true, password: true, confirmPassword: true });
      setFieldErrors(nextErrors);
      if (Object.values(nextErrors).some(Boolean)) return;
    }
    setSubmitting(true);
    const result = isSignUp ? await onSignUp(email, password) : null;
    const message = isSignUp ? result?.status === "success" || result?.status === "error" ? result.message : null : await onSignIn(email, password);
    if (result?.status === "existing-confirmed") {
      setEmailAccountState("registered");
      setEmailAccountFeedback(null);
      setNotice(null);
    } else if (result?.status === "existing-unverified") {
      setEmailAccountState("unverified");
      setEmailAccountFeedback(null);
      setNotice(null);
    } else if (result?.status === "success" && !result.message.includes("并登录成功")) {
      setRegisteredEmail(email);
      setNotice(null);
    } else setNotice(message || null);
    setSubmitting(false);
  };

  const resendVerification = async () => {
    if (!registeredEmail) return;
    setSubmitting(true);
    setNotice(await onResendSignupEmail(registeredEmail) || null);
    setSubmitting(false);
  };
  const goToSignIn = () => {
    onClearError(); setMode("sign-in"); setPassword(""); setConfirmPassword(""); setNotice(null); setRegisteredEmail(null); setEmailAccountState(null); setEmailAccountFeedback(null);
  };
  const resendExistingVerification = async () => {
    setSubmitting(true);
    const message = await onResendSignupEmail(email);
    onClearError();
    setEmailAccountFeedback(message || "验证邮件发送失败，请稍后重试。");
    setSubmitting(false);
  };
  return <>
    {showTrigger && <div className="auth-control"><Button size="sm" type="button" variant="primary" onClick={() => setOpen(true)}>登录 / 注册</Button></div>}
    {open && <div className="auth-backdrop">
      <section className="auth-dialog" data-modal-scroll-lock role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <div className="auth-dialog-title"><div><b id="auth-title">{registeredEmail ? "注册成功" : method === "phone" ? "手机号登录或注册" : isSignUp ? "创建账户" : "登录账户"}</b><small>{registeredEmail ? "请完成邮箱验证后再登录。" : method === "phone" ? "验证短信验证码后，将自动登录或创建账户。" : isSignUp ? "注册后可同步你的行程和对话。" : "登录后可同步你的行程和对话。"}</small></div><IconButton aria-label="关闭" icon="close" variant="ghost" onClick={closeDialog} /></div>
        {registeredEmail ? <div className="auth-success-state"><div className="auth-success-icon" aria-hidden="true">✓</div><h2>注册成功</h2><p>验证邮件已发送至<br /><strong>{registeredEmail}</strong></p><p className="auth-success-help">请前往邮箱完成验证，验证后即可登录。</p>{(error || notice) && <p className={`auth-message${error ? " auth-message-error" : ""}`} role="status">{error || notice}</p>}<Button type="button" onClick={goToSignIn}>去登录</Button><Button disabled={submitting} type="button" variant="link" onClick={() => void resendVerification()}>{submitting ? "正在发送…" : "没收到邮件？重新发送验证邮件"}</Button></div> : <form className="auth-dialog-form" noValidate onSubmit={(event) => { event.preventDefault(); void submit(); }}>
          <div className="auth-methods" role="group" aria-label="认证方式"><button type="button" className={method === "email" ? "selected" : ""} onClick={() => { onClearError(); setMethod("email"); setNotice(null); }}>邮箱密码</button><button type="button" className={method === "phone" ? "selected" : ""} onClick={() => { onClearError(); setMethod("phone"); setNotice(null); }}>手机验证码</button></div>
          {method === "phone" ? <>
            <label>手机号<div className="auth-phone-input"><CustomSelect ariaLabel="国家或地区区号" className="auth-calling-code" options={callingCodes.map(({ code, label }) => ({ value: code, label }))} value={callingCode} onChange={setCallingCode} /><input aria-label="手机号" type="tel" inputMode="numeric" autoComplete="tel-national" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value.replace(/\D/g, ""))} placeholder="输入手机号码" pattern="\d{4,14}" minLength={4} maxLength={14} required /></div></label>
            {phoneOtpSent && <label>验证码<input aria-label="验证码" inputMode="numeric" autoComplete="one-time-code" value={verificationCode} onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, ""))} placeholder="输入短信验证码" minLength={6} maxLength={6} required /></label>}
          </> : <>
            <label>邮箱<input aria-describedby={fieldErrors.email || emailAccountState ? "email-error" : undefined} aria-invalid={Boolean(fieldErrors.email)} aria-label="邮箱" className={fieldErrors.email ? "input-error" : emailAccountState ? "input-account-notice" : undefined} type="email" value={email} onBlur={() => isSignUp && blurRegistrationField("email")} onChange={(event) => updateRegistrationField("email", event.target.value)} placeholder="name@example.com" />{fieldErrors.email ? <small className="field-error" id="email-error">{fieldErrors.email}</small> : emailAccountState === "registered" ? <small className="field-account-notice" id="email-error">该邮箱已注册，你可以 <button type="button" onClick={goToSignIn}>直接登录</button></small> : emailAccountState === "unverified" ? <small className="field-account-notice" id="email-error">该邮箱已注册，但尚未完成验证。<button type="button" onClick={() => void resendExistingVerification()} disabled={submitting}>重新发送验证邮件</button>{emailAccountFeedback && <span className="field-account-feedback">{emailAccountFeedback}</span>}</small> : null}</label>
            <label>密码<input aria-describedby={fieldErrors.password ? "password-error" : undefined} aria-invalid={Boolean(fieldErrors.password)} aria-label="密码" className={fieldErrors.password ? "input-error" : undefined} type="password" value={password} onBlur={() => isSignUp && blurRegistrationField("password")} onChange={(event) => updateRegistrationField("password", event.target.value)} placeholder="至少 6 位" />{fieldErrors.password && <small className="field-error" id="password-error">{fieldErrors.password}</small>}</label>
            {isSignUp && <label>确认密码<input aria-describedby={fieldErrors.confirmPassword ? "confirm-password-error" : undefined} aria-invalid={Boolean(fieldErrors.confirmPassword)} aria-label="确认密码" className={fieldErrors.confirmPassword ? "input-error" : undefined} type="password" value={confirmPassword} onBlur={() => blurRegistrationField("confirmPassword")} onChange={(event) => updateRegistrationField("confirmPassword", event.target.value)} placeholder="再次输入密码" />{fieldErrors.confirmPassword && <small className="field-error" id="confirm-password-error">{fieldErrors.confirmPassword}</small>}</label>}
          </>}
          {(error || notice) && <p className={`auth-message${error ? " auth-message-error" : ""}`}>{error || notice}</p>}
          <Button disabled={method === "email" && isSignUp && !canSubmitRegistration} loading={submitting} type="submit">{method === "phone" ? phoneOtpSent ? "验证并继续" : "发送验证码" : isSignUp ? "注册" : "登录"}</Button>
          {method === "phone" ? phoneOtpSent && <Button disabled={submitting} type="button" variant="link" onClick={() => { onClearError(); setPhoneOtpSent(false); setVerificationCode(""); setNotice(null); }}>更换手机号</Button> : <Button disabled={submitting} type="button" variant="link" onClick={() => { onClearError(); setMode(isSignUp ? "sign-in" : "sign-up"); setNotice(null); }}>{isSignUp ? "已有账户？去登录" : "没有账户？去注册"}</Button>}
        </form>}
      </section>
    </div>}
  </>;
}
