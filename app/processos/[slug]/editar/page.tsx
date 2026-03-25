"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import NavTopo from "../../../components/NavTopo";
import FormProcesso from "../../../components/FormProcesso";
import { normalizeDateInput } from "@/lib/shared/date";

type ProcessoEditavel = {
    slug: string;
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
    objetivo_inicio: string;
    objetivo_fim_previsto: string;
    observacoes: string;
    objetivos: Array<{
        id?: number;
        ordem?: number;
        titulo: string;
        data_inicio: string;
        data_fim_prevista: string;
        status: string;
    }>;
};

export default function EditarProcessoPage() {
    const router = useRouter();
    const [data, setData] = useState<ProcessoEditavel | null>(null);
    const { slug } = useParams<{ slug: string }>();

    useEffect(() => {
        async function carregar() {
            const [resProcesso, resObjetivos] = await Promise.all([
                fetch(`/api/processos/${slug}`),
                fetch(`/api/processos/${slug}/objetivos`),
            ]);
            const [json, objetivos] = await Promise.all([
                resProcesso.json(),
                resObjetivos.json(),
            ]);

            setData({
                ...json,
                equipe: json.equipe || "",
                coord_atual: json.coord_atual || "",
                coord_futuro: json.coord_futuro || "",
                data_inicio: normalizeDateInput(json.data_inicio),
                data_prevista_fim: normalizeDateInput(json.data_prevista_fim),
                objetivo_geral: json.objetivo_geral || "",
                objetivo_inicio: normalizeDateInput(json.objetivo_inicio),
                objetivo_fim_previsto: normalizeDateInput(json.objetivo_fim_previsto),
                observacoes: json.observacoes || "",
                objetivos: Array.isArray(objetivos)
                    ? objetivos.map((objetivo) => ({
                        ...objetivo,
                        data_inicio: normalizeDateInput(objetivo.data_inicio),
                        data_fim_prevista: normalizeDateInput(objetivo.data_fim_prevista),
                    }))
                    : [],
            });
        }

        carregar();
    }, [slug]);

    if (!data) return <p className="p-6">Carregando...</p>;

    return (
        <main className="p-6">
            <NavTopo titulo="Editar" />

            <h1 className="text-xl font-bold mb-4">Editar Processo</h1>

            <FormProcesso
                key={data.slug}
                initialData={data}
                onSubmit={async (form) => {
                    const res = await fetch(`/api/processos/${slug}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(form),
                    });

                    if (!res.ok) {
                        const body = await res.json().catch(() => null);
                        alert(body?.error || "Erro ao atualizar");
                        return;
                    }

                    router.push(`/processos/${slug}`);
                }}
            />
        </main>
    );
}
