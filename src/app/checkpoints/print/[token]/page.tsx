import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

// Printable QR sheet (top-level, no app chrome). Manager posts this at the
// checkpoint. The QR encodes the scan URL: `${origin}/checkpoints/scan?t=${token}`.
export const dynamic = "force-dynamic";

export default async function CheckpointPrintPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const post = await prisma.checkpointPost.findUnique({
    where: { qrToken: token },
    include: { location: { include: { organization: true } } },
  });
  if (!post) redirect("/");

  // Generate QR via public quickchart (no extra deps). For prod, drop in `qrcode` package.
  const scanUrl = `${process.env.NEXTAUTH_URL ?? ""}/checkpoints/scan?t=${token}`;
  const qrSrc = `https://quickchart.io/qr?text=${encodeURIComponent(scanUrl)}&size=400&margin=2`;

  return (
    <html>
      <head>
        <title>Checkpoint: {post.name}</title>
        <style>{`
          body { font-family: ui-sans-serif, system-ui, sans-serif; padding: 48px; margin: 0; }
          .sheet { max-width: 600px; margin: 0 auto; text-align: center; }
          h1 { font-size: 36px; margin: 0 0 4px 0; font-weight: 800; letter-spacing: -0.02em; }
          .org { font-size: 14px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 32px; }
          .qr { display: block; margin: 0 auto 32px; border: 8px solid #0f172a; border-radius: 24px; padding: 16px; background: white; }
          .loc { font-size: 18px; color: #334155; font-weight: 600; }
          .instructions { font-size: 13px; color: #64748b; margin-top: 32px; line-height: 1.6; }
          .seq { display: inline-block; background: #fef3c7; color: #92400e; padding: 6px 14px; border-radius: 9999px; font-size: 13px; font-weight: 700; margin-bottom: 8px; }
          @media print {
            body { padding: 24px; }
            .no-print { display: none; }
          }
        `}</style>
      </head>
      <body>
        <div className="sheet">
          <div className="org">{post.location.organization.name}</div>
          {post.expectedSequence > 0 && <div className="seq">Stop #{post.expectedSequence} in patrol</div>}
          <h1>{post.name}</h1>
          <div className="loc">{post.location.name}</div>
          <img src={qrSrc} className="qr" alt="Checkpoint QR" width={400} height={400} />
          <div className="instructions">
            Scan with the ShyftForce app at every tour. GPS is verified against this post&apos;s geofence —
            scans outside the radius are flagged for manager review.
          </div>
          <button className="no-print" onClick={() => window.print()} style={{ marginTop: 24, padding: "10px 20px", fontSize: 14, fontWeight: 600, borderRadius: 8, background: "#0f172a", color: "white", border: "none", cursor: "pointer" }}>
            Print this page
          </button>
        </div>
      </body>
    </html>
  );
}
