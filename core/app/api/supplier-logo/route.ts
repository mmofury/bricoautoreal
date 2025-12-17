import { NextRequest, NextResponse } from 'next/server';
import { db } from '~/lib/db';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const supplierName = searchParams.get('name');

        if (!supplierName) {
            return NextResponse.json({ error: 'Missing name parameter' }, { status: 400 });
        }

        const logo = await db.supplierLogo.findUnique({
            where: {
                supplierName: supplierName,
            },
            select: {
                filename: true,
            },
        });

        if (!logo || !logo.filename) {
            return NextResponse.json({ filename: null });
        }

        return NextResponse.json({ filename: logo.filename });
    } catch (error) {
        console.error('Error fetching supplier logo:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
