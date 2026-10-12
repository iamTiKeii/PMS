import { POST as revealPasswordHandler } from "../reveal-password/route";

export const dynamic = "force-dynamic";

// POST /api/vault/accounts/[id]/reveal - Đồng bộ với /reveal-password
export const POST = revealPasswordHandler;
