"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { formatDateForDisplay, formatDateForInput, normalizeDateInput } from "@/lib/shared/date";

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
    processo_slug: string;
    titulo: string;
    data_encontro: string;
    pauta_geral: string | null;
    secretario: string | null;
    criado_em: string;
    atualizado_em: string;
    presencas: EncontroPresenca[];
    pautas: EncontroPauta[];
};

type FormState = {
    titulo: string;
    data_encontro: string;
    pauta_geral: string;
    secretario: string;
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

type Props = {
    slug: string;
    objetivos: Objetivo[];
    encontros: Encontro[];
    onSaved: () => Promise<void>;
};

function blankForm(): FormState {
    return {
        titulo: "",
        data_encontro: formatDateForInput(new Date()),
        pauta_geral: "",
        secretario: "",
        presencas: [{ nome: "", presente: true }],
        pautas: [
            {
                ordem: 1,
                titulo: "",
                relatorio: "",
                decisao_titulo: "",
                votos_favoraveis: 0,
                votos_contrarios: 0,
                abstencoes: 0,
                encaminhamento: "",
            },
        ],
    };
}

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
                    3
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

function TimelineAnual({ objetivos, encontros }: { objetivos: Objetivo[]; encontros: Encontro[] }) {
    const anoAtual = new Date().getFullYear();
    const meses = Array.from({ length: 12 }, (_, index) =>
        new Date(anoAtual, index, 1).toLocaleDateString("pt-BR", { month: "short" })
    );

    const objetivosNoAno = useMemo(() => calcularObjetivosTimeline(objetivos, anoAtual), [objetivos, anoAtual]);
    const encontrosNoAno = useMemo(() => calcularEncontrosTimeline(encontros, anoAtual), [encontros, anoAtual]);

    const objetivosHeight =
        Math.max(objetivosNoAno.reduce((max, objetivo) => Math.max(max, objetivo.lane), 0), 0) * 42 + 52;
    const encontrosHeight =
        Math.max(encontrosNoAno.reduce((max, encontro) => Math.max(max, encontro.lane), 0), 0) * 86 + 76;

    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                    <h3 className="text-base font-semibold text-slate-800">Linha do tempo anual</h3>
                    <p className="text-xs text-slate-500">
                        Ano em curso, objetivos ativos e encontros programados.
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
                                    style={{ height: `${objetivosHeight}px` }}
                                />
                            ))}
                        </div>

                        <div className="pointer-events-none absolute inset-x-4 top-6" style={{ height: `${objetivosHeight}px` }}>
                            {objetivosNoAno.length === 0 && (
                                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                                    Nenhum objetivo com datas neste ano.
                                </div>
                            )}

                            {objetivosNoAno.map((objetivo) => (
                                <div
                                    key={objetivo.id}
                                    className="absolute rounded-full border border-emerald-200 bg-emerald-100/90 px-3 py-2 text-xs text-emerald-950 shadow-sm"
                                    style={{
                                        left: `${objetivo.left}%`,
                                        top: `${objetivo.lane * 42}px`,
                                        width: `calc(${objetivo.width}% - 8px)`,
                                    }}
                                >
                                    <p className="truncate font-semibold">
                                        {objetivo.ordem}. {objetivo.titulo}
                                    </p>
                                    <p className="truncate text-[11px] text-emerald-800">
                                        {objetivo.status || "Planejado"} • {formatDateForDisplay(objetivo.data_inicio)} até {formatDateForDisplay(objetivo.data_fim_prevista)}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div
                            className="relative border-t border-slate-200 pt-6"
                            style={{ marginTop: `${objetivosHeight + 16}px`, minHeight: `${encontrosHeight}px` }}
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
        </div>
    );
}

export default function EncontrosEquipeSection({ slug, objetivos, encontros, onSaved }: Props) {
    const [form, setForm] = useState<FormState>(blankForm());
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | number | null>(null);

    useEffect(() => {
        if (editingId == null) {
            setForm(blankForm());
        }
    }, [editingId]);

    const encontrosOrdenados = useMemo(
        () => [...encontros].sort((a, b) => new Date(a.data_encontro).getTime() - new Date(b.data_encontro).getTime()),
        [encontros]
    );

    function preencherFormulario(encontro: Encontro) {
        setEditingId(encontro.id);
        setForm({
            titulo: encontro.titulo,
            data_encontro: normalizeDateInput(encontro.data_encontro),
            pauta_geral: encontro.pauta_geral || "",
            secretario: encontro.secretario || "",
            presencas:
                encontro.presencas.length > 0
                    ? encontro.presencas.map((presenca) => ({ ...presenca }))
                    : [{ nome: "", presente: true }],
            pautas:
                encontro.pautas.length > 0
                    ? encontro.pautas.map((pauta) => ({
                        ...pauta,
                        relatorio: pauta.relatorio || "",
                        decisao_titulo: pauta.decisao_titulo || "",
                        encaminhamento: pauta.encaminhamento || "",
                    }))
                    : blankForm().pautas,
        });
        setError(null);
    }

    async function salvarEncontro(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaving(true);
        setError(null);

        try {
            const payload = {
                ...form,
                presencas: form.presencas.filter((presenca) => presenca.nome.trim().length > 0),
                pautas: form.pautas
                    .filter((pauta) => pauta.titulo.trim().length > 0)
                    .map((pauta, index) => ({ ...pauta, ordem: index + 1 })),
            };

            const response = await fetch(
                editingId == null
                    ? `/api/processos/${slug}/encontros`
                    : `/api/processos/${slug}/encontros/${editingId}`,
                {
                    method: editingId == null ? "POST" : "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                }
            );

            if (!response.ok) {
                const body = await response.json().catch(() => null);
                throw new Error(body?.error || "Não foi possível salvar o encontro.");
            }

            setEditingId(null);
            setForm(blankForm());
            await onSaved();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erro ao salvar encontro.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <section className="space-y-6">
            <TimelineAnual objetivos={objetivos} encontros={encontrosOrdenados} />

            <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
                <form onSubmit={salvarEncontro} className="space-y-5 rounded-2xl bg-white p-5 shadow">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-semibold text-[var(--cmv-blue)]">Encontros de Equipe</h2>
                            <p className="text-sm text-slate-500">
                                Cadastre encontros, pauta, presenças, decisões e relatório para gerar o PDF compartilhável.
                            </p>
                        </div>
                        {editingId != null && (
                            <button
                                type="button"
                                onClick={() => {
                                    setEditingId(null);
                                    setForm(blankForm());
                                    setError(null);
                                }}
                                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600"
                            >
                                Novo encontro
                            </button>
                        )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="space-y-1 text-sm">
                            <span className="font-medium text-slate-700">Título do encontro</span>
                            <input
                                className="w-full rounded-xl border border-slate-200 px-3 py-2"
                                value={form.titulo}
                                onChange={(event) => setForm((current) => ({ ...current, titulo: event.target.value }))}
                                required
                            />
                        </label>
                        <label className="space-y-1 text-sm">
                            <span className="font-medium text-slate-700">Data</span>
                            <input
                                type="date"
                                className="w-full rounded-xl border border-slate-200 px-3 py-2"
                                value={form.data_encontro}
                                onChange={(event) => setForm((current) => ({ ...current, data_encontro: event.target.value }))}
                                required
                            />
                        </label>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="space-y-1 text-sm">
                            <span className="font-medium text-slate-700">Secretário do encontro</span>
                            <input
                                className="w-full rounded-xl border border-slate-200 px-3 py-2"
                                value={form.secretario}
                                onChange={(event) => setForm((current) => ({ ...current, secretario: event.target.value }))}
                            />
                        </label>
                        <label className="space-y-1 text-sm">
                            <span className="font-medium text-slate-700">Pauta geral</span>
                            <textarea
                                className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2"
                                value={form.pauta_geral}
                                onChange={(event) => setForm((current) => ({ ...current, pauta_geral: event.target.value }))}
                            />
                        </label>
                    </div>

                    <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between gap-3">
                            <h3 className="font-semibold text-slate-800">Presenças</h3>
                            <button
                                type="button"
                                onClick={() =>
                                    setForm((current) => ({
                                        ...current,
                                        presencas: [...current.presencas, { nome: "", presente: true }],
                                    }))
                                }
                                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                            >
                                + Adicionar presença
                            </button>
                        </div>

                        {form.presencas.map((presenca, index) => (
                            <div key={`presenca-${index}`} className="grid gap-3 md:grid-cols-[1fr,120px,100px]">
                                <input
                                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                    placeholder="Nome da pessoa"
                                    value={presenca.nome}
                                    onChange={(event) => {
                                        const nome = event.target.value;
                                        setForm((current) => ({
                                            ...current,
                                            presencas: current.presencas.map((item, itemIndex) =>
                                                itemIndex === index ? { ...item, nome } : item
                                            ),
                                        }));
                                    }}
                                />
                                <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
                                    <input
                                        type="checkbox"
                                        checked={presenca.presente}
                                        onChange={(event) => {
                                            const presente = event.target.checked;
                                            setForm((current) => ({
                                                ...current,
                                                presencas: current.presencas.map((item, itemIndex) =>
                                                    itemIndex === index ? { ...item, presente } : item
                                                ),
                                            }));
                                        }}
                                    />
                                    Presente
                                </label>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setForm((current) => ({
                                            ...current,
                                            presencas:
                                                current.presencas.length === 1
                                                    ? [{ nome: "", presente: true }]
                                                    : current.presencas.filter((_, itemIndex) => itemIndex !== index),
                                        }))
                                    }
                                    className="rounded-xl border border-rose-200 px-3 py-2 text-sm text-rose-600"
                                >
                                    Remover
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h3 className="font-semibold text-slate-800">Pauta e relatório</h3>
                                <p className="text-xs text-slate-500">
                                    Cada item vira um bloco do relatório para ser preenchido durante o encontro.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() =>
                                    setForm((current) => ({
                                        ...current,
                                        pautas: [
                                            ...current.pautas,
                                            {
                                                ordem: current.pautas.length + 1,
                                                titulo: "",
                                                relatorio: "",
                                                decisao_titulo: "",
                                                votos_favoraveis: 0,
                                                votos_contrarios: 0,
                                                abstencoes: 0,
                                                encaminhamento: "",
                                            },
                                        ],
                                    }))
                                }
                                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                            >
                                + Novo item
                            </button>
                        </div>

                        {form.pautas.map((pauta, index) => (
                            <div key={`pauta-${index}`} className="space-y-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <h4 className="font-semibold text-slate-800">Pauta {index + 1}</h4>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setForm((current) => ({
                                                ...current,
                                                pautas:
                                                    current.pautas.length === 1
                                                        ? blankForm().pautas
                                                        : current.pautas
                                                            .filter((_, itemIndex) => itemIndex !== index)
                                                            .map((item, itemIndex) => ({ ...item, ordem: itemIndex + 1 })),
                                            }))
                                        }
                                        className="text-xs font-medium text-rose-600"
                                    >
                                        Remover item
                                    </button>
                                </div>

                                <input
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                    placeholder="Título do ponto de pauta"
                                    value={pauta.titulo}
                                    onChange={(event) => {
                                        const titulo = event.target.value;
                                        setForm((current) => ({
                                            ...current,
                                            pautas: current.pautas.map((item, itemIndex) =>
                                                itemIndex === index ? { ...item, titulo } : item
                                            ),
                                        }));
                                    }}
                                />

                                <textarea
                                    className="min-h-28 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                    placeholder="Relatório do que foi discutido"
                                    value={pauta.relatorio || ""}
                                    onChange={(event) => {
                                        const relatorio = event.target.value;
                                        setForm((current) => ({
                                            ...current,
                                            pautas: current.pautas.map((item, itemIndex) =>
                                                itemIndex === index ? { ...item, relatorio } : item
                                            ),
                                        }));
                                    }}
                                />

                                <div className="grid gap-3 md:grid-cols-2">
                                    <input
                                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                        placeholder="Decisão a ser votada"
                                        value={pauta.decisao_titulo || ""}
                                        onChange={(event) => {
                                            const decisao_titulo = event.target.value;
                                            setForm((current) => ({
                                                ...current,
                                                pautas: current.pautas.map((item, itemIndex) =>
                                                    itemIndex === index ? { ...item, decisao_titulo } : item
                                                ),
                                            }));
                                        }}
                                    />
                                    <input
                                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                        placeholder="Encaminhamento"
                                        value={pauta.encaminhamento || ""}
                                        onChange={(event) => {
                                            const encaminhamento = event.target.value;
                                            setForm((current) => ({
                                                ...current,
                                                pautas: current.pautas.map((item, itemIndex) =>
                                                    itemIndex === index ? { ...item, encaminhamento } : item
                                                ),
                                            }));
                                        }}
                                    />
                                </div>

                                <div className="grid gap-3 sm:grid-cols-3">
                                    {[
                                        ["votos_favoraveis", "Votos favoráveis"],
                                        ["votos_contrarios", "Votos contrários"],
                                        ["abstencoes", "Abstenções"],
                                    ].map(([campo, label]) => (
                                        <label key={campo} className="space-y-1 text-sm">
                                            <span className="font-medium text-slate-700">{label}</span>
                                            <input
                                                type="number"
                                                min={0}
                                                className="w-full rounded-xl border border-slate-200 px-3 py-2"
                                                value={pauta[campo as keyof EncontroPauta] as number}
                                                onChange={(event) => {
                                                    const valor = Number(event.target.value || 0);
                                                    setForm((current) => ({
                                                        ...current,
                                                        pautas: current.pautas.map((item, itemIndex) =>
                                                            itemIndex === index ? { ...item, [campo]: valor } : item
                                                        ),
                                                    }));
                                                }}
                                            />
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

                    <button
                        type="submit"
                        disabled={saving}
                        className="rounded-xl bg-[var(--cmv-blue)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                    >
                        {saving ? "Salvando..." : editingId == null ? "Salvar encontro" : "Atualizar encontro"}
                    </button>
                </form>

                <div className="space-y-4">
                    {encontrosOrdenados.length === 0 ? (
                        <div className="rounded-2xl bg-white p-5 text-sm text-slate-500 shadow">
                            Nenhum encontro cadastrado ainda.
                        </div>
                    ) : (
                        encontrosOrdenados.map((encontro) => (
                            <article key={encontro.id} className="rounded-2xl bg-white p-5 shadow">
                                <div className="flex items-start justify-between gap-4">
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
                                        <button
                                            type="button"
                                            onClick={() => preencherFormulario(encontro)}
                                            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700"
                                        >
                                            Editar
                                        </button>
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

                                <div className="mt-4 grid gap-4 md:grid-cols-2">
                                    <div>
                                        <h4 className="mb-2 text-sm font-semibold text-slate-700">Presenças</h4>
                                        <ul className="space-y-2 text-sm text-slate-600">
                                            {encontro.presencas.map((presenca, index) => (
                                                <li
                                                    key={`${encontro.id}-presenca-${index}`}
                                                    className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"
                                                >
                                                    <span>{presenca.nome}</span>
                                                    <span
                                                        className={`rounded-full px-2 py-1 text-xs font-medium ${presenca.presente ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}
                                                    >
                                                        {presenca.presente ? "Presente" : "Ausente"}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div>
                                        <h4 className="mb-2 text-sm font-semibold text-slate-700">Itens de pauta</h4>
                                        <div className="space-y-3">
                                            {encontro.pautas.map((pauta) => (
                                                <div key={pauta.id || pauta.ordem} className="rounded-xl border border-slate-200 p-3">
                                                    <h5 className="text-sm font-semibold text-slate-800">
                                                        {pauta.ordem}. {pauta.titulo}
                                                    </h5>
                                                    {pauta.relatorio && (
                                                        <p className="mt-2 text-sm text-slate-600">{pauta.relatorio}</p>
                                                    )}
                                                    {pauta.decisao_titulo && (
                                                        <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
                                                            <p className="font-semibold">Decisão: {pauta.decisao_titulo}</p>
                                                            <p>
                                                                Favoráveis: {pauta.votos_favoraveis} • Contrários: {pauta.votos_contrarios} • Abstenções: {pauta.abstencoes}
                                                            </p>
                                                            {pauta.encaminhamento && (
                                                                <p className="mt-1">Encaminhamento: {pauta.encaminhamento}</p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </article>
                        ))
                    )}
                </div>
            </div>
        </section>
    );
}
