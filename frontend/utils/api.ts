import { Linking, Platform } from "react-native";

export const BASE_URL = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`;

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiRequest(
  path: string,
  options: { method?: string; body?: any; token?: string | null } = {}
) {
  const { method = "GET", body, token } = options;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }

  if (!res.ok) {
    const message = data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
    throw new ApiError(message, res.status);
  }
  return data;
}

export async function downloadCsv(
  path: string,
  filename: string,
  token?: string | null
): Promise<{ success: boolean; data?: string }> {
  const separator = path.includes("?") ? "&" : "?";
  const downloadUrl = `${BASE_URL}${path}${separator}token=${encodeURIComponent(token || "")}`;

  // Di Android / iOS: Buka tautan via Linking agar browser bawaan perangkat (Chrome/Safari)
  // langsung mengunduh file secara fisik ke folder "Unduhan / Downloads" HP
  if (Platform.OS !== "web") {
    try {
      await Linking.openURL(downloadUrl);
      return { success: true };
    } catch (e: any) {
      throw new ApiError(e.message || "Gagal membuka pengunduhan file di perangkat", 500);
    }
  }

  // Khusus Web Browser desktop:
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method: "GET",
    headers,
  });

  if (!res.ok) {
    throw new ApiError("Gagal mengunduh file", res.status);
  }

  const csvText = await res.text();
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
  return { success: true, data: csvText };
}
