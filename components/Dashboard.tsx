
import React, { useState, useEffect } from 'react';
import { getOrders, updateOrderStatus, deleteOrder, getMaterials, getClients, getProducts, updateOrderStage } from '../services/dataService';
import { ProductionOrder, OrderStatus } from '../types';
import { Clock, Settings as Cog, CheckCircle2, AlertCircle, Trash2, FileText, Ruler, Layers, X, Printer, ArrowRight, AlertTriangle, ScanBarcode, Factory, Download, Loader2, Phone, Mail, Box, User } from 'lucide-react';

interface OrderCardProps {
  order: ProductionOrder;
  onSelect: (order: ProductionOrder) => void;
  onStatusChange: (id: string, newStatus: OrderStatus, e: React.MouseEvent) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, onSelect, onStatusChange, onDelete }) => {
  const statusColor: Record<string, string> = {
    'Pendiente': 'border-l-4 border-l-amber-400',
    'En Producción': 'border-l-4 border-l-blue-500',
    'Terminado': 'border-l-4 border-l-emerald-500 opacity-75'
  };

  return (
    <div 
      onClick={() => onSelect(order)}
      className={`bg-white rounded-lg shadow-sm p-4 mb-4 border border-slate-200 ${statusColor[order.status] || 'border-l-4 border-l-slate-400'} hover:shadow-md hover:scale-[1.01] transition-all cursor-pointer relative`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1 pr-2">
          <span className="text-xs font-bold text-slate-400 block">{order.orderCode} | {order.date}</span>
          <h4 className="font-bold text-slate-800 text-base leading-tight mb-1">{order.clientName}</h4>
          <p className="text-sm text-slate-600 leading-snug">{order.productName}</p>
        </div>
        <div className="text-right shrink-0">
           <span className="block font-bold text-slate-800">{order.quantityRequested.toLocaleString()} {order.unit === 'Unidades' ? 'Ud' : order.unit === 'Metros' ? 'm' : 'Kg'}</span>
           <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-500">{order.technicalDetails.format}</span>
        </div>
      </div>

      {/* Current Stage Badge */}
      {order.status === 'En Producción' && order.currentStage && (
          <div className="my-2 text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-100 flex items-center">
               <Factory size={12} className="mr-1.5" />
               Etapa: {order.currentStage}
          </div>
      )}

      <div className="bg-slate-50 rounded p-2 my-3 text-xs space-y-1 border border-slate-100">
          <div className="flex items-center text-slate-600">
              <Ruler size={12} className="mr-1.5" /> 
              <span>Ancho: <strong>{order.technicalDetails.webWidth}mm</strong> | Cutoff: <strong>{order.technicalDetails.cutoff}mm</strong></span>
          </div>
          <div className="flex items-center text-slate-600">
              <Layers size={12} className="mr-1.5" />
              <span>{order.technicalDetails.layers.join(' + ')}</span>
          </div>
      </div>

      <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-100">
        <div className="text-xs text-brand-600 font-medium">
          Req: {order.calculationSnapshot.grossLinearMeters.toLocaleString()}m
        </div>
        <div className="flex space-x-1">
          {order.status === 'Pendiente' && (
            <button onClick={(e) => onStatusChange(order.id, 'En Producción', e)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded tooltip" title="Iniciar">
               <Cog size={16} />
            </button>
          )}
          {order.status === 'En Producción' && (
            <button onClick={(e) => onStatusChange(order.id, 'Terminado', e)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded tooltip" title="Finalizar">
               <CheckCircle2 size={16} />
            </button>
          )}
           <button onClick={(e) => onDelete(order.id, e)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded">
               <Trash2 size={16} />
           </button>
        </div>
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [stats, setStats] = useState({ active: 0, materials: 0, clients: 0 });
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);

  useEffect(() => {
    const allOrders = getOrders();
    setOrders(allOrders);
    setStats({
        active: allOrders.filter(o => o.status !== 'Terminado').length,
        materials: getMaterials().length,
        clients: getClients().length
    });
  }, []);

  const handleStatusChange = (id: string, newStatus: OrderStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    updateOrderStatus(id, newStatus);
    const updatedOrders = getOrders();
    setOrders(updatedOrders);
    if (selectedOrder && selectedOrder.id === id) {
        setSelectedOrder(updatedOrders.find(o => o.id === id) || null);
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if(confirm('¿Eliminar historial de orden?')) {
        deleteOrder(id);
        setOrders(getOrders());
        if (selectedOrder?.id === id) setSelectedOrder(null);
    }
  }

  const OrderDetailModal = ({ order, onClose }: { order: ProductionOrder, onClose: () => void }) => {
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [localStage, setLocalStage] = useState(order.currentStage);
    
    // Fetch Details
    const allClients = getClients();
    const allProducts = getProducts();
    const fullClient = order.clientId ? allClients.find(c => c.id === order.clientId) : null;
    const fullProduct = allProducts.find(p => p.id === order.productId);

    if (!order) return null;

    const handleStageClick = (stage: string) => {
        if (isGeneratingPdf) return;
        setLocalStage(stage);
        updateOrderStage(order.id, stage);
        // Refresh parent list to update cards
        const updatedOrders = getOrders();
        setOrders(updatedOrders);
    }

    const handleDownloadPDF = () => {
      setIsGeneratingPdf(true);
      
      setTimeout(() => {
        const originalElement = document.getElementById('printable-order-content');
        if (!originalElement) {
             setIsGeneratingPdf(false);
             return;
        }

        // --- OVERLAY STRATEGY (Fixes Blank PDF) ---
        // Create a container covering the whole screen on top of everything
        const cloneContainer = document.createElement('div');
        cloneContainer.style.position = 'fixed';
        cloneContainer.style.top = '0';
        cloneContainer.style.left = '0';
        cloneContainer.style.width = '100vw';
        cloneContainer.style.height = 'auto';
        cloneContainer.style.minHeight = '100vh';
        cloneContainer.style.zIndex = '999999'; // On Top of everything
        cloneContainer.style.background = '#ffffff';
        cloneContainer.style.display = 'flex';
        cloneContainer.style.justifyContent = 'center';
        cloneContainer.style.padding = '20px';
        
        // Clone the content
        const clonedContent = originalElement.cloneNode(true) as HTMLElement;
        
        // Reset Styles for Print
        clonedContent.style.maxHeight = 'none';
        clonedContent.style.boxShadow = 'none';
        clonedContent.style.width = '100%';
        clonedContent.style.maxWidth = '1000px'; // A4 width approx
        clonedContent.style.overflow = 'visible';
        
        cloneContainer.appendChild(clonedContent);
        document.body.appendChild(cloneContainer);

        // Scroll to top to ensure html2canvas captures from 0,0
        window.scrollTo(0,0);

        // Generate
        const opt = {
          margin:       [10, 10, 10, 10],
          filename:     `Orden_${order.orderCode}.pdf`,
          image:        { type: 'jpeg', quality: 0.98 },
          html2canvas:  { scale: 2, useCORS: true, logging: false, scrollY: 0 },
          jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak:    { mode: ['css', 'legacy'] } 
        };

        // @ts-ignore
        if (window.html2pdf) {
          // @ts-ignore
          window.html2pdf().set(opt).from(clonedContent).save().then(() => {
             document.body.removeChild(cloneContainer);
             setIsGeneratingPdf(false);
          }).catch((err: any) => {
             console.error(err);
             document.body.removeChild(cloneContainer);
             setIsGeneratingPdf(false);
             alert('Error generando PDF');
          });
        }
      }, 200);
    };

    return (
      <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in`}>
        <div 
           id="printable-order-content"
           className={`bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto relative ${isGeneratingPdf ? 'border-none p-8' : ''}`}
        >
          
          {/* --- FORMAL HEADER (Visible in PDF or during Generation) --- */}
          <div className={`justify-between items-center border-b-2 border-black pb-4 mb-6 ${isGeneratingPdf ? 'flex' : 'hidden'}`}>
            <div className="flex items-center">
               <Factory size={48} className="mr-4 text-black" />
               <div>
                 <h1 className="text-3xl font-bold uppercase tracking-wide text-black">PCP</h1>
                 <p className="text-base font-medium text-gray-600">Orden de Producción / Hoja de Ruta</p>
               </div>
            </div>
            <div className="text-right text-black">
               <div className="text-4xl font-bold font-mono mb-1">{order.orderCode}</div>
               <div className="text-sm font-medium">Fecha: {order.date}</div>
               <div className="flex items-center justify-end mt-2">
                  <ScanBarcode size={24} className="mr-1"/>
                  <span className="text-xs tracking-[0.2em]">||| |||| || |||||</span>
               </div>
            </div>
          </div>

          {/* --- SCREEN HEADER (MODAL MODE) --- */}
          <div className={`bg-slate-900 text-white p-6 flex justify-between items-start sticky top-0 z-10 ${isGeneratingPdf ? 'hidden' : 'flex'}`}>
            <div>
              <div className="flex items-center space-x-3">
                <h2 className="text-2xl font-bold">{order.orderCode}</h2>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                  ${order.status === 'Pendiente' ? 'bg-amber-400 text-amber-900' : 
                    order.status === 'En Producción' ? 'bg-blue-500 text-white' : 
                    'bg-emerald-500 text-white'}`}>
                  {order.status}
                </span>
              </div>
              <p className="text-slate-400 mt-1 font-medium">{order.productName}</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1 bg-slate-800 rounded hover:bg-slate-700 transition-colors">
              <X size={24} />
            </button>
          </div>

          <div className={`p-6 space-y-6 ${isGeneratingPdf ? 'text-black' : ''}`}>
            
            {/* INFO GRID - CLIENT & PRODUCT DETAILS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 avoid-break">
               
               {/* CLIENTE */}
               <div className={`bg-slate-50 p-5 rounded-lg border border-slate-200 ${isGeneratingPdf ? 'bg-white border-2 border-black' : ''}`}>
                 <div className="flex items-center mb-3 border-b border-slate-200 pb-2">
                    <User size={18} className="mr-2 text-slate-500" />
                    <h3 className="text-sm font-bold uppercase text-slate-500">Datos del Cliente</h3>
                 </div>
                 
                 <div className="space-y-2">
                    <div>
                        <p className="text-xl font-bold text-slate-900 leading-tight">{order.clientName}</p>
                        <p className="text-xs text-slate-500">ID: {order.clientId}</p>
                    </div>
                    
                    {fullClient ? (
                        <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                            <div className="flex items-center text-slate-700"><User size={14} className="mr-1.5 text-slate-400"/> {fullClient.contact}</div>
                            <div className="flex items-center text-slate-700"><Phone size={14} className="mr-1.5 text-slate-400"/> {fullClient.phone || 'N/A'}</div>
                            <div className="col-span-2 flex items-center text-slate-700"><Mail size={14} className="mr-1.5 text-slate-400"/> {fullClient.email || 'N/A'}</div>
                        </div>
                    ) : (
                        <p className="text-sm text-slate-400 italic">Información detallada no disponible</p>
                    )}
                 </div>
               </div>

               {/* PRODUCTO */}
               <div className={`bg-slate-50 p-5 rounded-lg border border-slate-200 ${isGeneratingPdf ? 'bg-white border-2 border-black' : ''}`}>
                 <div className="flex items-center mb-3 border-b border-slate-200 pb-2">
                    <Box size={18} className="mr-2 text-slate-500" />
                    <h3 className="text-sm font-bold uppercase text-slate-500">Ficha Técnica</h3>
                 </div>

                 <div className="space-y-2">
                    <div>
                        <p className="text-xl font-bold text-slate-900 leading-tight">{order.productName}</p>
                        <p className="text-sm font-mono font-bold text-brand-700 mt-1">SKU: {fullProduct?.sku || 'N/A'}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                         <div className="bg-white px-2 py-1 rounded border border-slate-100">
                            <span className="text-xs text-slate-400 block">Formato</span>
                            <span className="font-bold text-slate-800">{order.technicalDetails.format}</span>
                         </div>
                         <div className="bg-white px-2 py-1 rounded border border-slate-100">
                            <span className="text-xs text-slate-400 block">Pedido</span>
                            <span className="font-bold text-slate-800">{order.quantityRequested} {order.unit}</span>
                         </div>
                         <div className="col-span-2 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 text-center">
                             <span className="text-xs text-emerald-600 block font-bold uppercase">Peso Total Estimado</span>
                             <span className="font-bold text-lg text-emerald-800">{order.calculationSnapshot.totalWeightKg.toLocaleString()} Kg</span>
                         </div>
                    </div>
                 </div>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 avoid-break">
               {/* Technical Specs */}
               <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase border-b-2 border-slate-200 pb-2 mb-4 flex items-center">
                    <Cog size={16} className="mr-2" /> Especificaciones de Máquina
                  </h3>
                  <div className="space-y-2 text-sm">
                     <div className="flex justify-between border-b border-slate-100 pb-1">
                        <span className="text-slate-500 font-medium">Pistas / Montaje</span>
                        <span className="font-bold text-slate-800">{order.technicalDetails.tracks}</span>
                     </div>
                     <div className="flex justify-between border-b border-slate-100 pb-1">
                        <span className="text-slate-500 font-medium">Desarrollo (Cilindro)</span>
                        <span className="font-bold text-slate-800">{order.technicalDetails.cylinder} mm</span>
                     </div>
                     <div className="flex justify-between border-b border-slate-100 pb-1">
                        <span className="text-slate-500 font-medium">Paso (Cutoff)</span>
                        <span className="font-bold text-slate-800">{order.technicalDetails.cutoff} mm</span>
                     </div>
                     <div className="flex justify-between border-b border-slate-100 pb-1">
                        <span className="text-slate-500 font-medium">Ancho Bobina Impresión</span>
                        <span className="font-bold text-brand-600 text-black text-lg">{order.technicalDetails.webWidth} mm</span>
                     </div>
                     {order.technicalDetails.windingDirection && (
                       <div className="flex justify-between border-b border-slate-100 pb-1">
                          <span className="text-slate-500 font-medium">Sentido Bobinado</span>
                          <span className="font-bold text-slate-800">{order.technicalDetails.windingDirection}</span>
                       </div>
                     )}
                  </div>
               </div>

               {/* Workflow */}
               <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase border-b-2 border-slate-200 pb-2 mb-4 flex items-center">
                    <Clock size={16} className="mr-2" /> Ruta de Proceso
                    <span className={`ml-2 text-xs font-normal lowercase text-slate-400 ${isGeneratingPdf ? 'hidden' : 'inline'}`}>(Click para marcar etapa)</span>
                  </h3>
                  <div className="space-y-2">
                     {order.requiredStages.map((stage, idx) => (
                        <div 
                            key={idx} 
                            onClick={() => handleStageClick(stage)}
                            className={`flex items-center justify-between p-3 rounded cursor-pointer transition-all ${
                                localStage === stage 
                                ? 'bg-brand-600 text-white shadow-md transform scale-[1.02]' 
                                : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                            } ${isGeneratingPdf ? 'bg-white border border-black py-2 mb-2 text-black' : ''}`}
                        >
                           <div className="flex items-center">
                               <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 
                                   ${isGeneratingPdf ? 'bg-black text-white border border-black' : 
                                     localStage === stage ? 'bg-white text-brand-600' : 'bg-brand-100 text-brand-600'}`}>
                                 {idx + 1}
                               </div>
                               <span className={`font-bold uppercase text-xs ${localStage === stage ? 'text-white' : 'text-slate-700'} ${isGeneratingPdf ? 'text-black' : ''}`}>{stage}</span>
                           </div>
                           {isGeneratingPdf && <div className="h-4 w-4 border border-black"></div>}
                           {localStage === stage && !isGeneratingPdf && <CheckCircle2 size={16} className="text-white"/>}
                        </div>
                     ))}
                  </div>
               </div>
            </div>

            {/* Material Requisition Table */}
            <div className="avoid-break">
               <h3 className="text-sm font-bold text-slate-900 uppercase border-b-2 border-slate-200 pb-2 mb-4 flex items-center">
                 <Layers size={16} className="mr-2" /> Lista de Materiales (Picking List)
               </h3>
               
               {order.materialRequirements && order.materialRequirements.length > 0 ? (
                 <div className={`border rounded-lg overflow-hidden ${isGeneratingPdf ? 'border-2 border-black' : 'border-slate-200'}`}>
                    <table className="w-full text-left text-sm">
                      <thead className={`bg-slate-100 text-slate-600 uppercase text-xs ${isGeneratingPdf ? 'bg-gray-100 text-black border-b-2 border-black' : ''}`}>
                        <tr>
                           <th className="px-4 py-2">Uso</th>
                           <th className="px-4 py-2">Código</th>
                           <th className="px-4 py-2">Descripción Material</th>
                           <th className="px-4 py-2 text-center">Ancho</th>
                           <th className="px-4 py-2 text-right">Cantidad</th>
                           {isGeneratingPdf && <th className="px-4 py-2 text-center w-16">OK</th>}
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isGeneratingPdf ? 'divide-black' : 'divide-slate-100'}`}>
                         {order.materialRequirements.map((req, idx) => {
                             const isSub = req.isSubstitute;
                             return (
                               <tr key={idx} className={isSub ? (isGeneratingPdf ? 'bg-white' : 'bg-amber-50') : ''}>
                                  <td className="px-4 py-2 font-bold text-slate-700">
                                      {req.layer}
                                      {isSub && <span className={`ml-2 text-[10px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded uppercase ${isGeneratingPdf ? 'border border-black bg-white text-black' : ''}`}>Sustituto</span>}
                                  </td>
                                  <td className="px-4 py-2 font-mono text-brand-600 font-bold text-black">{req.internalCode}</td>
                                  <td className="px-4 py-2">{req.materialName}</td>
                                  <td className="px-4 py-2 text-center font-bold">{req.width} mm</td>
                                  <td className="px-4 py-2 text-right font-bold">{req.requiredKg.toLocaleString()} Kg</td>
                                  {isGeneratingPdf && <td className="border-l border-black"></td>}
                               </tr>
                             )
                         })}
                         <tr className={`bg-slate-50 ${isGeneratingPdf ? 'bg-white border-t-2 border-black' : ''}`}>
                            <td colSpan={4} className="px-4 py-2 text-right font-bold text-slate-500 uppercase text-xs text-black">Total Sustratos</td>
                            <td className="px-4 py-2 text-right font-bold">{(order.calculationSnapshot.layer1Kg + order.calculationSnapshot.layer2Kg + order.calculationSnapshot.layer3Kg).toLocaleString()} Kg</td>
                            {isGeneratingPdf && <td></td>}
                         </tr>
                         <tr>
                            <td colSpan={4} className="px-4 py-2 text-right font-bold text-slate-500 uppercase text-xs text-black">Insumos (Tinta/Adh)</td>
                            <td className="px-4 py-2 text-right font-medium">{(order.calculationSnapshot.inkKg + order.calculationSnapshot.adhesiveKg).toLocaleString()} Kg</td>
                            {isGeneratingPdf && <td></td>}
                         </tr>
                      </tbody>
                    </table>
                 </div>
               ) : (
                 <div className="bg-amber-50 p-4 text-amber-800 rounded-lg text-sm">
                    <p>Datos detallados no disponibles para esta orden histórica.</p>
                 </div>
               )}
            </div>

            {/* --- PROCESS CONTROL CHECKLISTS (VISIBLE IN PDF) --- */}
            <div className={`mt-6 pt-4 border-t-2 border-black ${isGeneratingPdf ? 'block' : 'hidden'}`}>
                <h3 className="text-lg font-bold uppercase mb-6 text-center border-b border-black pb-2">Control de Calidad en Planta</h3>
                
                <div className="grid grid-cols-1 gap-6">
                    {/* IMPRESION */}
                    <div className="border-2 border-black p-4 avoid-break mb-4">
                        <h4 className="font-bold uppercase bg-gray-100 border-b border-black p-2 text-sm mb-3">1. Impresión (Prensa)</h4>
                        <div className="space-y-4 text-xs">
                            <div className="flex justify-between items-end"><span className="w-32 font-bold">Operador / Turno:</span> <div className="border-b border-black flex-1 h-4"></div></div>
                            <div className="flex justify-between items-end"><span className="w-32 font-bold">Viscosidad Inicial:</span> <div className="border-b border-black flex-1 h-4"></div> <span className="w-32 font-bold ml-4">Velocidad (m/min):</span> <div className="border-b border-black flex-1 h-4"></div></div>
                            
                            <div className="grid grid-cols-4 gap-4 mt-4">
                                <div className="flex items-center"><div className="w-5 h-5 border border-black mr-2"></div> Registro Color</div>
                                <div className="flex items-center"><div className="w-5 h-5 border border-black mr-2"></div> Tono vs Muestra</div>
                                <div className="flex items-center"><div className="w-5 h-5 border border-black mr-2"></div> Adherencia (Test)</div>
                                <div className="flex items-center"><div className="w-5 h-5 border border-black mr-2"></div> Limpieza</div>
                            </div>
                            <div className="border border-dashed border-gray-400 p-2 mt-2 h-16 text-gray-500">Observaciones...</div>
                        </div>
                    </div>

                    {/* LAMINACION */}
                    {order.technicalDetails.layers.length > 1 && (
                    <div className="border-2 border-black p-4 avoid-break mb-4">
                        <h4 className="font-bold uppercase bg-gray-100 border-b border-black p-2 text-sm mb-3">2. Laminación / Solvente</h4>
                        <div className="space-y-4 text-xs">
                            <div className="flex justify-between items-end"><span className="w-32 font-bold">Operador:</span> <div className="border-b border-black flex-1 h-4"></div></div>
                            <div className="flex justify-between items-end"><span className="w-32 font-bold">Gramaje (g/m²):</span> <div className="border-b border-black flex-1 h-4"></div> <span className="w-32 font-bold ml-4">Temperatura de Calandras:</span> <div className="border-b border-black flex-1 h-4"></div></div>
                            
                            <div className="grid grid-cols-4 gap-4 mt-4">
                                <div className="flex items-center"><div className="w-5 h-5 border border-black mr-2"></div> Apariencia</div>
                                <div className="flex items-center"><div className="w-5 h-5 border border-black mr-2"></div> Ancho Adhesivo</div>
                                <div className="flex items-center"><div className="w-5 h-5 border border-black mr-2"></div> Tensiones</div>
                                <div className="flex items-center"><div className="w-5 h-5 border border-black mr-2"></div> Sin Burbujas</div>
                            </div>
                        </div>
                    </div>
                    )}

                     {/* CORTE / CONFECCION */}
                    <div className="border-2 border-black p-4 avoid-break mb-4">
                        <h4 className="font-bold uppercase bg-gray-100 border-b border-black p-2 text-sm mb-3">3. {order.technicalDetails.format === 'BOLSA' ? 'Bolsera (Confección)' : 'Refilado (Corte)'}</h4>
                        <div className="space-y-4 text-xs">
                            <div className="flex justify-between items-end"><span className="w-32 font-bold">Operador:</span> <div className="border-b border-black flex-1 h-4"></div></div>
                            <div className="flex justify-between items-end"><span className="w-32 font-bold">Cajas/Bobinas:</span> <div className="border-b border-black flex-1 h-4"></div> <span className="w-32 font-bold ml-4">Cant. Rechazada:</span> <div className="border-b border-black flex-1 h-4"></div></div>
                            
                            <div className="grid grid-cols-4 gap-4 mt-4">
                                <div className="flex items-center"><div className="w-5 h-5 border border-black mr-2"></div> Medidas OK</div>
                                <div className="flex items-center"><div className="w-5 h-5 border border-black mr-2"></div> {order.technicalDetails.format === 'BOLSA' ? 'Resistencia de sellos' : 'Corte Limpio'}</div>
                                <div className="flex items-center"><div className="w-5 h-5 border border-black mr-2"></div> Aspecto visual</div>
                                <div className="flex items-center"><div className="w-5 h-5 border border-black mr-2"></div> Embalaje</div>
                            </div>
                        </div>
                    </div>
                    
                    {/* CALIDAD FINAL */}
                    <div className="border-2 border-black p-4 bg-gray-50 avoid-break flex justify-between items-center">
                        <div className="w-2/3">
                            <h4 className="font-bold uppercase mb-2 text-sm">Liberación Final de Calidad</h4>
                            <div className="text-xs text-gray-600">Certifico que este lote cumple con las especificaciones de la ficha técnica.</div>
                        </div>
                        <div className="w-1/3 border-l-2 border-black pl-4 text-center">
                             <div className="h-16 border-b border-black mb-1"></div>
                             <div className="text-[10px] uppercase font-bold">Firma Supervisor / Calidad</div>
                        </div>
                    </div>
                </div>
            </div>

          </div>
          
          {/* --- FOOTER ACTIONS (HIDDEN IN PDF MODE) --- */}
          <div className={`bg-slate-50 p-4 border-t border-slate-200 flex justify-end space-x-3 ${isGeneratingPdf ? 'hidden' : 'flex'}`}>
             <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium">Cerrar</button>
             <button 
                type="button" 
                onClick={handleDownloadPDF} 
                disabled={isGeneratingPdf}
                className="px-4 py-2 bg-brand-600 text-white hover:bg-brand-700 rounded-lg font-medium flex items-center shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
             >
                {isGeneratingPdf ? (
                    <><Loader2 size={18} className="mr-2 animate-spin" /> Generando PDF...</>
                ) : (
                    <><Download size={18} className="mr-2" /> Guardar Hoja de Ruta (PDF)</>
                )}
             </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="animate-fade-in space-y-6">
       {/* Stats */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
            <div>
                <p className="text-sm text-slate-500">Órdenes Activas</p>
                <p className="text-2xl font-bold text-brand-600">{stats.active}</p>
            </div>
            <div className="bg-brand-50 p-2 rounded-full"><Clock className="text-brand-500" /></div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
            <div>
                <p className="text-sm text-slate-500">Materiales</p>
                <p className="text-2xl font-bold text-slate-800">{stats.materials}</p>
            </div>
             <div className="bg-slate-50 p-2 rounded-full"><Layers className="text-slate-500" /></div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
            <div>
                <p className="text-sm text-slate-500">Clientes</p>
                <p className="text-2xl font-bold text-slate-800">{stats.clients}</p>
            </div>
             <div className="bg-slate-50 p-2 rounded-full"><FileText className="text-slate-500" /></div>
        </div>
       </div>

       {/* Kanban Board */}
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
         
         {/* Column: Pending */}
         <div className="bg-slate-100 rounded-xl p-4 h-min min-h-[500px]">
            <h3 className="font-bold text-slate-600 mb-4 flex items-center">
                <AlertCircle size={18} className="mr-2" /> Pendientes
                <span className="ml-2 bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs">{orders.filter(o => o.status === 'Pendiente').length}</span>
            </h3>
            {orders.filter(o => o.status === 'Pendiente').length === 0 && <p className="text-sm text-slate-400 text-center mt-10">No hay órdenes pendientes</p>}
            {orders.filter(o => o.status === 'Pendiente').map(order => (
                <OrderCard 
                    key={order.id} 
                    order={order} 
                    onSelect={setSelectedOrder}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDelete}
                />
            ))}
         </div>

         {/* Column: In Progress */}
         <div className="bg-blue-50 rounded-xl p-4 h-min min-h-[500px]">
            <h3 className="font-bold text-blue-800 mb-4 flex items-center">
                <Cog size={18} className="mr-2" /> En Producción
                 <span className="ml-2 bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full text-xs">{orders.filter(o => o.status === 'En Producción').length}</span>
            </h3>
            {orders.filter(o => o.status === 'En Producción').length === 0 && <p className="text-sm text-blue-300 text-center mt-10">Máquinas detenidas</p>}
            {orders.filter(o => o.status === 'En Producción').map(order => (
                <OrderCard 
                    key={order.id} 
                    order={order} 
                    onSelect={setSelectedOrder}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDelete}
                />
            ))}
         </div>

         {/* Column: Finished */}
         <div className="bg-emerald-50 rounded-xl p-4 h-min min-h-[500px]">
            <h3 className="font-bold text-emerald-800 mb-4 flex items-center">
                <CheckCircle2 size={18} className="mr-2" /> Historial Reciente
            </h3>
             {orders.filter(o => o.status === 'Terminado').length === 0 && <p className="text-sm text-emerald-300 text-center mt-10">Sin historial</p>}
             {orders.filter(o => o.status === 'Terminado').slice(0, 5).map(order => (
                <OrderCard 
                    key={order.id} 
                    order={order} 
                    onSelect={setSelectedOrder}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDelete}
                />
            ))}
            {orders.filter(o => o.status === 'Terminado').length > 5 && (
                <div className="text-center mt-4">
                    <p className="text-xs text-emerald-600 italic">Mostrando 5 más recientes</p>
                </div>
            )}
         </div>
       </div>

       {/* Modal */}
       {selectedOrder && (
         <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
       )}
    </div>
  );
};

export default Dashboard;
