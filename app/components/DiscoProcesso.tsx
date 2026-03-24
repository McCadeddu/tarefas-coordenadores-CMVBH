"use client";

import { useState } from "react";

type Processo = {
    data_inicio: string;
    data_prevista_fim?: string | null;
    nome: string;
    etapa?: string | null;
    status?: string | null;
    equipe?: string | null;
    coord_atual?: string | null;
    coord_futuro?: string | null;
};

type Objetivo = {
    data_inicio?: string | null;
    data_fim_prevista?: string | null;
    status?: string | null;
    titulo?: string | null;
};

type Month = {
    label: string;
    data: Date;
};

type YearSegment = {
    ano: number;
    inicioMes: number;
    quantidadeMeses: number;
};

type HoverCard = {
    title: string;
    body?: string[];
};

type Props = {
    processo: Processo;
    objetivos: Objetivo[];
};

const ETAPAS = [
    "Planejamento",
    "Execução",
    "Acompanhamento",
    "Transição",
    "Concluído",
];

export default function DiscoProcesso({ processo, objetivos }: Props) {
    const size = 600;
    const center = size / 2;
    const radiusAnos = 280;
    const radiusMeses = 230;
    const radiusObjetivos = 180;
    const radiusProcesso = 142;
    const radiusInterno = 112;

    const [hover, setHover] = useState<HoverCard | null>(null);

    function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
        const rad = ((angle - 90) * Math.PI) / 180;
        return {
            x: cx + r * Math.cos(rad),
            y: cy + r * Math.sin(rad),
        };
    }

    function arcPath(startAngle: number, endAngle: number, r: number) {
        const start = polarToCartesian(center, center, r, endAngle);
        const end = polarToCartesian(center, center, r, startAngle);
        const largeArc = endAngle - startAngle <= 180 ? 0 : 1;

        return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
    }

    function diffMeses(a: string, b: string | Date) {
        const d1 = new Date(a);
        const d2 = new Date(b);
        return (
            (d2.getFullYear() - d1.getFullYear()) * 12 +
            (d2.getMonth() - d1.getMonth())
        );
    }

    function corStatus(status: string | null | undefined) {
        if (status === "Concluído") return "#86efac";
        if (status === "Atenção") return "#fde68a";
        if (status === "Transição") return "#fdba74";
        if (status === "Em andamento") return "#7dd3fc";
        return "#a5f3fc";
    }

    function corStatusProcesso(status: string | null | undefined) {
        if (status === "Concluído") return "#2563eb";
        if (status === "Ativo") return "#16a34a";
        if (status === "Atenção") return "#d97706";
        if (status === "Transição") return "#ea580c";
        if (status === "Planejado") return "#64748b";
        return "#0f766e";
    }

    function cortarTexto(texto?: string | null, limite = 18) {
        if (!texto) return "";
        if (texto.length > limite) return `${texto.slice(0, limite - 2)}...`;
        return texto;
    }

    function dataCurta(valor?: string | null) {
        if (!valor) return "—";
        const data = new Date(valor);
        if (Number.isNaN(data.getTime())) return "—";
        return data.toLocaleDateString("pt-BR");
    }

    function normalizarObjetivo(objetivo: Objetivo, index: number) {
        const total = objetivos.length || 1;
        const inicioFallback = new Date(processo.data_inicio);
        const fimProjeto = new Date(processo.data_prevista_fim || new Date());
        const duracaoProjeto = Math.max(diffMeses(processo.data_inicio, fimProjeto) + 1, 1);
        const passo = Math.max(Math.floor(duracaoProjeto / total), 1);
        const inicioEstimado = new Date(inicioFallback);
        inicioEstimado.setMonth(inicioEstimado.getMonth() + index * passo);

        const fimEstimado = new Date(inicioEstimado);
        fimEstimado.setMonth(fimEstimado.getMonth() + Math.max(passo - 1, 0));

        return {
            ...objetivo,
            data_inicio: objetivo.data_inicio || inicioEstimado.toISOString().slice(0, 10),
            data_fim_prevista:
                objetivo.data_fim_prevista || fimEstimado.toISOString().slice(0, 10),
        };
    }

    function gerarMesesProjeto(): Month[] {
        const inicio = new Date(processo.data_inicio);
        const fim = new Date(processo.data_prevista_fim || new Date());
        const lista: Month[] = [];
        const atual = new Date(inicio);

        while (atual <= fim) {
            lista.push({
                label: atual.toLocaleDateString("pt-BR", { month: "short" }),
                data: new Date(atual),
            });
            atual.setMonth(atual.getMonth() + 1);
        }

        return lista;
    }

    function gerarAnosProjeto() {
        const inicio = new Date(processo.data_inicio);
        const fim = new Date(processo.data_prevista_fim || new Date());
        const anos: YearSegment[] = [];

        for (let ano = inicio.getFullYear(); ano <= fim.getFullYear(); ano++) {
            const inicioMes = ano === inicio.getFullYear() ? inicio.getMonth() : 0;
            const fimMes = ano === fim.getFullYear() ? fim.getMonth() : 11;

            anos.push({
                ano,
                inicioMes,
                quantidadeMeses: fimMes - inicioMes + 1,
            });
        }

        return anos;
    }

    let totalMeses = diffMeses(
        processo.data_inicio,
        processo.data_prevista_fim || new Date().toISOString()
    );

    if (!totalMeses || totalMeses <= 0) {
        totalMeses = 1;
    }

    const grausPorMes = 360 / totalMeses;
    const hojeMes = diffMeses(processo.data_inicio, new Date().toISOString());
    const anguloHoje = hojeMes * grausPorMes;
    const hojePos = polarToCartesian(center, center, radiusMeses, anguloHoje);
    const anosProjeto = gerarAnosProjeto();
    const mesesProjeto = gerarMesesProjeto();
    const anguloMes = 360 / mesesProjeto.length;
    const etapaIndex = Math.max(ETAPAS.indexOf(processo.etapa || ""), 0);
    const progressoEtapa = ((etapaIndex + 1) / ETAPAS.length) * 360;
    const objetivosNormalizados = objetivos.map(normalizarObjetivo);
    const equipeLista = (processo.equipe || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    const totalEquipe = equipeLista.length;
    const nivelEquipe = Math.min(Math.max(totalEquipe, 1), 6);
    const arcoEquipe = (nivelEquipe / 6) * 360;

    function corPresenca(valor?: string | null) {
        return valor && valor.trim() ? "#0f766e" : "#cbd5e1";
    }

    function textoPresenca(valor?: string | null, vazio = "Não definido") {
        return valor && valor.trim() ? valor : vazio;
    }

    const marcadoresComunicacao = [
        {
            label: "Coord. atual",
            valor: textoPresenca(processo.coord_atual, "Sem coordenação"),
            cor: corPresenca(processo.coord_atual),
            angle: 320,
        },
        {
            label: "Coord. futura",
            valor: textoPresenca(processo.coord_futuro, "Sem transição"),
            cor: corPresenca(processo.coord_futuro),
            angle: 40,
        },
        {
            label: "Equipe",
            valor: totalEquipe > 0 ? `${totalEquipe} pessoas` : "Sem equipe",
            cor: totalEquipe > 0 ? "#0369a1" : "#cbd5e1",
            angle: 180,
        },
    ];

    return (
        <div className="relative flex flex-col items-center gap-4 pt-12">
            {hover && (
                <div className="pointer-events-none absolute top-0 z-10 max-w-[260px] rounded-sm border border-amber-300 bg-[#fff7c2] px-4 py-3 text-left text-xs text-amber-950 shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
                    <p className="font-semibold">{hover.title}</p>
                    {hover.body && hover.body.length > 0 && (
                        <div className="mt-2 space-y-1 text-[11px] leading-relaxed">
                            {hover.body.map((linha) => (
                                <p key={linha}>{linha}</p>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                className="h-auto w-full max-w-[600px]"
            >
                <circle
                    cx={center}
                    cy={center}
                    r={radiusMeses}
                    fill="none"
                    stroke="#f1f5f9"
                    strokeWidth={20}
                />

                {anosProjeto.map((anoInfo, index) => {
                    const start = diffMeses(
                        processo.data_inicio,
                        new Date(anoInfo.ano, anoInfo.inicioMes, 1)
                    ) * grausPorMes;
                    const end = start + anoInfo.quantidadeMeses * grausPorMes;
                    const midAngle = start + (end - start) / 2;
                    const cores = ["#e0f2fe", "#fef3c7", "#dcfce7", "#fde68a"];
                    const pos = polarToCartesian(center, center, radiusAnos, midAngle);
                    const isBottom = midAngle > 90 && midAngle < 270;
                    const rotation = isBottom ? midAngle + 180 : midAngle;

                    return (
                        <g key={anoInfo.ano}>
                            <path
                                d={arcPath(start, end, radiusAnos)}
                                stroke={cores[index % cores.length]}
                                strokeWidth={40}
                                fill="none"
                            />
                            <text
                                x={pos.x}
                                y={pos.y}
                                transform={`rotate(${rotation} ${pos.x} ${pos.y})`}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                className="text-[11px] font-bold fill-[var(--cmv-blue)]"
                            >
                                {anoInfo.ano}
                            </text>
                        </g>
                    );
                })}

                {mesesProjeto.map((mes, i) => {
                    const start = i * anguloMes;
                    const midAngle = start + anguloMes / 2;
                    const pos = polarToCartesian(center, center, radiusMeses - 20, midAngle);
                    const isBottom = midAngle > 90 && midAngle < 270;
                    const rotation = isBottom ? midAngle + 180 : midAngle;
                    const isFuturo = mes.data > new Date();

                    return (
                        <g key={mes.data.toISOString()}>
                            <line
                                x1={center}
                                y1={center}
                                x2={polarToCartesian(center, center, radiusMeses, start).x}
                                y2={polarToCartesian(center, center, radiusMeses, start).y}
                                stroke="#e2e8f0"
                                strokeWidth={1}
                            />
                            <text
                                x={pos.x}
                                y={pos.y}
                                transform={`rotate(${rotation} ${pos.x} ${pos.y})`}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                className="text-[11px] font-bold fill-[var(--cmv-brown)]"
                                opacity={isFuturo ? 0.4 : 1}
                            >
                                {mes.label?.[0]?.toUpperCase()}
                            </text>
                        </g>
                    );
                })}

                <circle
                    cx={center}
                    cy={center}
                    r={radiusProcesso}
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth={20}
                />

                <path
                    d={arcPath(0, arcoEquipe, radiusProcesso - 24)}
                    stroke={totalEquipe > 0 ? "#38bdf8" : "#cbd5e1"}
                    strokeWidth={10}
                    fill="none"
                    strokeLinecap="round"
                    onMouseEnter={() =>
                        setHover({
                            title: "Equipe",
                            body: totalEquipe > 0
                                ? [`${totalEquipe} integrante(s)`, equipeLista.join(", ")]
                                : ["Equipe ainda não definida"],
                        })
                    }
                    onMouseLeave={() => setHover(null)}
                />

                <path
                    d={arcPath(0, progressoEtapa, radiusProcesso)}
                    stroke={corStatusProcesso(processo.status)}
                    strokeWidth={20}
                    fill="none"
                    strokeLinecap="round"
                    onMouseEnter={() =>
                        setHover({
                            title: "Processo",
                            body: [
                                `Etapa: ${processo.etapa || "Sem etapa"}`,
                                `Status: ${processo.status || "Sem status"}`,
                            ],
                        })
                    }
                    onMouseLeave={() => setHover(null)}
                />

                {objetivosNormalizados.map((objetivo, i) => {
                    if (!objetivo.data_inicio || !objetivo.data_fim_prevista) return null;

                    const inicio = diffMeses(processo.data_inicio, objetivo.data_inicio);
                    const duracao =
                        diffMeses(objetivo.data_inicio, objetivo.data_fim_prevista) + 1;
                    const start = inicio * grausPorMes;
                    const end = start + Math.max(duracao, 1) * grausPorMes;
                    const id = `obj-path-${i}`;

                    return (
                        <g key={`${objetivo.titulo}-${i}`}>
                            <path
                                d={arcPath(start, end, radiusObjetivos)}
                                stroke={corStatus(objetivo.status)}
                                strokeWidth={18}
                                fill="none"
                                onMouseEnter={() =>
                                    setHover({
                                        title: objetivo.titulo || "Objetivo",
                                        body: [
                                            `Status: ${objetivo.status || "Planejado"}`,
                                            `Início: ${dataCurta(objetivo.data_inicio)}`,
                                            `Previsão: ${dataCurta(objetivo.data_fim_prevista)}`,
                                        ],
                                    })
                                }
                                onMouseLeave={() => setHover(null)}
                            />

                            <path
                                id={id}
                                d={arcPath(start, end, radiusObjetivos - 15)}
                                fill="none"
                                stroke="none"
                            />

                            <text className="pointer-events-none text-[10px] fill-[var(--cmv-brown)]">
                                <textPath href={`#${id}`} startOffset="50%" textAnchor="middle">
                                    {cortarTexto(objetivo.titulo)}
                                </textPath>
                            </text>
                        </g>
                    );
                })}

                <circle
                    cx={center}
                    cy={center}
                    r={radiusInterno}
                    fill="#f8fafc"
                    stroke="#e0f2fe"
                    strokeWidth={5}
                />

                {marcadoresComunicacao.map((item) => {
                    const ponto = polarToCartesian(center, center, radiusInterno + 22, item.angle);
                    return (
                        <g
                            key={item.label}
                            onMouseEnter={() =>
                                setHover({
                                    title: item.label,
                                    body: [item.valor],
                                })
                            }
                            onMouseLeave={() => setHover(null)}
                        >
                            <circle
                                cx={ponto.x}
                                cy={ponto.y}
                                r={10}
                                fill={item.cor}
                                stroke="#ffffff"
                                strokeWidth={3}
                            />
                        </g>
                    );
                })}

                <text
                    x="50%"
                    y="46%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-sm font-bold fill-[var(--cmv-blue)]"
                >
                    {cortarTexto(processo.nome, 26)}
                </text>

                <text
                    x="50%"
                    y="52%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-[12px] fill-[var(--cmv-brown)]"
                >
                    {cortarTexto(processo.etapa || "Sem etapa", 22)}
                </text>

                <text
                    x="50%"
                    y="57%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-[11px] fill-slate-500"
                >
                    {processo.status || "Sem status"}
                </text>

                <text
                    x="50%"
                    y="62%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-[10px] fill-slate-500"
                >
                    {totalEquipe > 0 ? `${totalEquipe} na equipe` : "Equipe pendente"}
                </text>

                <line
                    x1={center}
                    y1={center}
                    x2={hojePos.x}
                    y2={hojePos.y}
                    stroke="#ef4444"
                    strokeWidth={2}
                />
            </svg>

            <div className="flex flex-wrap justify-center gap-4 text-xs">
                <span className="flex items-center gap-1">
                    <span className="h-3 w-3 rounded-full bg-[#16a34a]"></span>
                    Status do processo
                </span>
                <span className="flex items-center gap-1">
                    <span className="h-3 w-3 rounded-full bg-[#38bdf8]"></span>
                    Tamanho da equipe
                </span>
                <span className="flex items-center gap-1">
                    <span className="h-3 w-3 rounded-full bg-[#0f766e]"></span>
                    Coordenação definida
                </span>
                <span className="flex items-center gap-1">
                    <span className="h-3 w-3 rounded-full bg-[#86efac]"></span>
                    Objetivo concluído
                </span>
                <span className="flex items-center gap-1">
                    <span className="h-3 w-3 rounded-full bg-[#fde68a]"></span>
                    Objetivo em atenção
                </span>
                <span className="flex items-center gap-1">
                    <span className="h-3 w-3 rounded-full bg-[#fdba74]"></span>
                    Objetivo em transição
                </span>
            </div>
        </div>
    );
}
