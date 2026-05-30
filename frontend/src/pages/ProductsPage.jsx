import React, { useState, useEffect } from 'react';
import { productsApi } from '@/utils/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Plus, Edit2, Trash2, Upload, Loader2, Coffee, Utensils, X, Search, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import ImageEditor from '@/components/ImageEditor';

const formatMoney = (n) => `$${Number(n || 0).toFixed(2)}`;

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('comida');
  const [editing, setEditing] = useState(null); // null=closed, {} = new, {...} = edit
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setProducts(await productsApi.list()); } 
    catch { toast.error('Error al cargar productos'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const countByCat = {
    comida: products.filter(p => p.category === 'comida').length,
    bebida: products.filter(p => p.category === 'bebida').length,
  };

  const filtered = products.filter(p => {
    const catMatch = p.category === activeCategory;
    const sMatch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    return catMatch && sMatch;
  });

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
            <p className="text-xs font-semibold tracking-wider text-foreground/50 uppercase">Catálogo</p>
            <h1 className="font-heading text-3xl font-bold text-foreground">Productos</h1>
          </div>
          <Button
            onClick={() => setEditing({ name: '', price: '', category: activeCategory, image: '', custom_options: [] })}
            className="h-12 rounded-2xl bg-primary-500 hover:bg-primary-400 text-ink-950 font-bold shadow-neon-cyan px-5 ios-press"
            data-testid="add-product-button"
          >
            <Plus className="h-5 w-5 mr-1" /> Nuevo {activeCategory === 'bebida' ? 'bebida' : 'producto'}
          </Button>
        </div>

        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/50" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto…"
            className="pl-11 h-11 rounded-full bg-ink-800 border-white/10 focus:border-primary-500 text-foreground"
            data-testid="products-search"
          />
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 mb-5">
          {[
            { id: 'comida', label: 'Comida', icon: Utensils },
            { id: 'bebida', label: 'Bebida', icon: Coffee },
          ].map(c => {
            const Icon = c.icon;
            const isActive = activeCategory === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                data-testid={`products-category-${c.id}`}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all ios-press ${
                  isActive
                    ? 'bg-primary-500 text-ink-950 shadow-neon-cyan'
                    : 'bg-white/5 text-foreground/60 border border-white/10 hover:bg-white/10'
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={2.2} /> {c.label}
                <span className={`ml-1 inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full text-[10px] font-bold ${
                  isActive ? 'bg-ink-950/40 text-ink-950' : 'bg-white/10 text-foreground/60'
                }`}>{countByCat[c.id]}</span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="glass rounded-3xl p-12 text-center" data-testid="products-empty">
            {activeCategory === 'bebida' ? <Coffee className="h-12 w-12 text-foreground/30 mx-auto mb-3" /> : <Utensils className="h-12 w-12 text-foreground/30 mx-auto mb-3" />}
            <h3 className="font-heading text-xl font-bold text-foreground">
              {search ? 'Sin resultados' : `Sin ${activeCategory === 'bebida' ? 'bebidas' : 'comidas'} aún`}
            </h3>
            <p className="text-foreground/50 mb-4">
              {search ? 'Intenta con otra búsqueda' : `Crea tu primera ${activeCategory === 'bebida' ? 'bebida' : 'comida'} para empezar a vender`}
            </p>
            <Button
              onClick={() => setEditing({ name: '', price: '', category: activeCategory, image: '', custom_options: [] })}
              className="h-12 rounded-2xl bg-primary-500 hover:bg-primary-400 text-ink-950 font-bold shadow-neon-cyan px-5"
            >
              <Plus className="h-4 w-4 mr-1" /> Crear producto
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
            {filtered.map(p => (
              <div key={p.id} className="glass rounded-3xl border border-white/5 hover:border-primary-500/30 hover:shadow-neon-cyan transition-all overflow-hidden flex" data-testid={`product-${p.id}`}>
                <div className="w-28 h-28 bg-ink-800/60 border border-white/5 flex-shrink-0">
                  {p.image ? (
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {p.category === 'bebida' ? <Coffee className="h-8 w-8 text-foreground/30" /> : <Utensils className="h-8 w-8 text-foreground/30" />}
                    </div>
                  )}
                </div>
                <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                  <div>
                    <p className="font-semibold text-foreground truncate">{p.name}</p>
                    <p className="text-xs text-foreground/50 capitalize">{p.category}</p>
                    {p.custom_options?.length > 0 && (
                      <p className="text-[11px] text-primary-500 mt-1 truncate">+{p.custom_options.length} opciones</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-heading font-bold text-primary-500">{formatMoney(p.price)}</span>
                    <div className="flex gap-1">
                      <button onClick={() => setEditing({ ...p, price: String(p.price) })} className="h-8 w-8 rounded-full bg-ink-800/60 border border-white/5 flex items-center justify-center ios-press" data-testid={`edit-product-${p.id}`}>
                        <Edit2 className="h-4 w-4 text-foreground" />
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
  const [editingImage, setEditingImage] = useState(null); // raw uploaded src

  useEffect(() => { setForm(editing || {}); setNewOption(''); setEditingImage(null); }, [editing]);

  if (!editing) return null;

  const handleImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024 * 5) { toast.error('La imagen debe pesar menos de 5MB'); return; }
    const reader = new FileReader();
    reader.onload = () => setEditingImage(reader.result);
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const submit = (e) => {
    e.preventDefault();
    if (!form.name?.trim()) { toast.error('El nombre es requerido'); return; }
    if (!form.price || parseFloat(form.price) <= 0) { toast.error('Precio inválido'); return; }
    onSave(form);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="rounded-3xl max-w-md max-h-[92vh] overflow-y-auto bg-ink-900 border-white/10 text-foreground" data-testid="product-form-modal">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">{editing.id ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
          <DialogDescription className="text-foreground/50 text-sm">Completa los datos del producto.</DialogDescription>
        </DialogHeader>
        {editingImage ? (
          <ImageEditor
            src={editingImage}
            onCancel={() => setEditingImage(null)}
            onConfirm={(dataUrl) => { setForm(f => ({ ...f, image: dataUrl })); setEditingImage(null); }}
          />
        ) : (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-foreground">Imagen</label>
            <div className="mt-1">
              {form.image ? (
                <div className="aspect-square bg-ink-800/60 border border-white/10 rounded-2xl overflow-hidden flex items-center justify-center relative max-w-[220px]">
                  <img src={form.image} alt="" className="w-full h-full object-cover" />
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button
                      type="button"
                      onClick={() => setEditingImage(form.image)}
                      className="h-8 w-8 rounded-full bg-ink-950/80 backdrop-blur text-primary-500 border border-primary-500/30 flex items-center justify-center hover:bg-primary-500 hover:text-ink-950"
                      title="Editar imagen"
                      data-testid="edit-product-image-btn"
                    ><Pencil className="h-4 w-4" /></button>
                    <label className="h-8 w-8 rounded-full bg-ink-950/80 backdrop-blur text-foreground/70 border border-white/20 flex items-center justify-center hover:bg-white/10 cursor-pointer" title="Reemplazar">
                      <Upload className="h-4 w-4" />
                      <input type="file" accept="image/*" onChange={handleImage} className="hidden" />
                    </label>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, image: '' }))}
                      className="h-8 w-8 rounded-full bg-ink-950/80 backdrop-blur text-destructive border border-destructive/30 flex items-center justify-center hover:bg-destructive hover:text-white"
                      title="Quitar imagen"
                    ><X className="h-4 w-4" /></button>
                  </div>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <div className="aspect-square max-w-[220px] bg-ink-800/60 border-2 border-dashed border-white/10 hover:border-primary-500/40 rounded-2xl overflow-hidden flex items-center justify-center transition-all">
                    <div className="text-center">
                      <Upload className="h-8 w-8 text-foreground/40 mx-auto mb-2" />
                      <p className="text-sm text-foreground/50 font-semibold">Subir imagen</p>
                      <p className="text-xs text-foreground/30 mt-1">Podrás recortarla y ajustarla</p>
                    </div>
                  </div>
                  <input type="file" accept="image/*" onChange={handleImage} className="hidden" data-testid="product-image-input" />
                </label>
              )}
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-foreground">Nombre</label>
            <Input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Hamburguesa clásica" className="mt-1 h-12 rounded-2xl bg-ink-800 border-white/10 focus:border-primary-500 text-foreground" data-testid="product-name-input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-foreground">Precio</label>
              <Input type="number" step="0.01" value={form.price || ''} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0.00" className="mt-1 h-12 rounded-2xl bg-ink-800 border-white/10 focus:border-primary-500 text-foreground" data-testid="product-price-input" />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground">Categoría</label>
              <div className="grid grid-cols-2 gap-1 mt-1 bg-ink-800/60 border border-white/5 rounded-2xl p-1">
                {['comida', 'bebida'].map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, category: c })}
                    className={`h-10 rounded-xl text-sm font-semibold capitalize ios-press ${form.category === c ? 'bg-primary-500 text-ink-950 shadow-neon-cyan' : 'text-foreground/50'}`}
                    data-testid={`product-category-${c}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-foreground">Opciones personalizadas</label>
            <p className="text-xs text-foreground/50 mb-2">Ej: "sin cebolla", "extra queso"</p>
            <div className="flex gap-2">
              <Input value={newOption} onChange={(e) => setNewOption(e.target.value)} placeholder="Nueva opción" className="h-11 rounded-2xl bg-ink-800/60 border border-white/10" data-testid="product-option-input" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (newOption.trim()) { setForm(f => ({ ...f, custom_options: [...(f.custom_options || []), newOption.trim()] })); setNewOption(''); } } }} />
              <Button type="button" variant="outline" className="h-11 rounded-2xl px-4 bg-white/5 border-white/10 hover:bg-white/10 text-foreground" onClick={() => { if (newOption.trim()) { setForm(f => ({ ...f, custom_options: [...(f.custom_options || []), newOption.trim()] })); setNewOption(''); } }} data-testid="add-option-button">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {(form.custom_options || []).map((o, i) => (
                <span key={i} className="inline-flex items-center gap-1 bg-primary-500/15 text-primary-500 border border-primary-500/30 text-sm px-3 py-1 rounded-full">
                  {o}
                  <button type="button" onClick={() => setForm(f => ({ ...f, custom_options: f.custom_options.filter((_, idx) => idx !== i) }))} className="hover:text-destructive" data-testid={`remove-option-${i}`}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
          <DialogFooter className="flex-row gap-2 sm:gap-2">
            <Button type="button" variant="outline" className="flex-1 h-12 rounded-2xl bg-white/5 border-white/10 hover:bg-white/10 text-foreground" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="flex-1 h-12 rounded-2xl bg-primary-500 hover:bg-primary-400 text-ink-950 font-bold shadow-neon-cyan" disabled={saving} data-testid="save-product-button">
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProductsPage;
