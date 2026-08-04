import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import ExcelJS from "exceljs";

export const runtime = "nodejs";

const MAX_ROWS = 2000;

function cellToString(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") return value.text;
    if ("result" in value && value.result != null) return String(value.result);
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((r) => r.text).join("");
    }
    return "";
  }
  return String(value);
}

async function parseXlsx(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return { headers: [], rows: [] };

  const headers: string[] = [];
  sheet.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headers[colNumber - 1] = cellToString(cell.value).trim();
  });

  const rows: Record<string, string>[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const obj: Record<string, string> = {};
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const header = headers[colNumber - 1];
      if (!header) return;
      obj[header] = cellToString(cell.value).trim();
    });
    if (Object.values(obj).some((v) => v !== "")) rows.push(obj);
    if (rows.length >= MAX_ROWS) return;
  });

  return { headers, rows: rows.slice(0, MAX_ROWS) };
}

function parseCsv(text: string) {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });
  const headers = (parsed.meta.fields || []).map((h) => h.trim());
  const rows = parsed.data.slice(0, MAX_ROWS);
  return { headers, rows };
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Envie um arquivo .csv ou .xlsx." }, { status: 400 });
  }

  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    if (name.endsWith(".csv")) {
      const { headers, rows } = parseCsv(buffer.toString("utf-8"));
      return NextResponse.json({ headers, rows });
    }
    if (name.endsWith(".xlsx")) {
      const { headers, rows } = await parseXlsx(buffer);
      return NextResponse.json({ headers, rows });
    }
    return NextResponse.json({ error: "Formato não suportado. Envie um arquivo .csv ou .xlsx." }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: `Falha ao ler o arquivo: ${e instanceof Error ? e.message : String(e)}` }, { status: 500 });
  }
}
