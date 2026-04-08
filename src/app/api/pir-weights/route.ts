import { makeApiRoute } from "@/lib/apiRoute";
import { parsePirWeightsCSV } from "@/lib/parsers/parsePirWeights";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const GET = makeApiRoute("PIR_WEIGHTS", parsePirWeightsCSV);
