export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getProcessosRepository } from "@/lib/server/processos/repository";

type Context = {
    params: Promise<{ slug: string }>;
};

export async function GET(_req: Request, { params }: Context) {
    try {
        const { slug } = await params;
        const repository = await getProcessosRepository();
        const encontros = await repository.listEncontros(slug);
        return NextResponse.json(encontros);
    } catch (error) {
        console.error("ERRO /api/processos/[slug]/encontros:", error);
        return NextResponse.json({ error: "Erro ao listar encontros", details: String(error) }, { status: 500 });
    }
}

export async function POST(req: Request, { params }: Context) {
    try {
        const { slug } = await params;
        const data = await req.json();
        const repository = await getProcessosRepository();
        const result = await repository.createEncontro(slug, data);

        if (result.notFound) {
            return NextResponse.json({ error: "Processo não encontrado" }, { status: 404 });
        }

        const encontro = result.id ? await repository.getEncontroById(slug, String(result.id)) : null;
        return NextResponse.json({ ...result, encontro }, { status: 201 });
    } catch (error) {
        console.error("ERRO POST /api/processos/[slug]/encontros:", error);
        return NextResponse.json({ error: "Erro ao criar encontro", details: String(error) }, { status: 500 });
    }
}
