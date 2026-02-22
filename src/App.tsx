
import React, { useState, useEffect, useMemo } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  ViewMode, Employee, TravelAssignment, PrintType, 
  MasterCost, SubActivity, SKPDConfig, Official, TravelCost, DestinationOfficial 
} from './types';
import { EmployeeForm } from './components/EmployeeForm';
import { OfficialForm } from './components/OfficialForm';
import { TravelAssignmentForm } from './components/TravelAssignmentForm';
import { MasterDataForm } from './components/MasterDataForm';
import { SKPDForm } from './components/SKPDForm';
import { ReportView } from './components/ReportView';
import { DatabaseSetup } from './components/DatabaseSetup';
import { DestinationOfficialManager } from './components/DestinationOfficialManager';
import { DestinationOfficialForm } from './components/DestinationOfficialForm';
import { 
  SPTTemplate, 
  SPPDFrontTemplate,
  SPPDBackTemplate,
  LampiranIIITemplate,
  KuitansiTemplate, 
  DaftarPenerimaanTemplate,
  PejabatTujuanTemplate
} from './components/PrintDocuments';
import { 
  LayoutDashboard, Users, FileText, Printer, ChevronLeft, 
  Trash2, Calendar, Plus, Database, Edit2, Building2, 
  BarChart3, RefreshCw, LogOut, ShieldCheck, 
  Landmark, TrendingUp, AlertCircle, Coins, Wallet, UserSearch, AlertTriangle, UserPlus, Layers, MapPin, PlusCircle
} from 'lucide-react';
// Import formatDateID to fix "Cannot find name 'formatDateID'" error
import { formatNumber, formatDateID } from './utils';
import { OFFICE_NAME, OFFICE_ADDRESS, HEAD_OF_OFFICE, TREASURER } from './constants';

