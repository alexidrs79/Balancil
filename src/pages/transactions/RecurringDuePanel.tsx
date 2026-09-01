import { Button, useToast } from '../../components/ui';
import { CategoryMark } from '../../components/visuals';
import { useRecurringMutations } from '../../hooks/useFinance';
import type { Account, Category, RecurringDueDraft } from '../../types';
import { formatCurrency, formatLedgerDate } from '../../utils/finance';

/** Due recurring items wait here; nothing reaches the ledger without approval. */
export function RecurringDuePanel({
  drafts,
  accounts,
  categories,
}: {
  drafts: RecurringDueDraft[];
  accounts: Account[];
  categories: Category[];
}) {
  const mutations = useRecurringMutations();
  const notify = useToast();

  if (!drafts.length) return null;

  const review = (action: Promise<unknown>, success: string, failure: string) =>
    void action
      .then(() => notify(success))
      .catch((error) => notify(error instanceof Error ? error.message : failure, 'error'));

  return (
    <section className="recurring-due-panel balancil-box" aria-labelledby="recurring-due-title">
      <header>
        <div>
          <p className="data-label">Review required</p>
          <h2 id="recurring-due-title">Recurring transactions due</h2>
          <small>Nothing is posted until you approve it.</small>
        </div>
        <strong>{drafts.length}</strong>
      </header>
      <div>
        {drafts.map((draft) => {
          const account = accounts.find((item) => item.id === draft.payload.accountId);
          const category = categories.find((item) => item.id === draft.payload.categoryId);
          return (
            <article key={draft.id}>
              <CategoryMark icon={category?.icon} color={category?.color} />
              <div>
                <strong>{draft.payload.merchant}</strong>
                <small>
                  Due {formatLedgerDate(draft.dueDate)} · {account?.name ?? 'Unknown account'} ·{' '}
                  {category?.name ?? 'Unknown category'}
                </small>
              </div>
              <b className={`money-value ${draft.payload.type}`}>
                {formatCurrency(draft.payload.amount)}
              </b>
              <div className="recurring-review-actions">
                <Button
                  variant="ghost"
                  disabled={mutations.skip.isPending}
                  onClick={() =>
                    review(
                      mutations.skip.mutateAsync(draft.id),
                      'Recurring item skipped',
                      'Item could not be skipped',
                    )
                  }
                >
                  Skip
                </Button>
                <Button
                  disabled={mutations.post.isPending}
                  onClick={() =>
                    review(
                      mutations.post.mutateAsync({ id: draft.id }),
                      'Recurring transaction posted',
                      'Item could not be posted',
                    )
                  }
                >
                  Post
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
