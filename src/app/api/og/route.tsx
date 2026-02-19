import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Brand constants
// ---------------------------------------------------------------------------

const WIDTH = 1024;
const HEIGHT = 1024;

const C = {
  midnightPlum: "#4A3352",
  dustyRose: "#C4929E",
  warmCream: "#F5EDE3",
  softGold: "#D4AF73",
  lavender: "#B8A9C9",
  sage: "#A8B5A0",
} as const;

const WATERMARK = "@sammiispellbound";

// ---------------------------------------------------------------------------
// Font loading from @fontsource packages (cached at module level)
// ---------------------------------------------------------------------------

const cormorantBold = fs.readFileSync(
  path.join(process.cwd(), "node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-700-normal.woff"),
);
const interRegular = fs.readFileSync(
  path.join(process.cwd(), "node_modules/@fontsource/inter/files/inter-latin-400-normal.woff"),
);

// ---------------------------------------------------------------------------
// Template components
// ---------------------------------------------------------------------------

function GoldBorder() {
  return (
    <div
      style={{
        position: "absolute",
        top: 20,
        left: 20,
        right: 20,
        bottom: 20,
        border: `3px solid ${C.softGold}`,
        borderRadius: 12,
        display: "flex",
      }}
    />
  );
}

function InfoCard({ heading, body, footer }: { heading: string; body: string[]; footer?: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: WIDTH,
        height: HEIGHT,
        backgroundColor: C.warmCream,
        fontFamily: "Inter",
        position: "relative",
        padding: 80,
      }}
    >
      <GoldBorder />
      <div style={{ display: "flex", fontFamily: "Cormorant Garamond", fontSize: 52, fontWeight: 700, color: C.midnightPlum, textAlign: "center", marginBottom: 16 }}>
        {heading}
      </div>
      <div style={{ display: "flex", width: 160, height: 2, backgroundColor: C.softGold, marginTop: 12, marginBottom: 24 }} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, flex: 1 }}>
        {body.map((p, i) => (
          <div key={i} style={{ display: "flex", fontSize: 32, color: C.midnightPlum, textAlign: "center", lineHeight: 1.5 }}>
            {p}
          </div>
        ))}
      </div>
      {footer ? (
        <div style={{ display: "flex", fontFamily: "Cormorant Garamond", fontSize: 28, fontStyle: "italic", color: C.softGold, marginBottom: 40 }}>
          {footer}
        </div>
      ) : null}
      <div style={{ position: "absolute", bottom: 40, left: 0, right: 0, display: "flex", justifyContent: "center", fontFamily: "Inter", fontSize: 22, color: C.softGold }}>
        {WATERMARK}
      </div>
    </div>
  );
}

function ListCard({ heading, body, footer }: { heading: string; body: string[]; footer?: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: WIDTH,
        height: HEIGHT,
        backgroundColor: C.warmCream,
        fontFamily: "Inter",
        position: "relative",
        padding: 80,
      }}
    >
      <GoldBorder />
      <div style={{ display: "flex", justifyContent: "center", fontFamily: "Cormorant Garamond", fontSize: 52, fontWeight: 700, color: C.midnightPlum, marginBottom: 16 }}>
        {heading}
      </div>
      <div style={{ display: "flex", width: 160, height: 2, backgroundColor: C.softGold, marginTop: 12, marginBottom: 24, marginLeft: "auto", marginRight: "auto" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingLeft: 60, paddingRight: 40, flex: 1 }}>
        {body.map((item, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "row", gap: 12 }}>
            <div style={{ display: "flex", fontSize: 24, color: C.softGold }}>{"\u2726"}</div>
            <div style={{ display: "flex", fontSize: 30, color: C.midnightPlum, lineHeight: 1.4 }}>
              {item}
            </div>
          </div>
        ))}
      </div>
      {footer ? (
        <div style={{ display: "flex", justifyContent: "center", fontFamily: "Cormorant Garamond", fontSize: 28, fontStyle: "italic", color: C.softGold, marginBottom: 40 }}>
          {footer}
        </div>
      ) : null}
      <div style={{ position: "absolute", bottom: 40, left: 0, right: 0, display: "flex", justifyContent: "center", fontFamily: "Inter", fontSize: 22, color: C.softGold }}>
        {WATERMARK}
      </div>
    </div>
  );
}

