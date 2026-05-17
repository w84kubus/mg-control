/* eslint-disable @next/next/no-img-element */
const B = process.env.NEXT_PUBLIC_BASE_PATH || "";
const LOGO = `${B}/logo-mg-plaza.png`;

export default function LogoPreview() {
  return (
    <div style={{ background: "#0a0a0f", color: "#e4e4e7", fontFamily: "system-ui, sans-serif", padding: 24, minHeight: "100vh" }}>
      <h1 style={{ textAlign: "center", fontSize: 20, marginBottom: 8, color: "#fff" }}>Propozycje Logo — MG Control</h1>
      <p style={{ textAlign: "center", fontSize: 13, color: "#71717a", marginBottom: 32 }}>Wybierz wersję, która Ci najbardziej odpowiada</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 600, margin: "0 auto" }}>

        {/* ═══ A ═══ */}
        <Card title="Wersja A: MG Plaza + CONTROL" badge="Firmowe" desc="Pełne oficjalne logo MG Grupa Plaza w sidebarze i na loginie. Dopisek CONTROL w kolorze akcentu. Silny branding dealerski.">
          <Label>Sidebar</Label>
          <SidebarMock
            expanded={
              <SbLogo style={{ flexDirection: "column", alignItems: "flex-start", gap: 2, padding: "14px 12px" }}>
                <img src={LOGO} alt="logo" style={{ height: 22, filter: "invert(1)" }} />
                <span style={{ fontSize: 10, letterSpacing: 3, color: "#3b82f6", fontWeight: 700 }}>CONTROL</span>
              </SbLogo>
            }
            collapsed={
              <SbLogoC><img src={LOGO} alt="" style={{ width: 28, height: 28, objectFit: "contain", filter: "invert(1)" }} /></SbLogoC>
            }
          />
          <Label>Ekran logowania</Label>
          <LoginMock>
            <img src={LOGO} alt="logo" style={{ height: 40, filter: "invert(1)" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 14, letterSpacing: 4, color: "#3b82f6", fontWeight: 800 }}>CONTROL</div>
              <div style={{ fontSize: 9, color: "#71717a", letterSpacing: 1.5, marginTop: 2 }}>System Logistyki Salonu</div>
            </div>
            <LoginFields />
          </LoginMock>
        </Card>

        {/* ═══ B ═══ */}
        <Card title="Wersja B: Ośmiokąt + MG CONTROL" badge="Minimalistyczne" desc="Ośmiokąt MG z oficjalnego logo jako ikona + tekst MG CONTROL obok. Nowoczesne, czyste i funkcjonalne.">
          <Label>Sidebar</Label>
          <SidebarMock
            expanded={
              <SbLogo>
                <img src={LOGO} alt="" style={{ width: 30, height: 30, objectFit: "contain", filter: "invert(1)" }} />
                <span style={{ fontWeight: 900, fontSize: 13, letterSpacing: 2, color: "#fff", whiteSpace: "nowrap" }}>MG CONTROL</span>
              </SbLogo>
            }
            collapsed={
              <SbLogoC><img src={LOGO} alt="" style={{ width: 28, height: 28, objectFit: "contain", filter: "invert(1)" }} /></SbLogoC>
            }
          />
          <Label>Ekran logowania</Label>
          <LoginMock>
            <img src={LOGO} alt="" style={{ width: 52, height: 52, objectFit: "contain", filter: "invert(1)" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: 3, color: "#fff" }}>MG CONTROL</div>
              <div style={{ fontSize: 9, color: "#71717a", letterSpacing: 1.5, marginTop: 3 }}>Grupa Plaza · Warszawa</div>
            </div>
            <LoginFields />
          </LoginMock>
        </Card>

        {/* ═══ C ═══ */}
        <Card title="Wersja C: Premium ciemne" badge="Eleganckie" desc="Logo wycentrowane w sidebarze. Ciemna karta logowania z logo + CONTROL w kolorze akcentu. Premium dealer look.">
          <Label>Sidebar</Label>
          <SidebarMock
            expanded={
              <SbLogo style={{ justifyContent: "center", padding: "16px 12px" }}>
                <img src={LOGO} alt="" style={{ height: 24, filter: "invert(1)", opacity: 0.9 }} />
              </SbLogo>
            }
            collapsed={
              <SbLogoC><img src={LOGO} alt="" style={{ width: 28, height: 28, objectFit: "contain", filter: "invert(1)", opacity: 0.9 }} /></SbLogoC>
            }
          />
          <Label>Ekran logowania</Label>
          <LoginMock cardStyle={{ background: "#111114", borderColor: "#222" }}>
            <img src={LOGO} alt="" style={{ height: 40, filter: "invert(1)", opacity: 0.95 }} />
            <div style={{ height: 1, width: 60, background: "#27272a" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 5, color: "#3b82f6" }}>CONTROL</div>
              <div style={{ fontSize: 9, color: "#52525b", letterSpacing: 2, marginTop: 4 }}>SYSTEM LOGISTYKI</div>
            </div>
            <LoginFields />
          </LoginMock>
        </Card>

        {/* ═══ D ═══ */}
        <Card title="Wersja D: Hybrydowa" badge="Polecana" desc="Login: pełne logo MG Grupa Plaza + MG CONTROL. Sidebar: ośmiokąt + MG CONTROL + mały Grupa Plaza. Najlepsze z obu światów.">
          <Label>Sidebar</Label>
          <SidebarMock
            expanded={
              <SbLogo>
                <img src={LOGO} alt="" style={{ width: 30, height: 30, objectFit: "contain", filter: "invert(1)" }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 2, color: "#fff" }}>MG CONTROL</div>
                  <div style={{ fontSize: 8, color: "#52525b", letterSpacing: 1 }}>Grupa Plaza</div>
                </div>
              </SbLogo>
            }
            collapsed={
              <SbLogoC><img src={LOGO} alt="" style={{ width: 28, height: 28, objectFit: "contain", filter: "invert(1)" }} /></SbLogoC>
            }
          />
          <Label>Ekran logowania</Label>
          <LoginMock>
            <img src={LOGO} alt="" style={{ height: 40, filter: "invert(1)" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: 3, color: "#fff" }}>MG CONTROL</div>
              <div style={{ fontSize: 9, color: "#71717a", letterSpacing: 1.5, marginTop: 2 }}>System Logistyki Salonu</div>
            </div>
            <LoginFields />
          </LoginMock>
        </Card>
        {/* ═══ E ═══ */}
        <Card title="Wersja E: Znaczek MG + CONTROL" badge="Czyste" desc="Sam ośmiokąt MG (bez napisu Grupa Plaza) + obok tekst CONTROL. Najbardziej minimalistyczne i appowe podejście.">
          <Label>Sidebar</Label>
          <SidebarMock
            expanded={
              <SbLogo>
                <img src={LOGO} alt="" style={{ width: 30, height: 30, objectFit: "contain", filter: "invert(1)" }} />
                <span style={{ fontWeight: 900, fontSize: 14, letterSpacing: 3, color: "#fff", whiteSpace: "nowrap" }}>CONTROL</span>
              </SbLogo>
            }
            collapsed={
              <SbLogoC><img src={LOGO} alt="" style={{ width: 28, height: 28, objectFit: "contain", filter: "invert(1)" }} /></SbLogoC>
            }
          />
          <Label>Ekran logowania</Label>
          <LoginMock>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <img src={LOGO} alt="" style={{ width: 48, height: 48, objectFit: "contain", filter: "invert(1)" }} />
              <div>
                <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 4, color: "#fff" }}>CONTROL</div>
                <div style={{ fontSize: 9, color: "#71717a", letterSpacing: 1.5, marginTop: 1 }}>System Logistyki Salonu</div>
              </div>
            </div>
            <LoginFields />
          </LoginMock>
        </Card>
      </div>
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────── */
function Card({ title, badge, desc, children }: { title: string; badge: string; desc: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 16, overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #27272a", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 15, fontWeight: 700 }}>{title}</h2>
        <span style={{ fontSize: 11, background: "#3b82f6", color: "#fff", padding: "2px 10px", borderRadius: 99, fontWeight: 600 }}>{badge}</span>
      </div>
      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
        {children}
        <div style={{ fontSize: 11, color: "#a1a1aa", lineHeight: 1.6, padding: 12, background: "#111114", borderRadius: 8, border: "1px solid #27272a" }}>{desc}</div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, color: "#71717a", fontWeight: 600 }}>{children}</p>;
}

