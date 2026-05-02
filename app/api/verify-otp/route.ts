import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json() as { email: string; code: string };

    if (!email || !code) {
      return NextResponse.json({ error: 'Email and code are required.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('otp_codes')
      .select('code, expires_at')
      .eq('email', email)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'No verification code found. Please request a new one.' }, { status: 400 });
    }

    if (new Date(data.expires_at) < new Date()) {
      await supabase.from('otp_codes').delete().eq('email', email);
      return NextResponse.json({ error: 'Verification code has expired. Please request a new one.' }, { status: 400 });
    }

    if (data.code !== code.trim()) {
      return NextResponse.json({ error: 'Invalid verification code. Please try again.' }, { status: 400 });
    }

    // Delete used code
    await supabase.from('otp_codes').delete().eq('email', email);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[verify-otp] Error:', err);
    return NextResponse.json({ error: 'Verification failed. Please try again.' }, { status: 500 });
  }
}
