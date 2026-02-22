
export interface Employee {
  id: string;
  name: string;
  nip: string;
  pangkatGol: string;
  jabatan: string;
  representationLuar?: number;
  representationDalam?: number;
}

export interface Official {
  id: string;
  name: string;
  nip: string;
  jabatan: string;
  role: 'KEPALA' | 'PPTK' | 'BENDAHARA';
}

export interface DestinationOfficial {
  id: string;
  name: string;
  nip: string;
  jabatan: string;
  instansi: string;
}

export interface SKPDConfig {
  provinsi?: string;
  namaSkpd: string;
  alamat: string;
  lokasi: string;
  kepalaNama: string;
  kepalaNip: string;
  kepalaJabatan: string;
  bendaharaNama: string;
  bendaharaNip: string;
  pptkNama: string;
  pptkNip: string;
  logo?: string;
}

export interface MasterCost {
  destination: string;
  dailyAllowance: number;
  lodging: number;
  transportBbm: number;
  seaTransport: number;
  airTransport: number;
  taxi: number;
}

export interface SubActivity {
  code: string;
  name: string;
  budgetCode?: string;
  anggaran: number;
  spd: string;
  triwulan1: number;
  triwulan2: number;
  triwulan3: number;
  triwulan4: number;
}

export interface TravelCost {
  employeeId: string;
  transportBbm: number;
  seaTransport: number;
  airTransport: number;
  taxi: number;
  lodging: number;
  lodgingDays: number;
  dailyAllowance: number;
  dailyDays: number;
  representation: number;
  representationDays: number;
}

export type TravelType = 'DALAM_DAERAH' | 'LUAR_DAERAH';

export interface TravelAssignment {
  id: string;
  assignmentNumber: string;
  subActivityCode: string;
  purpose: string;
  origin: string;
  travelType: TravelType;
  transportation: string;
  destination: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  selectedEmployeeIds: string[];
  costs: TravelCost[];
  signedAt: string;
  signDate: string;
  pptkId?: string;
  signerId?: string;
  bendaharaId?: string;
  destinationOfficialIds?: string[]; 
}

export enum ViewMode {
  DASHBOARD = 'DASHBOARD',
  EMPLOYEE_LIST = 'EMPLOYEE_LIST',
  OFFICIAL_LIST = 'OFFICIAL_LIST',
  DESTINATION_OFFICIAL_LIST = 'DESTINATION_OFFICIAL_LIST',
  TRAVEL_LIST = 'TRAVEL_LIST',
  ADD_TRAVEL = 'ADD_TRAVEL',
  MASTER_DATA = 'MASTER_DATA',
  SKPD_CONFIG = 'SKPD_CONFIG',
  PRINT_MENU = 'PRINT_MENU',
  PRINT_PREVIEW = 'PRINT_PREVIEW',
  REPORT = 'REPORT'
}

export enum PrintType {
  SPT = 'SPT',
  SPPD_FRONT = 'SPPD_FRONT',
  SPPD_BACK = 'SPPD_BACK',
  LAMPIRAN_III = 'LAMPIRAN_III',
  DAFTAR_PENERIMAAN = 'DAFTAR_PENERIMAAN',
  KUITANSI = 'KUITANSI',
  PEJABAT_TUJUAN = 'PEJABAT_TUJUAN'
}
