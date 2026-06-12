import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  createSessionCookie,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { idToken } = (await request.json()) as { idToken: string };

    if (!idToken) {
      return NextResponse.json(
        { error: "ID token je povinný" },
        { status: 400 }
      );
    }

    const sessionCookie = await createSessionCookie(idToken);
    const cookieStore = await cookies();

    cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 5, // 5 days
      sameSite: "lax",
    });

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Session creation failed:", error);
    return NextResponse.json(
      { error: "Nepodařilo se vytvořit session" },
      { status: 401 }
    );
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  return NextResponse.json({ status: "ok" });
}
