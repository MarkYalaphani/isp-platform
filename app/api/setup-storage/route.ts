import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const { error } = await supabase.storage.createBucket('athlete-photos', {
    public: true,
    fileSizeLimit: 5242880,
    allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
  });

  if (error && error.message !== 'The resource already exists') {
    return NextResponse.json({ ok: false, error: error.message });
  }

  return NextResponse.json({
    ok: true,
    message: error ? '✓ Bucket มีอยู่แล้ว พร้อมใช้งาน' : '✓ สร้าง Storage Bucket สำเร็จ! ตอนนี้ upload รูปได้แล้ว',
  });
}
