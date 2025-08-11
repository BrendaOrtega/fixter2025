// Script de prueba para generar EPUB directamente
// Ejecutar con: node test-epub.js

async function testEpub() {
  try {
    console.log("🔄 Probando generación de EPUB...");
    
    // Hacer POST request con form data
    const formData = new FormData();
    formData.append('action', 'download-epub');
    
    const response = await fetch('http://localhost:3001/libros/domina_claude_code', {
      method: 'POST',
      body: formData,
    });
    
    console.log("📡 Respuesta recibida:");
    console.log("   Status:", response.status);
    console.log("   Content-Type:", response.headers.get('content-type'));
    console.log("   Content-Disposition:", response.headers.get('content-disposition'));
    
    if (response.ok && response.headers.get('content-type') === 'application/epub+zip') {
      const buffer = await response.arrayBuffer();
      const fs = require('fs');
      fs.writeFileSync('test-output.epub', Buffer.from(buffer));
      console.log("✅ EPUB generado correctamente: test-output.epub");
      console.log("   Tamaño:", (buffer.byteLength / 1024).toFixed(2), "KB");
    } else {
      console.error("❌ Error: No se recibió un EPUB válido");
      const text = await response.text();
      console.log("   Respuesta:", text.substring(0, 200), "...");
    }
  } catch (error) {
    console.error("❌ Error durante la prueba:", error.message);
  }
}

// Si tenemos fetch disponible (Node 18+)
if (typeof fetch === 'undefined') {
  console.log("Instalando node-fetch...");
  const { execSync } = require('child_process');
  execSync('npm install node-fetch@2');
  global.fetch = require('node-fetch');
  global.FormData = require('form-data');
}

testEpub();