import * as personService from '@/services/personService';
import type { PageResponse, PersonResponse } from '@/types';

/**
 * The standalone Persons management screen was removed upstream. `search` remains because
 * Financial Records, Renewals, and Interest still use it for their person picker.
 */
export const personsApi = {
  search: (query: string | undefined, page: number, size = 20): Promise<PageResponse<PersonResponse>> =>
    personService.search(query, page, size),
};
