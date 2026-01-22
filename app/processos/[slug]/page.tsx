// app/processos/[slug]/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type ProcessoForm = {
    slug: string;
    nome: string;
    ambito: string;
    equipe: string | null;
    coord_atual: string | null;
    coord_futuro: string | null;
    etapa: string;
    status: string;
    observacoes: string | null;
};

type Evento = {
    tipo: string;
    campo: string | null;
    valor_anterior: string | null;
    valor_novo: string | null;
    criado_em: string;
};

function textoEvento(e: Evento) {
    if (e.tipo === "CRIACAO") return "Processo criado";
    if (e.tipo === "MUDANCA_ETAPA") {
        return `Etapa mudou de "${e.valor_anterior}" para "${e.valor_novo}"`;
    }
    if (e.tipo === "EDICAO_CAMPO") {
        return `Campo "${e.campo}" alterado`;
    }
    return "Atualização no processo";
}

function dataHumana(data: string) {
    return new Date(data).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

export default function EditarProcessoPage() {
    const { slug } = useParams<{ slug: string }>();
    const router = useRouter();

    const [form, setForm] = useState<ProcessoForm | null>(null);
    const [eventos, setEventos] = useState<Evento[]>([]);

    useEffect(() => {
        async function carregar() {
            const res = await fetch(`/api/processos/${slug}`);
            const data = await res.json();
            setForm(data);

            const resEventos = await fetch(`/api/processos/${slug}/eventos`);
            const dadosEventos = await resEventos.json();
            setEventos(dadosEventos);
        }
        carregar();
    }, [slug]);

    function handleChange(
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) {
        if (!form) return;
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    async function salvar(e: React.FormEvent) {
        e.preventDefault();
        await fetch("/api/processos", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
        });
        router.push("/processos");
    }

    if (!form) return <p className="p-6">Carregando…</p>;

    return (
        <main className="min-h-screen p-6">
            <Link href="/processos" className="underline">
                ← Voltar
            </Link>

            <h1 className="text-2xl font-bold my-4">Editar Processo</h1>

            <form onSubmit={salvar} className="space-y-5 max-w-xl">
                <label className="block">
                    <span className="text-sm font-medium">Nome do processo</span>
                    <input name="nome" value={form.nome} onChange={handleChange}
                        className="mt-1 w-full border rounded px-3 py-2" />
                </label>

                <label className="block">
                    <span className="text-sm font-medium">Âmbito</span>
                    <input name="ambito" value={form.ambito} onChange={handleChange}
                        className="mt-1 w-full border rounded px-3 py-2" />
                </label>

                <label className="block">
                    <span className="text-sm font-medium">Coordenação atual</span>
                    <input name="coord_atual" value={form.coord_atual || ""} onChange={handleChange}
                        className="mt-1 w-full border rounded px-3 py-2" />
                </label>

                <label className="block">
                    <span className="text-sm font-medium">Futuro coordenador</span>
                    <input name="coord_futuro" value={form.coord_futuro || ""} onChange={handleChange}
                        className="mt-1 w-full border rounded px-3 py-2 italic" />
                </label>

                <label className="block">
                    <span className="text-sm font-medium">Etapa</span>
                    <input name="etapa" value={form.etapa} onChange={handleChange}
                        className="mt-1 w-full border rounded px-3 py-2" />
                </label>

                <label className="block">
                    <span className="text-sm font-medium">Status</span>
                    <input name="status" value={form.status} onChange={handleChange}
                        className="mt-1 w-full border rounded px-3 py-2" />
                </label>

                <label className="block">
                    <span className="text-sm font-medium">Equipe</span>
                    <textarea name="equipe" value={form.equipe || ""} onChange={handleChange}
                        rows={3} className="mt-1 w-full border rounded px-3 py-2" />
                </label>

                <label className="block">
                    <span className="text-sm font-medium">Observações</span>
                    <textarea name="observacoes" value={form.observacoes || ""} onChange={handleChange}
                        rows={4} className="mt-1 w-full border rounded px-3 py-2" />
                </label>

                <button
                    type="submit"
                    className="bg-[var(--cmv-blue)] text-white px-5 py-2 rounded hover:bg-[var(--cmv-blue-dark)]"
                >
                    Salvar alterações
                </button>
            </form>

            {/* LINHA DO TEMPO */}
            <section className="mt-10 max-w-xl">
                <h2 className="text-lg font-semibold mb-4">
                    🕒 Linha do tempo
                </h2>

                {eventos.length === 0 ? (
                    <p className="text-sm text-gray-600">
                        Nenhuma mudança registrada ainda.
                    </p>
                ) : (
                    <ul className="space-y-3 border-l-2 border-gray-300 pl-4">
                        {eventos.map((e, i) => (
                            <li key={i} className="relative">
                                <span className="absolute -left-[9px] top-1 w-3 h-3 bg-[var(--cmv-blue)] rounded-full" />
                                <p className="text-sm">{textoEvento(e)}</p>
                                <p className="text-xs text-gray-500">
                                    {dataHumana(e.criado_em)}
                                </p>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </main>
    );
}