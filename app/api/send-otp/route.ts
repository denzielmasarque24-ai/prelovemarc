import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

// Use service role key server-side to bypass RLS
const supabase = createClient(
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
    const { email } = await req.json() as { email: string };

    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Save OTP — delete old first to avoid upsert RLS issues
    await supabase.from('otp_codes').delete().eq('email', email);
    const { error: dbError } = await supabase
      .from('otp_codes')
      .insert({ email, code: otp, expires_at: expiresAt });

    if (dbError) {
      console.error('[send-otp] DB error:', dbError.message, dbError.details);
      // Continue anyway — still send the email even if DB save fails
    }

    await transporter.sendMail({
      from: `"PRELOVE SHOP" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Your PRELOVE SHOP Verification Code',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#fff8fa;border-radius:16px;">
          <h2 style="color:#d4829a;margin-bottom:8px;">PRELOVE SHOP 🌸</h2>
          <h3 style="color:#3a2e32;margin-top:0;">Verify your email</h3>
          <p style="color:#7a6a6f;">Enter this 6-digit verification code to complete your registration:</p>
          <div style="font-size:2.8rem;font-weight:800;letter-spacing:14px;color:#d4829a;background:#fdeef3;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
            ${otp}
          </div>
          <p style="color:#7a6a6f;font-size:0.88rem;">This code expires in <strong>10 minutes</strong>.</p>
          <p style="color:#b09098;font-size:0.8rem;">If you did not register at PRELOVE SHOP, ignore this email.</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[send-otp] Error:', err);
    return NextResponse.json({ error: 'Failed to send verification code.' }, { status: 500 });
  }
}
