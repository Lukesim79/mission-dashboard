"use server";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { redirect } from "next/navigation";

const token = () => createHmac("sha256", process.env.ADMIN_PASSWORD ?? "").update("admin-session").digest("hex");

export async function isAdmin() {
  if (!process.env.ADMIN_PASSWORD) return false;
  const v = (await cookies()).get("admin")?.value ?? "";
  const a = Buffer.from(v), b = Buffer.from(token());
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function login(_: unknown, form: FormData) {
  const pw = String(form.get("pw") ?? "");
  const a = Buffer.from(pw), b = Buffer.from(process.env.ADMIN_PASSWORD ?? "\u0000");
  if (!process.env.ADMIN_PASSWORD || a.length !== b.length || !timingSafeEqual(a, b)) return "비밀번호가 올바르지 않습니다.";
  (await cookies()).set("admin", token(), { httpOnly: true, secure: true, sameSite: "lax", path: "/admin", maxAge: 3600 });
  redirect("/admin");
}

export async function logout() {
  (await cookies()).delete({ name: "admin", path: "/admin" });
  redirect("/admin");
}
