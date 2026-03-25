import Link from "next/link";

export default function NavTopo({ titulo }: { titulo?: string }) {
    return (
        <div className="mb-4 flex items-center gap-3 text-sm">
            <Link href="/" className="text-[var(--cmv-blue)] underline">
                {"\u2190"} In\u00edcio
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
