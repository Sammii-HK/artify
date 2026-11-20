export interface SceneRequest {
  key: string;
  label: string;
  scene?: string;
  customPrompt?: string;
}
export function sceneRequests(
  keys: string[],
  customPrompt: string,
  labels: Record<string, string>,
): SceneRequest[] {
  if (keys.length)
    return keys.map((key) => ({ key, label: labels[key] ?? key, scene: key }));
  return customPrompt.trim()
    ? [
        {
          key: "custom",
          label: "Custom scene",
          customPrompt: customPrompt.trim(),
        },
      ]
    : [];
}
export function resultImage(value: unknown): string {
  const image = (
    value as { data?: Array<{ url?: unknown; b64_json?: unknown }> }
  )?.data?.[0];
  if (typeof image?.url === "string" && /^https?:\/\//.test(image.url))
    return image.url;
  if (typeof image?.b64_json === "string" && image.b64_json.length)
    return `data:image/png;base64,${image.b64_json}`;
  throw new Error("The provider returned no usable image.");
}
export function validateUpload(file: {
  size: number;
  type: string;
  name: string;
}) {
  if (file.size > 20 * 1024 * 1024)
    throw new Error("Choose an image smaller than 20 MB.");
  if (!file.type.startsWith("image/") && !/\.(heic|heif)$/i.test(file.name))
    throw new Error("Choose a JPG, PNG, WebP or HEIC image.");
}
