import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions";
import LinkWasher from "@/components/LinkWasher";

export default async function ToolPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("approved, is_owner, full_name")
    .eq("id", user.id)
    .single();

  if (!profile?.approved) redirect("/pending");

  const displayName = profile.full_name || user.email;

  return (
    <div className="screen">
      <div style={{ width: "100%", maxWidth: 640, display: "grid", gap: 14 }}>
        <div className="account-bar">
          <span>
            {displayName}
            {profile.is_owner ? " · chủ sở hữu" : ""}
          </span>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {profile.is_owner && (
              <a className="text-link" href="/admin">
                Duyệt tài khoản
              </a>
            )}
            <form action={signOut}>
              <button type="submit" className="text-link">
                Đăng xuất
              </button>
            </form>
          </div>
        </div>
        <LinkWasher />
      </div>
    </div>
  );
}
