/** RFC 4180 CSV parser — handles quoted fields with commas and newlines */
export function parseCSV(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQ = false;

  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    const n = csv[i + 1];

    if (c === '"') {
      if (inQ && n === '"') { cell += '"'; i++; }
      else inQ = !inQ;
    } else if (c === "," && !inQ) {
      row.push(cell.trim());
      cell = "";
    } else if ((c === "\n" || (c === "\r" && n === "\n")) && !inQ) {
      if (c === "\r") i++;
      row.push(cell.trim());
      if (row.some(v => v)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += c;
    }
  }
  row.push(cell.trim());
  if (row.some(v => v)) rows.push(row);
  return rows;
}

/** "10%" → 10. Также принимает "0.25" → 25. Возвращает 0..100. */
export function parsePct(val: string | null | undefined): number {
  if (!val) return 0;
  const s = val.toString().trim();
  if (!s) return 0;
  if (s.includes("%")) {
    return Math.min(parseInt(s.replace(/[^0-9.-]/g, "")) || 0, 100);
  }
  const num = parseFloat(s.replace(",", "."));
  if (isNaN(num)) return 0;
  if (num <= 1) return Math.round(num * 100);
  return Math.min(Math.round(num), 100);
}

/** "DD.MM.YYYY" или "YYYY-MM-DD HH:MM:SS" → ISO "YYYY-MM-DD". Range → end. */
export function parseDate(val: string | null | undefined): string | null {
  if (!val) return null;
  const s = val.toString().trim();
  if (!s) return null;
  // already ISO
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  // range
  const range = s.match(/\d{2}\.\d{2}\.\d{4}-(\d{2}\.\d{2}\.\d{4})/);
  const src = range ? range[1] : s;
  const parts = src.split(".");
  if (parts.length === 3 && parts[0].length <= 2) {
    return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
  }
  return null;
}

/** Parse number with possible whitespace and comma decimal */
export function parseNum(val: string | null | undefined): number {
  if (!val) return 0;
  const s = val.toString().replace(/\s/g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}
