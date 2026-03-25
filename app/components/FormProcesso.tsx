"use client";

import type { ChangeEvent, FormEvent } from "react";
import Link from "next/link";
import { useState } from "react";

type ObjetivoForm = {
    id?: number | string;
    ordem?: number;
    titulo: string;
    data_inicio: string;
    data_fim_prevista: string;
    status: string;
};

type ProcessoForm = {
    nome: string;
    ambito: string;
    equipe: string;
    coord_atual: string;
    coord_futuro: string;
    etapa: string;
    status: string;
    data_inicio: string;
    data_prevista_fim: string;
    objetivo_geral: string;
    objetivo_inicio?: string;
    objetivo_fim_previsto?: string;
    observacoes: string;
    objetivos: ObjetivoForm[];
};

function normalizarDataInput(valor?: string | null) {
    if (!valor) return "";

    const texto = String(valor).trim();
    const match = texto.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];

    const data = new Date(texto);
    if (Number.isNaN(data.getTime())) return "";

    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
}

function normalizarEtapa(valor?: string | null) {
    if (!valor) return "Planejamento";
    if (valor === "Execu\u00e7\u00e3o") return "Em curso";
    return valor;
}

function normalizarObjetivo(objetivo: Partial<ObjetivoForm>): ObjetivoForm {
    return {
        id: objetivo.id,
        ordem: objetivo.ordem,
        titulo: objetivo.titulo ?? "",
        data_inicio: normalizarDataInput(objetivo.data_inicio),
        data_fim_prevista: normalizarDataInput(objetivo.data_fim_prevista),
        status: objetivo.status ?? "Planejado",
    };
}

function normalizarForm(data: Partial<ProcessoForm>): ProcessoForm {
    return {
        nome: data.nome ?? "",
        ambito: data.ambito ?? "Miss?o",
        equipe: data.equipe ?? "",
        coord_atual: data.coord_atual ?? "",
        coord_futuro: data.coord_futuro ?? "",
        etapa: normalizarEtapa(data.etapa),
        status: data.status ?? "Ativo",
        data_inicio: normalizarDataInput(data.data_inicio),
        data_prevista_fim: normalizarDataInput(data.data_prevista_fim),
        objetivo_geral: data.objetivo_geral ?? "",
        objetivo_inicio: normalizarDataInput(data.objetivo_inicio),
        objetivo_fim_previsto: normalizarDataInput(data.objetivo_fim_previsto),
        observacoes: data.observacoes ?? "",
        objetivos: Array.isArray(data.objetivos) ? data.objetivos.map(normalizarObjetivo) : [],
    };
}

const objetivoVazio: ObjetivoForm = {
    titulo: "",
    data_inicio: "",
    data_fim_prevista: "",
    status: "Planejado",
};

