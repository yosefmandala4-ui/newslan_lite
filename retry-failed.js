const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

// 1. Setup konfigurasi dari environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; 
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

if (!SUPABASE_URL || !SUPABASE_KEY || !R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    console.error("❌ ERROR: Kredensial di .env.local belum lengkap!");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    }
});

async function retryFailed() {
    console.log("🚀 Memulai Percobaan Ulang (Retry) Gambar yang Gagal...");
    
    // Cari semua gambar yang sebelumnya ditandai gagal
    const { data: articles, error } = await supabase
        .from('articles')
        .select('id, title, featured_image')
        .like('featured_image', '%failed.cloudinary.com%');

    if (error) {
        console.error("❌ Gagal mengambil data:", error.message);
        return;
    }

    if (!articles || articles.length === 0) {
        console.log("\n🎉 Tidak ada gambar gagal yang ditemukan. Semua bersih!");
        return;
    }

    console.log(`\nMenemukan ${articles.length} gambar yang sebelumnya gagal. Mencoba mengunduh ulang...`);
    let totalMigrated = 0;
    let totalPermanentlyFailed = 0;

    for (const article of articles) {
        console.log(`\nMencoba lagi: "${article.title}"`);
        
        // Kembalikan URL ke versi aslinya untuk diunduh
        const originalUrl = article.featured_image.replace('failed.cloudinary.com', 'res.cloudinary.com');
        
        try {
            // Trik khusus: Menambahkan Referer seolah-olah kita sedang membuka website dari newslan.id
            const res = await fetch(originalUrl, {
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://newslan.id/',
                    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
                }
            });
            
            if (!res.ok) {
                console.error(`  ❌ Tetap gagal mengunduh (Status ${res.status}). Gambar ini kemungkinan besar sudah dihapus permanen dari Cloudinary.`);
                totalPermanentlyFailed++;
                continue;
            }

            const arrayBuffer = await res.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const contentType = res.headers.get('content-type') || 'image/jpeg';
            const fileExt = contentType.split('/')[1] || 'jpg';
            const fileName = `imports/retry-${Date.now()}-${uuidv4()}.${fileExt}`;

            // Upload ke R2
            await s3Client.send(new PutObjectCommand({
                Bucket: R2_BUCKET_NAME,
                Key: fileName,
                Body: buffer,
                ContentType: contentType,
            }));

            const cleanUrl = R2_PUBLIC_URL.endsWith('/') ? R2_PUBLIC_URL.slice(0, -1) : R2_PUBLIC_URL;
            const newUrl = `${cleanUrl}/${fileName}`;

            // Update database dengan URL R2 yang baru
            const { error: updateErr } = await supabase
                .from('articles')
                .update({ featured_image: newUrl })
                .eq('id', article.id);

            if (updateErr) throw updateErr;

            console.log(`  ✅ BERHASIL DISELAMATKAN! URL baru: ${newUrl}`);
            totalMigrated++;

        } catch (err) {
            console.error(`  ❌ Error internal: ${err.message}`);
            totalPermanentlyFailed++;
        }
    }
    
    console.log(`\n======================================`);
    console.log(`✅ Total berhasil diselamatkan: ${totalMigrated} artikel.`);
    console.log(`❌ Total terhapus permanen dari Cloudinary: ${totalPermanentlyFailed} artikel.`);
    console.log(`======================================`);
}

retryFailed();
