import { NextResponse } from 'next/server';

import { db } from '~/lib/db';

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const modelId = Number(searchParams.get('modelId'));

  if (!modelId || Number.isNaN(modelId)) {
    return NextResponse.json({ error: 'modelId requis' }, { status: 400 });
  }

  const model = await db.vehicleModel.findFirst({
    where: { modelId },
    include: {
      manufacturer: true,
      modelGroups: {
        include: { modelGroup: true },
      },
      vehicles: true,
    },
  });

  if (!model) {
    return NextResponse.json({ error: 'Modèle introuvable' }, { status: 404 });
  }

  const manufacturerSlug = slugify(model.manufacturer.name);
  const modelSlug = slugify(model.modelName);
  const groupSlug =
    model.modelGroups.length > 0
      ? slugify(model.modelGroups[0].modelGroup.groupKey || model.modelGroups[0].modelGroup.displayName)
      : modelSlug;

  const vehicles = model.vehicles.map((v) => {
    const engineSlug = v.typeEngineName ? slugify(v.typeEngineName) : null;
    return {
      vehicleId: v.vehicleId,
      typeEngineName: v.typeEngineName,
      constructionIntervalStart: v.constructionIntervalStart,
      constructionIntervalEnd: v.constructionIntervalEnd,
      engineSlug,
      url: `/pieces-auto/${manufacturerSlug}/${groupSlug}/${modelSlug}/${v.vehicleId}${engineSlug ? `-${engineSlug}` : ''}`,
    };
  });

  return NextResponse.json({
    manufacturer: {
      id: model.manufacturer.id,
      name: model.manufacturer.name,
      slug: manufacturerSlug,
    },
    model: {
      id: model.id,
      modelId: model.modelId,
      name: model.modelName,
      slug: modelSlug,
    },
    groupSlug,
    vehicles,
  });
}







