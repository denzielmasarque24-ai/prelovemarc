'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import ProductCard, { resolveImageSrc } from './ProductCard';
import { useCart } from '@/context/CartContext';
import { Product, ProductId } from '@/lib/types';
import './ProductGrid.css';

type ProductGridProps = {
  products: Product[];
};

export default function ProductGrid({ products }: ProductGridProps) {
  const { addToCart } = useCart();
  const [expandedProductId, setExpandedProductId] = useState<ProductId | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [usePreviewFallback, setUsePreviewFallback] = useState(false);
  const pinchDistanceRef = useRef<number | null>(null);

  const selectedProduct = previewIndex === null ? null : products[previewIndex] ?? null;
  const hasMultipleProducts = products.length > 1;
  const modalImageSrc = usePreviewFallback || !selectedProduct
    ? '/images/logo.png'
    : resolveImageSrc(selectedProduct.image);

  const handleToggleDetails = (productId: ProductId) => {
    setExpandedProductId((currentId) => (currentId === productId ? null : productId));
  };

  const openPreview = (index: number) => {
    setPreviewIndex(index);
    setZoom(1);
    setUsePreviewFallback(false);
  };

  const closePreview = useCallback(() => {
    setPreviewIndex(null);
    setZoom(1);
    setUsePreviewFallback(false);
    pinchDistanceRef.current = null;
  }, []);

  const showPreviousImage = useCallback(() => {
    setPreviewIndex((currentIndex) => {
      if (currentIndex === null) return currentIndex;
      return (currentIndex - 1 + products.length) % products.length;
    });
    setZoom(1);
    setUsePreviewFallback(false);
  }, [products.length]);

  const showNextImage = useCallback(() => {
    setPreviewIndex((currentIndex) => {
      if (currentIndex === null) return currentIndex;
      return (currentIndex + 1) % products.length;
    });
    setZoom(1);
    setUsePreviewFallback(false);
  }, [products.length]);

  const adjustZoom = useCallback((amount: number) => {
    setZoom((currentZoom) => {
      const nextZoom = Number((currentZoom + amount).toFixed(2));
      return Math.min(3, Math.max(1, nextZoom));
    });
  }, []);

  const getTouchDistance = (touches: React.TouchList) => {
    const firstTouch = touches.item(0);
    const secondTouch = touches.item(1);
    if (!firstTouch || !secondTouch) return null;

    const xDistance = firstTouch.clientX - secondTouch.clientX;
    const yDistance = firstTouch.clientY - secondTouch.clientY;
    return Math.hypot(xDistance, yDistance);
  };

  const handleModalTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 2) return;

    const distance = getTouchDistance(event.touches);
    if (!distance) return;

    if (pinchDistanceRef.current) {
      const zoomDelta = (distance - pinchDistanceRef.current) / 220;
      setZoom((currentZoom) => Math.min(3, Math.max(1, currentZoom + zoomDelta)));
    }

    pinchDistanceRef.current = distance;
  };

  useEffect(() => {
    if (!selectedProduct) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePreview();
      if (event.key === '+' || event.key === '=') adjustZoom(0.2);
      if (event.key === '-' || event.key === '_') adjustZoom(-0.2);
      if (event.key === 'ArrowLeft' && hasMultipleProducts) showPreviousImage();
      if (event.key === 'ArrowRight' && hasMultipleProducts) showNextImage();
    };

    document.body.classList.add('product-preview-open');
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.classList.remove('product-preview-open');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedProduct, hasMultipleProducts, closePreview, adjustZoom, showPreviousImage, showNextImage]);

  return (
    <>
      <div className="product-grid">
        {products.map((product, index) => (
          <ProductCard
            key={product.id}
            id={product.id}
            image={product.image}
            name={product.name}
            price={product.price}
            category={product.category}
            description={product.description}
            stock={product.stock}
            isDetailsOpen={expandedProductId === product.id}
            onToggleDetails={handleToggleDetails}
            onImagePreview={() => openPreview(index)}
            onAddToCart={() => addToCart(product)}
          />
        ))}
      </div>

      {selectedProduct && (
        <div
          className="product-preview-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={`${selectedProduct.name} image preview`}
          onClick={closePreview}
          onTouchMove={handleModalTouchMove}
          onTouchEnd={() => {
            pinchDistanceRef.current = null;
          }}
        >
          <div className="product-preview-modal" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="product-preview-close"
              onClick={closePreview}
              aria-label="Close image preview"
            >
              X
            </button>

            {hasMultipleProducts && (
              <>
                <button
                  type="button"
                  className="product-preview-nav product-preview-nav-prev"
                  onClick={showPreviousImage}
                  aria-label="Show previous product image"
                >
                  {'<'}
                </button>
                <button
                  type="button"
                  className="product-preview-nav product-preview-nav-next"
                  onClick={showNextImage}
                  aria-label="Show next product image"
                >
                  {'>'}
                </button>
              </>
            )}

            <div className="product-preview-image-frame">
              <img
                src={modalImageSrc}
                alt={selectedProduct.name}
                className="product-preview-image"
                style={{ transform: `scale(${zoom})` }}
                onError={() => setUsePreviewFallback(true)}
              />
            </div>

            <div className="product-preview-controls" aria-label="Image zoom controls">
              <button type="button" onClick={() => adjustZoom(-0.25)} disabled={zoom <= 1}>
                -
              </button>
              <span>{Math.round(zoom * 100)}%</span>
              <button type="button" onClick={() => adjustZoom(0.25)} disabled={zoom >= 3}>
                +
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
