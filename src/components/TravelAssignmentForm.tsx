
import React, { useState, useEffect, useMemo } from 'react';
import { Employee, TravelAssignment, SubActivity, TravelCost, TravelType, MasterCost, Official } from '../types';
import { LIST_KOTA_NTB, LIST_PROVINSI_INDONESIA, TRANSPORTATION_MODES } from '../constants';
import { calculateDays, formatCurrency, formatNumber, parseNumber } from '../utils';
import { Save, Plus, Users, Wallet, MapPin, Search, UserCheck, Truck, Calendar, ArrowRight, UserPlus, Calculator, Map, Info } from 'lucide-react';

interface Props {
  employees: Employee[];
  masterCosts: MasterCost[];
  subActivities: SubActivity[];
  officials: Official[];
  initialData?: TravelAssignment;
  onSave: (data: TravelAssignment) => void;
  onCancel: () => void;
}

export const TravelAssignmentForm: React.FC<Props> = ({ 
  employees, 
  masterCosts, 
  subActivities, 
  officials, 
  initialData, 
  onSave, 
  onCancel
}) => {
  const [formData, setFormData] = useState<Partial<TravelAssignment>>(() => {
    if (initialData) return initialData;
    const defaultKepala = officials.find(o => o.role === 'KEPALA');
    const defaultPPTK = officials.find(o => o.role === 'PPTK');
    const defaultBendahara = officials.find(o => o.role === 'BENDAHARA');

    return {
      assignmentNumber: '',
      subActivityCode: subActivities[0]?.code || '',
      purpose: '',
      origin: 'Mataram',
      travelType: 'DALAM_DAERAH',
      transportation: TRANSPORTATION_MODES[2],
      destination: '',
      startDate: '',
      endDate: '',
      durationDays: 0,
      selectedEmployeeIds: [],
      costs: [],
      signedAt: 'Mataram',
      signDate: new Date().toISOString().split('T')[0],
      signerId: defaultKepala?.id || '',
      pptkId: defaultPPTK?.id || '',
      bendaharaId: defaultBendahara?.id || ''
    };
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [lastAutoLookup, setLastAutoLookup] = useState<string>(initialData?.destination || '');

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => 
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      emp.nip.includes(searchTerm) ||
      emp.jabatan.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [employees, searchTerm]);

  const selectedMaster = useMemo(() => {
    return masterCosts.find(c => c.destination === formData.destination);
  }, [formData.destination, masterCosts]);

  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      const days = calculateDays(formData.startDate, formData.endDate);
      setFormData(prev => ({ 
        ...prev, 
        durationDays: days,
        costs: (prev.costs || []).map(c => ({
          ...c,
          dailyDays: days,
          lodgingDays: Math.max(0, days - 1),
          representationDays: days
        }))
      }));
    }
  }, [formData.startDate, formData.endDate]);

  useEffect(() => {
    if (formData.destination && (formData.destination !== lastAutoLookup)) {
      if (selectedMaster) {
        setFormData(prev => ({
          ...prev,
          costs: (prev.costs || []).map(c => {
            const emp = employees.find(e => e.id === c.employeeId);
            return {
              ...c,
              dailyAllowance: selectedMaster.dailyAllowance,
              lodging: selectedMaster.lodging,
              transportBbm: selectedMaster.transportBbm,
              seaTransport: selectedMaster.seaTransport || 0,
              airTransport: selectedMaster.airTransport || 0,
              taxi: selectedMaster.taxi || 0,
              dailyDays: prev.durationDays || 0,
              lodgingDays: Math.max(0, (prev.durationDays || 1) - 1),
              representationDays: prev.durationDays || 0,
              representation: prev.travelType === 'DALAM_DAERAH' ? (emp?.representationDalam || 0) : (emp?.representationLuar || 0)
            };
          })
        }));
        setLastAutoLookup(formData.destination);
      }
    }
  }, [formData.destination, selectedMaster, formData.durationDays, lastAutoLookup, formData.travelType, employees]);

  const handleTravelTypeChange = (type: TravelType) => {
    setFormData(prev => {
      const updatedCosts = (prev.costs || []).map(cost => {
        const emp = employees.find(e => e.id === cost.employeeId);
        if (emp) return { ...cost, representation: type === 'DALAM_DAERAH' ? (emp.representationDalam || 0) : (emp.representationLuar || 0) };
        return cost;
      });
      return { ...prev, travelType: type, destination: '', costs: updatedCosts };
    });
  };

  const handleToggleEmployee = (id: string) => {
    setFormData(prev => {
      const ids = prev.selectedEmployeeIds || [];
      const costs = prev.costs || [];
      if (ids.includes(id)) {
        return { ...prev, selectedEmployeeIds: ids.filter(x => x !== id), costs: costs.filter(c => c.employeeId !== id) };
      } else {
        const emp = employees.find(e => e.id === id);
        const newCost: TravelCost = {
          employeeId: id,
          transportBbm: selectedMaster ? selectedMaster.transportBbm : 0,
          seaTransport: selectedMaster ? (selectedMaster.seaTransport || 0) : 0,
          airTransport: selectedMaster ? (selectedMaster.airTransport || 0) : 0,
          taxi: selectedMaster ? (selectedMaster.taxi || 0) : 0,
          lodging: selectedMaster ? selectedMaster.lodging : 0,
          lodgingDays: Math.max(0, (prev.durationDays || 1) - 1),
          dailyAllowance: selectedMaster ? selectedMaster.dailyAllowance : 0,
          dailyDays: prev.durationDays || 0,
          representation: prev.travelType === 'DALAM_DAERAH' ? (emp?.representationDalam || 0) : (emp?.representationLuar || 0),
          representationDays: prev.durationDays || 0
        };
        return { ...prev, selectedEmployeeIds: [...ids, id], costs: [...costs, newCost] };
      }
    });
  };

  const updateCost = (empId: string, field: keyof TravelCost, value: number) => {
    setFormData(prev => ({
      ...prev,
      costs: (prev.costs || []).map(c => c.employeeId === empId ? { ...c, [field]: value } : c)
    }));
  };

  const handleTransportChange = (empId: string, totalVal: number) => {
    setFormData(prev => ({
      ...prev,
      costs: (prev.costs || []).map(c => 
        c.employeeId === empId 
          ? { ...c, transportBbm: totalVal, seaTransport: 0, airTransport: 0 } 
          : c
      )
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.selectedEmployeeIds?.length) { alert("Pilih minimal satu pegawai"); return; }
    if (!formData.destination) { alert("Pilih tujuan perjalanan"); return; }
    onSave({ ...formData as TravelAssignment, id: formData.id || Date.now().toString() });
  };

  const grandTotal = useMemo(() => {
    return (formData.costs || []).reduce((sum, c) => {
      const daily = (c.dailyAllowance || 0) * (c.dailyDays || 0);
      const lodging = (c.lodging || 0) * (c.lodgingDays || 0);
      const transport = (c.transportBbm || 0) + (c.seaTransport || 0) + (c.airTransport || 0) + (c.taxi || 0);
      const representation = (c.representation || 0) * (c.representationDays || 0);
      return sum + daily + lodging + transport + representation;
    }, 0);
  }, [formData.costs]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-300 pb-20">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-black mb-6 flex items-center justify-between text-slate-800 uppercase tracking-tight">
          <div className="flex items-center gap-2"><Save className="text-blue-600" size={20} /> {initialData ? 'Edit Data Perjalanan' : 'Data Umum Perjalanan'}</div>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Sub Kegiatan</label>
            <select required className="w-full p-2.5 border border-slate-200 rounded-lg bg-white shadow-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-100 outline-none" value={formData.subActivityCode} onChange={e => setFormData({...formData, subActivityCode: e.target.value})}>
              <option value="">-- Pilih Sub Kegiatan --</option>
              {subActivities.map(s => (<option key={s.code} value={s.code}>{s.code} - {s.name}</option>))}
            </select>
          </div>
          
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6 border-b border-slate-50 pb-6">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Nomor SPT</label>
              <input required placeholder="090.1/..." className="w-full p-2.5 border border-slate-200 rounded-lg font-bold text-slate-700 focus:ring-2 focus:ring-blue-100 outline-none" value={formData.assignmentNumber} onChange={e => setFormData({...formData, assignmentNumber: e.target.value})} />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1"><Calendar size={12} className="text-blue-500" /> Tanggal SPT (Tanda Tangan)</label>
              <input type="date" required className="w-full p-2.5 border border-slate-200 rounded-lg font-bold text-slate-700 focus:ring-2 focus:ring-blue-100 outline-none" value={formData.signDate} onChange={e => setFormData({...formData, signDate: e.target.value})} />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1"><MapPin size={12} className="text-blue-500" /> Tempat SPT (Lokasi)</label>
              <input required placeholder="Mataram" className="w-full p-2.5 border border-slate-200 rounded-lg font-bold text-slate-700 focus:ring-2 focus:ring-blue-100 outline-none" value={formData.signedAt} onChange={e => setFormData({...formData, signedAt: e.target.value})} />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Maksud Perjalanan</label>
            <input required className="w-full p-2.5 border border-slate-200 rounded-lg font-bold text-slate-700 focus:ring-2 focus:ring-blue-100 outline-none" value={formData.purpose} onChange={e => setFormData({...formData, purpose: e.target.value})} />
          </div>
          
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-200 shadow-inner">
             <div className="lg:col-span-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Kategori Wilayah</label>
                <div className="flex gap-4">
                  <label className={`flex-1 flex items-center gap-2 cursor-pointer group px-4 py-3 rounded-xl border transition-all ${formData.travelType === 'DALAM_DAERAH' ? 'bg-white border-blue-400 shadow-md ring-4 ring-blue-50' : 'bg-slate-100 border-transparent hover:bg-white hover:border-slate-200'}`}>
                    <input type="radio" name="travelType" className="w-4 h-4 text-blue-600" checked={formData.travelType === 'DALAM_DAERAH'} onChange={() => handleTravelTypeChange('DALAM_DAERAH')} />
                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Dalam Daerah</span>
                  </label>
                  <label className={`flex-1 flex items-center gap-2 cursor-pointer group px-4 py-3 rounded-xl border transition-all ${formData.travelType === 'LUAR_DAERAH' ? 'bg-white border-blue-400 shadow-md ring-4 ring-blue-50' : 'bg-slate-100 border-transparent hover:bg-white hover:border-slate-200'}`}>
                    <input type="radio" name="travelType" className="w-4 h-4 text-blue-600" checked={formData.travelType === 'LUAR_DAERAH'} onChange={() => handleTravelTypeChange('LUAR_DAERAH')} />
                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Luar Daerah</span>
                  </label>
                </div>
             </div>
             <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Asal</label>
                <div className="p-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 text-sm">{formData.origin}</div>
             </div>
             <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 flex items-center gap-1"><MapPin size={12} className="text-red-500" /> Tujuan</label>
                <select required className="w-full p-3 border border-blue-200 rounded-xl bg-white shadow-sm focus:ring-4 focus:ring-blue-100 font-black text-slate-800 outline-none" value={formData.destination} onChange={e => setFormData({...formData, destination: e.target.value})}>
                  <option value="">-- Pilih Tujuan --</option>
                  {formData.travelType === 'DALAM_DAERAH' ? (LIST_KOTA_NTB.map(city => <option key={city} value={city}>{city}</option>)) : (LIST_PROVINSI_INDONESIA.map(prov => <option key={prov} value={prov}>{prov}</option>))}
                </select>
             </div>
          </div>

          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1"><Calendar size={12} className="text-slate-400" /> Tgl Berangkat</label>
              <input type="date" required className="w-full p-2.5 border border-slate-200 rounded-lg font-bold text-slate-700 focus:ring-2 focus:ring-blue-100 outline-none" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1"><Calendar size={12} className="text-slate-400" /> Tgl Kembali</label>
              <input type="date" required className="w-full p-2.5 border border-slate-200 rounded-lg font-bold text-slate-700 focus:ring-2 focus:ring-blue-100 outline-none" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1"><Calculator size={12} className="text-blue-500" /> Jumlah Hari (Otomatis)</label>
              <div className="relative">
                <input 
                  type="text" 
                  readOnly 
                  className="w-full p-2.5 bg-blue-50 border border-blue-200 rounded-lg font-black text-blue-700 outline-none text-center" 
                  value={`${formData.durationDays || 0} HARI`} 
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400">
                  <Info size={14} />
                </div>
              </div>
            </div>
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1"><Truck size={14} className="text-blue-500" /> Alat Angkutan</label>
            <div className="flex flex-wrap gap-2">
              {TRANSPORTATION_MODES.map(mode => (
                <button 
                  key={mode} 
                  type="button"
                  onClick={() => setFormData({...formData, transportation: mode})}
                  className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border ${formData.transportation === mode ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500 hover:border-blue-400'}`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-black mb-6 flex items-center gap-2 text-slate-800 uppercase tracking-tight"><UserCheck className="text-blue-600" size={20} /> Penanda Tangan Dokumen Internal</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1">
            <label className="block text-[10px] font-black text-slate-500 uppercase">Kepala SKPD</label>
            <select required className="w-full p-2.5 border border-slate-200 rounded-lg mt-1 bg-white font-bold text-slate-700" value={formData.signerId} onChange={e => setFormData({...formData, signerId: e.target.value})}>
              <option value="">-- Pilih Pejabat --</option>
              {officials.filter(o => o.role === 'KEPALA').map(o => (<option key={o.id} value={o.id}>{o.name}</option>))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] font-black text-slate-500 uppercase">PPTK</label>
            <select required className="w-full p-2.5 border border-slate-200 rounded-lg mt-1 bg-white font-bold text-slate-700" value={formData.pptkId} onChange={e => setFormData({...formData, pptkId: e.target.value})}>
              <option value="">-- Pilih PPTK --</option>
              {officials.filter(o => o.role === 'PPTK').map(o => (<option key={o.id} value={o.id}>{o.name}</option>))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] font-black text-slate-500 uppercase">Bendahara</label>
            <select required className="w-full p-2.5 border border-slate-200 rounded-lg mt-1 bg-white font-bold text-slate-700" value={formData.bendaharaId} onChange={e => setFormData({...formData, bendaharaId: e.target.value})}>
              <option value="">-- Pilih Bendahara --</option>
              {officials.filter(o => o.role === 'BENDAHARA').map(o => (<option key={o.id} value={o.id}>{o.name}</option>))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h3 className="text-lg font-black flex items-center gap-2 text-slate-800 uppercase tracking-tight"><Users className="text-blue-600" size={20} /> Pilih Pegawai Terlibat</h3>
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Cari nama pegawai..." className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 outline-none transition" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 max-h-60 overflow-y-auto p-1 custom-scrollbar">
          {filteredEmployees.map(emp => {
            const isSelected = formData.selectedEmployeeIds?.includes(emp.id);
            return (
              <div 
                key={emp.id} 
                onClick={() => handleToggleEmployee(emp.id)} 
                className={`p-3 border rounded-xl cursor-pointer transition flex items-center gap-3 ${isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'hover:bg-slate-50 border-slate-200'}`}
              >
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-white border-white' : 'bg-white border-slate-300'}`}>
                  {isSelected && <Plus size={14} className="text-blue-600 font-bold" />}
                </div>
                <div className="overflow-hidden">
                  <div className={`text-[10px] font-black uppercase truncate ${isSelected ? 'text-white' : 'text-slate-800'}`}>{emp.name}</div>
                  <div className={`text-[9px] font-bold uppercase tracking-tighter truncate ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>{emp.jabatan}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {formData.costs && formData.costs.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-in zoom-in-95 duration-300">
           <h3 className="text-lg font-black mb-6 flex items-center gap-2 text-slate-800 uppercase tracking-tight">
             <Wallet className="text-emerald-600" size={20} /> Rincian Biaya per Pegawai
           </h3>
           <div className="space-y-4">
             {formData.costs.map((cost, idx) => {
               const emp = employees.find(e => e.id === cost.employeeId);
               const rowTotal = (cost.dailyAllowance * cost.dailyDays) + (cost.lodging * cost.lodgingDays) + cost.transportBbm + cost.seaTransport + cost.airTransport + cost.taxi + (cost.representation * cost.representationDays);
               
               return (
                 <div key={cost.employeeId} className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/50">
                    <div className="bg-slate-100/80 px-4 py-2 flex justify-between items-center border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 bg-slate-800 text-white rounded-full flex items-center justify-center text-[10px] font-black">{idx + 1}</span>
                        <span className="text-[10px] font-black text-slate-800 uppercase tracking-tight">{emp?.name}</span>
                      </div>
                      <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Total: Rp {formatNumber(rowTotal)}</div>
                    </div>
                    <div className="p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase">Uang Harian ({cost.dailyDays} Hr)</label>
                        <input type="text" className="w-full p-2 border border-slate-200 rounded-lg text-[11px] font-bold bg-white" value={formatNumber(cost.dailyAllowance)} onChange={e => updateCost(cost.employeeId, 'dailyAllowance', parseNumber(e.target.value))} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase">Penginapan ({cost.lodgingDays} Ml)</label>
                        <input type="text" className="w-full p-2 border border-slate-200 rounded-lg text-[11px] font-bold bg-white" value={formatNumber(cost.lodging)} onChange={e => updateCost(cost.employeeId, 'lodging', parseNumber(e.target.value))} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase">Representasi ({cost.representationDays} Hr)</label>
                        <input type="text" className="w-full p-2 border border-slate-200 rounded-lg text-[11px] font-bold bg-white" value={formatNumber(cost.representation)} onChange={e => updateCost(cost.employeeId, 'representation', parseNumber(e.target.value))} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase">Transp. (BBM/Laut/Udara)</label>
                        <input 
                          type="text" 
                          className="w-full p-2 border border-slate-200 rounded-lg text-[11px] font-bold bg-white" 
                          value={formatNumber(cost.transportBbm + cost.seaTransport + cost.airTransport)} 
                          onChange={e => handleTransportChange(cost.employeeId, parseNumber(e.target.value))} 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase">Taksi / Lainnya</label>
                        <input type="text" className="w-full p-2 border border-slate-200 rounded-lg text-[11px] font-bold bg-white" value={formatNumber(cost.taxi)} onChange={e => updateCost(cost.employeeId, 'taxi', parseNumber(e.target.value))} />
                      </div>
                    </div>
                 </div>
               );
             })}
           </div>

           <div className="mt-8 p-6 bg-slate-900 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 text-white">
              <div>
                <div className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Estimasi Total Biaya SPT</div>
                <div className="text-3xl font-black italic tracking-tighter">Rp {formatNumber(grandTotal)}</div>
              </div>
              <div className="flex gap-4">
                 <div className="text-center">
                    <div className="text-slate-500 text-[8px] font-black uppercase tracking-widest">Jumlah Pegawai</div>
                    <div className="text-xl font-black">{formData.selectedEmployeeIds?.length || 0}</div>
                 </div>
                 <div className="w-px h-10 bg-slate-800"></div>
                 <div className="text-center">
                    <div className="text-slate-500 text-[8px] font-black uppercase tracking-widest">Durasi</div>
                    <div className="text-xl font-black">{formData.durationDays || 0} Hari</div>
                 </div>
              </div>
           </div>
        </div>
      )}

      <div className="flex justify-end gap-3 fixed bottom-4 right-8 left-auto md:left-72 bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-slate-200 z-50">
        <button type="button" onClick={onCancel} className="px-8 py-3 text-slate-600 hover:bg-slate-100 rounded-xl transition font-black text-[10px] uppercase tracking-widest border border-slate-200">Batal</button>
        <button type="submit" className="px-10 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition flex items-center gap-2 shadow-xl shadow-blue-200">
          <Save size={18} /> Simpan Data Perjalanan
        </button>
      </div>
    </form>
  );
};
