import { env } from "cloudflare:workers";

let initialized: Promise<void> | undefined;

export function ensureDatabase() {
  if (initialized) return initialized;
  initialized = (async () => {
    const d1 = (env as unknown as { DB?: D1Database }).DB;
    if (!d1) throw new Error("D1 binding `DB` is unavailable");
    await d1.batch([
      d1.prepare(`CREATE TABLE IF NOT EXISTS papers (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        slug text NOT NULL UNIQUE,
        title text NOT NULL,
        title_zh text DEFAULT '' NOT NULL,
        doi text DEFAULT '' NOT NULL,
        category text NOT NULL,
        subcategory text NOT NULL,
        classifications text DEFAULT '[]' NOT NULL,
        journal text DEFAULT '待补充' NOT NULL,
        published text DEFAULT '待补充' NOT NULL,
        authors text DEFAULT '[]' NOT NULL,
        institutions text DEFAULT '[]' NOT NULL,
        author_details text DEFAULT '[]' NOT NULL,
        abstract_zh text DEFAULT '' NOT NULL,
        insight text DEFAULT '' NOT NULL,
        tags text DEFAULT '[]' NOT NULL,
        source_url text DEFAULT '' NOT NULL,
        file_key text,
        figure_keys text DEFAULT '[]' NOT NULL,
        key_figure_key text,
        figure_caption text DEFAULT '' NOT NULL,
        submitter_name text DEFAULT '匿名投稿者' NOT NULL,
        submitter_email text DEFAULT '' NOT NULL,
        upload_token text DEFAULT '' NOT NULL,
        status text DEFAULT 'pending' NOT NULL,
        reviewed_at text,
        created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
      )`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS comments (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        paper_slug text NOT NULL,
        author text NOT NULL,
        content text NOT NULL,
        created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
      )`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS institutions (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        full_name text NOT NULL UNIQUE,
        normalized_name text NOT NULL,
        aliases text DEFAULT '[]' NOT NULL,
        created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
      )`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS paper_edits (
        slug text PRIMARY KEY NOT NULL,
        data text NOT NULL,
        updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
      )`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS paper_audit_logs (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        paper_slug text NOT NULL,
        actor text DEFAULT '' NOT NULL,
        action text NOT NULL,
        changes text DEFAULT '[]' NOT NULL,
        created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
      )`),
      d1.prepare("CREATE INDEX IF NOT EXISTS papers_category_idx ON papers (category)"),
      d1.prepare("CREATE INDEX IF NOT EXISTS papers_status_idx ON papers (status)"),
      d1.prepare("CREATE INDEX IF NOT EXISTS papers_created_at_idx ON papers (created_at)"),
      d1.prepare("CREATE INDEX IF NOT EXISTS comments_paper_slug_idx ON comments (paper_slug)"),
      d1.prepare("CREATE INDEX IF NOT EXISTS institutions_normalized_name_idx ON institutions (normalized_name)"),
      d1.prepare("CREATE INDEX IF NOT EXISTS paper_audit_logs_slug_idx ON paper_audit_logs (paper_slug)"),
    ]);
    const paperColumns = await d1.prepare("PRAGMA table_info(papers)").all<{ name: string }>();
    if (!paperColumns.results.some((column) => column.name === "author_details")) {
      await d1.prepare("ALTER TABLE papers ADD COLUMN author_details text DEFAULT '[]' NOT NULL").run();
    }
    if (!paperColumns.results.some((column) => column.name === "classifications")) {
      await d1.prepare("ALTER TABLE papers ADD COLUMN classifications text DEFAULT '[]' NOT NULL").run();
    }
    if (!paperColumns.results.some((column) => column.name === "title_zh")) {
      await d1.prepare("ALTER TABLE papers ADD COLUMN title_zh text DEFAULT '' NOT NULL").run();
    }
    if (!paperColumns.results.some((column) => column.name === "doi")) {
      await d1.prepare("ALTER TABLE papers ADD COLUMN doi text DEFAULT '' NOT NULL").run();
    }
    if (!paperColumns.results.some((column) => column.name === "upload_token")) {
      await d1.prepare("ALTER TABLE papers ADD COLUMN upload_token text DEFAULT '' NOT NULL").run();
    }
  })().catch((error) => { initialized = undefined; throw error; });
  return initialized;
}
