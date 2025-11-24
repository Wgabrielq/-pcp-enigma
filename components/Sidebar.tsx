
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, Package, Scroll, Calculator, Settings, Truck, ListOrdered, HardDrive, CheckCircle } from 'lucide-react';
import { connectAndLoadDB, isDBConnected } from '../services/dataService';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const [isConnected, setIsConnected] = useState(false);

  const handleConnect = async () => {
    const success = await connectAndLoadDB();
    setIsConnected(success);
    if(success) alert("Conectado con éxito. Los cambios se guardarán automáticamente en el archivo.");
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'queue', label: 'Fila de Producción', icon: ListOrdered },
    { id: 'calculator', label: 'Calculadora Prod.', icon: Calculator },
    { id: 'products', label: 'Fichas Técnicas', icon: Scroll },
    { id: 'materials', label: 'Inventario', icon: Package },
    { id: 'suppliers', label: 'Proveedores', icon: Truck },
    { id: 'clients', label: 'Clientes', icon: Users },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-white h-screen fixed left-0 top-0 flex flex-col shadow-xl z-50">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-2xl font-bold tracking-tight text-brand-500">PCP</h1>
        <p className="text-xs text-slate-400 mt-1">Enigma v1.1</p>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
                activeTab === item.id 
                  ? 'bg-brand-600 text-white shadow-lg' 
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
      
      <div className="p-4 bg-slate-800 mx-4 mb-4 rounded-lg border border-slate-700">
          <div className="flex items-center justify-between mb-2">
             <span className="text-xs font-bold text-slate-400 uppercase">Estado Conexión</span>
             {isConnected ? <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e]"></div> : <div className="h-2 w-2 rounded-full bg-slate-500"></div>}
          </div>
          
          <button 
            onClick={handleConnect}
            className={`w-full text-xs font-bold py-2 px-2 rounded flex items-center justify-center transition-all ${
                isConnected 
                ? 'bg-green-900/30 text-green-400 border border-green-800 cursor-default' 
                : 'bg-brand-700 hover:bg-brand-600 text-white shadow-md'
            }`}
          >
            {isConnected ? (
                <><CheckCircle size={12} className="mr-1.5"/> BD Sincronizada</>
            ) : (
                <><HardDrive size={12} className="mr-1.5"/> Conectar BD</>
            )}
          </button>
      </div>

      <div className="p-4 border-t border-slate-700">
        <button 
          onClick={() => setActiveTab('settings')}
          className={`flex items-center space-x-3 px-4 py-2 w-full transition-colors ${
            activeTab === 'settings' ? 'text-brand-400 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Settings size={18} />
          <span className="text-sm">Configuración</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
