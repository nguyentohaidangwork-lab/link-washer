import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions";
import { approveUser } from "./actions";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_owner, full_name")
    .eq("id", user.id)
    .single();

  if (!profile?.is_owner) redirect("/tool");

  const { data: pending } = await supabase
    .from("profiles")
    .select("id, email, full_name, created_at")
    .eq("approved", false)
    .order("created_at", { ascending: true });

  return (
    <div className="screen">
      <div style={{ width: "100%", maxWidth: 640, display: "grid", gap: 22 }}>
        <div className="masthead">
          <div className="eyebrow">✦ K-NETWORK</div>
          <h1>Duyệt tài khoản</h1>
          <p className="subtitle">Chỉ tài khoản được duyệt ở đây mới dùng được Link Washer.</p>
        </div>

        <div className="account-bar">
          <span>{profile.full_name || user.email} · chủ sở hữu</span>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <a className="text-link" href="/tool">
              Về công cụ
            </a>
            <form action={signOut}>
              <button type="submit" className="text-link">
                Đăng xuất
              </button>
            </form>
          </div>
        </div>

        <div className="term-box">
          <div className="step-head">Đang chờ duyệt ({pending?.length ?? 0})</div>
          {pending && pending.length > 0 ? (
            pending.map((p) => (
              <div className="admin-row" key={p.id}>
                <div>
                  <div className="admin-email">{p.full_name || p.email}</div>
                  <div className="admin-date">
                    {p.email} · Đăng ký {new Date(p.created_at).toLocaleString("vi-VN")}
                  </div>
                </div>
                <form action={approveUser}>
                  <input type="hidden" name="userId" value={p.id} />
                  <button type="submit" className="primary-btn">
                    Duyệt
                  </button>
                </form>
              </div>
            ))
          ) : (
            <p className="hint">Không có yêu cầu nào đang chờ.</p>
          )}
        </div>
      </div>
    </div>
  );
}
