import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { UploadCloud, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import { excelImportApi } from '@/api/excelImport';
import { formatINR, formatDate } from '@/utils/format';
import type { ExcelImportPreviewResponse, ExcelImportResultResponse } from '@/types';
import { useToast } from '@/context/ToastContext';

export function ExcelImport() {
  const queryClient = useQueryClient();
  const { show } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState<ExcelImportPreviewResponse | null>(null);
  const [result, setResult] = useState<ExcelImportResultResponse | null>(null);
  const [includeFlagged, setIncludeFlagged] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    setLoadingPreview(true);
    try {
      const res = await excelImportApi.preview(file);
      setPreview(res);
    } catch {
      show('Could not read this file. Check the format and try again.', 'error');
      setPreview(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview) return;
    setConfirming(true);
    try {
      const res = await excelImportApi.confirm(preview.importToken, includeFlagged);
      setResult(res);
      queryClient.invalidateQueries({ queryKey: ['records'] });
      queryClient.invalidateQueries({ queryKey: ['persons'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      show('Import completed.', 'success');
    } catch {
      show('Could not complete the import. Please try again.', 'error');
    } finally {
      setConfirming(false);
    }
  };

  const reset = () => {
    setPreview(null);
    setResult(null);
    setFileName('');
    setIncludeFlagged(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const stateIcon = (state: string) => {
    if (state === 'VALID') return <CheckCircle2 size={14} className="text-status-paid" />;
    if (state === 'FLAGGED') return <AlertTriangle size={14} className="text-status-renewal" />;
    return <XCircle size={14} className="text-status-outstanding" />;
  };

  return (
    <Layout title="Excel Import">
      <div className="bg-paper-card border border-ink/10 rounded-md p-6 mb-6">
        <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-ink/20 rounded-md py-10 cursor-pointer hover:border-brass/60 transition-colors">
          <UploadCloud size={28} className="text-ink-text/40" />
          <span className="text-sm text-ink-text/70">
            {fileName || 'Click to choose an Excel file (.xlsx)'}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
      </div>

      {loadingPreview && <LoadingIndicator label="Reading file…" />}

      {preview && !result && (
        <div className="bg-paper-card border border-ink/10 rounded-md overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 border-b border-ink/10">
            <div className="flex gap-6 text-sm">
              <span className="text-ink-text">
                <strong>{preview.totalRows}</strong> rows
              </span>
              <span className="text-status-paid">
                <strong>{preview.validRows}</strong> valid
              </span>
              <span className="text-status-renewal">
                <strong>{preview.flaggedRows}</strong> flagged
              </span>
              <span className="text-status-outstanding">
                <strong>{preview.invalidRows}</strong> invalid
              </span>
            </div>
            <label className="flex items-center gap-2 text-sm text-ink-text/70">
              <input
                type="checkbox"
                checked={includeFlagged}
                onChange={(e) => setIncludeFlagged(e.target.checked)}
              />
              Import flagged rows for review
            </label>
          </div>

          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-paper-card">
                <tr className="border-b border-ink/10 text-left text-xs font-medium text-ink-text/50">
                  <th className="px-5 py-3">Row</th>
                  <th className="px-5 py-3">Person</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Note</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => (
                  <tr key={row.rowNumber} className="border-b border-ink/5 last:border-0">
                    <td className="px-5 py-2.5 text-ink-text/60">{row.rowNumber}</td>
                    <td className="px-5 py-2.5 text-ink-text">{row.personName || '—'}</td>
                    <td className="px-5 py-2.5 text-ink-text/70">{formatDate(row.recordDate)}</td>
                    <td className="px-5 py-2.5 text-right figure text-ink-text/70">
                      {formatINR(row.originalAmount)}
                    </td>
                    <td className="px-5 py-2.5">
                      <span className="flex items-center gap-1.5">
                        {stateIcon(row.validationState)}
                        {row.validationState}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-ink-text/50 max-w-xs truncate">
                      {row.validationMessage || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-3 px-5 py-4 border-t border-ink/10">
            <button
              onClick={reset}
              className="px-4 py-2 text-sm rounded text-ink-text/70 hover:bg-ink/5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={confirming || preview.validRows + (includeFlagged ? preview.flaggedRows : 0) === 0}
              className="px-4 py-2 text-sm rounded bg-ink text-paper font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {confirming ? 'Importing…' : 'Confirm import'}
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="bg-paper-card border border-ink/10 rounded-md p-6">
          <div className="flex gap-6 text-sm mb-4">
            <span className="text-status-paid">
              <strong>{result.successCount}</strong> imported
            </span>
            <span className="text-ink-text/60">
              <strong>{result.skippedCount}</strong> skipped
            </span>
            <span className="text-status-outstanding">
              <strong>{result.failedCount}</strong> failed
            </span>
          </div>
          {result.failedRows.length > 0 && (
            <ul className="space-y-1 mb-4 text-xs text-ink-text/60">
              {result.failedRows.map((f) => (
                <li key={f.rowNumber}>
                  Row {f.rowNumber}: {f.reason}
                </li>
              ))}
            </ul>
          )}
          <button
            onClick={reset}
            className="px-4 py-2 text-sm rounded bg-ink text-paper font-medium hover:opacity-90 transition-opacity"
          >
            Import another file
          </button>
        </div>
      )}
    </Layout>
  );
}
