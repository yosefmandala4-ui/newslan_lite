'use server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { v4 as uuidv4 } from 'uuid'

export async function migrateImageToR2(imageUrl: string) {
    try {
        // 1. Fetch the image from WordPress server-side
        const response = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        })
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText} (${response.status}) - ${imageUrl}`)

        const arrayBuffer = await response.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const contentType = response.headers.get('content-type') || 'image/jpeg'

        // 2. Upload to R2
        const accountId = process.env.R2_ACCOUNT_ID
        const accessKeyId = process.env.R2_ACCESS_KEY_ID
        const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
        const bucketName = process.env.R2_BUCKET_NAME
        const publicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL

        if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicUrl) {
             throw new Error('R2 credentials missing in .env.local.')
        }

        const s3Client = new S3Client({
            region: 'auto',
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId,
                secretAccessKey,
            }
        })

        const fileExtension = contentType.split('/')[1] || 'jpg'
        const fileName = `imports/${Date.now()}-${uuidv4()}.${fileExtension}`

        await s3Client.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: fileName,
            Body: buffer,
            ContentType: contentType,
        }))

        const cleanPublicUrl = publicUrl.endsWith('/') ? publicUrl.slice(0, -1) : publicUrl
        return `${cleanPublicUrl}/${fileName}`
    } catch (error: any) {
        console.error('Server-side Image Migration Error:', error)
        throw error
    }
}
