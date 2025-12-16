#!/usr/bin/env npx tsx

import { config } from "dotenv";
config();

import { initializeAgenda } from "../app/.server/agenda";

async function bootstrap() {
  try {
    console.log("🚀 Bootstrapping Agenda for video processing...");
    
    // Initialize Agenda with all job definitions and processors
    const agenda = await initializeAgenda();
    
    console.log("✅ Agenda fully initialized and running");
    console.log("🎬 Video processing jobs are now ready to execute");
    
    // Keep the process alive to handle jobs
    process.on('SIGTERM', async () => {
      console.log('📤 Gracefully shutting down Agenda...');
      await agenda.stop();
      process.exit(0);
    });
    
    process.on('SIGINT', async () => {
      console.log('📤 Gracefully shutting down Agenda...');
      await agenda.stop();
      process.exit(0);
    });
    
    // Keep alive
    setInterval(() => {
      // Just to keep the process running
      console.log(`🔄 Agenda heartbeat: ${new Date().toLocaleTimeString()}`);
    }, 5 * 60 * 1000); // Every 5 minutes
    
  } catch (error) {
    console.error("❌ Failed to bootstrap Agenda:", error);
    process.exit(1);
  }
}

// Only run if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  bootstrap().catch(console.error);
}