import { EventoTipo, ObjetivoStatus, ProcessoEtapa, ProcessoStatus } from "@prisma/client";
import prisma from "../prisma";
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

function iso(value: Date | null | undefined) {
    return value ? value.toISOString() : null;
}

function parseDate(value?: string | null) {
    return value ? new Date(value) : null;
}

function normalizeLabel(value?: string | null) {
    return (value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\?/g, "")
        .trim()
        .toLowerCase();
}

function mapEtapa(value: ProcessoEtapa) {
    return {
        PLANEJAMENTO: "Planejamento",
        EXECUCAO: "Execu??o",
        ACOMPANHAMENTO: "Acompanhamento",
        TRANSICAO: "Transi??o",
        CONCLUIDO: "Conclu?do",
    }[value];
}

function mapStatus(value: ProcessoStatus | ObjetivoStatus) {
    return {
        ATIVO: "Ativo",
        ATENCAO: "Aten??o",
        TRANSICAO: "Transi??o",
        PLANEJADO: "Planejado",
        CONCLUIDO: "Conclu?do",
        EM_ANDAMENTO: "Em andamento",
    }[value];
}

function mapEventoTipo(value: EventoTipo) {
    return {
        CRIACAO: "CRIACAO",
        MUDANCA_ETAPA: "MUDANCA_ETAPA",
        OBJETIVO: "OBJETIVO",
        EDICAO_CAMPO: "EDICAO_CAMPO",
        COMENTARIO: "COMENTARIO",
    }[value];
}

function toEtapa(value?: string | null): ProcessoEtapa {
    const normalized = normalizeLabel(value || "Planejamento");
    return {
        planejamento: ProcessoEtapa.PLANEJAMENTO,
        execucao: ProcessoEtapa.EXECUCAO,
        acompanhamento: ProcessoEtapa.ACOMPANHAMENTO,
        transicao: ProcessoEtapa.TRANSICAO,
        concluido: ProcessoEtapa.CONCLUIDO,
    }[normalized] ?? ProcessoEtapa.PLANEJAMENTO;
}

function toProcessoStatus(value?: string | null): ProcessoStatus {
    const normalized = normalizeLabel(value || "Ativo");
    return {
        ativo: ProcessoStatus.ATIVO,
        atencao: ProcessoStatus.ATENCAO,
        transicao: ProcessoStatus.TRANSICAO,
        planejado: ProcessoStatus.PLANEJADO,
        concluido: ProcessoStatus.CONCLUIDO,
    }[normalized] ?? ProcessoStatus.ATIVO;
}

function toObjetivoStatus(value?: string | null): ObjetivoStatus {
    const normalized = normalizeLabel(value || "Planejado");
    return {
        planejado: ObjetivoStatus.PLANEJADO,
        "em andamento": ObjetivoStatus.EM_ANDAMENTO,
        atencao: ObjetivoStatus.ATENCAO,
        concluido: ObjetivoStatus.CONCLUIDO,
    }[normalized] ?? ObjetivoStatus.PLANEJADO;
}

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

function buildFieldEvents(atual: NonNullable<Awaited<ReturnType<typeof prisma.processo.findUnique>>>, input: ProcessoInput) {
    const fields = [
        ["nome", atual.nome, input.nome],
        ["ambito", atual.ambito, input.ambito],
        ["equipe", atual.equipeTexto, input.equipe],
        ["coord_atual", atual.coordAtual, input.coord_atual],
        ["coord_futuro", atual.coordFuturo, input.coord_futuro],
        ["status", mapStatus(atual.status), input.status],
        ["data_inicio", iso(atual.dataInicio), input.data_inicio],
        ["data_prevista_fim", iso(atual.dataPrevistaFim), input.data_prevista_fim],
        ["objetivo_geral", atual.objetivoGeral, input.objetivo_geral],
        ["objetivo_inicio", iso(atual.objetivoInicio), input.objetivo_inicio],
        ["objetivo_fim_previsto", iso(atual.objetivoFimPrevisto), input.objetivo_fim_previsto],
        ["observacoes", atual.observacoes, input.observacoes],
    ];

    return fields
        .filter(([, anterior, novo]) => String(anterior ?? "") != String(novo ?? ""))
        .map(([campo, anterior, novo]) => ({
            tipo: EventoTipo.EDICAO_CAMPO,
            campo: campo as string,
            valorAnterior: String(anterior ?? ""),
            valorNovo: String(novo ?? ""),
        }));
}