const App: React.FC = () => {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [dbConfigured, setDbConfigured] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.DASHBOARD);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInvalidApiKey, setIsInvalidApiKey] = useState(false);
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [officials, setOfficials] = useState<Official[]>([]);
  const [destinationOfficials, setDestinationOfficials] = useState<DestinationOfficial[]>([]);
  const [skpdConfig, setSkpdConfig] = useState<SKPDConfig>({
    provinsi: 'Provinsi Nusa Tenggara Barat',
    namaSkpd: OFFICE_NAME,
    alamat: OFFICE_ADDRESS,
    lokasi: 'MATARAM',
    kepalaNama: HEAD_OF_OFFICE.name,
    kepalaNip: HEAD_OF_OFFICE.nip,
    kepalaJabatan: 'KEPALA DINAS',
    bendaharaNama: TREASURER.name,
    bendaharaNip: TREASURER.nip,
    pptkNama: 'Novi Haryanto, S.Adm',
    pptkNip: '197111201991031003',
    logo: undefined
  });
  const [masterCosts, setMasterCosts] = useState<MasterCost[]>([]);
  const [subActivities, setSubActivities] = useState<SubActivity[]>([]);
  const [assignments, setAssignments] = useState<TravelAssignment[]>([]);

  const [activeAssignment, setActiveAssignment] = useState<TravelAssignment | null>(null);
  const [activeDestOfficial, setActiveDestOfficial] = useState<DestinationOfficial | null>(null);
  const [targetBlockIndex, setTargetBlockIndex] = useState<number>(0); // 0:II, 1:III, 2:IV
  const [editingAssignment, setEditingAssignment] = useState<TravelAssignment | null>(null);
  const [printType, setPrintType] = useState<PrintType>(PrintType.SPT);

  const [isDestManagerOpen, setIsDestManagerOpen] = useState(false);
  const [currentAssignForDest, setCurrentAssignForDest] = useState<TravelAssignment | null>(null);

  const financialStats = useMemo(() => {
    const realizationMap = (assignments || []).reduce((acc: Record<string, number>, curr: TravelAssignment) => {
      const code = curr.subActivityCode;
      const totalAssignmentCost = (curr.costs || []).reduce((sum: number, cost: TravelCost) => {
        const daily = (Number(cost.dailyAllowance) || 0) * (Number(cost.dailyDays) || 0);
        const lodging = (Number(cost.lodging) || 0) * (Number(cost.lodgingDays) || 0);
        const transport = (Number(cost.transportBbm) || 0) + (Number(cost.seaTransport) || 0) + (Number(cost.airTransport) || 0) + (Number(cost.taxi) || 0);
        const repres = (Number(cost.representation) || 0) * (Number(cost.representationDays) || 0);
        return sum + daily + lodging + transport + repres;
      }, 0);
      acc[code] = (Number(acc[code]) || 0) + Number(totalAssignmentCost);
      return acc;
    }, {} as Record<string, number>);

    // Ambil daftar tujuan unik per sub kegiatan
    const destinationMap = (assignments || []).reduce((acc: Record<string, Set<string>>, curr: TravelAssignment) => {
      const code = curr.subActivityCode;
      if (!acc[code]) acc[code] = new Set();
      acc[code].add(curr.destination);
      return acc;
    }, {} as Record<string, Set<string>>);

    const totalAnggaran = (subActivities || []).reduce((sum: number, s: SubActivity) => sum + (Number(s.anggaran) || 0), 0);
    const totalSpd = (subActivities || []).reduce((sum: number, s: SubActivity) => sum + (Number(s.spd) || 0), 0);
    const totalRealisasi = Object.values(realizationMap).reduce((sum: number, v: number) => sum + (Number(v) || 0), 0);

    const detailedStats = subActivities.map(sub => {
      const realisasi = realizationMap[sub.code] || 0;
      const spdVal = Number(sub.spd) || 0;
      const anggaranVal = Number(sub.anggaran) || 0;
      return {
        ...sub,
        realisasi,
        sisaSpd: spdVal - realisasi,
        sisaAnggaran: anggaranVal - realisasi,
        destinations: Array.from(destinationMap[sub.code] || [])
      };
    });

    return {
      totals: {
        anggaran: totalAnggaran,
        spd: totalSpd,
        realisasi: totalRealisasi,
        sisaSpd: Number(totalSpd) - Number(totalRealisasi),
        sisaAnggaran: Number(totalAnggaran) - Number(totalRealisasi)
      },
      details: detailedStats
    };
  }, [subActivities, assignments]);

  useEffect(() => {
    const savedUrl = localStorage.getItem('SB_URL');
    const savedKey = localStorage.getItem('SB_KEY');
    if (savedUrl && savedKey) {
      const client = createClient(savedUrl, savedKey);
      setSupabase(client);
      setDbConfigured(true);
    } else {
      setLoading(false);
    }
  }, []);

  const handleConnectDb = (url: string, key: string) => {
    localStorage.setItem('SB_URL', url);
    localStorage.setItem('SB_KEY', key);
    const client = createClient(url, key);
    setSupabase(client);
    setDbConfigured(true);
  };

  const handleDisconnectDb = () => {
    localStorage.removeItem('SB_URL');
    localStorage.removeItem('SB_KEY');
    window.location.reload();
  };

  const refreshData = async () => {
    if (!supabase) return;
    setLoading(true);
    setError(null);
    setIsInvalidApiKey(false);
    
    try {
      const [
        { data: empData, error: empErr }, 
        { data: offData, error: offErr }, 
        { data: destOffData, error: destErr },
        { data: skpdData, error: skpdErr }, 
        { data: costData, error: costErr }, 
        { data: subData, error: subErr }, 
        { data: assignData, error: assignErr }
      ] = await Promise.all([
        supabase.from('employees').select('*').order('name'),
        supabase.from('officials').select('*').order('name'),
        supabase.from('destination_officials').select('*').order('name'),
        supabase.from('skpd_config').select('*').eq('id', 'main').maybeSingle(),
        supabase.from('master_costs').select('*').order('destination'),
        supabase.from('sub_activities').select('*').order('code'),
        supabase.from('assignments').select('*').order('created_at', { ascending: false })
      ]);

      const anyErr = empErr || offErr || destErr || (skpdErr && skpdErr.code !== 'PGRST116') || costErr || subErr || assignErr;
      
      if (anyErr) {
        if (anyErr.message.toLowerCase().includes('apikey') || anyErr.message.toLowerCase().includes('invalid api key')) {
          setIsInvalidApiKey(true);
        }
        throw anyErr;
      }

      if (empData) setEmployees(empData.map(e => ({ 
        id: e.id, name: e.name, nip: e.nip, pangkatGol: e.pangkat_gol, 
        jabatan: e.jabatan, representationLuar: e.representation_luar, 
        representationDalam: e.representation_dalam 
      })));
      if (offData) setOfficials(offData);
      if (destOffData) setDestinationOfficials(destOffData);
      if (skpdData) setSkpdConfig({ 
        provinsi: skpdData.provinsi, namaSkpd: skpdData.nama_skpd, 
        alamat: skpdData.alamat, lokasi: skpdData.lokasi, 
        kepalaNama: skpdData.kepala_nama, kepalaNip: skpdData.kepala_nip, 
        kepalaJabatan: skpdData.kepala_jabatan, bendaharaNama: skpdData.bendahara_nama, 
        bendaharaNip: skpdData.bendahara_nip, pptkNama: skpdData.pptk_nama, 
        pptkNip: skpdData.pptk_nip, logo: skpdData.logo 
      });
      if (costData) setMasterCosts(costData.map(c => ({ 
        destination: c.destination, dailyAllowance: Number(c.daily_allowance), 
        lodging: Number(c.lodging), transportBbm: Number(c.transport_bbm), 
        seaTransport: Number(c.sea_transport), airTransport: Number(c.air_transport), 
        taxi: Number(c.taxi) 
      })));
      if (subData) setSubActivities(subData.map(s => ({
        code: s.code,
        name: s.name,
        budgetCode: s.budget_code,
        anggaran: Number(s.anggaran || 0),
        spd: s.spd || '',
        triwulan1: Number(s.triwulan1 || 0),
        triwulan2: Number(s.triwulan2 || 0),
        triwulan3: Number(s.triwulan3 || 0),
        triwulan4: Number(s.triwulan4 || 0)
      })));
      if (assignData) setAssignments(assignData.map(a => ({ 
        ...a, selectedEmployeeIds: a.selected_employee_ids, travelType: a.travel_type, 
        assignmentNumber: a.assignment_number, subActivityCode: a.sub_activity_code, 
        startDate: a.start_date, endDate: a.end_date, durationDays: a.duration_days, 
        signerId: a.signer_id, pptkId: a.pptk_id, bendaharaId: a.bendahara_id, 
        signDate: a.sign_date, signedAt: a.signed_at,
        destinationOfficialIds: a.destination_official_ids || []
      })));
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal memuat data dari database');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (dbConfigured) refreshData(); }, [dbConfigured]);

  const handleSaveAssignment = async (data: TravelAssignment) => {
    if (!supabase) return;
    // Fix: access destinationOfficialIds from data (camelCase) to save to DB (snake_case)
    const { error } = await supabase.from('assignments').upsert({
      id: data.id, assignment_number: data.assignmentNumber, sub_activity_code: data.subActivityCode, 
      purpose: data.purpose, origin: data.origin, travel_type: data.travelType, 
      transportation: data.transportation, destination: data.destination, 
      start_date: data.startDate, end_date: data.endDate, duration_days: data.durationDays, 
      selected_employee_ids: data.selectedEmployeeIds, costs: data.costs, 
      signed_at: data.signedAt, sign_date: data.signDate, pptk_id: data.pptkId, 
      signer_id: data.signerId, bendahara_id: data.bendaharaId,
      destination_official_ids: data.destinationOfficialIds || []
    });
    if (error) alert(`Gagal menyimpan: ${error.message}`);
    else { await refreshData(); setViewMode(ViewMode.TRAVEL_LIST); }
  };

  const handleUpdateDestOfficials = async (assignId: string, destIds: string[]) => {
    if (!supabase) return;
    // Fix: Use 'destIds' parameter instead of undefined 'ids' variable
    const { error } = await supabase.from('assignments').update({ 
      destination_official_ids: destIds 
    }).eq('id', assignId);
    if (error) alert(error.message);
    else await refreshData();
  };

  if (!dbConfigured && !loading) return <DatabaseSetup onConnect={handleConnectDb} />;
  if (loading) return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center flex-col"><RefreshCw className="animate-spin text-blue-400 mb-4" size={48} /><h2 className="font-black text-xl tracking-widest italic">MENGHUBUNGKAN...</h2></div>;
  
  if (error) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center font-['Tahoma']">
      <div className="max-w-md bg-slate-900 p-8 rounded-3xl shadow-2xl border border-red-900/30 animate-in zoom-in-95 duration-300">
        <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/20">
          <AlertTriangle size={32} />
        </div>
        <h2 className="text-xl font-black text-white mb-2 uppercase tracking-tight">
          {isInvalidApiKey ? 'Kunci API Tidak Valid' : 'Koneksi Bermasalah'}
        </h2>
        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
          {isInvalidApiKey 
            ? 'Supabase Anon Key yang Anda masukkan salah atau sudah kadaluarsa. Pastikan Anda menyalin "anon public key" dengan benar dari Project Settings > API.' 
            : `Terjadi kesalahan saat menghubungi database: ${error}`}
        </p>
        <div className="flex flex-col gap-3">
          <button onClick={refreshData} className="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition shadow-lg">
            <RefreshCw size={14} /> Coba Lagi
          </button>
          <button onClick={handleDisconnectDb} className="text-red-400 hover:bg-red-500/10 font-black uppercase text-[10px] tracking-widest py-3 border border-red-900/30 rounded-xl transition">
            Reset & Masukkan Kunci Baru
          </button>
        </div>
      </div>
    </div>
  );

  if (viewMode === ViewMode.PRINT_PREVIEW && (activeAssignment || activeDestOfficial)) {
    // Logic khusus Pejabat Luar dari Master Data
    const dummyAssignment: TravelAssignment | null = activeDestOfficial ? {
      id: 'dummy',
      assignmentNumber: '..................',
      destination: '..................',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      destinationOfficialIds: Array(3).fill('').map((_, i) => i === targetBlockIndex ? activeDestOfficial.id : ''),
      selectedEmployeeIds: [],
      costs: [],
      origin: '',
      purpose: '',
      subActivityCode: '',
      transportation: '',
      travelType: 'DALAM_DAERAH',
      durationDays: 0,
      signDate: new Date().toISOString().split('T')[0],
      signedAt: ''
    } : null;

    const props = { 
      assignment: activeAssignment || dummyAssignment!, 
      employees, 
      skpd: skpdConfig, 
      officials, 
      destinationOfficials: activeDestOfficial ? [activeDestOfficial] : destinationOfficials 
    };

    return (
      <div className="bg-gray-100 min-h-screen">
        <div className="no-print bg-white border-b p-4 sticky top-0 flex items-center justify-between z-50 shadow-sm">
          <button onClick={() => setViewMode(activeDestOfficial ? ViewMode.DESTINATION_OFFICIAL_LIST : ViewMode.PRINT_MENU)} className="flex items-center gap-2 font-bold text-slate-600 hover:text-blue-600 transition"><ChevronLeft size={20} /> Kembali</button>
          
          <div className="flex items-center gap-6">
            {activeDestOfficial && (
              <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
                <span className="text-[10px] font-black uppercase text-slate-400 px-2 flex items-center gap-1"><Layers size={14}/> Pilih Posisi:</span>
                {[0, 1, 2].map((idx) => (
                  <button 
                    key={idx}
                    onClick={() => setTargetBlockIndex(idx)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${targetBlockIndex === idx ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'text-slate-500 hover:bg-white hover:text-blue-600'}`}
                  >
                    Bagian {idx === 0 ? 'II' : idx === 1 ? 'III' : 'IV'}
                  </button>
                ))}
              </div>
            )}
            <div className="h-8 w-px bg-slate-200"></div>
            <div className="flex items-center gap-4">
              <span className="text-xs font-black uppercase text-slate-400">Preview: {printType}</span>
              <button onClick={() => window.print()} className="bg-blue-600 text-white px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-blue-700 transition"><Printer size={18} /> Cetak</button>
            </div>
          </div>
        </div>
        <div className="p-4 md:p-12 flex justify-center">
          {printType === PrintType.SPT && <SPTTemplate {...props} />}
          {printType === PrintType.SPPD_FRONT && <SPPDFrontTemplate {...props} />}
          {printType === PrintType.SPPD_BACK && <SPPDBackTemplate {...props} />}
          {printType === PrintType.LAMPIRAN_III && <LampiranIIITemplate {...props} />}
          {printType === PrintType.KUITANSI && <KuitansiTemplate {...props} />}
          {printType === PrintType.DAFTAR_PENERIMAAN && <DaftarPenerimaanTemplate {...props} />}
          {printType === PrintType.PEJABAT_TUJUAN && <PejabatTujuanTemplate {...props} />}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50">
      <aside className="w-full md:w-64 bg-slate-900 text-white p-6 flex-shrink-0 z-20">
        <div className="flex items-center gap-3 mb-10 border-b border-slate-800 pb-6"><div className="bg-blue-600 p-2.5 rounded-xl"><FileText size={24} /></div><div><h1 className="text-xl font-black italic">SIPD<span className="text-blue-500">LITE</span></h1><p className="text-[10px] font-bold text-slate-500 uppercase">Perjalanan Dinas</p></div></div>
        <nav className="space-y-1">
          {[
            { id: ViewMode.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
            { id: ViewMode.SKPD_CONFIG, label: 'Profil SKPD', icon: Building2 },
            { id: ViewMode.EMPLOYEE_LIST, label: 'Data Pegawai', icon: Users },
            { id: ViewMode.OFFICIAL_LIST, label: 'Pejabat Internal', icon: ShieldCheck },
            { id: ViewMode.DESTINATION_OFFICIAL_LIST, label: 'Pejabat Luar', icon: UserPlus },
            { id: ViewMode.TRAVEL_LIST, label: 'Riwayat SPT', icon: Calendar },
            { id: ViewMode.MASTER_DATA, label: 'Data Master', icon: Database },
            { id: ViewMode.REPORT, label: 'Laporan', icon: BarChart3 },
            { id: ViewMode.PRINT_MENU, label: 'Pencetakan', icon: Printer },
          ].map(item => (<button key={item.id} onClick={() => setViewMode(item.id)} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-bold text-sm ${viewMode === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-400 hover:bg-slate-800'}`}><item.icon size={18} /> {item.label}</button>))}
          <div className="pt-8 mt-8 border-t border-slate-800"><button onClick={() => { if(confirm('Putus koneksi database?')) handleDisconnectDb(); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 font-bold text-[10px] uppercase tracking-widest hover:bg-red-500/10"><LogOut size={16} /> Putus Database</button></div>
        </nav>
      </aside>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div><h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{viewMode.replace('_', ' ')}</h2><p className="text-slate-500 text-[10px] font-bold uppercase mt-1 flex items-center gap-1"><Building2 size={12} /> {skpdConfig.namaSkpd}</p></div>
        </header>

        {viewMode === ViewMode.DASHBOARD && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100"><Landmark className="text-blue-600 mb-3" size={20} /><div className="text-lg font-black text-slate-800 leading-tight">Rp {formatNumber(financialStats.totals.anggaran)}</div><div className="text-slate-400 text-[9px] font-black uppercase mt-1 tracking-wider">Total Anggaran</div></div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100"><TrendingUp className="text-emerald-600 mb-3" size={20} /><div className="text-lg font-black text-slate-800 leading-tight">Rp {formatNumber(financialStats.totals.spd)}</div><div className="text-slate-400 text-[9px] font-black uppercase mt-1 tracking-wider">SPD Akumulasi</div></div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100"><Coins className="text-indigo-600 mb-3" size={20} /><div className="text-lg font-black text-indigo-700 leading-tight">Rp {formatNumber(financialStats.totals.realisasi)}</div><div className="text-slate-400 text-[9px] font-black uppercase mt-1 tracking-wider">Total Realisasi</div></div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100"><Wallet className="text-amber-600 mb-3" size={20} /><div className="text-lg font-black text-amber-600 leading-tight">Rp {formatNumber(financialStats.totals.sisaSpd)}</div><div className="text-slate-400 text-[9px] font-black uppercase mt-1 tracking-wider">Sisa SPD</div></div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100"><AlertCircle className="text-rose-600 mb-3" size={20} /><div className="text-lg font-black text-rose-600 leading-tight">Rp {formatNumber(financialStats.totals.sisaAnggaran)}</div><div className="text-slate-400 text-[9px] font-black uppercase mt-1 tracking-wider">Sisa Anggaran</div></div>
            </div>

            {/* Tabel Realisasi Per Sub Kegiatan */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="text-blue-600" size={20} />
                  <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">Informasi Realisasi Per Sub Kegiatan</h3>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 w-12">No</th>
                      <th className="px-6 py-4">Sub Kegiatan</th>
                      <th className="px-6 py-4 text-right">Anggaran</th>
                      <th className="px-6 py-4 text-right">SPD</th>
                      <th className="px-6 py-4 text-right">Realisasi</th>
                      <th className="px-6 py-4 text-right">Sisa SPD</th>
                      <th className="px-6 py-4 text-right">Sisa Anggaran</th>
                      <th className="px-6 py-4">Daerah Tujuan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {financialStats.details.map((sub, idx) => (
                      <tr key={sub.code} className="hover:bg-slate-50 transition group">
                        <td className="px-6 py-5 text-[10px] font-bold text-slate-400">{idx + 1}</td>
                        <td className="px-6 py-5">
                          <div className="text-[10px] font-mono font-black text-blue-600">{sub.code}</div>
                          <div className="text-xs font-bold text-slate-800 uppercase tracking-tight line-clamp-1">{sub.name}</div>
                        </td>
                        <td className="px-6 py-5 text-right font-bold text-slate-700 text-xs">Rp {formatNumber(sub.anggaran)}</td>
                        <td className="px-6 py-5 text-right font-bold text-emerald-600 text-xs">Rp {formatNumber(Number(sub.spd) || 0)}</td>
                        <td className="px-6 py-5 text-right font-black text-indigo-600 text-xs">Rp {formatNumber(sub.realisasi)}</td>
                        <td className="px-6 py-5 text-right font-bold text-amber-600 text-xs">Rp {formatNumber(sub.sisaSpd)}</td>
                        <td className="px-6 py-5 text-right font-bold text-rose-600 text-xs">Rp {formatNumber(sub.sisaAnggaran)}</td>
                        <td className="px-6 py-5">
                          <div className="flex flex-wrap gap-1">
                            {sub.destinations.length > 0 ? (
                              sub.destinations.map(dest => (
                                <span key={dest} className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-black uppercase tracking-tighter">
                                  <MapPin size={8} /> {dest}
                                </span>
                              ))
                            ) : (
                              <span className="text-[9px] text-slate-300 italic">Belum ada perjalanan</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {financialStats.details.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-slate-400 italic text-sm">Belum ada data sub kegiatan tersedia.</td>
                      </tr>
                    )}
                  </tbody>
                  {financialStats.details.length > 0 && (
                    <tfoot className="bg-slate-50/80 font-black border-t-2 border-slate-100">
                      <tr>
                        <td colSpan={2} className="px-6 py-4 text-xs uppercase text-slate-500">Total Akumulasi</td>
                        <td className="px-6 py-4 text-right text-xs text-slate-800">Rp {formatNumber(financialStats.totals.anggaran)}</td>
                        <td className="px-6 py-4 text-right text-xs text-emerald-700">Rp {formatNumber(financialStats.totals.spd)}</td>
                        <td className="px-6 py-4 text-right text-xs text-indigo-700">Rp {formatNumber(financialStats.totals.realisasi)}</td>
                        <td className="px-6 py-4 text-right text-xs text-amber-700">Rp {formatNumber(financialStats.totals.sisaSpd)}</td>
                        <td className="px-6 py-4 text-right text-xs text-rose-700">Rp {formatNumber(financialStats.totals.sisaAnggaran)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        )}

        {viewMode === ViewMode.SKPD_CONFIG && <SKPDForm config={skpdConfig} onSave={async (cfg) => { if (supabase) { const { error } = await supabase.from('skpd_config').upsert({ id: 'main', provinsi: cfg.provinsi, nama_skpd: cfg.namaSkpd, alamat: cfg.alamat, lokasi: cfg.lokasi, kepala_nama: cfg.kepalaNama, kepala_nip: cfg.kepalaNip, kepala_jabatan: cfg.kepalaJabatan, bendahara_nama: cfg.bendaharaNama, bendahara_nip: cfg.bendaharaNip, pptk_nama: cfg.pptkNama, pptk_nip: cfg.pptkNip, logo: cfg.logo }); if (error) alert(error.message); else await refreshData(); } }} />}
        {viewMode === ViewMode.OFFICIAL_LIST && <OfficialForm officials={officials} onSave={async (o) => { if (supabase) { const { error } = await supabase.from('officials').upsert({ id: o.id || Date.now().toString(), ...o }); if (error) alert(error.message); else await refreshData(); } }} onDelete={async (id) => { if (supabase && confirm('Hapus?')) { const { error } = await supabase.from('officials').delete().eq('id', id); if (error) alert(error.message); else await refreshData(); } }} />}
        {viewMode === ViewMode.EMPLOYEE_LIST && <EmployeeForm employees={employees} onSave={async (e) => { if (supabase) { const { error } = await supabase.from('employees').upsert({ id: e.id, name: e.name, nip: e.nip, pangkat_gol: e.pangkatGol, jabatan: e.jabatan, representation_luar: e.representationLuar, representation_dalam: e.representationDalam }); if (error) alert(error.message); else await refreshData(); } }} onDelete={async (id) => { if (supabase && confirm('Hapus?')) { const { error } = await supabase.from('employees').delete().eq('id', id); if (error) alert(error.message); else await refreshData(); } }} />}
        
        {viewMode === ViewMode.DESTINATION_OFFICIAL_LIST && (
          <DestinationOfficialForm 
            officials={destinationOfficials} 
            onSave={async (o) => {
              if (supabase) {
                const { error } = await supabase.from('destination_officials').upsert(o);
                if (error) alert(error.message); else await refreshData();
              }
            }} 
            onDelete={async (id) => {
              if (supabase && confirm('Hapus data pejabat ini?')) {
                const { error } = await supabase.from('destination_officials').delete().eq('id', id);
                if (error) alert(error.message); else await refreshData();
              }
            }}
            onPrint={(off) => {
              setActiveDestOfficial(off);
              setTargetBlockIndex(0); // Reset ke Bagian II
              setActiveAssignment(null);
              setPrintType(PrintType.PEJABAT_TUJUAN);
              setViewMode(ViewMode.PRINT_PREVIEW);
            }}
          />
        )}

        {viewMode === ViewMode.TRAVEL_LIST && (
          <div className="space-y-4 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="text-blue-600" size={24} />
                <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">Daftar Riwayat SPT</h3>
              </div>
              <button 
                onClick={() => { setEditingAssignment(null); setViewMode(ViewMode.ADD_TRAVEL); }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition flex items-center gap-2 shadow-lg shadow-blue-200"
              >
                <PlusCircle size={18} /> Tambah SPT Baru
              </button>
            </div>
            
            <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-5">Nomor & Tanggal</th>
                    <th className="px-6 py-5">Tujuan</th>
                    <th className="px-6 py-5">Maksud Perjalanan</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assignments.map(a => (
                    <tr key={a.id} className="hover:bg-slate-50 transition group">
                      <td className="px-6 py-5">
                        <div className="font-black text-sm text-slate-800">{a.assignmentNumber}</div>
                        <div className="text-[10px] text-slate-400 font-bold">{formatDateID(a.startDate)}</div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-black uppercase tracking-tight">
                          {a.destination}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-xs text-slate-600 font-medium line-clamp-1 italic">{a.purpose}</div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => { setCurrentAssignForDest(a); setIsDestManagerOpen(true); }}
                            className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition"
                            title="Atur Pejabat Tujuan"
                          >
                            <UserSearch size={16}/>
                          </button>
                          <button 
                            onClick={() => { setEditingAssignment(a); setViewMode(ViewMode.ADD_TRAVEL); }} 
                            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition"
                            title="Edit SPT"
                          >
                            <Edit2 size={16}/>
                          </button>
                          <button 
                            onClick={async () => { if(supabase && confirm('Anda yakin ingin menghapus data ini?')) { await supabase.from('assignments').delete().eq('id', a.id); await refreshData(); } }} 
                            className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition"
                            title="Hapus SPT"
                          >
                            <Trash2 size={16}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {assignments.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic font-medium">Belum ada riwayat SPT. Klik tombol di atas untuk membuat.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {isDestManagerOpen && currentAssignForDest && (
          <DestinationOfficialManager 
            officials={destinationOfficials}
            selectedIds={currentAssignForDest.destinationOfficialIds || []}
            onSaveSelection={(ids) => {
              handleUpdateDestOfficials(currentAssignForDest.id, ids);
              setIsDestManagerOpen(false);
            }}
            onSaveMaster={async (o) => {
              if (supabase) {
                await supabase.from('destination_officials').upsert({ ...o, id: o.id || Date.now().toString() });
                await refreshData();
              }
            }}
            onDeleteMaster={async (id) => {
              if (supabase && confirm('Hapus dari master?')) {
                await supabase.from('destination_officials').delete().eq('id', id);
                await refreshData();
              }
            }}
            onClose={() => setIsDestManagerOpen(false)}
          />
        )}

        {viewMode === ViewMode.ADD_TRAVEL && <TravelAssignmentForm employees={employees} masterCosts={masterCosts} subActivities={subActivities} officials={officials} initialData={editingAssignment || undefined} onSave={handleSaveAssignment} onCancel={() => setViewMode(ViewMode.TRAVEL_LIST)} />}
        {viewMode === ViewMode.MASTER_DATA && <MasterDataForm masterCosts={masterCosts} subActivities={subActivities} onSaveCost={async (c) => { if(supabase) { await supabase.from('master_costs').upsert({ destination: c.destination, daily_allowance: c.daily_allowance, lodging: c.lodging, transport_bbm: c.transport_bbm, sea_transport: c.sea_transport, air_transport: c.air_transport, taxi: c.taxi }); await refreshData(); } }} onDeleteCost={async (d) => { if(supabase) { await supabase.from('master_costs').delete().eq('destination', d); await refreshData(); } }} onClearCosts={async () => { if(supabase) { await supabase.from('master_costs').delete().neq('destination', '___'); await refreshData(); } }} onSaveSub={async (s) => { if(supabase) { const { error } = await supabase.from('sub_activities').upsert({ code: s.code, name: s.name, budget_code: s.budgetCode || '', anggaran: s.anggaran || 0, spd: s.spd || '0', triwulan1: s.triwulan1 || 0, triwulan2: s.triwulan2 || 0, triwulan3: s.triwulan3 || 0, triwulan4: s.triwulan4 || 0 }); if (error) alert(`Gagal Simpan: ${error.message}`); else await refreshData(); } }} onDeleteSub={async (c) => { if(supabase) { const data = await supabase.from('assignments').select('id').eq('sub_activity_code', c).limit(1); if (data.data && data.data.length > 0) { alert('Gagal Hapus: Sub Kegiatan ini sedang digunakan dalam riwayat SPT. Hapus SPT terkait terlebih dahulu.'); return; } const { error } = await supabase.from('sub_activities').delete().eq('code', c); if (error) alert(`Gagal Hapus: ${error.message}`); else await refreshData(); } }} onClearSubs={async () => { if(supabase && confirm('Hapus semua sub kegiatan?')) { await supabase.from('sub_activities').delete().neq('code', '___'); await refreshData(); } }} />}
        
        {viewMode === ViewMode.REPORT && (
          <ReportView 
            employees={employees} 
            assignments={assignments} 
            onOpenDestManager={(a) => {
              setCurrentAssignForDest(a);
              setIsDestManagerOpen(true);
            }}
          />
        )}

        {viewMode === ViewMode.PRINT_MENU && (
           <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
             <div className="p-6 border-b flex items-center bg-slate-50/50"><Printer size={20} className="text-blue-600 mr-2" /><h3 className="font-black text-slate-800 text-xs uppercase">Daftar SPT Siap Cetak</h3></div>
             <div className="overflow-x-auto">
               <table className="w-full text-left">
                 <thead className="bg-slate-50 text-slate-400 text-[9px] uppercase font-black border-b border-slate-100"><tr><th className="px-6 py-4">Nomor & Tujuan</th><th className="px-6 py-4 text-right">Opsi Cetak</th></tr></thead>
                 <tbody className="divide-y divide-slate-100">
                   {assignments.map(item => (
                     <tr key={item.id} className="hover:bg-slate-50 transition">
                       <td className="px-6 py-5"><div className="font-bold text-slate-800 text-xs">{item.assignmentNumber}</div><div className="text-[10px] text-slate-400 font-medium italic">{item.destination}</div></td>
                       <td className="px-6 py-5 text-right">
                         <div className="flex gap-2 flex-wrap justify-end">
                           {[
                             { label: 'SPT', type: PrintType.SPT, color: 'blue' },
                             { label: 'SPD DPN', type: PrintType.SPPD_FRONT, color: 'emerald' },
                             { label: 'SPD BLK', type: PrintType.SPPD_BACK, color: 'emerald' },
                             { label: 'KUITANSI', type: PrintType.KUITANSI, color: 'amber' },
                             { label: 'RINCIAN', type: PrintType.LAMPIRAN_III, color: 'purple' },
                             { label: 'TERIMA', type: PrintType.DAFTAR_PENERIMAAN, color: 'rose' }
                           ].map(btn => (<button key={btn.type} onClick={() => { setActiveDestOfficial(null); setActiveAssignment(item); setPrintType(btn.type as PrintType); setViewMode(ViewMode.PRINT_PREVIEW); }} className={`px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border ${btn.color === 'blue' ? 'text-blue-600 border-blue-100 bg-blue-50 hover:bg-blue-600 hover:text-white' : btn.color === 'emerald' ? 'text-emerald-600 border-emerald-100 bg-emerald-50 hover:bg-emerald-600 hover:text-white' : btn.color === 'amber' ? 'text-amber-600 border-amber-100 bg-amber-50 hover:bg-amber-600 hover:text-white' : btn.color === 'purple' ? 'text-purple-600 border-purple-100 bg-purple-50 hover:bg-purple-600 hover:text-white' : btn.color === 'rose' ? 'text-rose-600 border-rose-100 bg-rose-50 hover:bg-rose-600 hover:text-white' : 'text-indigo-600 border-indigo-100 bg-indigo-50 hover:bg-indigo-600 hover:text-white'}`}>{btn.label}</button>))}
                         </div>
                       </td>
                     </tr>
                   ))}
                   {assignments.length === 0 && (<tr><td colSpan={2} className="px-6 py-12 text-center text-slate-400 italic">Belum ada SPT untuk dicetak.</td></tr>)}
                 </tbody>
               </table>
             </div>
           </div>
        )}
      </main>
    </div>
  );
};

export default App;