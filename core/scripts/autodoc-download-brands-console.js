// Script à copier-coller dans la console du navigateur sur https://www.auto-doc.fr/marques-pieces-detachees
// Il va télécharger toutes les images de marques de la page actuelle

(function() {
  console.log('🚀 Début du téléchargement des logos de marques...\n');
  
  // Fonction pour télécharger une image
  function downloadImage(url, filename) {
    return fetch(url)
      .then(response => response.blob())
      .then(blob => {
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(objectUrl);
        return true;
      })
      .catch(error => {
        console.error(`❌ Erreur pour ${filename}:`, error);
        return false;
      });
  }
  
  // Fonction pour nettoyer le nom de fichier
  function sanitizeFilename(name) {
    return name
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, '_')
      .trim();
  }
  
  // Trouver toutes les images de marques
  const images = Array.from(document.querySelectorAll('img')).filter(img => {
    const src = img.getAttribute('src') || img.getAttribute('data-src') || '';
    return src.includes('brands/thumbs') || src.includes('cdn.autodoc.de/brands');
  });
  
  console.log(`📸 Trouvé ${images.length} images de marques\n`);
  
  if (images.length === 0) {
    console.log('❌ Aucune image trouvée. Assure-toi que tu es sur une page avec des logos de marques (ex: /marques-pieces-detachees/a)');
    return;
  }
  
  // Extraire les informations de chaque image
  const brands = [];
  const seen = new Set();
  
  images.forEach((img, index) => {
    const name = img.getAttribute('alt') || `Marque_${index}`;
    let logoUrl = img.getAttribute('src') || img.getAttribute('data-src') || '';
    
    // Si pas de src, essayer srcset
    if (!logoUrl) {
      const srcset = img.getAttribute('srcset');
      if (srcset) {
        const srcsetParts = srcset.split(',');
        // Prendre l'URL avec m=0 (meilleure qualité)
        const highQuality = srcsetParts.find(p => p.includes('m=0'));
        if (highQuality) {
          logoUrl = highQuality.trim().split(' ')[0];
        } else {
          logoUrl = srcsetParts[0].trim().split(' ')[0];
        }
      }
    }
    
    // Normaliser l'URL pour avoir la meilleure qualité
    if (logoUrl && logoUrl.includes('brands/thumbs')) {
      let normalizedUrl = logoUrl.split(' ')[0].split(',')[0];
      if (!normalizedUrl.includes('m=0')) {
        normalizedUrl = normalizedUrl.replace(/[?&]m=\d+/, '');
        normalizedUrl += normalizedUrl.includes('?') ? '&m=0' : '?m=0';
      }
      
      // Compléter l'URL si nécessaire
      if (normalizedUrl.startsWith('//')) {
        normalizedUrl = `https:${normalizedUrl}`;
      } else if (!normalizedUrl.startsWith('http')) {
        normalizedUrl = `https://${normalizedUrl}`;
      }
      
      const cleanName = name.trim();
      if (cleanName && !seen.has(cleanName.toLowerCase())) {
        seen.add(cleanName.toLowerCase());
        brands.push({
          name: cleanName,
          url: normalizedUrl
        });
      }
    }
  });
  
  console.log(`✅ ${brands.length} marques uniques trouvées\n`);
  console.log('📥 Téléchargement en cours...\n');
  
  // Télécharger toutes les images avec un délai entre chaque
  let downloaded = 0;
  let failed = 0;
  
  brands.forEach((brand, index) => {
    setTimeout(() => {
      const filename = `${sanitizeFilename(brand.name)}.png`;
      console.log(`[${index + 1}/${brands.length}] Téléchargement: ${brand.name}...`);
      
      downloadImage(brand.url, filename)
        .then(success => {
          if (success) {
            downloaded++;
            console.log(`   ✅ ${brand.name} téléchargé`);
          } else {
            failed++;
            console.log(`   ❌ Échec pour ${brand.name}`);
          }
          
          // Afficher le résumé à la fin
          if (index === brands.length - 1) {
            setTimeout(() => {
              console.log(`\n✨ Téléchargement terminé !`);
              console.log(`📊 Statistiques:`);
              console.log(`   - Total: ${brands.length}`);
              console.log(`   - Téléchargés: ${downloaded}`);
              console.log(`   - Échecs: ${failed}`);
              console.log(`\n💾 Les fichiers sont dans ton dossier Téléchargements`);
            }, 1000);
          }
        });
    }, index * 500); // Délai de 500ms entre chaque téléchargement
  });
  
  // Afficher un résumé des données
  console.log('\n📋 Liste des marques à télécharger:');
  brands.forEach((brand, i) => {
    console.log(`   ${i + 1}. ${brand.name} - ${brand.url}`);
  });
  
  // Retourner les données pour copier-coller dans un fichier JSON si besoin
  return brands;
})();


