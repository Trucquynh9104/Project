// Local persistent SQLite/R2 adapter. Hosted production continues to use D1/R2.
import { DatabaseSync } from "node:sqlite";
import { mkdir, readFile, readdir, writeFile, stat } from "node:fs/promises";
import path from "node:path";
export async function createLocalRuntime(directory = ".blossom") {
  const root = path.resolve(directory);
  await mkdir(root, { recursive: true });
  const sqlite = new DatabaseSync(path.join(root, "data.sqlite"));
  sqlite.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;");
  sqlite.exec(
    "CREATE TABLE IF NOT EXISTS local_migrations (name TEXT PRIMARY KEY)",
  );
  for (const name of (await readdir(new URL("../drizzle/", import.meta.url)))
    .filter((v) => v.endsWith(".sql"))
    .sort()) {
    if (
      sqlite.prepare("SELECT name FROM local_migrations WHERE name=?").get(name)
    )
      continue;
    sqlite.exec("BEGIN");
    try {
      sqlite.exec(
        await readFile(new URL("../drizzle/" + name, import.meta.url), "utf8"),
      );
      sqlite.prepare("INSERT INTO local_migrations(name) VALUES (?)").run(name);
      sqlite.exec("COMMIT");
    } catch (e) {
      sqlite.exec("ROLLBACK");
      throw e;
    }
  }
  const DB = {
    prepare(sql) {
      let args = [];
      return {
        bind(...values) {
          args = values;
          return this;
        },
        async first() {
          return sqlite.prepare(sql).get(...args) || null;
        },
        async run() {
          const result = sqlite.prepare(sql).run(...args);
          return { meta: { changes: Number(result.changes) } };
        },
      };
    },
    async batch(statements) {
      sqlite.exec("BEGIN");
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.run());
        sqlite.exec("COMMIT");
        return results;
      } catch (e) {
        sqlite.exec("ROLLBACK");
        throw e;
      }
    },
  };
  const mediaRoot = path.join(root, "media");
  function mediaPath(key) {
    const result = path.resolve(mediaRoot, key);
    if (!result.startsWith(mediaRoot + path.sep))
      throw new Error("Invalid media key");
    return result;
  }
  const BUCKET = {
    async put(key, bytes, options) {
      const file = mediaPath(key);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, bytes);
      await writeFile(file + ".json", JSON.stringify(options || {}));
    },
    async get(key) {
      try {
        const file = mediaPath(key);
        await stat(file);
        const options = JSON.parse(await readFile(file + ".json", "utf8"));
        return {
          body: await readFile(file),
          httpMetadata: options.httpMetadata,
        };
      } catch {
        return null;
      }
    },
  };
  return { env: { DB, BUCKET }, close: () => sqlite.close() };
}
