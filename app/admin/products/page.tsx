'use client';

import { useEffect, useState } from 'react';
import { adminDeleteProduct, adminGetAllProducts, adminUpsertProduct } from '@/lib/admin';
import type { Product, ProductCategory } from '@/lib/types';

const categories: ProductCategory[] = ['Tops', 'Bottoms', 'Dresses'];
const pesoFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
const formatPrice = (v: number) => pesoFormatter.format(v / 100);
const fallbackProductImage = '/images/logo.png';

const emptyForm = {
  name: '',
  price: '',
  image: '',
  category: 'Tops' as ProductCategory,
  description: '',
  size: '',
  color: '',
  stock: '',
  status: 'active' as 'active' | 'inactive',
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () =>
    adminGetAllProducts()
      .then(setProducts)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'));

  useEffect(() => { void load(); }, []);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      price: String(p.price),
      image: p.image,
      category: p.category,
      description: p.description,
      size: p.size ?? '',
      color: p.color ?? '',
      stock: String(p.stock ?? ''),
      status: p.status ?? 'active',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.price || !form.image) {
      setError('Name, price, and image are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await adminUpsertProduct({
        ...(editing ? { id: editing.id } : {}),
        name: form.name,
        price: Number(form.price),
        image: form.image,
        category: form.category,
        description: form.description,
        size: form.size,
        color: form.color,
        stock: Number(form.stock) || 0,
        status: form.status,
      });
      setShowModal(false);
      void load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!confirm('Delete this product?')) return;
    try {
      await adminDeleteProduct(id);
      void load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const getProductImage = (image?: string) => image?.trim() || fallbackProductImage;

  return (
    <>
      <h1 className="admin-page-title">Products</h1>
      {error && <div className="admin-error">{error}</div>}

      <div className="admin-toolbar">
        <input
          className="admin-search"
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="button" className="admin-btn admin-btn-primary" onClick={openAdd}>
          + Add Product
        </button>
      </div>

      <div className="admin-card">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length ? filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <img
                      src={getProductImage(p.image)}
                      alt={p.name}
                      className="admin-product-img"
                      onError={(event) => {
                        event.currentTarget.src = fallbackProductImage;
                      }}
                    />
                  </td>
                  <td>{p.name}</td>
                  <td>{p.category}</td>
                  <td>{formatPrice(p.price)}</td>
                  <td>{p.stock ?? '—'}</td>
                  <td>
                    <span className={`status-badge ${p.status === 'active' ? 'status-delivered' : 'status-cancelled'}`}>
                      {p.status ?? 'active'}
                    </span>
                  </td>
                  <td style={{ display: 'flex', gap: '0.4rem' }}>
                    <button type="button" className="admin-btn admin-btn-outline admin-btn-sm" onClick={() => openEdit(p)}>
                      Edit
                    </button>
                    <button type="button" className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => handleDelete(p.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={7} className="admin-empty">No products found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <button type="button" className="admin-modal-close" onClick={() => setShowModal(false)}>✕</button>
            <h2>{editing ? 'Edit Product' : 'Add Product'}</h2>
            {error && <div className="admin-error">{error}</div>}
            <div className="admin-form">
              <div className="admin-form-grid">
                <div className="admin-field">
                  <label>Name *</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="admin-field">
                  <label>Price (in centavos) *</label>
                  <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="e.g. 99900 = ₱999" />
                </div>
                <div className="admin-field">
                  <label>Category</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ProductCategory })}>
                    {categories.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="admin-field">
                  <label>Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'active' | 'inactive' })}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="admin-field">
                  <label>Size</label>
                  <input value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} placeholder="XS, S, M, L, XL" />
                </div>
                <div className="admin-field">
                  <label>Color</label>
                  <input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
                </div>
                <div className="admin-field">
                  <label>Stock</label>
                  <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
                </div>
                <div className="admin-field">
                  <label>Image URL *</label>
                  <input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="https://example.com/product.jpg" />
                </div>
              </div>
              <div className="admin-field">
                <label>Description</label>
                <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              {form.image && (
                <img
                  src={getProductImage(form.image)}
                  alt="preview"
                  style={{ height: 80, borderRadius: 8, objectFit: 'cover' }}
                  onError={(event) => {
                    event.currentTarget.src = fallbackProductImage;
                  }}
                />
              )}
            </div>
            <div className="admin-modal-actions">
              <button type="button" className="admin-btn admin-btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="button" className="admin-btn admin-btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
