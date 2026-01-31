"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "./supabase-server";

export async function signInWithPassword(formData: {
  email: string;
  password: string;
  redirectTo?: string;
}) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.email,
    password: formData.password,
  });
  if (error) {
    return { error: error.message };
  }
  redirect(formData.redirectTo ?? "/admin");
}
