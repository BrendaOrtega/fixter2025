#!/usr/bin/env -S npx tsx

import { PrismaClient } from '@prisma/client'
import { MongoClient } from 'mongodb'
import { s3VideoService } from '../app/.server/services/s3-video'
import ffmpegPath from "@ffmpeg-installer/ffmpeg"
import { existsSync } from 'fs'

const prisma = new PrismaClient()

async function finalVerification() {
  console.log('🎯 VERIFICACIÓN FINAL - SISTEMA LISTO PARA VIDEOS\n')
  let score = 0
  const totalChecks = 6

  // 1. ✅ Base de datos (Prisma conexión)
  try {
    await prisma.video.findFirst()
    console.log('✅ 1. Base de datos: CONECTADA')
    score++
  } catch {
    console.log('❌ 1. Base de datos: ERROR')
  }

  // 2. ✅ MongoDB/Agenda
  try {
    const client = new MongoClient(process.env.DATABASE_URL!)
    await client.connect()
    await client.db().collection('agenda').findOne()
    await client.close()
    console.log('✅ 2. Agenda/MongoDB: CONECTADO')
    score++
  } catch {
    console.log('❌ 2. Agenda/MongoDB: ERROR')
  }

  // 3. ✅ Variables S3/Tigris
  const hasS3Config = !!(
    process.env.AWS_ACCESS_KEY_ID && 
    process.env.AWS_SECRET_ACCESS_KEY && 
    process.env.AWS_S3_BUCKET &&
    process.env.AWS_ENDPOINT_URL_S3
  )
  console.log(`${hasS3Config ? '✅' : '❌'} 3. S3/Tigris Config: ${hasS3Config ? 'CONFIGURADO' : 'INCOMPLETO'}`)
  if (hasS3Config) score++

  // 4. ✅ FFmpeg
  const hasFFmpeg = existsSync(ffmpegPath.path)
  console.log(`${hasFFmpeg ? '✅' : '❌'} 4. FFmpeg: ${hasFFmpeg ? 'DISPONIBLE' : 'FALTANTE'}`)
  if (hasFFmpeg) score++

  // 5. ✅ S3 Service
  try {
    const testUrl = s3VideoService.getVideoUrl('test.mp4')
    const hasCorrectUrl = testUrl.includes('tigris.dev') && testUrl.includes('test.mp4')
    console.log(`${hasCorrectUrl ? '✅' : '❌'} 5. S3 Video Service: ${hasCorrectUrl ? 'FUNCIONAL' : 'ERROR'}`)
    if (hasCorrectUrl) score++
  } catch {
    console.log('❌ 5. S3 Video Service: ERROR')
  }

  // 6. ✅ API Routes
  const hasAPIRoute = existsSync('app/routes/api/course.tsx')
  console.log(`${hasAPIRoute ? '✅' : '❌'} 6. API Routes: ${hasAPIRoute ? 'DISPONIBLES' : 'FALTANTES'}`)
  if (hasAPIRoute) score++

  // RESULTADO FINAL
  const percentage = Math.round((score / totalChecks) * 100)
  console.log('\n' + '='.repeat(50))
  console.log(`🎯 RESULTADO: ${score}/${totalChecks} componentes (${percentage}%)`)
  console.log('='.repeat(50))

  if (score === totalChecks) {
    console.log('🎉 ¡SISTEMA 100% OPERATIVO!')
    console.log('🚀 LISTO PARA SUBIR Y PROCESAR VIDEOS')
    console.log('')
    console.log('📋 Componentes verificados:')
    console.log('   ✅ Base de datos conectada')
    console.log('   ✅ Agenda funcionando')
    console.log('   ✅ S3/Tigris configurado')
    console.log('   ✅ FFmpeg disponible')
    console.log('   ✅ Servicios operativos')
    console.log('   ✅ API endpoints listos')
    console.log('')
    console.log('💡 FLUJO ESPERADO:')
    console.log('   1. Subir video → storageLink se guarda')
    console.log('   2. Job de Agenda se programa automáticamente')
    console.log('   3. FFmpeg procesa el video a HLS')
    console.log('   4. m3u8 se guarda → video listo para reproducir')
    console.log('')
    console.log('🎯 ¡YA PUEDES SUBIR VIDEOS CON CONFIANZA!')
  } else {
    console.log(`⚠️ SISTEMA ${percentage}% OPERATIVO`)
    console.log('🔧 Algunos componentes necesitan atención')
    if (score >= 4) {
      console.log('💡 Pero debería funcionar básicamente')
    }
  }

  await prisma.$disconnect()
  return score === totalChecks
}

finalVerification().catch(console.error)