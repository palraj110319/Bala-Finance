import * as excelImportService from '@/services/excelImportService';
import type { ExcelImportPreviewResponse, ExcelImportResultResponse } from '@/types';

export const excelImportApi = {
  preview: (file: File): Promise<ExcelImportPreviewResponse> => excelImportService.preview(file),

  confirm: (importToken: string, includeFlaggedRows: boolean): Promise<ExcelImportResultResponse> =>
    excelImportService.confirm(importToken, includeFlaggedRows),
};
