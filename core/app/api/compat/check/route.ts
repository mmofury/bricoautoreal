import { NextResponse } from 'next/server';

import { db } from '~/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const articleNo = searchParams.get('articleNo');
  const vehicleIdParam = searchParams.get('vehicleId');

  if (!articleNo || !vehicleIdParam) {
    return NextResponse.json({ error: 'articleNo et vehicleId requis' }, { status: 400 });
  }

  const vehicleId = Number(vehicleIdParam);
  if (Number.isNaN(vehicleId)) {
    return NextResponse.json({ error: 'vehicleId invalide' }, { status: 400 });
  }

  try {
    // Trouver le produit par articleNo
    const product = await db.product.findUnique({
      where: { articleNo },
      select: { id: true },
    });

    if (!product) {
      return NextResponse.json({ isCompatible: false, reason: 'product_not_found' });
    }

    // Vérifier la compatibilité avec le véhicule
    const compatibility = await db.productVehicleCompatibility.findFirst({
      where: {
        productId: product.id,
        vehicle: {
          vehicleId,
        },
      },
      select: { id: true },
    });

    return NextResponse.json({
      isCompatible: !!compatibility,
      productId: product.id,
      vehicleId,
    });
  } catch (error) {
    console.error('Error checking compatibility:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la vérification de compatibilité' },
      { status: 500 }
    );
  }
}







