import React, { useState, useEffect } from 'react';
import { productsApi } from '@/utils/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Plus, Edit2, Trash2, Upload, Loader2, Coffee, Utensils, X, Search } from 'lucide-react';
import { toast } from 'sonner';

const formatMoney = (n) => `$${Number(n || 0).toFixed(2)}`;

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null); // null=closed, {} = new, {...} = edit
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setProducts(await productsApi.list()); } 
    catch { toast.error('Error al cargar productos'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = products.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()));

  const handleSave = async (form) => {
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        price: parseFloat(form.price),
        category: form.category,
        image: form.image || null,
        custom_options: form.custom_options.filter(o => o.trim()),
      };
      if (editing.id) {
        await productsApi.update(editing.id, payload);
        toast.success('Producto actualizado');
      } else {
        await productsApi.create(payload);
        toast.success('Producto creado');
      }
      setEditing(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este producto?')) return;
    try {
      await productsApi.remove(id);
      toast.success('Producto eliminado');
      load();
    } catch { toast.error('Error al eliminar'); }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-32 md:pb-6" data-testid="products-page">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <div>
            <p className="text-xs font-semibold tracking-wider text-ios-secondary uppercase">Catálogo</p>
            <h1 className="font-heading text-3xl font-bold text-ios-text">Productos</h1>
          </div>
          <Button
            onClick={() => setEditing({ name: '', price: '', category: 'comida', image: '', custom_options: [] })}
            className="h-12 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white px-5 ios-press"
            data-testid="add-product-button"
          >
            <Plus className="h-5 w-5 mr-1" /> Nuevo producto
          </Button>
        </div>

        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-ios-secondary" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto…"
            className="pl-11 h-11 rounded-full bg-ios-gray border-transparent focus:bg-white focus:border-primary-500"
            data-testid="products-search"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-3xl border border-ios-border p-12 text-center" data-testid="products-empty">
            <Utensils className="h-12 w-12 text-ios-tertiary mx-auto mb-3" />
            <h3 className="font-heading text-xl font-bold text-ios-text">Sin productos aún</h3>
            <p className="text-ios-secondary mb-4">Crea tu primer producto para empezar a vender</p>
            <Button
              onClick={() => setEditing({ name: '', price: '', category: 'comida', image: '', custom_options: [] })}
              className="h-12 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white px-5"
            >
              <Plus className="h-4 w-4 mr-1" /> Crear producto
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
            {filtered.map(p => (
              <div key={p.id} className="bg-white rounded-3xl shadow-ios-sm border border-ios-border/60 overflow-hidden flex" data-testid={`product-${p.id}`}>
                <div className="w-28 h-28 bg-ios-gray flex-shrink-0">
                  {p.image ? (
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {p.category === 'bebida' ? <Coffee className="h-8 w-8 text-ios-tertiary" /> : <Utensils className="h-8 w-8 text-ios-tertiary" />}
                    </div>
                  )}
                </div>
                <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                  <div>
                    <p className="font-semibold text-ios-text truncate">{p.name}</p>
                    <p className="text-xs text-ios-secondary capitalize">{p.category}</p>
                    {p.custom_options?.length > 0 && (
                      <p className="text-[11px] text-primary-500 mt-1 truncate">+{p.custom_options.length} opciones</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-heading font-bold text-primary-500">{formatMoney(p.price)}</span>
                    <div className="flex gap-1">
                      <button onClick={() => setEditing({ ...p, price: String(p.price) })} className="h-8 w-8 rounded-full bg-ios-gray flex items-center justify-center ios-press" data-testid={`edit-product-${p.id}`}>
                        <Edit2 className="h-4 w-4 text-ios-text" />
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center ios-press" data-testid={`delete-product-${p.id}`}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ProductForm editing={editing} onClose={() => setEditing(null)} onSave={handleSave} saving={saving} />
    </div>
  );
};

const ProductForm = ({ editing, onClose, onSave, saving }) => {
  const [form, setForm] = useState(editing || {});
  const [newOption, setNewOption] = useState('');

  useEffect(() => { setForm(editing || {}); setNewOption(''); }, [editing]);

  if (!editing) return null;

  const handleImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024 * 2) { toast.error('La imagen debe pesar menos de 2MB'); return; }
    const reader = new FileReader();
    reader.onload = () => setForm(f => ({ ...f, image: reader.result }));
    reader.readAsDataURL(file);
  };

  const submit = (e) => {
    e.preventDefault();
    if (!form.name?.trim()) { toast.error('El nombre es requerido'); return; }
    if (!form.price || parseFloat(form.price) <= 0) { toast.error('Precio inválido'); return; }
    onSave(form);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="rounded-3xl max-w-md max-h-[92vh] overflow-y-auto" data-testid="product-form-modal">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">{editing.id ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
          <DialogDescription className="text-ios-secondary text-sm">Completa los datos del producto.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-ios-text">Imagen</label>
            <label className="block mt-1 cursor-pointer">
              <div className="aspect-video bg-ios-gray rounded-2xl overflow-hidden flex items-center justify-center relative">
                {form.image ? (
                  <>
                    <img src={form.image} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={(e) => { e.preventDefault(); setForm(f => ({ ...f, image: '' })); }} className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/60 text-white flex items-center justify-center">
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <div className="text-center">
                    <Upload className="h-8 w-8 text-ios-secondary mx-auto mb-2" />
                    <p className="text-sm text-ios-secondary">Subir imagen</p>
                  </div>
                )}
              </div>
              <input type="file" accept="image/*" onChange={handleImage} className="hidden" data-testid="product-image-input" />
            </label>
          </div>
          <div>
            <label className="text-sm font-semibold text-ios-text">Nombre</label>
            <Input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Hamburguesa clásica" className="mt-1 h-12 rounded-2xl bg-ios-gray border-transparent focus:bg-white focus:border-primary-500" data-testid="product-name-input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-ios-text">Precio</label>
              <Input type="number" step="0.01" value={form.price || ''} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0.00" className="mt-1 h-12 rounded-2xl bg-ios-gray border-transparent focus:bg-white focus:border-primary-500" data-testid="product-price-input" />
            </div>
            <div>
              <label className="text-sm font-semibold text-ios-text">Categoría</label>
              <div className="grid grid-cols-2 gap-1 mt-1 bg-ios-gray rounded-2xl p-1">
                {['comida', 'bebida'].map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, category: c })}
                    className={`h-10 rounded-xl text-sm font-semibold capitalize ios-press ${form.category === c ? 'bg-white text-ios-text shadow-ios-sm' : 'text-ios-secondary'}`}
                    data-testid={`product-category-${c}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-ios-text">Opciones personalizadas</label>
            <p className="text-xs text-ios-secondary mb-2">Ej: "sin cebolla", "extra queso"</p>
            <div className="flex gap-2">
              <Input value={newOption} onChange={(e) => setNewOption(e.target.value)} placeholder="Nueva opción" className="h-11 rounded-2xl bg-ios-gray border-transparent" data-testid="product-option-input" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (newOption.trim()) { setForm(f => ({ ...f, custom_options: [...(f.custom_options || []), newOption.trim()] })); setNewOption(''); } } }} />
              <Button type="button" variant="outline" className="h-11 rounded-2xl px-4" onClick={() => { if (newOption.trim()) { setForm(f => ({ ...f, custom_options: [...(f.custom_options || []), newOption.trim()] })); setNewOption(''); } }} data-testid="add-option-button">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {(form.custom_options || []).map((o, i) => (
                <span key={i} className="inline-flex items-center gap-1 bg-primary-50 text-primary-600 text-sm px-3 py-1 rounded-full">
                  {o}
                  <button type="button" onClick={() => setForm(f => ({ ...f, custom_options: f.custom_options.filter((_, idx) => idx !== i) }))} data-testid={`remove-option-${i}`}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
          <DialogFooter className="flex-row gap-2 sm:gap-2">
            <Button type="button" variant="outline" className="flex-1 h-12 rounded-2xl" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="flex-1 h-12 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white" disabled={saving} data-testid="save-product-button">
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProductsPage;
