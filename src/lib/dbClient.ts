import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { 
  Employee, Official, DestinationOfficial, SKPDConfig, 
  MasterCost, SubActivity, TravelAssignment, TravelCost 
} from '../types';

// Initialize Firebase App
const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);

export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/spreadsheets');
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');

// In-memory cache for OAuth access token
let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Initialize auth listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Google Sign-In helper
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan token akses dari Google.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Login error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Logout helper
export const googleSignOut = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

// SCHEMAS for each table
const SCHEMAS: Record<string, string[]> = {
  employees: ["id", "name", "nip", "pangkat_gol", "jabatan", "representation_luar", "representation_dalam"],
  officials: ["id", "name", "nip", "jabatan", "role"],
  destination_officials: ["id", "name", "nip", "jabatan", "instansi"],
  skpd_config: ["id", "provinsi", "nama_skpd", "alamat", "lokasi", "kepala_nama", "kepala_nip", "kepala_jabatan", "bendahara_nama", "bendahara_nip", "pptk_nama", "pptk_nip", "logo"],
  master_costs: ["id", "destination", "daily_allowance", "lodging", "transport_bbm", "sea_transport", "air_transport", "taxi"],
  sub_activities: ["code", "name", "budget_code", "anggaran", "spd", "triwulan1", "triwulan2", "triwulan3", "triwulan4"],
  assignments: ["id", "assignment_number", "sub_activity_code", "purpose", "origin", "travel_type", "transportation", "destination", "start_date", "end_date", "duration_days", "selected_employee_ids", "costs", "signed_at", "sign_date", "pptk_id", "signer_id", "bendahara_id", "destination_official_ids", "created_at"]
};

