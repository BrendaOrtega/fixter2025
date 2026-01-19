import { initializeApp, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

const app = initializeApp({
  credential: cert('/tmp/firebase-creds.json'),
  storageBucket: 'fixter-67253.appspot.com'
});

const bucket = getStorage().bucket();

async function listVideosInFolder(prefix: string) {
  console.log(`\n=== ${prefix} ===\n`);

  const [files] = await bucket.getFiles({ prefix });

  // Filtrar solo videos
  const videos = files.filter(f =>
    f.name.endsWith('.mp4') ||
    f.name.endsWith('.mov') ||
    f.name.endsWith('.webm') ||
    f.name.endsWith('.m4v')
  );

  // Agrupar por subcarpeta
  const subfolders = new Map<string, { name: string; size: number }[]>();

  for (const video of videos) {
    const parts = video.name.replace(prefix, '').split('/');
    const subfolder = parts.length > 1 ? parts[0] : 'root';

    if (!subfolders.has(subfolder)) {
      subfolders.set(subfolder, []);
    }
    subfolders.get(subfolder)!.push({
      name: video.name,
      size: Math.round(parseInt(video.metadata.size as string || '0') / 1024 / 1024)
    });
  }

  console.log(`Total videos: ${videos.length}\n`);
  console.log('Subcarpetas:');

  for (const [subfolder, videoList] of [...subfolders.entries()].sort()) {
    const totalSize = videoList.reduce((acc, f) => acc + f.size, 0);
    console.log(`\n📁 ${subfolder} (${videoList.length} videos, ${totalSize} MB)`);
    for (const v of videoList.slice(0, 8)) {
      const shortName = v.name.split('/').pop();
      console.log(`   - ${shortName} (${v.size} MB)`);
    }
    if (videoList.length > 8) {
      console.log(`   ... y ${videoList.length - 8} más`);
    }
  }
}

async function main() {
  await listVideosInFolder('fixtergeek.com/');
  await listVideosInFolder('videoTest/');
}

main().catch(e => console.error('Error:', e.message));
