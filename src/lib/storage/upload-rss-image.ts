/**
 * Download image from URL and upload to R2 using the internal API endpoint
 */
export async function uploadRSSImageToR2(
    imageUrl: string,
    folder: string = 'rss-articles'
): Promise<string | null> {
    try {
        console.log('[R2 Upload] Uploading RSS image:', imageUrl.substring(0, 80))

        const response = await fetch(imageUrl)
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`)
        }

        const blob = await response.blob()
        const file = new File([blob], 'rss-image.jpg', { type: blob.type })

        const formData = new FormData()
        formData.append('file', file)
        formData.append('folder', folder)

        // Assuming this is called from a server environment, we might need to use absolute URL if fetch fails with relative URL
        // But since this might be run in a Cron job (Serverless function), relative fetch in Next.js 14+ works if it's hitting its own API route,
        // Wait, fetch to absolute URL is better in cron. We can use NEXT_PUBLIC_SITE_URL or request origin.
        // Actually, since this is server-side, it's safer to just import the uploadImage logic directly or use S3 client here.
        // But for simplicity, we'll hit our API endpoint if we have the domain.
        // Wait! In server actions or cron jobs, fetching an internal API route might fail if the absolute URL is unknown.
        // Let's implement direct S3 upload here to avoid API route overhead in server-side functions.
        
        const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')
        const { v4: uuidv4 } = await import('uuid')

        const accountId = process.env.R2_ACCOUNT_ID
        const accessKeyId = process.env.R2_ACCESS_KEY_ID
        const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
        const bucketName = process.env.R2_BUCKET_NAME
        const publicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL

        if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicUrl) {
            console.error('[R2 Upload] Missing credentials')
            return null
        }

        const s3Client = new S3Client({
            region: 'auto',
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId,
                secretAccessKey,
            }
        })

        const buffer = Buffer.from(await blob.arrayBuffer())
        const fileExtension = blob.type.split('/')[1] || 'jpg'
        const fileName = `${folder}/${Date.now()}-${uuidv4()}.${fileExtension}`

        await s3Client.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: fileName,
            Body: buffer,
            ContentType: blob.type,
        }))

        const cleanPublicUrl = publicUrl.endsWith('/') ? publicUrl.slice(0, -1) : publicUrl
        const secure_url = `${cleanPublicUrl}/${fileName}`
        
        console.log('[R2 Upload] ✅ Upload success:', secure_url)
        return secure_url

    } catch (error: any) {
        console.error('[R2 Upload] Upload failed:', error.message)
        // Return original URL as fallback
        console.warn('[R2 Upload] Using original URL as fallback')
        return imageUrl
    }
}
