
import React from 'react';
import { TravelAssignment, Employee, SKPDConfig, Official, DestinationOfficial } from '../types';
import { numberToWords, formatDateID, formatNumber } from '../utils';

interface Props {
  assignment: TravelAssignment;
  employees: Employee[];
  skpd: SKPDConfig;
  officials: Official[];
  destinationOfficials: DestinationOfficial[];
}

const DEFAULT_LOGO = "https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Logo_Provinsi_Nusa_TENGGARA_BARAT.png/300px-Logo_Provinsi_Nusa_Tenggara_Barat.png";

// Helper untuk format tanggal "Mataram, November 2025"
const formatMonthYear = (dateStr: string, location: string) => {
  if (!dateStr) return `${location}, `;
  const date = new Date(dateStr);
  const monthYear = new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric'
  }).format(date);
  return `${location}, ${monthYear}`;
};

// KONFIGURASI JARAK UNTUK OVERLAY (Disesuaikan untuk presisi baris stempel/TTD)
const BLOCK_STYLE = {
  minHeight: 'min-h-[220px]',
  paddingTop: 'pt-[130px]',
};

const Header: React.FC<{ skpd: SKPDConfig }> = ({ skpd }) => {
  const provinsiValue = skpd.provinsi?.trim() || '';
  const displayProvinsiBaris1 = provinsiValue || "PROVINSI NUSA TENGGARA BARAT";
  const isProvInName = provinsiValue && (
    skpd.namaSkpd.toUpperCase().includes(provinsiValue.toUpperCase()) ||
    skpd.namaSkpd.toUpperCase().includes(provinsiValue.toUpperCase().replace('PROVINSI ', 'PROV. '))
  );
  
  const nameLen = skpd.namaSkpd.length;
  let skpdFontSize = 'text-[20pt]';
  if (nameLen > 55) skpdFontSize = 'text-[14pt]';
  else if (nameLen > 40) skpdFontSize = 'text-[17pt]';

  return (
    <div className="text-center mb-4 font-['Tahoma']">
      <div className="flex items-center justify-between gap-6 pb-2">
        <div className="w-20 h-20 flex items-center justify-center flex-shrink-0">
          <img src={skpd.logo || DEFAULT_LOGO} alt="Logo" className="max-w-full max-h-full object-contain" />
        </div>
        <div className="flex-1 px-2">
          <h3 className="text-[12pt] font-normal uppercase whitespace-nowrap leading-tight">Pemerintah {displayProvinsiBaris1}</h3>
          <h2 className={`${skpdFontSize} font-bold uppercase whitespace-nowrap leading-tight mt-1 mb-0.5`}>{skpd.namaSkpd}</h2>
          {provinsiValue && !isProvInName && (
            <h2 className={`${skpdFontSize} font-bold uppercase whitespace-nowrap leading-tight mb-1`}>{provinsiValue.toUpperCase()}</h2>
          )}
          <p className="text-[9pt] font-normal leading-tight mt-1">{skpd.alamat}</p>
          {skpd.lokasi && <p className="text-[9pt] font-bold uppercase tracking-tight mt-0.5">{skpd.lokasi}</p>}
        </div>
        <div className="w-20 h-20 flex-shrink-0 opacity-0">Logo</div>
      </div>
      <div className="border-b-[2.5pt] border-black mt-1"></div>
      <div className="border-b-[0.5pt] border-black mt-[1.5pt]"></div>
    </div>
  );
};

const getSignatories = (assignment: TravelAssignment, officials: Official[], skpd: SKPDConfig) => {
  const formatFallbackJabatan = () => {
    const prefix = skpd.kepalaJabatan.toUpperCase();
    const name = skpd.namaSkpd.toUpperCase();
    const typeOnly = prefix.replace('KEPALA ', '');
    return name.startsWith(typeOnly) ? `KEPALA ${name}` : `${prefix} ${name}`;
  };

  const kepala = officials.find(o => o.id === assignment.signerId) || { 
    name: skpd.kepalaNama, 
    nip: skpd.kepalaNip, 
    jabatan: formatFallbackJabatan()
  };
  const pptk = officials.find(o => o.id === assignment.pptkId) || { 
    name: skpd.pptkNama, 
    nip: skpd.pptkNip, 
    jabatan: 'Pejabat Pelaksana Teknis Kegiatan' 
  };
  const bendahara = officials.find(o => o.id === assignment.bendaharaId) || { 
    name: skpd.bendaharaNama, 
    nip: skpd.bendaharaNip, 
    jabatan: 'Bendahara Pengeluaran' 
  };
  return { kepala, pptk, bendahara };
};

