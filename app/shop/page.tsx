import './shop.css';
import ShopClient from './ShopClient';
import type { ProductCategory } from '@/lib/types';

type ShopPageProps = {
  searchParams?: Promise<{
    category?: string;
  }>;
};

function isProductCategory(value: string | undefined): value is ProductCategory {
  return value === 'Tops' || value === 'Bottoms' || value === 'Dresses';
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const category = resolvedSearchParams?.category;
  const initialCategory = isProductCategory(category) ? category : 'All';

  return <ShopClient initialCategory={initialCategory} />;
}
