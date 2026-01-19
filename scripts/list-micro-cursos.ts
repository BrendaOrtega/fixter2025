import { initializeApp, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

const app = initializeApp({
  credential: cert('/tmp/firebase-creds.json'),
  storageBucket: 'fixter-67253.appspot.com'
});

const bucket = getStorage().bucket();

async function listMicroCursos() {
  const [files] = await bucket.getFiles({ prefix: 'fixtergeek.com/micro-cursos/' });

  const videos = files.filter(f =>
    f.name.endsWith('.mp4') ||
    f.name.endsWith('.mov') ||
    f.name.endsWith('.webm')
  );

  // Agrupar por prefijo del nombre del archivo (curso)
  const cursos = new Map<string, { name: string; size: number }[]>();

  for (const video of videos) {
    const fileName = video.name.split('/').pop() || '';
    // Extraer el nombre del curso del archivo (ej: gpt-1.mp4 -> gpt, next_1_segmentos.mp4 -> next)
    const match = fileName.match(/^([a-zA-Z_]+)/);
    const curso = match ? match[1] : 'otros';

    if (!cursos.has(curso)) {
      cursos.set(curso, []);
    }
    cursos.get(curso)!.push({
      name: fileName,
      size: Math.round(parseInt(video.metadata.size as string || '0') / 1024 / 1024)
    });
  }

  console.log('=== Micro-cursos en Firebase ===\n');

  for (const [curso, videoList] of [...cursos.entries()].sort()) {
    const totalSize = videoList.reduce((acc, f) => acc + f.size, 0);
    console.log(`\n📚 ${curso.toUpperCase()} (${videoList.length} videos, ${totalSize} MB)`);
    for (const v of videoList.sort((a, b) => a.name.localeCompare(b.name))) {
      console.log(`   ${v.name} (${v.size} MB)`);
    }
  }
}

listMicroCursos().catch(e => console.error('Error:', e.message));