export const KuitansiTemplate: React.FC<Props> = ({ assignment, employees, skpd, officials }) => {
  const { kepala, bendahara, pptk } = getSignatories(assignment, officials, skpd);
  const totalAll = assignment.costs.reduce((sum, cost) => sum + (cost.dailyAllowance * cost.dailyDays) + (cost.lodging * cost.lodgingDays) + cost.transportBbm + cost.seaTransport + cost.airTransport + cost.taxi + (cost.representation * cost.representationDays), 0);
  const firstEmp = employees.find(e => e.id === assignment.selectedEmployeeIds[0]);

  return (
    <div className="print-page bg-white font-['Tahoma'] text-[11pt] leading-tight text-black">
      <Header skpd={skpd} />
      
      {/* Box Info Kanan Atas */}
      <div className="flex justify-end mb-4">
        <table className="border-collapse border border-black text-[9pt] w-[280px]">
          <tbody>
            <tr><td className="border border-black px-2 py-0.5 w-[100px]">Kode Kegiatan</td><td className="border border-black px-2 py-0.5">: {assignment.subActivityCode}</td></tr>
            <tr><td className="border border-black px-2 py-0.5">Dibukukan Tgl.</td><td className="border border-black px-2 py-0.5">:</td></tr>
            <tr><td className="border border-black px-2 py-0.5">Nomor Buku</td><td className="border border-black px-2 py-0.5">:</td></tr>
            <tr><td className="border border-black px-2 py-0.5">Sumber Dana</td><td className="border border-black px-2 py-0.5">:</td></tr>
          </tbody>
        </table>
      </div>

      <div className="text-center mb-10"><h1 className="text-2xl font-bold underline uppercase tracking-[0.3em]">KWITANSI</h1></div>
      
      <div className="space-y-4 mb-10 pl-4">
        <div className="grid grid-cols-[160px_10px_1fr] items-start">
          <span>Terima dari</span><span>:</span><span className="font-bold uppercase leading-tight">{kepala.jabatan} {skpd.namaSkpd}</span>
        </div>
        <div className="grid grid-cols-[160px_10px_1fr] items-start">
          <span>Banyaknya</span><span>:</span><span className="font-bold italic">///// {numberToWords(totalAll)} Rupiah /////</span>
        </div>
        <div className="grid grid-cols-[160px_10px_1fr] items-start">
          <span>Untuk Pembayaran</span><span>:</span>
          <span className="text-justify leading-relaxed">
            Belanja Perjalanan Dinas Dalam Daerah ke {assignment.destination} selama {assignment.durationDays} hari Dalam rangka {assignment.purpose} sesuai Surat Perintah Tugas Kepala {skpd.namaSkpd} Nomor : {assignment.assignmentNumber} tanggal {formatDateID(assignment.signDate)} A.n. {firstEmp?.name}, sesuai daftar penerimaan terlampir
          </span>
        </div>
      </div>

      <div className="border-t-2 border-b-2 border-black py-2 mb-10 flex items-center px-4 gap-4 w-fit">
        <span className="font-bold">Terbilang</span><span className="font-bold">Rp.</span><span className="font-bold text-lg min-w-[150px] text-right">{formatNumber(totalAll)}</span>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center text-[10pt]">
        <div className="flex flex-col">
          <p>Mengetahui/Menyetujui :</p>
          <p className="font-bold uppercase leading-tight h-10">{kepala.jabatan}</p>
          <div className="h-20"></div>
          <p className="font-bold underline uppercase">{kepala.name}</p>
          <p>NIP. {kepala.nip}</p>
        </div>
        <div className="flex flex-col">
          <p>Lunas dibayar :</p>
          <p className="font-bold uppercase leading-tight h-10">{bendahara.jabatan},</p>
          <div className="h-20"></div>
          <p className="font-bold underline uppercase">{bendahara.name}</p>
          <p>NIP. {bendahara.nip}</p>
        </div>
        <div className="flex flex-col">
          <p>{formatMonthYear(assignment.signDate, skpd.lokasi)}</p>
          <p className="font-bold uppercase leading-tight h-10">Yang menerima uang,</p>
          <div className="h-20"></div>
          <p className="font-bold underline uppercase">{firstEmp?.name}</p>
          <p>NIP. {firstEmp?.nip}</p>
        </div>
      </div>

      <div className="mt-12 text-center flex flex-col items-center text-[10pt]">
        <p className="font-normal">Mengetahui,</p>
        <p className="font-bold uppercase">Pejabat Pelaksana Teknis Kegiatan</p>
        <div className="h-20"></div>
        <p className="font-bold underline uppercase">{pptk.name}</p>
        <p>NIP. {pptk.nip}</p>
      </div>
    </div>
  );
};