// Helper for parsing cell values safely
const safeParseJson = (val: any) => {
  if (typeof val === 'string' && (val.trim().startsWith('[') || val.trim().startsWith('{'))) {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  return val;
};

// Sheets DB Client
export class SheetsDbClient {
  private spreadsheetId: string;
  private token: string;

  constructor(spreadsheetId: string, token: string) {
    this.spreadsheetId = spreadsheetId;
    this.token = token;
  }

  private async apiCall(endpoint: string, options: RequestInit = {}) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const errText = await res.text();
      let errMsg = `Sheets API error: ${res.statusText}`;
      try {
        const errJson = JSON.parse(errText);
        errMsg = errJson.error?.message || errMsg;
      } catch {}
      throw new Error(errMsg);
    }
    return res.json();
  }

  // Create sheet schema structure
  static async createDatabase(token: string, title: string = "Database SIPDLITE - Provinsi NTB"): Promise<string> {
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // 1. Create Spreadsheet
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        properties: { title },
        sheets: Object.keys(SCHEMAS).map(tableName => ({
          properties: { title: tableName }
        }))
      })
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      throw new Error(`Gagal membuat spreadsheet: ${err}`);
    }

    const spreadsheet = await createRes.json();
    const spreadsheetId = spreadsheet.spreadsheetId;

    // 2. Initialize Headers for each sheet
    const rangesData = Object.entries(SCHEMAS).map(([tableName, columns]) => ({
      range: `${tableName}!A1`,
      values: [columns]
    }));

    const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        valueInputOption: 'RAW',
        data: rangesData
      })
    });

    if (!updateRes.ok) {
      const err = await updateRes.text();
      throw new Error(`Gagal mengisi header spreadsheet: ${err}`);
    }

    return spreadsheetId;
  }

  // Read all records from a table
  async fetchTable(tableName: string): Promise<any[]> {
    try {
      const data = await this.apiCall(`/values/${tableName}!A1:Z10000`);
      const rows = data.values || [];
      if (rows.length === 0) return [];

      const headers = rows[0];
      return rows.slice(1).map((row: any) => {
        const item: any = {};
        headers.forEach((header: string, index: number) => {
          let cellVal = row[index] !== undefined ? row[index] : null;
          item[header] = safeParseJson(cellVal);
        });
        return item;
      });
    } catch (err: any) {
      if (err.message && err.message.includes("not found")) {
        await this.createTabIfMissing(tableName);
        return [];
      }
      throw err;
    }
  }

  async createTabIfMissing(tableName: string) {
    const headers = SCHEMAS[tableName];
    if (!headers) return;
    try {
      // Add sheet
      await this.apiCall(':batchUpdate', {
        method: 'POST',
        body: JSON.stringify({
          requests: [
            {
              addSheet: {
                properties: { title: tableName }
              }
            }
          ]
        })
      });

      // Write Header
      await this.apiCall(`/values/${tableName}!A1?valueInputOption=RAW`, {
        method: 'PUT',
        body: JSON.stringify({
          range: `${tableName}!A1`,
          majorDimension: 'ROWS',
          values: [headers]
        })
      });
    } catch (e) {
      console.error(`Failed to repair tab ${tableName}:`, e);
    }
  }

  // Write complete table records back, replacing everything after header
  async writeTable(tableName: string, records: any[]): Promise<void> {
    const columns = SCHEMAS[tableName];
    if (!columns) throw new Error(`Schema tidak ditemukan untuk tabel: ${tableName}`);

    // Map records to rows matching column orders
    const mappedRows = records.map(record => {
      return columns.map(col => {
        const val = record[col];
        if (val === undefined || val === null) return '';
        if (typeof val === 'object') return JSON.stringify(val);
        return val;
      });
    });

    // 1. Clear current table row contents from A2:Z10000
    await this.apiCall(`/values/${tableName}!A2:Z10000:clear`, {
      method: 'POST'
    });

    // 2. Put new rows starting from A2
    if (mappedRows.length > 0) {
      await this.apiCall(`/values/${tableName}!A2?valueInputOption=RAW`, {
        method: 'PUT',
        body: JSON.stringify({
          range: `${tableName}!A2`,
          majorDimension: 'ROWS',
          values: mappedRows
        })
      });
    }
  }

  // Find row match by key and save/upsert
  async saveRecord(tableName: string, record: any, keyField: string): Promise<void> {
    const records = await this.fetchTable(tableName);
    const existingIndex = records.findIndex(r => String(r[keyField]) === String(record[keyField]));

    if (existingIndex > -1) {
      records[existingIndex] = { ...records[existingIndex], ...record };
    } else {
      records.push(record);
    }

    await this.writeTable(tableName, records);
  }

  // Delete record from table
  async deleteRecord(tableName: string, id: any, keyField: string): Promise<void> {
    const records = await this.fetchTable(tableName);
    const updatedRecords = records.filter(r => String(r[keyField]) !== String(id));
    await this.writeTable(tableName, updatedRecords);
  }

  // Clear table records
  async clearTable(tableName: string): Promise<void> {
    await this.writeTable(tableName, []);
  }
}

// Global Interfaces
export interface IDbClient {
  fetchEmployees(): Promise<Employee[]>;
  saveEmployee(e: Employee): Promise<void>;
  deleteEmployee(id: string): Promise<void>;
  clearEmployees(): Promise<void>;

  fetchOfficials(): Promise<Official[]>;
  saveOfficial(o: Official): Promise<void>;
  deleteOfficial(id: string): Promise<void>;

  fetchDestinationOfficials(): Promise<DestinationOfficial[]>;
  saveDestinationOfficial(o: DestinationOfficial): Promise<void>;
  deleteDestinationOfficial(id: string): Promise<void>;

  fetchSKPDConfig(): Promise<SKPDConfig>;
  saveSKPDConfig(c: SKPDConfig): Promise<void>;

  fetchMasterCosts(): Promise<MasterCost[]>;
  saveMasterCost(c: Partial<MasterCost>): Promise<void>;
  deleteMasterCost(destination: string): Promise<void>;
  clearMasterCosts(): Promise<void>;

