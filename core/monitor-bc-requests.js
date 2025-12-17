// Script to count BigCommerce GraphQL requests
const fs = require('fs');

console.log('Monitoring BigCommerce requests...');
console.log('Reload a page and watch the count');

let requestCount = 0;
let startTime = Date.now();

// This will be logged by the client
const originalFetch = global.fetch;
global.fetch = async (...args) => {
    const url = args[0];
    if (typeof url === 'string' && url.includes('bigcommerce')) {
        requestCount++;
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[${elapsed}s] BigCommerce Request #${requestCount}: ${url}`);
    }
    return originalFetch(...args);
};

// Reset counter every 60 seconds
setInterval(() => {
    if (requestCount > 0) {
        console.log(`\n=== SUMMARY: ${requestCount} requests in last 60s ===\n`);
        requestCount = 0;
        startTime = Date.now();
    }
}, 60000);
