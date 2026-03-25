import { cookies } from "next/headers";
import { sendVerificationEmail } from "./mailer";
import {
    createSessionToken,
    SESSION_COOKIE,
    verifySessionToken,
    verifySignedPayload,
    signPayload,
} from "@/lib/shared/session-token";
import type { AppSession } from "@/lib/shared/session-token";

const CODE_TTL_MINUTES = 15;

type SetupTokenPayload = {
    email: string;
    purpose: "FIRST_ACCESS";
    exp: number;
};

type AuthUserRow = {
    id: number | string;
    email: string;
    nome: string | null;
    role: AppSession["role"];
    password_hash: string | null;
    password_salt: string | null;
    verified_em: string | null;
};

type VerificationCodeRow = {
    id: number | string;
    code_hash: string;
    code_salt: string;
    expires_em: string;
    used_em: string | null;
};

function normalizeEnvValue(value: string | undefined, fallback: string) {
    return (value || fallback).trim().replace(/^"|"$/g, "").toLowerCase();
}

function isPrismaProvider() {
    const provider = normalizeEnvValue(process.env.DATA_PROVIDER, "");
    return provider === "prisma" || (!provider && Boolean(process.env.DATABASE_URL?.trim()));
}

async function getPrisma() {
    const { default: prisma } = await import("@/lib/server/prisma");
    return prisma;
}

async function getSqliteDb() {
    const { default: db } = await import("@/app/api/processos/db");
    return db;
}

async function digestText(value: string) {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
    const bytes = new Uint8Array(digest);
    let binary = "";
    bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
    });
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function randomDigits(length: number) {
    let result = "";
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);

    for (let i = 0; i < length; i += 1) {
        result += String(bytes[i] % 10);
    }

    return result;
}

function randomSalt() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    let binary = "";
    bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
    });
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function hashSecret(secret: string, salt: string) {
    return digestText(`${salt}:${secret}:${process.env.AUTH_SECRET || "local"}`);
}

function nowIso() {
    return new Date().toISOString();
}

function expiresIso(minutes: number) {
    return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

function normalizeEmail(email: string) {
    return email.trim().toLowerCase();
}

export function isInstitutionalEmail(email: string) {
    return normalizeEmail(email).endsWith("@villaregia.org");
}

function getBootstrapUser() {
    return {
        email: normalizeEmail(process.env.BOOTSTRAP_ADMIN_EMAIL || "admin@villaregia.org"),
        password: process.env.BOOTSTRAP_ADMIN_PASSWORD || "admin123",
        name: "Administracao CMV",
        role: "ADMIN" as const,
    };
}

async function getUserByEmail(email: string): Promise<AuthUserRow | null> {
    const normalizedEmail = normalizeEmail(email);

    if (isPrismaProvider()) {
        const prisma = await getPrisma();
        const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (!user) return null;
        return {
            id: user.id,
            email: user.email,
            nome: user.name,
            role: user.role,
            password_hash: user.passwordHash,
            password_salt: user.passwordSalt,
            verified_em: user.verifiedAt?.toISOString() || null,
        };
    }

    const db = await getSqliteDb();
    return (
        (db.prepare(`
            SELECT id, email, nome, role, password_hash, password_salt, verified_em
            FROM auth_users
            WHERE email = ?
        `).get(normalizedEmail) as AuthUserRow | undefined) ?? null
    );
}

async function invalidateOpenCodes(email: string) {
    const normalizedEmail = normalizeEmail(email);
    const timestamp = nowIso();

    if (isPrismaProvider()) {
        const prisma = await getPrisma();
        await prisma.authVerificationCode.updateMany({
            where: {
                email: normalizedEmail,
                purpose: "FIRST_ACCESS",
                usedAt: null,
            },
            data: { usedAt: new Date(timestamp) },
        });
        return;
    }

    const db = await getSqliteDb();
    db.prepare(`
        UPDATE auth_verification_codes
        SET used_em = ?
        WHERE email = ? AND purpose = 'FIRST_ACCESS' AND used_em IS NULL
    `).run(timestamp, normalizedEmail);
}

async function insertVerificationCode(email: string, codeHash: string, codeSalt: string) {
    const normalizedEmail = normalizeEmail(email);
    const createdAt = nowIso();
    const expiresAt = expiresIso(CODE_TTL_MINUTES);

    if (isPrismaProvider()) {
        const prisma = await getPrisma();
        const user = await prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } });
        await prisma.authVerificationCode.create({
            data: {
                email: normalizedEmail,
                purpose: "FIRST_ACCESS",
                codeHash,
                codeSalt,
                expiresAt: new Date(expiresAt),
                createdAt: new Date(createdAt),
                userId: user?.id,
            },
        });
        return;
    }

    const db = await getSqliteDb();
    db.prepare(`
        INSERT INTO auth_verification_codes
        (email, purpose, code_hash, code_salt, expires_em, criado_em)
        VALUES (?, 'FIRST_ACCESS', ?, ?, ?, ?)
    `).run(normalizedEmail, codeHash, codeSalt, expiresAt, createdAt);
}

