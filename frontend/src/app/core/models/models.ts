export interface Party {
  id: number;
  name: string;
  type: 'AADHTI' | 'BUYER' | 'MILL' | 'TRANSPORTER';
  contactPerson?: string;
  phone?: string;
  address?: string;
  gstin?: string;
  openingBalance: number;
  active: boolean;
  createdAt: string;
}

export interface Commodity {
  id: number;
  name: string;
  hasVarieties: boolean;
  active: boolean;
  varieties?: CommodityVariety[];
}

export interface CommodityVariety {
  id: number;
  commodityId: number;
  name: string;
  active: boolean;
  settings?: CommoditySettings;
}

export interface CommoditySettings {
  id: number;
  commodityVarietyId: number;
  varietyName: string;
  gausharaRate: number;
  commissionRate: number;
  allowedCashDiscounts: number[];
  bardanaMode: 'EXCHANGE' | 'COST_INCLUDED';
  bagWeightKg: number;
  saleTaxRate: number;
  labourRateBasis: 'PER_BAG' | 'PER_QUINTAL' | 'FLAT';
  labourRate: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface AuthResponse {
  token: string;
  id?: number;
  username: string;
  fullName: string;
  role: string;
  preferredLocale?: string;
  preferredTheme?: string;
}

export interface UserAccount {
  id: number;
  username: string;
  fullName: string;
  role: string;
  active: boolean;
  preferredLocale: string;
  preferredTheme: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  preferredLocale: string;
  preferredTheme: string;
}

export interface AuditLogEntry {
  id: number;
  entityName: string;
  entityId: number;
  action: string;
  changedBy?: number;
  changedByUsername?: string;
  changedByFullName?: string;
  changedAt: string;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  ipAddress?: string;
}

export interface AuditPage {
  content: AuditLogEntry[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface Purchase {
  id: number;
  purchaseDate: string;
  partyId: number;
  partyName: string;
  commodityVarietyId: number;
  commodityVarietyName: string;
  commodityName: string;
  weightQuintals: number;
  bags: number;
  ratePerQuintal: number;
  grossAmount: number;
  gaushalaRate: number;
  gaushalaAmount: number;
  commissionRate: number;
  commissionAmount: number;
  cashDiscountPct: number;
  cashDiscountAmount: number;
  netPayable: number;
  amountPaid: number;
  paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
  confirmed: boolean;
  remarks?: string;
  createdByFullName?: string;
}

export interface PurchaseRequest {
  purchaseDate: string;
  partyId: number;
  commodityVarietyId: number;
  weightQuintals: number;
  bags?: number;
  ratePerQuintal: number;
  cashDiscountPct?: number;
  remarks?: string;
}

export type SaleType = 'FOB' | 'RATE_BASED';

export interface Sale {
  id: number;
  saleDate: string;
  saleType: SaleType;
  buyerId: number;
  buyerName: string;
  commodityId: number;
  commodityVarietyId: number;
  commodityVarietyName: string;
  commodityName: string;
  quantityQuintals: number;
  ratePerQuintal?: number;
  bags: number;
  transporterId?: number;
  transporterName?: string;
  transportCharge: number;
  labourCharge: number;
  commissionAmount: number;
  taxAmount: number;
  totalAmount: number;
  fobDetails?: string;
  amountReceived: number;
  paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
  confirmed: boolean;
  remarks?: string;
  createdByFullName?: string;
}

export interface SaleRequest {
  saleDate: string;
  saleType: SaleType;
  buyerId: number;
  commodityVarietyId: number;
  quantityQuintals: number;
  ratePerQuintal?: number;
  bags?: number;
  transporterId?: number;
  transportCharge?: number;
  labourCharge?: number;
  totalAmount?: number;
  fobDetails?: string;
  remarks?: string;
}

export interface Stock {
  id: number;
  commodityVarietyId: number;
  commodityVarietyName: string;
  commodityName: string;
  quantityQuintals: number;
  bags: number;
  lastUpdated: string;
}

export type CashBookEntryType = 'RECEIPT' | 'PAYMENT' | 'OPENING_BALANCE';

export interface CashBookEntry {
  id: number;
  entryDate: string;
  type: CashBookEntryType;
  partyId?: number;
  partyName?: string;
  linkedPurchaseId?: number;
  linkedSaleId?: number;
  amount: number;
  runningBalance: number;
  remarks?: string;
  createdByFullName?: string;
  createdAt: string;
}

export interface CashBookDay {
  date: string;
  openingBalance: number;
  totalReceipts: number;
  totalPayments: number;
  closingBalance: number;
  finalized: boolean;
  entries: CashBookEntry[];
}

export interface CashBookEntryRequest {
  entryDate: string;
  type: 'RECEIPT' | 'PAYMENT';
  partyId?: number;
  linkedPurchaseId?: number;
  linkedSaleId?: number;
  amount: number;
  remarks?: string;
}

export interface LedgerEntry {
  id: number;
  partyId: number;
  partyName: string;
  entryDate: string;
  cashBookEntryId: number;
  cashBookType: CashBookEntryType;
  purchaseId?: number;
  saleId?: number;
  commodityVarietyId?: number;
  commodityVarietyName?: string;
  amountPaid: number;
  outstandingBalanceAfter: number;
  narration?: string;
  createdAt: string;
}

export interface UnpaidPurchaseSummary {
  purchaseId: number;
  purchaseDate: string;
  commodityVarietyName: string;
  netPayable: number;
  amountPaid: number;
  outstanding: number;
  paymentStatus: string;
}

export interface PartyLedgerSummary {
  partyId: number;
  partyName: string;
  partyType: string;
  openingBalance: number;
  purchaseOutstanding: number;
  totalOutstanding: number;
  unpaidPurchases: UnpaidPurchaseSummary[];
  entries: LedgerEntry[];
}

export type BardanaType = 'RECEIVED' | 'ISSUED' | 'RETURNED' | 'ADJUSTMENT';
export type BardanaMode = 'EXCHANGE' | 'COST_INCLUDED';

export interface BardanaTransaction {
  id: number;
  transactionDate: string;
  type: BardanaType;
  partyId: number;
  partyName: string;
  commodityVarietyId: number;
  commodityVarietyName: string;
  commodityName: string;
  bags: number;
  mode: BardanaMode;
  amount?: number;
  linkedPurchaseId?: number;
  linkedSaleId?: number;
  remarks?: string;
  createdByFullName?: string;
  createdAt: string;
}

export interface BardanaTransactionRequest {
  transactionDate: string;
  type: BardanaType;
  partyId: number;
  commodityVarietyId: number;
  bags: number;
  mode?: BardanaMode;
  amount?: number;
  remarks?: string;
}

export interface BardanaBalance {
  partyId: number;
  partyName: string;
  commodityVarietyId: number;
  commodityVarietyName: string;
  commodityName: string;
  balanceBags: number;
}

export interface CashFlowReport {
  from: string;
  to: string;
  totalReceipts: number;
  totalPayments: number;
  netCash: number;
  entries: {
    date: string;
    type: string;
    partyName?: string;
    amount: number;
    runningBalance: number;
    remarks?: string;
  }[];
}

export interface PurchaseSaleReport {
  from: string;
  to: string;
  totalPurchaseNet: number;
  totalSaleAmount: number;
  purchases: {
    id: number;
    date: string;
    partyName: string;
    commodity: string;
    variety: string;
    weightQuintals: number;
    bags: number;
    netPayable: number;
    paymentStatus: string;
    confirmed: boolean;
  }[];
  sales: {
    id: number;
    date: string;
    buyerName: string;
    commodity: string;
    variety: string;
    quantityQuintals: number;
    bags: number;
    totalAmount: number;
    paymentStatus: string;
    confirmed: boolean;
  }[];
}

