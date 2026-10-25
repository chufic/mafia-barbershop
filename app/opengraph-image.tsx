import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const alt = "Барбершоп «Мафия» — Тюмень, Широтная 124";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function loadFont(file: string): Promise<ArrayBuffer> {
  const buffer = await readFile(path.join(process.cwd(), "node_modules", file));
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as unknown as ArrayBuffer;
}

export default async function OpengraphImage() {
  const [oswald, inter] = await Promise.all([
    loadFont("@fontsource/oswald/files/oswald-cyrillic-700-normal.woff"),
    loadFont("@fontsource/inter/files/inter-cyrillic-400-normal.woff"),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0A0A0B",
          color: "#F2F0EC",
          padding: "64px 72px",
          position: "relative",
          fontFamily: "Inter",
        }}
      >
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              "linear-gradient(135deg, rgba(201,162,39,0.22) 0%, rgba(10,10,11,0) 55%), radial-gradient(circle at 85% 15%, rgba(201,162,39,0.16), rgba(10,10,11,0) 45%)",
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "relative",
          }}
        >
          <span
            style={{
              fontFamily: "Oswald",
              fontSize: 24,
              letterSpacing: 12,
              color: "#C9A227",
            }}
          >
            BARBERSHOP
          </span>
          <span style={{ fontSize: 22, color: "#A1A0A6" }}>Тюмень · Широтная, 124</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", position: "relative" }}>
          <span style={{ fontFamily: "Oswald", fontSize: 148, lineHeight: 0.95, letterSpacing: 4 }}>
            МАФИЯ
          </span>
          <span style={{ marginTop: 22, fontSize: 32, color: "#A1A0A6" }}>
            Стрижки · борода · бритьё
          </span>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            position: "relative",
          }}
        >
          <span style={{ fontSize: 24, color: "#F2F0EC" }}>Ежедневно 10:00–21:00</span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              background: "rgba(201,162,39,0.12)",
              border: "1px solid rgba(201,162,39,0.4)",
              borderRadius: 18,
              padding: "14px 24px",
            }}
          >
            <span style={{ fontFamily: "Oswald", fontSize: 40, color: "#E0B93F" }}>4,9</span>
            <span style={{ fontSize: 20, color: "#A1A0A6" }}>77 отзывов на 2ГИС</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Oswald", data: oswald, weight: 700, style: "normal" },
        { name: "Inter", data: inter, weight: 400, style: "normal" },
      ],
    },
  );
}
