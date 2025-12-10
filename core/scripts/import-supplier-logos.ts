import fs from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";

type BrandRecord = {
  name: string;
  url?: string;
  logoUrl?: string;
  imageUrl?: string;
  filename?: string;
};

const prisma = new PrismaClient();

function normalizeName(name: string): string {
  return name.trim();
}

async function loadBrands(filePath: string): Promise<BrandRecord[]> {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw);
  const list: unknown = Array.isArray(parsed) ? parsed : parsed?.brands;

  if (!Array.isArray(list)) {
    throw new Error("Le JSON doit être un tableau ou contenir une clé 'brands'.");
  }

  const filtered = list.filter(
    (item) => item && typeof item === "object" && typeof (item as BrandRecord).name === "string",
  ) as BrandRecord[];

  if (!filtered.length) {
    throw new Error("Aucune entrée valide avec un champ 'name'.");
  }

  // Déduplication insensible à la casse
  const dedup = new Map<string, BrandRecord>();
  for (const entry of filtered) {
    const key = normalizeName(entry.name).toLowerCase();
    if (!dedup.has(key)) {
      dedup.set(key, entry);
    }
  }

  return Array.from(dedup.values());
}

async function upsertSupplierLogo(record: BrandRecord) {
  const supplierName = normalizeName(record.name);
  const logoUrl = record.logoUrl ?? record.url ?? record.imageUrl ?? null;
  const filename = record.filename ?? null;

  // SQLite ne supporte pas mode: "insensitive", on utilise une requête raw
  const existing = await prisma.$queryRaw<Array<{ id: number; supplier_name: string }>>`
    SELECT id, supplier_name 
    FROM supplier_logos 
    WHERE LOWER(supplier_name) = LOWER(${supplierName})
    LIMIT 1
  `;

  if (existing.length > 0) {
    await prisma.supplierLogo.update({
      where: { id: existing[0].id },
      data: { supplierName: existing[0].supplier_name, logoUrl, filename },
    });
    return "updated";
  }

  await prisma.supplierLogo.create({
    data: { supplierName, logoUrl, filename },
  });
  return "created";
}

async function main() {
  const fileArg = process.argv[2];
  if (!fileArg) {
    throw new Error("Usage: tsx scripts/import-supplier-logos.ts <path-to-json>");
  }

  const filePath = path.resolve(process.cwd(), fileArg);
  const records = await loadBrands(filePath);

  const stats = { created: 0, updated: 0, total: records.length };

  for (const record of records) {
    const result = await upsertSupplierLogo(record);
    if (result === "created") stats.created += 1;
    if (result === "updated") stats.updated += 1;
  }

  console.log(
    `Import terminé : ${stats.total} entrées traitées, ${stats.created} créées, ${stats.updated} mises à jour.`,
  );
}

main()
  .catch((err) => {
    console.error("Erreur lors de l'import des logos fournisseurs :", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

