import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    // In production, compare with bcrypt hash or Supabase Auth.
    // Default admin credential for KP2KP operator
    if (email === "admin@pajak.go.id" && (password === "KP2KP_Signage_2026!" || password === "admin123")) {
      const response = NextResponse.json({
        success: true,
        user: { email, name: "Admin KP2KP", role: "ADMIN" }
      });

      response.cookies.set("admin_session", "kp2kp_valid_session_token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7 // 7 days
      });

      return response;
    }

    return NextResponse.json(
      { success: false, error: "Email atau kata sandi tidak valid." },
      { status: 401 }
    );
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
