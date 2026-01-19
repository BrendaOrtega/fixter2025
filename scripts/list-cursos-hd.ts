import { initializeApp, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

const app = initializeApp({
  credential: cert('/tmp/firebase-creds.json'),
  storageBucket: 'fixter-67253.appspot.com'
});

const bucket = getStorage().bucket();

async function listCursosHD() {
  const [files] = await bucket.getFiles({ prefix: 'fixtergeek.com/cursos_HD/' });

  const videos = files.filter(f =>
    f.name.endsWith('.mp4') ||
    f.name.endsWith('.mov') ||
    f.name.endsWith('.webm')
  );

  // Agrupar por subcarpeta (curso)
  const cursos = new Map<string, { name: string; size: number }[]>();

  for (const video of videos) {
    const parts = video.name.replace('fixtergeek.com/cursos_HD/', '').split('/');
    const curso = parts.length > 1 ? parts[0] : 'root';
    const fileName = parts[parts.length - 1];

    if (!cursos.has(curso)) {
      cursos.set(curso, []);
    }
    cursos.get(curso)!.push({
      name: fileName,
      size: Math.round(parseInt(video.metadata.size as string || '0') / 1024 / 1024)
    });
  }

  console.log('=== Cursos HD en Firebase ===\n');

  for (const [curso, videoList] of [...cursos.entries()].sort()) {
    const totalSize = videoList.reduce((acc, f) => acc + f.size, 0);
    console.log(`\n📚 ${curso} (${videoList.length} videos, ${totalSize} MB)`);
    for (const v of videoList.sort((a, b) => a.name.localeCompare(b.name))) {
      console.log(`   ${v.name} (${v.size} MB)`);
    }
  }
}

listCursosHD().catch(e => console.error('Error:', e.message));
