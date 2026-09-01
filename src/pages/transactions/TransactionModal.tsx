import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { Button, Modal, Select, useToast } from '../../components/ui';
import { useTransactionMutations } from '../../hooks/useFinance';
import type { Account, Category, Transaction } from '../../types';
import { formatDateInput } from '../../utils/finance';

const transactionSchema = z.object({
  merchant: z.string().min(2, 'Merchant must be at least 2 characters'),
  description: z.string().min(2, 'Add a short description'),
  amount: z
    .union([z.string(), z.number()])
    .transform((value) => Number(value))
    .refine((value) => Number.isFinite(value) && value > 0, 'Amount must be greater than zero'),
  type: z.enum(['income', 'expense']),
  status: z.enum(['completed', 'pending', 'failed']),
  categoryId: z.string().min(1, 'Choose a category'),
  accountId: z.string().min(1, 'Choose an account'),
  date: z.string().min(1, 'Choose a date'),
});

type TransactionForm = z.output<typeof transactionSchema>;
type TransactionFormInput = z.input<typeof transactionSchema>;

export function TransactionModal({
  transaction,
  accounts,
  categories,
  open,
  duplicate,
  onClose,
  onSaved,
}: {
  transaction: Transaction | null | undefined;
  accounts: Account[];
  categories: Category[];
  open: boolean;
  duplicate?: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const mutations = useTransactionMutations();
  const notify = useToast();
  const availableAccounts = transaction
    ? accounts.filter(
        (account) => account.isActive !== false || account.id === transaction.accountId,
      )
    : accounts.filter((account) => account.isActive !== false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    setValue,
  } = useForm<TransactionFormInput, unknown, TransactionForm>({
    resolver: zodResolver(transactionSchema),
    values: {
      merchant: transaction?.merchant ?? '',
      description: transaction?.description ?? '',
      amount: transaction?.amount ?? 0,
      type: transaction?.type ?? 'expense',
      status: transaction?.status ?? 'completed',
      categoryId: transaction?.categoryId ?? '',
      accountId: transaction?.accountId ?? availableAccounts[0]?.id ?? '',
      date: transaction?.date ?? formatDateInput(),
    },
  });
  const selectedType = useWatch({ control, name: 'type' });
  const selectedCategoryId = useWatch({ control, name: 'categoryId' });

  useEffect(() => {
    if (
      categories.length > 0 &&
      selectedCategoryId &&
      !categories.some(
        (category) => category.id === selectedCategoryId && category.type === selectedType,
      )
    ) {
      setValue('categoryId', '', { shouldValidate: true });
    }
  }, [categories, selectedCategoryId, selectedType, setValue]);
  const submit = handleSubmit(async (values) => {
    try {
      await mutations.save.mutateAsync({
        ...values,
        id: transaction?.id,
      });
      reset();
      onSaved();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Transaction could not be saved', 'error');
    }
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        duplicate ? 'Duplicate transaction' : transaction ? 'Edit transaction' : 'Add transaction'
      }
      description="Add or edit a transaction in your ledger."
    >
      <form className="form-grid" onSubmit={submit}>
        <label className="field-control span-2">
          Merchant
          <input
            aria-invalid={Boolean(errors.merchant)}
            aria-describedby={errors.merchant ? 'transaction-merchant-error' : undefined}
            {...register('merchant')}
            placeholder="e.g. Green Market"
          />
          {errors.merchant && (
            <small className="field-error" id="transaction-merchant-error">
              {errors.merchant.message}
            </small>
          )}
        </label>
        <label className="field-control span-2">
          Description
          <input
            aria-invalid={Boolean(errors.description)}
            aria-describedby={errors.description ? 'transaction-description-error' : undefined}
            {...register('description')}
            placeholder="What was this for?"
          />
          {errors.description && (
            <small className="field-error" id="transaction-description-error">
              {errors.description.message}
            </small>
          )}
        </label>
        <label className="field-control">
          Amount
          <input
            aria-invalid={Boolean(errors.amount)}
            aria-describedby={errors.amount ? 'transaction-amount-error' : undefined}
            {...register('amount', { valueAsNumber: true })}
            inputMode="decimal"
          />
          {errors.amount && (
            <small className="field-error" id="transaction-amount-error">
              {errors.amount.message}
            </small>
          )}
        </label>
        <label className="field-control">
          Type
          <Select {...register('type')}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </Select>
        </label>
        <label className="field-control">
          Category
          <Select
            aria-invalid={Boolean(errors.categoryId)}
            aria-describedby={errors.categoryId ? 'transaction-category-error' : undefined}
            {...register('categoryId')}
          >
            <option value="">Choose category</option>
            {categories
              .filter((category) => category.type === selectedType)
              .map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
          </Select>
          {errors.categoryId && (
            <small className="field-error" id="transaction-category-error">
              {errors.categoryId.message}
            </small>
          )}
        </label>
        <label className="field-control">
          Account
          <Select {...register('accountId')}>
            {availableAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="field-control">
          Date
          <input type="date" {...register('date')} />
        </label>
        <label className="field-control">
          Status
          <Select {...register('status')}>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </Select>
          <small className="field-hint">Only completed transactions change balances.</small>
        </label>
        <footer className="form-actions span-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutations.save.isPending}>
            {mutations.save.isPending ? 'Saving…' : 'Save transaction'}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
