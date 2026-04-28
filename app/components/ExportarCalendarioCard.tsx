"use client";

import { useMemo, useState } from "react";
import { COMMUNITY_CALENDAR_OPTIONS } from "@/lib/shared/app-config";

function currentMonthValue() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function ExportarCalendarioCard() {
    const [calendarId, setCalendarId] = useState(COMMUNITY_CALENDAR_OPTIONS[0]?.id || "cmv-bh");
    const [month, setMonth] = useState(currentMonthValue());

    const monthlyHref = useMemo(
        () =>
            `/api/calendario/exportar/excel?calendar=${encodeURIComponent(calendarId)}&month=${encodeURIComponent(month)}&scope=month`,
        [calendarId, month]
    );

    const yearlyHref = useMemo(
        () =>
            `/api/calendario/exportar/excel?calendar=${encodeURIComponent(calendarId)}&month=${encodeURIComponent(month)}&scope=year`,
        [calendarId, month]
    );

    return (
        <section className="mb-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4">
                <div>
                    <h2 className="text-lg font-semibold text-[var(--cmv-blue)]">
                        {"Calend\u00e1rio da Comunidade em Excel"}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                        {"Escolha a comunidade e o m\u00eas de refer\u00eancia. A exporta\u00e7\u00e3o mensal sai dividida em semanas de segunda-feira a domingo, e a anual continua com 12 abas mensais."}
                    </p>
                </div>

                <div className="flex flex-col gap-3 md:flex-row md:items-end">
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

                    <a
                        href={monthlyHref}
                        className="inline-flex items-center justify-center rounded-lg bg-[var(--cmv-blue-dark)] px-4 py-2 text-sm font-semibold !text-white no-underline shadow-sm hover:bg-[var(--cmv-blue)] hover:no-underline"
                    >
                        {"Exportar m\u00eas por semanas"}
                    </a>

                    <a
                        href={yearlyHref}
                        className="inline-flex items-center justify-center rounded-lg border border-[var(--cmv-blue)] px-4 py-2 text-sm font-semibold !text-[var(--cmv-blue)] no-underline hover:bg-slate-50 hover:no-underline"
                    >
                        {"Exportar ano completo"}
                    </a>
                </div>

                <p className="text-xs text-slate-500">
                    {"A exporta\u00e7\u00e3o anual usa o ano do m\u00eas selecionado e cria uma aba para cada m\u00eas. A mensal cria uma aba para cada semana do m\u00eas."}
                </p>
            </div>
        </section>
    );
}
