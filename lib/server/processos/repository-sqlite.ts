import db from "@/app/api/processos/db";
import type {
    EventoItem,
    ObjetivoInput,
    ObjetivoItem,
    ProcessoDetalhe,
    ProcessoInput,
    ProcessoListItem,
    ProcessosRepository,
    RepositoryMutationResult,
} from "./types";

function normalizarObjetivos(objetivos: ProcessoInput["objetivos"]): Required<ObjetivoInput>[] {
    if (!Array.isArray(objetivos)) return [];

    return objetivos
        .map((objetivo) => ({
            id: objetivo.id,
            ordem: objetivo.ordem,
            titulo: String(objetivo.titulo ?? "").trim(),
            data_inicio: objetivo.data_inicio ?? null,
            data_fim_prevista: objetivo.data_fim_prevista ?? null,
            status: objetivo.status ?? "Planejado",
        }))
        .filter((objetivo) => objetivo.titulo.length > 0) as Required<ObjetivoInput>[];
}

function registrarMudanca(
    slug: string,
    campo: string,
    valorAnterior: string | null | undefined,
    valorNovo: string | null | undefined,
    now: string
) {
    if (String(valorAnterior ?? "") === String(valorNovo ?? "")) return;

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

function registrarEventoObjetivo(slug: string, observacao: string, now: string) {
    db.prepare(`
        INSERT INTO processos_eventos
        (processo_slug, tipo, observacao, visivel, criado_em)
        VALUES (?, ?, ?, 0, ?)
    `).run(slug, "OBJETIVO", observacao, now);
}

export class SqliteProcessosRepository implements ProcessosRepository {
    async listProcessos(): Promise<ProcessoListItem[]> {
        return db.prepare(`
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
        `).all() as ProcessoListItem[];
    }

    async getProcessoBySlug(slug: string): Promise<ProcessoDetalhe | null> {
        const processo = db.prepare(`
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
              data_fim,
              objetivo_geral,
              objetivo_inicio,
              objetivo_fim_previsto,
              observacoes
            FROM processos
            WHERE slug = ?
        `).get(slug) as ProcessoDetalhe | undefined;

        return processo ?? null;
    }

    async listObjetivos(slug: string): Promise<ObjetivoItem[]> {
        return db.prepare(`
            SELECT
              id,
              ordem,
              titulo,
              data_inicio,
              data_fim_prevista,
              status,
              criado_em
            FROM processos_objetivos
            WHERE processo_slug = ?
            ORDER BY ordem ASC
        `).all(slug) as ObjetivoItem[];
    }

    async listEventos(slug: string): Promise<EventoItem[]> {
        return db.prepare(`
            SELECT
              tipo,
              campo,
              valor_anterior,
              valor_novo,
              observacao,
              visivel,
              criado_em
            FROM processos_eventos
            WHERE processo_slug = ?
            ORDER BY criado_em DESC
        `).all(slug) as EventoItem[];
    }

    async createProcesso(input: ProcessoInput): Promise<RepositoryMutationResult> {
        const now = new Date().toISOString();
        const objetivos = normalizarObjetivos(input.objetivos);

        const criarProcesso = db.transaction(() => {
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
                  objetivo_geral,
                  objetivo_inicio,
                  objetivo_fim_previsto,
                  observacoes,
                  criado_em,
                  atualizado_em
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                input.slug,
                input.nome,
                input.ambito,
                input.equipe || null,
                input.coord_atual || null,
                input.coord_futuro || null,
                input.etapa,
                now,
                input.status,
                input.data_inicio || now,
                input.data_prevista_fim || null,
                input.objetivo_geral || null,
                input.objetivo_inicio || null,
                input.objetivo_fim_previsto || null,
                input.observacoes || null,
                now,
                now
            );

            db.prepare(`
                INSERT INTO processos_eventos
                (processo_slug, tipo, observacao, criado_em)
                VALUES (?, ?, ?, ?)
            `).run(input.slug, "CRIACAO", "Processo criado", now);

            objetivos.forEach((objetivo, index) => {
                db.prepare(`
                    INSERT INTO processos_objetivos
                    (processo_slug, ordem, titulo, data_inicio, data_fim_prevista, status, criado_em)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).run(
                    input.slug,
                    index + 1,
                    objetivo.titulo,
                    objetivo.data_inicio,
                    objetivo.data_fim_prevista,
                    objetivo.status,
                    now
                );

                registrarEventoObjetivo(input.slug!, `Objetivo criado: ${objetivo.titulo}`, now);
            });
        });

        criarProcesso();
        return { ok: true };
    }

    async updateProcesso(slug: string, input: ProcessoInput): Promise<RepositoryMutationResult> {
        const now = new Date().toISOString();
        const atual = db.prepare(`
            SELECT
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
              objetivo_geral,
              objetivo_inicio,
              objetivo_fim_previsto,
              observacoes
            FROM processos
            WHERE slug = ?
        `).get(slug) as Record<string, string | null> | undefined;

        if (!atual) {
            return { ok: false, notFound: true };
        }

        const objetivosRecebidos = normalizarObjetivos(input.objetivos);
        const mudouEtapa = atual.etapa !== input.etapa;

        const sincronizar = db.transaction(() => {
            registrarMudanca(slug, "nome", atual.nome, input.nome, now);
            registrarMudanca(slug, "ambito", atual.ambito, input.ambito, now);
            registrarMudanca(slug, "equipe", atual.equipe, input.equipe, now);
            registrarMudanca(slug, "coord_atual", atual.coord_atual, input.coord_atual, now);
            registrarMudanca(slug, "coord_futuro", atual.coord_futuro, input.coord_futuro, now);
            registrarMudanca(slug, "status", atual.status, input.status, now);
            registrarMudanca(slug, "data_inicio", atual.data_inicio, input.data_inicio, now);
            registrarMudanca(slug, "data_prevista_fim", atual.data_prevista_fim, input.data_prevista_fim, now);
            registrarMudanca(slug, "objetivo_geral", atual.objetivo_geral, input.objetivo_geral, now);
            registrarMudanca(slug, "objetivo_inicio", atual.objetivo_inicio, input.objetivo_inicio, now);
            registrarMudanca(slug, "objetivo_fim_previsto", atual.objetivo_fim_previsto, input.objetivo_fim_previsto, now);
            registrarMudanca(slug, "observacoes", atual.observacoes, input.observacoes, now);

            if (mudouEtapa) {
                db.prepare(`
                    INSERT INTO processos_eventos
                    (processo_slug, tipo, campo, valor_anterior, valor_novo, criado_em)
                    VALUES (?, ?, ?, ?, ?, ?)
                `).run(slug, "MUDANCA_ETAPA", "etapa", atual.etapa, input.etapa, now);
            }

            db.prepare(`
                UPDATE processos SET
                  nome = ?,
                  ambito = ?,
                  equipe = ?,
                  coord_atual = ?,
                  coord_futuro = ?,
                  etapa = ?,
                  etapa_desde = CASE WHEN etapa <> ? THEN ? ELSE etapa_desde END,
                  status = ?,
                  data_inicio = ?,
                  data_prevista_fim = ?,
                  objetivo_geral = ?,
                  objetivo_inicio = ?,
                  objetivo_fim_previsto = ?,
                  observacoes = ?,
                  atualizado_em = ?
                WHERE slug = ?
            `).run(
                input.nome,
                input.ambito,
                input.equipe || null,
                input.coord_atual || null,
                input.coord_futuro || null,
                input.etapa,
                input.etapa,
                now,
                input.status,
                input.data_inicio || null,
                input.data_prevista_fim || null,
                input.objetivo_geral || null,
                input.objetivo_inicio || null,
                input.objetivo_fim_previsto || null,
                input.observacoes || null,
                now,
                slug
            );

            const objetivosAtuais = db.prepare(`
                SELECT id, ordem, titulo, data_inicio, data_fim_prevista, status
                FROM processos_objetivos
                WHERE processo_slug = ?
            `).all(slug) as Array<{
                id: number;
                ordem: number;
                titulo: string;
                data_inicio: string | null;
                data_fim_prevista: string | null;
                status: string | null;
            }>;

            const objetivosPorId = new Map(objetivosAtuais.map((objetivo) => [objetivo.id, objetivo]));
            const idsMantidos = new Set<number>();

            objetivosRecebidos.forEach((objetivo, index) => {
                const ordem = objetivo.ordem ?? index + 1;
                const objetivoId = typeof objetivo.id === "number" ? objetivo.id : Number(objetivo.id);

                if (objetivoId && objetivosPorId.has(objetivoId)) {
                    const atualObjetivo = objetivosPorId.get(objetivoId)!;

                    db.prepare(`
                        UPDATE processos_objetivos SET
                          ordem = ?,
                          titulo = ?,
                          data_inicio = ?,
                          data_fim_prevista = ?,
                          status = ?
                        WHERE id = ? AND processo_slug = ?
                    `).run(
                        ordem,
                        objetivo.titulo,
                        objetivo.data_inicio,
                        objetivo.data_fim_prevista,
                        objetivo.status,
                        objetivoId,
                        slug
                    );

                    const mudou =
                        atualObjetivo.ordem !== ordem ||
                        atualObjetivo.titulo !== objetivo.titulo ||
                        String(atualObjetivo.data_inicio ?? "") !== String(objetivo.data_inicio ?? "") ||
                        String(atualObjetivo.data_fim_prevista ?? "") !== String(objetivo.data_fim_prevista ?? "") ||
                        String(atualObjetivo.status ?? "") !== String(objetivo.status ?? "");

                    if (mudou) {
                        registrarEventoObjetivo(slug, `Objetivo atualizado: ${objetivo.titulo}`, now);
                    }

                    idsMantidos.add(objetivoId);
                    return;
                }

                const resultado = db.prepare(`
                    INSERT INTO processos_objetivos
                    (processo_slug, ordem, titulo, data_inicio, data_fim_prevista, status, criado_em)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).run(
                    slug,
                    ordem,
                    objetivo.titulo,
                    objetivo.data_inicio,
                    objetivo.data_fim_prevista,
                    objetivo.status,
                    now
                );

                idsMantidos.add(Number(resultado.lastInsertRowid));
                registrarEventoObjetivo(slug, `Objetivo criado: ${objetivo.titulo}`, now);
            });

            objetivosAtuais
                .filter((objetivo) => !idsMantidos.has(objetivo.id))
                .forEach((objetivo) => {
                    db.prepare(`
                        DELETE FROM processos_objetivos
                        WHERE id = ? AND processo_slug = ?
                    `).run(objetivo.id, slug);
                    registrarEventoObjetivo(slug, `Objetivo removido: ${objetivo.titulo}`, now);
                });
        });

        sincronizar();
        return { ok: true };
    }

    async deleteProcesso(slug: string): Promise<RepositoryMutationResult> {
        db.prepare(`DELETE FROM processos_objetivos WHERE processo_slug = ?`).run(slug);
        db.prepare(`DELETE FROM processos_eventos WHERE processo_slug = ?`).run(slug);
        db.prepare(`DELETE FROM processos WHERE slug = ?`).run(slug);
        return { ok: true };
    }

    async createObjetivo(slug: string, input: ObjetivoInput): Promise<RepositoryMutationResult> {
        const now = new Date().toISOString();
        const existe = db.prepare(`SELECT slug FROM processos WHERE slug = ?`).get(slug) as { slug: string } | undefined;
        if (!existe) {
            return { ok: false, notFound: true };
        }

        const ultima = db.prepare(`SELECT MAX(ordem) as max FROM processos_objetivos WHERE processo_slug = ?`).get(slug) as { max: number | null };
        const ordem = (ultima?.max ?? 0) + 1;

        db.prepare(`
            INSERT INTO processos_objetivos
            (processo_slug, ordem, titulo, data_inicio, data_fim_prevista, status, criado_em)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
            slug,
            ordem,
            input.titulo,
            input.data_inicio || null,
            input.data_fim_prevista || null,
            input.status || "Planejado",
            now
        );

        registrarEventoObjetivo(slug, `Objetivo criado: ${input.titulo}`, now);
        return { ok: true };
    }

    async updateObjetivo(slug: string, id: string, input: ObjetivoInput): Promise<RepositoryMutationResult> {
        const now = new Date().toISOString();
        const atual = db.prepare(`
            SELECT * FROM processos_objetivos
            WHERE id = ? AND processo_slug = ?
        `).get(id, slug) as { titulo: string; status: string | null } | undefined;

        if (!atual) {
            return { ok: false, notFound: true };
        }

        db.prepare(`
            UPDATE processos_objetivos SET
              titulo = ?,
              data_inicio = ?,
              data_fim_prevista = ?,
              status = ?
            WHERE id = ?
        `).run(
            input.titulo,
            input.data_inicio || null,
            input.data_fim_prevista || null,
            input.status || atual.status,
            id
        );

        registrarEventoObjetivo(slug, `Objetivo atualizado: ${input.titulo}`, now);
        return { ok: true };
    }
}
