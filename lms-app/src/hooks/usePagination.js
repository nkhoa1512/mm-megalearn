import { useState, useMemo } from 'react';

export function usePagination(items = [], pageSize = 10) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, currentPage, pageSize]);

  return {
    currentPage,
    setCurrentPage,
    totalPages,
    currentItems,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1,
    nextPage: () => setCurrentPage(p => Math.min(totalPages, p + 1)),
    prevPage: () => setCurrentPage(p => Math.max(1, p - 1)),
  };
}
