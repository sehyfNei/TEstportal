"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAppUrl, hasSupabaseConfig } from "@/lib/supabase/env";

function encodedMessage(message: string) {
  return encodeURIComponent(message);
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function signInAction(formData: FormData) {
  if (!hasSupabaseConfig()) {
    redirect(`/login?message=${encodedMessage("Supabase is not configured yet.")}`);
  }

  const email = getString(formData, "email");
  const password = getString(formData, "password");
  const redirectTo = getString(formData, "redirectTo") || "/dashboard";

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    redirect(`/login?message=${encodedMessage(error.message)}`);
  }

  redirect(redirectTo);
}

export async function signUpAction(formData: FormData) {
  if (!hasSupabaseConfig()) {
    redirect(`/register?message=${encodedMessage("Supabase is not configured yet.")}`);
  }

  const name = getString(formData, "name");
  const email = getString(formData, "email");
  const password = getString(formData, "password");

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name
      },
      emailRedirectTo: `${getAppUrl()}/auth/callback`
    }
  });

  if (error) {
    redirect(`/register?message=${encodedMessage(error.message)}`);
  }

  redirect(`/login?message=${encodedMessage("Check your email to confirm your account.")}`);
}

export async function resetPasswordAction(formData: FormData) {
  if (!hasSupabaseConfig()) {
    redirect(`/reset-password?message=${encodedMessage("Supabase is not configured yet.")}`);
  }

  const email = getString(formData, "email");
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getAppUrl()}/reset-password`
  });

  if (error) {
    redirect(`/reset-password?message=${encodedMessage(error.message)}`);
  }

  redirect(`/login?message=${encodedMessage("Password reset email sent.")}`);
}

export async function signOutAction() {
  if (hasSupabaseConfig()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  redirect("/login");
}

