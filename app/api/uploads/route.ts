import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/server/auth/config'
import { prisma } from '@/server/db/client'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'crypto'

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const MAX_SIZE_MB = 10

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { fileName, contentType, scheduleId, type } = await req.json()

  if (!ALLOWED_TYPES.includes(contentType)) {
    return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })
  }

  const ext = fileName.split('.').pop()
  const key = `${type}/${session.user.id}/${randomUUID()}.${ext}`

  // Generate presigned URL (valid for 5 minutes)
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    ContentType: contentType,
    Metadata: {
      uploadedBy: session.user.id,
      scheduleId: scheduleId ?? '',
    },
  })

  const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 300 })
  const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`

  // If it's a completion photo, pre-create the DB record
  if (type === 'completion' && scheduleId) {
    await prisma.completionPhoto.create({
      data: {
        scheduleId,
        uploadedBy: session.user.id,
        url: publicUrl,
        key,
      },
    })
  }

  return NextResponse.json({ presignedUrl, publicUrl, key })
}
