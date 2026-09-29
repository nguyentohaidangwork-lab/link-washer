import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions";

export default async function PendingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("approved, full_name")
    .eq("id", user.id)
    .single();

  if (profile?.approved) redirect("/tool");

  const displayName = profile?.full_name || user.email;

  return (
    <div className="screen">
      <div className="page-narrow">
        <div className="masthead">
          <div className="eyebrow">✦ K-NETWORK</div>
          <h1>Đang chờ duyệt</h1>
        </div>

        <div className="term-box">
          <div className="pending-icon">⏳</div>
          <p className="hint" style={{ textAlign: "center" }}>
            Tài khoản <strong>{displayName}</strong> ({user.email}) đã đăng ký thành công nhưng chưa được duyệt.
            Báo Hoàng để được cấp quyền truy cập Link Washer.
          </p>
          <div className="account-bar" style={{ justifyContent: "center" }}>
            <form action={signOut}>
              <button type="submit" className="text-link">
                Đăng xuất
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
