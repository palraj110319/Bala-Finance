import { getAll, insert, STORES } from '@/db/database';
import type { PersonRecord } from './types';
import type { PageResponse, PersonResponse } from '@/types';

function toResponse(p: PersonRecord): PersonResponse {
  return {
    id: p.id,
    name: p.name,
    mobileNumber: p.mobileNumber ?? undefined,
    place: p.place ?? undefined,
    notes: p.notes ?? undefined,
    createdAt: p.createdAt,
  };
}

async function allActive(): Promise<PersonRecord[]> {
  const all = await getAll<PersonRecord>(STORES.persons);
  return all.filter((p) => !p.deleted);
}

/** Mirrors PersonServiceImpl.search: case-insensitive match against name, place or mobile number. */
export async function search(query: string | undefined, page: number, size = 20): Promise<PageResponse<PersonResponse>> {
  let persons = await allActive();

  if (query && query.trim()) {
    const like = query.trim().toLowerCase();
    persons = persons.filter(
      (p) =>
        p.name.toLowerCase().includes(like) ||
        (p.place ?? '').toLowerCase().includes(like) ||
        (p.mobileNumber ?? '').toLowerCase().includes(like)
    );
  }

  // Default sort is by id ascending, matching JPA's natural/primary-key order for unsorted specs.
  persons.sort((a, b) => a.id - b.id);

  const totalElements = persons.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / size));
  const content = persons.slice(page * size, page * size + size).map(toResponse);

  return {
    content,
    pageNumber: page,
    pageSize: size,
    totalElements,
    totalPages,
    last: page >= totalPages - 1,
  };
}

/**
 * Used by the Excel import confirm step: find an existing (case-insensitive) name match,
 * or create a new person — exactly mirroring ExcelImportServiceImpl's personCache logic.
 */
export async function findOrCreateByName(name: string, place?: string | null): Promise<PersonRecord> {
  const persons = await allActive();
  const existing = persons.find((p) => p.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing;

  const now = new Date().toISOString();
  const record: Omit<PersonRecord, 'id'> = {
    name,
    place: place ?? null,
    mobileNumber: null,
    notes: null,
    createdAt: now,
    updatedAt: now,
    deleted: false,
  };
  const id = await insert<Omit<PersonRecord, 'id'>>(STORES.persons, record);
  return { ...record, id };
}

export async function getByIdRaw(id: number): Promise<PersonRecord | undefined> {
  const persons = await allActive();
  return persons.find((p) => p.id === id);
}
