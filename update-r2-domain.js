const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ ERROR: Kredensial Supabase di .env.local belum lengkap!");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const OLD_URL = "pub-8ccc1f5bcc3545b7a43e239907bd6a4a.r2.dev";
const NEW_URL = "media.newslan.id";

async function updateDatabaseUrls() {
    console.log("🚀 Memulai proses penggantian URL gambar di database...");

    // 1. Update Articles (featured_image)
    console.log("\nMemeriksa tabel 'articles'...");
    const { data: articles, error: errArt } = await supabase
        .from('articles')
        .select('id, featured_image')
        .like('featured_image', `%${OLD_URL}%`);

    if (articles && articles.length > 0) {
        console.log(`Ditemukan ${articles.length} artikel dengan URL lama. Memperbarui...`);
        let countArt = 0;
        for (const article of articles) {
            const newImage = article.featured_image.replace(OLD_URL, NEW_URL);
            await supabase.from('articles').update({ featured_image: newImage }).eq('id', article.id);
            countArt++;
        }
        console.log(`✅ Berhasil memperbarui ${countArt} artikel.`);
    } else {
        console.log("✅ Tidak ada artikel yang menggunakan URL lama.");
    }

    // 2. Update Banners (image_url)
    console.log("\nMemeriksa tabel 'banners'...");
    const { data: banners, error: errBan } = await supabase
        .from('banners')
        .select('id, image_url')
        .like('image_url', `%${OLD_URL}%`);

    if (banners && banners.length > 0) {
        console.log(`Ditemukan ${banners.length} banner dengan URL lama. Memperbarui...`);
        let countBan = 0;
        for (const banner of banners) {
            const newImage = banner.image_url.replace(OLD_URL, NEW_URL);
            await supabase.from('banners').update({ image_url: newImage }).eq('id', banner.id);
            countBan++;
        }
        console.log(`✅ Berhasil memperbarui ${countBan} banner.`);
    } else {
        console.log("✅ Tidak ada banner yang menggunakan URL lama.");
    }

    // 3. Update Site Settings (setting_value)
    console.log("\nMemeriksa tabel 'site_settings'...");
    const { data: settings, error: errSet } = await supabase
        .from('site_settings')
        .select('id, setting_value')
        .like('setting_value', `%${OLD_URL}%`);

    if (settings && settings.length > 0) {
        console.log(`Ditemukan ${settings.length} setting dengan URL lama. Memperbarui...`);
        let countSet = 0;
        for (const setting of settings) {
            const newValue = setting.setting_value.replace(OLD_URL, NEW_URL);
            await supabase.from('site_settings').update({ setting_value: newValue }).eq('id', setting.id);
            countSet++;
        }
        console.log(`✅ Berhasil memperbarui ${countSet} setting.`);
    } else {
        console.log("✅ Tidak ada setting yang menggunakan URL lama.");
    }

    console.log("\n🎉 Selesai! Semua URL gambar lama sudah diganti ke media.newslan.id.");
}

updateDatabaseUrls();
