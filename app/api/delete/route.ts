import prisma from "@/lib/prisma"
import { COLD_BUCKET, HOT_BUCKET, s3Cold, s3Hot } from "@/services/s3.service"
import { DeleteObjectCommand } from "@aws-sdk/client-s3"
import { getSession } from "@/lib/auth"

export async function DELETE(request: Request) {
  try {
    const { folderId, fileId } = await request.json()

    if (!folderId || !fileId) {
      return new Response(JSON.stringify({ error: 'Missing folderId or fileId' }), { status: 400 })
    }

    const session = await getSession()
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const file = await prisma.files.findFirst({
      where: {
        id: fileId,
        folder_id: folderId,
        user_id: session.userId,
      }
    })
    if (!file) {
      return new Response(JSON.stringify({ error: 'File not found' }), { status: 404 })
    }

    await s3Hot.send(
      new DeleteObjectCommand({
        Bucket: HOT_BUCKET,
        Key: folderId + "/" + fileId,
      })
    )

    await s3Cold.send(
      new DeleteObjectCommand({
        Bucket: COLD_BUCKET,
        Key: folderId + "/" + fileId,
      })
    )

    await prisma.files.delete({
      where: {
        id: fileId
      }
    })

    return new Response(JSON.stringify({ message: 'File deleted successfully' }), { status: 200 })
  } catch (error) {
    console.error('Error deleting file:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
  }
}
