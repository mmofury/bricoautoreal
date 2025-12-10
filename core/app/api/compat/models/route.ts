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
  const manufacturerId = Number(searchParams.get('manufacturerId'));

  if (!manufacturerId || Number.isNaN(manufacturerId)) {
    return NextResponse.json({ error: 'manufacturerId requis' }, { status: 400 });
  }

  // Récupérer les modèles avec leurs groupes
  const models = await db.vehicleModel.findMany({
    where: { manufacturerId },
    include: {
      modelGroups: {
        include: {
          modelGroup: {
            select: {
              id: true,
              groupKey: true,
              displayName: true,
            },
          },
        },
      },
    },
    orderBy: { modelName: 'asc' },
  });

  // Grouper les modèles par ModelGroup
  const groupsMap = new Map<
    number,
    {
      id: number;
      groupKey: string;
      displayName: string;
      models: Array<{ id: number; modelId: number; modelName: string; slug: string }>;
    }
  >();

  // Modèles sans groupe (à afficher à la fin)
  const ungroupedModels: Array<{ id: number; modelId: number; modelName: string; slug: string }> = [];

  for (const model of models) {
    const modelData = {
      id: model.id,
      modelId: model.modelId,
      modelName: model.modelName,
      slug: slugify(model.modelName),
    };

    if (model.modelGroups.length > 0) {
      // Ajouter le modèle à tous ses groupes
      for (const mg of model.modelGroups) {
        const group = mg.modelGroup;
        if (!groupsMap.has(group.id)) {
          groupsMap.set(group.id, {
            id: group.id,
            groupKey: group.groupKey,
            displayName: group.displayName,
            models: [],
          });
        }
        const groupData = groupsMap.get(group.id)!;
        // Éviter les doublons
        if (!groupData.models.some((m) => m.modelId === model.modelId)) {
          groupData.models.push(modelData);
        }
      }
    } else {
      // Modèle sans groupe
      ungroupedModels.push(modelData);
    }
  }

  // Convertir en array et trier par displayName
  const groups = Array.from(groupsMap.values()).sort((a, b) =>
    a.displayName.localeCompare(b.displayName, 'fr')
  );

  // Trier les modèles dans chaque groupe
  for (const group of groups) {
    group.models.sort((a, b) => a.modelName.localeCompare(b.modelName, 'fr'));
  }

  // Trier les modèles non groupés
  ungroupedModels.sort((a, b) => a.modelName.localeCompare(b.modelName, 'fr'));

  return NextResponse.json({
    groups: groups.map((g) => ({
      id: g.id,
      groupKey: g.groupKey,
      displayName: g.displayName,
      models: g.models,
    })),
    ungrouped: ungroupedModels,
  });
}

