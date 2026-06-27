import { Request, Response, NextFunction } from "express";
import { adminAuth } from "../lib/firebase-admin.ts";
import { db } from "../db/index.ts";
import { users } from "../db/schema.ts";
import { eq } from "drizzle-orm";

export interface AuthRequest extends Request {
  user?: {
    id: number;
    uid: string;
    email: string;
    bizName: string | null;
  };
}

export async function getOrCreateUser(uid: string, email: string, defaultBizName?: string) {
  try {
    const result = await db.insert(users)
      .values({
        uid,
        email: email || `${uid.slice(0, 8)}@demo.com`,
        bizName: defaultBizName || "Mi Emprendimiento",
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: email || `${uid.slice(0, 8)}@demo.com`,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error("Error in getOrCreateUser upsert:", error);
    try {
      const existing = await db.select().from(users).where(eq(users.uid, uid));
      if (existing.length > 0) {
        return existing[0];
      }
    } catch (selError) {
      console.error("Error in selecting user fallback:", selError);
    }
    throw error;
  }
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing token" });
  }

  const token = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    // Synchronize to relational user table
    const dbUser = await getOrCreateUser(
      decodedToken.uid,
      decodedToken.email || "",
      (decodedToken as any).bizName
    );

    req.user = {
      id: dbUser.id,
      uid: dbUser.uid,
      email: dbUser.email,
      bizName: dbUser.bizName,
    };
    next();
  } catch (error) {
    console.error("Error verifying Firebase ID token:", error);
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};
