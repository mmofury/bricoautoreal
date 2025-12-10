// Script wrapper pour charger .env.local depuis la racine avant d'exécuter Prisma
const { execSync } = require('child_process');
const { resolve } = require('path');
const { config } = require('dotenv');

// Charger .env.local depuis la racine du projet
const rootEnvPath = resolve(__dirname, '../../.env.local');
const fs = require('fs');

if (!fs.existsSync(rootEnvPath)) {
  console.error(`Fichier .env.local non trouvé à: ${rootEnvPath}`);
  process.exit(1);
}

const result = config({ path: rootEnvPath });

if (result.error) {
  console.error(`Erreur lors du chargement de .env.local: ${result.error.message}`);
  console.error(`Chemin recherché: ${rootEnvPath}`);
  process.exit(1);
}

// Afficher les variables chargées (pour debug - à retirer en production)
if (process.env.DEBUG_ENV) {
  console.log('Variables chargées:');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✓ trouvée' : '✗ non trouvée');
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL non trouvée dans .env.local');
  console.error(`Fichier chargé depuis: ${rootEnvPath}`);
  console.error('\nVérifiez que votre .env.local contient:');
  console.error('DATABASE_URL="postgresql://user:password@localhost:5432/bricoauto?schema=public"');
  process.exit(1);
}

// Récupérer la commande Prisma à exécuter
const prismaCommand = process.argv.slice(2).join(' ');

if (!prismaCommand) {
  console.error('Usage: node prisma-with-env.js <prisma-command>');
  process.exit(1);
}

// Exécuter la commande Prisma
try {
  execSync(`npx prisma ${prismaCommand}`, {
    stdio: 'inherit',
    cwd: __dirname + '/..',
  });
} catch (error) {
  process.exit(error.status || 1);
}

