// app/api/processos/[slug]/eventos/route.ts

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import db from "../../db";

export async function GET(
    _req: Request,
    { params }: { params: { slug: string } }
) {
    try {
        const eventos = db
            .prepare(`
        SELECT
          tipo,
          campo,
          valor_anterior,
          valor_novo,
          observacao,
          criado_em
        FROM processos_eventos
        WHERE processo_slug = ?
          AND visivel = 1
        ORDER BY criado_em DESC
      `)
            .all(params.slug);

        return NextResponse.json(eventos);
    } catch (error) {
        return NextResponse.json(
            { error: String(error) },
            { status: 500 }
        );
    }
}
