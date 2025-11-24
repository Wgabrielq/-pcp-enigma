
import React, { useState, useMemo } from 'react';
import { getClients, getMaterials, getProducts, deductStock, getConfig, saveOrder, getOrders } from '../services/dataService';
import { calculateProductionRequirements } from '../services/calculationService';
import { OrderUnit, CalculationResult, Material, ProductionOrder, MaterialRequirementSnapshot } from '../types';
import { Printer, Layers, Droplets, Scissors, AlertTriangle, CheckCircle, ArrowRight, ArrowUpRight, FileCheck, Lightbulb, AlertOctagon, CheckSquare } from 'lucide-react';

const ProductionCalculator: React.FC = () => {
  // Data State
  const clients = getClients();
  const products = getProducts();
  const materials = getMaterials(); // Inventario Completo

  // Form State
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(0);
  const [tolerance, setTolerance] = useState<number>(10); // Default 10%
  const [unit, setUnit] = useState<OrderUnit>(OrderUnit.UNITS);
  const [orderSuccess, setOrderSuccess] = useState<{success: boolean, code?: string}>({success: false});

  // Substitute Selection State: { layerId: selectedSubstituteMaterialId }
  const [selectedSubstitutes, setSelectedSubstitutes] = useState<Record<string, string>>({});

  // Derived State
  const filteredProducts = useMemo(() => 
    products.filter(p => p.clientId === selectedClientId), 
  [selectedClientId, products]);

  const selectedProduct = useMemo(() => 
    products.find(p => p.id === selectedProductId), 
  [selectedProductId, products]);

  // Clear substitutes when product changes
  useMemo(() => {
    setSelectedSubstitutes({});
  }, [selectedProductId]);

  // --- SMART ALLOCATION LOGIC ---
  interface MaterialSuggestion {
    material: Material;
    type: 'EXACT' | 'WIDER' | 'SLIT_MULTIPLE'; // SLIT_MULTIPLE = Refilar
    message: string;
    scrapImpactPercent: number;
  }

  const findSubstitutes = (originalMatId: string, requiredWidth: number, requiredKg: number): { bestOption: MaterialSuggestion | null, alternatives: MaterialSuggestion[] } => {
    const originalMat = materials.find(m => m.id === originalMatId);
    if (!originalMat) return { bestOption: null, alternatives: [] };

    // 1. Check Original
    if (originalMat.currentStockKg >= requiredKg) {
      return {
        bestOption: { material: originalMat, type: 'EXACT', message: 'Stock OK', scrapImpactPercent: 0 },
        alternatives: []
      };
    }

    // 2. Find Substitutes (Strict Filter: Same Type, Same Thickness)
    const candidates = materials.filter(m => 
      m.id !== originalMatId &&
      m.type === originalMat.type &&
      m.thickness === originalMat.thickness &&
      m.currentStockKg > 0 &&
      m.width >= requiredWidth // IMPORTANT: Must be same width or wider. Never narrower.
    );

    const suggestions: MaterialSuggestion[] = [];

    candidates.forEach(cand => {
      // Heuristic: If original name contains specific keywords like "Mate", "Blanco", "Metal", candidate should likely match
      const keywords = ['mate', 'blanco', 'metal', 'perl', 'trans'];
      const originalNameLower = originalMat.name.toLowerCase();
      const candNameLower = cand.name.toLowerCase();
      
      const keywordsMatch = keywords.every(k => {
        if (originalNameLower.includes(k)) return candNameLower.includes(k);
        return true;
      });

      if (!keywordsMatch) return; // Skip if characteristics don't match roughly

      // Case A: Slitting (Refilar) - Candidate is approx 2x or 3x the width
      const ratio = cand.width / requiredWidth;
      if (cand.width >= requiredWidth && Math.floor(ratio) >= 2) {
        const tracksPossible = Math.floor(cand.width / requiredWidth);
        const usedWidth = tracksPossible * requiredWidth;
        const wasteWidth = cand.width - usedWidth;
        const wastePercent = wasteWidth / cand.width;
        
        suggestions.push({
          material: cand,
          type: 'SLIT_MULTIPLE',
          message: `REFILAR: Bobina de ${cand.width}mm. Salen ${tracksPossible} tiras.`,
          scrapImpactPercent: wastePercent
        });
      }
      // Case B: Wider but Single Track
      else if (cand.width >= requiredWidth) {
        const wasteWidth = cand.width - requiredWidth;
        const wastePercent = wasteWidth / cand.width;
        
        suggestions.push({
          material: cand,
          type: 'WIDER',
          message: wasteWidth === 0 
            ? `ANCHO EXACTO: Bobina alternativa de ${cand.width}mm.` 
            : `MAYOR ANCHO: ${cand.width}mm (+${wasteWidth}mm desperdicio).`,
          scrapImpactPercent: wastePercent
        });
      }
    });

    // Sort: First by low scrap impact (Refilable or Exact width first)
    suggestions.sort((a, b) => a.scrapImpactPercent - b.scrapImpactPercent);

    return {
      bestOption: null,
      alternatives: suggestions
    };
  };

  // Calculation Logic
  let results: CalculationResult | null = null;
  let error: string | null = null;
  
  // Analysis State
  let materialAnalysis = {
    layer1: { stockOk: true, missingKg: 0, substitutes: [] as MaterialSuggestion[] },
    layer2: { stockOk: true, missingKg: 0, substitutes: [] as MaterialSuggestion[] },
    layer3: { stockOk: true, missingKg: 0, substitutes: [] as MaterialSuggestion[] }
  };

  if (selectedProduct && quantity > 0) {
    try {
      results = calculateProductionRequirements(quantity, tolerance, unit, selectedProduct, materials);
      
      // Analyze Layer 1
      const m1 = materials.find(m => m.id === selectedProduct.layer1Id);
      if (m1 && m1.currentStockKg < results.layer1Kg) {
        // Find substitutes using Printing Web Width (minimum required)
        const subs = findSubstitutes(m1.id, selectedProduct.webWidth, results.layer1Kg);
        materialAnalysis.layer1 = { stockOk: false, missingKg: results.layer1Kg - m1.currentStockKg, substitutes: subs.alternatives };
      }

      // Analyze Layer 2
      if (selectedProduct.layer2Id) {
        const m2 = materials.find(m => m.id === selectedProduct.layer2Id);
        if (m2 && m2.currentStockKg < results.layer2Kg) {
          const subs = findSubstitutes(m2.id, selectedProduct.webWidth, results.layer2Kg);
          materialAnalysis.layer2 = { stockOk: false, missingKg: results.layer2Kg - m2.currentStockKg, substitutes: subs.alternatives };
        }
      }

      // Analyze Layer 3
      if (selectedProduct.layer3Id) {
        const m3 = materials.find(m => m.id === selectedProduct.layer3Id);
        if (m3 && m3.currentStockKg < results.layer3Kg) {
          const subs = findSubstitutes(m3.id, selectedProduct.webWidth, results.layer3Kg);
          materialAnalysis.layer3 = { stockOk: false, missingKg: results.layer3Kg - m3.currentStockKg, substitutes: subs.alternatives };
        }
      }

    } catch (err: any) {
      error = err.message;
    }
  }

  const handleConfirmOrder = () => {
    if (!results || !selectedProduct) return;
    
    // Check if stock issues exist and are not resolved by substitutes
    const layersToCheck = [
      { key: 'layer1', id: selectedProduct.layer1Id, kg: results.layer1Kg },
      { key: 'layer2', id: selectedProduct.layer2Id, kg: results.layer2Kg },
      { key: 'layer3', id: selectedProduct.layer3Id, kg: results.layer3Kg }
    ];

    let negativeStockWarning = false;

    // Logic check
    layersToCheck.forEach(l => {
        if (!l.id) return;
        const mat = materials.find(m => m.id === l.id);
        if (!mat) return;
        
        const subId = selectedSubstitutes[l.key];
        const substitute = materials.find(m => m.id === subId);

        if (mat.currentStockKg < l.kg) {
           if (!substitute) {
               negativeStockWarning = true; // No substitute selected
           } else {
               // Check if substitute has enough for the balance
               const balance = l.kg - mat.currentStockKg;
               if (substitute.currentStockKg < balance) negativeStockWarning = true;
           }
        }
    });

    if (negativeStockWarning) {
      if (!confirm("ADVERTENCIA: Aún con sustitutos (o sin ellos), el inventario quedará en NEGATIVO.\n\n¿Desea proceder?")) {
        return;
      }
    }

    const materialRequirements: MaterialRequirementSnapshot[] = [];
    const materialNames: string[] = [];

    // Helper to process each layer
    const processLayer = (layerKey: string, matId: string | undefined, reqKg: number, layerLabel: string) => {
        if (!matId || reqKg <= 0) return;
        const mat = materials.find(m => m.id === matId);
        if (!mat) return;

        const subId = selectedSubstitutes[layerKey];
        const subMat = materials.find(m => m.id === subId);

        materialNames.push(mat.name);

        // Logic: Use all original, then substitute
        if (mat.currentStockKg < reqKg && subMat) {
             const originalUsed = Math.max(0, mat.currentStockKg);
             const substituteUsed = reqKg - originalUsed;

             // 1. Original Entry
             if (originalUsed > 0) {
                deductStock(mat.id, originalUsed);
                materialRequirements.push({
                    layer: layerLabel,
                    materialName: mat.name,
                    internalCode: mat.internalCode,
                    width: mat.width,
                    requiredKg: Number(originalUsed.toFixed(2))
                });
             }

             // 2. Substitute Entry
             deductStock(subMat.id, substituteUsed);
             materialRequirements.push({
                layer: `${layerLabel} (COMPLEMENTO)`,
                materialName: subMat.name,
                internalCode: subMat.internalCode,
                width: subMat.width,
                requiredKg: Number(substituteUsed.toFixed(2)),
                // Custom fields for dashboard highlighting
                // @ts-ignore - adding runtime flags
                isSubstitute: true,
                originalMaterialId: mat.id
             });
        } else {
            // Standard Case (Or forced negative)
            deductStock(mat.id, reqKg);
            materialRequirements.push({
                layer: layerLabel,
                materialName: mat.name,
                internalCode: mat.internalCode,
                width: mat.width,
                requiredKg: Number(reqKg.toFixed(2))
            });
        }
    };

    processLayer('layer1', selectedProduct.layer1Id, results.layer1Kg, 'Capa 1 (Imp)');
    processLayer('layer2', selectedProduct.layer2Id, results.layer2Kg, 'Capa 2 (Lam)');
    processLayer('layer3', selectedProduct.layer3Id, results.layer3Kg, 'Capa 3 (Sell)');

    // Workflow stages
    const stages: string[] = ['Impresión']; 
    if (selectedProduct.layer2Id) stages.push('Laminación');
    if (selectedProduct.layer3Id) stages.push('Trilaminado');
    stages.push('Refilado'); 
    if (selectedProduct.format === 'BOLSA') stages.push('Confección (Bolsera)');

    // Create Order
    const orderCode = `OP-${1000 + getOrders().length + 1}`;
    const newOrder: ProductionOrder = {
      id: `ord-${Date.now()}`,
      orderCode,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      clientId: selectedClientId, // Store ID for retrieval
      clientName: clients.find(c => c.id === selectedClientId)?.name || 'Desconocido',
      date: new Date().toISOString().split('T')[0],
      quantityRequested: quantity,
      unit: unit,
      tolerancePercent: tolerance,
      calculationSnapshot: results,
      technicalDetails: {
        format: selectedProduct.format,
        webWidth: selectedProduct.webWidth,
        cylinder: selectedProduct.cylinder,
        cutoff: selectedProduct.cutoff,
        tracks: selectedProduct.tracks,
        layers: materialNames,
        windingDirection: selectedProduct.windingDirection
      },
      materialRequirements: materialRequirements,
      requiredStages: stages,
      status: 'Pendiente',
      currentStage: undefined 
    };

    saveOrder(newOrder);
    setOrderSuccess({ success: true, code: orderCode });
    setTimeout(() => {
      setOrderSuccess({ success: false });
      setQuantity(0);
      setSelectedSubstitutes({});
    }, 4000);
  };

  const MaterialRow = ({ layerKey, layerName, materialId, requiredKg, analysis }: { layerKey: string, layerName: string, materialId: string, requiredKg: number, analysis: any }) => {
    const originalMat = materials.find(m => m.id === materialId);
    if (!originalMat) return null;

    const hasStockIssue = !analysis.stockOk;
    const selectedSubId = selectedSubstitutes[layerKey];
    const selectedSub = materials.find(m => m.id === selectedSubId);

    // Calculate split if substitute selected
    const originalAvailable = Math.max(0, originalMat.currentStockKg);
    const missingAmount = Math.max(0, requiredKg - originalAvailable);

    return (
      <div className={`p-4 rounded-lg border shadow-sm mb-4 transition-colors ${hasStockIssue ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
        <div className="flex justify-between items-start">
          <div className="w-full">
            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded mr-2">{layerName}</span>
                    <p className="font-bold text-slate-800">{originalMat.name}</p>
                </div>
                {selectedSub ? (
                     <span className="text-xs font-bold text-emerald-600 flex items-center"><CheckCircle size={12} className="mr-1"/> Completado con Sustituto</span>
                ) : (
                    !analysis.stockOk ? (
                        <span className="text-xs font-bold text-red-600 flex items-center"><AlertTriangle size={12} className="mr-1"/> Stock Bajo</span>
                    ) : (
                        <span className="text-xs font-bold text-emerald-600 flex items-center"><CheckCircle size={12} className="mr-1"/> Stock OK</span>
                    )
                )}
            </div>
            <p className="text-sm text-slate-500 font-mono mt-1 mb-2">
              Prov: {originalMat.supplier || 'N/A'} | {originalMat.internalCode} | {originalMat.width}mm
            </p>
            
            {/* SPLIT VISUALIZATION IF SUBSTITUTE SELECTED */}
            {selectedSub && (
                <div className="mb-3 bg-white rounded border border-slate-200 overflow-hidden">
                    <div className="flex justify-between p-2 border-b border-slate-100 bg-slate-50">
                        <span className="text-xs text-slate-500">Original ({originalMat.internalCode})</span>
                        <span className="text-xs font-bold">{originalAvailable.toLocaleString()} Kg</span>
                    </div>
                    <div className="flex justify-between p-2 bg-amber-50">
                        <span className="text-xs text-amber-800 font-bold">Sustituto ({selectedSub.internalCode})</span>
                        <span className="text-xs font-bold text-amber-800">{missingAmount.toLocaleString()} Kg</span>
                    </div>
                </div>
            )}

            {/* STOCK ALERT & SUGGESTIONS */}
            {hasStockIssue && !selectedSub && (
              <div className="mt-3 space-y-2 animate-fade-in">
                <div className="text-xs font-bold text-red-700 flex items-center">
                  <AlertOctagon size={14} className="mr-1" /> 
                  Stock Insuficiente: Faltan {analysis.missingKg.toLocaleString()} Kg
                </div>
                
                {analysis.substitutes.length > 0 ? (
                  <div className="bg-white p-3 rounded border border-amber-200 shadow-sm">
                    <p className="text-xs font-bold text-amber-600 flex items-center mb-2">
                      <Lightbulb size={14} className="mr-1"/> Recomendaciones Inteligentes (Ancho Mayor o Igual):
                    </p>
                    {analysis.substitutes.map((sub: MaterialSuggestion, idx: number) => (
                      <div key={idx} className="mb-2 pb-2 border-b border-slate-100 last:border-0 last:pb-0 flex justify-between items-center">
                        <div>
                            <p className="text-sm font-medium text-slate-800">{sub.material.name} ({sub.material.width}mm)</p>
                            <p className="text-xs text-slate-600">{sub.message}</p>
                            <p className="text-xs text-slate-500 mt-0.5 font-mono">
                            Stock Disp: {sub.material.currentStockKg} Kg | {sub.material.internalCode}
                            </p>
                        </div>
                        <button 
                            onClick={() => setSelectedSubstitutes({...selectedSubstitutes, [layerKey]: sub.material.id})}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold py-1.5 px-3 rounded border border-blue-200 transition-colors flex items-center"
                        >
                            <CheckSquare size={14} className="mr-1" />
                            Usar
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-red-500 italic">No hay sustitutos compatibles (Mismo tipo/micraje y ancho mayor/igual).</p>
                )}
              </div>
            )}

            {/* REMOVE SUBSTITUTE BUTTON */}
            {selectedSub && (
                <button 
                    onClick={() => {
                        const newSubs = {...selectedSubstitutes};
                        delete newSubs[layerKey];
                        setSelectedSubstitutes(newSubs);
                    }}
                    className="text-xs text-red-500 underline mt-1"
                >
                    Cancelar sustitución y usar original (negativo)
                </button>
            )}
          </div>
          
          <div className="text-right shrink-0 ml-4">
            <span className="block text-2xl font-bold text-slate-800">{requiredKg.toLocaleString()} <span className="text-sm font-normal text-slate-500">Kg</span></span>
          </div>
        </div>
      </div>
    );
  };

  if (orderSuccess.success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-12 text-center animate-fade-in">
        <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <FileCheck size={40} className="text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-green-800 mb-2">¡Orden {orderSuccess.code} Generada!</h2>
        <p className="text-green-700 mb-4">Se ha creado la hoja de ruta, guardado el historial y descontado el material.</p>
        <p className="text-sm text-slate-500">Ve al Dashboard para hacer seguimiento a esta orden.</p>
        <button onClick={() => setOrderSuccess({ success: false })} className="mt-6 text-green-800 underline font-bold">Volver a calcular</button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
          <Printer className="mr-2 text-brand-600" />
          Calculadora de Producción Inteligente
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Cliente</label>
            <select 
              className="w-full rounded-lg border-slate-300 border p-2.5 focus:ring-2 focus:ring-brand-500 focus:outline-none"
              value={selectedClientId}
              onChange={(e) => { setSelectedClientId(e.target.value); setSelectedProductId(''); }}
            >
              <option value="">Seleccionar...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-600 mb-1">Producto (SKU)</label>
            <select 
              className="w-full rounded-lg border-slate-300 border p-2.5 focus:ring-2 focus:ring-brand-500 focus:outline-none"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              disabled={!selectedClientId}
            >
              <option value="">Seleccionar Ficha...</option>
              {filteredProducts.map(p => <option key={p.id} value={p.id}>{p.sku} - {p.name} ({p.format})</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Cantidad Pedida</label>
            <div className="flex">
               <input 
                type="number"
                className="w-full rounded-l-lg border-slate-300 border-y border-l p-2.5 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                value={quantity || ''}
                onChange={(e) => setQuantity(Number(e.target.value))}
                placeholder="0"
              />
               <select 
                className="bg-slate-100 rounded-r-lg border-slate-300 border p-2.5 focus:outline-none text-sm"
                value={unit}
                onChange={(e) => setUnit(e.target.value as OrderUnit)}
              >
                <option value={OrderUnit.UNITS}>Ud.</option>
                <option value={OrderUnit.KILOS}>Kg</option>
                <option value={OrderUnit.METERS}>m</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Tolerancia (+)</label>
             <div className="relative">
                <input 
                  type="number"
                  className="w-full rounded-lg border-slate-300 border p-2.5 focus:ring-2 focus:ring-brand-500 focus:outline-none pr-8"
                  value={tolerance}
                  onChange={(e) => setTolerance(Number(e.target.value))}
                />
                <span className="absolute right-3 top-2.5 text-slate-400 font-bold">%</span>
             </div>
          </div>
        </div>

        {error && <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">Error: {error}</div>}
      </div>

      {results && selectedProduct && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Summary Card */}
          <div className="lg:col-span-1 space-y-6">
             <div className="bg-slate-800 text-white rounded-xl shadow-lg overflow-hidden">
                <div className="p-4 border-b border-slate-700"><h3 className="font-bold text-lg flex items-center"><Scissors className="mr-2 text-brand-400" size={20}/> Metraje a Producir</h3></div>
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-end"><span className="text-slate-400 text-sm">Metros Netos</span><span className="text-lg font-mono">{results.requiredLinearMeters.toLocaleString()} m</span></div>
                  <div className="flex justify-between items-end"><span className="text-red-300 text-sm">Merma (+{results.scrapMeters - (results.requiredLinearMeters * getConfig().variableScrapPercent) > 500 ? 'Fija+Var' : 'Est.'})</span><span className="text-lg font-mono text-red-300">+{results.scrapMeters.toLocaleString()} m</span></div>
                  <div className="pt-4 border-t border-slate-600 flex justify-between items-end"><span className="text-brand-400 font-bold">OBJETIVO</span><span className="text-3xl font-bold font-mono text-brand-400">{results.grossLinearMeters.toLocaleString()} m</span></div>
                  
                  {tolerance > 0 && (
                    <div className="bg-slate-700 p-3 rounded-lg mt-2">
                      <div className="flex justify-between items-center text-xs text-slate-300 mb-1">
                        <span>Máximo Aceptable (+{tolerance}%)</span>
                        <ArrowUpRight size={14} />
                      </div>
                      <div className="text-right font-mono font-bold text-emerald-400">
                         Hasta: {results.maxLinearMetersWithTolerance.toLocaleString()} m
                      </div>
                    </div>
                  )}
                </div>
             </div>
             
             <button 
                onClick={handleConfirmOrder}
                className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg flex justify-center items-center transition-all
                  ${(!materialAnalysis.layer1.stockOk && !selectedSubstitutes['layer1']) || 
                    (selectedProduct.layer2Id && !materialAnalysis.layer2.stockOk && !selectedSubstitutes['layer2'])
                    ? 'bg-amber-500 hover:bg-amber-600 text-white' 
                    : 'bg-brand-600 hover:bg-brand-700 text-white hover:scale-[1.02]'}`}
             >
                {(!materialAnalysis.layer1.stockOk && !selectedSubstitutes['layer1']) 
                  ? 'Forzar Producción (Stock -)' 
                  : 'Generar Orden & Descontar'} 
                <ArrowRight className="ml-2" />
             </button>
          </div>

          {/* Materials Explosion Ticket */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center"><Layers className="mr-2 text-brand-600" size={20}/> Hoja de Ruta: {selectedProduct.format}</h3>
                <div className="text-sm bg-brand-100 text-brand-800 px-3 py-1 rounded-full font-bold">Total: {results.totalWeightKg.toLocaleString()} Kg</div>
              </div>
              
              <div className="p-6">
                 <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 tracking-wider">Materiales Requeridos</h4>
                 
                 <MaterialRow 
                    layerKey="layer1"
                    layerName="CAPA 1 (Impresión)" 
                    materialId={selectedProduct.layer1Id} 
                    requiredKg={results.layer1Kg}
                    analysis={materialAnalysis.layer1} 
                  />

                 {selectedProduct.layer2Id && (
                    <MaterialRow 
                      layerKey="layer2"
                      layerName="CAPA 2 (Laminación)" 
                      materialId={selectedProduct.layer2Id} 
                      requiredKg={results.layer2Kg}
                      analysis={materialAnalysis.layer2}
                    />
                 )}

                 {selectedProduct.layer3Id && (
                    <MaterialRow 
                      layerKey="layer3"
                      layerName="CAPA 3 (Sellante)" 
                      materialId={selectedProduct.layer3Id} 
                      requiredKg={results.layer3Kg}
                      analysis={materialAnalysis.layer3}
                    />
                 )}

                 {/* Insumos */}
                 <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-2 gap-4">
                    <div className="bg-pink-50 p-3 rounded border border-pink-100">
                       <div className="flex items-center text-pink-700 font-bold text-sm mb-1"><Droplets size={14} className="mr-1"/> Tinta Estimada</div>
                       <div className="text-2xl font-bold text-pink-900">{results.inkKg} Kg</div>
                    </div>
                    <div className="bg-amber-50 p-3 rounded border border-amber-100">
                       <div className="flex items-center text-amber-700 font-bold text-sm mb-1"><Droplets size={14} className="mr-1"/> Adhesivo Total</div>
                       <div className="text-2xl font-bold text-amber-900">{results.adhesiveKg} Kg</div>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionCalculator;