export const LampiranIIITemplate: React.FC<Props> = ({ assignment, employees, skpd, officials }) => {
  const { kepala, bendahara } = getSignatories(assignment, officials, skpd);
  
  return (
    <div className="space-y-8 font-['Tahoma'] text-black">
      {assignment.costs.map((cost) => {
        const emp = employees.find(e => e.id === cost.employeeId);
        if (!emp) return null;
        const grandTotal = (cost.dailyAllowance * cost.dailyDays) + (cost.lodging * cost.lodgingDays) + cost.transportBbm + cost.seaTransport + cost.airTransport + cost.taxi + (cost.representation * cost.representationDays);

        return (
          <div key={cost.employeeId} className="print-page bg-white text-[10.5pt] leading-tight">
             <div className="text-center mb-10"><h2 className="text-[13pt] font-bold underline uppercase">RINCIAN BIAYA TRANSPORT</h2></div>
             
             <div className="mb-6 space-y-1">
                <div className="grid grid-cols-[160px_10px_1fr]"><span>Lampiran SPPD Nomor</span><span>:</span><span>{assignment.assignmentNumber}</span></div>
                <div className="grid grid-cols-[160px_10px_1fr]"><span>Tanggal</span><span>:</span><span>{formatDateID(assignment.endDate)}</span></div>
             </div>

             <table className="w-full border-collapse border border-black mb-2 text-[10.5pt]">
                <thead className="text-center font-bold">
                  <tr>
                    <th className="border border-black p-2 w-[40px]">No.</th>
                    <th className="border border-black p-2">Perincian Biaya</th>
                    <th className="border border-black p-2 w-[180px]">Jumlah</th>
                    <th className="border border-black p-2 w-[120px]">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Transportasi Section */}
                  <tr className="align-top">
                    <td className="border border-black p-2 text-center">1</td>
                    <td className="border border-black p-2">
                      <p className="font-bold mb-1">Transportasi</p>
                      <div className="pl-2 space-y-0.5">
                        {cost.taxi > 0 && <div className="grid grid-cols-[160px_10px_60px_20px_10px_1fr]"><span>- Taksi</span><span>:</span><span>1 Kali</span><span>X</span><span>Rp.</span><span className="text-right">{formatNumber(cost.taxi)}</span></div>}
                        {cost.transportBbm > 0 && <div className="grid grid-cols-[160px_10px_60px_20px_10px_1fr]"><span>- Transport/BBM (PP)</span><span>:</span><span>1 Kali</span><span>X</span><span>Rp.</span><span className="text-right">{formatNumber(cost.transportBbm)}</span></div>}
                        {cost.seaTransport > 0 && <div className="grid grid-cols-[160px_10px_60px_20px_10px_1fr]"><span>- Transport Laut</span><span>:</span><span>1 Kali</span><span>X</span><span>Rp.</span><span className="text-right">{formatNumber(cost.seaTransport)}</span></div>}
                        {cost.airTransport > 0 && <div className="grid grid-cols-[160px_10px_60px_20px_10px_1fr]"><span>- Pesawat</span><span>:</span><span>1 Kali</span><span>X</span><span>Rp.</span><span className="text-right">{formatNumber(cost.airTransport)}</span></div>}
                      </div>
                    </td>
                    <td className="border border-black p-2">
                      <div className="flex justify-between w-full h-full pt-6"><span>Rp.</span><span className="text-right">{formatNumber(cost.taxi + cost.transportBbm + cost.seaTransport + cost.airTransport)}</span></div>
                    </td>
                    <td className="border border-black p-2"></td>
                  </tr>

                  {/* Penginapan Section */}
                  <tr className="align-top">
                    <td className="border border-black p-2 text-center">2</td>
                    <td className="border border-black p-2">
                      <div className="grid grid-cols-[160px_10px_60px_20px_10px_1fr]">
                        <span className="font-bold">Biaya penginapan</span><span>:</span><span>{cost.lodgingDays} OH</span><span>X</span><span>Rp.</span><span className="text-right">{formatNumber(cost.lodging)}</span>
                      </div>
                    </td>
                    <td className="border border-black p-2">
                      <div className="flex justify-between w-full"><span>Rp.</span><span className="text-right">{formatNumber(cost.lodging * cost.lodgingDays)}</span></div>
                    </td>
                    <td className="border border-black p-2"></td>
                  </tr>

                  {/* Uang Harian Section */}
                  <tr className="align-top">
                    <td className="border border-black p-2 text-center">3</td>
                    <td className="border border-black p-2">
                      <div className="grid grid-cols-[160px_10px_60px_20px_10px_1fr]">
                        <span className="font-bold">Uang Harian Golongan {emp.pangkatGol.split(' ').pop()?.replace(/[()]/g, '')}</span><span>:</span>
                      </div>
                      <div className="pl-2 grid grid-cols-[160px_10px_60px_20px_10px_1fr] mt-1">
                        <span>- Uang Harian</span><span>:</span><span>{cost.dailyDays} OH</span><span>X</span><span>Rp.</span><span className="text-right">{formatNumber(cost.dailyAllowance)}</span>
                      </div>
                    </td>
                    <td className="border border-black p-2">
                      <div className="flex justify-between w-full h-full pt-4"><span>Rp.</span><span className="text-right">{formatNumber(cost.dailyAllowance * cost.dailyDays)}</span></div>
                    </td>
                    <td className="border border-black p-2"></td>
                  </tr>

                  {/* Representasi Section */}
                  <tr className="align-top">
                    <td className="border border-black p-2 text-center">4</td>
                    <td className="border border-black p-2">
                      <div className="grid grid-cols-[160px_10px_60px_20px_10px_1fr]">
                        <span className="font-bold">Uang Representasi</span><span>:</span><span>{cost.representationDays} OH</span><span>X</span><span>Rp.</span><span className="text-right">{formatNumber(cost.representation)}</span>
                      </div>
                    </td>
                    <td className="border border-black p-2">
                      <div className="flex justify-between w-full"><span>Rp.</span><span className="text-right">{formatNumber(cost.representation * cost.representationDays)}</span></div>
                    </td>
                    <td className="border border-black p-2"></td>
                  </tr>
                </tbody>
                <tfoot className="font-bold text-center">
                  <tr>
                    <td colSpan={2} className="border border-black p-2 uppercase">Jumlah</td>
                    <td className="border border-black p-2">
                       <div className="flex justify-between w-full"><span>Rp.</span><span className="text-right">{formatNumber(grandTotal)}</span></div>
                    </td>
                    <td className="border border-black p-2"></td>
                  </tr>
                </tfoot>
             </table>

             <div className="italic mb-12 uppercase font-bold text-[10pt] leading-relaxed">///// {numberToWords(grandTotal)} Rupiah /////</div>

             <div className="grid grid-cols-2 gap-4 text-center mb-10">
               <div>
                  <p>{formatMonthYear(assignment.signDate, skpd.lokasi)}</p>
                  <p>Telah dibayar sejumlah</p>
                  <p className="font-bold">Rp. {formatNumber(grandTotal)}</p>
                  <div className="h-4"></div>
                  <p className="font-bold uppercase mb-20">{bendahara.jabatan},</p>
                  <p className="font-bold underline uppercase">{bendahara.name}</p>
                  <p>NIP. {bendahara.nip}</p>
               </div>
               <div>
                  <p>{formatMonthYear(assignment.signDate, skpd.lokasi)}</p>
                  <p>Telah menerima jumlah uang sebesar</p>
                  <p className="font-bold">Rp. {formatNumber(grandTotal)}</p>
                  <div className="h-4"></div>
                  <p className="font-bold uppercase mb-20">Yang menerima,</p>
                  <p className="font-bold underline uppercase">{emp.name}</p>
                  <p>NIP. {emp.nip}</p>
               </div>
             </div>

             {/* SPD Rampung Section */}
             <div className="border-t border-black pt-4">
                <div className="flex justify-center mb-6">
                   <div className="w-[300px]">
                      <h3 className="font-bold text-center underline uppercase mb-4">PERHITUNGAN SPD RAMPUNG</h3>
                      <div className="space-y-1 text-[10pt]">
                        <div className="grid grid-cols-[120px_10px_30px_1fr]"><span>Ditetapkan sejumlah</span><span>:</span><span>Rp.</span><span className="text-right">{formatNumber(grandTotal)}</span></div>
                        <div className="grid grid-cols-[120px_10px_30px_1fr]"><span>Yang telah dibayar</span><span>:</span><span>Rp.</span><span className="text-right">{formatNumber(grandTotal)}</span></div>
                        <div className="border-b border-black w-full my-1"></div>
                        <div className="grid grid-cols-[120px_10px_30px_1fr]"><span>Sisa kurang/lebih</span><span>:</span><span>Rp.</span><span className="text-right">-</span></div>
                      </div>
                   </div>
                </div>

                <div className="text-center mt-6">
                   <p className="font-normal mb-1 italic">Mengetahui/Menyetujui :</p>
                   <p className="font-bold uppercase leading-tight h-10">{kepala.jabatan} {skpd.namaSkpd}</p>
                   <div className="h-20"></div>
                   <p className="font-bold underline uppercase">{kepala.name}</p>
                   <p>NIP. {kepala.nip}</p>
                </div>
             </div>
          </div>
        );
      })}
    </div>
  );
};

