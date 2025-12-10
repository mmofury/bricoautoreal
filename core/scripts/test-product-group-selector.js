// Script de test pour trouver et ouvrir le dropdown des groupes de produits
// À exécuter dans la console du navigateur sur une page de catégorie TecDoc

(async function() {
  console.log('🧪 Test du dropdown product-group-selector...\n');
  
  // Méthode 1: Chercher par ta-name
  console.log('📋 Méthode 1: Recherche par ta-name="product-group-selector"');
  const multiselect = document.querySelector('p-multiselect[ta-name="product-group-selector"]');
  if (multiselect) {
    console.log('✅ Multiselect trouvé:', multiselect);
    console.log('   Classes:', multiselect.className);
    console.log('   ID:', multiselect.id);
    
    // Chercher l'input
    const input = multiselect.querySelector('input[role="combobox"]');
    if (input) {
      console.log('✅ Input trouvé:', input);
      console.log('   Value:', input.value);
      console.log('   aria-expanded:', input.getAttribute('aria-expanded'));
      
      // Test: Focus sur l'input
      console.log('\n🖱️  Test: Focus sur l\'input...');
      input.focus();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Test: Clic sur l'input
      console.log('🖱️  Test: Clic sur l\'input...');
      input.click();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Vérifier si le menu est ouvert
      const options = document.querySelectorAll('span[ta-name="product-group-selector__option"]');
      console.log(`📊 Options trouvées après clic: ${options.length}`);
      if (options.length > 0) {
        console.log('✅ SUCCÈS avec input.click()!');
        console.log('   Première option:', options[0].textContent);
      } else {
        console.log('❌ Le menu n\'est pas ouvert après input.click()');
      }
    }
    
    // Chercher le trigger
    const trigger = multiselect.querySelector('.p-multiselect-trigger, .p-multiselect-trigger-icon, span.pi-chevron-down');
    if (trigger) {
      console.log('\n✅ Trigger trouvé:', trigger);
      console.log('   Classes:', trigger.className);
      
      // Test: Clic sur le trigger
      console.log('🖱️  Test: Clic sur le trigger...');
      trigger.click();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Vérifier si le menu est ouvert
      const options = document.querySelectorAll('span[ta-name="product-group-selector__option"]');
      console.log(`📊 Options trouvées après clic: ${options.length}`);
      if (options.length > 0) {
        console.log('✅ SUCCÈS avec trigger.click()!');
        console.log('   Première option:', options[0].textContent);
      } else {
        console.log('❌ Le menu n\'est pas ouvert après trigger.click()');
      }
    }
    
    // Chercher le label
    const label = multiselect.querySelector('.p-multiselect-label');
    if (label) {
      console.log('\n✅ Label trouvé:', label);
      console.log('   Texte:', label.textContent.trim());
    }
    
  } else {
    console.log('❌ Multiselect non trouvé par ta-name');
  }
  
  // Méthode 2: Chercher tous les multiselects
  console.log('\n📋 Méthode 2: Recherche de tous les p-multiselect');
  const allMultiselects = document.querySelectorAll('p-multiselect');
  console.log(`   ${allMultiselects.length} multiselects trouvés:`);
  allMultiselects.forEach((ms, i) => {
    const taName = ms.getAttribute('ta-name');
    const label = ms.querySelector('.p-multiselect-label');
    console.log(`   ${i + 1}. ta-name="${taName}", label="${label ? label.textContent.trim() : 'N/A'}"`);
  });
  
  // Méthode 3: Chercher par texte du label
  console.log('\n📋 Méthode 3: Recherche par texte "Tous les groupes de produits"');
  const labelElements = Array.from(document.querySelectorAll('.p-multiselect-label'));
  const targetLabel = labelElements.find(el => el.textContent.includes('Tous les groupes de produits'));
  if (targetLabel) {
    console.log('✅ Label trouvé:', targetLabel);
    const parentMultiselect = targetLabel.closest('p-multiselect');
    if (parentMultiselect) {
      console.log('✅ Parent multiselect trouvé:', parentMultiselect);
      console.log('   ta-name:', parentMultiselect.getAttribute('ta-name'));
    }
  } else {
    console.log('❌ Label non trouvé');
  }
  
  // Méthode 4: Test avec événements JavaScript
  if (multiselect && input) {
    console.log('\n📋 Méthode 4: Test avec événements JavaScript');
    try {
      // Focus
      input.focus();
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Mousedown
      const mouseDown = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
      input.dispatchEvent(mouseDown);
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Mouseup
      const mouseUp = new MouseEvent('mouseup', { bubbles: true, cancelable: true });
      input.dispatchEvent(mouseUp);
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Click
      const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
      input.dispatchEvent(clickEvent);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Vérifier
      const options = document.querySelectorAll('span[ta-name="product-group-selector__option"]');
      console.log(`📊 Options trouvées après événements: ${options.length}`);
      if (options.length > 0) {
        console.log('✅ SUCCÈS avec événements JavaScript!');
        console.log('   Première option:', options[0].textContent);
      } else {
        console.log('❌ Le menu n\'est pas ouvert après événements');
      }
    } catch (e) {
      console.log('❌ Erreur avec événements:', e);
    }
  }
  
  // Méthode 5: Vérifier les overlays
  console.log('\n📋 Méthode 5: Recherche dans les overlays');
  const overlays = document.querySelectorAll('.p-overlay, .p-multiselect-panel, p-overlay');
  console.log(`   ${overlays.length} overlays trouvés`);
  overlays.forEach((overlay, i) => {
    const options = overlay.querySelectorAll('span[ta-name="product-group-selector__option"]');
    if (options.length > 0) {
      console.log(`   ✅ Overlay ${i + 1} contient ${options.length} options!`);
    }
  });
  
  // Résumé final
  console.log('\n📊 RÉSUMÉ:');
  const finalOptions = document.querySelectorAll('span[ta-name="product-group-selector__option"]');
  console.log(`   Options visibles: ${finalOptions.length}`);
  if (finalOptions.length > 0) {
    console.log('   ✅ Le dropdown est OUVERT');
    console.log('   Premières options:');
    Array.from(finalOptions).slice(0, 5).forEach((opt, i) => {
      console.log(`      ${i + 1}. ${opt.textContent.trim()}`);
    });
  } else {
    console.log('   ❌ Le dropdown est FERMÉ');
    console.log('\n💡 Suggestions:');
    console.log('   1. Vérifiez que vous êtes sur une page de catégorie (pas /brands)');
    console.log('   2. Vérifiez que le bouton btn-main a été cliqué');
    console.log('   3. Attendez que la page soit complètement chargée');
  }
  
})();



























