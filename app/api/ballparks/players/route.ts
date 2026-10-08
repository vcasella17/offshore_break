import { NextResponse } from "next/server";

/*
 * Add verified action-photo URLs here, keyed by MLB player ID.
 * Example:
 * 660271: "https://your-image-host.com/verified-action-photo.jpg",
 */
const ACTION_PHOTOS: Record<number, string> = {};

function emptyResponse() {
  return NextResponse.json({
    src: "",
    kind: "none",
    credit: "",
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const playerId = Number(id);

  if (!Number.isInteger(playerId) || playerId <= 0) {
    return NextResponse.json(
      { src: "", kind: "none", credit: "" },
      { status: 400 }
    );
  }

  const src = ACTION_PHOTOS[playerId];

  if (!src) {
    return emptyResponse();
  }

  return NextResponse.json({
    src,
    kind: "action",
    credit: "Photo: MLB",
  });
}