export const SPTTemplate: React.FC<Props> = ({ assignment, employees, skpd, officials }) => {
  const selectedEmps = assignment.selectedEmployeeIds.map(id => employees.find(e => e.id === id)).filter((e): e is Employee => !!e);
  const { kepala } = getSignatories(assignment, officials, skpd);

  return (
    <div className="print-page bg-white font-['Tahoma'] text-black leading-tight text-[11pt]">
      <Header skpd={skpd} />
      <div className="text-center mb-6">
        <h2 className="text-[12pt] font-bold underline uppercase decoration-1 underline-offset-2">Surat Tugas</h2>
        <p className="font-medium">Nomor : {assignment.assignmentNumber}</p>
      </div>

      <table className="w-full mb-4">
        <tbody className="align-top">
          <tr>
            <td className="w-16 py-1">Dasar</td>
            <td className="w-4 py-1 text-center">:</td>
            <td className="py-1">
              <div className="flex gap-2 mb-1">
                <span>1.</span>
                <span className="text-justify">Keputusan Gubernur Nusa Tenggara Barat Nomor: 34 Tahun 2018 Tentang Perubahan Keempat Atas Peraturan Gubernur Nomor: 1 Tahun 2015 tentang Biaya Perjalanan Dinas di lingkungan Pemerintah Provinsi Nusa Tenggara Barat.</span>
              </div>
              <div className="flex gap-2">
                <span>2.</span>
                <span className="text-justify">Peraturan Gubernur Nusa Tenggara Barat Nomor: 81 Tahun 2020 Tentang Perjalanan Dinas.</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="text-center font-bold mb-4 tracking-widest">MEMERINTAHKAN :</div>

      <table className="w-full mb-4">
        <tbody className="align-top">
          <tr>
            <td className="w-24 py-1 font-bold">Kepada</td>
            <td className="w-4 py-1 text-center">:</td>
            <td className="py-1">
              {selectedEmps.map((emp, i) => (
                <div key={emp.id} className="grid grid-cols-[25px_110px_10px_1fr] mb-3 last:mb-0">
                  <span className="font-bold">{i + 1}.</span>
                  <span>Nama</span><span>:</span><span className="font-bold">{emp.name}</span>
                  <span></span><span>Pangkat / Gol.</span><span>:</span><span>{emp.pangkatGol}</span>
                  <span></span><span>NIP</span><span>:</span><span>{emp.nip}</span>
                  <span></span><span>Jabatan</span><span>:</span><span>{emp.jabatan}</span>
                </div>
              ))}
            </td>
          </tr>
          <tr>
            <td className="py-2 font-bold">Untuk</td>
            <td className="text-center">:</td>
            <td className="py-2 text-justify">{assignment.purpose}</td>
          </tr>
          <tr>
            <td className="py-1 font-bold">Tanggal</td>
            <td className="text-center">:</td>
            <td className="py-1">{formatDateID(assignment.startDate)} s.d {formatDateID(assignment.endDate)} ({assignment.durationDays} Hari)</td>
          </tr>
          <tr>
            <td className="py-1 font-bold">Daerah Tujuan</td>
            <td className="text-center">:</td>
            <td className="py-1">{assignment.destination}</td>
          </tr>
          <tr>
            <td className="py-1 font-bold">Biaya</td>
            <td className="text-center">:</td>
            <td className="py-1">Dibebankan pada DPA {skpd.namaSkpd} Nomor: {assignment.subActivityCode}</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-12 flex justify-end">
        <div className="w-[320px] text-left pl-4">
          <p>Ditetapkan di {skpd.lokasi || 'Mataram'}</p>
          <p className="mb-4">Pada Tanggal {formatDateID(assignment.signDate).split(' ').slice(1).join(' ')}</p>
          <div className="min-h-[60px]">
            <p className="font-bold uppercase leading-tight">{kepala.jabatan}</p>
          </div>
          <div className="h-16"></div>
          <p className="font-bold underline uppercase">{kepala.name}</p>
          <p>NIP. {kepala.nip}</p>
        </div>
      </div>
    </div>
  );
};