  fetchSubActivities(): Promise<SubActivity[]>;
  saveSubActivity(s: SubActivity): Promise<void>;
  deleteSubActivity(code: string): Promise<void>;
  clearSubActivities(): Promise<void>;

  fetchAssignments(): Promise<TravelAssignment[]>;
  saveAssignment(a: TravelAssignment): Promise<void>;
  updateDestOfficials(assignId: string, destIds: string[]): Promise<void>;
  deleteAssignment(id: string): Promise<void>;
}

// 1. Supabase Client Wrapper Implementation
export class SupabaseDbWrapper implements IDbClient {
  public client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async fetchEmployees(): Promise<Employee[]> {
    const { data, error } = await this.client.from('employees').select('*').order('name');
    if (error) throw error;
    return (data || []).map(e => ({
      id: e.id,
      name: e.name,
      nip: e.nip,
      pangkatGol: e.pangkat_gol || '',
      jabatan: e.jabatan || '',
      representationLuar: Number(e.representation_luar || 0),
      representationDalam: Number(e.representation_dalam || 0)
    }));
  }

  async saveEmployee(e: Employee): Promise<void> {
    const { error } = await this.client.from('employees').upsert({
      id: e.id,
      name: e.name,
      nip: e.nip,
      pangkat_gol: e.pangkatGol,
      jabatan: e.jabatan,
      representation_luar: Number(e.representationLuar || 0),
      representation_dalam: Number(e.representationDalam || 0)
    });
    if (error) throw error;
  }

  async deleteEmployee(id: string): Promise<void> {
    const { error } = await this.client.from('employees').delete().eq('id', id);
    if (error) throw error;
  }

  async clearEmployees(): Promise<void> {
    const { error } = await this.client.from('employees').delete().neq('id', '___');
    if (error) throw error;
  }

  async fetchOfficials(): Promise<Official[]> {
    const { data, error } = await this.client.from('officials').select('*').order('name');
    if (error) throw error;
    return data || [];
  }

  async saveOfficial(o: Official): Promise<void> {
    const { error } = await this.client.from('officials').upsert({
      id: o.id || Date.now().toString(),
      name: o.name,
      nip: o.nip,
      jabatan: o.jabatan,
      role: o.role
    });
    if (error) throw error;
  }

  async deleteOfficial(id: string): Promise<void> {
    const { error } = await this.client.from('officials').delete().eq('id', id);
    if (error) throw error;
  }

  async fetchDestinationOfficials(): Promise<DestinationOfficial[]> {
    const { data, error } = await this.client.from('destination_officials').select('*').order('name');
    if (error) throw error;
    return data || [];
  }

  async saveDestinationOfficial(o: DestinationOfficial): Promise<void> {
    const { error } = await this.client.from('destination_officials').upsert({
      id: o.id || Date.now().toString(),
      name: o.name,
      nip: o.nip,
      jabatan: o.jabatan,
      instansi: o.instansi
    });
    if (error) throw error;
  }

  async deleteDestinationOfficial(id: string): Promise<void> {
    const { error } = await this.client.from('destination_officials').delete().eq('id', id);
    if (error) throw error;
  }

  async fetchSKPDConfig(): Promise<SKPDConfig> {
    const { data, error } = await this.client.from('skpd_config').select('*').eq('id', 'main').maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    if (!data) {
      return {
        provinsi: 'Provinsi Nusa Tenggara Barat',
        namaSkpd: '',
        alamat: '',
        lokasi: 'MATARAM',
        kepalaNama: '',
        kepalaNip: '',
        kepalaJabatan: 'KEPALA',
        bendaharaNama: '',
        bendaharaNip: '',
        pptkNama: '',
        pptkNip: '',
        logo: undefined
      };
    }
    return {
      provinsi: data.provinsi,
      namaSkpd: data.nama_skpd,
      alamat: data.alamat,
      lokasi: data.lokasi,
      kepalaNama: data.kepala_nama,
      kepalaNip: data.kepala_nip,
      kepalaJabatan: data.kepala_jabatan,
      bendaharaNama: data.bendahara_nama,
      bendaharaNip: data.bendahara_nip,
      pptkNama: data.pptk_nama,
      pptkNip: data.pptk_nip,
      logo: data.logo
    };
  }

