"use server"

import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function verifySharePassword(projectId: string, password: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { sharePassword: true, isShared: true }
  })

  if (!project || !project.isShared || !project.sharePassword) {
    return { error: "Invalid project or not shared" }
  }

  const isValid = await bcrypt.compare(password, project.sharePassword)

  if (isValid) {
    // Set a cookie that expires in 24 hours
    (await cookies()).set(`share_auth_${projectId}`, "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24, // 24 hours
      path: `/share/${projectId}`,
    })
    return { success: true }
  }

  return { error: "Incorrect password" }
}
