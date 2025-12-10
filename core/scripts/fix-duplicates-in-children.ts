// Script pour corriger les doublons dans les enfants stockés
// Utiliser: dotenv -e ../.env.local -- tsx scripts/fix-duplicates-in-children.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface NavigationChild {
  id: string;
  label: string;
  labelFr: string | null;
  url: string | null;
}

function deduplicateChildren(children: NavigationChild[]): NavigationChild[] {
  const seen = new Set<string>();
  const result: NavigationChild[] = [];
  
  for (const child of children) {
    // Créer des clés pour l'ID et l'URL
    const idKey = `id:${child.id}`;
    const urlKey = child.url ? `url:${child.url}` : null;
    
    // Si on a déjà vu cet ID OU cette URL, on skip
    if (seen.has(idKey) || (urlKey && seen.has(urlKey))) {
      continue;
    }
    
    // Ajouter cet enfant unique
    seen.add(idKey);
    if (urlKey) {
      seen.add(urlKey);
    }
    result.push(child);
  }
  
  return result;
}

async function fixDuplicates() {
  console.log('🔍 Recherche et correction des doublons dans les enfants...\n');

  const hierarchies = await prisma.interCarsHierarchy.findMany({
    where: {
      OR: [
        { childrenLevel2: { not: null } },
        { childrenLevel3: { not: null } },
        { childrenLevel4: { not: null } },
      ],
    },
  });

  console.log(`📦 ${hierarchies.length} hiérarchies à vérifier\n`);

  let fixed = 0;
  let duplicatesFound = 0;

  for (const hierarchy of hierarchies) {
    let updated = false;
    const updates: {
      childrenLevel2?: string | null;
      childrenLevel3?: string | null;
      childrenLevel4?: string | null;
    } = {};

    // Vérifier et corriger childrenLevel2
    if (hierarchy.childrenLevel2) {
      try {
        const children = JSON.parse(hierarchy.childrenLevel2) as NavigationChild[];
        const uniqueChildren = deduplicateChildren(children);
        
        if (uniqueChildren.length < children.length) {
          duplicatesFound++;
          updates.childrenLevel2 = uniqueChildren.length > 0 ? JSON.stringify(uniqueChildren) : null;
          updated = true;
        }
      } catch (error) {
        console.error(`❌ Erreur parsing childrenLevel2 pour ${hierarchy.genericArticleId}:`, error);
      }
    }

    // Vérifier et corriger childrenLevel3
    if (hierarchy.childrenLevel3) {
      try {
        const children = JSON.parse(hierarchy.childrenLevel3) as NavigationChild[];
        const uniqueChildren = deduplicateChildren(children);
        
        if (uniqueChildren.length < children.length) {
          duplicatesFound++;
          updates.childrenLevel3 = uniqueChildren.length > 0 ? JSON.stringify(uniqueChildren) : null;
          updated = true;
        }
      } catch (error) {
        console.error(`❌ Erreur parsing childrenLevel3 pour ${hierarchy.genericArticleId}:`, error);
      }
    }

    // Vérifier et corriger childrenLevel4
    if (hierarchy.childrenLevel4) {
      try {
        const children = JSON.parse(hierarchy.childrenLevel4) as NavigationChild[];
        const uniqueChildren = deduplicateChildren(children);
        
        if (uniqueChildren.length < children.length) {
          duplicatesFound++;
          updates.childrenLevel4 = uniqueChildren.length > 0 ? JSON.stringify(uniqueChildren) : null;
          updated = true;
        }
      } catch (error) {
        console.error(`❌ Erreur parsing childrenLevel4 pour ${hierarchy.genericArticleId}:`, error);
      }
    }

    // Mettre à jour si nécessaire
    if (updated) {
      try {
        await prisma.interCarsHierarchy.update({
          where: { id: hierarchy.id },
          data: updates,
        });
        fixed++;
        
        if (fixed % 100 === 0) {
          console.log(`   ✅ ${fixed} hiérarchies corrigées...`);
        }
      } catch (error: any) {
        console.error(`   ❌ Erreur mise à jour pour ${hierarchy.genericArticleId}:`, error.message);
      }
    }
  }

  console.log(`\n✅ Terminé!`);
  console.log(`   ${fixed} hiérarchies corrigées`);
  console.log(`   ${duplicatesFound} cas de doublons trouvés et corrigés\n`);

  await prisma.$disconnect();
}

fixDuplicates().catch(console.error);

