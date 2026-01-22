// app/processos/novo/page.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NovoProcessoPage() {
    const router = useRouter();

    const hoje = new Date().toISOString().slice(0, 10);

    const [form, setForm] = useState({
        nome: "",
        ambito: "Missão",
        equipe: "",
        coord_atual: "",
        coord_futuro: "",
        etapa: "Planejamento",
        status: "Ativo",
        data_inicio: hoje,
        data_prevista_fim: "",
        observacoes: "",
    });

    function handleChange(
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) {
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    function gerarSlug(nome: string) {
        return nome
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)+/g, "");
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        const payload = {
            ...form,
            slug: gerarSlug(form.nome),
        };

        await fetch("/api/processos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        router.push("/processos");
    }

    return (
        <main className="min-h-screen p-6 bg-[var(--cmv-beige)] text-[var(--cmv-brown)]">
            {/* Voltar */}
            <div className="mb-4">
                <Link href="/processos" className="text-sm text-[var(--cmv-blue)] underline">
                    ← Voltar aos Processos
                </Link>
            </div>

            {/* Cabeçalho */}
            <header className="mb-6">
                <h1 className="text-2xl font-bold text-[var(--cmv-blue)]">
                    Novo Processo
                </h1>
                <p className="text-sm opacity-80">
                    Cadastro de um novo processo para acompanhamento da coordenação
                </p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Identidade */}
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

                {/* Âmbito e Situação */}
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

                {/* Ciclo do Processo */}
                <section className="bg-white p-4 rounded shadow">
                    <h2 className="font-semibold mb-3 flex items-center gap-2">
                        ⏱ Ciclo do Processo
                    </h2>

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

                    <p className="text-xs text-gray-600 mt-2">
                        A data de início marca o começo oficial do processo.
                        A previsão ajuda no acompanhamento e planejamento da coordenação.
                    </p>
                </section>

                {/* Coordenação */}
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

                {/* Equipe */}
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

                {/* Observações */}
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

                {/* Ações */}
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
        </main>
    );
}
