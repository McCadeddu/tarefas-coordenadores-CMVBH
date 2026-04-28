import type { ProcessosRepository } from "./types";

function normalizeProvider(value?: string) {
    return (value || "").trim().replace(/^"|"$/g, "").toLowerCase();
}

export async function getProcessosRepository(): Promise<ProcessosRepository> {
    const provider = normalizeProvider(process.env.DATA_PROVIDER);
    const hasDatabaseUrl = Boolean(process.env.DATABASE_URL?.trim());

    if (provider === "prisma" || (!provider && hasDatabaseUrl)) {
        const { PrismaProcessosRepository } = await import("./repository-prisma");
        return new PrismaProcessosRepository();
    }

    const { SqliteProcessosRepository } = await import("./repository-sqlite");
    return new SqliteProcessosRepository();
}
