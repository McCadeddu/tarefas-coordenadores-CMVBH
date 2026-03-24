// tarefas-coordenadores/app/components/NavTopo.tsx
// Componente de navegação no topo da página, mostrando o caminho atual

import Link from "next/link";

export default function NavTopo({ titulo }: { titulo?: string }) {
    return (
        <div className="mb-4 flex gap-3 text-sm items-center">
            <Link href="/" className="text-[var(--cmv-blue)] underline">
                ← Início
            </Link>

            <span className="text-gray-400">/</span>

            <Link href="/processos" className="text-[var(--cmv-blue)] underline">
                Processos
            </Link>

            {titulo && (
                <>
                    <span className="text-gray-400">/</span>
                    <span className="font-medium">{titulo}</span>
                </>
            )}
        </div>
    );
}