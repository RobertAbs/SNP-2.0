import { makeApiRoute } from "@/lib/apiRoute";
import { parseGuCSV } from "@/lib/parsers/parseGU";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const GET = makeApiRoute("GU", parseGuCSV);