export const SPPDFrontTemplate: React.FC<Props> = ({ assignment, employees, skpd, officials }) => {
  const { kepala } = getSignatories(assignment, officials, skpd);
  const firstEmp = employees.find(e => e.id === assignment.selectedEmployeeIds[0]);

  return (
    <div className="print-page bg-white font-['Tahoma'] text-black leading-tight text-[11pt] border border-black relative">
      <Header skpd={skpd} />
      <div className="flex justify-end mb-2">
        <div className="w-1/2 text-[10pt]">
          <div className="grid grid-cols-[80px_10px_1fr]"><span>Lembar Ke</span><span>:</span><span></span></div>
          <div className="grid grid-cols-[80px_10px_1fr]"><span>Kode No</span><span>:</span><span></span></div>
          <div className="grid grid-cols-[80px_10px_1fr]"><span>Nomor</span><span>:</span><span>{assignment.assignmentNumber}</span></div>
        </div>
      </div>
      <div className="text-center mb-4"><h2 className="text-[13pt] font-bold underline uppercase">SURAT PERJALANAN DINAS (SPD)</h2></div>
      <table className="w-full border-collapse border border-black text-[11pt]">
        <tbody>
          <tr><td className="border border-black p-1 w-8 text-center align-top">1.</td><td className="border border-black p-1 w-1/2 align-top">Pejabat Pembuat Komitmen</td><td className="border border-black p-1 align-top">{kepala.jabatan}</td></tr>
          <tr><td className="border border-black p-1 text-center align-top">2.</td><td className="border border-black p-1 align-top">Nama pegawai yang diperintah</td><td className="border border-black p-1 font-bold align-top">{firstEmp?.name}</td></tr>
          <tr><td className="border border-black p-1 text-center align-top">3.</td><td className="border border-black p-1 align-top">a. Pangkat dan Golongan<br/>b. Jabatan / Instansi<br/>c. Tingkat Biaya Perjalanan Dinas</td><td className="border border-black p-1 align-top">a. {firstEmp?.pangkatGol}<br/>b. {firstEmp?.jabatan}<br/>c. </td></tr>
          <tr><td className="border border-black p-1 text-center align-top">4.</td><td className="border border-black p-1 align-top">Maksud Perjalanan Dinas</td><td className="border border-black p-1 align-top">{assignment.purpose}</td></tr>
          <tr><td className="border border-black p-1 text-center align-top">5.</td><td className="border border-black p-1 align-top">Alat angkut yang dipergunakan</td><td className="border border-black p-1 align-top">{assignment.transportation}</td></tr>
          <tr><td className="border border-black p-1 text-center align-top">6.</td><td className="border border-black p-1 align-top">a. Tempat berangkat<br/>b. Tempat tujuan</td><td className="border border-black p-1 align-top">a. {assignment.origin}<br/>b. {assignment.destination}</td></tr>
          <tr><td className="border border-black p-1 text-center align-top">7.</td><td className="border border-black p-1 align-top">a. Lamanya Perjalanan Dinas<br/>b. Tanggal berangkat<br/>c. Tanggal harus kembali/tiba di tempat baru</td><td className="border border-black p-1 align-top">a. {assignment.durationDays} ( {numberToWords(assignment.durationDays)} ) Hari<br/>b. {formatDateID(assignment.startDate)}<br/>c. {formatDateID(assignment.endDate)}</td></tr>
          <tr><td className="border border-black p-1 text-center align-top">8.</td><td className="border border-black p-1 align-top">Pengikut : Nama</td><td className="border border-black p-1 align-top">{assignment.selectedEmployeeIds.slice(1).map((id, idx) => (<div key={id}>{idx + 1}. {employees.find(e => e.id === id)?.name}</div>))}</td></tr>
          <tr><td className="border border-black p-1 text-center align-top">9.</td><td className="border border-black p-1 align-top">Pembebanan Anggaran<br/>a. Instansi<br/>b. Akun</td><td className="border border-black p-1 align-top"><br/>a. {skpd.namaSkpd}<br/>b. {assignment.subActivityCode}</td></tr>
          <tr><td className="border border-black p-1 text-center align-top">10.</td><td className="border border-black p-1 align-top">Keterangan lain-lain</td><td className="border border-black p-1 align-top"></td></tr>
        </tbody>
      </table>
      <div className="mt-8 grid grid-cols-2 text-[11pt]">
        <div></div>
        <div className="text-left pl-12">
          <p>Dikeluarkan di : {skpd.lokasi || 'Mataram'}</p>
          <p className="mb-4">Pada Tanggal : {formatDateID(assignment.signDate).split(' ').slice(1).join(' ')}</p>
          <div className="min-h-[50px]"><p className="font-bold uppercase leading-tight">{kepala.jabatan}</p></div>
          <div className="h-16"></div>
          <p className="font-bold underline uppercase">{kepala.name}</p>
          <p>NIP. {kepala.nip}</p>
        </div>
      </div>
    </div>
  );
};