  async saveSKPDConfig(c: SKPDConfig): Promise<void> {
    const { error } = await this.client.from('skpd_config').upsert({
      id: 'main',
      provinsi: c.provinsi,
      nama_skpd: c.namaSkpd,
      alamat: c.alamat,
      lokasi: c.lokasi,
      kepala_nama: c.kepalaNama,
      kepala_nip: c.kepalaNip,
      kepala_jabatan: c.kepalaJabatan,
      bendahara_nama: c.bendaharaNama,
      bendahara_nip: c.bendaharaNip,
      pptk_nama: c.pptkNama,
      pptk_nip: c.pptkNip,
      logo: c.logo
    });
    if (error) throw error;
  }

  async fetchMasterCosts(): Promise<MasterCost[]> {
    const { data, error } = await this.client.from('master_costs').select('*').order('destination');
    if (error) throw error;
    return (data || []).map(c => ({
      destination: c.destination,
      dailyAllowance: Number(c.daily_allowance),
      lodging: Number(c.lodging),
      transportBbm: Number(c.transport_bbm),
      seaTransport: Number(c.sea_transport),
      airTransport: Number(c.air_transport),
      taxi: Number(c.taxi)
    }));
  }

  async saveMasterCost(c: Partial<MasterCost>): Promise<void> {
    const { error } = await this.client.from('master_costs').upsert({
      id: c.destination, // Supabase primary key is destination
      destination: c.destination,
      daily_allowance: c.dailyAllowance,
      lodging: c.lodging,
      transport_bbm: c.transportBbm,
      sea_transport: c.seaTransport,
      air_transport: c.airTransport,
      taxi: c.taxi
    });
    if (error) throw error;
  }

  async deleteMasterCost(destination: string): Promise<void> {
    const { error } = await this.client.from('master_costs').delete().eq('destination', destination);
    if (error) throw error;
  }

  async clearMasterCosts(): Promise<void> {
    const { error } = await this.client.from('master_costs').delete().neq('destination', '___');
    if (error) throw error;
  }

  async fetchSubActivities(): Promise<SubActivity[]> {
    const { data, error } = await this.client.from('sub_activities').select('*').order('code');
    if (error) throw error;
    return (data || []).map(s => ({
      code: s.code,
      name: s.name,
      budgetCode: s.budget_code,
      anggaran: Number(s.anggaran || 0),
      spd: s.spd || '',
      triwulan1: Number(s.triwulan1 || 0),
      triwulan2: Number(s.triwulan2 || 0),
      triwulan3: Number(s.triwulan3 || 0),
      triwulan4: Number(s.triwulan4 || 0)
    }));
  }

  async saveSubActivity(s: SubActivity): Promise<void> {
    const { error } = await this.client.from('sub_activities').upsert({
      code: s.code,
      name: s.name,
      budget_code: s.budgetCode || '',
      anggaran: s.anggaran || 0,
      spd: s.spd || '0',
      triwulan1: s.triwulan1 || 0,
      triwulan2: s.triwulan2 || 0,
      triwulan3: s.triwulan3 || 0,
      triwulan4: s.triwulan4 || 0
    });
    if (error) throw error;
  }

  async deleteSubActivity(code: string): Promise<void> {
    const { error } = await this.client.from('sub_activities').delete().eq('code', code);
    if (error) throw error;
  }

  async clearSubActivities(): Promise<void> {
    const { error } = await this.client.from('sub_activities').delete().neq('code', '___');
    if (error) throw error;
  }

