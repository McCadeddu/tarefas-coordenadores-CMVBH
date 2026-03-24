import { NextResponse } from "next/server";
import {
    completeFirstAccess,
    createSessionToken,
    SESSION_COOKIE,
} from "@/lib/server/auth";

export async function POST(req: Request) {
    try {
        const data = await req.json();
        const result = await completeFirstAccess({
            email: String(data.email ?? ""),
            setupToken: String(data.setupToken ?? ""),
            password: String(data.password ?? ""),
            name: String(data.name ?? "").trim(),
        });

        if (!result.ok) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        const token = await createSessionToken(result.session);
        const response = NextResponse.json({ ok: true, user: result.session });
        response.cookies.set({
            name: SESSION_COOKIE,
            value: token,
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 60 * 24 * 7,
        });

        return response;
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