export class PrismaProcessosRepository implements ProcessosRepository {
    async listProcessos(): Promise<ProcessoListItem[]> {
        const processos = await prisma.processo.findMany({ orderBy: { nome: "asc" } });
        return processos.map((processo) => ({
            id: processo.id,
            slug: processo.slug,
            nome: processo.nome,
            ambito: processo.ambito,
            equipe: processo.equipeTexto,
            coord_atual: processo.coordAtual,
            coord_futuro: processo.coordFuturo,
            etapa: mapEtapa(processo.etapa),
            etapa_desde: iso(processo.etapaDesde),
            status: mapStatus(processo.status),
            data_inicio: iso(processo.dataInicio),
            data_prevista_fim: iso(processo.dataPrevistaFim),
            data_fim: iso(processo.dataFim),
        }));
    }

    async getProcessoBySlug(slug: string): Promise<ProcessoDetalhe | null> {
        const processo = await prisma.processo.findUnique({ where: { slug } });
        if (!processo) return null;

        return {
            id: processo.id,
            slug: processo.slug,
            nome: processo.nome,
            ambito: processo.ambito,
            equipe: processo.equipeTexto,
            coord_atual: processo.coordAtual,
            coord_futuro: processo.coordFuturo,
            etapa: mapEtapa(processo.etapa),
            etapa_desde: iso(processo.etapaDesde),
            status: mapStatus(processo.status),
            data_inicio: iso(processo.dataInicio),
            data_prevista_fim: iso(processo.dataPrevistaFim),
            data_fim: iso(processo.dataFim),
            objetivo_geral: processo.objetivoGeral,
            objetivo_inicio: iso(processo.objetivoInicio),
            objetivo_fim_previsto: iso(processo.objetivoFimPrevisto),
            observacoes: processo.observacoes,
        };
    }

    async listObjetivos(slug: string): Promise<ObjetivoItem[]> {
        const processo = await prisma.processo.findUnique({
            where: { slug },
            select: { objetivos: { orderBy: { ordem: "asc" } } },
        });

        return (processo?.objetivos ?? []).map((objetivo) => ({
            id: objetivo.id,
            ordem: objetivo.ordem,
            titulo: objetivo.titulo,
            data_inicio: iso(objetivo.dataInicio),
            data_fim_prevista: iso(objetivo.dataFimPrevista),
            status: mapStatus(objetivo.status),
            criado_em: iso(objetivo.createdAt),
        }));
    }

    async listEventos(slug: string): Promise<EventoItem[]> {
        const processo = await prisma.processo.findUnique({
            where: { slug },
            select: { eventos: { orderBy: { createdAt: "desc" } } },
        });

        return (processo?.eventos ?? []).map((evento) => ({
            tipo: mapEventoTipo(evento.tipo),
            campo: evento.campo,
            valor_anterior: evento.valorAnterior,
            valor_novo: evento.valorNovo,
            observacao: evento.observacao,
            visivel: evento.visivel,
            criado_em: evento.createdAt.toISOString(),
        }));
    }

    async createProcesso(input: ProcessoInput): Promise<RepositoryMutationResult> {
        const objetivos = normalizarObjetivos(input.objetivos);

        await prisma.processo.create({
            data: {
                slug: input.slug!,
                nome: input.nome!,
                ambito: input.ambito!,
                equipeTexto: input.equipe || null,
                coordAtual: input.coord_atual || null,
                coordFuturo: input.coord_futuro || null,
                etapa: toEtapa(input.etapa),
                etapaDesde: new Date(),
                status: toProcessoStatus(input.status),
                dataInicio: parseDate(input.data_inicio) || new Date(),
                dataPrevistaFim: parseDate(input.data_prevista_fim),
                objetivoGeral: input.objetivo_geral || null,
                objetivoInicio: parseDate(input.objetivo_inicio),
                objetivoFimPrevisto: parseDate(input.objetivo_fim_previsto),
                observacoes: input.observacoes || null,
                objetivos: {
                    create: objetivos.map((objetivo, index) => ({
                        ordem: index + 1,
                        titulo: objetivo.titulo,
                        dataInicio: parseDate(objetivo.data_inicio),
                        dataFimPrevista: parseDate(objetivo.data_fim_prevista),
                        status: toObjetivoStatus(objetivo.status),
                    })),
                },
                eventos: {
                    create: [
                        { tipo: EventoTipo.CRIACAO, observacao: "Processo criado" },
                        ...objetivos.map((objetivo) => ({
                            tipo: EventoTipo.OBJETIVO,
                            observacao: `Objetivo criado: ${objetivo.titulo}`,
                            visivel: false,
                        })),
                    ],
                },
            },
        });

        return { ok: true };
    }

