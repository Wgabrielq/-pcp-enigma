
import React, { useState, useEffect } from 'react';
import { getMaterials, getClients, saveProduct, getProducts, deleteProduct } from '../services/dataService';
import { ProductRecipe, MaterialType } from '../types';
import { Plus, Save, Box, Circle, List, Edit, Trash2, Search, Layers, Ruler, AlertTriangle } from 'lucide-react';

const ProductManager: React.FC = () => {
  const materials = getMaterials();
  const clients = getClients();
  
  // View State: 'list' or 'form'
  const [view, setView] = useState<'list' | 'form'>('list');
  const [products, setProducts] = useState<ProductRecipe[]>(getProducts());
  const [searchTerm, setSearchTerm] = useState('');

  const DEFAULT_PRODUCT: Partial<ProductRecipe> = {
    format: 'BOBINA',
    tracks: 1,
    inkCoverage: 3.0,
    adhesiveCoverage: 1.8,
    specificScrapPercent: 0.05,
    windingDirection: 'A1',
    layer2Id: '',
    layer3Id: '',
  };

  const [newProduct, setNewProduct] = useState<Partial<ProductRecipe>>(DEFAULT_PRODUCT);
  const [saved, setSaved] = useState(false);

  // Refresh list
  useEffect(() => {
    setProducts(getProducts());
  }, [view]);

  const handleEdit = (product: ProductRecipe) => {
    setNewProduct(product);
    setView('form');
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta ficha técnica? Se borrará del historial.')) {
      deleteProduct(id);
      setProducts(getProducts());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProduct.name && newProduct.clientId) {
      const product: ProductRecipe = {
        ...newProduct as ProductRecipe,
        id: newProduct.id || `p${Date.now()}`,
      };
      saveProduct(product);
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setView('list'); // Return to list after save
      }, 1500);
    }
  };

  const handleChange = (field: keyof ProductRecipe, value: any) => {
    setNewProduct(prev => ({ ...prev, [field]: value }));
  };

  const toggleView = () => {
    if (view === 'list') {
      setNewProduct(DEFAULT_PRODUCT); // Reset for new
      setView('form');
    } else {
      setView('list');
    }
  };

  // --- VALIDATION HELPER ---
  const isWidthCompatible = (materialId: string | undefined): boolean => {
    if (!materialId || !newProduct.webWidth) return true;
    const mat = materials.find(m => m.id === materialId);
    if (!mat) return true;
    // Warning if Material Width is LESS than Printing Web Width
    return mat.width >= newProduct.webWidth;
  };

  // --- WINDING OPTIONS GENERATOR ---
  const windingOptions = [
      ...['A','B','C','D','E','F','G'].flatMap(char => [1,2,3,4,5,6].map(num => `${char}${num}`))
  ];

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* HEADER & TOGGLE */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            {view === 'list' ? 'Fichas Técnicas' : (newProduct.id ? 'Editar Ficha' : 'Nueva Ficha Técnica')}
          </h2>
          <p className="text-sm text-slate-500">
            {view === 'list' ? 'Gestiona las recetas de producción' : 'Define estructura y parámetros'}
          </p>
        </div>
        <button 
          onClick={toggleView}
          className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center transition-colors ${
             view === 'list' 
             ? 'bg-brand-600 text-white hover:bg-brand-700 shadow-md' 
             : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {view === 'list' ? <><Plus size={18} className="mr-2" /> Nueva Ficha</> : <><List size={18} className="mr-2" /> Ver Listado</>}
        </button>
      </div>

      {/* --- LIST VIEW --- */}
      {view === 'list' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
           {/* Search Bar */}
           <div className="p-4 border-b border-slate-100">
             <div className="relative max-w-md">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar por nombre o SKU..." 
                  className="pl-10 pr-4 py-2 w-full border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
           </div>

           <table className="w-full text-left text-sm">
             <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase">
               <tr>
                 <th className="px-6 py-3 font-semibold">SKU / Producto</th>
                 <th className="px-6 py-3 font-semibold">Cliente</th>
                 <th className="px-6 py-3 font-semibold">Formato</th>
                 <th className="px-6 py-3 font-semibold">Dimensiones</th>
                 <th className="px-6 py-3 font-semibold text-right">Acciones</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
               {filteredProducts.length === 0 && (
                 <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">No hay productos registrados.</td></tr>
               )}
               {filteredProducts.map(p => {
                 const clientName = clients.find(c => c.id === p.clientId)?.name || 'N/A';
                 return (
                   <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                     <td className="px-6 py-4">
                        <div className="font-bold text-slate-800">{p.name}</div>
                        <div className="text-xs text-slate-500 font-mono">{p.sku}</div>
                        <div className="flex items-center mt-1 space-x-2">
                           {p.layer2Id ? <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 rounded border border-purple-200">Laminado</span> : <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 rounded border border-slate-200">Monocapa</span>}
                        </div>
                     </td>
                     <td className="px-6 py-4 text-slate-600">{clientName}</td>
                     <td className="px-6 py-4">
                        <span className={`flex items-center w-max px-2 py-1 rounded-lg text-xs font-bold ${p.format === 'BOLSA' ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-700'}`}>
                           {p.format === 'BOLSA' ? <Box size={14} className="mr-1"/> : <Circle size={14} className="mr-1"/>}
                           {p.format}
                        </span>
                     </td>
                     <td className="px-6 py-4 text-slate-600 text-xs space-y-1">
                        <div className="flex items-center"><Ruler size={12} className="mr-1"/> Ancho: {p.webWidth}mm</div>
                        <div className="flex items-center"><Layers size={12} className="mr-1"/> Pistas: {p.tracks}</div>
                        <div className="flex items-center"><Box size={12} className="mr-1"/> Paso: {p.cutoff}mm</div>
                     </td>
                     <td className="px-6 py-4 text-right space-x-2 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(p)} className="text-brand-600 hover:bg-brand-50 p-1.5 rounded tooltip" title="Editar">
                          <Edit size={18} />
                        </button>
                        <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded tooltip" title="Eliminar">
                          <Trash2 size={18} />
                        </button>
                     </td>
                   </tr>
                 );
               })}
             </tbody>
           </table>
        </div>
      )}

      {/* --- FORM VIEW --- */}
      {view === 'form' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 max-w-5xl mx-auto p-8 animate-fade-in">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* General Info */}
            <section>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">1. Información Comercial</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="label-text">Cliente</label>
                  <select 
                    className="input-field"
                    required
                    value={newProduct.clientId}
                    onChange={(e) => handleChange('clientId', e.target.value)}
                  >
                    <option value="">Seleccionar...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-text">SKU / Código</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="Ej. BOL-500G" 
                    value={newProduct.sku || ''}
                    onChange={(e) => handleChange('sku', e.target.value)} 
                  />
                </div>
                <div>
                  <label className="label-text">Nombre del Producto</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="Ej. Bolsa Arroz 500g Premium" 
                    required 
                    value={newProduct.name || ''}
                    onChange={(e) => handleChange('name', e.target.value)} 
                  />
                </div>
              </div>
            </section>

            {/* Format Selection */}
            <section>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">2. Formato y Dimensiones</h3>
              
              <div className="flex space-x-4 mb-6">
                <button
                  type="button"
                  onClick={() => handleChange('format', 'BOBINA')}
                  className={`flex items-center px-6 py-3 rounded-lg border-2 transition-all ${
                    newProduct.format === 'BOBINA' 
                      ? 'border-brand-500 bg-brand-50 text-brand-700' 
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <Circle className="mr-2" size={20} /> Bobina (Reel)
                </button>
                <button
                  type="button"
                  onClick={() => handleChange('format', 'BOLSA')}
                  className={`flex items-center px-6 py-3 rounded-lg border-2 transition-all ${
                    newProduct.format === 'BOLSA' 
                      ? 'border-brand-500 bg-brand-50 text-brand-700' 
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <Box className="mr-2" size={20} /> Bolsa (Bag)
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-slate-50 p-6 rounded-lg border border-slate-200">
                
                {/* CAMPOS ESPECÍFICOS BOBINA */}
                {newProduct.format === 'BOBINA' && (
                  <>
                    <div>
                      <label className="label-text text-brand-600">Ancho Final Bobina (mm)</label>
                      <input type="number" className="input-field" required value={newProduct.finalReelWidth || ''} onChange={(e) => handleChange('finalReelWidth', Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="label-text text-brand-600">Paso / Cutoff (mm)</label>
                      <input type="number" className="input-field" required value={newProduct.cutoff || ''} onChange={(e) => handleChange('cutoff', Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="label-text">Sentido Bobinado</label>
                      <select className="input-field" value={newProduct.windingDirection} onChange={(e) => handleChange('windingDirection', e.target.value)}>
                        {windingOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                  </>
                )}

                {/* CAMPOS ESPECÍFICOS BOLSA */}
                {newProduct.format === 'BOLSA' && (
                  <>
                     <div>
                      <label className="label-text text-brand-600">Ancho Bolsa / Paso (mm)</label>
                      <input type="number" className="input-field" required value={newProduct.bagWidth || ''} onChange={(e) => {
                        handleChange('bagWidth', Number(e.target.value));
                        handleChange('cutoff', Number(e.target.value)); // El Ancho es el Paso de cálculo
                      }} />
                      <p className="text-[10px] text-slate-500 mt-1 italic">Este valor define los metros por unidad.</p>
                    </div>
                    <div>
                      <label className="label-text text-slate-600">Alto / Largo (mm)</label>
                      <input type="number" className="input-field" required value={newProduct.bagHeight || ''} onChange={(e) => {
                        handleChange('bagHeight', Number(e.target.value));
                      }} />
                    </div>
                    <div>
                      <label className="label-text">Fuelle (mm)</label>
                      <input type="number" className="input-field" placeholder="0" value={newProduct.gusset || ''} onChange={(e) => handleChange('gusset', Number(e.target.value))} />
                    </div>
                  </>
                )}

                {/* CAMPOS COMUNES */}
                <div className="border-l border-slate-300 pl-6 md:col-span-1 col-span-2">
                   <label className="label-text text-slate-900 font-bold">Ingeniería</label>
                   <div className="space-y-3 mt-2">
                     <div>
                        <label className="text-xs text-slate-500">Pistas (Montaje)</label>
                        <input type="number" className="input-field py-1" min="1" required value={newProduct.tracks || 1} onChange={(e) => handleChange('tracks', Number(e.target.value))} />
                     </div>
                     <div>
                        <label className="text-xs text-slate-500">Desarrollo Cilindro (mm)</label>
                        <input type="number" className="input-field py-1" required value={newProduct.cylinder || ''} onChange={(e) => handleChange('cylinder', Number(e.target.value))} />
                     </div>
                     <div>
                        <label className="text-xs text-brand-600 font-bold">Ancho Impresión (mm)</label>
                        <input type="number" className="input-field py-1 border-brand-300 bg-white" required value={newProduct.webWidth || ''} onChange={(e) => handleChange('webWidth', Number(e.target.value))} />
                     </div>
                   </div>
                </div>
              </div>
              
              <div className="mt-4">
                 <label className="label-text flex items-center">
                    % Pérdida Estimada (Scrap)
                    <span className="ml-2 text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-500">Reemplaza valor global</span>
                 </label>
                 <div className="flex items-center">
                    <input 
                      type="number" 
                      step="0.01" 
                      placeholder="Ej. 0.05 para 5%"
                      className="input-field w-32" 
                      value={newProduct.specificScrapPercent || ''} 
                      onChange={(e) => handleChange('specificScrapPercent', Number(e.target.value))} 
                    />
                    <span className="ml-2 text-sm text-slate-500">factor (0.05 = 5%)</span>
                 </div>
              </div>
            </section>

            {/* Structure Layers */}
            <section>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">3. Estructura de Materiales</h3>
              <div className="space-y-6 p-6 bg-slate-50 rounded-xl border border-slate-200">
                
                {/* Capa 1 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="md:col-span-2">
                    <label className="label-text text-brand-700 font-bold">Capa 1 (Externa / Impresión)</label>
                    <select 
                        className={`input-field ${!isWidthCompatible(newProduct.layer1Id) ? 'border-red-400 bg-red-50' : ''}`} 
                        required 
                        value={newProduct.layer1Id}
                        onChange={(e) => handleChange('layer1Id', e.target.value)}
                    >
                      <option value="">Seleccionar Material...</option>
                      {materials.map(m => (
                        <option key={m.id} value={m.id}>
                           {m.name} - {m.width}mm ({m.internalCode}) [Stock: {m.currentStockKg}kg]
                        </option>
                      ))}
                    </select>
                    {!isWidthCompatible(newProduct.layer1Id) && (
                        <p className="text-xs text-red-600 mt-1 flex items-center">
                            <AlertTriangle size={12} className="mr-1"/> El material es más angosto que el Ancho de Impresión ({newProduct.webWidth}mm)
                        </p>
                    )}
                  </div>
                  <div>
                    <label className="label-text">Tinta Promedio (g/m²)</label>
                    <input type="number" step="0.1" className="input-field" value={newProduct.inkCoverage} onChange={(e) => handleChange('inkCoverage', Number(e.target.value))} />
                  </div>
                </div>

                {/* Capa 2 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end relative">
                  <div className="absolute -left-3 top-8 w-0.5 h-8 bg-slate-300 hidden md:block"></div>
                  <div className="md:col-span-2">
                    <label className="label-text">Capa 2 (Laminación)</label>
                    <select 
                        className={`input-field ${!isWidthCompatible(newProduct.layer2Id) ? 'border-red-400 bg-red-50' : ''}`} 
                        value={newProduct.layer2Id}
                        onChange={(e) => handleChange('layer2Id', e.target.value)}
                    >
                      <option value="">(Ninguna / Monocapa)</option>
                      {materials.map(m => (
                        <option key={m.id} value={m.id}>
                           {m.name} - {m.width}mm ({m.internalCode})
                        </option>
                      ))}
                    </select>
                    {!isWidthCompatible(newProduct.layer2Id) && newProduct.layer2Id && (
                        <p className="text-xs text-red-600 mt-1 flex items-center">
                            <AlertTriangle size={12} className="mr-1"/> El material es más angosto que el Ancho de Impresión ({newProduct.webWidth}mm)
                        </p>
                    )}
                  </div>
                  <div>
                    <label className="label-text">Adhesivo 1 (g/m²)</label>
                    <input type="number" step="0.1" className="input-field" value={newProduct.adhesiveCoverage} onChange={(e) => handleChange('adhesiveCoverage', Number(e.target.value))} />
                  </div>
                </div>

                {/* Capa 3 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end relative">
                   <div className="absolute -left-3 top-8 w-0.5 h-8 bg-slate-300 hidden md:block"></div>
                  <div className="md:col-span-2">
                    <label className="label-text">Capa 3 (Trilaminado / Sellante)</label>
                    <select 
                        className={`input-field ${!isWidthCompatible(newProduct.layer3Id) ? 'border-red-400 bg-red-50' : ''}`} 
                        value={newProduct.layer3Id}
                        onChange={(e) => handleChange('layer3Id', e.target.value)}
                    >
                      <option value="">(Ninguna)</option>
                      {materials.map(m => (
                        <option key={m.id} value={m.id}>
                           {m.name} - {m.width}mm ({m.internalCode})
                        </option>
                      ))}
                    </select>
                     {!isWidthCompatible(newProduct.layer3Id) && newProduct.layer3Id && (
                        <p className="text-xs text-red-600 mt-1 flex items-center">
                            <AlertTriangle size={12} className="mr-1"/> El material es más angosto que el Ancho de Impresión ({newProduct.webWidth}mm)
                        </p>
                    )}
                  </div>
                   <div className="text-xs text-slate-400 italic">
                      Usa el mismo gramaje de adhesivo configurado arriba.
                   </div>
                </div>
              </div>
            </section>

            <div className="pt-6 flex justify-end space-x-3">
              <button 
                type="button" 
                onClick={() => setView('list')}
                className="px-6 py-3 rounded-lg font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="flex items-center bg-brand-600 hover:bg-brand-700 text-white px-8 py-3 rounded-lg font-bold shadow-lg transition-all hover:scale-105"
              >
                <Save className="mr-2" /> Guardar Ficha Técnica
              </button>
            </div>

            {saved && (
              <div className="p-4 bg-green-50 text-green-700 rounded-lg text-center font-medium border border-green-200 animate-bounce">
                ¡Ficha técnica guardada exitosamente!
              </div>
            )}
          </form>
        </div>
      )}

      <style>{`
        .label-text { display: block; font-size: 0.875rem; font-weight: 500; color: #475569; margin-bottom: 0.25rem; }
        .input-field { width: 100%; border-radius: 0.5rem; border: 1px solid #cbd5e1; padding: 0.625rem; outline: none; transition: border-color 0.2s; }
        .input-field:focus { border-color: #0ea5e9; ring: 2px; ring-color: #0ea5e9; }
      `}</style>
    </div>
  );
};

export default ProductManager;
