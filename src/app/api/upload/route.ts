import { NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { v4 as uuidv4 } from 'uuid'

export const runtime = 'edge'

export async function POST(request: Request) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File | null
        const folder = formData.get('folder') as string || 'uploads'

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        const accountId = process.env.R2_ACCOUNT_ID
        const accessKeyId = process.env.R2_ACCESS_KEY_ID
        const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
        const bucketName = process.env.R2_BUCKET_NAME
        const publicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL

        if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicUrl) {
            return NextResponse.json({ error: 'R2 Storage credentials are not configured' }, { status: 500 })
        }

        const s3Client = new S3Client({
            region: 'auto',
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId,
                secretAccessKey,
            }
        })

        const arrayBuffer = await file.arrayBuffer()
        const bodyData = new Uint8Array(arrayBuffer)
        const fileExtension = file.name.split('.').pop() || 'webp'
        
        // Generate a unique filename using timestamp and uuid to prevent collisions
        const fileName = `${folder}/${Date.now()}-${uuidv4()}.${fileExtension}`

        await s3Client.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: fileName,
            Body: bodyData,
            ContentType: file.type,
        }))

        // Return the public URL
        // Ensure publicUrl doesn't end with a slash before appending
        const cleanPublicUrl = publicUrl.endsWith('/') ? publicUrl.slice(0, -1) : publicUrl
        const secure_url = `${cleanPublicUrl}/${fileName}`
        
        return NextResponse.json({ secure_url })
    } catch (error: any) {
        console.error('Error uploading to R2:', error)
        return NextResponse.json({ error: error.message || 'Error uploading file' }, { status: 500 })
    }
}