function SidebarMock({ expanded, collapsed }: { expanded: React.ReactNode; collapsed: React.ReactNode }) {
  const navItems = (full: boolean) => (
    <div style={{ padding: 8 }}>
      {["Mapa", "Zlecenia", "Dostawy"].map((label, i) => full ? (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, fontSize: 12, color: i === 0 ? "#3b82f6" : "#a1a1aa", background: i === 0 ? "#3b82f620" : "transparent", marginBottom: 2 }}>
          <div style={{ width: 14, height: 14, borderRadius: 4, background: i === 0 ? "#3b82f6" : "#27272a", flexShrink: 0 }} />
          {label}
        </div>
      ) : (
        <div key={label} style={{ width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 2px", background: i === 0 ? "#3b82f620" : "transparent" }}>
          <div style={{ width: 14, height: 14, borderRadius: 4, background: i === 0 ? "#3b82f6" : "#27272a" }} />
        </div>
      ))}
    </div>
  );
  return (
    <div style={{ background: "#111114", border: "1px solid #27272a", borderRadius: 12, display: "flex", gap: 12, padding: 12 }}>
      <div style={{ width: 220, background: "#111114", borderRadius: 10, border: "1px solid #27272a" }}>
        {expanded}
        {navItems(true)}
      </div>
      <div style={{ width: 56, background: "#111114", borderRadius: 10, border: "1px solid #27272a" }}>
        {collapsed}
        {navItems(false)}
      </div>
    </div>
  );
}

function SbLogo({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ padding: 12, borderBottom: "1px solid #27272a", display: "flex", alignItems: "center", gap: 10, minHeight: 48, ...style }}>{children}</div>;
}
function SbLogoC({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: "12px 8px", borderBottom: "1px solid #27272a", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 48 }}>{children}</div>;
}

function LoginMock({ children, cardStyle }: { children: React.ReactNode; cardStyle?: React.CSSProperties }) {
  return (
    <div style={{ background: "#0a0a0f", border: "1px solid #27272a", borderRadius: 12, padding: 24, display: "flex", justifyContent: "center" }}>
      <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 16, padding: "28px 24px", width: 260, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, ...cardStyle }}>
        {children}
      </div>
    </div>
  );
}

function LoginFields() {
  return (
    <>
      <div style={{ width: "100%", height: 32, background: "#0a0a0f", border: "1px solid #27272a", borderRadius: 8, marginTop: 4 }} />
      <div style={{ width: "100%", height: 32, background: "#0a0a0f", border: "1px solid #27272a", borderRadius: 8 }} />
      <div style={{ width: "100%", height: 32, background: "#3b82f6", borderRadius: 8 }} />
    </>
  );
}
