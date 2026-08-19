import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { AwsClient } from 'aws4fetch'

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

        const accountId = process.env.R2_ACCOUNT_ID || "481216d261759cebfd2334794cecef53";
        const accessKeyId = process.env.R2_ACCESS_KEY_ID || "8fcb48f4f771d1c30a117d9622a83c86";
        const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "35c106b35b3c3fb47f7aa4388c10e6211b79939afb90bbbfed548188cb6bb26b";
        const bucketName = process.env.R2_BUCKET_NAME || "newslan-lite";
        // FORCING media.newslan.id so it doesn't accidentally use the old .dev url from Cloudflare settings
        const publicUrl = "https://media.newslan.id";

        if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicUrl) {
            console.error("Upload failed: Missing credentials");
            return NextResponse.json({ error: 'R2 Storage credentials are not configured in environment variables' }, { status: 500 })
        }

        console.log("Initializing AwsClient (aws4fetch)...");
        const aws = new AwsClient({
            accessKeyId: accessKeyId,
            secretAccessKey: secretAccessKey,
            service: 's3',
            region: 'auto',
        });

        console.log("Converting file to array buffer...");
        const arrayBuffer = await file.arrayBuffer()
        const bodyData = new Uint8Array(arrayBuffer)
        const fileExtension = file.name.split('.').pop() || 'webp'
        
        const fileName = `${folder}/${Date.now()}-${uuidv4()}.${fileExtension}`
        console.log("Uploading to bucket:", bucketName, "with key:", fileName);

        const url = new URL(`https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${fileName}`);
        
        const response = await aws.fetch(url.toString(), {
            method: 'PUT',
            body: bodyData,
            headers: {
                'Content-Type': file.type,
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`R2 Upload Failed (${response.status}): ${errorText}`);
        }

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
