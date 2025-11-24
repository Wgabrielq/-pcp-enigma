
import { Client, Material, MaterialType, ProductRecipe, SystemConfig, ProductionOrder, OrderStatus, Supplier } from '../types';
import * as XLSX from 'xlsx';

// --- DEFAULT DATA (SEED) ---
const DEFAULT_CLIENTS: Client[] = [
  { id: 'c1', name: 'Alimentos del Valle', contact: 'Juan Pérez', email: 'juan@valle.com', phone: '+57 300 123 4567' },
  { id: 'c2', name: 'Snacks Premium S.A.', contact: 'Maria Gomez', email: 'compras@snacksp.com', phone: '+57 310 987 6543' },
];

const DEFAULT_SUPPLIERS: Supplier[] = [
  { id: 's1', name: 'Oben Holding', contact: 'Ventas Corp', origin: 'Importado' },
  { id: 's2', name: 'Sigmaplast', contact: 'Ejecutivo Cuenta', origin: 'Nacional' },
  { id: 's3', name: 'Dow Chemical', contact: 'Soporte Técnico', origin: 'Importado' },
  { id: 's4', name: 'Jindal Films', contact: '', origin: 'Importado' }
];

const DEFAULT_MATERIALS: Material[] = [
  { id: 'm1', internalCode: 'MAT-001', name: 'BOPP Transparente', supplier: 'Oben Holding', type: MaterialType.BOPP, thickness: 20, density: 0.91, width: 850, currentStockKg: 1200, costPerKg: 3.50 },
  { id: 'm2', internalCode: 'MAT-002', name: 'BOPP Mate', supplier: 'Sigmaplast', type: MaterialType.BOPP, thickness: 20, density: 0.91, width: 1000, currentStockKg: 500, costPerKg: 4.20 },
  { id: 'm3', internalCode: 'MAT-003', name: 'BOPP Metalizado', supplier: 'Oben Holding', type: MaterialType.BOPP, thickness: 20, density: 0.91, width: 850, currentStockKg: 800, costPerKg: 3.80 },
  { id: 'm4', internalCode: 'MAT-004', name: 'PEBD Transparente', supplier: 'Dow Chemical', type: MaterialType.PE, thickness: 40, density: 0.92, width: 850, currentStockKg: 2000, costPerKg: 2.90 },
  { id: 'm5', internalCode: 'MAT-005', name: 'PET Std', supplier: 'Jindal Films', type: MaterialType.PET, thickness: 12, density: 1.4, width: 1000, currentStockKg: 150, costPerKg: 3.10 },
];

const DEFAULT_PRODUCTS: ProductRecipe[] = [
  {
    id: 'p1',
    sku: 'LEN-500G',
    name: 'Lentejas 500g Tradicional',
    clientId: 'c1',
    format: 'BOLSA',
    finalReelWidth: 0,
    bagWidth: 200,
    bagHeight: 300,
    gusset: 0,
    cutoff: 300,
    webWidth: 840,
    tracks: 4,
    cylinder: 600,
    layer1Id: 'm1',
    layer2Id: 'm4',
    inkCoverage: 3.5,
    adhesiveCoverage: 1.8,
    specificScrapPercent: 0.05 
  }
];

const DEFAULT_CONFIG: SystemConfig = {
  fixedStartupMeters: 500,
  variableScrapPercent: 0.05
};

// --- LOCAL STORAGE HELPERS ---
const load = <T>(key: string, defaults: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaults;
  } catch (e) {
    console.error(`Error loading ${key}`, e);
    return defaults;
  }
};

