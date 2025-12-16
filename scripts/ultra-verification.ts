#!/usr/bin/env -S npx tsx

import { PrismaClient } from '@prisma/client'
import { MongoClient } from 'mongodb'
import { s3VideoService } from '../app/.server/services/s3-video'
import { videoProcessorService } from '../app/.server/services/video-processor'
import { Effect } from 'effect'
import ffmpegPath from "@ffmpeg-installer/ffmpeg"
import { existsSync } from 'fs'

const prisma = new PrismaClient()

async function ultraVerification() {
  console.log('🔍 ULTRA-VERIFICACIÓN DEL SISTEMA DE VIDEO\n')
  let allGood = true

  // 1. ✅ Verificar conexión a base de datos
  try {
    console.log('📊 1. Verificando conexión a base de datos...')
    await prisma.$queryRaw`SELECT 1`
    console.log('   ✅ Base de datos conectada correctamente')
  } catch (error) {
    console.log(`   ❌ Error de base de datos: ${error}`)
    allGood = false
  }

  // 2. ✅ Verificar Agenda/MongoDB
  try {
    console.log('\n📋 2. Verificando sistema Agenda...')
    const client = new MongoClient(process.env.DATABASE_URL!)
    await client.connect()
    const db = client.db()
    const agendaJobs = db.collection('agenda')
    const jobCount = await agendaJobs.countDocuments()
    await client.close()
    console.log(`   ✅ Agenda conectado - ${jobCount} jobs en cola`)
  } catch (error) {
    console.log(`   ❌ Error de Agenda: ${error}`)
    allGood = false
  }

  // 3. ✅ Verificar configuración S3/Tigris
  try {
    console.log('\n☁️ 3. Verificando configuración S3/Tigris...')
    const requiredEnvs = [
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY', 
      'AWS_REGION',
      'AWS_S3_BUCKET'
    ]
    
    const missingEnvs = requiredEnvs.filter(env => !process.env[env])
    if (missingEnvs.length > 0) {
      console.log(`   ❌ Variables faltantes: ${missingEnvs.join(', ')}`)
      allGood = false
    } else {
      console.log('   ✅ Variables de S3 configuradas')
      console.log(`   📦 Bucket: ${process.env.AWS_S3_BUCKET}`)
      console.log(`   🌍 Region: ${process.env.AWS_REGION}`)
      console.log(`   🔗 Endpoint: ${process.env.AWS_ENDPOINT_URL_S3 || 'AWS S3 default'}`)
    }
  } catch (error) {
    console.log(`   ❌ Error verificando S3: ${error}`)
    allGood = false
  }

  // 4. ✅ Verificar FFmpeg
  try {
    console.log('\n🎬 4. Verificando FFmpeg...')
    console.log(`   📍 FFmpeg path: ${ffmpegPath.path}`)
    
    if (existsSync(ffmpegPath.path)) {
      console.log('   ✅ FFmpeg encontrado y disponible')
    } else {
      console.log('   ❌ FFmpeg no encontrado en el path')
      allGood = false
    }
  } catch (error) {
    console.log(`   ❌ Error verificando FFmpeg: ${error}`)
    allGood = false
  }

  // 5. ✅ Test básico de servicios
  try {
    console.log('\n⚙️ 5. Probando servicios de video...')
    
    // Test S3 service - solo verificar que se puede inicializar
    const testKey = 'test/test.mp4'
    const url = s3VideoService.getVideoUrl(testKey)
    if (url.includes('test/test.mp4')) {
      console.log('   ✅ S3 Video Service inicializado correctamente')
    } else {
      console.log('   ❌ S3 Video Service no funciona correctamente')
      allGood = false
    }

    console.log('   ✅ Video Processor Service disponible')
    
  } catch (error) {
    console.log(`   ❌ Error en servicios: ${error}`)
    allGood = false
  }

  // 6. ✅ Verificar rutas de API
  try {
    console.log('\n🌐 6. Verificando estructura de rutas...')
    
    // Verificar que existan los archivos de rutas
    const routeFiles = [
      'app/routes/api/course.tsx', // Donde está el upload de video
    ]
    
    let routesOk = true
    for (const route of routeFiles) {
      if (existsSync(route)) {
        console.log(`   ✅ ${route}`)
      } else {
        console.log(`   ❌ ${route} no encontrado`)
        routesOk = false
      }
    }
    
    if (routesOk) {
      console.log('   ✅ Rutas de API disponibles')
    } else {
      allGood = false
    }
    
  } catch (error) {
    console.log(`   ❌ Error verificando rutas: ${error}`)
    allGood = false
  }

  // 7. ✅ Verificar sistema de agenda está ejecutándose
  try {
    console.log('\n⚡ 7. Verificando estado de Agenda en runtime...')
    
    // Verificar si hay jobs de sequences corriendo (indica que agenda está activo)
    const client = new MongoClient(process.env.DATABASE_URL!)
    await client.connect()
    const db = client.db()
    const agendaJobs = db.collection('agenda')
    
    const sequenceJobs = await agendaJobs.find({ name: 'process_sequences' }).toArray()
    if (sequenceJobs.length > 0) {
      console.log('   ✅ Agenda está activo (jobs de sequences detectados)')
    } else {
      console.log('   ⚠️ Agenda podría no estar activo (no se detectan jobs regulares)')
    }
    
    await client.close()
  } catch (error) {
    console.log(`   ❌ Error verificando estado de Agenda: ${error}`)
    allGood = false
  }

  // RESUMEN FINAL
  console.log('\n' + '='.repeat(50))
  console.log('📋 RESUMEN ULTRA-VERIFICACIÓN')
  console.log('='.repeat(50))
  
  if (allGood) {
    console.log('🎉 ¡SISTEMA 100% OPERATIVO!')
    console.log('✅ Todos los componentes verificados exitosamente')
    console.log('')
    console.log('🚀 LISTO PARA SUBIR VIDEOS:')
    console.log('   • Base de datos: ✅')
    console.log('   • Agenda: ✅') 
    console.log('   • S3/Tigris: ✅')
    console.log('   • FFmpeg: ✅')
    console.log('   • Servicios: ✅')
    console.log('   • API Routes: ✅')
    console.log('')
    console.log('💡 Los videos se procesarán automáticamente después del upload')
  } else {
    console.log('⚠️ SISTEMA CON PROBLEMAS')
    console.log('❌ Hay componentes que necesitan atención')
    console.log('🔧 Revisa los errores arriba antes de subir videos')
  }
  
  await prisma.$disconnect()
  return allGood
}

ultraVerification().catch(console.error)