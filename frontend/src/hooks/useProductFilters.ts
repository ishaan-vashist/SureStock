import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Product } from '../types';
import type { FilterState } from '../components/product/ProductFilters';

const defaultFilters: FilterState = {
  search: '',
  category: '',
  minPrice: '',
  maxPrice: '',
  inStockOnly: false,
  sortBy: 'relevance',
};

export function useProductFilters(products: Product[]) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<FilterState>(() => ({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    inStockOnly: searchParams.get('inStockOnly') === 'true',
    sortBy: searchParams.get('sortBy') || 'relevance',
  }));

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.category) params.set('category', filters.category);
    if (filters.minPrice) params.set('minPrice', filters.minPrice);
    if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
    if (filters.inStockOnly) params.set('inStockOnly', 'true');
    if (filters.sortBy !== 'relevance') params.set('sortBy', filters.sortBy);
    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);

  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.sku.toLowerCase().includes(searchLower)
      );
    }

    // Category filter - match SKU prefix (e.g., "ELE-" for Electronics)
    if (filters.category) {
      const categoryPrefix = filters.category.substring(0, 3).toUpperCase();
      result = result.filter((p) => p.sku.startsWith(categoryPrefix));
    }

    // Price range filter
    const minPrice = filters.minPrice ? parseFloat(filters.minPrice) * 100 : 0;
    const maxPrice = filters.maxPrice ? parseFloat(filters.maxPrice) * 100 : Infinity;
    result = result.filter((p) => p.priceCents >= minPrice && p.priceCents <= maxPrice);

    // In stock filter
    if (filters.inStockOnly) {
      result = result.filter((p) => p.available > 0);
    }

    // Sorting
    switch (filters.sortBy) {
      case 'price-asc':
        result.sort((a, b) => a.priceCents - b.priceCents);
        break;
      case 'price-desc':
        result.sort((a, b) => b.priceCents - a.priceCents);
        break;
      case 'name-asc':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        // relevance - keep original order
        break;
    }

    return result;
  }, [products, filters]);

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  const clearFilters = () => {
    setFilters(defaultFilters);
  };

  return {
    filters,
    filteredProducts,
    handleFilterChange,
    clearFilters,
  };
}
