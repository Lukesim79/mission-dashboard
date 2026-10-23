"use client";
import { useActionState } from "react";
import { login } from "@/app/admin/actions";
export default function LoginForm() {
  const [msg, action, pending] = useActionState(login, "");
  return (
    <form action={action} className="card login">
      <h3>관리자 로그인</h3>
      <input name="pw" type="password" placeholder="비밀번호" aria-label="비밀번호" required style={{ width: "100%", marginBottom: 8 }} />
      <button className="pri" disabled={pending}>로그인</button>
      {msg && <p className="warn">{msg}</p>}
    </form>
  );
}
