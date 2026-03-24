export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getProcessosRepository } from "@/lib/server/processos/repository";

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;
    const repository = await getProcessosRepository();
    const eventos = await repository.listEventos(slug);

    return NextResponse.json(eventos);
}
