import { Pencil, Trash } from '../../components/icons';
import { useState } from 'react';
import { Button, Modal, Select, useToast } from '../../components/ui';
import { CategoryMark } from '../../components/visuals';
import { useCategoryMutations } from '../../hooks/useFinance';
import type { Category } from '../../types';

export function CategoryManager({
  categories,
  open,
  onClose,
}: {
  categories: Category[];
  open: boolean;
  onClose: () => void;
}) {
  const mutations = useCategoryMutations();
  const notify = useToast();
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [draft, setDraft] = useState({
    name: '',
    type: 'expense' as Category['type'],
    color: '#64748b',
    icon: 'circle',
  });

  const startEditing = (category?: Category) => {
    setEditing(category ?? null);
    setDraft(
      category
        ? {
            name: category.name,
            type: category.type ?? 'expense',
            color: category.color,
            icon: category.icon,
          }
        : { name: '', type: 'expense', color: '#64748b', icon: 'circle' },
    );
  };

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await mutations.save.mutateAsync({
        ...draft,
        type: draft.type ?? 'expense',
        id: editing?.id,
      });
      notify(editing ? 'Category updated' : 'Category added');
      startEditing();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Category could not be saved', 'error');
    }
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      await mutations.remove.mutateAsync(deleting.id);
      notify('Category removed');
      setDeleting(null);
      if (editing?.id === deleting.id) startEditing();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Category could not be removed', 'error');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Manage categories"
      description="Create and maintain the categories used by transactions and budgets."
    >
      <div className="category-manager">
        <div className="category-manager-list" aria-label="Your categories">
          {categories.map((category) => (
            <div className="category-manager-row" key={category.id}>
              <CategoryMark icon={category.icon} color={category.color} />
              <span>
                <strong>{category.name}</strong>
                <small>{category.type ?? 'expense'}</small>
              </span>
              <div className="row-actions">
                <Button
                  variant="ghost"
                  aria-label={`Edit ${category.name}`}
                  onClick={() => startEditing(category)}
                >
                  <Pencil size={15} />
                </Button>
                <Button
                  variant="ghost"
                  aria-label={`Delete ${category.name}`}
                  onClick={() => setDeleting(category)}
                >
                  <Trash size={15} />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {deleting ? (
          <div className="confirmation category-manager-form">
            <div className="confirmation-body">
              <p>
                Delete <strong>{deleting.name}</strong>? Categories used by transactions or budgets
                cannot be deleted.
              </p>
            </div>
            <div className="confirmation-actions">
              <Button variant="secondary" onClick={() => setDeleting(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={remove} disabled={mutations.remove.isPending}>
                {mutations.remove.isPending ? 'Deleting…' : 'Delete category'}
              </Button>
            </div>
          </div>
        ) : (
          <form className="form-grid category-manager-form" onSubmit={save}>
            <label className="field-control span-2">
              Category name
              <input
                required
                value={draft.name}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, name: event.target.value }))
                }
              />
            </label>
            <label className="field-control">
              Type
              <Select
                value={draft.type}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    type: event.target.value as Category['type'],
                  }))
                }
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </Select>
            </label>
            <label className="field-control">
              Icon
              <Select
                value={draft.icon}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, icon: event.target.value }))
                }
              >
                {[
                  'briefcase',
                  'home',
                  'utensils',
                  'car',
                  'bag',
                  'heart',
                  'laptop',
                  'ticket',
                  'zap',
                  'circle',
                ].map((icon) => (
                  <option key={icon} value={icon}>
                    {icon}
                  </option>
                ))}
              </Select>
            </label>
            <label className="form-swatch span-2">
              <span>
                <strong>Category color</strong>
                <small>Used for this category&rsquo;s marker in lists and charts.</small>
              </span>
              <input
                type="color"
                value={draft.color}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, color: event.target.value }))
                }
              />
            </label>
            <footer className="form-actions span-2">
              {editing ? (
                <Button type="button" variant="secondary" onClick={() => startEditing()}>
                  Cancel edit
                </Button>
              ) : (
                <Button type="button" variant="secondary" onClick={onClose}>
                  Close
                </Button>
              )}
              <Button type="submit" disabled={mutations.save.isPending}>
                {mutations.save.isPending ? 'Saving…' : editing ? 'Save category' : 'Add category'}
              </Button>
            </footer>
          </form>
        )}
      </div>
    </Modal>
  );
}
