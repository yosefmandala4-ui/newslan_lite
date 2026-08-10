/**
 * Formats a number or string into Indonesian Rupiah (IDR) format.
 * Handles single values and ranges (e.g., "10000 - 20000").
 */
export function formatRupiah(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') {
        return 'Hubungi untuk harga'
    }

    const strValue = String(value).trim()

    // If it already seems formatted with Rp, just return it
    if (strValue.toLowerCase().startsWith('rp')) {
        return strValue
    }

    // Check if it's a range (e.g., "10000 - 20000" or "10000-20000")
    if (strValue.includes('-')) {
        const parts = strValue.split('-').map(p => p.trim())
        return parts.map(p => formatSingleValue(p)).join(' - ')
    }

    return formatSingleValue(strValue)
}

function formatSingleValue(val: string): string {
    // Remove any non-numeric characters except for the ones we might want to keep
    const numericValue = val.replace(/[^0-9]/g, '')

    if (numericValue === '') {
        return val // Return original if no numbers found (e.g. "Gratis")
    }

    const amount = parseInt(numericValue, 10)

    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount)
}

/**
 * Optimizes image URLs. Previously used for Cloudinary, now passes through R2 URLs.
 * If you enable Cloudflare Image Resizing, you can format the URL here.
 */
export function optimizeCloudinaryUrl(
    url: string,
    options?: { width?: number; quality?: string }
): string {
    if (!url) return url
    
    // If it's still a Cloudinary URL, we can strip the transformations or apply them.
    // Since we are migrating, we will just return the URL as is.
    // If you enable Cloudflare Image Resizing in the future, you can implement the resizing logic here.
    // Example: return `https://your-domain.com/cdn-cgi/image/width=${options?.width || 'auto'},quality=${options?.quality || 'auto'}/${url}`

    return url
}
