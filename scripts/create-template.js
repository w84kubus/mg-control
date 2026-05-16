const ExcelJS = require("exceljs");
const path = require("path");

async function main() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("AKTUALNIE NA PLACU");

  // Row 1: Section headers (merged)
  ws.mergeCells("B1:F1");
  ws.getCell("B1").value = "PLAC (Strefa 1 domyslnie)";
  ws.getCell("B1").font = { bold: true, size: 13 };
  ws.getCell("B1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD5E8F0" } };

  ws.mergeCells("H1:L1");
  ws.getCell("H1").value = "DACH (auto-rzedy po 4 auta)";
  ws.getCell("H1").font = { bold: true, size: 13 };
  ws.getCell("H1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF3CD" } };

  ws.mergeCells("N1:R1");
  ws.getCell("N1").value = "GARAZ";
  ws.getCell("N1").font = { bold: true, size: 13 };
  ws.getCell("N1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD4EDDA" } };

  ws.mergeCells("Y1:Z1");
  ws.getCell("Y1").value = "MYJNIA";
  ws.getCell("Y1").font = { bold: true, size: 13 };
  ws.getCell("Y1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFCE4EC" } };

  // Row 2: Column headers
  // PLAC: cols B(2), C(3), D(4), E(5), F(6)
  const placHeaders = [
    { col: 2, label: "MODEL" },
    { col: 3, label: "KOLOR" },
    { col: 4, label: "VIN" },
    { col: 5, label: "DATA PRZYJAZDU" },
    { col: 6, label: "INFO / UWAGI" },
  ];
  // DACH: cols H(8), I(9), J(10), K(11), L(12)
  const dachHeaders = [
    { col: 8, label: "MODEL" },
    { col: 9, label: "KOLOR" },
    { col: 10, label: "VIN" },
    { col: 11, label: "DATA PRZYJAZDU" },
    { col: 12, label: "INFO / UWAGI" },
  ];
  // GARAZ: cols N(14), O(15), P(16), Q(17), R(18)
  const garazHeaders = [
    { col: 14, label: "MODEL" },
    { col: 15, label: "KOLOR" },
    { col: 16, label: "VIN" },
    { col: 17, label: "DATA PRZYJAZDU" },
    { col: 18, label: "INFO / UWAGI" },
  ];
  // MYJNIA: cols Y(25), Z(26)
  const myjniaHeaders = [
    { col: 25, label: "VIN" },
    { col: 26, label: "HANDLOWIEC" },
  ];

  const allHeaders = [...placHeaders, ...dachHeaders, ...garazHeaders, ...myjniaHeaders];
  for (const { col, label } of allHeaders) {
    const cell = ws.getCell(2, col);
    cell.value = label;
    cell.font = { bold: true, size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8E8E8" } };
    cell.border = { bottom: { style: "thin" } };
  }

  // Set column widths
  ws.getColumn(2).width = 14;  // MODEL
  ws.getColumn(3).width = 12;  // KOLOR
  ws.getColumn(4).width = 22;  // VIN
  ws.getColumn(5).width = 14;  // DATA
  ws.getColumn(6).width = 30;  // INFO

  ws.getColumn(8).width = 14;
  ws.getColumn(9).width = 12;
  ws.getColumn(10).width = 22;
  ws.getColumn(11).width = 14;
  ws.getColumn(12).width = 30;

  ws.getColumn(14).width = 14;
  ws.getColumn(15).width = 12;
  ws.getColumn(16).width = 22;
  ws.getColumn(17).width = 14;
  ws.getColumn(18).width = 30;

  ws.getColumn(25).width = 22;
  ws.getColumn(26).width = 16;

  // Separator columns
  ws.getColumn(7).width = 3;
  ws.getColumn(13).width = 3;
  ws.getColumn(19).width = 3;

  // Add example row (row 3)
  ws.getCell(3, 2).value = "ZS";
  ws.getCell(3, 3).value = "WHITE";
  ws.getCell(3, 4).value = "LSJW3691XXXXXXXX";
  ws.getCell(3, 5).value = "2025-01-15";
  ws.getCell(3, 6).value = "SZKODA / TUNEL";

  ws.getCell(3, 8).value = "HS";
  ws.getCell(3, 9).value = "BLACK";
  ws.getCell(3, 10).value = "LSJW4567XXXXXXXX";
  ws.getCell(3, 11).value = "2025-02-10";
  ws.getCell(3, 12).value = "";

  ws.getCell(3, 14).value = "MG4";
  ws.getCell(3, 15).value = "RED";
  ws.getCell(3, 16).value = "LSJW9876XXXXXXXX";
  ws.getCell(3, 17).value = "2025-03-01";
  ws.getCell(3, 18).value = "PDI / ZLECENIE";

  ws.getCell(3, 25).value = "LSJW3691XXXXXXXX";
  ws.getCell(3, 26).value = "Kowalski";

  // Style example row as italic/gray
  for (const col of [2,3,4,5,6,8,9,10,11,12,14,15,16,17,18,25,26]) {
    const cell = ws.getCell(3, col);
    cell.font = { italic: true, color: { argb: "FF999999" } };
  }

  // ─── INSTRUKCJA sheet ───────────────────────────────────────────────────────
  const instrWs = wb.addWorksheet("INSTRUKCJA");
  instrWs.getColumn(1).width = 50;
  instrWs.getColumn(2).width = 50;

  const instructions = [
    ["INSTRUKCJA WYPELNIANIA", ""],
    ["", ""],
    ["MODELE (kolumna MODEL):", "KOLORY (kolumna KOLOR):"],
    ["ZS, ZS (NEW), ZS CLASSIC", "WHITE, BLACK, GRAY/GREY"],
    ["HS, HS (NEW), HS+, HS PHEV", "SILVER, RED, BLUE, GREEN"],
    ["MG3, MG4, MG5, MG7", "YELLOW, ORANGE"],
    ["MG S5, MG S9, S9 PHEV, EHS", ""],
    ["CYBERSTER", ""],
    ["", ""],
    ["KOLUMNA INFO / UWAGI - slowa kluczowe:", ""],
    ["", ""],
    ["STREFA (gdzie stoi auto):", "STATUS:"],
    ["TUNEL - auto w tunelu", "SZKODA - auto uszkodzone"],
    ["BLACHARNIA - auto w blacharni", "NA MYJNIE - auto do myjni"],
    ["SALON - auto w salonie", "PDI / ZLECENIE - auto zamowione/w serwisie"],
    ["GARAZ - auto w garazu", "(brak) - status: Nowy"],
    ["(brak) - domyslnie Strefa 1", ""],
    ["", ""],
    ["TYP POJAZDU (wykrywany z INFO):", ""],
    ["DEMO - auto demo", ""],
    ["FLOTA - auto flotowe", ""],
    ["(brak) - stock", ""],
    ["", ""],
    ["MYJNIA:", ""],
    ["Wpisz VIN auta ktore jest na myjni w kolumne Y", ""],
    ["Wpisz nazwisko handlowca w kolumne Z", ""],
    ["", ""],
    ["DACH:", ""],
    ["Auta na dachu sa automatycznie przypisywane", ""],
    ["do rzedow (po 4 na rzad): dach_rzad_1 do 6", ""],
    ["", ""],
    ["WAZNE:", ""],
    ["- VIN musi zaczynac sie od LSJ i miec 17 znakow", ""],
    ["- Dane zaczynaj od wiersza 3 (wiersz 1=sekcje, 2=naglowki)", ""],
    ["- Arkusz MUSI miec nazwe: AKTUALNIE NA PLACU", ""],
    ["- Mozesz laczyc slowa kluczowe: SZKODA / TUNEL", ""],
    ["- Wiersz 3 (szary kursywa) to przyklad - usun go", ""],
  ];

  instructions.forEach((row, i) => {
    instrWs.getCell(i + 1, 1).value = row[0];
    instrWs.getCell(i + 1, 2).value = row[1];
    if (i === 0) {
      instrWs.getCell(1, 1).font = { bold: true, size: 14 };
    }
  });

  const outPath = path.join(__dirname, "..", "public", "szablon_import_pojazdow.xlsx");
  await wb.xlsx.writeFile(outPath);
  console.log("Template saved to:", outPath);
}

main().catch(console.error);