export default function FormProcesso({
    initialData,
    onSubmit,
}: {
    initialData: Partial<ProcessoForm>;
    onSubmit: (data: ProcessoForm) => Promise<void>;
}) {
    const dadosIniciais = normalizarForm(initialData);
    const [form, setForm] = useState<ProcessoForm>(dadosIniciais);
    const [objetivos, setObjetivos] = useState<ObjetivoForm[]>(dadosIniciais.objetivos);
    const [novoObjetivo, setNovoObjetivo] = useState<ObjetivoForm>(objetivoVazio);

    function adicionarObjetivo() {
        if (!novoObjetivo.titulo.trim()) return;
        setObjetivos((atual) => [...atual, normalizarObjetivo(novoObjetivo)]);
        setNovoObjetivo(objetivoVazio);
    }

    function atualizarObjetivo(index: number, campo: keyof ObjetivoForm, valor: string) {
        setObjetivos((atual) => atual.map((objetivo, i) => (i === index ? { ...objetivo, [campo]: valor } : objetivo)));
    }

    function removerObjetivo(index: number) {
        setObjetivos((atual) => atual.filter((_, i) => i !== index));
    }

    function moverObjetivo(index: number, direcao: -1 | 1) {
        const destino = index + direcao;
        if (destino < 0 || destino >= objetivos.length) return;

        setObjetivos((atual) => {
            const copia = [...atual];
            const [item] = copia.splice(index, 1);
            copia.splice(destino, 0, item);
            return copia;
        });
    }

    function handleChange(event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
        setForm((atual) => ({ ...atual, [event.target.name]: event.target.value }));
    }

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        await onSubmit({
            ...form,
            objetivos: objetivos.map((objetivo, index) => ({ ...objetivo, ordem: index + 1 })),
        });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <section className="rounded bg-white p-4 shadow">
                <h2 className="mb-3 font-semibold">Identidade do Processo</h2>
                <label className="block">
                    <span className="text-sm">Nome do processo</span>
                    <input
                        name="nome"
                        value={form.nome}
                        onChange={handleChange}
                        required
                        placeholder="Ex.: Projeto Comunit?rio"
                        className="mt-1 w-full rounded border px-3 py-2"
                    />
                </label>
            </section>

            <section className="rounded bg-white p-4 shadow">
                <h2 className="mb-3 font-semibold">?mbito e Situa??o</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <label>
                        <span className="text-sm">?mbito</span>
                        <select name="ambito" value={form.ambito} onChange={handleChange} className="mt-1 w-full rounded border px-3 py-2">
                            <option>Miss?o</option>
                            <option>Sustentabilidade</option>
                            <option>Forma??o</option>
                            <option>Gest?o</option>
                            <option>Organiza??o</option>
                        </select>
                    </label>

                    <label>
                        <span className="text-sm">Etapa atual</span>
                        <select name="etapa" value={form.etapa} onChange={handleChange} className="mt-1 w-full rounded border px-3 py-2">
                            <option>Planejamento</option>
                            <option>Em curso</option>
                            <option>Acompanhamento</option>
                            <option>Transi\u00e7\u00e3o</option>
                            <option>Conclu\u00eddo</option>
                        </select>
                    </label>

                    <label>
                        <span className="text-sm">Situa??o</span>
                        <select name="status" value={form.status} onChange={handleChange} className="mt-1 w-full rounded border px-3 py-2">
                            <option>Ativo</option>
                            <option>Aten\u00e7\u00e3o</option>
                            <option>Transi\u00e7\u00e3o</option>
                            <option>Planejado</option>
                            <option>Conclu\u00eddo</option>
                        </select>
                    </label>
                </div>
            </section>

            <section className="rounded bg-white p-4 shadow">
                <h2 className="mb-3 font-semibold">Coordena??o</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label>
                        <span className="text-sm">Coordena??o atual</span>
                        <input name="coord_atual" value={form.coord_atual} onChange={handleChange} placeholder="Nome da refer?ncia atual" className="mt-1 w-full rounded border px-3 py-2" />
                    </label>
                    <label>
                        <span className="text-sm">Futuro coordenador</span>
                        <input name="coord_futuro" value={form.coord_futuro} onChange={handleChange} placeholder="Se j? houver transi??o prevista" className="mt-1 w-full rounded border px-3 py-2 italic" />
                    </label>
                </div>
            </section>

            <section className="rounded bg-white p-4 shadow">
                <h2 className="mb-3 font-semibold">Equipe</h2>
                <textarea name="equipe" value={form.equipe} onChange={handleChange} placeholder="Ex.: Pe. Siro, C?ria, Paulinho" className="w-full rounded border px-3 py-2" rows={3} />
            </section>

            <section className="rounded bg-white p-4 shadow">
                <h2 className="mb-3 font-semibold">Ciclo do Processo</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label>
                        <span className="text-sm">In?cio do processo</span>
                        <input type="date" name="data_inicio" value={form.data_inicio} onChange={handleChange} className="mt-1 w-full rounded border px-3 py-2" required />
                    </label>
                    <label>
                        <span className="text-sm">Previs?o de conclus?o</span>
                        <input type="date" name="data_prevista_fim" value={form.data_prevista_fim} onChange={handleChange} className="mt-1 w-full rounded border px-3 py-2" />
                    </label>
                </div>
            </section>

            <section className="rounded bg-white p-4 shadow">
                <h2 className="mb-3 font-semibold">Objetivo Geral</h2>
                <textarea name="objetivo_geral" value={form.objetivo_geral} onChange={handleChange} placeholder="Descreva o objetivo principal deste processo" className="w-full rounded border px-3 py-2" rows={3} />
            </section>

            <section className="rounded bg-white p-4 shadow">
                <h2 className="mb-3 font-semibold">Objetivos Intermedi?rios</h2>
                {objetivos.length === 0 ? (
                    <p className="mb-4 text-sm text-gray-500">Nenhum objetivo adicionado ainda.</p>
                ) : (
                    <div className="mb-4 space-y-4">
                        {objetivos.map((obj, index) => (
                            <div key={obj.id ?? `novo-${index}`} className="space-y-3 rounded-lg border p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-sm font-medium">Objetivo {index + 1}</p>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => moverObjetivo(index, -1)} className="rounded border px-3 py-1 text-sm">Subir</button>
                                        <button type="button" onClick={() => moverObjetivo(index, 1)} className="rounded border px-3 py-1 text-sm">Descer</button>
                                        <button type="button" onClick={() => removerObjetivo(index)} className="rounded border px-3 py-1 text-sm text-red-700">Remover</button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <label className="md:col-span-2">
                                        <span className="text-sm">T?tulo</span>
                                        <input value={obj.titulo} onChange={(event) => atualizarObjetivo(index, "titulo", event.target.value)} className="mt-1 w-full rounded border px-3 py-2" />
                                    </label>
                                    <label>
                                        <span className="text-sm">In?cio</span>
                                        <input type="date" value={obj.data_inicio} onChange={(event) => atualizarObjetivo(index, "data_inicio", event.target.value)} className="mt-1 w-full rounded border px-3 py-2" />
                                    </label>
                                    <label>
                                        <span className="text-sm">Previsto</span>
                                        <input type="date" value={obj.data_fim_prevista} onChange={(event) => atualizarObjetivo(index, "data_fim_prevista", event.target.value)} className="mt-1 w-full rounded border px-3 py-2" />
                                    </label>
                                    <label>
                                        <span className="text-sm">Status</span>
                                        <select value={obj.status} onChange={(event) => atualizarObjetivo(index, "status", event.target.value)} className="mt-1 w-full rounded border px-3 py-2">
                                            <option>Planejado</option>
                                            <option>Em andamento</option>
                                            <option>Conclu\u00eddo</option>
                                            <option>Aten\u00e7\u00e3o</option>
                                        </select>
                                    </label>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                    <input placeholder="Novo objetivo intermedi?rio" value={novoObjetivo.titulo} onChange={(event) => setNovoObjetivo((atual) => ({ ...atual, titulo: event.target.value }))} className="rounded border px-3 py-2 text-sm md:col-span-2" />
                    <input type="date" value={novoObjetivo.data_inicio} onChange={(event) => setNovoObjetivo((atual) => ({ ...atual, data_inicio: event.target.value }))} className="rounded border px-3 py-2 text-sm" />
                    <input type="date" value={novoObjetivo.data_fim_prevista} onChange={(event) => setNovoObjetivo((atual) => ({ ...atual, data_fim_prevista: event.target.value }))} className="rounded border px-3 py-2 text-sm" />
                </div>

                <button type="button" onClick={adicionarObjetivo} className="mt-2 rounded border border-[var(--cmv-blue)] px-4 py-2 text-[var(--cmv-blue)]">+ Adicionar objetivo</button>
            </section>

            <section className="rounded bg-white p-4 shadow">
                <h2 className="mb-3 font-semibold">Observa??es</h2>
                <textarea name="observacoes" value={form.observacoes} onChange={handleChange} placeholder="Anota??es, decis?es, pontos de aten??o..." className="w-full rounded border px-3 py-2" rows={4} />
            </section>

            <section className="flex gap-3">
                <button type="submit" className="rounded bg-[var(--cmv-blue)] px-6 py-2 text-white">Salvar Processo</button>
                <Link href="/processos" className="rounded border px-6 py-2 text-center">Cancelar</Link>
            </section>
        </form>
    );
}
