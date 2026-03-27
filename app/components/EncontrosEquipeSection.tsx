"use client";

import Link from "next/link";
import { useMemo } from "react";
import { formatDateForDisplay } from "@/lib/shared/date";

type ProcessoResumo = {
    nome: string;
    etapa: string | null;
    status: string | null;
    equipe: string | null;
    coord_atual: string | null;
    coord_futuro: string | null;
};

type Objetivo = {
    id: number | string;
    ordem: number;
    titulo: string;
    data_inicio: string | null;
    data_fim_prevista: string | null;
    status: string | null;
};

type EncontroPresenca = {
    id?: number | string;
    nome: string;
    presente: boolean;
};

type EncontroPauta = {
    id?: number | string;
    ordem: number;
    titulo: string;
    relatorio: string | null;
    decisao_titulo: string | null;
    votos_favoraveis: number;
    votos_contrarios: number;
    abstencoes: number;
    encaminhamento: string | null;
};

type Encontro = {
    id: number | string;
    titulo: string;
    data_encontro: string;
    pauta_geral: string | null;
    secretario: string | null;
    presencas: EncontroPresenca[];
    pautas: EncontroPauta[];
};

type ObjetivoTimeline = Objetivo & {
    left: number;
    width: number;
    lane: number;
    startMs: number;
    endMs: number;
};

type EncontroTimeline = Encontro & {
    left: number;
    lane: number;
    dateMs: number;
};

function inicioDoAno(ano: number) {
    return new Date(ano, 0, 1);
}

function fimDoAno(ano: number) {
    return new Date(ano, 11, 31, 23, 59, 59, 999);
}

function clampDate(date: Date, min: Date, max: Date) {
    if (date < min) return min;
    if (date > max) return max;
    return date;
}

function porcentagemNoAno(data: Date, ano: number) {
    const inicio = inicioDoAno(ano).getTime();
    const fim = fimDoAno(ano).getTime();
    return ((data.getTime() - inicio) / (fim - inicio)) * 100;
}

function corStatusObjetivo(status: string | null | undefined) {
    if (status === "Concluído") {
        return {
            bg: "rgba(134, 239, 172, 0.9)",
            border: "#22c55e",
            text: "#14532d",
        };
    }
    if (status === "Atenção") {
        return {
            bg: "rgba(253, 230, 138, 0.95)",
            border: "#eab308",
            text: "#854d0e",
        };
    }
    if (status === "Transição") {
        return {
            bg: "rgba(253, 186, 116, 0.95)",
            border: "#f97316",
            text: "#9a3412",
        };
    }
    if (status === "Em andamento") {
        return {
            bg: "rgba(125, 211, 252, 0.95)",
            border: "#0ea5e9",
            text: "#0c4a6e",
        };
    }

    return {
        bg: "rgba(165, 243, 252, 0.95)",
        border: "#06b6d4",
        text: "#164e63",
    };
}

function corStatusProcesso(status: string | null | undefined) {
    if (status === "Concluído") return "#2563eb";
    if (status === "Ativo") return "#16a34a";
    if (status === "Atenção") return "#d97706";
    if (status === "Transição") return "#ea580c";
    if (status === "Planejado") return "#64748b";
    return "#0f766e";
}

function calcularObjetivosTimeline(objetivos: Objetivo[], anoAtual: number) {
    const objetivosNoAno = objetivos
        .map((objetivo) => {
            if (!objetivo.data_inicio || !objetivo.data_fim_prevista) return null;

            const inicio = new Date(objetivo.data_inicio);
            const fim = new Date(objetivo.data_fim_prevista);
            if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) return null;
            if (fim < inicioDoAno(anoAtual) || inicio > fimDoAno(anoAtual)) return null;

            const inicioClamped = clampDate(inicio, inicioDoAno(anoAtual), fimDoAno(anoAtual));
            const fimClamped = clampDate(fim, inicioDoAno(anoAtual), fimDoAno(anoAtual));

            return {
                ...objetivo,
                left: porcentagemNoAno(inicioClamped, anoAtual),
                width: Math.max(
                    porcentagemNoAno(fimClamped, anoAtual) - porcentagemNoAno(inicioClamped, anoAtual),
                    8
                ),
                lane: 0,
                startMs: inicioClamped.getTime(),
                endMs: fimClamped.getTime(),
            } satisfies ObjetivoTimeline;
        })
        .filter(Boolean) as ObjetivoTimeline[];

    const lanesFim: number[] = [];
    objetivosNoAno
        .sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs)
        .forEach((objetivo) => {
            let lane = lanesFim.findIndex((fim) => fim < objetivo.startMs);
            if (lane === -1) {
                lane = lanesFim.length;
                lanesFim.push(objetivo.endMs);
            } else {
                lanesFim[lane] = objetivo.endMs;
            }
            objetivo.lane = lane;
        });

    return objetivosNoAno;
}

