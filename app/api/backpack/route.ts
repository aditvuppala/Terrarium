import { jsonError, jsonOk } from "@/lib/api";
import { BackpackResponseSchema } from "@/lib/schemas";

/** POST multipart/form-data with an `image` field (schedule screenshot). */
export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError(400, "Expected multipart/form-data with an `image` field");
  }
  const image = form.get("image");
  if (!(image instanceof File) || !image.type.startsWith("image/")) {
    return jsonError(400, "`image` must be an image file");
  }

  return jsonOk(BackpackResponseSchema, { courses: [], warnings: ["Not implemented"] });
}
