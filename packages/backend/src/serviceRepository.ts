import { randomUUID } from "crypto";
import { db } from "./db";
import type { ServiceEntry, CreateServiceInput, UpdateServiceInput } from "@local-dashboard/shared";

interface DbRow {
  id: string;
  name: string;
  url: string;
  description: string | null;
  tags: string;
  icon: string | null;
  source: string;
  isActive: number;
  createdAt: string;
  updatedAt: string;
}

function rowToEntry(row: DbRow): ServiceEntry {
  return {
    ...row,
    description: row.description ?? undefined,
    icon: row.icon ?? undefined,
    tags: JSON.parse(row.tags) as string[],
    source: row.source as ServiceEntry["source"],
    isActive: row.isActive === 1,
  };
}

export const ServiceRepository = {
  findAll(filters?: { tags?: string; source?: string }): ServiceEntry[] {
    let query = "SELECT * FROM services";
    const params: string[] = [];

    if (filters?.source) {
      query += " WHERE source = ?";
      params.push(filters.source);
    }

    const rows = db.prepare(query).all(...params) as DbRow[];
    let entries = rows.map(rowToEntry);

    if (filters?.tags) {
      const tagFilter = filters.tags.split(",").map((t) => t.trim());
      entries = entries.filter((e) => tagFilter.some((t) => e.tags.includes(t)));
    }

    return entries;
  },

  findById(id: string): ServiceEntry | null {
    const row = db.prepare("SELECT * FROM services WHERE id = ?").get(id) as DbRow | null;
    return row ? rowToEntry(row) : null;
  },

  create(input: CreateServiceInput): ServiceEntry {
    const now = new Date().toISOString();
    const entry: ServiceEntry = {
      id: randomUUID(),
      name: input.name,
      url: input.url,
      description: input.description,
      tags: input.tags ?? [],
      icon: input.icon,
      source: input.source ?? "manual",
      isActive: false,
      createdAt: now,
      updatedAt: now,
    };

    db.prepare(
      `INSERT INTO services (id, name, url, description, tags, icon, source, isActive, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      entry.id,
      entry.name,
      entry.url,
      entry.description ?? null,
      JSON.stringify(entry.tags),
      entry.icon ?? null,
      entry.source,
      0,
      entry.createdAt,
      entry.updatedAt
    );

    return entry;
  },

  update(id: string, input: UpdateServiceInput): ServiceEntry | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const updated: ServiceEntry = {
      ...existing,
      ...input,
      tags: input.tags ?? existing.tags,
      updatedAt: new Date().toISOString(),
    };

    db.prepare(
      `UPDATE services SET name=?, url=?, description=?, tags=?, icon=?, updatedAt=?
       WHERE id=?`
    ).run(
      updated.name,
      updated.url,
      updated.description ?? null,
      JSON.stringify(updated.tags),
      updated.icon ?? null,
      updated.updatedAt,
      id
    );

    return updated;
  },

  delete(id: string): boolean {
    const result = db.prepare("DELETE FROM services WHERE id = ?").run(id);
    return result.changes > 0;
  },

  updateActiveStatus(id: string, isActive: boolean): void {
    db.prepare("UPDATE services SET isActive=?, updatedAt=? WHERE id=?").run(
      isActive ? 1 : 0,
      new Date().toISOString(),
      id
    );
  },
};
