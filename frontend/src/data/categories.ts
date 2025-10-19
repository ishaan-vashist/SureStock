import type { LucideIcon } from 'lucide-react';
import { Laptop, Shirt, Home, Dumbbell, Book, Gamepad2 } from 'lucide-react';

export interface Category {
  id: string;
  name: string;
  icon: LucideIcon;
  description: string;
}

export const categories: Category[] = [
  {
    id: 'Electronics',
    name: 'Electronics',
    icon: Laptop,
    description: 'Tech gadgets & devices',
  },
  {
    id: 'Clothing',
    name: 'Clothing',
    icon: Shirt,
    description: 'Fashion & apparel',
  },
  {
    id: 'Home & Kitchen',
    name: 'Home & Kitchen',
    icon: Home,
    description: 'Home essentials',
  },
  {
    id: 'Sports & Outdoors',
    name: 'Sports & Outdoors',
    icon: Dumbbell,
    description: 'Fitness & outdoor gear',
  },
  {
    id: 'Books',
    name: 'Books',
    icon: Book,
    description: 'Reading materials',
  },
  {
    id: 'Toys & Games',
    name: 'Toys & Games',
    icon: Gamepad2,
    description: 'Fun for all ages',
  },
];
