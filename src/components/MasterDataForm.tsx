
import React, { useState, useRef, useEffect } from 'react';
import { MasterCost, SubActivity } from '../types';
import { Plus, Trash2, Upload, Save, X, Edit2, CreditCard, ListTree, AlertTriangle, Download, RefreshCw, Share2, Calculator } from 'lucide-react';
import { formatCurrency, formatNumber, parseNumber } from '../utils';
import * as XLSX from 'xlsx';

interface Props {
  masterCosts: MasterCost[];
  onSaveCost: (cost: MasterCost) => void;
  onDeleteCost: (destination: string) => void;
  onClearCosts: () => void;
  subActivities: SubActivity[];
  onSaveSub: (sub: SubActivity) => void;
  onDeleteSub: (code: string) => void;
  onClearSubs: () => void;
  onExport?: () => void;
  onImport?: (file: File) => void;
  onReset?: () => void;
}

type Tab = 'COSTS' | 'SUBS' | 'SYNC';

export const MasterDataForm: React.FC<Props> = ({ 
  masterCosts, onSaveCost, onDeleteCost, onClearCosts,
  subActivities, onSaveSub, onDeleteSub, onClearSubs,
  onExport, onImport, onReset 
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('COSTS');
  const [isAdding, setIsAdding] = useState(false);
  const [editingCost, setEditingCost] = useState<string | null>(null);
  const [editingSub, setEditingSub] = useState<string | null>(null);
  const [selectedTriwulan, setSelectedTriwulan] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const dbInputRef = useRef<HTMLInputElement>(null);
  
  const [costForm, setCostForm] = useState<MasterCost>({
    destination: '',
    dailyAllowance: 0,
    lodging: 0,
    transportBbm: 0,
    seaTransport: 0,
    airTransport: 0,
    taxi: 0
  });

  const [subForm, setSubForm] = useState<SubActivity>({
    code: '',
    name: '',
    anggaran: 0,
    spd: '',
    triwulan1: 0,
    triwulan2: 0,
    triwulan3: 0,
    triwulan4: 0
  });

  // Kalkulasi Otomatis Anggaran & SPD
  useEffect(() => {
    if (activeTab === 'SUBS' && isAdding) {
      const total = subForm.triwulan1 + subForm.triwulan2 + subForm.triwulan3 + subForm.triwulan4;
      
      let calculatedSpd = subForm.spd;
      if (selectedTriwulan === 'I') {
        calculatedSpd = String(subForm.triwulan1);
      } else if (selectedTriwulan === 'II') {
        calculatedSpd = String(subForm.triwulan1 + subForm.triwulan2);
      } else if (selectedTriwulan === 'III') {
        calculatedSpd = String(subForm.triwulan1 + subForm.triwulan2 + subForm.triwulan3);
      } else if (selectedTriwulan === 'IV') {
        calculatedSpd = String(total);
      }

      // Hindari set state jika nilai tidak berubah untuk mencegah loop tak terbatas
      if (subForm.anggaran !== total || subForm.spd !== calculatedSpd) {
        setSubForm(prev => ({
          ...prev,
          anggaran: total,
          spd: calculatedSpd
        }));
      }
    }
  }, [subForm.triwulan1, subForm.triwulan2, subForm.triwulan3, subForm.triwulan4, selectedTriwulan, isAdding, activeTab]);

  const handleCostImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      let count = 0;
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length < 7) continue;
        
        onSaveCost({
          destination: String(row[0] || '').trim(),
          dailyAllowance: Number(row[1]) || 0,
          lodging: Number(row[2]) || 0,
          transportBbm: Number(row[3]) || 0,
          seaTransport: Number(row[4]) || 0,
          airTransport: Number(row[5]) || 0,
          taxi: Number(row[6]) || 0
        });
        count++;
      }
      
      if (count > 0) alert(`Berhasil mengimpor ${count} data biaya dari Excel.`);
    };
    reader.readAsArrayBuffer(file);
    e.target.value = ''; 
  };

  const handleSubImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      let count = 0;
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length < 2) continue;
        
        onSaveSub({
          code: String(row[0] || '').trim(),
          name: String(row[1] || '').trim(),
          anggaran: Number(row[2]) || 0,
          spd: String(row[3] || '').trim(),
          triwulan1: Number(row[4]) || 0,
          triwulan2: Number(row[5]) || 0,
          triwulan3: Number(row[6]) || 0,
          triwulan4: Number(row[7]) || 0
        });
        count++;
      }
      
      if (count > 0) alert(`Berhasil mengimpor ${count} data sub kegiatan.`);
    };
    reader.readAsArrayBuffer(file);
    e.target.value = ''; 
  };

  const handleAddCost = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveCost(costForm);
    resetCostForm();
  };

  const resetCostForm = () => {
    setCostForm({ destination: '', dailyAllowance: 0, lodging: 0, transportBbm: 0, seaTransport: 0, airTransport: 0, taxi: 0 });
    setIsAdding(false);
    setEditingCost(null);
  };

  const handleAddSub = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveSub(subForm);
      resetSubForm();
    } finally {
      setIsSaving(false);
    }
  };

  const resetSubForm = () => {
    setSubForm({ code: '', name: '', anggaran: 0, spd: '', triwulan1: 0, triwulan2: 0, triwulan3: 0, triwulan4: 0 });
    setIsAdding(false);
    setEditingSub(null);
    setSelectedTriwulan('');
  };

  const handleEditCost = (item: MasterCost) => {
    setCostForm(item);
    setEditingCost(item.destination);
    setIsAdding(true);
    setActiveTab('COSTS');
  };

  const handleEditSub = (item: SubActivity) => {
    // Memastikan semua data terisi ke form saat edit
    setSubForm({
      ...item,
      anggaran: Number(item.anggaran || 0),
      triwulan1: Number(item.triwulan1 || 0),
      triwulan2: Number(item.triwulan2 || 0),
      triwulan3: Number(item.triwulan3 || 0),
      triwulan4: Number(item.triwulan4 || 0),
    });
    setEditingSub(item.code);
    setIsAdding(true);
    setActiveTab('SUBS');
  };

  const handleClearAll = () => {
    const targetName = activeTab === 'COSTS' ? 'SELURUH data Master Biaya' : 'SELURUH data Sub Kegiatan';
    if (confirm(`PERHATIAN: Apakah Anda yakin ingin menghapus ${targetName}?`)) {
      if (activeTab === 'COSTS') onClearCosts();
      else onClearSubs();
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b overflow-x-auto">
          <button 
            onClick={() => { setActiveTab('COSTS'); resetCostForm(); }}
            className={`flex-1 min-w-[150px] py-4 text-xs font-black uppercase flex items-center justify-center gap-2 transition tracking-wider ${activeTab === 'COSTS' ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            <CreditCard size={18} /> Master Biaya
          </button>
          <button 
            onClick={() => { setActiveTab('SUBS'); resetSubForm(); }}
            className={`flex-1 min-w-[150px] py-4 text-xs font-black uppercase flex items-center justify-center gap-2 transition tracking-wider ${activeTab === 'SUBS' ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            <ListTree size={18} /> Sub Kegiatan
          </button>
          <button 
            onClick={() => { setActiveTab('SYNC'); setIsAdding(false); }}
            className={`flex-1 min-w-[150px] py-4 text-xs font-black uppercase flex items-center justify-center gap-2 transition tracking-wider ${activeTab === 'SYNC' ? 'text-emerald-600 bg-emerald-50 border-b-2 border-emerald-600' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            <Share2 size={18} /> Berbagi Database
          </button>
        </div>

        {activeTab !== 'SYNC' && (
          <div className="p-4 border-b flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50">
            <h3 className="font-bold text-gray-700 uppercase text-xs tracking-wider">
              {activeTab === 'COSTS' ? 'Manajemen Biaya Regional' : 'Manajemen Sub Kegiatan'}
            </h3>
            <div className="flex flex-wrap gap-2 justify-center sm:justify-end">
              {(activeTab === 'COSTS' ? masterCosts.length > 0 : subActivities.length > 0) && (
                <button onClick={handleClearAll} className="flex items-center gap-2 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 px-4 py-2 rounded-lg transition text-[10px] font-black uppercase tracking-wider">
                  <Trash2 size={14} /> Hapus Semua
                </button>
              )}
              <label className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg cursor-pointer transition text-[10px] font-black uppercase tracking-wider shadow-sm">
                <Upload size={14} /> Impor Excel
                <input type="file" accept=".xlsx, .xls" className="hidden" onChange={activeTab === 'COSTS' ? handleCostImport : handleSubImport} />
              </label>
              {!isAdding && (
                <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition text-[10px] font-black uppercase tracking-wider shadow-sm">
                  <Plus size={14} /> Tambah Manual
                </button>
              )}
            </div>
          </div>
        )}

        {/* Sync Tab UI */}
        {activeTab === 'SYNC' && (
          <div className="p-8 space-y-8 animate-in fade-in duration-300">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl group hover:shadow-lg transition-all duration-300">
                <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition">
                  <Download size={28} />
                </div>
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-2">Cadangkan Database</h4>
                <button onClick={onExport} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition flex items-center justify-center gap-2 shadow-lg shadow-blue-100">Unduh File .json</button>
              </div>
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl group hover:shadow-lg transition-all duration-300">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition">
                  <Upload size={28} />
                </div>
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-2">Sinkronkan Database</h4>
                <button onClick={() => dbInputRef.current?.click()} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-100">Unggah File .json</button>
                <input type="file" ref={dbInputRef} accept=".json" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && onImport) onImport(file);
                  e.target.value = '';
                }} />
              </div>
            </div>
          </div>
        )}

        {/* Form Add/Edit Sub */}
        {isAdding && activeTab === 'SUBS' && (
          <form onSubmit={handleAddSub} className="p-6 bg-blue-50 border-b space-y-4 animate-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="md:col-span-1">
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Kode Rekening</label>
                <input 
                  required 
                  className={`w-full p-2 border rounded text-sm font-mono font-bold ${editingSub ? 'bg-gray-100 cursor-not-allowed' : ''}`} 
                  value={subForm.code} 
                  onChange={e => setSubForm({...subForm, code: e.target.value})} 
                  readOnly={!!editingSub}
                />
              </div>
              <div className="lg:col-span-2">
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Nama Sub Kegiatan</label>
                <input required className="w-full p-2 border rounded text-sm font-medium" value={subForm.name} onChange={e => setSubForm({...subForm, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1 flex items-center gap-1">
                  <Calculator size={10} className="text-blue-500" /> Pilih Triwulan SPD
                </label>
                <select 
                  className="w-full p-2 border rounded text-sm font-bold bg-white text-blue-700 shadow-sm"
                  value={selectedTriwulan}
                  onChange={e => setSelectedTriwulan(e.target.value)}
                >
                  <option value="">-- Manual / Sesuaikan SPD --</option>
                  <option value="I">Triwulan I</option>
                  <option value="II">Triwulan II</option>
                  <option value="III">Triwulan III</option>
                  <option value="IV">Triwulan IV</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 border-t pt-4">
               <div>
                  <label className="block text-[10px] font-black uppercase text-blue-600 mb-1 italic">Total Anggaran (Otomatis)</label>
                  <div className="w-full p-2 bg-blue-100 border-2 border-blue-300 rounded text-sm font-black text-blue-800 shadow-inner">
                    Rp {formatNumber(subForm.anggaran)}
                  </div>
               </div>
               <div>
                  <label className="block text-[10px] font-black uppercase text-emerald-600 mb-1 italic">Nilai SPD (Akumulasi)</label>
                  <div className="w-full p-2 bg-emerald-50 border-2 border-emerald-200 rounded text-sm font-black text-emerald-700 shadow-inner">
                    {isNaN(Number(subForm.spd)) ? (subForm.spd || '0') : `Rp ${formatNumber(Number(subForm.spd))}`}
                  </div>
               </div>
               <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Triwulan I</label>
                  <input type="text" className="w-full p-2 border rounded text-sm font-bold" value={formatNumber(subForm.triwulan1)} onChange={e => setSubForm({...subForm, triwulan1: parseNumber(e.target.value)})} />
               </div>
               <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Triwulan II</label>
                  <input type="text" className="w-full p-2 border rounded text-sm font-bold" value={formatNumber(subForm.triwulan2)} onChange={e => setSubForm({...subForm, triwulan2: parseNumber(e.target.value)})} />
               </div>
               <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Triwulan III</label>
                  <input type="text" className="w-full p-2 border rounded text-sm font-bold" value={formatNumber(subForm.triwulan3)} onChange={e => setSubForm({...subForm, triwulan3: parseNumber(e.target.value)})} />
               </div>
               <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Triwulan IV</label>
                  <input type="text" className="w-full p-2 border rounded text-sm font-bold" value={formatNumber(subForm.triwulan4)} onChange={e => setSubForm({...subForm, triwulan4: parseNumber(e.target.value)})} />
               </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <button type="button" onClick={resetSubForm} className="px-6 py-2 bg-gray-400 rounded text-white font-bold text-xs uppercase hover:bg-gray-500 transition">Batal</button>
              <button 
                type="submit" 
                disabled={isSaving}
                className={`bg-green-600 px-8 py-2 rounded text-white font-black text-xs uppercase flex items-center justify-center gap-2 hover:bg-green-700 transition shadow-lg ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isSaving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16}/>}
                {editingSub ? 'Update Data Sub Kegiatan' : 'Simpan Sub Kegiatan'}
              </button>
            </div>
          </form>
        )}

        {/* Tabel Data Master Sub Kegiatan */}
        {activeTab === 'SUBS' && !isAdding && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[10px]">
              <thead className="bg-gray-50 border-b text-gray-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 w-1/5">Kode Rekening</th>
                  <th className="px-6 py-4">Nama Sub Kegiatan</th>
                  <th className="px-6 py-4">Total Anggaran</th>
                  <th className="px-6 py-4">SPD Saat Ini</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {subActivities.length === 0 ? (
                  <tr><td colSpan={5} className="p-16 text-center text-gray-400 italic font-medium">Belum ada data sub kegiatan.</td></tr>
                ) : (
                  subActivities.map(item => (
                    <tr key={item.code} className="hover:bg-slate-50 transition group">
                      <td className="px-6 py-4 font-mono font-bold text-blue-600">{item.code}</td>
                      <td className="px-6 py-4 text-slate-800 font-medium">{item.name}</td>
                      <td className="px-6 py-4 font-black text-slate-700">Rp {formatNumber(item.anggaran)}</td>
                      <td className="px-6 py-4 font-black text-emerald-600">
                        {isNaN(Number(item.spd)) ? (item.spd || '-') : `Rp ${formatNumber(Number(item.spd))}`}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => handleEditSub(item)} className="text-blue-400 hover:text-blue-600 p-2 rounded-lg hover:bg-blue-50 transition" title="Edit Data"><Edit2 size={16}/></button>
                          <button onClick={() => { if(confirm('Hapus?')) onDeleteSub(item.code); }} className="text-red-300 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition" title="Hapus Data"><Trash2 size={16}/></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tabel Data Master Biaya */}
        {activeTab === 'COSTS' && !isAdding && (
           <div className="overflow-x-auto">
              <table className="w-full text-left text-[10px]">
                <thead className="bg-gray-50 border-b text-gray-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Provinsi/Kab/Kota</th>
                    <th className="px-4 py-4">Harian</th>
                    <th className="px-4 py-4">Akomodasi</th>
                    <th className="px-4 py-4">BBM</th>
                    <th className="px-4 py-4">Kapal</th>
                    <th className="px-4 py-4">Pesawat</th>
                    <th className="px-4 py-4">Taksi</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {masterCosts.map(item => (
                    <tr key={item.destination} className="hover:bg-slate-50 transition group">
                      <td className="px-6 py-4 font-bold text-slate-800">{item.destination}</td>
                      <td className="px-4 py-4 font-medium">{formatCurrency(item.dailyAllowance)}</td>
                      <td className="px-4 py-4 font-medium">{formatCurrency(item.lodging)}</td>
                      <td className="px-4 py-4 font-medium">{formatCurrency(item.transportBbm)}</td>
                      <td className="px-4 py-4 font-medium">{formatCurrency(item.seaTransport)}</td>
                      <td className="px-4 py-4 font-medium">{formatCurrency(item.airTransport)}</td>
                      <td className="px-4 py-4 font-medium">{formatCurrency(item.taxi)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => handleEditCost(item)} className="text-blue-400 hover:text-blue-600 p-2 rounded-lg hover:bg-blue-50 transition"><Edit2 size={16}/></button>
                          <button onClick={() => { if(confirm('Hapus?')) onDeleteCost(item.destination); }} className="text-red-300 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition"><Trash2 size={16}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
           </div>
        )}
      </div>
    </div>
  );
};