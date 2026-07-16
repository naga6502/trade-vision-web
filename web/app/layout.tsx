import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

export const metadata = {
  title: "Trade Vision — NSE Market Intelligence",
  description:
    "Dark trading terminal for NSE India — market intel, screeners & technical analysis powered by the Trade Vision MCP server.",
  icons: { icon: "/logo.png" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="terminal-shell">
          <Sidebar />
          <div className="content">
            <Topbar />
            <main className="main">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
