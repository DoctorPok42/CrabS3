import jsonwebtoken from "jsonwebtoken";
import prisma from "./prisma";

export const createTokenService = async (name: string) => {
  try {
    const service = await prisma.services.create({
      data: {
        name,
        token: "",
      },
    });

    const token = jsonwebtoken.sign(
      {
        id: service.id,
        name: service.name,
      },
      process.env["JWT_SECRET"] as string,
      {
        audience: "service",
      }
    );

    const response = await prisma.services.update({
      where: {
        id: service.id,
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
