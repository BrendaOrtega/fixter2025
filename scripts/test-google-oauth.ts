#!/usr/bin/env npx tsx

// Script para probar la configuración de Google OAuth
import { config } from 'dotenv'
config()
console.log('🔍 Probando configuración de Google OAuth...\n')

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_SECRET = process.env.GOOGLE_SECRET

console.log('📋 Variables de entorno:')
console.log(`   GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID ? '✅ Configurado' : '❌ Falta'}`)
console.log(`   GOOGLE_SECRET: ${GOOGLE_SECRET ? '✅ Configurado' : '❌ Falta'}`)

if (GOOGLE_CLIENT_ID) {
  console.log(`   CLIENT_ID formato: ${GOOGLE_CLIENT_ID.endsWith('.apps.googleusercontent.com') ? '✅ Válido' : '⚠️  Revisar formato'}`)
}

if (GOOGLE_SECRET) {
  console.log(`   SECRET formato: ${GOOGLE_SECRET.startsWith('GOCSPX-') ? '✅ Válido' : '⚠️  Revisar formato'}`)
}

// URLs de prueba
const location = process.env.NODE_ENV === "development" 
  ? "http://localhost:3000" 
  : "https://www.fixtergeek.com"

console.log('\n🔗 URLs configuradas:')
console.log(`   Redirect URI: ${location}/login?auth=google`)
console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`)

// Generar URL de Google
if (GOOGLE_CLIENT_ID) {
  const url = new URL("https://accounts.google.com/o/oauth2/auth")
  url.searchParams.set("client_id", GOOGLE_CLIENT_ID)
  url.searchParams.set("redirect_uri", location + "/login?auth=google")
  url.searchParams.set("response_type", "code")
  url.searchParams.set("scope", "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile")
  
  console.log('\n🚀 URL de Google OAuth generada:')
  console.log(url.toString())
}

console.log('\n✅ Test completado')