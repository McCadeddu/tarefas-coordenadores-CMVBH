// app/api/processos/db.ts

import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "cmv-bh.db");

const db = new Database(dbPath);

// Tabela de processos
db.prepare(`
  CREATE TABLE IF NOT EXISTS processos_eventos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    processo_slug TEXT NOT NULL,

    tipo TEXT NOT NULL,
    campo TEXT,
    valor_anterior TEXT,
    valor_novo TEXT,

    observacao TEXT,

    visivel INTEGER DEFAULT 1,   -- 1 = visível, 0 = oculto

    criado_em TEXT NOT NULL,

    FOREIGN KEY (processo_slug) REFERENCES processos(slug)
  )
`).run();

export default db;
