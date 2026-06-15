import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const services = await prisma.services.findMany({
      select: {
        id: true,
        name: true,
        quota: true,
        created_at: true,
        status: true,
        _count: {
          select: {
            files: true,
            secrets: true,
          },
        },
      },
    })
    services.forEach(async (service: any) => {
      service.files = service._count?.files || 0;
      service.secrets = service._count?.secrets || 0;
      service.quota = Number(service.quota);
      delete service._count;

      service.totalFilesSize = await prisma.files.aggregate({
        where: {
          service_id: {
            in: services.map((service) => service.id),
          },
        },
        _sum: {
          size: true,
        },
      });
    });

    return new Response(JSON.stringify(services), {
      status: 200,
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
    });
  }
}
