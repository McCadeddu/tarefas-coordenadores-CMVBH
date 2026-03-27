export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/server/auth";

type Context = {
    params: Promise<{ slug: string; id: string }>;
};

type PresenceRow = {
    nome: string;
    email: string | null;
    ultimo_ping: string;
};

function normalizeEnvValue(value: string | undefined, fallback: string) {
    return (value || fallback).trim().replace(/^"|"$/g, "").toLowerCase();
}

function isPrismaProvider() {
    const provider = normalizeEnvValue(process.env.DATA_PROVIDER, "");
    return provider === "prisma" || (!provider && Boolean(process.env.DATABASE_URL?.trim()));
}

async function getPrisma() {
    const { default: prisma } = await import("@/lib/server/prisma");
    return prisma;
}

async function getSqliteDb() {
    const { default: db } = await import("@/app/api/processos/db");
    return db;
}

function limiteAtivoMs() {
    return 45_000;
}

function isoLimite() {
    return new Date(Date.now() - limiteAtivoMs()).toISOString();
}

async function ensurePresenceTable() {
    if (isPrismaProvider()) {
        const prisma = await getPrisma();
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS processos_encontros_presenca_online (
                processo_slug TEXT NOT NULL,
                encontro_id TEXT NOT NULL,
                sessao_id TEXT NOT NULL,
                nome TEXT NOT NULL,
                email TEXT,
                ultimo_ping TIMESTAMP NOT NULL,
                PRIMARY KEY (processo_slug, encontro_id, sessao_id)
            )
        `);
        return;
    }

    await getSqliteDb();
}

async function listPresence(slug: string, id: string) {
    await ensurePresenceTable();
    const limite = isoLimite();

    if (isPrismaProvider()) {
        const prisma = await getPrisma();
        await prisma.$executeRawUnsafe(
            `
                DELETE FROM processos_encontros_presenca_online
                WHERE ultimo_ping < NOW() - INTERVAL '2 minutes'
            `
        );

        const ativos = await prisma.$queryRawUnsafe<Array<{ nome: string; email: string | null; ultimo_ping: Date }>>(
            `
                SELECT nome, email, ultimo_ping
                FROM processos_encontros_presenca_online
                WHERE processo_slug = $1
                  AND encontro_id = $2
                  AND ultimo_ping >= $3::timestamp
                ORDER BY nome ASC
            `,
            slug,
            id,
            limite
        );

        return ativos.map((row) => ({
            nome: row.nome,
            email: row.email,
            ultimo_ping: row.ultimo_ping.toISOString(),
        }));
    }

    const db = await getSqliteDb();
    db.prepare(`
        DELETE FROM processos_encontros_presenca_online
        WHERE ultimo_ping < ?
    `).run(new Date(Date.now() - 120_000).toISOString());

    return db.prepare(`
        SELECT nome, email, ultimo_ping
        FROM processos_encontros_presenca_online
        WHERE processo_slug = ? AND encontro_id = ? AND ultimo_ping >= ?
        ORDER BY nome ASC
    `).all(slug, id, limite) as PresenceRow[];
}

async function upsertPresence(slug: string, id: string, sessaoId: string, nome: string, email: string | null) {
    await ensurePresenceTable();
    const agora = new Date().toISOString();

    if (isPrismaProvider()) {
        const prisma = await getPrisma();
        await prisma.$executeRawUnsafe(
            `
                INSERT INTO processos_encontros_presenca_online
                    (processo_slug, encontro_id, sessao_id, nome, email, ultimo_ping)
                VALUES ($1, $2, $3, $4, $5, $6::timestamp)
                ON CONFLICT (processo_slug, encontro_id, sessao_id)
                DO UPDATE SET
                    nome = EXCLUDED.nome,
                    email = EXCLUDED.email,
                    ultimo_ping = EXCLUDED.ultimo_ping
            `,
            slug,
            id,
            sessaoId,
            nome,
            email,
            agora
        );
        return;
    }

    const db = await getSqliteDb();
    db.prepare(`
        INSERT INTO processos_encontros_presenca_online
            (processo_slug, encontro_id, sessao_id, nome, email, ultimo_ping)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(processo_slug, encontro_id, sessao_id)
        DO UPDATE SET
            nome = excluded.nome,
            email = excluded.email,
            ultimo_ping = excluded.ultimo_ping
    `).run(slug, id, sessaoId, nome, email, agora);
}

async function removePresence(slug: string, id: string, sessaoId: string) {
    await ensurePresenceTable();

    if (isPrismaProvider()) {
        const prisma = await getPrisma();
        await prisma.$executeRawUnsafe(
            `
                DELETE FROM processos_encontros_presenca_online
                WHERE processo_slug = $1 AND encontro_id = $2 AND sessao_id = $3
            `,
            slug,
            id,
            sessaoId
        );
        return;
    }

    const db = await getSqliteDb();
    db.prepare(`
        DELETE FROM processos_encontros_presenca_online
        WHERE processo_slug = ? AND encontro_id = ? AND sessao_id = ?
    `).run(slug, id, sessaoId);
}

export async function GET(_req: Request, { params }: Context) {
    try {
        const { slug, id } = await params;
        const presencas = await listPresence(slug, id);

        return NextResponse.json({
            presencas,
            total: new Set(presencas.map((item) => item.email || item.nome)).size,
        });
    } catch (error) {
        console.error("ERRO PRESENCA ENCONTRO GET:", error);
        return NextResponse.json({ error: "Erro ao consultar presença", details: String(error) }, { status: 500 });
    }
}

export async function POST(req: Request, { params }: Context) {
    try {
        const session = await getCurrentSession();
        if (!session) {
            return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });
        }

        const { slug, id } = await params;
        const data = await req.json().catch(() => ({}));
        const sessaoId = String(data?.sessao_id ?? "").trim();

        if (!sessaoId) {
            return NextResponse.json({ error: "Sessão de presença inválida" }, { status: 400 });
        }

        await upsertPresence(slug, id, sessaoId, session.name || session.email, session.email);
        const presencas = await listPresence(slug, id);

        return NextResponse.json({
            presencas,
            total: new Set(presencas.map((item) => item.email || item.nome)).size,
        });
    } catch (error) {
        console.error("ERRO PRESENCA ENCONTRO POST:", error);
        return NextResponse.json({ error: "Erro ao registrar presença", details: String(error) }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: Context) {
    try {
        const { slug, id } = await params;
        const data = await req.json().catch(() => ({}));
        const sessaoId = String(data?.sessao_id ?? "").trim();

        if (!sessaoId) {
            return NextResponse.json({ ok: true });
        }

        await removePresence(slug, id, sessaoId);
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("ERRO PRESENCA ENCONTRO DELETE:", error);
        return NextResponse.json({ error: "Erro ao remover presença", details: String(error) }, { status: 500 });
    }
}
