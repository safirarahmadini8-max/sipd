
import React, { useState } from 'react';
import { Employee } from '../types';
import { Plus, Trash2, Edit2, Save, X, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import { formatCurrency, formatNumber, parseNumber } from '../utils';

interface Props {
  employees: Employee[];
  onSave: (emp: Employee) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}

export const EmployeeForm: React.FC<Props> = ({ employees, onSave, onDelete, onClear }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Employee>({
    id: '',
    name: '',
    nip: '',
    pangkatGol: '',
    jabatan: '',
    representationLuar: 0,
    representationDalam: 0
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, id: formData.id || Date.now().toString() });
    resetForm();
  };

  const resetForm = () => {
    setFormData({ id: '', name: '', nip: '', pangkatGol: '', jabatan: '', representationLuar: 0, representationDalam: 0 });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleEdit = (emp: Employee) => {
    setFormData(emp);
    setEditingId(emp.id);
    setIsAdding(true);
  };

  const handleDelete = (id: string) => {
    onDelete(id);
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      const newEmployees: Employee[] = [];
      const now = Date.now();
      
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length === 0) continue;

        if (row.length >= 5) {
          newEmployees.push({
            id: (now + i).toString(),
            name: String(row[0] || '').trim(),
            nip: String(row[1] || '').trim(),
            pangkatGol: `${String(row[3] || '').trim()} (${String(row[2] || '').trim()})`.trim(),
            jabatan: String(row[4] || '').trim(),
            representationLuar: 0,
            representationDalam: 0
          });
        }
      }

      if (newEmployees.length > 0) {
        newEmployees.forEach(emp => onSave(emp));
        alert(`Berhasil mengimpor ${newEmployees.length} data pegawai.`);
      } else {
        alert("Format Excel tidak sesuai. Pastikan ada minimal 5 kolom: Nama, NIP, Gol., Pangkat, Jabatan.");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Data Pegawai</h2>
          <p className="text-[10px] text-slate-500 font-medium mt-0.5 italic">Format Import: Nama, NIP, Gol., Pangkat, Jabatan</p>
        </div>
        <div className="flex gap-2">
          {employees.length > 0 && (
            <button 
              onClick={() => { if(confirm('Hapus semua data pegawai?')) onClear(); }}
              className="flex items-center gap-2 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 px-4 py-2 rounded-lg transition text-xs font-bold uppercase tracking-wider"
            >
              <Trash2 size={16} /> Hapus Semua
            </button>
          )}
          <label className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg cursor-pointer transition text-xs font-bold uppercase tracking-wider">
            <Upload size={16} /> Impor Excel
            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleExcelImport} />
          </label>
          {!isAdding && (
            <button 
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition text-xs font-bold uppercase tracking-wider"
            >
              <Plus size={16} /> Tambah Manual
            </button>
          )}
        </div>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="p-6 bg-blue-50/30 border-b border-blue-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nama Pegawai</label>
            <input required className="w-full p-2 border border-slate-200 rounded-lg text-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">NIP</label>
            <input required className="w-full p-2 border border-slate-200 rounded-lg text-sm font-mono" value={formData.nip} onChange={e => setFormData({...formData, nip: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pangkat/Gol (Contoh: Pembina IV/a)</label>
            <input required className="w-full p-2 border border-slate-200 rounded-lg text-sm" value={formData.pangkatGol} onChange={e => setFormData({...formData, pangkatGol: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Jabatan</label>
            <input required className="w-full p-2 border border-slate-200 rounded-lg text-sm" value={formData.jabatan} onChange={e => setFormData({...formData, jabatan: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Repres. Luar Daerah (Rp)</label>
            <input type="text" className="w-full p-2 border border-slate-200 rounded-lg text-sm font-bold" value={formatNumber(formData.representationLuar)} onChange={e => setFormData({...formData, representationLuar: parseNumber(e.target.value)})} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Repres. Dalam Daerah (Rp)</label>
            <input type="text" className="w-full p-2 border border-slate-200 rounded-lg text-sm font-bold" value={formatNumber(formData.representationDalam)} onChange={e => setFormData({...formData, representationDalam: parseNumber(e.target.value)})} />
          </div>
          <div className="lg:col-span-3 flex gap-2 justify-end mt-2">
            <button type="button" onClick={resetForm} className="px-6 py-2 text-gray-500 hover:bg-gray-100 rounded-lg font-bold text-sm">Batal</button>
            <button type="submit" className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-8 py-2 rounded-lg font-black text-sm uppercase"><Save size={18} /> Simpan Data</button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-100">
            <tr>
              <th className="px-6 py-4">Nama / NIP</th>
              <th className="px-6 py-4 text-center">Jabatan & Pangkat</th>
              <th className="px-6 py-4 text-right">Repres (L/D)</th>
              <th className="px-6 py-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {employees.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">Belum ada data pegawai. Gunakan tombol Impor Excel atau Tambah Manual.</td></tr>
            ) : (
              employees.map(emp => (
                <tr key={emp.id} className="hover:bg-slate-50 transition text-xs">
                  <td className="px-6 py-4">
                    <div className="font-black text-slate-800 uppercase tracking-tight">{emp.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono font-bold">{emp.nip}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-700">{emp.jabatan}</div>
                    <div className="text-[10px] text-slate-400 font-medium uppercase">{emp.pangkatGol}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="text-blue-600 font-black">L: {formatCurrency(emp.representationLuar || 0)}</div>
                    <div className="text-emerald-600 font-black">D: {formatCurrency(emp.representationDalam || 0)}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex gap-2 justify-end items-center">
                      <button onClick={() => handleEdit(emp)} className="text-blue-400 hover:text-blue-600 transition p-2 rounded-lg hover:bg-blue-50" title="Edit Pegawai">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(emp.id)} className="text-red-400 hover:text-red-600 transition p-2 rounded-lg hover:bg-red-50" title="Hapus Pegawai">
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