    async updateProcesso(slug: string, input: ProcessoInput): Promise<RepositoryMutationResult> {
        const atual = await prisma.processo.findUnique({ where: { slug }, include: { objetivos: true } });
        if (!atual) {
            return { ok: false, notFound: true };
        }

        const objetivosRecebidos = normalizarObjetivos(input.objetivos);
        const existingMap = new Map(atual.objetivos.map((objetivo) => [objetivo.id, objetivo]));
        const objetivoIdsMantidos = new Set<string>();
        const objectiveEvents: Array<{ tipo: EventoTipo; observacao: string; visivel?: boolean }> = [];
        const fieldEvents = buildFieldEvents(atual, input);
        const mudouEtapa = mapEtapa(atual.etapa) !== input.etapa;

        await prisma.$transaction(async (tx) => {
            await tx.processo.update({
                where: { slug },
                data: {
                    nome: input.nome!,
                    ambito: input.ambito!,
                    equipeTexto: input.equipe || null,
                    coordAtual: input.coord_atual || null,
                    coordFuturo: input.coord_futuro || null,
                    etapa: toEtapa(input.etapa),
                    etapaDesde: mudouEtapa ? new Date() : atual.etapaDesde,
                    status: toProcessoStatus(input.status),
                    dataInicio: parseDate(input.data_inicio),
                    dataPrevistaFim: parseDate(input.data_prevista_fim),
                    objetivoGeral: input.objetivo_geral || null,
                    objetivoInicio: parseDate(input.objetivo_inicio),
                    objetivoFimPrevisto: parseDate(input.objetivo_fim_previsto),
                    observacoes: input.observacoes || null,
                },
            });

            for (const [index, objetivo] of objetivosRecebidos.entries()) {
                const ordem = objetivo.ordem ?? index + 1;
                const objetivoId = objetivo.id ? String(objetivo.id) : null;

                if (objetivoId && existingMap.has(objetivoId)) {
                    const atualObjetivo = existingMap.get(objetivoId)!;
                    const mudou =
                        atualObjetivo.ordem !== ordem ||
                        atualObjetivo.titulo !== objetivo.titulo ||
                        String(iso(atualObjetivo.dataInicio) ?? "") !== String(objetivo.data_inicio ?? "") ||
                        String(iso(atualObjetivo.dataFimPrevista) ?? "") !== String(objetivo.data_fim_prevista ?? "") ||
                        mapStatus(atualObjetivo.status) !== objetivo.status;

                    await tx.objetivo.update({
                        where: { id: objetivoId },
                        data: {
                            ordem,
                            titulo: objetivo.titulo,
                            dataInicio: parseDate(objetivo.data_inicio),
                            dataFimPrevista: parseDate(objetivo.data_fim_prevista),
                            status: toObjetivoStatus(objetivo.status),
                        },
                    });

                    if (mudou) {
                        objectiveEvents.push({
                            tipo: EventoTipo.OBJETIVO,
                            observacao: `Objetivo atualizado: ${objetivo.titulo}`,
                            visivel: false,
                        });
                    }

                    objetivoIdsMantidos.add(objetivoId);
                    continue;
                }

                const created = await tx.objetivo.create({
                    data: {
                        processoId: atual.id,
                        ordem,
                        titulo: objetivo.titulo,
                        dataInicio: parseDate(objetivo.data_inicio),
                        dataFimPrevista: parseDate(objetivo.data_fim_prevista),
                        status: toObjetivoStatus(objetivo.status),
                    },
                });

                objetivoIdsMantidos.add(created.id);
                objectiveEvents.push({
                    tipo: EventoTipo.OBJETIVO,
                    observacao: `Objetivo criado: ${objetivo.titulo}`,
                    visivel: false,
                });
            }

            const removidos = atual.objetivos.filter((objetivo) => !objetivoIdsMantidos.has(objetivo.id));
            if (removidos.length > 0) {
                await tx.objetivo.deleteMany({ where: { id: { in: removidos.map((objetivo) => objetivo.id) } } });
                removidos.forEach((objetivo) => {
                    objectiveEvents.push({
                        tipo: EventoTipo.OBJETIVO,
                        observacao: `Objetivo removido: ${objetivo.titulo}`,
                        visivel: false,
                    });
                });
            }

            const eventsToCreate: Array<{
                tipo: EventoTipo;
                campo?: string | null;
                valorAnterior?: string | null;
                valorNovo?: string | null;
                observacao?: string | null;
                visivel?: boolean;
            }> = [...fieldEvents, ...objectiveEvents];

            if (mudouEtapa) {
                eventsToCreate.push({
                    tipo: EventoTipo.MUDANCA_ETAPA,
                    campo: "etapa",
                    valorAnterior: mapEtapa(atual.etapa),
                    valorNovo: input.etapa || "",
                });
            }

            if (eventsToCreate.length > 0) {
                await tx.processoEvento.createMany({
                    data: eventsToCreate.map((evento) => ({
                        processoId: atual.id,
                        tipo: evento.tipo,
                        campo: evento.campo || null,
                        valorAnterior: evento.valorAnterior || null,
                        valorNovo: evento.valorNovo || null,
                        observacao: evento.observacao || null,
                        visivel: evento.visivel ?? true,
                    })),
                });
            }
        });

        return { ok: true };
    }

