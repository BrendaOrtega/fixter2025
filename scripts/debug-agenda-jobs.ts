#!/usr/bin/env -S npx tsx

import { PrismaClient } from '@prisma/client'
import { MongoClient } from 'mongodb'

const prisma = new PrismaClient()

async function debugAgendaJobs() {
  console.log('🔍 Verificando jobs de Agenda...\n')

  // Conectar directamente a MongoDB para revisar la colección de jobs de Agenda
  const client = new MongoClient(process.env.DATABASE_URL!)
  await client.connect()
  
  const db = client.db()
  const agendaJobs = db.collection('agenda')

  // Buscar jobs relacionados con procesamiento de video
  const videoJobs = await agendaJobs.find({
    name: { $regex: /video|process/i }
  }).sort({ lastRunAt: -1 }).limit(20).toArray()

  console.log(`📊 Jobs de video encontrados: ${videoJobs.length}\n`)

  videoJobs.forEach((job, index) => {
    console.log(`${index + 1}. 📝 ${job.name}`)
    console.log(`   Status: ${job.lastFinishedAt ? 'Completed' : job.failedAt ? 'Failed' : 'Pending'}`)
    console.log(`   Last Run: ${job.lastRunAt ? new Date(job.lastRunAt).toLocaleString() : 'Never'}`)
    console.log(`   Next Run: ${job.nextRunAt ? new Date(job.nextRunAt).toLocaleString() : 'Not scheduled'}`)
    if (job.failReason) {
      console.log(`   ❌ Fail Reason: ${job.failReason}`)
    }
    if (job.data) {
      console.log(`   📄 Data: ${JSON.stringify(job.data, null, 2)}`)
    }
    console.log('')
  })

  // Buscar jobs fallidos
  const failedJobs = await agendaJobs.find({
    failedAt: { $exists: true },
    name: { $regex: /video|process/i }
  }).sort({ failedAt: -1 }).limit(10).toArray()

  if (failedJobs.length > 0) {
    console.log(`🚨 Jobs fallidos encontrados: ${failedJobs.length}`)
    failedJobs.forEach((job, index) => {
      console.log(`${index + 1}. ❌ ${job.name}`)
      console.log(`   Failed At: ${job.failedAt ? new Date(job.failedAt).toLocaleString() : 'Unknown'}`)
      console.log(`   Reason: ${job.failReason || 'No reason provided'}`)
      if (job.data) {
        console.log(`   Video: ${job.data.videoId || job.data.id || 'Unknown'}`)
      }
      console.log('')
    })
  }

  await client.close()
  await prisma.$disconnect()
}

debugAgendaJobs().catch(console.error)