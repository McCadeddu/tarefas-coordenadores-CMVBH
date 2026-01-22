// app/api/processos/[slug]/route.ts

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import db from "../db";

export async function GET(
    _req: Request,
    { params }: { params: { slug: string } }
) {
    const processo = db
        .prepare(
            `SELECT slug, nome, ambito, equipe, coord_atual, coord_futuro, etapa, status, observacoes
       FROM processos
       WHERE slug = ?`
        )
        .get(params.slug);

    if (!processo) {
        return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    }

    return NextResponse.json(processo);
}
