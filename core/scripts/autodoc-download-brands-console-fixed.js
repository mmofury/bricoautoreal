// Script à copier-coller dans la console du navigateur
// Version corrigée pour contourner CORS en utilisant un canvas

(function() {
  console.log('🚀 Début du téléchargement des logos de marques...\n');
  
  // Fonction pour télécharger une image via canvas (contourne CORS)
  function downloadImageViaCanvas(url, filename) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous'; // Essayer de contourner CORS
      
      img.onload = function() {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          
          canvas.toBlob((blob) => {
            if (blob) {
              const objectUrl = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = objectUrl;
              a.download = filename;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(objectUrl);
              resolve(true);
            } else {
              reject(new Error('Impossible de créer le blob'));
            }
          }, 'image/png');
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = function() {
        // Si canvas échoue, essayer avec un lien direct
        console.log(`   ⚠️  Canvas échoué pour ${filename}, tentative lien direct...`);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        resolve(false); // Marqué comme partiel
      };
      
      img.src = url;
    });
  }
  
  // Fonction pour créer un fichier JSON avec toutes les URLs
  function downloadJSON(data, filename) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  
  function sanitizeFilename(name) {
    return name.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, '_').trim();
  }
  
  // Trouver toutes les images de marques
  const images = Array.from(document.querySelectorAll('img')).filter(img => {
    const src = img.getAttribute('src') || img.getAttribute('data-src') || '';
    return src.includes('brands/thumbs') || src.includes('cdn.autodoc.de/brands');
  });
  
  console.log(`📸 Trouvé ${images.length} images de marques\n`);
  
  if (images.length === 0) {
    console.log('❌ Aucune image trouvée.');
    return;
  }
  
  const brands = [];
  const seen = new Set();
  
  images.forEach((img, index) => {
    const name = img.getAttribute('alt') || `Marque_${index}`;
    let logoUrl = img.getAttribute('src') || img.getAttribute('data-src') || '';
    
    if (!logoUrl) {
      const srcset = img.getAttribute('srcset');
      if (srcset) {
        const srcsetParts = srcset.split(',');
        const highQuality = srcsetParts.find(p => p.includes('m=0'));
        logoUrl = highQuality ? highQuality.trim().split(' ')[0] : srcsetParts[0].trim().split(' ')[0];
      }
    }
    
    if (logoUrl && logoUrl.includes('brands/thumbs')) {
      let normalizedUrl = logoUrl.split(' ')[0].split(',')[0];
      if (!normalizedUrl.includes('m=0')) {
        normalizedUrl = normalizedUrl.replace(/[?&]m=\d+/, '');
        normalizedUrl += normalizedUrl.includes('?') ? '&m=0' : '?m=0';
      }
      
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
          url: normalizedUrl,
          filename: `${sanitizeFilename(cleanName)}.png`
        });
      }
    }
  });
  
  console.log(`✅ ${brands.length} marques uniques trouvées\n`);
  
  // Télécharger le JSON avec toutes les URLs d'abord (au cas où)
  console.log('💾 Téléchargement du fichier JSON avec toutes les URLs...');
  downloadJSON(brands, 'autodoc-brands-urls.json');
  console.log('   ✅ Fichier JSON téléchargé ! Tu peux utiliser ces URLs avec un script Node.js\n');
  
  console.log('📥 Tentative de téléchargement des images (peut échouer à cause de CORS)...\n');
  console.log('💡 Si CORS bloque, utilise le fichier JSON téléchargé avec un script Node.js\n');
  
  // Essayer de télécharger les images (peut échouer à cause de CORS)
  let downloaded = 0;
  let failed = 0;
  let partial = 0;
  
  brands.forEach((brand, index) => {
    setTimeout(() => {
      console.log(`[${index + 1}/${brands.length}] ${brand.name}...`);
      
      downloadImageViaCanvas(brand.url, brand.filename)
        .then(success => {
          if (success === true) {
            downloaded++;
            console.log(`   ✅ ${brand.name} téléchargé`);
          } else {
            partial++;
            console.log(`   ⚠️  ${brand.name} - lien ouvert (télécharge manuellement)`);
          }
          
          if (index === brands.length - 1) {
            setTimeout(() => {
              console.log(`\n✨ Terminé !`);
              console.log(`📊 Statistiques:`);
              console.log(`   - Total: ${brands.length}`);
              console.log(`   - Téléchargés: ${downloaded}`);
              console.log(`   - Partiels: ${partial}`);
              console.log(`   - Échecs: ${failed}`);
              console.log(`\n💡 Utilise le fichier autodoc-brands-urls.json avec un script Node.js pour télécharger toutes les images`);
            }, 1000);
          }
        })
        .catch(error => {
          failed++;
          console.log(`   ❌ Échec pour ${brand.name}`);
          if (index === brands.length - 1) {
            setTimeout(() => {
              console.log(`\n✨ Terminé !`);
              console.log(`📊 Statistiques:`);
              console.log(`   - Total: ${brands.length}`);
              console.log(`   - Téléchargés: ${downloaded}`);
              console.log(`   - Partiels: ${partial}`);
              console.log(`   - Échecs: ${failed}`);
            }, 1000);
          }
        });
    }, index * 300); // Délai plus court
  });
  
  return brands;
})();


