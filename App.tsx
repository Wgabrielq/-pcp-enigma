
import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import ProductionCalculator from './components/ProductionCalculator';
import ProductManager from './components/ProductManager';
import ClientManager from './components/ClientManager';
import MaterialManager from './components/MaterialManager';
import SupplierManager from './components/SupplierManager';
import ProductionQueue from './components/ProductionQueue';
import Settings from './components/Settings';
import Dashboard from './components/Dashboard';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 ml-64 p-8 overflow-y-auto h-screen">
        <div className="max-w-7xl mx-auto">
          
          <header className="mb-8 flex justify-between items-center">
             <h1 className="text-3xl font-bold text-slate-800 capitalize">
               {activeTab === 'settings' ? 'Configuración' : activeTab === 'queue' ? 'Programación' : activeTab.replace('-', ' ')}
             </h1>
          </header>

          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'queue' && <ProductionQueue />}
          {activeTab === 'calculator' && <ProductionCalculator />}
          {activeTab === 'products' && <ProductManager />}
          {activeTab === 'materials' && <MaterialManager />}
          {activeTab === 'suppliers' && <SupplierManager />}
          {activeTab === 'clients' && <ClientManager />}
          {activeTab === 'settings' && <Settings />}
          
        </div>
      </main>
    </div>
  );
};

export default App;
