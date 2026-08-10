const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; 
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    }
});

async function migrateExtras() {
    console.log("🚀 Memulai Migrasi Ekstra (Logo & Banners)...");
    
    // 1. MIGRASI BANNERS/ADS
    console.log("\n--- MIGRASI BANNERS ---");
    const { data: banners } = await supabase.from('banners').select('*').like('image_url', '%res.cloudinary.com%');
    
    if (banners && banners.length > 0) {
        for (const banner of banners) {
            console.log(`Memproses Banner: ${banner.title}`);
            try {
                const res = await fetch(banner.image_url, { headers: { 'User-Agent': 'Mozilla/5.0' }});
                if (!res.ok) throw new Error(`Status ${res.status}`);
                
                const arrayBuffer = await res.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                const fileName = `imports/banner-${Date.now()}-${uuidv4()}.webp`;
                
                await s3Client.send(new PutObjectCommand({
                    Bucket: R2_BUCKET_NAME, Key: fileName, Body: buffer, ContentType: 'image/webp',
                }));
                const newUrl = `${R2_PUBLIC_URL.replace(/\/$/, '')}/${fileName}`;
                
                await supabase.from('banners').update({ image_url: newUrl }).eq('id', banner.id);
                console.log(` ✅ Sukses: ${newUrl}`);
            } catch (err) {
                console.log(` ❌ Gagal: ${err.message}`);
            }
        }
    } else {
        console.log("✅ Tidak ada banner Cloudinary.");
    }
    
    // 2. MIGRASI SITE SETTINGS (LOGO dll)
    console.log("\n--- MIGRASI SITE SETTINGS (LOGO) ---");
    const { data: settings } = await supabase.from('site_settings').select('*').like('setting_value', '%res.cloudinary.com%');
    
    if (settings && settings.length > 0) {
        for (const setting of settings) {
            console.log(`Memproses Setting: ${setting.setting_key}`);
            try {
                const res = await fetch(setting.setting_value, { headers: { 'User-Agent': 'Mozilla/5.0' }});
                if (!res.ok) throw new Error(`Status ${res.status}`);
                
                const arrayBuffer = await res.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                const fileName = `imports/setting-${Date.now()}-${uuidv4()}.webp`;
                
                await s3Client.send(new PutObjectCommand({
                    Bucket: R2_BUCKET_NAME, Key: fileName, Body: buffer, ContentType: 'image/webp',
                }));
                const newUrl = `${R2_PUBLIC_URL.replace(/\/$/, '')}/${fileName}`;
                
                await supabase.from('site_settings').update({ setting_value: newUrl }).eq('id', setting.id);
                console.log(` ✅ Sukses: ${newUrl}`);
            } catch (err) {
                console.log(` ❌ Gagal: ${err.message}`);
            }
        }
    } else {
        console.log("✅ Tidak ada logo Cloudinary.");
    }
    
    console.log("\nSelesai!");
}

migrateExtras();
