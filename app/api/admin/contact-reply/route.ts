import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ReplyRequestBody = {
  messageId?: string;
  reply?: string;
};

type ContactMessageRow = {
  id: string;
  name: string | null;
  email: string | null;
  subject: string | null;
  message: string | null;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const resendApiKey = process.env.RESEND_API_KEY;
const resendFromEmail = process.env.RESEND_FROM_EMAIL;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function getBearerToken(request: NextRequest) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim();
}

export async function POST(request: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonError(
      "Supabase environment variables are not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then restart the dev server.",
      500,
    );
  }

  const missingResendVars = [
    !resendApiKey ? "RESEND_API_KEY" : null,
    !resendFromEmail ? "RESEND_FROM_EMAIL" : null,
  ].filter(Boolean);

  if (missingResendVars.length) {
    return jsonError(
      `Missing email server environment variable(s): ${missingResendVars.join(", ")}. Add them to .env.local, then restart the dev server.`,
      500,
    );
  }

  let body: ReplyRequestBody;
  try {
    body = (await request.json()) as ReplyRequestBody;
  } catch {
    return jsonError("Invalid JSON request body.", 400);
  }

  const messageId = body.messageId?.trim();
  const adminReply = body.reply?.trim();

  if (!messageId) return jsonError("messageId is required.", 400);
  if (!adminReply) return jsonError("Reply cannot be empty.", 400);

  const bearerToken = getBearerToken(request);
  if (!bearerToken) return jsonError("Missing admin authorization token.", 401);

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
    },
  });

  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser();

  if (userError || !user) {
    console.error("Contact reply auth error:", userError);
    return jsonError(userError?.message || "Unauthorized admin session.", 401);
  }

  const { data: profile, error: profileError } = await authClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: string | null }>();

  if (profileError) {
    console.error("Contact reply admin profile error:", profileError);
    return jsonError(profileError.message, 500);
  }

  if (profile?.role !== "admin") {
    return jsonError("Only admins can reply to contact messages.", 403);
  }

  const { data: message, error: messageError } = await authClient
    .from("contact_messages")
    .select("id, name, email, subject, message")
    .eq("id", messageId)
    .maybeSingle<ContactMessageRow>();

  if (messageError) {
    console.error("Contact reply message lookup error:", messageError);
    return jsonError(messageError.message, 500);
  }

  if (!message?.email) {
    return jsonError("Contact message was not found or has no customer email.", 404);
  }

  const emailResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: resendFromEmail,
      to: message.email,
      subject: `Re: ${message.subject?.trim() || "Your message to PRELOVE SHOP"}`,
      text: [
        `Hi ${message.name?.trim() || "there"},`,
        "",
        adminReply,
        "",
        "Original message:",
        message.message || "",
      ].join("\n"),
    }),
  });

  const emailResult = (await emailResponse.json().catch(() => null)) as {
    message?: string;
    name?: string;
    error?: string;
  } | null;

  if (!emailResponse.ok) {
    const resendError =
      emailResult?.message ||
      emailResult?.error ||
      emailResult?.name ||
      `Resend API failed with status ${emailResponse.status}.`;
    console.error("Contact reply email error:", emailResult);
    return jsonError(resendError, 502);
  }

  const repliedAt = new Date().toISOString();

  const { error: insertError } = await authClient.from("contact_message_replies").insert({
    message_id: messageId,
    admin_reply: adminReply,
    replied_at: repliedAt,
    replied_by: user.id,
  });

  if (insertError) {
    console.error("Contact reply insert error:", insertError);
    return jsonError(insertError.message, 500);
  }

  const { error: updateError } = await authClient
    .from("contact_messages")
    .update({
      is_read: true,
      status: "replied",
      admin_reply: adminReply,
      replied_at: repliedAt,
      replied_by: user.id,
    })
    .eq("id", messageId);

  if (updateError) {
    console.error("Contact message update after reply error:", updateError);
    return jsonError(updateError.message, 500);
  }

  return NextResponse.json({
    ok: true,
    repliedAt,
    repliedBy: user.id,
  });
}
