import type { ProcessosRepository } from "./types";
import { SqliteProcessosRepository } from "./repository-sqlite";

function normalizeProvider(value?: string) {
    return (value || "sqlite").trim().replace(/^"|"$/g, "").toLowerCase();
}

export async function getProcessosRepository(): Promise<ProcessosRepository> {
    const provider = normalizeProvider(process.env.DATA_PROVIDER);

    if (provider === "prisma") {
        const { PrismaProcessosRepository } = await import("./repository-prisma");
        return new PrismaProcessosRepository();
    }

    return new SqliteProcessosRepository();
}
