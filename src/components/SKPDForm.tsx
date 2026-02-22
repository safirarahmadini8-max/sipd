
import React, { useState, useRef } from 'react';
import { SKPDConfig } from '../types';
import { Save, Building2, MapPin, UserCheck, Briefcase, Upload, Image as ImageIcon, RotateCcw } from 'lucide-react';

interface Props {
  config: SKPDConfig;
  onSave: (config: SKPDConfig) => void;
}

const DEFAULT_LOGO = "https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Logo_Provinsi_Nusa_Tenggara_Barat.png/300px-Logo_Provinsi_Nusa_Tenggara_Barat.png";

export const SKPDForm: React.FC<Props> = ({ config, onSave }) => {
  const [formData, setFormData] = useState<SKPDConfig>(config);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    alert('Data SKPD berhasil diperbarui!');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setFormData(prev => ({ ...prev, logo: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const resetLogo = () => {
    if (confirm('Kembalikan logo ke default Pemerintah Provinsi NTB?')) {
      setFormData(prev => ({ ...prev, logo: undefined }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-800 uppercase tracking-tight">
          <Building2 className="text-blue-600" size={22} /> Identitas Kantor (SKPD)
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            <div className="w-32 h-32 bg-white rounded-xl shadow-inner border border-slate-100 flex items-center justify-center overflow-hidden mb-4 relative group">
              <img 
                src={formData.logo || DEFAULT_LOGO} 
                alt="Logo Preview" 
                className="max-w-full max-h-full object-contain p-2"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 bg-white rounded-full text-blue-600 hover:scale-110 transition"
                >
                  <Upload size={16} />
                </button>
              </div>
            </div>
            
            <div className="flex flex-col gap-2 w-full">
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 w-full py-2 bg-white border border-slate-200 rounded-lg text-xs font-black uppercase text-slate-600 hover:bg-slate-50 transition"
              >
                <ImageIcon size={14} /> Ganti Logo (.ico, .png)
              </button>
              {formData.logo && (
                <button 
                  type="button"
                  onClick={resetLogo}
                  className="flex items-center justify-center gap-2 w-full py-2 bg-white border border-red-100 rounded-lg text-xs font-black uppercase text-red-500 hover:bg-red-50 transition"
                >
                  <RotateCcw size={14} /> Reset Logo
                </button>
              )}
            </div>
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleLogoUpload}
              accept=".ico,.png,.jpg,.jpeg"
              className="hidden"
            />
            <p className="text-[9px] text-slate-400 font-bold uppercase mt-3 text-center">Format: ICO, PNG, JPG<br/>Maksimal 1MB disarankan</p>
          </div>

          <div className="md:col-span-2 space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-black text-slate-500 uppercase">Nama Provinsi</label>
              <input 
                className="w-full p-2.5 border border-slate-200 rounded-lg font-bold text-slate-700 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 transition"
                value={formData.provinsi || ''}
                onChange={e => setFormData({...formData, provinsi: e.target.value})}
                placeholder="Contoh: Provinsi Nusa Tenggara Barat"
              />
            </div>
            
            <div className="space-y-1">
              <label className="block text-xs font-black text-slate-500 uppercase">Nama SKPD / Dinas / Biro</label>
              <input 
                required
                className="w-full p-2.5 border border-slate-200 rounded-lg font-black text-slate-700 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 transition uppercase"
                value={formData.namaSkpd}
                onChange={e => setFormData({...formData, namaSkpd: e.target.value})}
                placeholder="Contoh: DINAS PENANAMAN MODAL..."
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-black text-slate-500 uppercase flex items-center gap-1">
                <MapPin size={12} /> Alamat Lengkap Kantor
              </label>
              <textarea 
                required
                rows={2}
                className="w-full p-2.5 border border-slate-200 rounded-lg font-medium text-slate-700 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 transition"
                value={formData.alamat}
                onChange={e => setFormData({...formData, alamat: e.target.value})}
                placeholder="Contoh: Jalan Udayana No. 4, Mataram..."
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-black text-slate-500 uppercase">Lokasi TTD (Kota) - Opsional</label>
              <input 
                className="w-full p-2.5 border border-slate-200 rounded-lg font-bold text-slate-700 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 transition uppercase"
                value={formData.lokasi}
                onChange={e => setFormData({...formData, lokasi: e.target.value})}
                placeholder="Contoh: MATARAM"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-800 uppercase tracking-tight">
          <UserCheck className="text-emerald-600" size={22} /> Pejabat Penandatangan
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <h4 className="text-xs font-black text-blue-600 uppercase border-b pb-2 flex items-center gap-2">
              <UserCheck size={14} /> Kepala SKPD
            </h4>
            <div className="space-y-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase">Jabatan Penandatangan</label>
              <select 
                required
                className="w-full p-2.5 border border-slate-200 rounded-lg font-bold text-slate-700 focus:ring-2 focus:ring-blue-100 outline-none"
                value={formData.kepalaJabatan}
                onChange={e => setFormData({...formData, kepalaJabatan: e.target.value})}
              >
                <option value="KEPALA DINAS">KEPALA DINAS</option>
                <option value="KEPALA BADAN">KEPALA BADAN</option>
                <option value="KEPALA BIRO">KEPALA BIRO</option>
                <option value="KEPALA UPTD">KEPALA UPTD</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase">Nama Lengkap & Gelar</label>
              <input 
                required
                className="w-full p-2.5 border border-slate-200 rounded-lg font-bold text-slate-700 focus:ring-2 focus:ring-blue-100 outline-none"
                value={formData.kepalaNama}
                onChange={e => setFormData({...formData, kepalaNama: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase">NIP</label>
              <input 
                required
                className="w-full p-2.5 border border-slate-200 rounded-lg font-mono font-bold text-slate-700 focus:ring-2 focus:ring-blue-100 outline-none"
                value={formData.kepalaNip}
                onChange={e => setFormData({...formData, kepalaNip: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <h4 className="text-xs font-black text-amber-600 uppercase border-b pb-2 flex items-center gap-2">
              <Briefcase size={14} /> PPTK
            </h4>
            <div className="space-y-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase">Nama Lengkap & Gelar</label>
              <input 
                required
                className="w-full p-2.5 border border-slate-200 rounded-lg font-bold text-slate-700 focus:ring-2 focus:ring-amber-100 outline-none"
                value={formData.pptkNama}
                onChange={e => setFormData({...formData, pptkNama: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase">NIP</label>
              <input 
                required
                className="w-full p-2.5 border border-slate-200 rounded-lg font-mono font-bold text-slate-700 focus:ring-2 focus:ring-amber-100 outline-none"
                value={formData.pptkNip}
                onChange={e => setFormData({...formData, pptkNip: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <h4 className="text-xs font-black text-emerald-600 uppercase border-b pb-2 flex items-center gap-2">
              <UserCheck size={14} /> Bendahara Pengeluaran
            </h4>
            <div className="space-y-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase">Nama Lengkap & Gelar</label>
              <input 
                required
                className="w-full p-2.5 border border-slate-200 rounded-lg font-bold text-slate-700 focus:ring-2 focus:ring-emerald-100 outline-none"
                value={formData.bendaharaNama}
                onChange={e => setFormData({...formData, bendaharaNama: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase">NIP</label>
              <input 
                required
                className="w-full p-2.5 border border-slate-200 rounded-lg font-mono font-bold text-slate-700 focus:ring-2 focus:ring-emerald-100 outline-none"
                value={formData.bendaharaNip}
                onChange={e => setFormData({...formData, bendaharaNip: e.target.value})}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end sticky bottom-4 z-10">
        <button 
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-3 rounded-xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-blue-200 transition flex items-center gap-2"
        >
          <Save size={18} /> Simpan Perubahan Profil
        </button>
      </div>
    </form>
  );
};