  async fetchAssignments(): Promise<TravelAssignment[]> {
    const { data, error } = await this.client.from('assignments').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(a => ({
      id: a.id,
      assignmentNumber: a.assignment_number,
      subActivityCode: a.sub_activity_code,
      purpose: a.purpose,
      origin: a.origin,
      travelType: a.travel_type,
      transportation: a.transportation,
      destination: a.destination,
      startDate: a.start_date,
      endDate: a.end_date,
      durationDays: Number(a.duration_days || 0),
      selectedEmployeeIds: a.selected_employee_ids || [],
      costs: a.costs || [],
      signedAt: a.signed_at,
      signDate: a.sign_date,
      pptkId: a.pptk_id,
      signerId: a.signer_id,
      bendaharaId: a.bendahara_id,
      destinationOfficialIds: a.destination_official_ids || []
    }));
  }

  async saveAssignment(a: TravelAssignment): Promise<void> {
    const { error } = await this.client.from('assignments').upsert({
      id: a.id,
      assignment_number: a.assignmentNumber,
      sub_activity_code: a.subActivityCode,
      purpose: a.purpose,
      origin: a.origin,
      travel_type: a.travelType,
      transportation: a.transportation,
      destination: a.destination,
      start_date: a.startDate,
      end_date: a.endDate,
      duration_days: a.durationDays,
      selected_employee_ids: a.selectedEmployeeIds,
      costs: a.costs,
      signed_at: a.signedAt,
      sign_date: a.signDate,
      pptk_id: a.pptkId,
      signer_id: a.signerId,
      bendahara_id: a.bendaharaId,
      destination_official_ids: a.destinationOfficialIds || []
    });
    if (error) throw error;
  }

  async updateDestOfficials(assignId: string, destIds: string[]): Promise<void> {
    const { error } = await this.client.from('assignments').update({
      destination_official_ids: destIds
    }).eq('id', assignId);
    if (error) throw error;
  }

  async deleteAssignment(id: string): Promise<void> {
    const { error } = await this.client.from('assignments').delete().eq('id', id);
    if (error) throw error;
  }
}

// 2. Google Sheets Wrapper Implementation
export class GoogleSheetsDbWrapper implements IDbClient {
  public client: SheetsDbClient;

  constructor(spreadsheetId: string, token: string) {
    this.client = new SheetsDbClient(spreadsheetId, token);
  }

  async fetchEmployees(): Promise<Employee[]> {
    const rows = await this.client.fetchTable('employees');
    return rows.map(e => ({
      id: String(e.id),
      name: String(e.name || ''),
      nip: String(e.nip || ''),
      pangkatGol: String(e.pangkat_gol || ''),
      jabatan: String(e.jabatan || ''),
      representationLuar: Number(e.representation_luar || 0),
      representationDalam: Number(e.representation_dalam || 0)
    }));
  }

  async saveEmployee(e: Employee): Promise<void> {
    await this.client.saveRecord('employees', {
      id: e.id,
      name: e.name,
      nip: e.nip,
      pangkat_gol: e.pangkatGol,
      jabatan: e.jabatan,
      representation_luar: Number(e.representationLuar || 0),
      representation_dalam: Number(e.representationDalam || 0)
    }, 'id');
  }

  async deleteEmployee(id: string): Promise<void> {
    await this.client.deleteRecord('employees', id, 'id');
  }

  async clearEmployees(): Promise<void> {
    await this.client.clearTable('employees');
  }

  async fetchOfficials(): Promise<Official[]> {
    const rows = await this.client.fetchTable('officials');
    return rows.map(o => ({
      id: String(o.id),
      name: String(o.name || ''),
      nip: String(o.nip || ''),
      jabatan: String(o.jabatan || ''),
      role: o.role as 'KEPALA' | 'PPTK' | 'BENDAHARA'
    }));
  }

  async saveOfficial(o: Official): Promise<void> {
    await this.client.saveRecord('officials', {
      id: o.id || Date.now().toString(),
      name: o.name,
      nip: o.nip,
      jabatan: o.jabatan,
      role: o.role
    }, 'id');
  }

  async deleteOfficial(id: string): Promise<void> {
    await this.client.deleteRecord('officials', id, 'id');
  }

