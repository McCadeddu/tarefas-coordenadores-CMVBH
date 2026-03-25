// app/processos/novo/page.tsx
// Página para criar um novo processo

"use client";

import { useRouter } from "next/navigation";
import NavTopo from "../../components/NavTopo";
import FormProcesso from "../../components/FormProcesso";
import { formatDateForInput } from "@/lib/shared/date";

export default function NovoProcessoPage() {
    const router = useRouter();

    const hoje = formatDateForInput(new Date());

    function gerarSlug(nome: string) {
        return nome
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)+/g, "");
    }

    return (
        <main className="min-h-screen p-6 bg-[var(--cmv-beige)] text-[var(--cmv-brown)]">

            {/* Navegação */}
            <NavTopo titulo="Novo" />

            {/* Cabeçalho */}
            <header className="mb-6">
                <h1 className="text-2xl font-bold text-[var(--cmv-blue)]">
                    Novo Processo
                </h1>
                <p className="text-sm opacity-80">
                    Cadastro de um novo processo para acompanhamento da coordenação
                </p>
            </header>

            <FormProcesso
                key="novo-processo"
                initialData={{
                    nome: "",
                    ambito: "Missão",
                    equipe: "",
                    coord_atual: "",
                    coord_futuro: "",
                    etapa: "Planejamento",
                    status: "Ativo",
                    data_inicio: hoje,
                    data_prevista_fim: "",
                    objetivo_geral: "",
                    observacoes: "",
                    objetivos: [], // 🔥 importante para consistência
                }}
                onSubmit={async (form) => {
                    const payload = {
                        slug: gerarSlug(form.nome),
                        ...form,
                    };

                    const res = await fetch("/api/processos", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload),
                    });

                    if (!res.ok) {
                        alert("Erro ao salvar processo");
                        return;
                    }

                    router.push(`/processos/${payload.slug}`);
                }}
            />
        </main>
    );
}
