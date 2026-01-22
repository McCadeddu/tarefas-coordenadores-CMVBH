// tarefa-coordenadores/app/api/processos/route.ts

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import db from "./db";

// Função para registrar mudanças nos campos dos processos no histórico de eventos do processo
function registrarMudanca(
    slug: string,
    campo: string,
    valorAnterior: string | null | undefined,
    valorNovo: string | null | undefined,
    now: string
) {
    if (valorAnterior === valorNovo) return;

    db.prepare(`
        INSERT INTO processos_eventos
        (processo_slug, tipo, campo, valor_anterior, valor_novo, criado_em)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(
        slug,
        "EDICAO_CAMPO",
        campo,
        String(valorAnterior ?? ""),
        String(valorNovo ?? ""),
        now
    );
}

/* ================= GET ================= */
export async function GET() {
    try {
        const processos = db
            .prepare(`
        SELECT
          id,
          slug,
          nome,
          ambito,
          equipe,
          coord_atual,
          coord_futuro,
          etapa,
          etapa_desde,
          status,
          data_inicio,
          data_prevista_fim,
          data_fim
        FROM processos
        ORDER BY nome
      `)
            .all();

        return NextResponse.json(processos);
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}

/* ================= POST ================= */
export async function POST(req: Request) {
    const data = await req.json();               // ✅ FALTAVA
    const now = new Date().toISOString();

    db.prepare(`
    INSERT INTO processos
    (
      slug,
      nome,
      ambito,
      equipe,
      coord_atual,
      coord_futuro,
      etapa,
      etapa_desde,
      status,
      data_inicio,
      data_prevista_fim,
      observacoes,
      criado_em,
      atualizado_em
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
        data.slug,
        data.nome,
        data.ambito,
        data.equipe,
        data.coord_atual,
        data.coord_futuro,
        data.etapa,
        now,                                // etapa_desde começa hoje
        data.status,
        data.data_inicio || now,
        data.data_prevista_fim || null,
        data.observacoes || null,
        now,
        now
    );

    return NextResponse.json({ ok: true });
}

/* ================= PUT ================= */
export async function PUT(req: Request) {
    const data = await req.json();               // ✅ FALTAVA
    const now = new Date().toISOString();        // ✅ FALTAVA

    // Busca estado atual no banco
    const atual = db
        .prepare(`SELECT * FROM processos WHERE slug = ?`)
        .get(data.slug) as {
            slug: string;
            nome: string;
            ambito: string;
            equipe: string;
            coord_atual: string | null;
            coord_futuro: string | null;
            etapa: string;
            etapa_desde: string;
            status: string;
            data_prevista_fim: string | null;
        };

    const mudouEtapa = atual.etapa !== data.etapa;
    // Registra mudanças campo a campo no histórico de eventos do processo
    registrarMudanca(data.slug, "nome", atual.nome, data.nome, now);
    registrarMudanca(data.slug, "ambito", atual.ambito, data.ambito, now);
    registrarMudanca(data.slug, "equipe", atual.equipe, data.equipe, now);
    registrarMudanca(data.slug, "coord_atual", atual.coord_atual, data.coord_atual, now);
    registrarMudanca(data.slug, "coord_futuro", atual.coord_futuro, data.coord_futuro, now);
    registrarMudanca(data.slug, "status", atual.status, data.status, now);
    registrarMudanca(
        data.slug,
        "data_prevista_fim",
        atual.data_prevista_fim,
        data.data_prevista_fim,
        now
    );

    if (mudouEtapa) {
        db.prepare(`
        INSERT INTO processos_eventos
        (processo_slug, tipo, campo, valor_anterior, valor_novo, criado_em)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(
            data.slug,
            "MUDANCA_ETAPA",
            "etapa",
            atual.etapa,
            data.etapa,
            now
        );
    }

    // Se a etapa mudou, registra também a mudança da etapa e da data etapa_desde no histórico de eventos do processo
    db.prepare(`
    UPDATE processos SET
      nome = ?,
      ambito = ?,
      equipe = ?,
      coord_atual = ?,
      coord_futuro = ?,
      etapa = ?,
      etapa_desde = ?,
      status = ?,
      observacoes = ?,
      atualizado_em = ?
    WHERE slug = ?
  `).run(
        data.nome,
        data.ambito,
        data.equipe,
        data.coord_atual,
        data.coord_futuro,
        data.etapa,
        mudouEtapa ? now : atual.etapa_desde,   // ✅ fonte confiável
        data.status,
        data.observacoes || null,
        now,
        data.slug
    );

    return NextResponse.json({ ok: true });
}
