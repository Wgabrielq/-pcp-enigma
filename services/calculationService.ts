
import { Material, ProductRecipe, OrderUnit, CalculationResult } from '../types';
import { getConfig } from './dataService';

/**
 * Calcula el peso de una bobina teórica basada en dimensiones y material.
 * Fórmula: (Ancho(m) * Largo(m) * Espesor(mic) * Densidad) / 1000 = Kg
 */
export const calculateWebWeight = (
  widthMm: number,
  lengthMeters: number,
  material: Material
): number => {
  const widthM = widthMm / 1000;
  return (widthM * lengthMeters * material.thickness * material.density) / 1000;
};

/**
 * Motor de Cálculo de Producción
 */
export const calculateProductionRequirements = (
  quantity: number,
  tolerancePercent: number,
  unit: OrderUnit,
  product: ProductRecipe,
  materials: Material[]
): CalculationResult => {
  
  // Obtener configuración actual del sistema
  const config = getConfig();

  // Usar merma específica del producto si existe, sino la global
  const usedVariableScrapPercent = product.specificScrapPercent !== undefined 
    ? product.specificScrapPercent 
    : config.variableScrapPercent;

  // Validar pistas para evitar división por cero
  const tracks = product.tracks > 0 ? product.tracks : 1;

  // 1. Normalizar a Metros Lineales (Netos de Máquina)
  let requiredLinearMeters = 0;

  if (unit === OrderUnit.METERS) {
    // CORRECCIÓN: Si el pedido es en Metros Finales, se divide por el número de pistas.
    // Ejemplo: Pedido 5000m / 2 Pistas = 2500m lineales de producción.
    requiredLinearMeters = quantity / tracks;

  } else if (unit === OrderUnit.UNITS) {
    
    if (product.format === 'BOLSA') {
        // LÓGICA ESPECÍFICA BOLSA:
        // La variable 'cutoff' contiene el 'Ancho Bolsa / Paso'.
        // Fórmula: (Unidades * Paso) / Pistas / 1000
        requiredLinearMeters = (quantity * product.cutoff) / (tracks * 1000);
    } else {
        // LÓGICA BOBINA:
        // Fórmula: (Unidades * Paso) / Pistas / 1000
        requiredLinearMeters = (quantity * product.cutoff) / (tracks * 1000);
    }

  } else if (unit === OrderUnit.KILOS) {
    // Cálculo inverso complejo
    const m1 = materials.find(m => m.id === product.layer1Id);
    const m2 = materials.find(m => m.id === product.layer2Id);
    const m3 = materials.find(m => m.id === product.layer3Id);

    if (!m1) throw new Error("Material Capa 1 no encontrado");

    let weightPerMeter = calculateWebWeight(product.webWidth, 1, m1);
    if (m2) weightPerMeter += calculateWebWeight(product.webWidth, 1, m2);
    if (m3) weightPerMeter += calculateWebWeight(product.webWidth, 1, m3);
    
    // Sumar adhesivo y tinta
    const widthM = product.webWidth / 1000;
    const inkWeight = (widthM * 1 * product.inkCoverage) / 1000; 
    
    // Adhesivo: se aplica entre capas. 
    // Si hay 2 capas -> 1 capa adhesivo. Si hay 3 capas -> 2 capas adhesivo.
    let layersCount = 1;
    if (m2) layersCount++;
    if (m3) layersCount++;
    
    const adhesiveWeight = (layersCount > 1) 
      ? ((layersCount - 1) * (widthM * 1 * product.adhesiveCoverage) / 1000)
      : 0;

    const totalKgPerMeter = weightPerMeter + inkWeight + adhesiveWeight;
    
    requiredLinearMeters = quantity / totalKgPerMeter;
  }

  // 2. Calcular Merma y Metros Brutos
  const variableScrap = requiredLinearMeters * usedVariableScrapPercent;
  const scrapMeters = config.fixedStartupMeters + variableScrap;
  const grossLinearMeters = requiredLinearMeters + scrapMeters;

  // 3. Calcular Maximo con Tolerancia
  // Tolerancia se aplica sobre la cantidad PEDIDA neta (en metros lineales equivalentes)
  const toleranceMeters = requiredLinearMeters * (tolerancePercent / 100);
  const maxLinearMetersWithTolerance = grossLinearMeters + toleranceMeters;

  // 4. Explosión de Materiales (Base Gross Meters)
  // Nota: Se usa el Ancho de Bobina (webWidth) para el cálculo de peso.
  const m1 = materials.find(m => m.id === product.layer1Id);
  const m2 = materials.find(m => m.id === product.layer2Id);
  const m3 = materials.find(m => m.id === product.layer3Id);

  const layer1Kg = m1 ? calculateWebWeight(product.webWidth, grossLinearMeters, m1) : 0;
  const layer2Kg = m2 ? calculateWebWeight(product.webWidth, grossLinearMeters, m2) : 0;
  const layer3Kg = m3 ? calculateWebWeight(product.webWidth, grossLinearMeters, m3) : 0;

  // Insumos
  const totalAreaM2 = (product.webWidth / 1000) * grossLinearMeters;
  
  const inkKg = (totalAreaM2 * product.inkCoverage) / 1000;
  
  // Adhesivo aplica si hay laminación. 
  let adhesiveKg = 0;
  if (m2) adhesiveKg += (totalAreaM2 * product.adhesiveCoverage) / 1000;
  if (m3) adhesiveKg += (totalAreaM2 * product.adhesiveCoverage) / 1000; 

  return {
    requiredLinearMeters: Math.ceil(requiredLinearMeters),
    grossLinearMeters: Math.ceil(grossLinearMeters),
    maxLinearMetersWithTolerance: Math.ceil(maxLinearMetersWithTolerance),
    scrapMeters: Math.ceil(scrapMeters),
    layer1Kg: Number(layer1Kg.toFixed(2)),
    layer2Kg: Number(layer2Kg.toFixed(2)),
    layer3Kg: Number(layer3Kg.toFixed(2)),
    inkKg: Number(inkKg.toFixed(2)),
    adhesiveKg: Number(adhesiveKg.toFixed(2)),
    totalWeightKg: Number((layer1Kg + layer2Kg + layer3Kg + inkKg + adhesiveKg).toFixed(2))
  };
};
