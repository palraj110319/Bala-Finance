import { useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Select } from '@/components/common/FormField';
import { reportsApi, type ReportFormat, type ReportType } from '@/api/reports';
import { useToast } from '@/context/ToastContext';

const reportOptions: { type: ReportType; label: string; description: string }[] = [
  { type: 'OUTSTANDING', label: 'Outstanding', description: 'All records with an outstanding balance.' },
  { type: 'PERSON_WISE', label: 'Person-wise', description: 'Totals and records grouped by person.' },
  { type: 'INTEREST', label: 'Interest', description: 'Interest charged, paid and outstanding.' },
  { type: 'PAYMENT', label: 'Payment', description: 'All recorded payments.' },
  { type: 'MONTHLY', label: 'Monthly', description: 'Month-by-month summary of activity.' },
  { type: 'YEARLY', label: 'Yearly', description: 'Year-by-year summary of activity.' },
];

export function Reports() {
  const { show } = useToast();
  const [format, setFormat] = useState<ReportFormat>('XLSX');
  const [downloading, setDownloading] = useState<ReportType | null>(null);

  const handleDownload = async (type: ReportType) => {
    setDownloading(type);
    try {
      await reportsApi.download(type, format);
      show('Report downloaded.', 'success');
    } catch {
      show('Could not generate this report. Please try again.', 'error');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <Layout title="Reports">
      <div className="flex items-center justify-between mb-6 gap-4">
        <p className="text-sm text-ink-text/60">Generate and download a snapshot of your ledger.</p>
        <div className="w-40">
          <Select value={format} onChange={(e) => setFormat(e.target.value as ReportFormat)}>
            <option value="XLSX">Excel (.xlsx)</option>
            <option value="PDF">PDF (.pdf)</option>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportOptions.map((report) => (
          <div
            key={report.type}
            className="bg-paper-card border border-ink/10 rounded-md p-5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-2 mb-2 text-ink-text">
                <FileSpreadsheet size={18} className="text-brass" />
                <span className="font-display font-semibold">{report.label}</span>
              </div>
              <p className="text-xs text-ink-text/60 mb-4">{report.description}</p>
            </div>
            <button
              onClick={() => handleDownload(report.type)}
              disabled={downloading === report.type}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded bg-ink text-paper text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Download size={15} />
              {downloading === report.type ? 'Preparing…' : 'Download'}
            </button>
          </div>
        ))}
      </div>
    </Layout>
  );
}
