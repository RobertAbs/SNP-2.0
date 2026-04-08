import { makeApiRoute } from "@/lib/apiRoute";
import { parsePirPsdCSV } from "@/lib/parsers/parsePirPsd";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const GET = makeApiRoute("PIR_PSD", parsePirPsdCSV);
