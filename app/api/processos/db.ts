// app/api/processos/db.ts

import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "cmv-bh.db");
const db = new Database(dbPath);

db.prepare(`
  CREATE TABLE IF NOT EXISTS processos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    nome TEXT NOT NULL,
    ambito TEXT NOT NULL,
    equipe TEXT,
    coord_atual TEXT,
    coord_futuro TEXT,
    etapa TEXT,
    etapa_desde TEXT,
    status TEXT,
    data_inicio TEXT,
    data_prevista_fim TEXT,
    data_fim TEXT,
    objetivo_geral TEXT,
    objetivo_inicio TEXT,
    objetivo_fim_previsto TEXT,
    observacoes TEXT,
    criado_em TEXT NOT NULL,
    atualizado_em TEXT NOT NULL
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS processos_objetivos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    processo_slug TEXT NOT NULL,
    ordem INTEGER NOT NULL,
    titulo TEXT NOT NULL,
    data_inicio TEXT,
    data_fim_prevista TEXT,
    status TEXT,
    criado_em TEXT NOT NULL,
    FOREIGN KEY (processo_slug) REFERENCES processos(slug)
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS processos_eventos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    processo_slug TEXT NOT NULL,
    tipo TEXT NOT NULL,
    campo TEXT,
    valor_anterior TEXT,
    valor_novo TEXT,
    observacao TEXT,
    visivel INTEGER DEFAULT 1,
    criado_em TEXT NOT NULL,
    FOREIGN KEY (processo_slug) REFERENCES processos(slug)
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS auth_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    nome TEXT,
    role TEXT NOT NULL DEFAULT 'EQUIPE',
    password_hash TEXT,
    password_salt TEXT,
    verified_em TEXT,
    criado_em TEXT NOT NULL,
    atualizado_em TEXT NOT NULL
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS auth_verification_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    purpose TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    code_salt TEXT NOT NULL,
    expires_em TEXT NOT NULL,
    used_em TEXT,
    criado_em TEXT NOT NULL
  )
`).run();

db.prepare(`
  CREATE INDEX IF NOT EXISTS idx_auth_codes_email
  ON auth_verification_codes (email, purpose, expires_em)
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS processos_encontros (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    processo_slug TEXT NOT NULL,
    titulo TEXT NOT NULL,
    data_encontro TEXT NOT NULL,
    pauta_geral TEXT,
    secretario TEXT,
    criado_em TEXT NOT NULL,
    atualizado_em TEXT NOT NULL,
    FOREIGN KEY (processo_slug) REFERENCES processos(slug)
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS processos_encontros_presencas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    encontro_id INTEGER NOT NULL,
    nome TEXT NOT NULL,
    presente INTEGER NOT NULL DEFAULT 1,
    criado_em TEXT NOT NULL,
    FOREIGN KEY (encontro_id) REFERENCES processos_encontros(id)
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS processos_encontros_pautas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    encontro_id INTEGER NOT NULL,
    ordem INTEGER NOT NULL,
    titulo TEXT NOT NULL,
    relatorio TEXT,
    decisao_titulo TEXT,
    votos_favoraveis INTEGER NOT NULL DEFAULT 0,
    votos_contrarios INTEGER NOT NULL DEFAULT 0,
    abstencoes INTEGER NOT NULL DEFAULT 0,
    encaminhamento TEXT,
    criado_em TEXT NOT NULL,
    atualizado_em TEXT NOT NULL,
    FOREIGN KEY (encontro_id) REFERENCES processos_encontros(id)
  )
`).run();

export default db;