  async fetchDestinationOfficials(): Promise<DestinationOfficial[]> {
    const rows = await this.client.fetchTable('destination_officials');
    return rows.map(d => ({
      id: String(d.id),
      name: String(d.name || ''),
      nip: String(d.nip || ''),
      jabatan: String(d.jabatan || ''),
      instansi: String(d.instansi || '')
    }));
  }

  async saveDestinationOfficial(o: DestinationOfficial): Promise<void> {
    await this.client.saveRecord('destination_officials', {
      id: o.id || Date.now().toString(),
      name: o.name,
      nip: o.nip,
      jabatan: o.jabatan,
      instansi: o.instansi
    }, 'id');
  }

  async deleteDestinationOfficial(id: string): Promise<void> {
    await this.client.deleteRecord('destination_officials', id, 'id');
  }

  async fetchSKPDConfig(): Promise<SKPDConfig> {
    const rows = await this.client.fetchTable('skpd_config');
    const data = rows.find(r => r.id === 'main');
    if (!data) {
      return {
        provinsi: 'Provinsi Nusa Tenggara Barat',
        namaSkpd: '',
        alamat: '',
        lokasi: 'MATARAM',
        kepalaNama: '',
        kepalaNip: '',
        kepalaJabatan: 'KEPALA',
        bendaharaNama: '',
        bendaharaNip: '',
        pptkNama: '',
        pptkNip: '',
        logo: undefined
      };
    }
    return {
      provinsi: data.provinsi,
      namaSkpd: data.nama_skpd,
      alamat: data.alamat,
      lokasi: data.lokasi,
      kepalaNama: data.kepala_nama,
      kepalaNip: data.kepala_nip,
      kepalaJabatan: data.kepala_jabatan,
      bendaharaNama: data.bendahara_nama,
      bendaharaNip: data.bendahara_nip,
      pptkNama: data.pptk_nama,
      pptkNip: data.pptk_nip,
      logo: data.logo
    };
  }

  async saveSKPDConfig(c: SKPDConfig): Promise<void> {
    await this.client.saveRecord('skpd_config', {
      id: 'main',
      provinsi: c.provinsi,
      nama_skpd: c.namaSkpd,
      alamat: c.alamat,
      lokasi: c.lokasi,
      kepala_nama: c.kepalaNama,
      kepala_nip: c.kepalaNip,
      kepala_jabatan: c.kepalaJabatan,
      bendahara_nama: c.bendaharaNama,
      bendahara_nip: c.bendaharaNip,
      pptk_nama: c.pptkNama,
      pptk_nip: c.pptkNip,
      logo: c.logo
    }, 'id');
  }

  async fetchMasterCosts(): Promise<MasterCost[]> {
    const rows = await this.client.fetchTable('master_costs');
    return rows.map(c => ({
      destination: String(c.destination || ''),
      dailyAllowance: Number(c.daily_allowance || 0),
      lodging: Number(c.lodging || 0),
      transportBbm: Number(c.transport_bbm || 0),
      seaTransport: Number(c.sea_transport || 0),
      airTransport: Number(c.air_transport || 0),
      taxi: Number(c.taxi || 0)
    }));
  }

  async saveMasterCost(c: Partial<MasterCost>): Promise<void> {
    await this.client.saveRecord('master_costs', {
      id: c.destination, // Unique identifier in sheets schema
      destination: c.destination,
      daily_allowance: Number(c.dailyAllowance || 0),
      lodging: Number(c.lodging || 0),
      transport_bbm: Number(c.transportBbm || 0),
      sea_transport: Number(c.seaTransport || 0),
      air_transport: Number(c.airTransport || 0),
      taxi: Number(c.taxi || 0)
    }, 'destination');
  }

  async deleteMasterCost(destination: string): Promise<void> {
    await this.client.deleteRecord('master_costs', destination, 'destination');
  }

  async clearMasterCosts(): Promise<void> {
    await this.client.clearTable('master_costs');
  }

