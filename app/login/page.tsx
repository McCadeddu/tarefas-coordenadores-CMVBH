"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

type Mode = "login" | "first-access";
type FirstAccessStep = "request" | "code" | "setup";

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const next = searchParams.get("next") || "/";

    const [mode, setMode] = useState<Mode>("login");
    const [step, setStep] = useState<FirstAccessStep>("request");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [firstAccessPassword, setFirstAccessPassword] = useState("");
    const [name, setName] = useState("");
    const [code, setCode] = useState("");
    const [setupToken, setSetupToken] = useState("");
    const [previewCode, setPreviewCode] = useState("");
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

    async function requestCode(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        resetMessages();
        setPreviewCode("");

        const res = await fetch("/api/auth/request-code", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
        });

        const body = await res.json().catch(() => null);

        if (!res.ok) {
            setErro(body?.error || "Nao foi possivel enviar o codigo.");
            setLoading(false);
            return;
        }

        setStep("code");
        setInfo(body?.delivered ? "Codigo enviado para o email institucional." : "Codigo gerado para teste local.");
        if (body?.previewCode) {
            setPreviewCode(body.previewCode);
        }
        setLoading(false);
    }

    async function verifyCode(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        resetMessages();

        const res = await fetch("/api/auth/verify-code", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, code }),
        });

        const body = await res.json().catch(() => null);

        if (!res.ok) {
            setErro(body?.error || "Nao foi possivel validar o codigo.");
            setLoading(false);
            return;
        }

        setSetupToken(body.setupToken);
        setStep("setup");
        setInfo("Codigo confirmado. Agora defina seu nome e sua senha.");
        setLoading(false);
    }

    async function completeRegistration(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        resetMessages();

        const res = await fetch("/api/auth/complete-registration", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email,
                setupToken,
                password: firstAccessPassword,
                name,
            }),
        });

        const body = await res.json().catch(() => null);

        if (!res.ok) {
            setErro(body?.error || "Nao foi possivel concluir o primeiro acesso.");
            setLoading(false);
            return;
        }

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
                    Acesso institucional para a comunidade Villa Regia.
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
                                onChange={(e) => setPassword(e.target.value)}
                                className="mt-1 w-full rounded border px-3 py-2"
                                placeholder="Sua senha"
                                required
                            />
                        </label>

                        {erro && <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded bg-[var(--cmv-blue)] px-4 py-2 text-white disabled:opacity-60"
                        >
                            {loading ? "Entrando..." : "Entrar"}
                        </button>
                    </form>
                ) : (
                    <>
                        {step === "request" && (
                            <form onSubmit={requestCode} className="mt-6 space-y-4">
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

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full rounded bg-[var(--cmv-blue)] px-4 py-2 text-white disabled:opacity-60"
                                >
                                    {loading ? "Enviando..." : "Receber codigo"}
                                </button>
                            </form>
                        )}

                        {step === "code" && (
                            <form onSubmit={verifyCode} className="mt-6 space-y-4">
                                <p className="text-sm text-slate-600">
                                    Digite o codigo de 6 numeros enviado para <strong>{email}</strong>.
                                </p>
                                <label className="block">
                                    <span className="text-sm">Codigo</span>
                                    <input
                                        inputMode="numeric"
                                        maxLength={6}
                                        value={code}
                                        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                        className="mt-1 w-full rounded border px-3 py-2 tracking-[0.5em]"
                                        placeholder="000000"
                                        required
                                    />
                                </label>

                                {previewCode && (
                                    <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                                        Codigo de teste local: <strong>{previewCode}</strong>
                                    </p>
                                )}

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setStep("request")}
                                        className="flex-1 rounded border px-4 py-2"
                                    >
                                        Voltar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 rounded bg-[var(--cmv-blue)] px-4 py-2 text-white disabled:opacity-60"
                                    >
                                        {loading ? "Validando..." : "Confirmar"}
                                    </button>
                                </div>
                            </form>
                        )}

                        {step === "setup" && (
                            <form onSubmit={completeRegistration} className="mt-6 space-y-4">
                                <label className="block">
                                    <span className="text-sm">Nome</span>
                                    <input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="mt-1 w-full rounded border px-3 py-2"
                                        placeholder="Seu nome"
                                        required
                                    />
                                </label>
                                <label className="block">
                                    <span className="text-sm">Criar senha</span>
                                    <input
                                        type="password"
                                        value={firstAccessPassword}
                                        onChange={(e) => setFirstAccessPassword(e.target.value)}
                                        className="mt-1 w-full rounded border px-3 py-2"
                                        placeholder="Minimo de 6 caracteres"
                                        required
                                    />
                                </label>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full rounded bg-[var(--cmv-blue)] px-4 py-2 text-white disabled:opacity-60"
                                >
                                    {loading ? "Concluindo..." : "Concluir primeiro acesso"}
                                </button>
                            </form>
                        )}
                    </>
                )}

                {erro && <p className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
                {info && <p className="mt-4 rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">{info}</p>}

                <div className="mt-6 rounded-xl bg-slate-50 p-4 text-xs text-slate-600">
                    <p className="font-semibold text-slate-700">Primeiro acesso</p>
                    <p className="mt-1">Use seu email institucional @villaregia.org. O sistema envia um codigo de 6 numeros e depois pede a criacao da senha.</p>
                </div>
            </div>
        </main>
    );
}