const save = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Error saving ${key}`, e);
  }
};

// --- FILE SYSTEM ACCESS API STATE ---
let dbFileHandle: any = null; // FileSystemFileHandle

// --- STATE ---
let CLIENTS: Client[] = load('flexo_clients', DEFAULT_CLIENTS);
let SUPPLIERS: Supplier[] = load('flexo_suppliers', DEFAULT_SUPPLIERS);
let MATERIALS: Material[] = load('flexo_materials', DEFAULT_MATERIALS);
let PRODUCTS: ProductRecipe[] = load('flexo_products', DEFAULT_PRODUCTS);
let CONFIG: SystemConfig = load('flexo_config', DEFAULT_CONFIG);
let ORDERS: ProductionOrder[] = load('flexo_orders', []);

// --- AUTO SAVE LOGIC ---
const triggerAutoSave = async () => {
  // Always save to LocalStorage as backup
  save('flexo_clients', CLIENTS);
  save('flexo_suppliers', SUPPLIERS);
  save('flexo_materials', MATERIALS);
  save('flexo_products', PRODUCTS);
  save('flexo_orders', ORDERS);
  save('flexo_config', CONFIG);

  // If File Handle exists, write to disk
  if (dbFileHandle) {
    try {
      const db = {
        clients: CLIENTS,
        suppliers: SUPPLIERS,
        materials: MATERIALS,
        products: PRODUCTS,
        orders: ORDERS,
        config: CONFIG,
        lastModified: new Date().toISOString()
      };
      
      const writable = await dbFileHandle.createWritable();
      await writable.write(JSON.stringify(db, null, 2));
      await writable.close();
      console.log("Auto-saved to Drive/Disk");
    } catch (err) {
      console.error("Failed to auto-save to disk:", err);
      // Don't alert on every auto-save failure to avoid spamming the user
    }
  }
};

export const connectAndLoadDB = async (): Promise<boolean> => {
  // Check browser support
  if (typeof (window as any).showOpenFilePicker !== 'function') {
      alert("Tu navegador no soporta la sincronización automática (File System API). Esta función requiere Chrome, Edge o Opera en escritorio.\n\nPara móviles o navegadores no soportados, usa la importación manual en Configuración.");
      return false;
  }

  try {
    // @ts-ignore - File System Access API
    const [handle] = await (window as any).showOpenFilePicker({
      types: [{
        description: 'JSON Database',
        accept: { 'application/json': ['.json'] },
      }],
      multiple: false,
    });

    dbFileHandle = handle;
    const file = await dbFileHandle.getFile();
    const text = await file.text();
    const json = JSON.parse(text);

    if (!json.clients || !json.materials) {
       alert("El archivo seleccionado no es una base de datos válida de PCP Enigma.");
       return false;
    }

    // Load into memory
    CLIENTS = json.clients || [];
    SUPPLIERS = json.suppliers || [];
    MATERIALS = json.materials || [];
    PRODUCTS = json.products || [];
    ORDERS = json.orders || [];
    CONFIG = json.config || DEFAULT_CONFIG;

    // Save to local storage immediately
    triggerAutoSave();
    
    return true;
  } catch (err: any) {
    if (err.name === 'AbortError') return false;
    
    // Specific handling for iframe/security restrictions (Preview Environments)
    if (err.name === 'SecurityError' || (err.message && err.message.includes('Cross origin'))) {
        alert("⚠️ Restricción de Entorno Detectada\n\nEstás ejecutando la App en un entorno restringido (iframe) que bloquea el acceso directo al disco duro.\n\nSOLUCIÓN:\n1. Ejecuta el proyecto localmente o despliégalo en GitHub Pages.\n2. Mientras tanto, usa la opción 'Configuración > Importar/Restaurar' para cargar tus datos manualmente.");
        return false;
    }

    console.error("Error connecting DB:", err);
    alert("Error al conectar: " + err.message);
    return false;
  }
};

export const isDBConnected = () => !!dbFileHandle;

// --- GETTERS ---
export const getClients = () => [...CLIENTS];
export const getSuppliers = () => [...SUPPLIERS];
export const getMaterials = () => [...MATERIALS];
export const getProducts = () => [...PRODUCTS];
export const getConfig = () => ({ ...CONFIG });
export const getOrders = () => [...ORDERS].sort((a, b) => (a.queueIndex || 0) - (b.queueIndex || 0));

// --- SETTERS / MUTATORS ---

// Products
export const saveProduct = (product: ProductRecipe) => {
  const index = PRODUCTS.findIndex(p => p.id === product.id);
  if (index >= 0) {
    PRODUCTS[index] = product;
  } else {
    PRODUCTS.push(product);
  }
  triggerAutoSave();
};

export const deleteProduct = (id: string) => {
  PRODUCTS = PRODUCTS.filter(p => p.id !== id);
  triggerAutoSave();
};

// Clients
export const saveClient = (client: Client) => {
  const index = CLIENTS.findIndex(c => c.id === client.id);
  if (index >= 0) {
    CLIENTS[index] = client;
  } else {
    CLIENTS.push(client);
  }
  triggerAutoSave();
};

export const deleteClient = (id: string) => {
  CLIENTS = CLIENTS.filter(c => c.id !== id);
  triggerAutoSave();
};

// Suppliers
export const saveSupplier = (supplier: Supplier) => {
  const index = SUPPLIERS.findIndex(s => s.id === supplier.id);
  if (index >= 0) {
    SUPPLIERS[index] = supplier;
  } else {
    SUPPLIERS.push(supplier);
  }
  triggerAutoSave();
};

export const deleteSupplier = (id: string) => {
  SUPPLIERS = SUPPLIERS.filter(s => s.id !== id);
  triggerAutoSave();
};

// Materials
export const saveMaterial = (material: Material) => {
  const index = MATERIALS.findIndex(m => m.id === material.id);
  if (index >= 0) {
    MATERIALS[index] = material;
  } else {
    MATERIALS.push(material);
  }
  triggerAutoSave();
};

export const deleteMaterial = (id: string) => {
  MATERIALS = MATERIALS.filter(m => m.id !== id);
  triggerAutoSave();
};

// ORDERS
export const saveOrder = (order: ProductionOrder) => {
  // Assign a high index to put it at the end of the queue by default
  if (order.queueIndex === undefined) {
    const maxIndex = ORDERS.reduce((max, o) => Math.max(max, o.queueIndex || 0), 0);
    order.queueIndex = maxIndex + 1;
  }
  
  const index = ORDERS.findIndex(o => o.id === order.id);
  if (index >= 0) {
      ORDERS[index] = order;
  } else {
      ORDERS.push(order);
  }
  triggerAutoSave();
};

export const updateOrderStatus = (orderId: string, status: OrderStatus) => {
  const order = ORDERS.find(o => o.id === orderId);
  if (order) {
    order.status = status;
    triggerAutoSave();
  }
};

export const updateOrderStage = (orderId: string, stage: string) => {
  const order = ORDERS.find(o => o.id === orderId);
  if (order) {
    order.currentStage = stage;
    triggerAutoSave();
  }
};

export const reorderQueue = (orders: ProductionOrder[]) => {
    orders.forEach((o, idx) => {
        const existingOrder = ORDERS.find(ex => ex.id === o.id);
        if (existingOrder) {
            existingOrder.queueIndex = idx;
        }
    });
    triggerAutoSave();
}

export const deleteOrder = (id: string) => {
    ORDERS = ORDERS.filter(o => o.id !== id);
    triggerAutoSave();
}

// STOCK MANAGEMENT
export const deductStock = (materialId: string, amountKg: number) => {
  const index = MATERIALS.findIndex(m => m.id === materialId);
  if (index >= 0) {
    MATERIALS[index].currentStockKg = Math.max(0, MATERIALS[index].currentStockKg - amountKg);
    triggerAutoSave();
    return true;
  }
  return false;
};

// Config
export const updateConfig = (newConfig: Partial<SystemConfig>) => {
  CONFIG = { ...CONFIG, ...newConfig };
  triggerAutoSave();
};

// --- EXPORT ---
export const generateExcelExport = () => {
  const wb = XLSX.utils.book_new();

  // 1. Orders History
  const flatOrders = ORDERS.map(o => ({
    'Codigo': o.orderCode,
    'Fecha': o.date,
    'Cliente': o.clientName,
    'Producto': o.productName,
    'Estado': o.status,
    'Etapa Actual': o.currentStage || 'Inicio',
    'Pedido': `${o.quantityRequested} ${o.unit}`,
    'Metros Brutos': o.calculationSnapshot.grossLinearMeters,
    'Peso Total (Kg)': o.calculationSnapshot.totalWeightKg,
    'Etapas': o.requiredStages.join(', ')
  }));
  const wsOrders = XLSX.utils.json_to_sheet(flatOrders);
  XLSX.utils.book_append_sheet(wb, wsOrders, "Historial Producción");

  // 2. Clients
  const wsClients = XLSX.utils.json_to_sheet(CLIENTS);
  XLSX.utils.book_append_sheet(wb, wsClients, "Clientes");

  // 3. Suppliers
  const wsSuppliers = XLSX.utils.json_to_sheet(SUPPLIERS);
  XLSX.utils.book_append_sheet(wb, wsSuppliers, "Proveedores");

  // 4. Inventory
  const wsMaterials = XLSX.utils.json_to_sheet(MATERIALS);
  XLSX.utils.book_append_sheet(wb, wsMaterials, "Inventario");

  // 5. Recipes
  const flatProducts = PRODUCTS.map(p => {
    const client = CLIENTS.find(c => c.id === p.clientId)?.name || 'N/A';
    const m1 = MATERIALS.find(m => m.id === p.layer1Id)?.name || 'N/A';
    const m2 = MATERIALS.find(m => m.id === p.layer2Id)?.name || 'N/A';
    const m3 = MATERIALS.find(m => m.id === p.layer3Id)?.name || 'N/A';
    return {
      SKU: p.sku,
      Producto: p.name,
      Cliente: client,
      Formato: p.format,
      'Ancho Impresión': p.webWidth,
      'Capa 1': m1,
      'Capa 2': m2,
      'Capa 3': m3,
      '% Merma Ficha': p.specificScrapPercent ? p.specificScrapPercent * 100 : 'Default'
    };
  });
  const wsProducts = XLSX.utils.json_to_sheet(flatProducts);
  XLSX.utils.book_append_sheet(wb, wsProducts, "Fichas Técnicas");

  XLSX.writeFile(wb, "FlexoManager_DB.xlsx");
};

export const exportDatabaseJSON = () => {
  const db = {
    clients: CLIENTS,
    suppliers: SUPPLIERS,
    materials: MATERIALS,
    products: PRODUCTS,
    orders: ORDERS,
    config: CONFIG,
    exportedAt: new Date().toISOString()
  };
  
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db, null, 2));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", `pcp_backup_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}

export const importDatabaseJSON = async (file: File): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        
        if (!json.clients || !json.materials || !json.products) {
           alert("Archivo inválido: Estructura de datos incorrecta.");
           resolve(false);
           return;
        }

        if(confirm("ADVERTENCIA: Esto borrará los datos actuales y cargará los del archivo. ¿Continuar?")) {
            save('flexo_clients', json.clients);
            save('flexo_suppliers', json.suppliers || []);
            save('flexo_materials', json.materials);
            save('flexo_products', json.products);
            save('flexo_orders', json.orders);
            save('flexo_config', json.config);
            
            CLIENTS = json.clients;
            SUPPLIERS = json.suppliers || [];
            MATERIALS = json.materials;
            PRODUCTS = json.products;
            ORDERS = json.orders;
            CONFIG = json.config;
            
            resolve(true);
        } else {
            resolve(false);
        }
      } catch (e) {
        console.error(e);
        alert("Error leyendo el archivo JSON.");
        resolve(false);
      }
    };
    reader.readAsText(file);
  });
}
