import type { ProcessosRepository } from "./types";
import { SqliteProcessosRepository } from "./repository-sqlite";

export async function getProcessosRepository(): Promise<ProcessosRepository> {
    const provider = process.env.DATA_PROVIDER?.toLowerCase() ?? "sqlite";

    if (provider === "prisma") {
        const { PrismaProcessosRepository } = await import("./repository-prisma");
        return new PrismaProcessosRepository();
    }

    return new SqliteProcessosRepository();
}
