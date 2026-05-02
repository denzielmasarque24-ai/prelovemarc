import './shop.css';
import ShopClient from './ShopClient';
import type { ProductCategory } from '@/lib/types';

type ShopCategory = ProductCategory | 'all';

type ShopPageProps = {
  searchParams?: Promise<{
    category?: string;
  }>;
};

function isProductCategory(value: string | undefined): value is ProductCategory {
  const category = value?.toLowerCase();
  return category === 'tops' || category === 'bottoms' || category === 'dresses';
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const category = resolvedSearchParams?.category;
  const initialCategory: ShopCategory = isProductCategory(category)
    ? category.toLowerCase() as ProductCategory
    : 'all';

  return <ShopClient initialCategory={initialCategory} />;
}
