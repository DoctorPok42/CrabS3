import jsonwebtoken from "jsonwebtoken";
import prisma from "./prisma";

export const createTokenService = async (id: number, name: string, maxDuration?: number, tokenOnly: boolean = false) => {
  try {
    const token = jsonwebtoken.sign(
      {
        id: id,
        name: name,
      },
      process.env["JWT_SECRET"] as string,
      {
        audience: "service",
        algorithm: "HS256",
        ...(maxDuration ? { expiresIn: maxDuration } : {}),
      }
    );

    if (tokenOnly) {
      return token;
    }

    const response = await prisma.services.update({
      where: {
        id,
      },
      data: {
        token,
      },
      include: {
        files: true,
        secrets: true,
      }
    });

    return {
      id: response.id,
      name: response.name,
      token: response.token,
      created_at: response.created_at,
      quota: response.quota,
      files: response.files,
      secrets: response.secrets,
      status: response.status,
    };
  } catch (error) {
    console.error(error);
    throw new Error("Failed to create token");
  }
}

export const checkTokenService = async (token: string) => {
  try {
    if (!token) return null;

    const decoded = jsonwebtoken.verify(
      token,
      process.env["JWT_SECRET"] as string,
      {
        audience: "service",
      }
    ) as { id: string; name: string };
    return decoded;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export const getServiceByUUID = async (uuid: string) => {
  try {
    const service = await prisma.services.findUnique({
      where: {
        uuid,
      },
      select: {
        uuid: true,
        name: true,
        image: true,
        status: true,
        created_at: true,
        folder_id: true,
      }
    });
    return service;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export const deleteService = async (id: number) => {
  try {
    const response = await prisma.services.delete({
      where: {
        id,
      },
    });
    return response;
  } catch (error) {
    console.error(error);
    return null;
  }
}