async function listVerificationCodes(email: string): Promise<VerificationCodeRow[]> {
    const normalizedEmail = normalizeEmail(email);

    if (isPrismaProvider()) {
        const prisma = await getPrisma();
        const rows = await prisma.authVerificationCode.findMany({
            where: {
                email: normalizedEmail,
                purpose: "FIRST_ACCESS",
            },
            orderBy: { createdAt: "desc" },
        });

        return rows.map((row: {
            id: string;
            codeHash: string;
            codeSalt: string;
            expiresAt: Date;
            usedAt: Date | null;
        }) => ({
            id: row.id,
            code_hash: row.codeHash,
            code_salt: row.codeSalt,
            expires_em: row.expiresAt.toISOString(),
            used_em: row.usedAt?.toISOString() || null,
        }));
    }

    const db = await getSqliteDb();
    return db.prepare(`
        SELECT id, code_hash, code_salt, expires_em, used_em
        FROM auth_verification_codes
        WHERE email = ? AND purpose = 'FIRST_ACCESS'
        ORDER BY id DESC
    `).all(normalizedEmail) as VerificationCodeRow[];
}

async function markVerificationCodeUsed(id: string | number) {
    const timestamp = nowIso();

    if (isPrismaProvider()) {
        const prisma = await getPrisma();
        await prisma.authVerificationCode.update({
            where: { id: String(id) },
            data: { usedAt: new Date(timestamp) },
        });
        return;
    }

    const db = await getSqliteDb();
    db.prepare(`UPDATE auth_verification_codes SET used_em = ? WHERE id = ?`).run(timestamp, id);
}

async function upsertUser(params: {
    email: string;
    name: string;
    passwordHash: string;
    passwordSalt: string;
    existingRole?: AppSession["role"] | null;
}) {
    const normalizedEmail = normalizeEmail(params.email);
    const timestamp = nowIso();

    if (isPrismaProvider()) {
        const prisma = await getPrisma();
        await prisma.user.upsert({
            where: { email: normalizedEmail },
            create: {
                email: normalizedEmail,
                name: params.name,
                role: params.existingRole || "EQUIPE",
                passwordHash: params.passwordHash,
                passwordSalt: params.passwordSalt,
                verifiedAt: new Date(timestamp),
            },
            update: {
                name: params.name,
                passwordHash: params.passwordHash,
                passwordSalt: params.passwordSalt,
                verifiedAt: new Date(timestamp),
                ...(params.existingRole ? { role: params.existingRole } : {}),
            },
        });
        return;
    }

    const db = await getSqliteDb();
    const existing = await getUserByEmail(normalizedEmail);
    if (existing) {
        db.prepare(`
            UPDATE auth_users
            SET nome = ?, password_hash = ?, password_salt = ?, verified_em = ?, atualizado_em = ?
            WHERE email = ?
        `).run(params.name, params.passwordHash, params.passwordSalt, timestamp, timestamp, normalizedEmail);
    } else {
        db.prepare(`
            INSERT INTO auth_users
            (email, nome, role, password_hash, password_salt, verified_em, criado_em, atualizado_em)
            VALUES (?, ?, 'EQUIPE', ?, ?, ?, ?, ?)
        `).run(normalizedEmail, params.name, params.passwordHash, params.passwordSalt, timestamp, timestamp, timestamp);
    }
}

