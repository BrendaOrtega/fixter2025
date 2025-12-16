#!/usr/bin/env -S npx tsx

import { MongoClient } from 'mongodb'

async function debugAllAgendaJobs() {
  console.log('🔍 Verificando TODOS los jobs de Agenda...\n')

  const client = new MongoClient(process.env.DATABASE_URL!)
  await client.connect()
  
  const db = client.db()
  const agendaJobs = db.collection('agenda')

  // Listar todos los tipos de jobs disponibles
  const jobNames = await agendaJobs.distinct('name')
  console.log(`📋 Tipos de jobs encontrados: ${jobNames.length}`)
  jobNames.forEach((name, index) => {
    console.log(`   ${index + 1}. ${name}`)
  })
  console.log('')

  // Mostrar los últimos 10 jobs ejecutados
  const recentJobs = await agendaJobs.find({}).sort({ lastRunAt: -1 }).limit(10).toArray()
  
  console.log(`📊 Últimos ${recentJobs.length} jobs ejecutados:\n`)
  recentJobs.forEach((job, index) => {
    console.log(`${index + 1}. 📝 ${job.name}`)
    console.log(`   Status: ${job.lastFinishedAt ? '✅ Completed' : job.failedAt ? '❌ Failed' : '⏳ Pending'}`)
    console.log(`   Last Run: ${job.lastRunAt ? new Date(job.lastRunAt).toLocaleString() : 'Never'}`)
    console.log(`   Next Run: ${job.nextRunAt ? new Date(job.nextRunAt).toLocaleString() : 'Not scheduled'}`)
    if (job.failReason) {
      console.log(`   ❌ Fail Reason: ${job.failReason}`)
    }
    if (job.data && Object.keys(job.data).length > 0) {
      console.log(`   📄 Data keys: ${Object.keys(job.data).join(', ')}`)
    }
    console.log('')
  })

  // Buscar jobs fallidos en general
  const failedJobs = await agendaJobs.find({
    failedAt: { $exists: true }
  }).sort({ failedAt: -1 }).limit(5).toArray()

  if (failedJobs.length > 0) {
    console.log(`🚨 Jobs fallidos recientes: ${failedJobs.length}`)
    failedJobs.forEach((job, index) => {
      console.log(`${index + 1}. ❌ ${job.name}`)
      console.log(`   Failed At: ${job.failedAt ? new Date(job.failedAt).toLocaleString() : 'Unknown'}`)
      console.log(`   Reason: ${job.failReason || 'No reason provided'}`)
      console.log('')
    })
  }

  await client.close()
}

debugAllAgendaJobs().catch(console.error)