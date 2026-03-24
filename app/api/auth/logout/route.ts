import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/server/auth";

export async function POST(req: Request) {
    const redirectUrl = new URL("/login", req.url);
    const response = NextResponse.redirect(redirectUrl);

    response.cookies.set({
        name: SESSION_COOKIE,
        value: "",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 0,
    });

    return response;
}
