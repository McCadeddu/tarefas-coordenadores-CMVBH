import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/shared/session-token";

function isProtectedPath(pathname: string) {
    return (
        pathname === "/" ||
        pathname.startsWith("/processos") ||
        pathname.startsWith("/projetar") ||
        pathname.startsWith("/api/processos")
    );
}

export async function middleware(req: NextRequest) {
    const { pathname, search } = req.nextUrl;

    if (!isProtectedPath(pathname)) {
        return NextResponse.next();
    }

    const token = req.cookies.get(SESSION_COOKIE)?.value;

    if (token) {
        try {
            await verifySessionToken(token);
            return NextResponse.next();
        } catch {
        }
    }

    if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
}

export const config = {
    matcher: ["/", "/processos/:path*", "/projetar/:path*", "/api/processos/:path*"],
};
