export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getProcessosRepository } from "@/lib/server/processos/repository";

export async function GET() {
    try {
        const repository = await getProcessosRepository();
        const processos = await repository.listProcessos();
        return NextResponse.json(processos);
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const data = await req.json();
        const repository = await getProcessosRepository();
        const result = await repository.createProcesso(data);
        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const data = await req.json();
        const slug = String(data.slug ?? "");
        const repository = await getProcessosRepository();
        const result = await repository.updateProcesso(slug, data);

        if (result.notFound) {
            return NextResponse.json({ error: "Processo não encontrado" }, { status: 404 });
        }

        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
