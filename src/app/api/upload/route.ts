import { NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { v4 as uuidv4 } from 'uuid'

// Trigger new Cloudflare Pages deployment to load environment variables
export async function POST(request: Request) {
    console.log("=== START UPLOAD REQUEST ===");
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File | null
        const folder = formData.get('folder') as string || 'uploads'

        console.log("File received:", file?.name, "Size:", file?.size, "Type:", file?.type);

        if (!file) {
            console.error("Upload failed: No file provided");
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        const accountId = process.env.R2_ACCOUNT_ID
        const accessKeyId = process.env.R2_ACCESS_KEY_ID
        const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
        const bucketName = process.env.R2_BUCKET_NAME
        const publicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL

        console.log("Checking Environment Variables:");
        console.log("- R2_ACCOUNT_ID exists:", !!accountId);
        console.log("- R2_ACCESS_KEY_ID exists:", !!accessKeyId);
        console.log("- R2_SECRET_ACCESS_KEY exists:", !!secretAccessKey);
        console.log("- R2_BUCKET_NAME exists:", !!bucketName);
        console.log("- NEXT_PUBLIC_R2_PUBLIC_URL exists:", !!publicUrl);

        if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicUrl) {
            console.error("Upload failed: Missing credentials");
            return NextResponse.json({ error: 'R2 Storage credentials are not configured in environment variables' }, { status: 500 })
        }

        console.log("Initializing S3Client...");
        const s3Client = new S3Client({
            region: 'auto',
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId,
                secretAccessKey,
            }
        })

        console.log("Converting file to array buffer...");
        const arrayBuffer = await file.arrayBuffer()
        const bodyData = new Uint8Array(arrayBuffer)
        const fileExtension = file.name.split('.').pop() || 'webp'
        
        const fileName = `${folder}/${Date.now()}-${uuidv4()}.${fileExtension}`
        console.log("Uploading to bucket:", bucketName, "with key:", fileName);

        await s3Client.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: fileName,
            Body: bodyData,
            ContentType: file.type,
        }))

        const cleanPublicUrl = publicUrl.endsWith('/') ? publicUrl.slice(0, -1) : publicUrl
        const secure_url = `${cleanPublicUrl}/${fileName}`
        
        console.log("Upload successful! URL:", secure_url);
        return NextResponse.json({ secure_url })
    } catch (error: any) {
        console.error('=== UPLOAD CRASHED ===');
        console.error('Error Name:', error.name);
        console.error('Error Message:', error.message);
        console.error('Stack Trace:', error.stack);
        
        return NextResponse.json({ 
            error: error.message || 'Error uploading file',
            details: error.stack,
            type: error.name
        }, { status: 500 })
    }
}
