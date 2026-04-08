import { makeApiRoute } from "@/lib/apiRoute";
import { parseVolsCSV } from "@/lib/parsers/parseVols";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const GET = makeApiRoute("VOLS", parseVolsCSV);
