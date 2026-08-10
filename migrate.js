const fs = require('fs');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

// 1. Setup konfigurasi dari environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Menggunakan Service Role Key agar bebas akses
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

async function migrateAll() {
    console.log("🚀 Memulai Migrasi Massal Cloudinary ke R2 (via CLI)...");
    
    let offset = 0;
    const limit = 10;
    let totalMigrated = 0;

    while (true) {
        console.log(`\n⏳ Mengambil data artikel dari offset ${offset}...`);
        const { data: articles, error } = await supabase
            .from('articles')
            .select('id, title, featured_image')
            .like('featured_image', '%res.cloudinary.com%')
            .range(offset, offset + limit - 1);

        if (error) {
            console.error("❌ Gagal mengambil data:", error.message);
            break;
        }

        if (!articles || articles.length === 0) {
            console.log("\n🎉 SELASAI! Semua gambar Cloudinary berhasil diproses.");
            break;
        }

        for (const article of articles) {
            console.log(`\nMemproses: "${article.title}"`);
            try {
                // Fetch image
                const res = await fetch(article.featured_image, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
                });
                
                if (!res.ok) {
                    console.error(`  ❌ Gagal mengunduh gambar (Status ${res.status}). Melewati...`);
                    continue;
                }

                const arrayBuffer = await res.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                const contentType = res.headers.get('content-type') || 'image/jpeg';
                const fileExt = contentType.split('/')[1] || 'jpg';
                const fileName = `imports/${Date.now()}-${uuidv4()}.${fileExt}`;

                // Upload to R2
                await s3Client.send(new PutObjectCommand({
                    Bucket: R2_BUCKET_NAME,
                    Key: fileName,
                    Body: buffer,
                    ContentType: contentType,
                }));

                const cleanUrl = R2_PUBLIC_URL.endsWith('/') ? R2_PUBLIC_URL.slice(0, -1) : R2_PUBLIC_URL;
                const newUrl = `${cleanUrl}/${fileName}`;

                // Update database
                const { error: updateErr } = await supabase
                    .from('articles')
                    .update({ featured_image: newUrl })
                    .eq('id', article.id);

                if (updateErr) throw updateErr;

                console.log(`  ✅ Sukses! URL baru: ${newUrl}`);
                totalMigrated++;

            } catch (err) {
                console.error(`  ❌ Error: ${err.message}`);
            }
        }
        
        // Kita tidak menambah offset jika artikel diupdate, 
        // karena artikel yang diupdate tidak akan masuk lagi di query like '%res.cloudinary.com%'.
        // Tetapi untuk artikel yang GAGAL (dilewati), mereka akan tetap masuk query. 
        // Jadi kita hanya perlu offset = offset + (jumlah artikel yang GAGAL di batch ini).
        // Cara termudahnya adalah mengecek artikel mana yang masih menggunakan Cloudinary setelah batch ini.
        // Untuk amannya di script ini kita jalan berulang-ulang tanpa memedulikan offset,
        // namun untuk artikel yang selalu gagal (401), kita ubah URL-nya di DB agar tidak infinite loop.
        
        for (const article of articles) {
            // Cek apakah url masih res.cloudinary.com (berarti tadi gagal)
            const { data: check } = await supabase.from('articles').select('featured_image').eq('id', article.id).single();
            if (check && check.featured_image.includes('res.cloudinary.com')) {
                console.log(`  ⚠️ Menandai gambar ini sebagai gagal agar tidak di-loop terus...`);
                await supabase.from('articles').update({ featured_image: article.featured_image.replace('res.cloudinary.com', 'failed.cloudinary.com') }).eq('id', article.id);
            }
        }
    }
    
    console.log(`\nTotal berhasil dipindahkan: ${totalMigrated} artikel.`);
}

migrateAll();
