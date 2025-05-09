import { currentUser, auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { Liveblocks } from "@liveblocks/node";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
// console.log("Convex URL:", process.env.NEXT_PUBLIC_CONVEX_URL);

console.log("Clerk Publishable Key:", process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

export async function POST(req: NextRequest) {
  const authorization = await auth();
  const user = await currentUser();

  if (!authorization || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { room } = await req.json();
  const board = await convex.query(api.board.get, { id: room });

  if (board?.orgId !== authorization.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const userInfo = {
    name: user.firstName || "Teammate",
    picture: user.imageUrl,
  };

  const session = liveblocks.prepareSession(user.id, { userInfo });
  if (room) {
    session.allow(room, session.FULL_ACCESS);
  }

  const { status, body } = await session.authorize();

  return new NextResponse(body, { status });
}
