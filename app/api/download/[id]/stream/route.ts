import { s3Hot, s3Cold, HOT_BUCKET, COLD_BUCKET } from "@/services/s3.service";
import { DeleteObjectsCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";
import { sendDownloadNotificationEmail } from "@/services/mail.service";
import { ZipDeflate, Zip } from "fflate";
import { PassThrough, Readable } from "node:stream";
import os from "node:os";

const ARCHIVE_TYPE = os.platform() === "win32" ? "zip" : "tar";

const getFileData = async (folderId: string, fileId: string) => {
  const key = `${folderId}/${fileId}`;
  try {
    const url = await s3Hot.send(new GetObjectCommand({
      Bucket: HOT_BUCKET,
      Key: key,
    }));

    return url;
  } catch (err: any) {
    if (err?.name !== "NotFound" && err?.name !== "NoSuchKey") {
      throw err;
    }
  }

  try {
    const url = await s3Cold.send(new GetObjectCommand({
      Bucket: COLD_BUCKET,
      Key: key,
    }));

    return url;
  } catch (err: any) {
    if (err?.name !== "NotFound" && err?.name !== "NoSuchKey") {
      throw err;
    }
  }

  return null;
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const password = searchParams.get("password") || ""
    const folderId = (await params).id
    const fileId = searchParams.get("fileId")
    const allFiles = searchParams.get("allFiles") === "true"

    // Multiple files as ZIP
    if (allFiles) {
      try {
        const files = await prisma.files.findMany({
          where: { folder_id: folderId },
          select: { id: true, folder_id: true, password_hash: true, filename: true, size: true, email_sender: true, max_downloads: true },
        });

        if (files.length === 0) {
          return Response.json({ error: "No files found" }, { status: 404 });
        }

        const hasPassword = files.some(f => f.password_hash);
        if (hasPassword) {
          if (!password) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }

          let isPasswordValid = false;
          for (const file of files) {
            if (file.password_hash) {
              isPasswordValid = await bcrypt.compare(password, file.password_hash);
              if (isPasswordValid) break;
            }
          }

          if (!isPasswordValid) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }
        }

        const passThrough = new PassThrough();
        const webStream = Readable.toWeb(passThrough) as ReadableStream<Uint8Array>;

        const response = new Response(webStream, {
          headers: {
            "Content-Type": `application/${ARCHIVE_TYPE}`,
            "Content-Disposition": `attachment; filename="${folderId}.${ARCHIVE_TYPE}"`,
          },
        });

        (async () => {
          const zip = new Zip((err, data, final) => {
            if (err) {
              passThrough.destroy(err);
              return;
            }
            passThrough.write(data);
            if (final) passThrough.end();
          });

          for (const file of files) {
            try {
              const fileData = await getFileData(folderId, file.id);
              if (fileData?.Body) {
                const deflate = new ZipDeflate(file.filename, { level: 9 });
                zip.add(deflate);

                const nodeStream = Readable.fromWeb(
                  await fileData.Body.transformToWebStream() as any
                );

                await new Promise<void>((resolve, reject) => {
                  nodeStream.on("data", (chunk: Buffer) => {
                    deflate.push(chunk);
                  });
                  nodeStream.on("end", () => {
                    deflate.push(new Uint8Array(0), true);
                    resolve();
                  });
                  nodeStream.on("error", reject);
                });
              }
            } catch (err) {
              console.error(`Error adding ${file.filename}:`, err);
              passThrough.destroy(err as Error);
              return;
            }
          }

          zip.end();

          for (const file of files) {
            await prisma.files.update({
              where: { id: file.id },
              data: { download_count: { increment: 1 } },
            }).catch(console.error);

            if (file.max_downloads && file.max_downloads - 1 <= 0) {
              await s3Hot.send(new DeleteObjectsCommand({
                Bucket: HOT_BUCKET,
                Delete: { Objects: [{ Key: `${folderId}/${file.id}` }] },
              })).catch(() => { });
            }

            if (file.email_sender) {
              await sendDownloadNotificationEmail(file.email_sender, folderId).catch(console.error);
            }
          }
        })();

        return response;
      } catch (error) {
        console.error(error);
        return Response.json(
          { error: error instanceof Error ? error.message : "Internal Server Error" },
          { status: 500 }
        );
      }
    }


    // Single file
    if (!fileId) {
      return Response.json({ error: "File ID required" }, { status: 400 });
    }

    let file;
    try {
      file = await prisma.files.findUnique({
        where: { id: fileId },
        select: { folder_id: true, password_hash: true, filename: true, size: true, email_sender: true, max_downloads: true },
      });

      if (!file) {
        return Response.json({ error: "File not found" }, { status: 404 });
      }

      if (file.folder_id !== folderId) {
        return Response.json({ error: "File not found" }, { status: 404 });
      }

      if (file.password_hash) {
        if (!password) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const isPasswordValid = await bcrypt.compare(password, file.password_hash);
        if (!isPasswordValid) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === "NoSuchKey") {
        return Response.json({ error: "File not found" }, { status: 404 });
      }
      throw error;
    }

    const metadata: { filename?: string; contentType?: string; maxDownloads?: string; email_sender?: string, size?: string } = {
      filename: file.filename,
      contentType: "application/octet-stream",
      maxDownloads: file.max_downloads?.toString(),
      email_sender: file.email_sender || undefined,
      size: file.size?.toString() || undefined,
    };

    if (!metadata) {
      return Response.json({ error: "File metadata not found" }, { status: 404 });
    }

    const fileResponse = await getFileData(folderId, fileId);

    if (!fileResponse) {
      return Response.json({ error: "File not found" }, { status: 404 });
    }

    if (metadata.maxDownloads) {
      const maxDownloads = Number.parseInt(metadata.maxDownloads);
      if (Number.isNaN(maxDownloads) || maxDownloads <= 0) {
        return Response.json({ error: "Invalid max downloads value" }, { status: 500 });
      }

      const newMaxDownloads = maxDownloads - 1;

      if (newMaxDownloads === 0) {
        await s3Hot.send(new DeleteObjectsCommand({
          Bucket: HOT_BUCKET,
          Delete: {
            Objects: [
              { Key: `${folderId}/${fileId}` },
            ],
          },
        }));
      }
    }

    await prisma.files.update({
      where: { id: fileId },
      data: {
        download_count: { increment: 1 },
      },
    }).catch(console.error);
    if (metadata.email_sender)
      await sendDownloadNotificationEmail(metadata.email_sender || "", folderId);

    return new Response(fileResponse.Body?.transformToWebStream(), {
      headers: {
        "Content-Type": metadata.contentType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(metadata.filename || "download")}"`,
        ...(metadata.size && { "Content-Length": metadata.size }),
      },
    })
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