export { createSessionToken, SESSION_COOKIE, verifySessionToken };
export type { AppSession };

export async function getCurrentSession() {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;

    try {
        return await verifySessionToken(token);
    } catch {
        return null;
    }
}

export async function authenticateUser(email: string, password: string) {
    const normalizedEmail = normalizeEmail(email);
    const bootstrap = getBootstrapUser();

    if (normalizedEmail === bootstrap.email && password === bootstrap.password) {
        return {
            email: bootstrap.email,
            name: bootstrap.name,
            role: bootstrap.role,
        } satisfies AppSession;
    }

    const user = await getUserByEmail(normalizedEmail);
    if (!user?.password_hash || !user.password_salt) {
        return null;
    }

    const hash = await hashSecret(password, user.password_salt);
    if (hash !== user.password_hash) {
        return null;
    }

    return {
        email: user.email,
        name: user.nome || normalizedEmail.split("@")[0],
        role: user.role,
    } satisfies AppSession;
}

export async function requestEmailCode(email: string) {
    const normalizedEmail = normalizeEmail(email);

    if (!isInstitutionalEmail(normalizedEmail)) {
        return { ok: false as const, error: "Use um email institucional @villaregia.org." };
    }

    const code = randomDigits(6);
    const salt = randomSalt();
    const codeHash = await hashSecret(code, salt);

    await invalidateOpenCodes(normalizedEmail);
    await insertVerificationCode(normalizedEmail, codeHash, salt);

    const mailResult = await sendVerificationEmail(normalizedEmail, code);

    return {
        ok: true as const,
        previewCode: mailResult.previewCode,
        delivered: mailResult.delivered,
    };
}

export async function verifyFirstAccessCode(email: string, code: string) {
    const normalizedEmail = normalizeEmail(email);
    const rows = await listVerificationCodes(normalizedEmail);
    const now = Date.now();

    for (const row of rows) {
        if (row.used_em) continue;
        if (new Date(row.expires_em).getTime() < now) continue;

        const hash = await hashSecret(code, row.code_salt);
        if (hash !== row.code_hash) continue;

        await markVerificationCodeUsed(row.id);
        const setupToken = await signPayload<SetupTokenPayload>({
            email: normalizedEmail,
            purpose: "FIRST_ACCESS",
            exp: Math.floor(Date.now() / 1000) + CODE_TTL_MINUTES * 60,
        });

        return {
            ok: true as const,
            setupToken,
        };
    }

    return { ok: false as const, error: "Codigo invalido ou expirado." };
}

export async function completeFirstAccess(params: {
    email: string;
    setupToken?: string;
    password: string;
    name?: string;
}) {
    const normalizedEmail = normalizeEmail(params.email);

    if (!isInstitutionalEmail(normalizedEmail)) {
        return { ok: false as const, error: "Use um email institucional valido." };
    }

    if (!/^\d{6}$/.test(params.password)) {
        return { ok: false as const, error: "A senha precisa ter exatamente 6 numeros." };
    }

    if (params.setupToken) {
        const payload = await verifySignedPayload<SetupTokenPayload>(params.setupToken).catch(() => null);
        if (!payload || payload.email != normalizedEmail || payload.purpose != "FIRST_ACCESS") {
            return { ok: false as const, error: "Validacao de primeiro acesso invalida." };
        }
    }

    const existing = await getUserByEmail(normalizedEmail);
    if (existing?.password_hash && existing.password_salt) {
        return { ok: false as const, error: "Este email ja possui senha cadastrada." };
    }

    const salt = randomSalt();
    const passwordHash = await hashSecret(params.password, salt);
    const name = (params.name || existing?.nome || normalizedEmail.split("@")[0]).trim();

    await upsertUser({
        email: normalizedEmail,
        name,
        passwordHash,
        passwordSalt: salt,
        existingRole: existing?.role || "EQUIPE",
    });

    return {
        ok: true as const,
        session: {
            email: normalizedEmail,
            name,
            role: (existing?.role || "EQUIPE") as AppSession["role"],
        } satisfies AppSession,
    };
}
