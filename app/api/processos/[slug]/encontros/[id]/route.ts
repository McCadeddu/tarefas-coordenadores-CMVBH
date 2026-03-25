export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getProcessosRepository } from "@/lib/server/processos/repository";

type Context = {
    params: Promise<{ slug: string; id: string }>;
};

export async function GET(_req: Request, { params }: Context) {
    try {
        const { slug, id } = await params;
        const repository = await getProcessosRepository();
        const encontro = await repository.getEncontroById(slug, id);

        if (!encontro) {
            return NextResponse.json({ error: "Encontro não encontrado" }, { status: 404 });
        }

        return NextResponse.json(encontro);
    } catch (error) {
        console.error("ERRO /api/processos/[slug]/encontros/[id]:", error);
        return NextResponse.json({ error: "Erro ao carregar encontro", details: String(error) }, { status: 500 });
    }
}

export async function PUT(req: Request, { params }: Context) {
    try {
        const { slug, id } = await params;
        const data = await req.json();
        const repository = await getProcessosRepository();
        const result = await repository.updateEncontro(slug, id, data);

        if (result.notFound) {
            return NextResponse.json({ error: "Encontro não encontrado" }, { status: 404 });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error("ERRO PUT /api/processos/[slug]/encontros/[id]:", error);
        return NextResponse.json({ error: "Erro ao atualizar encontro", details: String(error) }, { status: 500 });
    }
}
