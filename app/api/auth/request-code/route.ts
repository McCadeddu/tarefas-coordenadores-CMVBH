import { NextResponse } from "next/server";
import { requestEmailCode } from "@/lib/server/auth";

export async function POST(req: Request) {
    try {
        const data = await req.json();
        const result = await requestEmailCode(String(data.email ?? ""));

        if (!result.ok) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
