
import React, { useState } from 'react';
import { Official } from '../types';
import { Plus, Trash2, Edit2, Save, X, UserCheck, ShieldCheck, Briefcase } from 'lucide-react';

interface Props {
  officials: Official[];
  onSave: (official: Official) => void;
  onDelete: (id: string) => void;
}

export const OfficialForm: React.FC<Props> = ({ officials, onSave, onDelete }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Official>({
    id: '',
    name: '',
    nip: '',
    jabatan: '',
    role: 'PPTK'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, id: formData.id || Date.now().toString() });
    resetForm();
  };

  const resetForm = () => {
    setFormData({ id: '', name: '', nip: '', jabatan: '', role: 'PPTK' });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleEdit = (official: Official) => {
    setFormData(official);
    setEditingId(official.id);
    setIsAdding(true);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Master Penanda Tangan</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Daftar pejabat authorized untuk menandatangani dokumen dinas.</p>
        </div>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition text-xs font-bold uppercase tracking-wider shadow-sm"
          >
            <Plus size={16} /> Tambah Pejabat
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="p-6 bg-blue-50/30 border-b border-blue-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-top-2">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nama Lengkap & Gelar</label>
            <input required className="w-full p-2 border border-slate-200 rounded-lg text-sm font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">NIP</label>
            <input required className="w-full p-2 border border-slate-200 rounded-lg text-sm font-mono" value={formData.nip} onChange={e => setFormData({...formData, nip: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Jabatan dalam TTD</label>
            <input required className="w-full p-2 border border-slate-200 rounded-lg text-sm" value={formData.jabatan} onChange={e => setFormData({...formData, jabatan: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Kategori / Role</label>
            <select 
              className="w-full p-2 border border-slate-200 rounded-lg text-sm font-bold bg-white"
              value={formData.role}
              onChange={e => setFormData({...formData, role: e.target.value as any})}
            >
              <option value="KEPALA">Kepala SKPD</option>
              <option value="PPTK">PPTK (Pejabat Pelaksana)</option>
              <option value="BENDAHARA">Bendahara</option>
            </select>
          </div>
          <div className="lg:col-span-4 flex gap-2 justify-end mt-2">
            <button type="button" onClick={resetForm} className="px-6 py-2 text-gray-500 hover:bg-gray-100 rounded-lg font-bold text-sm">Batal</button>
            <button type="submit" className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-8 py-2 rounded-lg font-black text-sm uppercase"><Save size={18} /> Simpan Pejabat</button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-100">
            <tr>
              <th className="px-6 py-4">Pejabat</th>
              <th className="px-6 py-4">Jabatan TTD</th>
              <th className="px-6 py-4 text-center">Kategori</th>
              <th className="px-6 py-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {officials.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">Belum ada data pejabat penanda tangan.</td></tr>
            ) : (
              officials.map(off => (
                <tr key={off.id} className="hover:bg-slate-50 transition text-xs">
                  <td className="px-6 py-4">
                    <div className="font-black text-slate-800 uppercase tracking-tight">{off.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono font-bold">NIP. {off.nip}</div>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-600">{off.jabatan}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                      off.role === 'KEPALA' ? 'bg-blue-100 text-blue-700' :
                      off.role === 'PPTK' ? 'bg-amber-100 text-amber-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {off.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex gap-2 justify-end items-center">
                      <button onClick={() => handleEdit(off)} className="text-blue-400 hover:text-blue-600 transition p-2 rounded-lg hover:bg-blue-50">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => onDelete(off.id)} className="text-red-400 hover:text-red-600 transition p-2 rounded-lg hover:bg-red-50">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};