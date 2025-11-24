
import React, { useState, useEffect } from 'react';
import { getOrders, reorderQueue, getProducts } from '../services/dataService';
import { ProductionOrder } from '../types';
import { GripVertical, Printer, CheckCircle2, AlertCircle, Factory, Calendar, ArrowRight, Download, Loader2 } from 'lucide-react';

const ProductionQueue: React.FC = () => {
  const [activeStage, setActiveStage] = useState('Impresión');
  const [queue, setQueue] = useState<ProductionOrder[]>([]);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);

  const stages = ['Impresión', 'Laminación', 'Trilaminado', 'Refilado', 'Confección (Bolsera)'];

  // Load and filter orders for the current stage
  useEffect(() => {
    const allOrders = getOrders();
    const stageQueue = allOrders.filter(o => 
        o.status === 'En Producción' && 
        (o.currentStage === activeStage || (!o.currentStage && activeStage === 'Impresión')) // Default to Impresión if no stage set
    );
    setQueue(stageQueue);
  }, [activeStage]);

  // --- DRAG AND DROP HANDLERS ---
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = "move";
    // Create ghost image
    const ghost = document.createElement('div');
    ghost.textContent = "Moviendo...";
    ghost.style.background = "#fff";
    ghost.style.padding = "10px";
    ghost.style.border = "1px solid #ccc";
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    setTimeout(() => document.body.removeChild(ghost), 0);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItem === null || draggedItem === index) return;

    // Reorder array locally
    const newQueue = [...queue];
    const item = newQueue[draggedItem];
    newQueue.splice(draggedItem, 1);
    newQueue.splice(index, 0, item);
    
    setQueue(newQueue);
    setDraggedItem(index);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    // Persist new order to DB (Update indices)
    // NOTE: In a real app we would update only the filtered subset's priority relative to each other
    // For this MVP, we update the whole DB list to reflect the new relative order
    reorderQueue(queue);
  };

  const handleDownloadPDF = () => {
    setIsGeneratingPdf(true);
    
    setTimeout(() => {
      const element = document.getElementById('queue-printable-area');
      if (!element) return;

      // Clone Strategy
      const cloneContainer = document.createElement('div');
      cloneContainer.style.position = 'fixed';
      cloneContainer.style.top = '0';
      cloneContainer.style.left = '0';
      cloneContainer.style.width = '100vw';
      cloneContainer.style.zIndex = '999999';
      cloneContainer.style.background = '#ffffff';
      
      const clonedContent = element.cloneNode(true) as HTMLElement;
      clonedContent.classList.remove('hidden');
      clonedContent.style.width = '100%';
      
      cloneContainer.appendChild(clonedContent);
      document.body.appendChild(cloneContainer);

      const opt = {
        margin:       10,
        filename:     `Planilla_${activeStage}_${new Date().toISOString().split('T')[0]}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
      };

      // @ts-ignore
      window.html2pdf().set(opt).from(clonedContent).save().then(() => {
         document.body.removeChild(cloneContainer);
         setIsGeneratingPdf(false);
      });
    }, 100);
  };

  return (
    <div className="h-full flex flex-col animate-fade-in">
      {/* Header & Controls */}
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
         <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center">
                <Factory className="mr-2 text-brand-600" />
                Fila de Producción
            </h2>
            <p className="text-sm text-slate-500">Organiza y prioriza las órdenes en curso</p>
         </div>
         <button 
            onClick={handleDownloadPDF}
            disabled={isGeneratingPdf}
            className="bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center hover:bg-slate-700 transition-colors"
         >
            {isGeneratingPdf ? <Loader2 size={18} className="mr-2 animate-spin"/> : <Printer size={18} className="mr-2"/>}
            Descargar Planilla (PDF)
         </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 overflow-x-auto pb-2">
        {stages.map(stage => (
            <button
                key={stage}
                onClick={() => setActiveStage(stage)}
                className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-all whitespace-nowrap
                    ${activeStage === stage 
                        ? 'bg-brand-600 text-white shadow-md' 
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
            >
                {stage}
            </button>
        ))}
      </div>

      {/* Sortable List */}
      <div className="flex-1 bg-slate-100 rounded-xl p-6 border border-slate-200 overflow-y-auto min-h-[500px]">
        {queue.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <AlertCircle size={48} className="mb-4 opacity-50"/>
                <p className="font-medium">No hay órdenes en la etapa de {activeStage}</p>
                <p className="text-sm">Ve al Dashboard y marca órdenes como "En Producción" en esta etapa.</p>
            </div>
        ) : (
            <div className="space-y-3 max-w-4xl mx-auto">
                {queue.map((order, index) => (
                    <div 
                        key={order.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`bg-white rounded-lg p-4 shadow-sm border border-slate-200 flex items-center group hover:shadow-md transition-all
                            ${draggedItem === index ? 'opacity-50 scale-95' : 'opacity-100'}`}
                    >
                        {/* Drag Handle */}
                        <div className="mr-4 cursor-grab active:cursor-grabbing text-slate-400 hover:text-brand-500">
                            <GripVertical size={24} />
                            <span className="text-xs font-bold text-center block mt-1 w-6">{index + 1}</span>
                        </div>

                        {/* Card Content */}
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                            <div className="col-span-2">
                                <div className="flex items-center mb-1">
                                    <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded mr-2">{order.orderCode}</span>
                                    <span className="text-brand-700 font-bold text-lg">{order.productName}</span>
                                </div>
                                <div className="text-sm text-slate-500 flex items-center">
                                    <span className="font-bold text-slate-700 mr-2">{order.clientName}</span>
                                </div>
                            </div>

                            <div className="flex flex-col justify-center text-sm border-l border-slate-100 pl-4">
                                <span className="text-slate-400 text-xs uppercase font-bold">Pedido</span>
                                <span className="font-bold text-slate-800 text-lg">{order.quantityRequested.toLocaleString()} {order.unit === 'Unidades' ? 'Ud' : 'Kg'}</span>
                                <span className="text-xs text-slate-500">Total: {order.calculationSnapshot.totalWeightKg.toLocaleString()} Kg</span>
                            </div>

                             <div className="flex flex-col justify-center text-sm border-l border-slate-100 pl-4">
                                <span className="text-slate-400 text-xs uppercase font-bold">Técnico</span>
                                <span className="text-slate-700 font-mono">Ancho: <strong>{order.technicalDetails.webWidth}</strong> mm</span>
                                <span className="text-slate-700 font-mono">Cilindro: <strong>{order.technicalDetails.cylinder}</strong> mm</span>
                            </div>
                        </div>

                        {/* Status Badge */}
                        <div className="ml-4 pl-4 border-l border-slate-200 text-right">
                            <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center text-xs font-bold whitespace-nowrap">
                                <CheckCircle2 size={14} className="mr-1.5" />
                                En {order.currentStage || 'Proceso'}
                            </div>
                            <div className="mt-1 text-[10px] text-slate-400 flex items-center justify-end">
                                <Calendar size={10} className="mr-1" /> {order.date}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>

      {/* --- HIDDEN PRINTABLE TEMPLATE --- */}
      <div id="queue-printable-area" className="hidden bg-white p-8">
         <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-center">
             <div>
                 <h1 className="text-3xl font-bold uppercase">PCP Multipack</h1>
                 <p className="text-lg text-gray-600">Planilla de Programación: <span className="font-bold text-black uppercase">{activeStage}</span></p>
             </div>
             <div className="text-right">
                 <p className="text-sm font-bold">Fecha Impresión:</p>
                 <p className="font-mono">{new Date().toLocaleString()}</p>
             </div>
         </div>

         <table className="w-full text-left border-collapse">
             <thead>
                 <tr className="bg-gray-100 border-y-2 border-black text-sm uppercase">
                     <th className="p-3 w-12 text-center">#</th>
                     <th className="p-3">OP</th>
                     <th className="p-3">Cliente / Producto</th>
                     <th className="p-3 text-right">Cantidad</th>
                     <th className="p-3 text-center">Ancho</th>
                     <th className="p-3 text-center">Desarrollo</th>
                     <th className="p-3 text-center">Estado</th>
                     <th className="p-3 w-32">Observaciones</th>
                 </tr>
             </thead>
             <tbody>
                 {queue.map((order, idx) => (
                     <tr key={order.id} className="border-b border-gray-300 text-sm">
                         <td className="p-3 text-center font-bold text-lg">{idx + 1}</td>
                         <td className="p-3 font-mono font-bold">{order.orderCode}</td>
                         <td className="p-3">
                             <div className="font-bold text-black text-base">{order.productName}</div>
                             <div className="text-gray-600 text-xs">{order.clientName}</div>
                         </td>
                         <td className="p-3 text-right font-bold">{order.quantityRequested.toLocaleString()} {order.unit === 'Unidades' ? 'Ud' : 'Kg'}</td>
                         <td className="p-3 text-center">{order.technicalDetails.webWidth} mm</td>
                         <td className="p-3 text-center">{order.technicalDetails.cylinder} mm</td>
                         <td className="p-3 text-center">
                            <span className="bg-gray-100 border border-gray-300 px-2 py-1 rounded text-xs font-bold uppercase">
                                {order.currentStage}
                            </span>
                         </td>
                         <td className="p-3 border-l border-gray-200"></td>
                     </tr>
                 ))}
             </tbody>
         </table>
         
         <div className="mt-8 pt-4 border-t-2 border-black flex justify-between text-xs uppercase font-bold text-gray-500">
             <div>Supervisor de Turno</div>
             <div>Firma Recibido</div>
         </div>

         <div className="mt-4 text-center">
            <p className="text-[10px] text-gray-400">Software enigma.com.uy</p>
         </div>
      </div>

    </div>
  );
};

export default ProductionQueue;
