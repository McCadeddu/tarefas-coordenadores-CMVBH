import { EventoTipo, ObjetivoStatus, ProcessoEtapa, ProcessoStatus } from "@prisma/client";
import prisma from "../prisma";
import type {
    EncontroEquipeInput,
    EncontroEquipeItem,
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
        EXECUCAO: "Em curso",
        ACOMPANHAMENTO: "Acompanhamento",
        TRANSICAO: "Transição",
        CONCLUIDO: "Concluído",
    }[value];
}

function mapStatus(value: ProcessoStatus | ObjetivoStatus) {
    return {
        ATIVO: "Ativo",
        ATENCAO: "Atenção",
        TRANSICAO: "Transição",
        PLANEJADO: "Planejado",
        CONCLUIDO: "Concluído",
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
    const normalized = normalizeLabel(value);
    if (normalized === "execucao" || normalized === "em curso" || normalized === "emcurso") return ProcessoEtapa.EXECUCAO;
    if (normalized === "acompanhamento") return ProcessoEtapa.ACOMPANHAMENTO;
    if (normalized === "transicao") return ProcessoEtapa.TRANSICAO;
    if (normalized === "concluido") return ProcessoEtapa.CONCLUIDO;
    return ProcessoEtapa.PLANEJAMENTO;
}

function toProcessoStatus(value?: string | null): ProcessoStatus {
    const normalized = normalizeLabel(value);
    if (normalized === "atencao") return ProcessoStatus.ATENCAO;
    if (normalized === "transicao") return ProcessoStatus.TRANSICAO;
    if (normalized === "planejado") return ProcessoStatus.PLANEJADO;
    if (normalized === "concluido") return ProcessoStatus.CONCLUIDO;
    return ProcessoStatus.ATIVO;
}

function toObjetivoStatus(value?: string | null): ObjetivoStatus {
    const normalized = normalizeLabel(value);
    if (normalized === "em andamento" || normalized === "emandamento") return ObjetivoStatus.EM_ANDAMENTO;
    if (normalized === "atencao") return ObjetivoStatus.ATENCAO;
    if (normalized === "concluido") return ObjetivoStatus.CONCLUIDO;
    return ObjetivoStatus.PLANEJADO;
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

function normalizarPresencas(presencas: EncontroEquipeInput["presencas"]) {
    if (!Array.isArray(presencas)) return [];

    return presencas
        .map((presenca) => ({
            nome: String(presenca.nome ?? "").trim(),
            presente: Boolean(presenca.presente ?? true),
        }))
        .filter((presenca) => presenca.nome.length > 0);
}

function normalizarPautas(pautas: EncontroEquipeInput["pautas"]) {
    if (!Array.isArray(pautas)) return [];

    return pautas
        .map((pauta, index) => ({
            ordem: Number(pauta.ordem ?? index + 1),
            titulo: String(pauta.titulo ?? "").trim(),
            relatorio: pauta.relatorio?.trim() || null,
            decisao_titulo: pauta.decisao_titulo?.trim() || null,
            votos_favoraveis: Number(pauta.votos_favoraveis ?? 0),
            votos_contrarios: Number(pauta.votos_contrarios ?? 0),
            abstencoes: Number(pauta.abstencoes ?? 0),
            encaminhamento: pauta.encaminhamento?.trim() || null,
        }))
        .filter((pauta) => pauta.titulo.length > 0)
        .sort((a, b) => a.ordem - b.ordem);
}

type ProcessoEventDraft = {
    tipo: EventoTipo;
    campo?: string | null;
    valorAnterior?: string | null;
    valorNovo?: string | null;
    observacao?: string | null;
    visivel?: boolean;
};

type PrismaEncontroRecord = {
    id: string;
    titulo: string;
    dataEncontro: Date;
    pautaGeral: string | null;
    secretario: string | null;
    createdAt: Date;
    updatedAt: Date;
    processo: { slug: string };
    presencas: Array<{ id: string; nome: string; presente: boolean }>;
    pautas: Array<{
        id: string;
        ordem: number;
        titulo: string;
        relatorio: string | null;
        decisaoTitulo: string | null;
        votosFavoraveis: number;
        votosContrarios: number;
        abstencoes: number;
        encaminhamento: string | null;
    }>;
};

function mapEncontro(encontro: PrismaEncontroRecord): EncontroEquipeItem {
    return {
        id: encontro.id,
        processo_slug: encontro.processo.slug,
        titulo: encontro.titulo,
        data_encontro: encontro.dataEncontro.toISOString(),
        pauta_geral: encontro.pautaGeral,
        secretario: encontro.secretario,
        criado_em: encontro.createdAt.toISOString(),
        atualizado_em: encontro.updatedAt.toISOString(),
        presencas: encontro.presencas.map((presenca) => ({
            id: presenca.id,
            nome: presenca.nome,
            presente: presenca.presente,
        })),
        pautas: encontro.pautas.map((pauta) => ({
            id: pauta.id,
            ordem: pauta.ordem,
            titulo: pauta.titulo,
            relatorio: pauta.relatorio,
            decisao_titulo: pauta.decisaoTitulo,
            votos_favoraveis: pauta.votosFavoraveis,
            votos_contrarios: pauta.votosContrarios,
            abstencoes: pauta.abstencoes,
            encaminhamento: pauta.encaminhamento,
        })),
    };
}

type ProcessoSnapshot = Awaited<ReturnType<typeof prisma.processo.findUnique>> extends infer T ? NonNullable<T> : never;

function buildFieldEvents(atual: ProcessoSnapshot, input: ProcessoInput) {
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
        .filter(([, antigo, novo]) => String(antigo ?? "") !== String(novo ?? ""))
        .map(([campo, antigo, novo]) => ({
            tipo: EventoTipo.EDICAO_CAMPO,
            campo,
            valorAnterior: String(antigo ?? ""),
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

    async listEncontros(slug: string): Promise<EncontroEquipeItem[]> {
        const encontros = await prisma.processoEncontro.findMany({
            where: { processo: { slug } },
            orderBy: { dataEncontro: "asc" },
            include: {
                processo: { select: { slug: true } },
                presencas: { orderBy: { createdAt: "asc" } },
                pautas: { orderBy: { ordem: "asc" } },
            },
        });

        return encontros.map(mapEncontro);
    }

    async getEncontroById(slug: string, id: string): Promise<EncontroEquipeItem | null> {
        const encontro = await prisma.processoEncontro.findFirst({
            where: { id, processo: { slug } },
            include: {
                processo: { select: { slug: true } },
                presencas: { orderBy: { createdAt: "asc" } },
                pautas: { orderBy: { ordem: "asc" } },
            },
        });

        return encontro ? mapEncontro(encontro) : null;
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
        const objectiveEvents: ProcessoEventDraft[] = [];
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

            const eventsToCreate: ProcessoEventDraft[] = [...fieldEvents, ...objectiveEvents];
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
                        campo: ("campo" in evento ? evento.campo : null) || null,
                        valorAnterior: ("valorAnterior" in evento ? evento.valorAnterior : null) || null,
                        valorNovo: ("valorNovo" in evento ? evento.valorNovo : null) || null,
                        observacao: ("observacao" in evento ? evento.observacao : null) || null,
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

    async createEncontro(slug: string, input: EncontroEquipeInput): Promise<RepositoryMutationResult> {
        const processo = await prisma.processo.findUnique({ where: { slug }, select: { id: true } });
        if (!processo) {
            return { ok: false, notFound: true };
        }

        const presencas = normalizarPresencas(input.presencas);
        const pautas = normalizarPautas(input.pautas);
        const encontro = await prisma.processoEncontro.create({
            data: {
                processoId: processo.id,
                titulo: String(input.titulo ?? "").trim(),
                dataEncontro: parseDate(input.data_encontro) || new Date(),
                pautaGeral: input.pauta_geral || null,
                secretario: input.secretario || null,
                presencas: {
                    create: presencas.map((presenca) => ({
                        nome: presenca.nome,
                        presente: presenca.presente,
                    })),
                },
                pautas: {
                    create: pautas.map((pauta, index) => ({
                        ordem: pauta.ordem ?? index + 1,
                        titulo: pauta.titulo,
                        relatorio: pauta.relatorio,
                        decisaoTitulo: pauta.decisao_titulo,
                        votosFavoraveis: pauta.votos_favoraveis,
                        votosContrarios: pauta.votos_contrarios,
                        abstencoes: pauta.abstencoes,
                        encaminhamento: pauta.encaminhamento,
                    })),
                },
            },
        });

        return { ok: true, id: encontro.id };
    }

    async updateEncontro(slug: string, id: string, input: EncontroEquipeInput): Promise<RepositoryMutationResult> {
        const encontro = await prisma.processoEncontro.findFirst({
            where: { id, processo: { slug } },
            select: { id: true },
        });
        if (!encontro) {
            return { ok: false, notFound: true };
        }

        const presencas = normalizarPresencas(input.presencas);
        const pautas = normalizarPautas(input.pautas);

        await prisma.$transaction(async (tx) => {
            await tx.processoEncontro.update({
                where: { id },
                data: {
                    titulo: String(input.titulo ?? "").trim(),
                    dataEncontro: parseDate(input.data_encontro) || new Date(),
                    pautaGeral: input.pauta_geral || null,
                    secretario: input.secretario || null,
                },
            });

            await tx.processoEncontroPresenca.deleteMany({ where: { encontroId: id } });
            await tx.processoEncontroPauta.deleteMany({ where: { encontroId: id } });

            if (presencas.length > 0) {
                await tx.processoEncontroPresenca.createMany({
                    data: presencas.map((presenca) => ({
                        encontroId: id,
                        nome: presenca.nome,
                        presente: presenca.presente,
                    })),
                });
            }

            if (pautas.length > 0) {
                await tx.processoEncontroPauta.createMany({
                    data: pautas.map((pauta, index) => ({
                        encontroId: id,
                        ordem: pauta.ordem ?? index + 1,
                        titulo: pauta.titulo,
                        relatorio: pauta.relatorio,
                        decisaoTitulo: pauta.decisao_titulo,
                        votosFavoraveis: pauta.votos_favoraveis,
                        votosContrarios: pauta.votos_contrarios,
                        abstencoes: pauta.abstencoes,
                        encaminhamento: pauta.encaminhamento,
                    })),
                });
            }
        });

        return { ok: true, id };
    }
}
