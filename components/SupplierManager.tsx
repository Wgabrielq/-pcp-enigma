
import React, { useState } from 'react';
import { Supplier } from '../types';
import { getSuppliers, saveSupplier, deleteSupplier } from '../services/dataService';
import { Plus, Trash2, Save, Truck } from 'lucide-react';

const SupplierManager: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>(getSuppliers());
  const [isEditing, setIsEditing] = useState(false);
  const [currentSupplier, setCurrentSupplier] = useState<Partial<Supplier>>({});

  const refresh = () => setSuppliers(getSuppliers());

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentSupplier.name) {
      saveSupplier({
        id: currentSupplier.id || `s${Date.now()}`,
        name: currentSupplier.name!,
        contact: currentSupplier.contact || '',
        email: currentSupplier.email || '',
        phone: currentSupplier.phone || '',
        origin: currentSupplier.origin || 'Nacional'
      });
      setIsEditing(false);
      setCurrentSupplier({});
      refresh();
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de eliminar este proveedor?')) {
      deleteSupplier(id);
      refresh();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800 flex items-center">
          <Truck className="mr-2 text-brand-600" /> Gestión de Proveedores
        </h2>
        <button 
          onClick={() => { setCurrentSupplier({}); setIsEditing(true); }}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-brand-700 transition-colors"
        >
          <Plus size={18} className="mr-1" /> Nuevo Proveedor
        </button>
      </div>

      {isEditing && (
        <div className="bg-white p-6 rounded-xl shadow-md border border-brand-200 mb-6">
          <h3 className="font-bold text-slate-700 mb-4">{currentSupplier.id ? 'Editar' : 'Crear'} Proveedor</h3>
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-500 mb-1">Razón Social</label>
              <input 
                className="w-full border p-2 rounded focus:ring-2 focus:ring-brand-500 outline-none"
                value={currentSupplier.name || ''}
                onChange={e => setCurrentSupplier({...currentSupplier, name: e.target.value})}
                required
                placeholder="Ej. Oben Holding"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-500 mb-1">Origen</label>
              <select 
                className="w-full border p-2 rounded focus:ring-2 focus:ring-brand-500 outline-none"
                value={currentSupplier.origin || 'Nacional'}
                onChange={e => setCurrentSupplier({...currentSupplier, origin: e.target.value})}
              >
                  <option value="Nacional">Nacional</option>
                  <option value="Importado">Importado</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-500 mb-1">Contacto</label>
              <input 
                className="w-full border p-2 rounded focus:ring-2 focus:ring-brand-500 outline-none"
                value={currentSupplier.contact || ''}
                onChange={e => setCurrentSupplier({...currentSupplier, contact: e.target.value})}
                placeholder="Nombre del encargado"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-500 mb-1">Email</label>
              <input 
                className="w-full border p-2 rounded focus:ring-2 focus:ring-brand-500 outline-none"
                value={currentSupplier.email || ''}
                onChange={e => setCurrentSupplier({...currentSupplier, email: e.target.value})}
                placeholder="ventas@proveedor.com"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-500 mb-1">Teléfono</label>
              <input 
                className="w-full border p-2 rounded focus:ring-2 focus:ring-brand-500 outline-none"
                value={currentSupplier.phone || ''}
                onChange={e => setCurrentSupplier({...currentSupplier, phone: e.target.value})}
                placeholder="+57 ..."
              />
            </div>
            <div className="md:col-span-2 flex justify-end space-x-3 mt-2">
              <button 
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 flex items-center"
              >
                <Save size={18} className="mr-2" /> Guardar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase">
            <tr>
              <th className="px-6 py-3 font-semibold">Nombre</th>
              <th className="px-6 py-3 font-semibold">Origen</th>
              <th className="px-6 py-3 font-semibold">Contacto</th>
              <th className="px-6 py-3 font-semibold">Teléfono</th>
              <th className="px-6 py-3 font-semibold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {suppliers.length === 0 && (
               <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">No hay proveedores registrados</td></tr>
            )}
            {suppliers.map(supplier => (
              <tr key={supplier.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-3 font-medium text-slate-800">{supplier.name}</td>
                <td className="px-6 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${supplier.origin === 'Importado' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                        {supplier.origin}
                    </span>
                </td>
                <td className="px-6 py-3 text-slate-600">
                    <div>{supplier.contact}</div>
                    <div className="text-xs text-slate-400">{supplier.email}</div>
                </td>
                <td className="px-6 py-3 text-slate-600">{supplier.phone || '-'}</td>
                <td className="px-6 py-3 text-right space-x-2">
                  <button 
                    onClick={() => { setCurrentSupplier(supplier); setIsEditing(true); }}
                    className="text-brand-600 hover:text-brand-800 font-medium"
                  >
                    Editar
                  </button>
                  <button 
                    onClick={() => handleDelete(supplier.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SupplierManager;