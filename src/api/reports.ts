import * as reportService from '@/services/reportService';

export type ReportType = 'OUTSTANDING' | 'PERSON_WISE' | 'INTEREST' | 'PAYMENT' | 'MONTHLY' | 'YEARLY';
export type ReportFormat = 'XLSX' | 'PDF';

export const reportsApi = {
  download: async (type: ReportType, format: ReportFormat): Promise<void> => {
    const blob = await reportService.generateReport(type, format);
    const fileName = reportService.fileName(type, format);

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
