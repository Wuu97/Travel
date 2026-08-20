"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../../../features/auth/supabase";

export default function ConfirmEmailPage() {
  const [message, setMessage] = useState("正在确认邮箱…");

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    const code = new URLSearchParams(window.location.search).get("code");
    void (async () => {
      if (!client) { setMessage("Supabase 尚未配置，无法完成邮箱确认。"); return; }
      // PKCE confirmation links contain a code; hash-token links are restored
      // automatically by the Supabase browser client during initialization.
      if (code) {
        const { error } = await client.auth.exchangeCodeForSession(code);
        if (error) { setMessage(`邮箱确认失败：${error.message}`); return; }
      }
      const { data } = await client.auth.getSession();
      if (!data.session) { setMessage("确认链接无效、已过期，或浏览器拦截了会话信息。请重新注册或发送新的确认邮件。"); return; }
      setMessage("邮箱确认成功，正在返回途遇…");
      window.setTimeout(() => window.location.replace("/"), 900);
    })();
  }, []);

  return <main className="auth-confirm-page"><section><p className="eyebrow">TUYU ACCOUNT</p><h1>邮箱确认</h1><p role="status">{message}</p></section></main>;
}
