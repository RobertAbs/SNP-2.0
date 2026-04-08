import { makeApiRoute } from "@/lib/apiRoute";
import { parseSmrCSV } from "@/lib/parsers/parseSmr";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const GET = makeApiRoute("SMR", parseSmrCSV);
