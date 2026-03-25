"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateForInput, normalizeDateInput } from "@/lib/shared/date";

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

type FormState = {
    titulo: string;
    data_encontro: string;
    pauta_geral: string;
    secretario: string;
    presencas: EncontroPresenca[];
    pautas: EncontroPauta[];
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

function normalizeForm(encontro?: Encontro | null): FormState {
    if (!encontro) return blankForm();

    return {
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
    };
}

export default function FormEncontroEquipe({
    slug,
    encontro,
    title,
}: {
    slug: string;
    encontro?: Encontro | null;
    title: string;
}) {
    const router = useRouter();
    const [form, setForm] = useState<FormState>(normalizeForm(encontro));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setForm(normalizeForm(encontro));
    }, [encontro]);

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
                encontro
                    ? `/api/processos/${slug}/encontros/${encontro.id}`
                    : `/api/processos/${slug}/encontros`,
                {
                    method: encontro ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                }
            );

            if (!response.ok) {
                const body = await response.json().catch(() => null);
                throw new Error(body?.error || "N\u00e3o foi poss\u00edvel salvar o encontro.");
            }

            router.push(`/processos/${slug}`);
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erro ao salvar encontro.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <form onSubmit={salvarEncontro} className="space-y-5 rounded-2xl bg-white p-5 shadow">
            <div>
                <h1 className="text-xl font-bold text-[var(--cmv-blue)]">{title}</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Preencha data, pauta, presen\u00e7as, relat\u00f3rio e decis\u00f5es. Depois o encontro poder\u00e1 ser reaberto e exportado em PDF.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm">
                    <span className="font-medium text-slate-700">T\u00edtulo do encontro</span>
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
                    <span className="font-medium text-slate-700">Secret\u00e1rio do encontro</span>
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
                    <h2 className="font-semibold text-slate-800">Presen\u00e7as</h2>
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
                        + Adicionar presen\u00e7a
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
                        <h2 className="font-semibold text-slate-800">Pauta e relat\u00f3rio</h2>
                        <p className="text-xs text-slate-500">
                            Cada item vira um bloco do relat\u00f3rio do encontro.
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
                            <h3 className="font-semibold text-slate-800">Pauta {index + 1}</h3>
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
                            placeholder="T\u00edtulo do ponto de pauta"
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
                            placeholder="Relat\u00f3rio do que foi discutido"
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
                                placeholder="Decis\u00e3o a ser votada"
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
                                ["votos_favoraveis", "Votos favor\u00e1veis"],
                                ["votos_contrarios", "Votos contr\u00e1rios"],
                                ["abstencoes", "Absten\u00e7\u00f5es"],
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

            <div className="flex gap-3">
                <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-[var(--cmv-blue)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                    {saving ? "Salvando..." : encontro ? "Atualizar encontro" : "Salvar encontro"}
                </button>
                <button
                    type="button"
                    onClick={() => router.push(`/processos/${slug}`)}
                    className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
                >
                    Cancelar
                </button>
                {encontro && (
                    <a
                        href={`/api/processos/${slug}/encontros/${encontro.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl border border-amber-200 px-4 py-3 text-sm font-semibold text-amber-800"
                    >
                        PDF do relat\u00f3rio
                    </a>
                )}
            </div>
        </form>
    );
}
