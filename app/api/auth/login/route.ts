import { NextResponse } from "next/server";
import { authenticateUser, createSessionToken, SESSION_COOKIE } from "@/lib/server/auth";

export async function POST(req: Request) {
    try {
        const data = await req.json();
        const email = String(data.email ?? "").trim().toLowerCase();
        const password = String(data.password ?? "");

        const user = await authenticateUser(email, password);

        if (!user) {
            return NextResponse.json({ error: "Credenciais invalidas" }, { status: 401 });
        }

        const token = await createSessionToken(user);
        const response = NextResponse.json({ ok: true, user });

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
