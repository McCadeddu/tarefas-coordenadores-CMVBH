"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

type Mode = "login" | "first-access";

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const next = searchParams.get("next") || "/";

    const [mode, setMode] = useState<Mode>("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [firstAccessPassword, setFirstAccessPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [info, setInfo] = useState("");
    const [erro, setErro] = useState("");
    const [loading, setLoading] = useState(false);

    function resetMessages() {
        setErro("");
        setInfo("");
    }

    async function handlePasswordLogin(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        resetMessages();

        const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });

        if (!res.ok) {
            const body = await res.json().catch(() => null);
            setErro(body?.error || "Nao foi possivel entrar.");
            setLoading(false);
            return;
        }

        router.push(next);
        router.refresh();
    }

    async function completeRegistration(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        resetMessages();

        if (!/^\d{6}$/.test(firstAccessPassword)) {
            setErro("A senha precisa ter exatamente 6 numeros.");
            setLoading(false);
            return;
        }

        if (firstAccessPassword !== confirmPassword) {
            setErro("A confirmacao da senha nao confere.");
            setLoading(false);
            return;
        }

        const res = await fetch("/api/auth/complete-registration", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email,
                password: firstAccessPassword,
            }),
        });

        const body = await res.json().catch(() => null);

        if (!res.ok) {
            setErro(body?.error || "Nao foi possivel concluir o primeiro acesso.");
            setLoading(false);
            return;
        }

        setInfo("Senha criada com sucesso. Entrando no programa...");
        router.push(next);
        router.refresh();
    }

    return (
        <main className="min-h-screen bg-[var(--cmv-beige)] px-6 py-10 text-[var(--cmv-brown)]">
            <div className="mx-auto max-w-md rounded-2xl bg-white p-8 shadow-lg">
                <h1 className="text-2xl font-bold text-[var(--cmv-blue)]">
                    Entrar no programa
                </h1>
                <p className="mt-2 text-sm text-slate-600">
                    Acesso institucional para a Comunidade Missionaria de Villaregia de Belo Horizonte.
                </p>

                <div className="mt-6 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 text-sm">
                    <button
                        type="button"
                        onClick={() => {
                            setMode("login");
                            resetMessages();
                        }}
                        className={`rounded-lg px-3 py-2 ${mode === "login" ? "bg-white shadow" : "text-slate-600"}`}
                    >
                        Ja tenho senha
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setMode("first-access");
                            resetMessages();
                        }}
                        className={`rounded-lg px-3 py-2 ${mode === "first-access" ? "bg-white shadow" : "text-slate-600"}`}
                    >
                        Primeiro acesso
                    </button>
                </div>

                {mode === "login" ? (
                    <form onSubmit={handlePasswordLogin} className="mt-6 space-y-4">
                        <label className="block">
                            <span className="text-sm">E-mail institucional</span>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="mt-1 w-full rounded border px-3 py-2"
                                placeholder="nome@villaregia.org"
                                required
                            />
                        </label>

                        <label className="block">
                            <span className="text-sm">Senha</span>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                inputMode="numeric"
                                maxLength={6}
                                className="mt-1 w-full rounded border px-3 py-2"
                                placeholder="6 numeros"
                                required
                            />
                        </label>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded bg-[var(--cmv-blue)] px-4 py-2 text-white disabled:opacity-60"
                        >
                            {loading ? "Entrando..." : "Entrar"}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={completeRegistration} className="mt-6 space-y-4">
                        <label className="block">
                            <span className="text-sm">E-mail institucional</span>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="mt-1 w-full rounded border px-3 py-2"
                                placeholder="nome@villaregia.org"
                                required
                            />
                        </label>

                        <label className="block">
                            <span className="text-sm">Criar senha de 6 numeros</span>
                            <input
                                type="password"
                                value={firstAccessPassword}
                                onChange={(e) => setFirstAccessPassword(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                inputMode="numeric"
                                maxLength={6}
                                className="mt-1 w-full rounded border px-3 py-2 tracking-[0.35em]"
                                placeholder="000000"
                                required
                            />
                        </label>

                        <label className="block">
                            <span className="text-sm">Confirmar senha</span>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                inputMode="numeric"
                                maxLength={6}
                                className="mt-1 w-full rounded border px-3 py-2 tracking-[0.35em]"
                                placeholder="000000"
                                required
                            />
                        </label>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded bg-[var(--cmv-blue)] px-4 py-2 text-white disabled:opacity-60"
                        >
                            {loading ? "Salvando..." : "Criar senha e entrar"}
                        </button>
                    </form>
                )}

                {erro && <p className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
                {info && <p className="mt-4 rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">{info}</p>}

                <div className="mt-6 rounded-xl bg-slate-50 p-4 text-xs text-slate-600">
                    <p className="font-semibold text-slate-700">Primeiro acesso</p>
                    <p className="mt-1">Use seu email institucional @villaregia.org e crie uma senha numerica de 6 digitos. Essa senha ficara vinculada ao email cadastrado.</p>
                </div>
            </div>
        </main>
    );
}
