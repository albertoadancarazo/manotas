export const generateUUID = () => crypto.randomUUID();

export const generateToken = (bytes = 32) => {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
};

export const encodeQRPayload = (uuid: string, role: "technician" | "customer" | "insurer") =>
  JSON.stringify({ v: 1, u: uuid, r: role });

export const decodeQRPayload = (data: string) => {
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
};