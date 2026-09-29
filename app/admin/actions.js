"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function approveUser(formData) {
  const userId = formData.get("userId");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Chưa đăng nhập.");

  // Lớp phòng thủ phụ — cổng thật là RLS policy "profiles_update_owner" trong Postgres,
  // update này sẽ tự no-op nếu người gọi không phải owner.
  const { error } = await supabase.from("profiles").update({ approved: true }).eq("id", userId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
}
