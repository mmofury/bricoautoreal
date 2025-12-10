import { db } from '../lib/db';

async function checkSpecificManufacturers() {
  try {
    await db.$connect();
    
    console.log('🔍 Vérification PEUGEOT et MERCEDES-BENZ...\n');
    
    // PEUGEOT
    const peugeotGroups = await db.modelGroup.findMany({
      where: {
        manufacturer: { name: 'PEUGEOT' },
      },
      include: {
        models: {
          include: {
            vehicleModel: {
              select: {
                modelName: true,
                modelId: true,
              },
            },
          },
        },
      },
    });
    
    const peugeot307 = peugeotGroups.find((g) => g.groupKey === '307');
    
    console.log(`📊 PEUGEOT:`);
    console.log(`   - Groupes: ${peugeotGroups.length}`);
    console.log(`   - Relations: ${peugeotGroups.reduce((sum, g) => sum + g.models.length, 0)}`);
    if (peugeot307) {
      console.log(`   - Groupe "307": ${peugeot307.models.length} modèles`);
      console.log(`     Modèles: ${peugeot307.models.map((m) => m.vehicleModel.modelName).join(', ')}`);
    }
    
    // MERCEDES-BENZ
    const mbGroups = await db.modelGroup.findMany({
      where: {
        manufacturer: { name: 'MERCEDES-BENZ' },
      },
      include: {
        models: {
          include: {
            vehicleModel: {
              select: {
                modelName: true,
                modelId: true,
              },
            },
          },
        },
      },
    });
    
    const mbClasseS = mbGroups.find((g) => g.groupKey === 'CLASSE S');
    const mbClasseC = mbGroups.find((g) => g.groupKey === 'CLASSE C');
    const mbClasseE = mbGroups.find((g) => g.groupKey === 'CLASSE E');
    
    console.log(`\n📊 MERCEDES-BENZ:`);
    console.log(`   - Groupes: ${mbGroups.length}`);
    console.log(`   - Relations: ${mbGroups.reduce((sum, g) => sum + g.models.length, 0)}`);
    if (mbClasseS) {
      console.log(`   - Groupe "CLASSE S": ${mbClasseS.models.length} modèles`);
    }
    if (mbClasseC) {
      console.log(`   - Groupe "CLASSE C": ${mbClasseC.models.length} modèles`);
    }
    if (mbClasseE) {
      console.log(`   - Groupe "CLASSE E": ${mbClasseE.models.length} modèles`);
    }
    
    // Vérifier qu'il n'y a pas de mélange
    if (mbClasseS && mbClasseC) {
      const classeSModelNames = mbClasseS.models.map((m) => m.vehicleModel.modelName);
      const classeCModelNames = mbClasseC.models.map((m) => m.vehicleModel.modelName);
      
      const cInS = classeSModelNames.filter((n) => n.includes('CLASSE C'));
      const sInC = classeCModelNames.filter((n) => n.includes('CLASSE S'));
      
      if (cInS.length > 0) {
        console.log(`\n   ⚠️  ATTENTION: ${cInS.length} modèle(s) CLASSE C dans le groupe CLASSE S !`);
      }
      if (sInC.length > 0) {
        console.log(`   ⚠️  ATTENTION: ${sInC.length} modèle(s) CLASSE S dans le groupe CLASSE C !`);
      }
      
      if (cInS.length === 0 && sInC.length === 0) {
        console.log(`\n   ✅ Groupes CLASSE S et CLASSE C correctement séparés !`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await db.$disconnect();
  }
}

checkSpecificManufacturers();







