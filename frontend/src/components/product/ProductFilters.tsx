import { useState } from 'react';
import { X, Filter } from 'lucide-react';
import Input from '../common/Input';
import Select from '../common/Select';
import Button from '../common/Button';
import Badge from '../common/Badge';

export interface FilterState {
  search: string;
  category: string;
  minPrice: string;
  maxPrice: string;
  inStockOnly: boolean;
  sortBy: string;
}

interface ProductFiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onClearFilters: () => void;
  isMobile?: boolean;
  onClose?: () => void;
}

const categoryOptions = [
  { value: '', label: 'All Categories' },
  { value: 'Electronics', label: 'Electronics' },
  { value: 'Clothing', label: 'Clothing' },
  { value: 'Home & Kitchen', label: 'Home & Kitchen' },
  { value: 'Sports & Outdoors', label: 'Sports & Outdoors' },
  { value: 'Books', label: 'Books' },
  { value: 'Toys & Games', label: 'Toys & Games' },
];

const sortOptions = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'name-asc', label: 'Name: A to Z' },
];

export default function ProductFilters({
  filters,
  onFilterChange,
  onClearFilters,
  isMobile,
  onClose,
}: ProductFiltersProps) {
  const [localFilters, setLocalFilters] = useState(filters);

  const handleChange = (key: keyof FilterState, value: string | boolean) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  };

  const hasActiveFilters =
    filters.search ||
    filters.category ||
    filters.minPrice ||
    filters.maxPrice ||
    filters.inStockOnly;

  return (
    <div className="bg-white rounded-2xl shadow-md p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          {hasActiveFilters && (
            <Badge variant="info">{getActiveFilterCount(filters)}</Badge>
          )}
        </div>
        {isMobile && onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close filters"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Search */}
      <div className="mb-6">
        <Input
          label="Search"
          placeholder="Search by name or SKU..."
          value={localFilters.search}
          onChange={(e) => handleChange('search', e.target.value)}
        />
      </div>

      {/* Category */}
      <div className="mb-6">
        <Select
          label="Category"
          options={categoryOptions}
          value={localFilters.category}
          onChange={(e) => handleChange('category', e.target.value)}
        />
      </div>

      {/* Price Range */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Price Range
        </label>
        <div className="grid grid-cols-2 gap-3">
          <Input
            placeholder="Min"
            type="number"
            value={localFilters.minPrice}
            onChange={(e) => handleChange('minPrice', e.target.value)}
          />
          <Input
            placeholder="Max"
            type="number"
            value={localFilters.maxPrice}
            onChange={(e) => handleChange('maxPrice', e.target.value)}
          />
        </div>
      </div>

      {/* In Stock Only */}
      <div className="mb-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={localFilters.inStockOnly}
            onChange={(e) => handleChange('inStockOnly', e.target.checked)}
            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary"
          />
          <span className="text-sm text-gray-700">In stock only</span>
        </label>
      </div>

      {/* Sort By */}
      <div className="mb-6">
        <Select
          label="Sort By"
          options={sortOptions}
          value={localFilters.sortBy}
          onChange={(e) => handleChange('sortBy', e.target.value)}
        />
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button variant="outline" onClick={onClearFilters} className="w-full">
          Clear All Filters
        </Button>
      )}
    </div>
  );
}

function getActiveFilterCount(filters: FilterState): number {
  let count = 0;
  if (filters.search) count++;
  if (filters.category) count++;
  if (filters.minPrice || filters.maxPrice) count++;
  if (filters.inStockOnly) count++;
  return count;
}
