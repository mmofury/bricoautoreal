import { NextResponse } from 'next/server';

import { db } from '~/lib/db';

export async function GET() {
  // Récupérer les manufacturers avec le nombre de véhicules pour trier par popularité
  // On utilise une requête SQL brute car Prisma ne supporte pas facilement ORDER BY avec COUNT
  const manufacturersWithCount = await db.$queryRaw<
    Array<{ id: number; name: string; vehicle_count: bigint }>
  >`
    SELECT 
      m.id,
      m.name,
      COUNT(DISTINCT v.id) as vehicle_count
    FROM manufacturers m
    LEFT JOIN vehicle_models vm ON m.id = vm.manufacturer_id
    LEFT JOIN vehicles v ON vm.id = v.model_id
    GROUP BY m.id, m.name
    ORDER BY vehicle_count DESC, m.name ASC
  `;

  // Convertir les BigInt en Number et formater
  const manufacturers = manufacturersWithCount.map((m) => ({
    id: m.id,
    name: m.name,
  }));

  return NextResponse.json({ manufacturers });
}

