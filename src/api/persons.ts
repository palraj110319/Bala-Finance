import * as personService from '@/services/personService';
import type { PageResponse, PersonResponse } from '@/types';

/**
 * The standalone Persons management screen was removed upstream. `search` remains because
 * Financial Records and Interest still use it for their person picker/filter.
 */
export const personsApi = {
  search: (query: string | undefined, page: number, size = 20): Promise<PageResponse<PersonResponse>> =>
    personService.search(query, page, size),

  /**
   * Resolves a person by name, creating one if no case-insensitive match exists yet.
   * Mirrors the same lookup-or-create logic the Excel import flow already relies on
   * (personService.findOrCreateByName), so the Person field on Financial Records can
   * accept free-text entry without duplicating that business rule.
   */
  findOrCreateByName: (name: string, place?: string | null): Promise<PersonResponse> =>
    personService.findOrCreateByName(name, place).then((p) => ({
      id: p.id,
      name: p.name,
      mobileNumber: p.mobileNumber ?? undefined,
      place: p.place ?? undefined,
      notes: p.notes ?? undefined,
      createdAt: p.createdAt,
    })),
};
