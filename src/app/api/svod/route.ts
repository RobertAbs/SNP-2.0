import { makeApiRoute } from "@/lib/apiRoute";
import { parseSvodCSV } from "@/lib/parsers/parseSvod";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const GET = makeApiRoute("SVOD", parseSvodCSV);