export const SPPDBackTemplate: React.FC<Props> = ({ assignment, skpd, officials, destinationOfficials }) => {
  const { kepala, pptk } = getSignatories(assignment, officials, skpd);
  
  return (
    <div className="print-page bg-white font-['Tahoma'] text-[10pt] border border-black relative leading-tight text-black">
      <div className="flex justify-end mt-4 px-2">
        <div className="w-[340px] space-y-0.5 mb-2">
          <div className="grid grid-cols-[100px_10px_1fr]"><span>SPPD No.</span><span>:</span><span className="font-bold">{assignment.assignmentNumber}</span></div>
          <div className="grid grid-cols-[100px_10px_1fr]"><span>Berangkat dari</span><span>:</span><span>{assignment.origin}</span></div>
          <div className="grid grid-cols-[100px_10px_1fr]"><span>Pada tanggal</span><span>:</span><span>{formatDateID(assignment.startDate)}</span></div>
          <div className="grid grid-cols-[100px_10px_1fr]"><span>Ke</span><span>:</span><span>{assignment.destination}</span></div>
          
          <div className="pt-6 text-center">
            <p className="font-bold uppercase text-[9pt] leading-tight mb-14">{pptk.jabatan}</p>
            <p className="font-bold underline uppercase text-[10pt] tracking-tight">{pptk.name}</p>
            <p className="text-[9pt]">NIP. {pptk.nip}</p>
          </div>
        </div>
      </div>

      <div className="space-y-0 border-t border-black">
        {['II.', 'III.', 'IV.'].map((label, idx) => {
          return (
            <div key={label} className={`grid grid-cols-2 border-b border-black ${BLOCK_STYLE.minHeight}`}>
              {/* Sisi Kiri (Tiba di) */}
              <div className="border-r border-black p-2 flex flex-col h-full">
                <div className="grid grid-cols-[30px_95px_10px_1fr] gap-y-0.5">
                  <span className="font-bold">{label}</span><span>Tiba di</span><span>:</span><span>{idx === 0 ? assignment.destination : ''}</span>
                  <span></span><span>Pada tanggal</span><span>:</span><span>{idx === 0 ? formatDateID(assignment.startDate) : ''}</span>
                  <span></span><span className="font-bold">Kepala</span><span className="font-bold">:</span><span></span>
                </div>
                
                <div className={`flex-1 flex ${BLOCK_STYLE.paddingTop} items-start`}>
                   <div className="flex-1 text-center">
                     {/* Data Pejabat Tujuan akan dicetak lewat Overlay TTD TUJUAN */}
                   </div>
                </div>
              </div>

              {/* Sisi Kanan (Berangkat dari) */}
              <div className="p-2 flex flex-col h-full">
                <div className="grid grid-cols-[95px_10px_1fr] gap-y-0.5">
                  <span>Berangkat dari</span><span>:</span><span>{idx === 0 ? assignment.destination : ''}</span>
                  <span>Ke</span><span>:</span><span>{idx === 0 ? (skpd.lokasi || 'Mataram') : ''}</span>
                  <span>Pada tanggal</span><span>:</span><span>{idx === 0 ? formatDateID(assignment.endDate) : ''}</span>
                  <span className="font-bold">Kepala</span><span className="font-bold">:</span><span></span>
                </div>

                <div className={`flex-1 flex ${BLOCK_STYLE.paddingTop} items-start`}>
                   <div className="flex-1 text-center">
                     {/* Data Pejabat Tujuan akan dicetak lewat Overlay TTD TUJUAN */}
                   </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-2 px-2 space-y-1">
        <div className="border-b border-black pb-1">
          <p className="text-justify text-[8.5pt] leading-relaxed">
            V. Telah diperiksa, with keterangan bahwa perjalanan tersebut di atas benar dilakukan atas perintahnya dan semata-mata untuk kepentingan jabatan dalam waktu yang sesingkat-singkatnya.
          </p>
        </div>
        
        <div className="grid grid-cols-[120px_1fr] gap-1 items-center">
          <span className="font-bold text-[8.5pt] whitespace-nowrap">VI. CATATAN LAIN-LAIN</span>
          <div className="border-b border-black w-full h-px"></div>
        </div>

        <div className="border-b border-black pb-1">
          <p className="text-justify text-[8pt] leading-snug">
            VII. Pejabat yang berwenang menerbitkan SPPD, pegawai yang melakukan perjalanan dinas, para pejabat yang mengesahkan tanggal berangkat / tiba serta Bendaharawan bertanggung jawab berdasarkan peraturan-peraturan keuangan negara apabila negara mendapat rugi akibat kesalahan, kealpaannya.
          </p>
        </div>

        <div className="grid grid-cols-2 mt-2">
          <div></div>
          <div className="text-center">
            <div className="min-h-[40px]">
              <p className="font-bold uppercase leading-tight text-[9.5pt]">{kepala.jabatan}</p>
            </div>
            <div className="h-16"></div>
            <p className="font-bold underline uppercase text-[10.5pt]">{kepala.name}</p>
            <p className="text-[9.5pt]">NIP. {kepala.nip}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export const PejabatTujuanTemplate: React.FC<Props> = ({ assignment, destinationOfficials }) => {
  const destIds = assignment.destinationOfficialIds || [];
  const getDestOfficial = (index: number) => destinationOfficials.find(o => o.id === (destIds[index] || ''));

  return (
    <div className="print-page bg-transparent font-['Tahoma'] text-[10pt] relative leading-tight">
      <div className="space-y-0 mt-[165px]">
        {['II.', 'III.', 'IV.'].map((label, idx) => {
          const destOff = getDestOfficial(idx);
          if (!destOff) return <div key={label} className={BLOCK_STYLE.minHeight}></div>;

          return (
            <div key={label} className={`grid grid-cols-2 ${BLOCK_STYLE.minHeight}`}>
              <div className="p-2 flex flex-col h-full">
                <div className="grid grid-cols-[30px_95px_10px_1fr] gap-y-0.5 opacity-0">
                   <span></span><span></span><span></span><span></span>
                   <span></span><span></span><span></span><span></span>
                   <span></span><span>Kepala</span><span>:</span><span></span>
                </div>
                <div className={`${BLOCK_STYLE.paddingTop} flex-1 text-center`}>
                    <p className="font-bold uppercase text-[9pt] leading-tight text-black">{destOff.jabatan}</p>
                    <p className="font-normal uppercase text-[8pt] leading-tight mb-20 text-black">{destOff.instansi}</p>
                    <p className="font-bold underline uppercase text-[10.5pt] text-black tracking-tight">{destOff.name}</p>
                    <p className="text-[9.5pt] text-black">NIP. {destOff.nip}</p>
                </div>
              </div>

              <div className="p-2 flex flex-col h-full">
                <div className="grid grid-cols-[95px_10px_1fr] gap-y-0.5 opacity-0">
                  <span></span><span></span><span></span>
                  <span></span><span></span><span></span>
                  <span></span><span></span><span></span>
                  <span>Kepala</span><span>:</span><span></span>
                </div>
                <div className={`${BLOCK_STYLE.paddingTop} flex-1 text-center`}>
                    <p className="font-bold uppercase text-[9pt] leading-tight text-black">{destOff.jabatan}</p>
                    <p className="font-normal uppercase text-[8pt] leading-tight mb-20 text-black">{destOff.instansi}</p>
                    <p className="font-bold underline uppercase text-[10.5pt] text-black tracking-tight">{destOff.name}</p>
                    <p className="text-[9.5pt] text-black">NIP. {destOff.nip}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const DaftarPenerimaanTemplate: React.FC<Props> = ({ assignment, employees, skpd, officials }) => {
  const { kepala, bendahara } = getSignatories(assignment, officials, skpd);
  const totalAll = assignment.costs.reduce((sum, cost) => sum + (cost.dailyAllowance * cost.dailyDays) + (cost.lodging * cost.lodgingDays) + cost.transportBbm + cost.seaTransport + cost.airTransport + cost.taxi + (cost.representation * cost.representationDays), 0);

  // Membersihkan redaksi maksud agar tidak terjadi pengulangan "Dalam rangka Dalam rangka"
  const cleanPurpose = (assignment.purpose || '').replace(/^Dalam rangka /i, '');

  return (
    <div className="landscape-page bg-white font-['Tahoma'] text-[9pt] leading-tight p-8 text-black">
       <div className="text-center mb-6 mx-auto max-w-[220mm]">
         <p className="font-normal text-[10pt]">
           Daftar Penerimaan Uang Perjalanan Dinas ke <span className="font-bold">{assignment.destination}</span> Dalam rangka <span className="font-bold">{cleanPurpose}</span> selama <span className="font-bold">{assignment.durationDays || 0} ({numberToWords(assignment.durationDays || 0)}) hari</span> dari tanggal <span className="font-bold">{formatDateID(assignment.startDate)}</span> s.d <span className="font-bold">{formatDateID(assignment.endDate)}</span> sesuai Surat Perintah Tugas {kepala.jabatan} {skpd.namaSkpd} Nomor : <span className="font-bold">{assignment.assignmentNumber}</span> tanggal <span className="font-bold">{formatDateID(assignment.signDate)}</span>
         </p>
       </div>

       <table className="w-full border-collapse border border-black mb-4">
          <thead className="bg-white">
            <tr>
              <th className="border border-black p-1 text-center w-[30px]">No</th>
              <th className="border border-black p-1 text-center min-w-[140px]">Nama</th>
              <th className="border border-black p-1 text-center w-[50px]">Gol</th>
              <th className="border border-black p-1 text-center min-w-[200px]">Lumpsum</th>
              <th className="border border-black p-1 text-center min-w-[200px]">Akomodasi</th>
              <th className="border border-black p-1 text-center">Transportasi</th>
              <th className="border border-black p-1 text-center">Representasi</th>
              <th className="border border-black p-1 text-center w-[100px]">Jumlah</th>
              <th className="border border-black p-1 text-center w-[80px]">Tanda Tangan</th>
            </tr>
          </thead>
          <tbody>
            {assignment.costs.map((cost, i) => {
              const emp = employees.find(e => e.id === cost.employeeId);
              const totalTransport = cost.transportBbm + cost.seaTransport + cost.airTransport + cost.taxi;
              const totalDaily = cost.dailyAllowance * cost.dailyDays;
              const totalLodging = cost.lodging * cost.lodgingDays;
              const totalRepres = cost.representation * cost.representationDays;
              const totalRow = totalDaily + totalLodging + totalTransport + totalRepres;

              return (
                <tr key={cost.employeeId} className="align-middle">
                  <td className="border border-black p-2 text-center">{i + 1}</td>
                  <td className="border border-black p-2 font-normal">{emp?.name}</td>
                  <td className="border border-black p-2 text-center font-bold">{emp?.pangkatGol.split(' ').pop()?.replace(/[()]/g, '')}</td>
                  <td className="border border-black p-2 text-left">
                    <div className="flex justify-between w-full">
                      <span>{cost.dailyDays} hr x Rp</span>
                      <span className="text-right flex-1 px-1">{formatNumber(cost.dailyAllowance)}</span>
                      <span>= Rp</span>
                      <span className="text-right w-20">{formatNumber(totalDaily)}</span>
                    </div>
                  </td>
                  <td className="border border-black p-2 text-left">
                    <div className="flex justify-between w-full">
                      <span>{cost.lodgingDays} hr x Rp</span>
                      <span className="text-right flex-1 px-1">{formatNumber(cost.lodging)}</span>
                      <span>= Rp</span>
                      <span className="text-right w-20">{formatNumber(totalLodging)}</span>
                    </div>
                  </td>
                  <td className="border border-black p-2 text-right">Rp {formatNumber(totalTransport)}</td>
                  <td className="border border-black p-2 text-center">{totalRepres > 0 ? `Rp ${formatNumber(totalRepres)}` : '-'}</td>
                  <td className="border border-black p-2 text-right font-bold">Rp {formatNumber(totalRow)}</td>
                  <td className="border border-black p-2 text-left font-normal h-12">{i + 1}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="font-bold">
            <tr>
              <td colSpan={3} className="border border-black p-1 text-center uppercase h-8">Jumlah</td>
              <td className="border border-black p-1"></td>
              <td className="border border-black p-1"></td>
              <td className="border border-black p-1"></td>
              <td className="border border-black p-1"></td>
              <td className="border border-black p-1 text-right">Rp {formatNumber(totalAll)}</td>
              <td className="border border-black p-1"></td>
            </tr>
          </tfoot>
       </table>

       <div className="grid grid-cols-2 mt-12 text-[9.5pt]">
          <div className="pl-12">
            <p className="mb-1 font-normal">Mengetahui/Menyetujui :</p>
            <p className="font-bold uppercase leading-tight h-10">{kepala.jabatan}</p>
            <p className="font-bold uppercase leading-tight mb-16">{skpd.namaSkpd}</p>
            <p className="font-bold underline uppercase">{kepala.name}</p>
            <p>NIP. {kepala.nip}</p>
          </div>
          <div className="text-left pl-32">
            <p className="mb-6">{formatMonthYear(assignment.signDate, skpd.lokasi)}</p>
            <p className="font-bold mb-20">{bendahara.jabatan},</p>
            <p className="font-bold underline uppercase">{bendahara.name}</p>
            <p>NIP. {bendahara.nip}</p>
          </div>
       </div>
    </div>
  );
};
