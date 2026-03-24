export type ProcessoListItem = {
    id: number | string;
    slug: string;
    nome: string;
    ambito: string;
    equipe: string | null;
    coord_atual: string | null;
    coord_futuro: string | null;
    etapa: string;
    etapa_desde: string | null;
    status: string;
    data_inicio: string | null;
    data_prevista_fim: string | null;
    data_fim: string | null;
};

export type ProcessoDetalhe = ProcessoListItem & {
    objetivo_geral: string | null;
    objetivo_inicio: string | null;
    objetivo_fim_previsto: string | null;
    observacoes: string | null;
};

export type ObjetivoItem = {
    id: number | string;
    ordem: number;
    titulo: string;
    data_inicio: string | null;
    data_fim_prevista: string | null;
    status: string | null;
    criado_em?: string | null;
};

export type EventoItem = {
    tipo: string;
    campo: string | null;
    valor_anterior: string | null;
    valor_novo: string | null;
    observacao?: string | null;
    visivel?: number | boolean | null;
    criado_em: string;
};

export type ObjetivoInput = {
    id?: number | string;
    ordem?: number;
    titulo?: string;
    data_inicio?: string | null;
    data_fim_prevista?: string | null;
    status?: string | null;
};

export type ProcessoInput = {
    slug?: string;
    nome?: string;
    ambito?: string;
    equipe?: string | null;
    coord_atual?: string | null;
    coord_futuro?: string | null;
    etapa?: string;
    status?: string;
    data_inicio?: string | null;
    data_prevista_fim?: string | null;
    objetivo_geral?: string | null;
    objetivo_inicio?: string | null;
    objetivo_fim_previsto?: string | null;
    observacoes?: string | null;
    objetivos?: ObjetivoInput[];
};

export type RepositoryMutationResult = {
    ok: boolean;
    notFound?: boolean;
};

export interface ProcessosRepository {
    listProcessos(): Promise<ProcessoListItem[]>;
    getProcessoBySlug(slug: string): Promise<ProcessoDetalhe | null>;
    listObjetivos(slug: string): Promise<ObjetivoItem[]>;
    listEventos(slug: string): Promise<EventoItem[]>;
    createProcesso(input: ProcessoInput): Promise<RepositoryMutationResult>;
    updateProcesso(slug: string, input: ProcessoInput): Promise<RepositoryMutationResult>;
    deleteProcesso(slug: string): Promise<RepositoryMutationResult>;
    createObjetivo(slug: string, input: ObjetivoInput): Promise<RepositoryMutationResult>;
    updateObjetivo(slug: string, id: string, input: ObjetivoInput): Promise<RepositoryMutationResult>;
}