    async deleteProcesso(slug: string): Promise<RepositoryMutationResult> {
        const processo = await prisma.processo.findUnique({ where: { slug }, select: { id: true } });
        if (!processo) {
            return { ok: false, notFound: true };
        }

        await prisma.processo.delete({ where: { slug } });
        return { ok: true };
    }

    async createObjetivo(slug: string, input: ObjetivoInput): Promise<RepositoryMutationResult> {
        const processo = await prisma.processo.findUnique({
            where: { slug },
            select: { id: true, objetivos: { select: { ordem: true }, orderBy: { ordem: "desc" }, take: 1 } },
        });

        if (!processo) {
            return { ok: false, notFound: true };
        }

        const ordem = (processo.objetivos[0]?.ordem ?? 0) + 1;

        await prisma.$transaction([
            prisma.objetivo.create({
                data: {
                    processoId: processo.id,
                    ordem,
                    titulo: input.titulo!,
                    dataInicio: parseDate(input.data_inicio),
                    dataFimPrevista: parseDate(input.data_fim_prevista),
                    status: toObjetivoStatus(input.status),
                },
            }),
            prisma.processoEvento.create({
                data: {
                    processoId: processo.id,
                    tipo: EventoTipo.OBJETIVO,
                    observacao: `Objetivo criado: ${input.titulo}`,
                    visivel: false,
                },
            }),
        ]);

        return { ok: true };
    }

    async updateObjetivo(slug: string, id: string, input: ObjetivoInput): Promise<RepositoryMutationResult> {
        const processo = await prisma.processo.findUnique({ where: { slug }, select: { id: true } });
        if (!processo) {
            return { ok: false, notFound: true };
        }

        const atual = await prisma.objetivo.findFirst({ where: { id, processoId: processo.id } });
        if (!atual) {
            return { ok: false, notFound: true };
        }

        await prisma.$transaction([
            prisma.objetivo.update({
                where: { id },
                data: {
                    titulo: input.titulo!,
                    dataInicio: parseDate(input.data_inicio),
                    dataFimPrevista: parseDate(input.data_fim_prevista),
                    status: toObjetivoStatus(input.status),
                },
            }),
            prisma.processoEvento.create({
                data: {
                    processoId: processo.id,
                    tipo: EventoTipo.OBJETIVO,
                    observacao: `Objetivo atualizado: ${input.titulo}`,
                    visivel: false,
                },
            }),
        ]);

        return { ok: true };
    }
}
