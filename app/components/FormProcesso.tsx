"use client";

import Link from "next/link";
import { useState } from "react";

type ObjetivoForm = {
    id?: number;
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

function normalizarObjetivo(objetivo: Partial<ObjetivoForm>): ObjetivoForm {
    return {
        id: objetivo.id,
        ordem: objetivo.ordem,
        titulo: objetivo.titulo ?? "",
        data_inicio: objetivo.data_inicio ?? "",
        data_fim_prevista: objetivo.data_fim_prevista ?? "",
        status: objetivo.status ?? "Planejado",
    };
}

function normalizarForm(data: Partial<ProcessoForm>): ProcessoForm {
    return {
        nome: data.nome ?? "",
        ambito: data.ambito ?? "Missão",
        equipe: data.equipe ?? "",
        coord_atual: data.coord_atual ?? "",
        coord_futuro: data.coord_futuro ?? "",
        etapa: data.etapa ?? "Planejamento",
        status: data.status ?? "Ativo",
        data_inicio: data.data_inicio ?? "",
        data_prevista_fim: data.data_prevista_fim ?? "",
        objetivo_geral: data.objetivo_geral ?? "",
        objetivo_inicio: data.objetivo_inicio ?? "",
        objetivo_fim_previsto: data.objetivo_fim_previsto ?? "",
        observacoes: data.observacoes ?? "",
        objetivos: Array.isArray(data.objetivos)
            ? data.objetivos.map(normalizarObjetivo)
            : [],
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

    function atualizarObjetivo(
        index: number,
        campo: keyof ObjetivoForm,
        valor: string
    ) {
        setObjetivos((atual) =>
            atual.map((objetivo, i) =>
                i === index ? { ...objetivo, [campo]: valor } : objetivo
            )
        );
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

    function handleChange(
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) {
        setForm((atual) => ({ ...atual, [e.target.name]: e.target.value }));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        await onSubmit({
            ...form,
            objetivos: objetivos.map((objetivo, index) => ({
                ...objetivo,
                ordem: index + 1,
            })),
        });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <section className="bg-white p-4 rounded shadow">
                <h2 className="font-semibold mb-3">Identidade do Processo</h2>

                <label className="block">
                    <span className="text-sm">Nome do processo</span>
                    <input
                        name="nome"
                        value={form.nome}
                        onChange={handleChange}
                        required
                        placeholder="Ex.: Projeto Comunitário"
                        className="mt-1 w-full border rounded px-3 py-2"
                    />
                </label>
            </section>

            <section className="bg-white p-4 rounded shadow">
                <h2 className="font-semibold mb-3">Âmbito e Situação</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <label>
                        <span className="text-sm">Âmbito</span>
                        <select
                            name="ambito"
                            value={form.ambito}
                            onChange={handleChange}
                            className="mt-1 w-full border rounded px-3 py-2"
                        >
                            <option>Missão</option>
                            <option>Sustentabilidade</option>
                            <option>Formação</option>
                            <option>Gestão</option>
                            <option>Organização</option>
                        </select>
                    </label>

                    <label>
                        <span className="text-sm">Etapa atual</span>
                        <select
                            name="etapa"
                            value={form.etapa}
                            onChange={handleChange}
                            className="mt-1 w-full border rounded px-3 py-2"
                        >
                            <option>Planejamento</option>
                            <option>Execução</option>
                            <option>Acompanhamento</option>
                            <option>Transição</option>
                            <option>Concluído</option>
                        </select>
                    </label>

                    <label>
                        <span className="text-sm">Situação</span>
                        <select
                            name="status"
                            value={form.status}
                            onChange={handleChange}
                            className="mt-1 w-full border rounded px-3 py-2"
                        >
                            <option>Ativo</option>
                            <option>Atenção</option>
                            <option>Transição</option>
                            <option>Planejado</option>
                            <option>Concluído</option>
                        </select>
                    </label>
                </div>
            </section>

            <section className="bg-white p-4 rounded shadow">
                <h2 className="font-semibold mb-3">Coordenação</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label>
                        <span className="text-sm">Coordenação atual</span>
                        <input
                            name="coord_atual"
                            value={form.coord_atual}
                            onChange={handleChange}
                            placeholder="Nome da referência atual"
                            className="mt-1 w-full border rounded px-3 py-2"
                        />
                    </label>

                    <label>
                        <span className="text-sm">Futuro coordenador</span>
                        <input
                            name="coord_futuro"
                            value={form.coord_futuro}
                            onChange={handleChange}
                            placeholder="Se já houver transição prevista"
                            className="mt-1 w-full border rounded px-3 py-2 italic"
                        />
                    </label>
                </div>
            </section>

            <section className="bg-white p-4 rounded shadow">
                <h2 className="font-semibold mb-3">Equipe</h2>
                <textarea
                    name="equipe"
                    value={form.equipe}
                    onChange={handleChange}
                    placeholder="Ex.: Pe. Siro, Círia, Paulinho"
                    className="w-full border rounded px-3 py-2"
                    rows={3}
                />
            </section>

            <section className="bg-white p-4 rounded shadow">
                <h2 className="font-semibold mb-3">Ciclo do Processo</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label>
                        <span className="text-sm">Início do processo</span>
                        <input
                            type="date"
                            name="data_inicio"
                            value={form.data_inicio}
                            onChange={handleChange}
                            className="mt-1 w-full border rounded px-3 py-2"
                            required
                        />
                    </label>

                    <label>
                        <span className="text-sm">Previsão de conclusão</span>
                        <input
                            type="date"
                            name="data_prevista_fim"
                            value={form.data_prevista_fim}
                            onChange={handleChange}
                            className="mt-1 w-full border rounded px-3 py-2"
                        />
                    </label>
                </div>
            </section>

            <section className="bg-white p-4 rounded shadow">
                <h2 className="font-semibold mb-3">Objetivo Geral</h2>

                <textarea
                    name="objetivo_geral"
                    value={form.objetivo_geral}
                    onChange={handleChange}
                    placeholder="Descreva o objetivo principal deste processo"
                    className="w-full border rounded px-3 py-2"
                    rows={3}
                />
            </section>

            <section className="bg-white p-4 rounded shadow">
                <h2 className="font-semibold mb-3">Objetivos Intermediários</h2>

                {objetivos.length === 0 ? (
                    <p className="text-sm text-gray-500 mb-4">
                        Nenhum objetivo adicionado ainda.
                    </p>
                ) : (
                    <div className="space-y-4 mb-4">
                        {objetivos.map((obj, index) => (
                            <div
                                key={obj.id ?? `novo-${index}`}
                                className="border rounded-lg p-4 space-y-3"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-sm font-medium">
                                        Objetivo {index + 1}
                                    </p>

                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => moverObjetivo(index, -1)}
                                            className="px-3 py-1 border rounded text-sm"
                                        >
                                            Subir
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => moverObjetivo(index, 1)}
                                            className="px-3 py-1 border rounded text-sm"
                                        >
                                            Descer
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => removerObjetivo(index)}
                                            className="px-3 py-1 border rounded text-sm text-red-700"
                                        >
                                            Remover
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <label className="md:col-span-2">
                                        <span className="text-sm">Título</span>
                                        <input
                                            value={obj.titulo}
                                            onChange={(e) =>
                                                atualizarObjetivo(index, "titulo", e.target.value)
                                            }
                                            className="mt-1 w-full border rounded px-3 py-2"
                                        />
                                    </label>

                                    <label>
                                        <span className="text-sm">Início</span>
                                        <input
                                            type="date"
                                            value={obj.data_inicio}
                                            onChange={(e) =>
                                                atualizarObjetivo(index, "data_inicio", e.target.value)
                                            }
                                            className="mt-1 w-full border rounded px-3 py-2"
                                        />
                                    </label>

                                    <label>
                                        <span className="text-sm">Previsto</span>
                                        <input
                                            type="date"
                                            value={obj.data_fim_prevista}
                                            onChange={(e) =>
                                                atualizarObjetivo(
                                                    index,
                                                    "data_fim_prevista",
                                                    e.target.value
                                                )
                                            }
                                            className="mt-1 w-full border rounded px-3 py-2"
                                        />
                                    </label>

                                    <label>
                                        <span className="text-sm">Status</span>
                                        <select
                                            value={obj.status}
                                            onChange={(e) =>
                                                atualizarObjetivo(index, "status", e.target.value)
                                            }
                                            className="mt-1 w-full border rounded px-3 py-2"
                                        >
                                            <option>Planejado</option>
                                            <option>Em andamento</option>
                                            <option>Concluído</option>
                                            <option>Atenção</option>
                                        </select>
                                    </label>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <input
                        placeholder="Novo objetivo intermediário"
                        value={novoObjetivo.titulo}
                        onChange={(e) =>
                            setNovoObjetivo((atual) => ({ ...atual, titulo: e.target.value }))
                        }
                        className="border rounded px-3 py-2 text-sm md:col-span-2"
                    />

                    <input
                        type="date"
                        value={novoObjetivo.data_inicio}
                        onChange={(e) =>
                            setNovoObjetivo((atual) => ({ ...atual, data_inicio: e.target.value }))
                        }
                        className="border rounded px-3 py-2 text-sm"
                    />

                    <input
                        type="date"
                        value={novoObjetivo.data_fim_prevista}
                        onChange={(e) =>
                            setNovoObjetivo((atual) => ({
                                ...atual,
                                data_fim_prevista: e.target.value,
                            }))
                        }
                        className="border rounded px-3 py-2 text-sm"
                    />
                </div>

                <button
                    type="button"
                    onClick={adicionarObjetivo}
                    className="mt-2 border border-[var(--cmv-blue)] text-[var(--cmv-blue)] px-4 py-2 rounded"
                >
                    + Adicionar objetivo
                </button>
            </section>

            <section className="bg-white p-4 rounded shadow">
                <h2 className="font-semibold mb-3">Observações</h2>
                <textarea
                    name="observacoes"
                    value={form.observacoes}
                    onChange={handleChange}
                    placeholder="Anotações, decisões, pontos de atenção..."
                    className="w-full border rounded px-3 py-2"
                    rows={4}
                />
            </section>

            <section className="flex gap-3">
                <button
                    type="submit"
                    className="bg-[var(--cmv-blue)] text-white px-6 py-2 rounded"
                >
                    Salvar Processo
                </button>

                <Link href="/processos" className="px-6 py-2 border rounded text-center">
                    Cancelar
                </Link>
            </section>
        </form>
    );
}
