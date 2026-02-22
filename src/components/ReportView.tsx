
import React, { useState, useMemo } from 'react';
import { Employee, TravelAssignment, TravelCost } from '../types';
import { Users, Calendar, Wallet, FileBarChart, Search, Info, UserSearch } from 'lucide-react';
import { formatCurrency, formatDateID } from '../utils';

interface Props {
  employees: Employee[];
  assignments: TravelAssignment[];
  onOpenDestManager: (assignment: TravelAssignment) => void;
}

export const ReportView: React.FC<Props> = ({ employees, assignments, onOpenDestManager }) => {
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => 
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      emp.nip.includes(searchTerm)
    );
  }, [employees, searchTerm]);

  const employeeHistory = useMemo(() => {
    if (!selectedEmpId) return [];
    
    return assignments
      .filter(a => a.selectedEmployeeIds.includes(selectedEmpId))
      .map(a => {
        const personalCost = a.costs.find(c => c.employeeId === selectedEmpId);
        return {
          ...a,
          personalCost
        };
      })
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [selectedEmpId, assignments]);

  const stats = useMemo(() => {
    if (employeeHistory.length === 0) return { trips: 0, days: 0, cost: 0 };

    return employeeHistory.reduce((acc, trip) => {
      const pc = trip.personalCost;
      const tripCost = pc ? (
        (pc.dailyAllowance * pc.dailyDays) + 
        (pc.lodging * pc.lodgingDays) + 
        pc.transportBbm + pc.seaTransport + pc.airTransport + pc.taxi + 
        (pc.representation * pc.representationDays)
      ) : 0;

      return {
        trips: acc.trips + 1,
        days: acc.days + trip.durationDays,
        cost: acc.cost + tripCost
      };
    }, { trips: 0, days: 0, cost: 0 });
  }, [employeeHistory]);

  const selectedEmp = employees.find(e => e.id === selectedEmpId);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800 uppercase tracking-tight">
            <Users className="text-blue-600" size={22} /> Pilih Pegawai untuk Laporan
          </h3>
          <div className="relative w-full md:w-80">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Cari nama atau NIP..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition font-medium"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-48 overflow-y-auto p-1 custom-scrollbar">
          {filteredEmployees.map(emp => (
            <button
              key={emp.id}
              onClick={() => setSelectedEmpId(emp.id)}
              className={`p-3 border rounded-xl text-left transition ${
                selectedEmpId === emp.id 
                ? 'bg-blue-600 border-blue-600 text-white shadow-lg' 
                : 'hover:bg-slate-50 border-slate-100 text-slate-700'
              }`}
            >
              <div className="text-xs font-black uppercase line-clamp-1">{emp.name}</div>
              <div className={`text-[10px] font-mono mt-0.5 ${selectedEmpId === emp.id ? 'text-blue-100' : 'text-slate-400'}`}>
                {emp.nip}
              </div>
            </button>
          ))}
          {filteredEmployees.length === 0 && (
            <div className="col-span-full py-4 text-center text-slate-400 italic text-sm">
              Pegawai tidak ditemukan.
            </div>
          )}
        </div>
      </div>

      {selectedEmpId && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <Calendar size={24} />
              </div>
              <div>
                <div className="text-2xl font-black text-slate-800">{stats.trips}</div>
                <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Total Perjalanan</div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                <Info size={24} />
              </div>
              <div>
                <div className="text-2xl font-black text-slate-800">{stats.days}</div>
                <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Total Hari Dinas</div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                <Wallet size={24} />
              </div>
              <div>
                <div className="text-2xl font-black text-slate-800">Rp {formatCurrency(stats.cost)}</div>
                <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Total Biaya Akumulasi</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 border-b bg-slate-50/50">
              <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">
                Riwayat Perjalanan : <span className="text-blue-600">{selectedEmp?.name}</span>
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Waktu & SPT</th>
                    <th className="px-6 py-4">Tujuan & Maksud</th>
                    <th className="px-6 py-4 text-right">Biaya Personal</th>
                    <th className="px-6 py-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employeeHistory.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">
                        Belum ada riwayat perjalanan untuk pegawai ini.
                      </td>
                    </tr>
                  ) : (
                    employeeHistory.map(trip => {
                      const pc = trip.personalCost!;
                      const tripCost = (pc.dailyAllowance * pc.dailyDays) + 
                                       (pc.lodging * pc.lodgingDays) + 
                                       pc.transportBbm + pc.seaTransport + pc.airTransport + pc.taxi + 
                                       (pc.representation * pc.representationDays);
                      return (
                        <tr key={trip.id} className="hover:bg-slate-50 transition group">
                          <td className="px-6 py-4">
                            <div className="text-xs font-bold text-slate-800">{formatDateID(trip.startDate)}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{trip.assignmentNumber}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-xs font-black text-slate-700 uppercase">{trip.destination}</div>
                            <div className="text-[10px] text-slate-500 line-clamp-1 italic">{trip.purpose}</div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="text-sm font-black text-blue-600">Rp {formatCurrency(tripCost)}</div>
                            <div className="text-[9px] text-slate-400 uppercase font-bold tracking-tighter">Durasi: {trip.durationDays} Hari</div>
                          </td>
                          <td className="px-6 py-4 text-center">
                             <button 
                               onClick={() => onOpenDestManager(trip)}
                               className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition shadow-sm border border-emerald-100 flex items-center gap-1.5 mx-auto"
                               title="Atur Pejabat Tujuan"
                             >
                               <UserSearch size={16} />
                               <span className="text-[10px] font-black uppercase">TTD Tujuan</span>
                             </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!selectedEmpId && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-12 text-center">
          <FileBarChart size={48} className="mx-auto text-blue-200 mb-4" />
          <h4 className="text-blue-800 font-bold">Laporan Perorangan</h4>
          <p className="text-blue-500 text-sm max-w-sm mx-auto mt-2">
            Pilih salah satu nama pegawai di atas untuk melihat ringkasan histori perjalanan dinas dan total biaya yang telah dikeluarkan.
          </p>
        </div>
      )}
    </div>
  );
};