function StepsCard({ heading, body, footer }: { heading: string; body: string[]; footer?: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: WIDTH,
        height: HEIGHT,
        backgroundColor: C.warmCream,
        fontFamily: "Inter",
        position: "relative",
        padding: 80,
      }}
    >
      <GoldBorder />
      <div style={{ display: "flex", justifyContent: "center", fontFamily: "Cormorant Garamond", fontSize: 52, fontWeight: 700, color: C.midnightPlum, marginBottom: 16 }}>
        {heading}
      </div>
      <div style={{ display: "flex", width: 160, height: 2, backgroundColor: C.softGold, marginTop: 12, marginBottom: 24, marginLeft: "auto", marginRight: "auto" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 18, paddingLeft: 50, paddingRight: 40, flex: 1 }}>
        {body.map((step, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "row", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 22, backgroundColor: C.softGold, fontFamily: "Cormorant Garamond", fontSize: 24, fontWeight: 700, color: C.warmCream }}>
              {String(i + 1)}
            </div>
            <div style={{ display: "flex", fontSize: 28, color: C.midnightPlum, lineHeight: 1.4, paddingTop: 8 }}>
              {step}
            </div>
          </div>
        ))}
      </div>
      {footer ? (
        <div style={{ display: "flex", justifyContent: "center", fontFamily: "Cormorant Garamond", fontSize: 28, fontStyle: "italic", color: C.softGold, marginBottom: 40 }}>
          {footer}
        </div>
      ) : null}
      <div style={{ position: "absolute", bottom: 40, left: 0, right: 0, display: "flex", justifyContent: "center", fontFamily: "Inter", fontSize: 22, color: C.softGold }}>
        {WATERMARK}
      </div>
    </div>
  );
}

function JournalCard({ heading, body, footer }: { heading: string; body: string[]; footer?: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: WIDTH,
        height: HEIGHT,
        backgroundColor: C.warmCream,
        fontFamily: "Inter",
        position: "relative",
        padding: 80,
      }}
    >
      <GoldBorder />
      <div style={{ display: "flex", justifyContent: "center", fontFamily: "Cormorant Garamond", fontSize: 52, fontWeight: 700, color: C.midnightPlum, marginBottom: 8 }}>
        {heading}
      </div>
      <div style={{ display: "flex", justifyContent: "center", fontSize: 24, color: C.midnightPlum, marginBottom: 8 }}>
        Grab your journal and reflect
      </div>
      <div style={{ display: "flex", width: 160, height: 2, backgroundColor: C.softGold, marginTop: 12, marginBottom: 24, marginLeft: "auto", marginRight: "auto" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingLeft: 60, paddingRight: 40, flex: 1 }}>
        {body.map((prompt, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "row", gap: 12 }}>
            <div style={{ display: "flex", fontFamily: "Cormorant Garamond", fontSize: 28, color: C.softGold }}>{"\u2014"}</div>
            <div style={{ display: "flex", fontFamily: "Cormorant Garamond", fontSize: 30, fontStyle: "italic", color: C.midnightPlum, lineHeight: 1.5 }}>
              {prompt}
            </div>
          </div>
        ))}
      </div>
      {footer ? (
        <div style={{ display: "flex", justifyContent: "center", fontFamily: "Cormorant Garamond", fontSize: 26, fontStyle: "italic", color: C.dustyRose, marginBottom: 40 }}>
          {footer}
        </div>
      ) : null}
      <div style={{ position: "absolute", bottom: 40, left: 0, right: 0, display: "flex", justifyContent: "center", fontFamily: "Inter", fontSize: 22, color: C.softGold }}>
        {WATERMARK}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;

    const template = searchParams.get("template") ?? "info";
    const heading = searchParams.get("heading") ?? "Heading";
    const bodyRaw = searchParams.get("body") ?? "[]";
    const footer = searchParams.get("footer") || undefined;

    let body: string[];
    try {
      body = JSON.parse(bodyRaw);
      if (!Array.isArray(body)) body = [String(body)];
    } catch {
      body = [bodyRaw];
    }

    let element: React.JSX.Element;
    switch (template) {
      case "list":
        element = <ListCard heading={heading} body={body} footer={footer} />;
        break;
      case "steps":
        element = <StepsCard heading={heading} body={body} footer={footer} />;
        break;
      case "journal":
        element = <JournalCard heading={heading} body={body} footer={footer} />;
        break;
      default:
        element = <InfoCard heading={heading} body={body} footer={footer} />;
    }

    return new ImageResponse(element, {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        {
          name: "Cormorant Garamond",
          data: cormorantBold,
          weight: 700 as const,
          style: "normal" as const,
        },
        {
          name: "Inter",
          data: interRegular,
          weight: 400 as const,
          style: "normal" as const,
        },
      ],
    });
  } catch (err) {
    console.error("OG route error:", err);
    return new Response(`Error: ${err}`, { status: 500 });
  }
}
