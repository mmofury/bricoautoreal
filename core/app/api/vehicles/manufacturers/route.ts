import { NextRequest, NextResponse } from 'next/server';
import { getAllManufacturers } from '~/lib/db/queries';

export async function GET() {
  try {
    const manufacturers = await getAllManufacturers();

    return NextResponse.json({
      success: true,
      data: manufacturers,
      count: manufacturers.length,
    });
  } catch (error) {
    console.error('Erreur récupération constructeurs:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors de la récupération des constructeurs',
      },
      { status: 500 }
    );
  }
}


































