
import React, { useState, useRef } from 'react';
import { getConfig, updateConfig, generateExcelExport, exportDatabaseJSON, importDatabaseJSON } from '../services/dataService';
import { Settings as SettingsIcon, Save, Download, Database, Cloud, Upload } from 'lucide-react';

const Settings: React.FC = () => {
  const [config, setConfig] = useState(getConfig());
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
     if (e.target.files && e.target.files[0]) {
        const success = await importDatabaseJSON(e.target.files[0]);
        if (success) {
            alert("Base de datos restaurada correctamente. La página se recargará.");
            window.location.reload();
        }
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
     }
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in space-y-8">
      
      {/* Configuración de Cálculos */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="flex items-center mb-6 pb-4 border-b border-slate-100">
          <div className="bg-slate-100 p-3 rounded-full mr-4">
            <SettingsIcon className="text-slate-600" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Parámetros de Producción</h2>
            <p className="text-slate-500 text-sm">Variables globales para el cálculo de merma y metraje</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block font-medium text-slate-700 mb-2">Metros Fijos de Arranque</label>
            <p className="text-xs text-slate-500 mb-2">Cantidad de metros perdidos por setup/montaje de máquina.</p>
            <div className="flex items-center">
              <input 
                type="number" 
                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand-500 outline-none"
                value={config.fixedStartupMeters}
                onChange={(e) => setConfig({...config, fixedStartupMeters: Number(e.target.value)})}
              />
              <span className="ml-3 text-slate-600 font-medium">metros</span>
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-2">% Merma Variable (Proceso)</label>
            <p className="text-xs text-slate-500 mb-2">Porcentaje de seguridad sobre el metraje neto (ej. 0.05 = 5%).</p>
            <div className="flex items-center">
              <input 
                type="number" 
                step="0.01"
                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand-500 outline-none"
                value={config.variableScrapPercent}
                onChange={(e) => setConfig({...config, variableScrapPercent: Number(e.target.value)})}
              />
              <span className="ml-3 text-slate-600 font-medium">factor (0.1 = 10%)</span>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between">
             {saved ? <span className="text-green-600 font-medium text-sm animate-pulse">¡Guardado correctamente!</span> : <span></span>}
             <button type="submit" className="bg-brand-600 text-white px-6 py-2 rounded-lg hover:bg-brand-700 transition-colors flex items-center">
               <Save className="mr-2" size={18} /> Guardar Cambios
             </button>
          </div>
        </form>
      </div>

      {/* Exportación de Datos */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="flex items-center mb-6 pb-4 border-b border-slate-100">
          <div className="bg-emerald-100 p-3 rounded-full mr-4">
            <Database className="text-emerald-600" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Base de Datos (Sincronización)</h2>
            <p className="text-slate-500 text-sm">Guarda y carga tu información para usar en otros equipos</p>
          </div>
        </div>
        
        <div className="space-y-4">
           <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
            <div className="text-slate-600 text-sm max-w-xs">
              <strong>Reporte Excel (.xlsx)</strong><br/>
              Tablas de Clientes, Materiales y Fichas legibles para humanos.
            </div>
            <button 
              onClick={generateExcelExport}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors flex items-center shadow"
            >
              <Download className="mr-2" size={18} /> Excel
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <div className="text-blue-800 text-sm mb-3 font-bold flex items-center">
                   <Cloud className="mr-2" size={16} /> 1. Guardar (Backup)
                </div>
                <p className="text-xs text-blue-600 mb-3">Descarga el archivo JSON. Guárdalo en tu Google Drive para llevarlo a otra PC.</p>
                <button 
                onClick={exportDatabaseJSON}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center shadow text-sm"
                >
                <Download className="mr-2" size={16} /> Descargar DB
                </button>
            </div>

            <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                <div className="text-amber-800 text-sm mb-3 font-bold flex items-center">
                   <Upload className="mr-2" size={16} /> 2. Restaurar (Importar)
                </div>
                <p className="text-xs text-amber-600 mb-3">Carga el archivo JSON desde tu PC o Drive para recuperar tus datos.</p>
                <input 
                    type="file" 
                    accept=".json" 
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleImport}
                />
                <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors flex items-center justify-center shadow text-sm"
                >
                <Upload className="mr-2" size={16} /> Cargar DB
                </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Settings;
