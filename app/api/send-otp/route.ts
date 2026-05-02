import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

// Server-side client — uses service role key to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json() as { email?: string };

    if (!email?.trim()) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.error('[send-otp] Missing GMAIL_USER or GMAIL_APP_PASSWORD env vars');
      return NextResponse.json(
        { error: 'Email service is not configured. Please contact support.' },
        { status: 500 }
      );
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Save OTP to DB
    await supabaseAdmin.from('otp_codes').delete().eq('email', email);
    const { error: dbError } = await supabaseAdmin
      .from('otp_codes')
      .insert({ email, code: otp, expires_at: expiresAt });

    if (dbError) {
      console.error('[send-otp] DB insert error:', dbError.message, '| hint:', dbError.hint);
      // Do not block — still send the email
    }

    // Send via Gmail
    await transporter.sendMail({
      from: `"PRELOVE SHOP" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Your PRELOVE SHOP Verification Code',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#fff8fa;border-radius:16px;">
          <h2 style="color:#d4829a;margin:0 0 4px;">PRELOVE SHOP 🌸</h2>
          <p style="color:#3a2e32;font-size:1.05rem;font-weight:700;margin:0 0 12px;">Your verification code</p>
          <p style="color:#7a6a6f;margin:0 0 4px;">Enter this 6-digit code to complete your registration:</p>
          <div style="font-size:2.8rem;font-weight:800;letter-spacing:16px;color:#d4829a;background:#fdeef3;border-radius:12px;padding:24px;text-align:center;margin:20px 0;">
            ${otp}
          </div>
          <p style="color:#7a6a6f;font-size:0.85rem;">This code expires in <strong>10 minutes</strong>.</p>
          <p style="color:#b09098;font-size:0.78rem;">If you did not register at PRELOVE SHOP, ignore this email.</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true, code: otp });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[send-otp] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
