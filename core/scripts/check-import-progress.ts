import { db } from '../lib/db';

async function checkProgress() {
  try {
    await db.$connect();
    
    const totalGroups = await db.modelGroup.count();
    const totalRelations = await db.modelGroupModel.count();
    
    // Compter par constructeur
    const groupsByManufacturer = await db.modelGroup.groupBy({
      by: ['manufacturerId'],
      _count: {
        id: true,
      },
    });
    
    // Récupérer les noms des constructeurs
    const manufacturers = await db.manufacturer.findMany({
      where: {
        id: {
          in: groupsByManufacturer.map((g) => g.manufacturerId),
        },
      },
      select: {
        id: true,
        name: true,
      },
    });
    
    const manufacturerMap = new Map(manufacturers.map((m) => [m.id, m.name]));
    
    console.log(`\n📊 Progression de l'import des groupes de modèles\n`);
    console.log(`${'='.repeat(60)}`);
    console.log(`📁 Total groupes importés: ${totalGroups.toLocaleString()}`);
    console.log(`🔗 Total relations importées: ${totalRelations.toLocaleString()}`);
    console.log(`🏭 Constructeurs avec groupes: ${groupsByManufacturer.length}`);
    console.log(`\n${'='.repeat(60)}\n`);
    
    // Top 10 constructeurs avec le plus de groupes
    const topManufacturers = groupsByManufacturer
      .sort((a, b) => b._count.id - a._count.id)
      .slice(0, 10);
    
    console.log(`🏆 Top 10 constructeurs:\n`);
    for (const item of topManufacturers) {
      const name = manufacturerMap.get(item.manufacturerId) || `ID ${item.manufacturerId}`;
      console.log(`   ${name.padEnd(30)} ${item._count.id.toString().padStart(4)} groupes`);
    }
    
    // Compter par confidence
    const byConfidence = await db.modelGroup.groupBy({
      by: ['confidence'],
      _count: {
        id: true,
      },
    });
    
    console.log(`\n📊 Répartition par type:\n`);
    for (const item of byConfidence) {
      console.log(`   ${item.confidence.padEnd(10)} ${item._count.id.toLocaleString().padStart(6)} groupes`);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await db.$disconnect();
  }
}

checkProgress();







