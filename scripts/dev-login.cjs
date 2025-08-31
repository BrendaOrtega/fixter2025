#!/usr/bin/env node

const jwt = require('jsonwebtoken');
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const DEV_PORT = 3000;
const DEFAULT_EMAIL = 'fixtergeek@gmail.com';
const SECRET = process.env.SECRET || 'fixtergeek';

// Función principal
async function main() {
  console.log('🚀 FixterGeek Dev Login Helper');
  console.log('================================\n');

  const emailArg = process.argv[2];
  
  if (emailArg) {
    // Si se proporciona email como argumento
    await processLogin(emailArg);
  } else {
    // Modo interactivo
    rl.question(`Ingresa el email del usuario (${DEFAULT_EMAIL}): `, async (input) => {
      const email = input.trim() || DEFAULT_EMAIL;
      await processLogin(email);
    });
  }
}

async function processLogin(email) {
  try {
    console.log(`\n⏳ Generando enlace para: ${email}`);
    
    // Generar el token directamente
    const tokenData = { email };
    const token = jwt.sign(tokenData, SECRET, { expiresIn: '1h' });
    
    const loginUrl = `http://localhost:${DEV_PORT}/login?token=${token}`;
    
    console.log('\n✅ ¡Enlace generado exitosamente!');
    console.log(`📧 Email: ${email}`);
    console.log(`🎟️  Token: ${token.substring(0, 50)}...`);
    console.log(`🔗 URL: ${loginUrl}\n`);
    
    // Abrir automáticamente
    try {
      const platform = process.platform;
      let command;
      
      if (platform === 'darwin') command = 'open';
      else if (platform === 'win32') command = 'start';
      else command = 'xdg-open';
      
      execSync(`${command} "${loginUrl}"`);
      console.log('🌐 Enlace abierto en el navegador');
    } catch (error) {
      console.log(`❌ Error abriendo enlace: ${error.message}`);
      console.log('📋 Copia y pega manualmente el enlace en tu navegador');
    }
    
  } catch (error) {
    console.log(`\n❌ Error: ${error.message}`);
  } finally {
    if (rl) rl.close();
  }
}

// Verificar que estamos en desarrollo
if (process.env.NODE_ENV === 'production') {
  console.log('❌ Este script solo funciona en desarrollo');
  process.exit(1);
}

// Ejecutar
main().catch(console.error);