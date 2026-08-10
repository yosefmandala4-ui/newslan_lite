import { createClient } from './supabase/client'
import imageCompression from 'browser-image-compression'

export async function uploadImage(file: File) {
    // Compress Image
    const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: 'image/webp'
    }

    try {
        const compressedFile = await imageCompression(file, options)

        const formData = new FormData()
        formData.append('file', compressedFile)
        formData.append('folder', 'images')

        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
        })

        const data = await response.json()

        if (!response.ok) {
            throw new Error(data.error || 'Error uploading to R2')
        }

        // Return the secure URL
        return data.secure_url
    } catch (error: any) {
        console.error('Upload/Compression Error:', error)
        throw error
    }
}

export async function uploadImageFromUrl(url: string) {
    try {
        const response = await fetch(url)
        if (!response.ok) throw new Error('Failed to fetch image from URL')

        const blob = await response.blob()
        const fileName = url.split('/').pop() || 'image.jpg'
        const file = new File([blob], fileName, { type: blob.type })

        return await uploadImage(file)
    } catch (error) {
        console.error('Error in uploadImageFromUrl:', error)
        throw error
    }
}
