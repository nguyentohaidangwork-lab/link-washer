"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  function switchTab(next) {
    setTab(next);
    setError(null);
    setConfirmSent(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    if (tab === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName.trim() },
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      });
      setLoading(false);
      if (error) {
        setError(error.message);
        return;
      }
      if (!data.session) {
        // Project yêu cầu xác nhận email trước khi đăng nhập lần đầu.
        setConfirmSent(true);
        return;
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        setError("Sai email hoặc mật khẩu.");
        return;
      }
    }

    router.push("/tool");
    router.refresh();
  }

  const isSignup = tab === "signup";

  return (
    <div className="screen">
      <div className="page-narrow">
        <div className="masthead">
          <div className="eyebrow">✦ K-NETWORK</div>
          <h1>{isSignup ? "Tạo tài khoản" : "Đăng nhập"}</h1>
          <p className="subtitle">
            {isSignup
              ? "Sau khi đăng ký, tài khoản sẽ chờ được duyệt."
              : "Link Washer — công cụ rửa link nội bộ."}
          </p>
        </div>

        {!confirmSent && (
          <div className="tab-row">
            <button
              type="button"
              className={"tab-btn" + (!isSignup ? " active" : "")}
              onClick={() => switchTab("login")}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              className={"tab-btn" + (isSignup ? " active" : "")}
              onClick={() => switchTab("signup")}
            >
              Tạo tài khoản
            </button>
          </div>
        )}

        {confirmSent ? (
          <div className="term-box">
            <div className="pending-icon">📩</div>
            <p className="hint" style={{ textAlign: "center" }}>
              Đã gửi email xác nhận tới <strong>{email}</strong>. Mở email và bấm vào link để kích
              hoạt tài khoản, sau đó quay lại đây đăng nhập.
            </p>
            <button
              type="button"
              className="text-link"
              style={{ justifySelf: "center" }}
              onClick={() => switchTab("login")}
            >
              Quay lại đăng nhập
            </button>
          </div>
        ) : (
        <form className="term-box" onSubmit={handleSubmit}>
          {isSignup && (
            <div className="step">
              <div className="step-head">Tên hiển thị</div>
              <input
                type="text"
                required
                placeholder="Nguyễn Văn A"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          )}

          <div className="step">
            <div className="step-head">Email</div>
            <input
              type="email"
              required
              placeholder="ban@congty.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="step">
            <div className="step-head">Mật khẩu</div>
            <input
              type="password"
              required
              minLength={isSignup ? 6 : undefined}
              placeholder={isSignup ? "Tối thiểu 6 ký tự" : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="error-text">{error}</p>}

          <button type="submit" className="primary-btn primary-btn-wide" disabled={loading}>
            {loading ? "Đang xử lý..." : isSignup ? "Đăng ký tài khoản" : "Đăng nhập"}
          </button>
        </form>
        )}
      </div>
    </div>
  );
}
