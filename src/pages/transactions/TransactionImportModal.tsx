import { useRef, useState } from 'react';
import { Alert, Upload } from '../../components/icons';
import { Button, LedgerList, LedgerRow, Modal, StatusPill, useToast } from '../../components/ui';
import { useTransactionImport } from '../../hooks/useFinance';
import type { TransactionImportReview } from '../../types';
import { formatCurrency } from '../../utils/finance';
import { formatDate } from './format';

const TEMPLATE_COLUMNS = 'date, merchant, description, category, account, type, status, amount';

/**
 * Import is deliberately two steps. The first only reads the file and reports what it
 * would do; nothing reaches the ledger until the summary has been seen and confirmed.
 */
export function TransactionImportModal({ onClose }: { onClose: () => void }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [review, setReview] = useState<TransactionImportReview | null>(null);
  const { preview, commit } = useTransactionImport();
  const notify = useToast();

  const duplicates = review?.rows.filter((row) => row.duplicate).length ?? 0;
  const willImport = (review?.valid ?? 0) - duplicates;
  const problems = review?.rows.filter((row) => row.errors.length > 0) ?? [];

  const choose = async (chosen: File | null) => {
    setFile(chosen);
    setReview(null);
    if (!chosen) return;
    try {
      setReview(await preview.mutateAsync(chosen));
    } catch (error) {
      notify(error instanceof Error ? error.message : 'That file could not be read', 'error');
      setFile(null);
    }
  };

  const run = async () => {
    if (!file) return;
    try {
      const result = await commit.mutateAsync(file);
      notify(
        result.skipped > 0
          ? `Imported ${result.imported}, skipped ${result.skipped} already in the ledger`
          : `Imported ${result.imported} transaction${result.imported === 1 ? '' : 's'}`,
      );
      onClose();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'The import could not be saved', 'error');
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Import transactions"
      description="Read a CSV file into your ledger. Nothing is saved until you confirm."
    >
      <div className="import-panel">
        <label className="field-control">
          CSV file
          <input
            ref={fileInput}
            type="file"
            accept=".csv,text/csv"
            data-autofocus
            onChange={(event) => void choose(event.target.files?.[0] ?? null)}
          />
          <small className="field-hint">
            Columns: {TEMPLATE_COLUMNS}. Account and category are matched by name. Export your
            ledger first to see the exact format.
          </small>
        </label>

        {preview.isPending ? <p className="field-hint">Reading the file…</p> : null}

        {review ? (
          <>
            <dl className="import-summary">
              <div>
                <dt>Ready</dt>
                <dd>{willImport}</dd>
              </div>
              <div>
                <dt>Already in ledger</dt>
                <dd>{duplicates}</dd>
              </div>
              <div>
                <dt>Problems</dt>
                <dd className={review.invalid > 0 ? 'negative' : undefined}>{review.invalid}</dd>
              </div>
            </dl>

            {review.invalid > 0 ? (
              <div className="import-problems" role="alert">
                <p>
                  <Alert size={16} aria-hidden="true" />
                  Fix these lines and upload again. Nothing is imported while any line has a
                  problem.
                </p>
                <LedgerList aria-label="Lines that could not be read">
                  {problems.slice(0, 10).map((row) => (
                    <LedgerRow key={row.line}>
                      <strong>Line {row.line}</strong>
                      <span>{row.merchant || '—'}</span>
                      <small>{row.errors.join(' ')}</small>
                    </LedgerRow>
                  ))}
                </LedgerList>
                {problems.length > 10 ? (
                  <small className="field-hint">
                    and {problems.length - 10} more line{problems.length - 10 === 1 ? '' : 's'}.
                  </small>
                ) : null}
              </div>
            ) : (
              <LedgerList className="import-preview" aria-label="Transactions to import">
                {review.rows.slice(0, 8).map((row) => (
                  <LedgerRow key={row.line}>
                    <span>
                      <strong>{row.merchant}</strong>
                      <small>
                        {row.date ? formatDate(row.date) : ''} · {row.category} · {row.account}
                      </small>
                    </span>
                    {row.duplicate ? <StatusPill tone="neutral">Already added</StatusPill> : null}
                    <b className={`money-value ${row.type ?? ''}`}>
                      {formatCurrency(row.amount ?? 0)}
                    </b>
                  </LedgerRow>
                ))}
              </LedgerList>
            )}
          </>
        ) : null}

        <footer className="form-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!review || review.invalid > 0 || willImport < 1 || commit.isPending}
            onClick={() => void run()}
          >
            <Upload size={16} />
            {commit.isPending
              ? 'Importing…'
              : willImport > 0
                ? `Import ${willImport} transaction${willImport === 1 ? '' : 's'}`
                : 'Import'}
          </Button>
        </footer>
      </div>
    </Modal>
  );
}
