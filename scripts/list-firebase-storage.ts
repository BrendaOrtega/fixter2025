import { initializeApp, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

const app = initializeApp({
  credential: cert('/tmp/firebase-creds.json'),
  storageBucket: 'fixter-67253.appspot.com'
});

const bucket = getStorage().bucket();

async function listAllFiles() {
  console.log('Listando archivos en Firebase Storage...\n');

  const [files] = await bucket.getFiles();

  // Agrupar por carpeta
  const folders = new Map<string, { name: string; size: number }[]>();

  for (const file of files) {
    const parts = file.name.split('/');
    const folder = parts.length > 1 ? parts[0] : 'root';

    if (!folders.has(folder)) {
      folders.set(folder, []);
    }
    folders.get(folder)!.push({
      name: file.name,
      size: Math.round(parseInt(file.metadata.size as string || '0') / 1024 / 1024)
    });
  }

  console.log('=== Carpetas encontradas ===\n');
  for (const [folder, fileList] of [...folders.entries()].sort()) {
    const totalSize = fileList.reduce((acc, f) => acc + f.size, 0);
    console.log(`${folder}/ (${fileList.length} archivos, ${totalSize} MB)`);
  }

  console.log('\n=== Detalle por carpeta ===\n');
  for (const [folder, fileList] of [...folders.entries()].sort()) {
    console.log(`--- ${folder} ---`);
    for (const f of fileList.slice(0, 5)) {
      console.log(`  ${f.name} (${f.size} MB)`);
    }
    if (fileList.length > 5) {
      console.log(`  ... y ${fileList.length - 5} más`);
    }
    console.log();
  }
}

listAllFiles().catch(e => console.error('Error:', e.message));