function calcularEncontrosTimeline(encontros: Encontro[], anoAtual: number) {
    const encontrosNoAno = encontros
        .filter((encontro) => new Date(encontro.data_encontro).getFullYear() === anoAtual)
        .map((encontro) => ({
            ...encontro,
            left: porcentagemNoAno(new Date(encontro.data_encontro), anoAtual),
            lane: 0,
            dateMs: new Date(encontro.data_encontro).getTime(),
        }))
        .sort((a, b) => a.dateMs - b.dateMs) as EncontroTimeline[];

    const laneLastLeft: number[] = [];
    encontrosNoAno.forEach((encontro) => {
        let lane = laneLastLeft.findIndex((ultimoLeft) => Math.abs(encontro.left - ultimoLeft) > 9);
        if (lane === -1) {
            lane = laneLastLeft.length;
            laneLastLeft.push(encontro.left);
        } else {
            laneLastLeft[lane] = encontro.left;
        }
        encontro.lane = lane;
    });

    return encontrosNoAno;
}

function TimelineAnual({
    processo,
    objetivos,
    encontros,
}: {
    processo: ProcessoResumo;
    objetivos: Objetivo[];
    encontros: Encontro[];
}) {
    const anoAtual = new Date().getFullYear();
    const meses = Array.from({ length: 12 }, (_, index) =>
        new Date(anoAtual, index, 1).toLocaleDateString("pt-BR", { month: "short" })
    );

    const objetivosNoAno = useMemo(() => calcularObjetivosTimeline(objetivos, anoAtual), [objetivos, anoAtual]);
    const encontrosNoAno = useMemo(() => calcularEncontrosTimeline(encontros, anoAtual), [encontros, anoAtual]);
    const equipeLista = useMemo(
        () => (processo.equipe || "").split(",").map((item) => item.trim()).filter(Boolean),
        [processo.equipe]
    );

    const objetivosHeight =
        Math.max(objetivosNoAno.reduce((max, objetivo) => Math.max(max, objetivo.lane), 0), 0) * 72 + 76;
    const encontrosHeight =
        Math.max(encontrosNoAno.reduce((max, encontro) => Math.max(max, encontro.lane), 0), 0) * 86 + 76;

    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                    <h3 className="text-base font-semibold text-slate-800">Linha do tempo anual</h3>
                    <p className="text-xs text-slate-500">
                        Ano em curso com o painel do processo, os objetivos ativos e os encontros programados.
                    </p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
                    {anoAtual}
                </span>
            </div>

            <div className="overflow-x-auto">
                <div className="min-w-[960px]">
                    <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        {meses.map((mes) => (
                            <div key={mes} className="rounded-full bg-white px-2 py-1 text-center shadow-sm">
                                {mes}
                            </div>
                        ))}
                    </div>

                    <div className="relative mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="grid grid-cols-12 gap-2">
                            {meses.map((mes, index) => (
                                <div
                                    key={`${mes}-${index}`}
                                    className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60"
                                    style={{ height: `${objetivosHeight + encontrosHeight + 184}px` }}
                                />
                            ))}
                        </div>

                        <div className="absolute inset-x-4 top-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
                            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                        Painel do processo no ano
                                    </p>
                                    <h4 className="text-sm font-semibold text-slate-800">{processo.nome}</h4>
                                    <p className="text-xs text-slate-500">
                                        {processo.etapa || "Sem etapa"} • {processo.status || "Sem status"}
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2 text-xs">
                                    <span className="rounded-full bg-white px-3 py-1 text-slate-600 shadow-sm">
                                        Equipe: {equipeLista.length || 0}
                                    </span>
                                    <span className="rounded-full bg-white px-3 py-1 text-slate-600 shadow-sm">
                                        Coordenação atual: {processo.coord_atual || "Não definida"}
                                    </span>
                                    <span className="rounded-full bg-white px-3 py-1 text-slate-600 shadow-sm">
                                        Coordenação futura: {processo.coord_futuro || "Sem transição"}
                                    </span>
                                </div>
                            </div>

                            <div className="relative h-14 rounded-full bg-white px-4 py-3 shadow-inner">
                                <div
                                    className="absolute left-4 right-4 top-1/2 h-3 -translate-y-1/2 rounded-full opacity-85"
                                    style={{ backgroundColor: corStatusProcesso(processo.status) }}
                                />
                                <div className="relative flex h-full items-center justify-between text-[11px] font-medium text-slate-700">
                                    <span className="rounded-full bg-white/95 px-2 py-1 shadow">Início do ano</span>
                                    <span className="rounded-full bg-white/95 px-2 py-1 shadow">
                                        Equipe: {equipeLista.length || 0} pessoa(s)
                                    </span>
                                    <span className="rounded-full bg-white/95 px-2 py-1 shadow">Fim do ano</span>
                                </div>
                            </div>
                        </div>

                        <div
                            className="pointer-events-none absolute inset-x-4"
                            style={{ top: "148px", height: `${objetivosHeight}px` }}
                        >
                            {objetivosNoAno.length === 0 && (
                                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                                    Nenhum objetivo com datas neste ano.
                                </div>
                            )}

                            {objetivosNoAno.map((objetivo) => {
                                const cores = corStatusObjetivo(objetivo.status);

                                return (
                                    <div
                                        key={objetivo.id}
                                        className="absolute rounded-2xl border px-3 py-2 text-xs shadow-sm"
                                        style={{
                                            left: `${objetivo.left}%`,
                                            top: `${objetivo.lane * 72}px`,
                                            width: `calc(${objetivo.width}% - 8px)`,
                                            minWidth: "150px",
                                            backgroundColor: cores.bg,
                                            borderColor: cores.border,
                                            color: cores.text,
                                        }}
                                        title={objetivo.titulo}
                                    >
                                        <p className="line-clamp-2 font-semibold">
                                            {objetivo.ordem}. {objetivo.titulo}
                                        </p>
                                        <p className="mt-1 text-[11px] opacity-80">
                                            {objetivo.status || "Planejado"} • {formatDateForDisplay(objetivo.data_inicio)} até{" "}
                                            {formatDateForDisplay(objetivo.data_fim_prevista)}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>

                        <div
                            className="relative border-t border-slate-200 pt-6"
                            style={{ marginTop: `${objetivosHeight + 160}px`, minHeight: `${encontrosHeight}px` }}
                        >
                            <div className="absolute inset-x-0 top-6 h-[2px] bg-slate-200" />

                            {encontrosNoAno.map((encontro) => (
                                <div
                                    key={encontro.id}
                                    className="absolute -translate-x-1/2"
                                    style={{ left: `${encontro.left}%`, top: `${encontro.lane * 86}px` }}
                                >
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="h-4 w-4 rounded-full border-4 border-white bg-[var(--cmv-blue)] shadow" />
                                        <div className="w-44 rounded-xl bg-[var(--cmv-beige)] px-3 py-2 text-center text-xs text-[var(--cmv-brown)] shadow-sm">
                                            <p className="font-semibold">{encontro.titulo}</p>
                                            <p>{formatDateForDisplay(encontro.data_encontro)}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {encontrosNoAno.length === 0 && (
                                <div className="pt-2 text-sm text-slate-400">
                                    Nenhum encontro planejado neste ano.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-600">
                <span className="rounded-full bg-white px-3 py-1 shadow-sm">Processo ativo no ano</span>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-800 shadow-sm">Objetivo concluído</span>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800 shadow-sm">Objetivo em atenção</span>
                <span className="rounded-full bg-orange-100 px-3 py-1 text-orange-800 shadow-sm">Objetivo em transição</span>
                <span className="rounded-full bg-sky-100 px-3 py-1 text-sky-800 shadow-sm">Objetivo em andamento</span>
                <span className="rounded-full bg-cyan-100 px-3 py-1 text-cyan-800 shadow-sm">Objetivo planejado</span>
            </div>
        </div>
    );
}

export default function EncontrosEquipeSection({
    slug,
    processo,
    objetivos,
    encontros,
}: {
    slug: string;
    processo: ProcessoResumo;
    objetivos: Objetivo[];
    encontros: Encontro[];
}) {
    const encontrosOrdenados = useMemo(
        () => [...encontros].sort((a, b) => new Date(a.data_encontro).getTime() - new Date(b.data_encontro).getTime()),
        [encontros]
    );

    return (
        <section className="space-y-6">
            <TimelineAnual processo={processo} objetivos={objetivos} encontros={encontrosOrdenados} />

            <div className="space-y-4 rounded-2xl bg-white p-5 shadow">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-semibold text-[var(--cmv-blue)]">Encontros de Equipe</h2>
                        <p className="text-sm text-slate-500">
                            Cadastre encontros em uma página própria, reabra depois para completar o relatório
                            e exporte em PDF.
                        </p>
                    </div>
                    <Link
                        href={`/processos/${slug}/encontros/novo`}
                        className="rounded-xl border border-[var(--cmv-blue)] bg-white px-4 py-3 text-sm font-semibold text-[var(--cmv-blue)] shadow-sm"
                    >
                        Encontro Equipe
                    </Link>
                </div>

                {encontrosOrdenados.length === 0 ? (
                    <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
                        Nenhum encontro cadastrado ainda.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {encontrosOrdenados.map((encontro) => (
                            <article key={encontro.id} className="rounded-2xl border border-slate-200 p-5">
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                            Encontro de equipe
                                        </p>
                                        <h3 className="text-lg font-semibold text-slate-800">{encontro.titulo}</h3>
                                        <p className="text-sm text-slate-500">
                                            {formatDateForDisplay(encontro.data_encontro)}
                                            {encontro.secretario ? ` • Secretário: ${encontro.secretario}` : ""}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Link
                                            href={`/processos/${slug}/encontros/${encontro.id}`}
                                            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700"
                                        >
                                            Reabrir
                                        </Link>
                                        <a
                                            href={`/api/processos/${slug}/encontros/${encontro.id}/pdf`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="rounded-full bg-[var(--cmv-beige)] px-3 py-1 text-xs font-medium text-[var(--cmv-brown)]"
                                        >
                                            PDF do relatório
                                        </a>
                                    </div>
                                </div>

                                {encontro.pauta_geral && (
                                    <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                                        {encontro.pauta_geral}
                                    </p>
                                )}
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
