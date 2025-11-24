import React, { useState } from 'react';
import { Client } from '../types';
import { getClients, saveClient, deleteClient } from '../services/dataService';
import { Plus, Trash2, Save, Users } from 'lucide-react';

const ClientManager: React.FC = () => {
  const [clients, setClients] = useState<Client[]>(getClients());
  const [isEditing, setIsEditing] = useState(false);
  const [currentClient, setCurrentClient] = useState<Partial<Client>>({});

  const refresh = () => setClients(getClients());

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentClient.name) {
      saveClient({
        id: currentClient.id || `c${Date.now()}`,
        name: currentClient.name!,
        contact: currentClient.contact || '',
        email: currentClient.email || '',
        phone: currentClient.phone || ''
      });
      setIsEditing(false);
      setCurrentClient({});
      refresh();
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de eliminar este cliente?')) {
      deleteClient(id);
      refresh();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800 flex items-center">
          <Users className="mr-2 text-brand-600" /> Gestión de Clientes
        </h2>
        <button 
          onClick={() => { setCurrentClient({}); setIsEditing(true); }}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-brand-700 transition-colors"
        >
          <Plus size={18} className="mr-1" /> Nuevo Cliente
        </button>
      </div>

      {isEditing && (
        <div className="bg-white p-6 rounded-xl shadow-md border border-brand-200 mb-6">
          <h3 className="font-bold text-slate-700 mb-4">{currentClient.id ? 'Editar' : 'Crear'} Cliente</h3>
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-500 mb-1">Razón Social</label>
              <input 
                className="w-full border p-2 rounded focus:ring-2 focus:ring-brand-500 outline-none"
                value={currentClient.name || ''}
                onChange={e => setCurrentClient({...currentClient, name: e.target.value})}
                required
                placeholder="Ej. Alimentos SAS"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-500 mb-1">Contacto</label>
              <input 
                className="w-full border p-2 rounded focus:ring-2 focus:ring-brand-500 outline-none"
                value={currentClient.contact || ''}
                onChange={e => setCurrentClient({...currentClient, contact: e.target.value})}
                placeholder="Nombre del encargado"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-500 mb-1">Email</label>
              <input 
                className="w-full border p-2 rounded focus:ring-2 focus:ring-brand-500 outline-none"
                value={currentClient.email || ''}
                onChange={e => setCurrentClient({...currentClient, email: e.target.value})}
                placeholder="contacto@cliente.com"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-500 mb-1">Teléfono</label>
              <input 
                className="w-full border p-2 rounded focus:ring-2 focus:ring-brand-500 outline-none"
                value={currentClient.phone || ''}
                onChange={e => setCurrentClient({...currentClient, phone: e.target.value})}
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
              <th className="px-6 py-3 font-semibold">Contacto</th>
              <th className="px-6 py-3 font-semibold">Email</th>
              <th className="px-6 py-3 font-semibold">Teléfono</th>
              <th className="px-6 py-3 font-semibold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {clients.length === 0 && (
               <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">No hay clientes registrados</td></tr>
            )}
            {clients.map(client => (
              <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-3 font-medium text-slate-800">{client.name}</td>
                <td className="px-6 py-3 text-slate-600">{client.contact}</td>
                <td className="px-6 py-3 text-slate-600">{client.email || '-'}</td>
                <td className="px-6 py-3 text-slate-600">{client.phone || '-'}</td>
                <td className="px-6 py-3 text-right space-x-2">
                  <button 
                    onClick={() => { setCurrentClient(client); setIsEditing(true); }}
                    className="text-brand-600 hover:text-brand-800 font-medium"
                  >
                    Editar
                  </button>
                  <button 
                    onClick={() => handleDelete(client.id)}
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

export default ClientManager;