import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'



// Subscribe page dihapus dari versi lite
// Route ini hanya placeholder jika ada yang hit endpoint ini
export async function POST(req: Request) {
    return NextResponse.json({ error: 'Subscribe feature not available in lite version' }, { status: 404 })
}
