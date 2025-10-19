import { Link } from 'react-router-dom';
import type { Category } from '../../data/categories';

interface CategoryCardProps {
  category: Category;
}

export default function CategoryCard({ category }: CategoryCardProps) {
  const Icon = category.icon;

  return (
    <Link
      to={`/items?category=${category.id}`}
      className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-all p-6 text-center group"
    >
      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
        <Icon className="w-8 h-8 text-primary" />
      </div>
      <h3 className="font-semibold text-gray-900 mb-1">{category.name}</h3>
      <p className="text-sm text-gray-600">{category.description}</p>
    </Link>
  );
}
