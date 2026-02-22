
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount).replace('Rp', '').trim();
};

export const formatNumber = (num: number | undefined | null): string => {
  if (num === undefined || num === null) return '0';
  return new Intl.NumberFormat('id-ID').format(num);
};

export const parseNumber = (str: string): number => {
  // Remove all non-digits
  const cleanStr = str.replace(/\D/g, '');
  return cleanStr ? parseInt(cleanStr, 10) : 0;
};

export const numberToWords = (n: number): string => {
  const words = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
  let res = "";
  if (n < 12) res = words[n];
  else if (n < 20) res = numberToWords(n - 10) + " Belas";
  else if (n < 100) res = numberToWords(Math.floor(n / 10)) + " Puluh " + numberToWords(n % 10);
  else if (n < 200) res = "Seratus " + numberToWords(n - 100);
  else if (n < 1000) res = numberToWords(Math.floor(n / 100)) + " Ratus " + numberToWords(n % 100);
  else if (n < 2000) res = "Seribu " + numberToWords(n - 1000);
  else if (n < 1000000) res = numberToWords(Math.floor(n / 1000)) + " Ribu " + numberToWords(n % 1000);
  else if (n < 1000000000) res = numberToWords(Math.floor(n / 1000000)) + " Juta " + numberToWords(n % 1000000);
  
  return res.trim().replace(/\s+/g, ' ');
};

export const formatDateID = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
};

export const calculateDays = (start: string, end: string): number => {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  const diff = e.getTime() - s.getTime();
  return Math.ceil(diff / (1000 * 3600 * 24)) + 1;
};
