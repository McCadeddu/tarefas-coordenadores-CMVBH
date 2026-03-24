import { cookies } from "next/headers";
import db from "@/app/api/processos/db";
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
    id: number;
    email: string;
    nome: string | null;
    role: AppSession["role"];
    password_hash: string | null;
    password_salt: string | null;
    verified_em: string | null;
};

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

function getUserByEmail(email: string) {
    return db.prepare(`
        SELECT id, email, nome, role, password_hash, password_salt, verified_em
        FROM auth_users
        WHERE email = ?
    `).get(normalizeEmail(email)) as AuthUserRow | undefined;
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

    const user = getUserByEmail(normalizedEmail);
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

    db.prepare(`
        UPDATE auth_verification_codes
        SET used_em = ?
        WHERE email = ? AND purpose = 'FIRST_ACCESS' AND used_em IS NULL
    `).run(nowIso(), normalizedEmail);

    db.prepare(`
        INSERT INTO auth_verification_codes
        (email, purpose, code_hash, code_salt, expires_em, criado_em)
        VALUES (?, 'FIRST_ACCESS', ?, ?, ?, ?)
    `).run(normalizedEmail, codeHash, salt, expiresIso(CODE_TTL_MINUTES), nowIso());

    const mailResult = await sendVerificationEmail(normalizedEmail, code);

    return {
        ok: true as const,
        previewCode: mailResult.previewCode,
        delivered: mailResult.delivered,
    };
}

export async function verifyFirstAccessCode(email: string, code: string) {
    const normalizedEmail = normalizeEmail(email);
    const rows = db.prepare(`
        SELECT id, code_hash, code_salt, expires_em, used_em
        FROM auth_verification_codes
        WHERE email = ? AND purpose = 'FIRST_ACCESS'
        ORDER BY id DESC
    `).all(normalizedEmail) as Array<{
        id: number;
        code_hash: string;
        code_salt: string;
        expires_em: string;
        used_em: string | null;
    }>;

    const now = Date.now();

    for (const row of rows) {
        if (row.used_em) continue;
        if (new Date(row.expires_em).getTime() < now) continue;

        const hash = await hashSecret(code, row.code_salt);
        if (hash !== row.code_hash) continue;

        db.prepare(`UPDATE auth_verification_codes SET used_em = ? WHERE id = ?`).run(nowIso(), row.id);
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
    setupToken: string;
    password: string;
    name?: string;
}) {
    const normalizedEmail = normalizeEmail(params.email);

    if (!isInstitutionalEmail(normalizedEmail)) {
        return { ok: false as const, error: "Use um email institucional valido." };
    }

    if (params.password.length < 6) {
        return { ok: false as const, error: "A senha precisa ter pelo menos 6 caracteres." };
    }

    const payload = await verifySignedPayload<SetupTokenPayload>(params.setupToken).catch(() => null);
    if (!payload || payload.email !== normalizedEmail || payload.purpose !== "FIRST_ACCESS") {
        return { ok: false as const, error: "Validacao de primeiro acesso invalida." };
    }

    const salt = randomSalt();
    const passwordHash = await hashSecret(params.password, salt);
    const existing = getUserByEmail(normalizedEmail);
    const name = (params.name || normalizedEmail.split("@")[0]).trim();
    const timestamp = nowIso();

    if (existing) {
        db.prepare(`
            UPDATE auth_users
            SET nome = ?, password_hash = ?, password_salt = ?, verified_em = ?, atualizado_em = ?
            WHERE email = ?
        `).run(name, passwordHash, salt, timestamp, timestamp, normalizedEmail);
    } else {
        db.prepare(`
            INSERT INTO auth_users
            (email, nome, role, password_hash, password_salt, verified_em, criado_em, atualizado_em)
            VALUES (?, ?, 'EQUIPE', ?, ?, ?, ?, ?)
        `).run(normalizedEmail, name, passwordHash, salt, timestamp, timestamp, timestamp);
    }

    return {
        ok: true as const,
        session: {
            email: normalizedEmail,
            name,
            role: (existing?.role || "EQUIPE") as AppSession["role"],
        } satisfies AppSession,
    };
}
