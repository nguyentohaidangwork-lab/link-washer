"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthConfirmPage() {
  const router = useRouter();
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) {
        router.replace("/tool");
        router.refresh();
      } else {
        setStatus("error");
      }
    });
  }, [router]);

  return (
    <div className="screen">
      <div className="page-narrow">
        <div className="masthead">
          <div className="eyebrow">✦ K-NETWORK</div>
          <h1>Xác nhận tài khoản</h1>
        </div>

        <div className="term-box">
          {status === "checking" ? (
            <p className="hint" style={{ textAlign: "center" }}>
              Đang xác nhận...
            </p>
          ) : (
            <>
              <p className="error-text" style={{ textAlign: "center" }}>
                Link xác nhận không hợp lệ hoặc đã hết hạn.
              </p>
              <a className="text-link" href="/login" style={{ justifySelf: "center" }}>
                Quay lại đăng nhập
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
