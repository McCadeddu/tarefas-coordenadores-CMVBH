export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getProcessosRepository } from "@/lib/server/processos/repository";

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ slug: string; id: string }> }
) {
    const data = await req.json();
    const { slug, id } = await params;
    const repository = await getProcessosRepository();
    const result = await repository.updateObjetivo(slug, id, data);

    if (result.notFound) {
        return NextResponse.json({ error: "N?o encontrado" }, { status: 404 });
    }

    return NextResponse.json(result);
}
