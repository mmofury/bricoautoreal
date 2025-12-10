// Script de test pour vérifier le chargement de .env.local
const { resolve } = require('path');
const { config } = require('dotenv');
const fs = require('fs');

const rootEnvPath = resolve(__dirname, '../../.env.local');

console.log('Chemin du fichier:', rootEnvPath);
console.log('Fichier existe:', fs.existsSync(rootEnvPath));

if (fs.existsSync(rootEnvPath)) {
  console.log('\nContenu du fichier:');
  const content = fs.readFileSync(rootEnvPath, 'utf-8');
  console.log(content);
  
  console.log('\nLignes contenant DATABASE_URL:');
  content.split('\n').forEach((line, index) => {
    if (line.includes('DATABASE_URL')) {
      console.log(`Ligne ${index + 1}: ${line}`);
    }
  });
}

console.log('\nChargement avec dotenv...');
const result = config({ path: rootEnvPath });

if (result.error) {
  console.error('Erreur:', result.error);
} else {
  console.log('Chargement réussi');
  console.log('Variables chargées:', Object.keys(result.parsed || {}));
  console.log('DATABASE_URL:', process.env.DATABASE_URL || 'NON TROUVÉE');
}

































