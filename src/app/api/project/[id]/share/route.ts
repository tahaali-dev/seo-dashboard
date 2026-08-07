import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { auth } from "@/auth"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const { isShared, password, shareConfig } = await req.json()

    if (isShared) {
      const data: any = { isShared: true };
      if (password) {
        data.sharePassword = await bcrypt.hash(password, 10);
      }
      if (shareConfig !== undefined) {
        data.shareConfig = typeof shareConfig === 'string' ? shareConfig : JSON.stringify(shareConfig);
      }
      
      await prisma.project.update({
        where: { id },
        data
      })
    } else if (isShared === false) {
      await prisma.project.update({
        where: { id },
        data: {
          isShared: false,
          sharePassword: null,
          shareConfig: null
        }
      })
    } else {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating share settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
