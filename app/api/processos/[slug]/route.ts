export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getProcessosRepository } from "@/lib/server/processos/repository";

type Context = {
    params: Promise<{
        slug: string;
    }>;
};

export async function GET(_req: Request, { params }: Context) {
    try {
        const { slug } = await params;
        const repository = await getProcessosRepository();
        const processo = await repository.getProcessoBySlug(slug);

        if (!processo) {
            return NextResponse.json({ error: "Processo não encontrado" }, { status: 404 });
        }

        return NextResponse.json(processo);
    } catch (error) {
        console.error("ERRO /api/processos/[slug]:", error);
        return NextResponse.json(
            { error: "Erro interno", details: String(error) },
            { status: 500 }
        );
    }
}

export async function PUT(req: Request, { params }: Context) {
    try {
        const { slug } = await params;
        const data = await req.json();
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

export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;

    try {
        const repository = await getProcessosRepository();
        const result = await repository.deleteProcesso(slug);

        if (result.notFound) {
            return NextResponse.json({ error: "Processo não encontrado" }, { status: 404 });
        }

        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
