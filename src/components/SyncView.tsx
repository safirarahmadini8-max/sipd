import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, CloudLightning, Sparkles, FileSpreadsheet, ArrowLeftRight, 
  ArrowUpFromLine, ArrowDownToLine, CheckCircle, 
  AlertTriangle, Play, HelpCircle, Key, Link2, Info, Loader2, Copy, Check
} from 'lucide-react';
import { 
  initAuth, googleSignIn, googleSignOut,
  GoogleSheetsDbWrapper, SupabaseDbWrapper, IDbClient 
} from '../lib/dbClient';
import { createClient } from '@supabase/supabase-js';
import { 
  Employee, Official, DestinationOfficial, 
  SKPDConfig, MasterCost, SubActivity, TravelAssignment 
} from '../types';

interface Props {
  dbType: 'supabase' | 'sheets' | null;
  dbClient: IDbClient | null;
  employees: Employee[];
  officials: Official[];
  destinationOfficials: DestinationOfficial[];
  skpdConfig: SKPDConfig;
  masterCosts: MasterCost[];
  subActivities: SubActivity[];
  assignments: TravelAssignment[];
  onRefresh: () => Promise<void>;
}

export const SyncView: React.FC<Props> = ({
  dbType,
  dbClient,
  employees,
  officials,
  destinationOfficials,
  skpdConfig,
  masterCosts,
  subActivities,
  assignments,
  onRefresh
}) => {
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState('');
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);
  const [isUnauthorizedDomain, setIsUnauthorizedDomain] = useState(false);
  const [isPopupClosed, setIsPopupClosed] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState<string | null>(null);

  // Load Google Auth and Sheet Settings
  useEffect(() => {
    const savedSheetId = localStorage.getItem('GS_SPREADSHEET_ID') || '';
    setSpreadsheetId(savedSheetId);

    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setAccessToken(token);
      },
      () => {
        setGoogleUser(null);
        setAccessToken('');
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const getAuthDomains = () => {
    // Exact domains of the workspace to prevent sandbox iframe lookup failures
    const preCalculated = [
      'ais-dev-b5wwrz2ccvsksbp4uzpayv-63245492416.asia-east1.run.app',
      'ais-pre-b5wwrz2ccvsksbp4uzpayv-63245492416.asia-east1.run.app',
      'localhost',
    ];

    const currentHost = window.location.hostname;
    const list = [...preCalculated];
    
    if (currentHost && !list.includes(currentHost)) {
      list.push(currentHost);
    }

    // Auto-compute dev/pre domain pair dynamically as well
    if (currentHost && currentHost.includes('ais-dev-')) {
      const partner = currentHost.replace('ais-dev-', 'ais-pre-');
      if (!list.includes(partner)) list.push(partner);
    } else if (currentHost && currentHost.includes('ais-pre-')) {
      const partner = currentHost.replace('ais-pre-', 'ais-dev-');
      if (!list.includes(partner)) list.push(partner);
    }

    return list;
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setIsUnauthorizedDomain(false);
    setIsPopupClosed(false);
    setIsSigningIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setAccessToken(res.accessToken);
        const savedSheetId = localStorage.getItem('GS_SPREADSHEET_ID');
        if (savedSheetId) {
          setSpreadsheetId(savedSheetId);
        }
      }
    } catch (err: any) {
      console.error('Sign-in Error detail:', err);
      const isAuthDomainErr = 
        String(err.code || '').includes('unauthorized-domain') || 
        String(err.message || '').includes('unauthorized-domain') ||
        String(err.code || '').includes('unauthorized') ||
        String(err.message || '').includes('unauthorized');
      
      const isPopupClosedErr = 
        String(err.code || '').includes('popup-closed-by-user') || 
        String(err.message || '').includes('popup-closed-by-user');
      
      if (isAuthDomainErr) {
        setIsUnauthorizedDomain(true);
        setErrorMessage('Firebase: Error (auth/unauthorized-domain). Domain aplikasi ini belum terdaftar di daftar Authorized Domains (Domain Terotorisasi) pada Firebase Authentication milik proyek Anda.');
      } else if (isPopupClosedErr) {
        setIsPopupClosed(true);
        setErrorMessage('Firebase: Error (auth/popup-closed-by-user). Jendela masuk Google ditutup sebelum login selesai atau diblokir oleh penjelajah web (browser) Anda.');
      } else {
        setErrorMessage(err.message || 'Gagal masuk akun Google.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleCreateNewSheet = async () => {
    if (!accessToken) return;
    setIsSyncing(true);
    setErrorMessage(null);
    addLog('⏱️ Membuat Google Spreadsheet baru di Drive Anda...');
    try {
      const title = `Database SIPDLITE - ${googleUser?.displayName || 'SKPD PROV NTB'}`;
      // Import SheetsDbClient dynamically/staticly from lib/dbClient
      const { SheetsDbClient } = await import('../lib/dbClient');
      const newSheetId = await SheetsDbClient.createDatabase(accessToken, title);
      setSpreadsheetId(newSheetId);
      localStorage.setItem('GS_SPREADSHEET_ID', newSheetId);
      addLog(`✅ Berhasil membuat spreadsheet baru: ${title}`);
      addLog(`🔑 Spreadsheet ID: ${newSheetId}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal membuat Google Spreadsheet baru.');
      addLog(`❌ Error: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const addLog = (msg: string) => {
    setSyncLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);
  };

  const executeSync = async (mode: 'bidirectional' | 'push' | 'pull') => {
    if (!accessToken) {
      setErrorMessage('Anda harus terhubung dengan akun Google terlebih dahulu.');
      return;
    }
    if (!spreadsheetId.trim()) {
      setErrorMessage('ID Google Spreadsheet harus diisi.');
      return;
    }

    setIsSyncing(true);
    setErrorMessage(null);
    setSuccessInfo(null);
    setSyncLogs([]);
    addLog(`🚀 Memulai Sinkronisasi [Mode: ${mode.toUpperCase()}]`);

    try {
      // Save Spreadsheet ID so it persists
      localStorage.setItem('GS_SPREADSHEET_ID', spreadsheetId.trim());

      const sheetsWrapper = new GoogleSheetsDbWrapper(spreadsheetId.trim(), accessToken);
      
      // Determine Client A (Active Application DB Client) and Client B (Google Sheets)
      let clientA = dbClient;
      const clientB = sheetsWrapper;

      // If active mode is Sheets itself, we can sync with Supabase if Config exists
      if (dbType === 'sheets') {
        const sbUrl = localStorage.getItem('SB_URL');
        const sbKey = localStorage.getItem('SB_KEY');
        if (sbUrl && sbKey) {
          addLog('🔌 Terhubung ke database Supabase tersimpan untuk sinkronisasi...');
          const sbClientObj = createClient(sbUrl, sbKey);
          clientA = new SupabaseDbWrapper(sbClientObj);
        } else {
          addLog('ℹ️ Tidak ada konfigurasi database Supabase eksternal. Sinkronisasi hanya merefresh data dari Sheets.');
          await onRefresh();
          addLog('✅ Penyegaran (refresh) dari Google Sheets selesai!');
          setSuccessInfo('Data Google Sheets berhasil dimuat ulang ke dalam aplikasi.');
          setIsSyncing(false);
          return;
        }
      }

      if (!clientA) {
        throw new Error('Klien basis data aplikasi utama tidak ditemukan atau belum dikonfigurasi.');
      }

      // Convert helpers to match rows
      const toDbEmployee = (e: Employee) => ({
        id: e.id, name: e.name, nip: e.nip, pangkat_gol: e.pangkatGol, jabatan: e.jabatan,
        representation_luar: Number(e.representationLuar || 0), representation_dalam: Number(e.representationDalam || 0)
      });

      const toDbOfficial = (o: Official) => ({
        id: o.id, name: o.name, nip: o.nip, jabatan: o.jabatan, role: o.role
      });

      const toDbDestinationOfficial = (d: DestinationOfficial) => ({
        id: d.id, name: d.name, nip: d.nip, jabatan: d.jabatan, instansi: d.instansi
      });

      const toDbSKPDConfig = (c: SKPDConfig) => ({
        id: 'main', provinsi: c.provinsi || 'Provinsi Nusa Tenggara Barat', nama_skpd: c.namaSkpd, alamat: c.alamat, lokasi: c.lokasi,
        kepala_nama: c.kepalaNama, kepala_nip: c.kepalaNip, kepala_jabatan: c.kepalaJabatan, bendahara_nama: c.bendaharaNama,
        bendahara_nip: c.bendaharaNip, pptk_nama: c.pptkNama, pptk_nip: c.pptkNip, logo: c.logo || ''
      });

      const toDbMasterCost = (c: MasterCost) => ({
        id: c.destination, destination: c.destination, daily_allowance: Number(c.dailyAllowance || 0),
        lodging: Number(c.lodging || 0), transport_bbm: Number(c.transportBbm || 0), sea_transport: Number(c.seaTransport || 0),
        air_transport: Number(c.airTransport || 0), taxi: Number(c.taxi || 0)
      });

      const toDbSubActivity = (s: SubActivity) => ({
        code: s.code, name: s.name, budget_code: s.budgetCode || '', anggaran: Number(s.anggaran || 0), spd: String(s.spd || '0'),
        triwulan1: Number(s.triwulan1 || 0), triwulan2: Number(s.triwulan2 || 0), triwulan3: Number(s.triwulan3 || 0), triwulan4: Number(s.triwulan4 || 0)
      });

      const toDbAssignment = (a: TravelAssignment) => ({
        id: a.id, assignment_number: a.assignmentNumber, sub_activity_code: a.subActivityCode, purpose: a.purpose,
        origin: a.origin, travel_type: a.travelType, transportation: a.transportation, destination: a.destination,
        start_date: a.startDate, end_date: a.endDate, duration_days: Number(a.durationDays || 0),
        selected_employee_ids: a.selectedEmployeeIds, costs: a.costs, signed_at: a.signedAt, sign_date: a.signDate,
        pptk_id: a.pptkId || '', signer_id: a.signerId || '', bendahara_id: a.bendaharaId || '',
        destination_official_ids: a.destinationOfficialIds || []
      });

      // Fetch from sheets directly to compare or pull
      addLog('📥 Mengambil data dari Google Sheets...');
      const sheetsEmployees = await clientB.fetchEmployees();
      const sheetsOfficials = await clientB.fetchOfficials();
      const sheetsDestOfficials = await clientB.fetchDestinationOfficials();
      const sheetsSKPD = await clientB.fetchSKPDConfig();
      const sheetsCosts = await clientB.fetchMasterCosts();
      const sheetsSubs = await clientB.fetchSubActivities();
      const sheetsAssignments = await clientB.fetchAssignments();

      addLog('📲 Mengambil data dari aplikasi (Supabase)...');
      const supabaseEmployees = await clientA.fetchEmployees();
      const supabaseOfficials = await clientA.fetchOfficials();
      const supabaseDestOfficials = await clientA.fetchDestinationOfficials();
      const supabaseSKPD = await clientA.fetchSKPDConfig();
      const supabaseCosts = await clientA.fetchMasterCosts();
      const supabaseSubs = await clientA.fetchSubActivities();
      const supabaseAssignments = await clientA.fetchAssignments();

      let finalEmployees: Employee[] = [];
      let finalOfficials: Official[] = [];
      let finalDestOfficials: DestinationOfficial[] = [];
      let finalSKPD: SKPDConfig = skpdConfig;
      let finalCosts: MasterCost[] = [];
      let finalSubs: SubActivity[] = [];
      let finalAssignments: TravelAssignment[] = [];

      if (mode === 'push') {
        addLog('📤 Menyalin seluruh data aplikasi ke Google Sheets...');
        finalEmployees = supabaseEmployees;
        finalOfficials = supabaseOfficials;
        finalDestOfficials = supabaseDestOfficials;
        finalSKPD = supabaseSKPD;
        finalCosts = supabaseCosts;
        finalSubs = supabaseSubs;
        finalAssignments = supabaseAssignments;
      } else if (mode === 'pull') {
        addLog('📥 Menyalin seluruh data Google Sheets ke aplikasi...');
        finalEmployees = sheetsEmployees;
        finalOfficials = sheetsOfficials;
        finalDestOfficials = sheetsDestOfficials;
        finalSKPD = sheetsSKPD;
        finalCosts = sheetsCosts;
        finalSubs = sheetsSubs;
        finalAssignments = sheetsAssignments;
      } else if (mode === 'bidirectional') {
        addLog('🔄 Menggabungkan data dari kedua sumber...');

        // 1. Merge Employees (Keys: id)
        const employeesMap = new Map<string, Employee>();
        sheetsEmployees.forEach(e => employeesMap.set(e.id, e));
        supabaseEmployees.forEach(e => {
          // If already exists, we combine them. Let Supabase version take precedence
          const existing = employeesMap.get(e.id);
          employeesMap.set(e.id, existing ? { ...existing, ...e } : e);
        });
        finalEmployees = Array.from(employeesMap.values());

        // 2. Merge Officials (Keys: id)
        const officialsMap = new Map<string, Official>();
        sheetsOfficials.forEach(o => officialsMap.set(o.id, o));
        supabaseOfficials.forEach(o => {
          const existing = officialsMap.get(o.id);
          officialsMap.set(o.id, existing ? { ...existing, ...o } : o);
        });
        finalOfficials = Array.from(officialsMap.values());

        // 3. Merge Destination Officials (Keys: id)
        const destMap = new Map<string, DestinationOfficial>();
        sheetsDestOfficials.forEach(d => destMap.set(d.id, d));
        supabaseDestOfficials.forEach(d => {
          const existing = destMap.get(d.id);
          destMap.set(d.id, existing ? { ...existing, ...d } : d);
        });
        finalDestOfficials = Array.from(destMap.values());

        // 4. Merge SKPD Config (Single object, match keys)
        finalSKPD = {
          ...sheetsSKPD,
          ...supabaseSKPD,
          namaSkpd: supabaseSKPD.namaSkpd || sheetsSKPD.namaSkpd || skpdConfig.namaSkpd
        };

        // 5. Merge Master Costs (Keys: destination)
        const costsMap = new Map<string, MasterCost>();
        sheetsCosts.forEach(c => costsMap.set(c.destination, c));
        supabaseCosts.forEach(c => {
          const existing = costsMap.get(c.destination);
          costsMap.set(c.destination, existing ? { ...existing, ...c } : c);
        });
        finalCosts = Array.from(costsMap.values());

        // 6. Merge Sub Activities (Keys: code)
        const subsMap = new Map<string, SubActivity>();
        sheetsSubs.forEach(s => subsMap.set(s.code, s));
        supabaseSubs.forEach(s => {
          const existing = subsMap.get(s.code);
          subsMap.set(s.code, existing ? { ...existing, ...s } : s);
        });
        finalSubs = Array.from(subsMap.values());

        // 7. Merge Assignments (Keys: id)
        const assignMap = new Map<string, TravelAssignment>();
        sheetsAssignments.forEach(a => assignMap.set(a.id, a));
        supabaseAssignments.forEach(a => {
          const existing = assignMap.get(a.id);
          assignMap.set(a.id, existing ? { ...existing, ...a } : a);
        });
        finalAssignments = Array.from(assignMap.values());
      }

      // WRITE TO GOOGLE SHEETS
      addLog(`💾 Menulis ke Google Sheets (${spreadsheetId.trim()})...`);
      await clientB.client.writeTable('employees', finalEmployees.map(toDbEmployee));
      addLog(`✔️ Sheets: data pegawai ditulis (${finalEmployees.length} baris)`);

      await clientB.client.writeTable('officials', finalOfficials.map(toDbOfficial));
      addLog(`✔️ Sheets: data pejabat internal ditulis (${finalOfficials.length} baris)`);

      await clientB.client.writeTable('destination_officials', finalDestOfficials.map(toDbDestinationOfficial));
      addLog(`✔️ Sheets: data pejabat luar ditulis (${finalDestOfficials.length} baris)`);

      await clientB.client.writeTable('skpd_config', [toDbSKPDConfig(finalSKPD)]);
      addLog(`✔️ Sheets: profil SKPD ditulis`);

      await clientB.client.writeTable('master_costs', finalCosts.map(toDbMasterCost));
      addLog(`✔️ Sheets: daftar biaya ditulis (${finalCosts.length} baris)`);

      await clientB.client.writeTable('sub_activities', finalSubs.map(toDbSubActivity));
      addLog(`✔️ Sheets: daftar sub kegiatan ditulis (${finalSubs.length} baris)`);

      await clientB.client.writeTable('assignments', finalAssignments.map(toDbAssignment));
      addLog(`✔️ Sheets: riwayat perjalanan ditulis (${finalAssignments.length} baris)`);

      // WRITE TO SUPABASE (App)
      addLog('💾 Mengunggah ke aplikasi (Supabase)...');
      
      const sbWrapper = clientA as SupabaseDbWrapper;

      // Clean load on Supabase to ensure clean sync if mode is pull or bidirectional
      if (mode === 'pull' || mode === 'bidirectional') {
        const errorLogs: string[] = [];

        // Clear existing tables in database
        addLog('🧹 Merapikan database sebelum memperbarui...');
        try {
          await sbWrapper.client.from('employees').delete().neq('id', '___');
          await sbWrapper.client.from('officials').delete().neq('id', '___');
          await sbWrapper.client.from('destination_officials').delete().neq('id', '___');
          await sbWrapper.client.from('master_costs').delete().neq('destination', '___');
          await sbWrapper.client.from('sub_activities').delete().neq('code', '___');
          await sbWrapper.client.from('assignments').delete().neq('id', '___');
        } catch (clearErr: any) {
          addLog(`⚠️ Perhatian saat pembersihan database: ${clearErr.message || clearErr}`);
        }

        // Parallel Upserts for faster bulk write in Supabase
        addLog('📤 Memuat ulang data Pegawai ke Supabase...');
        if (finalEmployees.length > 0) {
          const { error } = await sbWrapper.client.from('employees').upsert(finalEmployees.map(toDbEmployee));
          if (error) errorLogs.push(`Pegawai: ${error.message}`);
        }

        addLog('📤 Memuat ulang data Pejabat ke Supabase...');
        if (finalOfficials.length > 0) {
          const { error } = await sbWrapper.client.from('officials').upsert(finalOfficials.map(toDbOfficial));
          if (error) errorLogs.push(`Pejabat Internal: ${error.message}`);
        }

        addLog('📤 Memuat ulang data Pejabat Luar ke Supabase...');
        if (finalDestOfficials.length > 0) {
          const { error } = await sbWrapper.client.from('destination_officials').upsert(finalDestOfficials.map(toDbDestinationOfficial));
          if (error) errorLogs.push(`Pejabat Luar: ${error.message}`);
        }

        addLog('📤 Memuat ulang Profil SKPD ke Supabase...');
        const { error: skpdErr } = await sbWrapper.client.from('skpd_config').upsert(toDbSKPDConfig(finalSKPD));
        if (skpdErr) errorLogs.push(`Profil SKPD: ${skpdErr.message}`);

        addLog('📤 Memuat ulang Data Biaya ke Supabase...');
        if (finalCosts.length > 0) {
          const { error } = await sbWrapper.client.from('master_costs').upsert(finalCosts.map(toDbMasterCost));
          if (error) errorLogs.push(`Data Biaya: ${error.message}`);
        }

        addLog('📤 Memuat ulang Sub Kegiatan ke Supabase...');
        if (finalSubs.length > 0) {
          const { error } = await sbWrapper.client.from('sub_activities').upsert(finalSubs.map(toDbSubActivity));
          if (error) errorLogs.push(`Sub Kegiatan: ${error.message}`);
        }

        addLog('📤 Memuat ulang Riwayat Perjalanan ke Supabase...');
        if (finalAssignments.length > 0) {
          const { error } = await sbWrapper.client.from('assignments').upsert(finalAssignments.map(toDbAssignment));
          if (error) errorLogs.push(`Riwayat SPT: ${error.message}`);
        }

        if (errorLogs.length > 0) {
          addLog(`⚠️ Beberapa data gagal ditulis ke Supabase:\n${errorLogs.join('\n')}`);
        } else {
          addLog('✔️ Seluruh data berhasil ditulis ke Supabase!');
        }
      } else {
        addLog('✔️ Database aplikasi (Supabase) sudah up-to-date.');
      }

      addLog('🔄 Menyegarkan memori aplikasi...');
      await onRefresh();

      addLog('🎉 SINKRONISASI BERHASIL DISUKSESKAN!');
      setSuccessInfo(
        mode === 'bidirectional' 
          ? 'Sinkronisasi dua arah berhasil dilakukan. Seluruh data di aplikasi dan Google Sheets sekarang sama persis!'
          : mode === 'push'
            ? 'Seluruh data aplikasi saat ini berhasil diunggah dan menimpa data di Google Spreadsheet Anda.'
            : 'Seluruh data dari Google Spreadsheet berhasil ditarik dan dimuat ke dalam aplikasi.'
      );
    } catch (err: any) {
      console.error('Sync Error:', err);
      setErrorMessage(err.message || 'Gagal melakukan sinkronisasi data.');
      addLog(`❌ Gagal: ${err.message || err}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-['Tahoma'] animate-in fade-in duration-300">
      
      {/* Overview Card */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
            <CloudLightning className="text-blue-500 animate-pulse" size={20} /> Pusat Sinkronisasi Spreadsheet
          </h3>
          <p className="text-slate-400 text-xs mt-1 max-w-xl">
            SIPDLITE mendukung sinkronisasi data secara penuh dengan Google Sheets. Anda dapat membackup data, mendowload database dari Google Sheets, atau menyatukan data jika bekerja di berbagai perangkat.
          </p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-black text-xs">
            {dbType === 'supabase' ? 'SQL' : 'GS'}
          </div>
          <div>
            <p className="text-[10px] uppercase font-black text-slate-400">Database Utama</p>
            <p className="text-xs font-bold text-slate-700">{dbType === 'supabase' ? 'Supabase SQL Cloud' : 'Google Sheets DB'}</p>
          </div>
        </div>
      </div>

      {/* Error & Success Messages */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-2xl p-4 text-xs italic flex items-start gap-2.5">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
          <span className="font-medium text-slate-700 leading-relaxed">
            <span className="font-black text-red-600 block mb-1">Gagal Menghubungkan Google:</span>
            {errorMessage}
          </span>
        </div>
      )}

      {/* Troubleshooting guide when auth/popup-closed-by-user occurs */}
      {isPopupClosed && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 text-xs text-slate-800 space-y-4 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2.5 pb-2 border-b border-amber-200">
            <HelpCircle size={20} className="text-amber-600 animate-pulse" />
            <span className="font-black text-amber-900 text-sm uppercase tracking-tight">Cara Mengatasi Kendala Jendela Pop-up Login</span>
          </div>

          <p className="text-slate-600 font-medium leading-relaxed font-sans">
            Proses Otentikasi Google memerlukan pembukaan jendela pop-up. Kendala ini biasanya terjadi jika Anda sedang membuka aplikasi di dalam **iFrame pratinjau (preview frame) AI Studio**, atau penjelajah web (browser) Anda memblokir jendela pop-up. Silakan ikuti langkah penanganan berikut:
          </p>

          <div className="space-y-4 pl-1 font-sans">
            <div className="flex gap-3">
              <span className="font-black text-amber-900 bg-amber-200/50 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px]">1</span>
              <div>
                <p className="font-bold text-slate-800">Buka Aplikasi di Tab Baru (Sangat Disarankan)</p>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Iframe di dalam boks AI Studio membatasi pembukaan pop-up pihak ketiga demi keamanan. Silakan klik tombol **"Open in a new tab" / "Buka di tab baru"** (di pojok kanan atas layar AI Studio atau gunakan URL pratinjau langsung Anda) untuk menjalankan aplikasi secara penuh di luar iFrame.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="font-black text-amber-900 bg-amber-200/50 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px]">2</span>
              <div>
                <p className="font-bold text-slate-800">Matikan Pemblokir Pop-up (Popup Blocker)</p>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Periksa bagian ujung kanan bilah alamat URL (address bar) browser Anda. Jika terdapat ikon bertanda silang pemblokir pop-up, klik ikon tersebut dan pilih <span className="font-bold text-slate-700 bg-white border px-1 rounded">"Always allow popups"</span> (Selalu izinkan pop-up dari situs ini).
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="font-black text-amber-900 bg-amber-200/50 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px]">3</span>
              <div>
                <p className="font-bold text-slate-800">Biarkan Jendela Google Selesai Memuat</p>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Pastikan Anda tidak menutup jendela kecil Google Sign-In yang muncul secara manual sebelum pemilihan akun dan perizinan tuntas.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Troubleshooting guide when auth/unauthorized-domain occurs */}
      {isUnauthorizedDomain && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 text-xs text-slate-800 space-y-4 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2.5 pb-2 border-b border-amber-200">
            <HelpCircle size={20} className="text-amber-600 animate-pulse" />
            <span className="font-black text-amber-900 text-sm uppercase tracking-tight">Panduan Mengatasi "unauthorized-domain" di Firebase</span>
          </div>

          <p className="text-slate-600 font-medium leading-relaxed">
            Sistem autentikasi Google Proyek Anda mendeteksi bahwa domain website ini belum didaftarkan di setelan Authorized Domains pada Firebase Console Anda. Silakan tambahkan domain berikut agar Google mengizinkan proses login:
          </p>

          <div className="space-y-4 pl-1">
            <div className="flex gap-3">
              <span className="font-black text-amber-900 bg-amber-200/50 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px]">1</span>
              <div>
                <p className="font-bold text-slate-800">Buka Firebase Console</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Klik tautan berikut untuk membuka proyek Firebase Anda:{' '}
                  <a 
                    href="https://console.firebase.google.com/" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-blue-600 hover:underline font-black inline-flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-sm"
                  >
                    Buka Firebase Console &rarr;
                  </a>
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="font-black text-amber-900 bg-amber-200/50 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px]">2</span>
              <div>
                <p className="font-bold text-slate-800">Masuk ke Menu Authorized Domains</p>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Pilih Proyek Anda &rarr; klik menu <span className="font-bold text-slate-800 bg-white px-1.5 py-0.5 rounded border border-amber-100 shadow-sm">Authentication</span> &rarr; klik tab halaman <span className="font-bold text-slate-800 bg-white px-1.5 py-0.5 rounded border border-amber-100 shadow-sm">Settings</span> &rarr; klik sub-menu <span className="font-bold text-slate-800 bg-white px-1.5 py-0.5 rounded border border-amber-100 shadow-sm">Authorized domains</span>.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="font-black text-amber-900 bg-amber-200/50 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px]">3</span>
              <div>
                <p className="font-bold text-slate-800">Tambahkan Domain Berikut</p>
                <p className="text-[11px] text-slate-500 mt-0.5 mb-2 leading-relaxed">
                  Klik tombol <span className="font-bold text-slate-700">Add domain</span> (Tambahkan domain), lalu masukkan nilai domain berikut satu per satu:
                </p>
                <div className="space-y-2 mt-2">
                  {getAuthDomains().map(dom => (
                    <div key={dom} className="flex items-center justify-between bg-white border border-amber-150 rounded-xl px-4 py-2.5 font-mono text-[10px] text-slate-700 max-w-lg shadow-sm">
                      <span className="truncate pr-4 font-bold text-slate-800">{dom}</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(dom);
                          setCopiedDomain(dom);
                          setTimeout(() => setCopiedDomain(null), 2500);
                        }}
                        className="text-slate-400 hover:text-blue-600 flex items-center gap-1 flex-shrink-0 transition"
                      >
                        {copiedDomain === dom ? (
                          <span className="text-[10px] text-emerald-600 font-sans font-black flex items-center gap-1.5">
                            <CheckCircle size={13} className="text-emerald-500 animate-scale" /> Tersalin!
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 hover:text-slate-800 font-sans font-bold flex items-center gap-1">
                            <Copy size={13} /> Salin Domain
                          </span>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="font-black text-amber-900 bg-amber-200/50 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px]">4</span>
              <div>
                <p className="font-bold text-slate-800">Muat Ulang Halaman & Hubungkan Kembali</p>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Setelah menyimpan setelan domain di Firebase Console, klik tombol muat ulang halaman (refresh browser) atau coba hubungkan akun kembali dengan mengeklik tombol <span className="font-black text-emerald-700 bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-sm">Hubungkan Akun Google</span>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {successInfo && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl p-4 text-xs font-bold flex items-start gap-2.5">
          <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{successInfo}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Connection Setup Area (Left column) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
            <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
              <Key size={14} className="text-blue-500" /> Kredensial Google
            </h4>

            {!googleUser ? (
              <div className="text-center py-4 space-y-3">
                <p className="text-xs text-slate-400">
                  Untuk melakukan sinkronisasi dengan Google Spreadsheet, silahkan masuk menggunakan Akun Google Anda terlebih dahulu.
                </p>
                <button
                  onClick={handleGoogleSignIn}
                  disabled={isSigningIn}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider py-3.5 rounded-xl flex items-center justify-center gap-2 transition duration-200 hover:scale-[1.01]"
                >
                  {isSigningIn ? (
                    <>
                      <Loader2 className="animate-spin" size={16} /> Menghubungkan...
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet size={16} /> Hubungkan Akun Google
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in">
                {/* User Info Card */}
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
                  {googleUser.photoURL ? (
                    <img src={googleUser.photoURL} alt="Foto Profil" className="w-10 h-10 rounded-full border border-slate-700" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white text-lg font-black flex items-center justify-center">
                      {googleUser.displayName?.charAt(0)}
                    </div>
                  )}
                  <div className="text-left overflow-hidden">
                    <p className="text-xs font-black text-white leading-tight truncate">{googleUser.displayName}</p>
                    <p className="text-[10px] text-slate-500 truncate">{googleUser.email}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Link2 size={12} /> Google Spreadsheet ID
                  </label>
                  <input
                    type="text"
                    placeholder="Masukkan Spreadsheet ID..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-800 font-mono focus:ring-2 focus:ring-blue-500 outline-none transition"
                    value={spreadsheetId}
                    onChange={e => setSpreadsheetId(e.target.value)}
                  />
                  <p className="text-[9px] text-slate-400 font-bold italic leading-snug">
                    Dapat disalin dari URL spreadsheet (antara d/ dan /edit).
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCreateNewSheet}
                  disabled={isSyncing}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-wider py-3.5 rounded-xl flex items-center justify-center gap-2 transition"
                >
                  <Sparkles size={14} className="text-amber-500" /> Buat File Spreadsheet Baru Otomatis
                </button>
              </div>
            )}
          </div>

          {/* Quick Stats of local App */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-3">
            <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
              <Info size={14} className="text-blue-500" /> Status Database Aplikasi
            </h4>
            <div className="space-y-2 text-xs divide-y divide-slate-50">
              <div className="flex justify-between py-2">
                <span className="text-slate-400">Pegawai (Employees)</span>
                <span className="font-black text-slate-700">{employees.length}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-400">Pejabat Internal (Officials)</span>
                <span className="font-black text-slate-700">{officials.length}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-400">Pejabat Luar (Destination Officials)</span>
                <span className="font-black text-slate-700">{destinationOfficials.length}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-400">Sub Kegiatan (Sub Activities)</span>
                <span className="font-black text-slate-700">{subActivities.length}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-400">Riwayat Perjalanan (Travels / SPT)</span>
                <span className="font-black text-slate-700">{assignments.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sync Controls & Output Log (Right column) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-5">
            <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
              <RefreshCw size={14} className="text-blue-500 animate-spin" /> Tombol Eksekusi Sinkronisasi
            </h4>

            <div className="space-y-4">
              {/* Option 1: Bidirectional */}
              <button
                disabled={!googleUser || !spreadsheetId || isSyncing}
                onClick={() => executeSync('bidirectional')}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 text-white p-5 rounded-2xl flex items-center gap-4 transition text-left group overflow-hidden relative shadow-lg shadow-blue-100"
              >
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white flex-shrink-0 group-hover:scale-110 transition">
                  <ArrowLeftRight size={22} />
                </div>
                <div>
                  <h5 className="font-black text-xs uppercase tracking-wider">Metode Sinkronisasi Dua Arah</h5>
                  <p className="text-[10px] text-blue-100 mt-1 leading-snug">
                    Menyatukan data dari kedua database. Data baru atau perubahan di Google Sheets dan di Supabase akan saling melengkapi tanpa menghapus data lain.
                  </p>
                </div>
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Option 2: Push */}
                <button
                  disabled={!googleUser || !spreadsheetId || isSyncing}
                  onClick={() => executeSync('push')}
                  className="bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-100 disabled:opacity-40 text-emerald-800 p-4 rounded-2xl flex items-center gap-3 transition text-left group"
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition">
                    <ArrowUpFromLine size={18} />
                  </div>
                  <div>
                    <h5 className="font-black text-[10px] uppercase tracking-wider leading-none text-emerald-900">Ekspor (Push)</h5>
                    <p className="text-[9px] text-emerald-600 mt-1.5 leading-snug font-medium">
                      Kirim data aplikasi ke Google Sheets. Seluruh isi spreadsheet akan ditimpa data aplikasi.
                    </p>
                  </div>
                </button>

                {/* Option 3: Pull */}
                <button
                  disabled={!googleUser || !spreadsheetId || isSyncing}
                  onClick={() => executeSync('pull')}
                  className="bg-sky-50 hover:bg-sky-100/80 border border-sky-100 disabled:opacity-40 text-sky-800 p-4 rounded-2xl flex items-center gap-3 transition text-left group"
                >
                  <div className="w-10 h-10 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition">
                    <ArrowDownToLine size={18} />
                  </div>
                  <div>
                    <h5 className="font-black text-[10px] uppercase tracking-wider leading-none text-sky-900">Impor (Pull)</h5>
                    <p className="text-[9px] text-sky-600 mt-1.5 leading-snug font-medium">
                      Tarik data Google Sheets ke aplikasi. Data aplikasi Anda (Supabase) akan ditimpa data spreadsheet.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Sync Console Logs */}
          <div className="bg-slate-950 border border-slate-900 rounded-3xl p-5 text-left shadow-lg overflow-hidden flex flex-col h-[280px]">
            <div className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-widest border-b border-slate-900 pb-3 mb-3 flex items-center justify-between">
              <span>🖥️ Konsol Sinkronisasi</span>
              {isSyncing && <Loader2 className="animate-spin text-blue-500" size={12} />}
            </div>
            <div className="flex-1 font-mono text-[10px] text-slate-300 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-slug select-text">
              {syncLogs.length === 0 ? (
                <div className="text-slate-600 italic h-full flex items-center justify-center text-center">
                  Menunggu eksekusi sinkronisasi untuk menampilkan log aktivitas...
                </div>
              ) : (
                syncLogs.map((log, index) => (
                  <div key={index} className="leading-relaxed border-l-2 border-blue-900 pl-2">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
