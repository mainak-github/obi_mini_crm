'use client';

import type { ReactNode } from 'react';

export type DataTablePagination = {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
};

export type DataTableSort = { key: string; direction: 'asc' | 'desc' };

export type DataTableProps<Row> = {
  rows: Row[];
  columns: DataTableColumn<Row>[];
  getRowKey: (row: Row) => string;
  className?: string;
  label: string;
  emptyMessage?: string;
  pagination?: DataTablePagination;
  sort?: DataTableSort;
  onSortChange?: (key: string) => void;
};
import { ArrowDown, ArrowUp, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight } from 'lucide-react';

export type DataTableColumn<Row> = {
  key: string;
  header: string;
  render: (row: Row, index: number) => ReactNode;
  className?: string;
  sortable?: boolean;
};


export function DataTable<Row>({
  rows,
  columns,
  getRowKey,
  className,
  label,
  emptyMessage = 'No records to display.',
  pagination,
  sort,
  onSortChange,
}: DataTableProps<Row>) {
  const start = pagination && pagination.total > 0 ? (pagination.page - 1) * pagination.pageSize + 1 : 0;
  const end = pagination ? Math.min(pagination.page * pagination.pageSize, pagination.total) : rows.length;

  return <div className="data-table-shell">
    <div className="data-table-wrap">
      <table className={className} aria-label={label}>
        <thead><tr>{columns.map((column) => {
          const isSorted = sort?.key === column.key;
          const SortIcon = sort?.direction === 'asc' ? ArrowUp : ArrowDown;
          return <th className={column.className} key={column.key} scope="col" aria-sort={isSorted ? (sort?.direction === 'asc' ? 'ascending' : 'descending') : undefined}>
            {column.sortable && onSortChange
              ? <button className="data-table-sort" type="button" onClick={() => onSortChange(column.key)}>{column.header}{isSorted ? <SortIcon size={14} aria-hidden="true"/> : <span className="data-table-sort-placeholder"/>}</button>
              : column.header}
          </th>;
        })}</tr></thead>
        <tbody>{rows.length ? rows.map((row, index) => <tr key={getRowKey(row)}>
          {columns.map((column) => <td className={column.className} key={column.key}>{column.render(row, index)}</td>)}
        </tr>) : <tr className="data-table-empty-row"><td colSpan={columns.length}>{emptyMessage}</td></tr>}</tbody>
      </table>
    </div>
    {pagination && <div className="table-footer">
      <span>Showing <strong>{start}–{end}</strong> of <strong>{pagination.total}</strong></span>
      <div className="pagination" aria-label="Table pagination">
        <button aria-label="First page" disabled={pagination.page <= 1} onClick={() => pagination.onPageChange(1)}><ChevronsLeft size={16}/></button>
        <button aria-label="Previous page" disabled={pagination.page <= 1} onClick={() => pagination.onPageChange(pagination.page - 1)}><ChevronLeft size={16}/><span>Previous</span></button>
        <span>Page <strong>{pagination.page}</strong> of <strong>{Math.max(1, pagination.pageCount)}</strong></span>
        <button aria-label="Next page" disabled={pagination.page >= pagination.pageCount} onClick={() => pagination.onPageChange(pagination.page + 1)}><span>Next</span><ChevronRight size={16}/></button>
        <button aria-label="Last page" disabled={pagination.page >= pagination.pageCount} onClick={() => pagination.onPageChange(pagination.pageCount)}><ChevronsRight size={16}/></button>
      </div>
    </div>}
  </div>;
}