  async fetchSubActivities(): Promise<SubActivity[]> {
    const rows = await this.client.fetchTable('sub_activities');
    return rows.map(s => ({
      code: String(s.code || ''),
      name: String(s.name || ''),
      budgetCode: String(s.budget_code || ''),
      anggaran: Number(s.anggaran || 0),
      spd: String(s.spd || '0'),
      triwulan1: Number(s.triwulan1 || 0),
      triwulan2: Number(s.triwulan2 || 0),
      triwulan3: Number(s.triwulan3 || 0),
      triwulan4: Number(s.triwulan4 || 0)
    }));
  }

  async saveSubActivity(s: SubActivity): Promise<void> {
    await this.client.saveRecord('sub_activities', {
      code: s.code,
      name: s.name,
      budget_code: s.budgetCode || '',
      anggaran: Number(s.anggaran || 0),
      spd: String(s.spd || '0'),
      triwulan1: Number(s.triwulan1 || 0),
      triwulan2: Number(s.triwulan2 || 0),
      triwulan3: Number(s.triwulan3 || 0),
      triwulan4: Number(s.triwulan4 || 0)
    }, 'code');
  }

  async deleteSubActivity(code: string): Promise<void> {
    await this.client.deleteRecord('sub_activities', code, 'code');
  }

  async clearSubActivities(): Promise<void> {
    await this.client.clearTable('sub_activities');
  }

  async fetchAssignments(): Promise<TravelAssignment[]> {
    const rows = await this.client.fetchTable('assignments');
    return rows.map(a => ({
      id: String(a.id),
      assignmentNumber: String(a.assignment_number || ''),
      subActivityCode: String(a.sub_activity_code || ''),
      purpose: String(a.purpose || ''),
      origin: String(a.origin || ''),
      travelType: a.travel_type as 'DALAM_DAERAH' | 'LUAR_DAERAH',
      transportation: String(a.transportation || ''),
      destination: String(a.destination || ''),
      startDate: String(a.start_date || ''),
      endDate: String(a.end_date || ''),
      durationDays: Number(a.duration_days || 0),
      selectedEmployeeIds: Array.isArray(a.selected_employee_ids) ? a.selected_employee_ids : [],
      costs: Array.isArray(a.costs) ? a.costs : [],
      signedAt: String(a.signed_at || ''),
      signDate: String(a.sign_date || ''),
      pptkId: a.pptk_id ? String(a.pptk_id) : undefined,
      signerId: a.signer_id ? String(a.signer_id) : undefined,
      bendaharaId: a.bendahara_id ? String(a.bendahara_id) : undefined,
      destinationOfficialIds: Array.isArray(a.destination_official_ids) ? a.destination_official_ids : []
    }));
  }

  async saveAssignment(a: TravelAssignment): Promise<void> {
    await this.client.saveRecord('assignments', {
      id: a.id,
      assignment_number: a.assignmentNumber,
      sub_activity_code: a.subActivityCode,
      purpose: a.purpose,
      origin: a.origin,
      travel_type: a.travelType,
      transportation: a.transportation,
      destination: a.destination,
      start_date: a.startDate,
      end_date: a.endDate,
      duration_days: Number(a.durationDays || 0),
      selected_employee_ids: a.selectedEmployeeIds,
      costs: a.costs,
      signed_at: a.signedAt,
      sign_date: a.signDate,
      pptk_id: a.pptkId,
      signer_id: a.signerId,
      bendahara_id: a.bendaharaId,
      destination_official_ids: a.destinationOfficialIds || [],
      created_at: new Date().toISOString()
    }, 'id');
  }

  async updateDestOfficials(assignId: string, destIds: string[]): Promise<void> {
    const list = await this.fetchAssignments();
    const match = list.find(a => a.id === assignId);
    if (match) {
      match.destinationOfficialIds = destIds;
      await this.saveAssignment(match);
    }
  }

  async deleteAssignment(id: string): Promise<void> {
    await this.client.deleteRecord('assignments', id, 'id');
  }
}
