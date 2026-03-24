export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getProcessosRepository } from "@/lib/server/processos/repository";

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;
    const repository = await getProcessosRepository();
    const objetivos = await repository.listObjetivos(slug);

    return NextResponse.json(objetivos);
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    const data = await req.json();
    const { slug } = await params;
    const repository = await getProcessosRepository();
    const result = await repository.createObjetivo(slug, data);

    if (result.notFound) {
        return NextResponse.json({ error: "Processo n?o encontrado" }, { status: 404 });
    }

    return NextResponse.json(result);
}
