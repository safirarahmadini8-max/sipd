import React, { useState } from 'react';
import { 
  Database, Link, Key, CheckCircle, ShieldAlert, 
  FileSpreadsheet, LogIn, PlusCircle, Sparkles, RefreshCw, AlertCircle,
  Copy, Check, HelpCircle
} from 'lucide-react';
import { LOGO_NTB } from '../constants';
import { googleSignIn, SheetsDbClient } from '../lib/dbClient';

interface Props {
  onConnect: (url: string, key: string) => void;
  onConnectSheets: (spreadsheetId: string, token: string) => void;
}

export const DatabaseSetup: React.FC<Props> = ({ onConnect, onConnectSheets }) => {
  const [dbMode, setDbMode] = useState<'supabase' | 'sheets'>('sheets');
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  
  // Google Sheets states
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState('');
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [errorHand, setErrorHand] = useState<string | null>(null);
  const [isUnauthorizedDomain, setIsUnauthorizedDomain] = useState(false);
  const [isPopupClosed, setIsPopupClosed] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState<string | null>(null);

  const getAuthDomains = () => {
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

    if (currentHost && currentHost.includes('ais-dev-')) {
      const partner = currentHost.replace('ais-dev-', 'ais-pre-');
      if (!list.includes(partner)) list.push(partner);
    } else if (currentHost && currentHost.includes('ais-pre-')) {
      const partner = currentHost.replace('ais-pre-', 'ais-dev-');
      if (!list.includes(partner)) list.push(partner);
    }

    return list;
  };

  const handleSupabaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url && key) {
      onConnect(url.trim(), key.trim());
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorHand(null);
    setIsUnauthorizedDomain(false);
    setIsPopupClosed(false);
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setAccessToken(res.accessToken);
        
        // Auto check if there's an existing spreadsheet ID
        const savedSheetId = localStorage.getItem('GS_SPREADSHEET_ID');
        if (savedSheetId) {
          setSpreadsheetId(savedSheetId);
        }
      }
    } catch (err: any) {
      console.error('Sign-in Error in setup:', err);
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
        setErrorHand('Firebase: Error (auth/unauthorized-domain). Proyek Firebase Anda belum memberikan izin akses untuk domain aplikasi ini.');
      } else if (isPopupClosedErr) {
        setIsPopupClosed(true);
        setErrorHand('Firebase: Error (auth/popup-closed-by-user). Jendela pratinjau login ditutup sebelum selesai, atau diblokir oleh penjelajah web (browser) Anda.');
      } else {
        setErrorHand(err.message || 'Gagal login dengan Google.');
      }
    }
  };

  const handleCreateNewSheet = async () => {
    if (!accessToken) return;
    setIsCreating(true);
    setErrorHand(null);
    try {
      const title = `Database SIPDLITE - ${googleUser?.displayName || 'SKPD PROV NTB'}`;
      const newSheetId = await SheetsDbClient.createDatabase(accessToken, title);
      setSpreadsheetId(newSheetId);
      localStorage.setItem('GS_SPREADSHEET_ID', newSheetId);
      // Connect right away!
      onConnectSheets(newSheetId, accessToken);
    } catch (err: any) {
      setErrorHand(err.message || 'Gagal membuat database Google Sheet.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleConnectExistingSheet = (e: React.FormEvent) => {
    e.preventDefault();
    if (spreadsheetId.trim() && accessToken) {
      localStorage.setItem('GS_SPREADSHEET_ID', spreadsheetId.trim());
      onConnectSheets(spreadsheetId.trim(), accessToken);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-['Tahoma'] select-none">
      <div className="max-w-md w-full bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 p-8 animate-in zoom-in-95 duration-500">
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-700 shadow-lg shadow-blue-500/10 p-2">
            <img src={LOGO_NTB} alt="Logo NTB" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tighter">SIPD<span className="text-blue-500">LITE</span></h1>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">PROV. NTB</p>
          <p className="text-slate-500 text-[10px] mt-4 font-medium leading-relaxed">
            Pilih metode penyimpanan data yang ingin Anda gunakan.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 mb-6">
          <button 
            type="button"
            onClick={() => { setDbMode('sheets'); setErrorHand(null); }}
            className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${dbMode === 'sheets' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50' : 'text-slate-400 hover:text-white'}`}
          >
            <FileSpreadsheet size={14} /> Google Sheets
          </button>
          <button 
            type="button"
            onClick={() => { setDbMode('supabase'); setErrorHand(null); }}
            className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${dbMode === 'supabase' ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/50' : 'text-slate-400 hover:text-white'}`}
          >
            <Database size={14} /> Supabase SQL
          </button>
        </div>

        {errorHand && (
          <div className="space-y-4 mb-5">
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-4 rounded-2xl flex items-start gap-2.5 animate-in slide-in-from-top duration-300">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-rose-400" />
              <div className="leading-relaxed">
                <span className="font-black text-rose-300 block mb-1 uppercase tracking-wider text-[10px]">Pemberitahuan Error:</span>
                {errorHand}
              </div>
            </div>

            {isUnauthorizedDomain && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-[11px] text-slate-300 space-y-3.5 animate-in fade-in duration-300">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                  <HelpCircle size={16} className="text-amber-400 animate-pulse" />
                  <span className="font-black text-amber-300 uppercase tracking-tight text-[10px]">Panduan authorized-domain Firebase</span>
                </div>

                <p className="text-slate-400 leading-relaxed">
                  Agar Google mengizinkan proses masuk dari web ini, silakan daftarkan domain berikut di Firebase Console Anda:
                </p>

                <div className="space-y-2 pl-0.5">
                  <div className="flex gap-2">
                    <span className="font-black text-slate-200 bg-slate-800 w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] flex-shrink-0">1</span>
                    <p className="text-slate-400">
                      Buka{' '}
                      <a 
                        href="https://console.firebase.google.com/" 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-blue-400 hover:underline font-bold"
                      >
                        Firebase Console
                      </a>
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <span className="font-black text-slate-200 bg-slate-800 w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] flex-shrink-0">2</span>
                    <p className="text-slate-400">
                      Masuk ke menu <span className="text-slate-200 font-bold">Authentication</span> &rarr; <span className="text-slate-200 font-bold">Settings</span> &rarr; <span className="text-slate-200 font-bold">Authorized domains</span>.
                    </p>
                  </div>

                  <div className="flex gap-2 pt-1 flex-col">
                    <div className="flex gap-2">
                      <span className="font-black text-slate-200 bg-slate-800 w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] flex-shrink-0">3</span>
                      <p className="text-slate-400 font-bold">Salin & Tambahkan Domain ini:</p>
                    </div>
                    
                    <div className="space-y-1.5 mt-1">
                      {getAuthDomains().map(dom => (
                        <div key={dom} className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-[9px] text-slate-300 shadow-inner">
                          <span className="truncate pr-2">{dom}</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(dom);
                              setCopiedDomain(dom);
                              setTimeout(() => setCopiedDomain(null), 2500);
                            }}
                            className="text-slate-500 hover:text-white flex items-center gap-1 transition flex-shrink-0"
                          >
                            {copiedDomain === dom ? (
                              <span className="text-emerald-400 font-sans font-bold">Tersalin!</span>
                            ) : (
                              <span className="text-slate-500 hover:text-slate-300 font-sans font-bold flex items-center gap-1">
                                <Copy size={11} /> Salin
                              </span>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-slate-850">
                    <span className="font-black text-slate-200 bg-slate-800 w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] flex-shrink-0">4</span>
                    <p className="text-slate-400 leading-snug">
                      Klik simpan di Firebase, lalu silakan coba klik <span className="text-emerald-400 font-bold">Sign In with Google</span> kembali.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isPopupClosed && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-[11px] text-slate-300 space-y-3.5 animate-in fade-in duration-300">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                  <HelpCircle size={16} className="text-amber-400 animate-pulse" />
                  <span className="font-black text-amber-300 uppercase tracking-tight text-[10px]">Panduan Mengatasi Pop-up Pemblokiran</span>
                </div>

                <p className="text-slate-400 leading-relaxed">
                  Layanan login Google memerlukan pembukaan jendela pop-up. Silakan lakukan langkah-langkah berikut:
                </p>

                <div className="space-y-3.5 pl-0.5">
                  <div className="flex gap-2.5">
                    <span className="font-black text-slate-200 bg-slate-800 w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] flex-shrink-0">1</span>
                    <div>
                      <p className="font-bold text-slate-300">Buka Aplikasi di Tab Baru (Sangat Disarankan)</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                        Iframe di dalam boks AI Studio sering memblokir pop-up Google. Klik tombol **"Open in a new tab" / "Buka di tab baru"** (di ujung kanan atas bilah AI Studio Anda) untuk login secara penuh dan lancar.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2.5">
                    <span className="font-black text-slate-200 bg-slate-800 w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] flex-shrink-0">2</span>
                    <div>
                      <p className="font-bold text-slate-300">Izinkan Jendela Pop-up</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                        Jika browser meluncurkan filter pemblokir pop-up (ikon lingkaran bertanda silang pada ujung bilah URL browser Anda), silakan klik dan pilih **"Always allow popups"** (Selalu izinkan pop-up).
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2.5">
                    <span className="font-black text-slate-200 bg-slate-800 w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] flex-shrink-0">3</span>
                    <div>
                      <p className="font-bold text-slate-300">Biarkan Jendela Selesai Memuat</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                        Pastikan jendela login Google kecil yang muncul tidak ditutup secara manual sebelum perizinan akun tuntas dilakukan.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Supabase Form */}
        {dbMode === 'supabase' && (
          <form onSubmit={handleSupabaseSubmit} className="space-y-5 animate-in fade-in duration-300">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Link size={12} /> Supabase Project URL
              </label>
              <input 
                required
                type="url"
                placeholder="https://your-project.supabase.co"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none transition placeholder:text-slate-600 shadow-inner"
                value={url}
                onChange={e => setUrl(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Key size={12} /> Supabase Anon / Public Key
              </label>
              <input 
                required
                type="password"
                placeholder="Masukkan anon-public-key..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none transition font-mono placeholder:text-slate-600 shadow-inner"
                value={key}
                onChange={e => setKey(e.target.value)}
              />
            </div>

            <button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest transition shadow-xl shadow-blue-900/40 flex items-center justify-center gap-2 group mt-4 hover:scale-[1.02] active:scale-95"
            >
              <CheckCircle size={18} className="group-hover:scale-110 transition" /> Hubungkan Supabase
            </button>
          </form>
        )}

        {/* Google Sheets Area */}
        {dbMode === 'sheets' && (
          <div className="space-y-5 animate-in fade-in duration-300">
            {!googleUser ? (
              <div className="text-center py-4 space-y-4">
                <p className="text-slate-400 text-xs leading-relaxed">
                  Hubungkan dengan akun Google Anda untuk membuat atau menggunakan Google Spreadsheet sebagai database.
                </p>
                <button 
                  onClick={handleGoogleSignIn}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 font-bold text-white text-xs uppercase tracking-widest py-4 px-6 rounded-xl flex items-center justify-center gap-3 shadow-xl shadow-emerald-950/50 transition duration-300 hover:scale-[1.02] active:scale-95"
                >
                  <LogIn size={18} /> Sign In with Google
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* User Card */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center gap-3">
                  {googleUser.photoURL ? (
                    <img src={googleUser.photoURL} alt="Avatar" className="w-10 h-10 rounded-full border border-slate-700" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white text-lg font-black flex items-center justify-center">{googleUser.displayName?.charAt(0)}</div>
                  )}
                  <div className="text-left overflow-hidden">
                    <p className="text-xs font-black text-white leading-tight truncate">{googleUser.displayName}</p>
                    <p className="text-[10px] text-slate-500 truncate">{googleUser.email}</p>
                  </div>
                </div>

                {/* Option 1: Create Automatically (Slick & Easy) */}
                <div className="bg-slate-950/60 p-5 rounded-2xl border border-emerald-500/10 text-center space-y-3 shadow-inner">
                  <div className="flex items-center justify-center gap-1.5 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                    <Sparkles size={14} /> Solusi Instan
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Sistem akan membuat file Google Spreadsheet baru lengkap dengan semua tabel & strukturnya di Google Drive Anda.
                  </p>
                  <button
                    disabled={isCreating}
                    onClick={handleCreateNewSheet}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-black uppercase tracking-widest py-3 rounded-xl flex items-center justify-center gap-2 transition hover:scale-[1.01]"
                  >
                    {isCreating ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" /> Sedang Membuat...
                      </>
                    ) : (
                      <>
                        <PlusCircle size={16} /> Buat Database Baru Otomatis
                      </>
                    )}
                  </button>
                </div>

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-slate-800"></div>
                  <span className="flex-shrink mx-4 text-slate-600 text-[9px] font-black uppercase tracking-widest">Atau Gunakan yang Ada</span>
                  <div className="flex-grow border-t border-slate-800"></div>
                </div>

                {/* Option 2: Connect Existing */}
                <form onSubmit={handleConnectExistingSheet} className="space-y-3.5">
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <Link size={12} /> Google Spreadsheet ID
                    </label>
                    <input 
                      required
                      type="text"
                      placeholder="Masukkan ID Google Spreadsheet..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-xs text-white focus:ring-2 focus:ring-emerald-500 outline-none transition shadow-inner font-mono"
                      value={spreadsheetId}
                      onChange={e => setSpreadsheetId(e.target.value)}
                    />
                    <p className="text-[9px] text-slate-500 leading-snug">
                      Dapat disalin dari URL spreadsheet Anda (antara d/ dan /edit).
                    </p>
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition flex items-center justify-center gap-2"
                  >
                    Hubungkan Spreadsheet ID
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col items-center gap-4">
           <div className="flex items-center gap-2 text-slate-600 text-[10px] font-bold uppercase">
             <ShieldAlert size={12} /> Koneksi Aman & Terenkripsi
           </div>
        </div>
      </div>
    </div>
  );
};
