"use client";

import { useEffect, useMemo, useState } from "react";
import { COMMUNITY_CALENDAR_OPTIONS } from "@/lib/shared/app-config";

function currentMonthValue() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function storageKey(calendarId: string) {
    return `cmv-calendar-url:${calendarId}`;
}

export default function ExportarCalendarioCard() {
    const [calendarId, setCalendarId] = useState(COMMUNITY_CALENDAR_OPTIONS[0]?.id || "cmv-bh");
    const [month, setMonth] = useState(currentMonthValue());
    const [calendarUrls, setCalendarUrls] = useState<Record<string, string>>(() => {
        if (typeof window === "undefined") return {};

        return Object.fromEntries(
            COMMUNITY_CALENDAR_OPTIONS.map((option) => [
                option.id,
                window.localStorage.getItem(storageKey(option.id)) || "",
            ])
        );
    });
    const sourceUrl = calendarUrls[calendarId] || "";

    useEffect(() => {
        if (typeof window === "undefined") return;
        const key = storageKey(calendarId);
        if (sourceUrl.trim()) {
            window.localStorage.setItem(key, sourceUrl.trim());
        } else {
            window.localStorage.removeItem(key);
        }
    }, [calendarId, sourceUrl]);

    function updateSourceUrl(value: string) {
        setCalendarUrls((current) => ({
            ...current,
            [calendarId]: value,
        }));
    }

    const sharedQuery = useMemo(() => {
        const params = new URLSearchParams({
            calendar: calendarId,
            month,
        });

        if (sourceUrl.trim()) {
            params.set("sourceUrl", sourceUrl.trim());
        }

        return params;
    }, [calendarId, month, sourceUrl]);

    const monthlyHref = useMemo(() => {
        const params = new URLSearchParams(sharedQuery);
        params.set("scope", "month");
        return `/api/calendario/exportar/excel?${params.toString()}`;
    }, [sharedQuery]);

    const yearlyHref = useMemo(() => {
        const params = new URLSearchParams(sharedQuery);
        params.set("scope", "year");
        return `/api/calendario/exportar/excel?${params.toString()}`;
    }, [sharedQuery]);

    const agendaHref = useMemo(() => {
        const params = new URLSearchParams(sharedQuery);
        params.set("scope", "agenda");
        return `/api/calendario/exportar/excel?${params.toString()}`;
    }, [sharedQuery]);

    return (
        <section className="mb-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4">
                <div>
                    <h2 className="text-lg font-semibold text-[var(--cmv-blue)]">
                        {"Calend\u00e1rio da Comunidade em Excel"}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                        {"Os respons\u00e1veis locais podem colar aqui o link publicado do Outlook. Hoje h\u00e1 tr\u00eas sa\u00eddas: m\u00eas por semanas com horas, m\u00eas em agenda semanal sem horas e ano completo com 12 abas mensais."}
                    </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <label className="space-y-1 text-sm">
                        <span className="font-medium text-slate-700">Comunidade</span>
                        <select
                            value={calendarId}
                            onChange={(event) => setCalendarId(event.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                        >
                            {COMMUNITY_CALENDAR_OPTIONS.map((option) => (
                                <option key={option.id} value={option.id}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="space-y-1 text-sm">
                        <span className="font-medium text-slate-700">{"M\u00eas base"}</span>
                        <input
                            type="month"
                            value={month}
                            onChange={(event) => setMonth(event.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                        />
                    </label>

                    <label className="space-y-1 text-sm md:col-span-2">
                        <span className="font-medium text-slate-700">
                            {"Link do calend\u00e1rio publicado"}
                        </span>
                        <input
                            type="url"
                            value={sourceUrl}
                            onChange={(event) => updateSourceUrl(event.target.value)}
                            placeholder="https://outlook.office365.com/owa/calendar/.../calendar.html"
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                        />
                    </label>
                </div>

                <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
                    <a
                        href={monthlyHref}
                        className="inline-flex items-center justify-center rounded-lg bg-[var(--cmv-blue-dark)] px-4 py-2 text-sm font-semibold !text-white no-underline shadow-sm hover:bg-[var(--cmv-blue)] hover:no-underline"
                    >
                        {"Exportar m\u00eas por semanas"}
                    </a>

                    <a
                        href={agendaHref}
                        className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold !text-white no-underline shadow-sm hover:bg-emerald-700 hover:no-underline"
                    >
                        {"Exportar m\u00eas em agenda"}
                    </a>

                    <a
                        href={yearlyHref}
                        className="inline-flex items-center justify-center rounded-lg border border-[var(--cmv-blue)] px-4 py-2 text-sm font-semibold !text-[var(--cmv-blue)] no-underline hover:bg-slate-50 hover:no-underline"
                    >
                        {"Exportar ano completo"}
                    </a>

                    <button
                        type="button"
                        onClick={() => updateSourceUrl("")}
                        className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                    >
                        {"Usar link padr\u00e3o do sistema"}
                    </button>
                </div>

                <p className="text-xs text-slate-500">
                    {"O link digitado fica guardado neste navegador para a comunidade escolhida. Hoje aceitamos links publicados do Outlook em https://outlook.office365.com/ ou https://outlook.office.com/."}
                </p>
            </div>
        </section>
    );
}
