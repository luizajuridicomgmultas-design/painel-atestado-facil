import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

/* ─── TOKENS ─────────────────────────────────────────────── */
const c = {
  bg: "#F3F4F6", sidebar: "#111827", sidebarHover: "#1F2937",
  sidebarActive: "#1D4ED8", sidebarText: "#9CA3AF",
  white: "#FFFFFF", border: "#E5E7EB",
  textPrimary: "#111827", textSecondary: "#6B7280", textMuted: "#9CA3AF",
  blue: "#1D4ED8", blueLight: "#EFF6FF",
  green: "#059669", greenLight: "#ECFDF5",
  red: "#DC2626", redLight: "#FEF2F2",
  yellow: "#D97706", yellowLight: "#FFFBEB",
  shadow: "0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)",
};

const STATUS = {
  DISPONIVEL: "Disponível",
  ATIVO: "Ativo",
  BLOQUEADO: "Bloqueado",
  VENCIDO: "Vencido",
};

const ADMIN_USER = "admin";
const ADMIN_PASS = "1234";

/* ─── ICONS ───────────────────────────────────────────────── */
const Icon = ({ d, size = 15, ...rest }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2"
    viewBox="0 0 24 24" {...rest}>
    <path d={d} />
  </svg>
);

const Icons = {
  grid: "M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z",
  key: "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z",
  users: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zm14 14v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  dollar: "M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
  bar: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  plug: "M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14",
  settings: "M12 15a3 3 0 100-6 3 3 0 000 6zm6.93-3a6.93 6.93 0 01-.06 1l1.52 1.19a.36.36 0 01.08.46l-1.44 2.5a.36.36 0 01-.44.16l-1.79-.72a7 7 0 01-.86.5l-.27 1.9a.35.35 0 01-.35.3h-2.88a.35.35 0 01-.35-.3l-.27-1.9a7 7 0 01-.86-.5l-1.79.72a.36.36 0 01-.44-.16l-1.44-2.5a.35.35 0 01.08-.46l1.52-1.19a6.93 6.93 0 010-2l-1.52-1.19a.36.36 0 01-.08-.46l1.44-2.5a.36.36 0 01.44-.16l1.79.72a7 7 0 01.86-.5l.27-1.9A.35.35 0 0110.56 3h2.88c.18 0 .33.13.35.3l.27 1.9a7 7 0 01.86.5l1.79-.72a.36.36 0 01.44.16l1.44 2.5a.35.35 0 01-.08.46z",
  file: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6",
  download: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4",
  plus: "M12 5v14M5 12h14",
  search: "M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z",
  filter: "M4 6h16M8 12h8M11 18h2",
  trendDown: "M23 18L13.5 8.5 8.5 13.5 1 6M17 18h6v-6",
  chat: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
  chevRight: "M9 18l6-6-6-6",
  layers: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
};

/* ─── HELPERS ─────────────────────────────────────────────── */
function gerarCodigo() {
  return String(Math.floor(10000 + Math.random() * 90000));
}

function hojeISO() {
  return new Date().toISOString().split("T")[0];
}

function validade90Dias() {
  const d = new Date();
  d.setDate(d.getDate() + 90);
  return d.toISOString().split("T")[0];
}

function formatarData(data) {
  if (!data) return "—";
  try {
    return new Date(`${data}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return data || "—";
  }
}

function formatarDataHora(data) {
  if (!data) return "—";
  try {
    return new Date(data).toLocaleString("pt-BR");
  } catch {
    return data || "—";
  }
}

function iniciais(nome) {
  if (!nome) return "—";
  const p = nome.trim().split(" ").filter(Boolean);
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return `${p[0][0]}${p[p.length - 1][0]}`.toUpperCase();
}

function toStatus(row) {
  if (row.status === STATUS.ATIVO) return { key: "active", label: "Ativa" };
  if (row.status === STATUS.BLOQUEADO) return { key: "expired", label: "Bloqueada" };
  if (row.status === STATUS.VENCIDO) return { key: "expired", label: "Expirada" };
  return { key: "trial", label: "Livre" };
}

/* ═══════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════ */
export default function AdminPanel() {
  const [logado, setLogado] = useState(() => localStorage.getItem("painel_atestado_logado") === "sim");
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [search, setSearch] = useState("");
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [lote, setLote] = useState(5);

  useEffect(() => {
    if (logado) carregar();
  }, [logado]);

  async function carregar() {
    setCarregando(true);

    await supabase
      .from("usuarios")
      .update({ status: STATUS.VENCIDO, vencido_em: new Date().toISOString() })
      .lt("validade", hojeISO())
      .eq("status", STATUS.ATIVO);

    const { data, error } = await supabase
      .from("usuarios")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      alert("Erro ao carregar dados do Supabase.");
    } else {
      setUsuarios(data || []);
    }

    setCarregando(false);
  }

  function entrar(e) {
    e.preventDefault();
    if (login === ADMIN_USER && senha === ADMIN_PASS) {
      localStorage.setItem("painel_atestado_logado", "sim");
      setLogado(true);
    } else {
      alert("Login inválido.");
    }
  }

  function sair() {
    localStorage.removeItem("painel_atestado_logado");
    setLogado(false);
  }

  async function gerarNovoCodigo() {
    setGerando(true);

    for (let i = 0; i < 12; i++) {
      const codigo = gerarCodigo();
      const { error } = await supabase.from("usuarios").insert([
        { codigo, status: STATUS.DISPONIVEL, sistema: "", pagamento_status: "Pendente" },
      ]);

      if (!error) {
        await carregar();
        await navigator.clipboard?.writeText(codigo).catch(() => {});
        setGerando(false);
        alert(`Código gerado e copiado: ${codigo}`);
        return;
      }

      if (!String(error.message || "").toLowerCase().includes("duplicate")) {
        console.error(error);
        setGerando(false);
        alert("Erro ao gerar código.");
        return;
      }
    }

    setGerando(false);
    alert("Não foi possível gerar código único.");
  }

  async function gerarLote() {
    const qtd = Math.max(1, Math.min(Number(lote) || 1, 100));
    setGerando(true);

    const codigos = new Set();
    while (codigos.size < qtd) codigos.add(gerarCodigo());

    const registros = [...codigos].map((codigo) => ({
      codigo,
      status: STATUS.DISPONIVEL,
      sistema: "",
      pagamento_status: "Pendente",
    }));

    const { error } = await supabase.from("usuarios").insert(registros);

    setGerando(false);

    if (error) {
      console.error(error);
      alert("Erro ao gerar lote.");
      return;
    }

    await carregar();
    alert(`${qtd} códigos gerados.`);
  }

  async function copiarCodigo(codigo) {
    await navigator.clipboard?.writeText(codigo).catch(() => {});
    alert(`Código copiado: ${codigo}`);
  }

  async function atualizarStatus(row, status) {
    const update = { status };

    if (status === STATUS.BLOQUEADO) {
      update.bloqueado_motivo = prompt("Motivo do bloqueio:", row.bloqueado_motivo || "") || "Bloqueio manual";
    }

    if (status === STATUS.ATIVO) {
      update.validade = row.validade && row.validade >= hojeISO() ? row.validade : validade90Dias();
      update.pagamento_status = "Pago";
      update.pago_em = new Date().toISOString();
      update.renovado_em = new Date().toISOString();
      update.bloqueado_motivo = null;
    }

    if (status === STATUS.DISPONIVEL) {
      const ok = confirm("Liberar esta licença? Isso apaga os dados do cliente vinculado.");
      if (!ok) return;
      Object.assign(update, {
        nome: null, cpf: null, telefone: null, email: null, cargo: null, orgao: null,
        mat1: null, mat2: null, unid1: null, unid2: null, sit: null,
        validade: null, usado_em: null, bloqueado_motivo: null,
        envios: 0, alteracoes: 0, pagamento_status: "Pendente",
        pago_em: null, renovado_em: null, vencido_em: null,
      });
    }

    const { error } = await supabase.from("usuarios").update(update).eq("id", row.id);
    if (error) {
      console.error(error);
      alert("Erro ao atualizar licença.");
      return;
    }

    await carregar();
  }

  async function renovar(row) {
    const novaValidade = validade90Dias();
    const { error } = await supabase
      .from("usuarios")
      .update({
        status: STATUS.ATIVO,
        validade: novaValidade,
        pagamento_status: "Pago",
        pago_em: new Date().toISOString(),
        renovado_em: new Date().toISOString(),
        bloqueado_motivo: null,
      })
      .eq("id", row.id);

    if (error) {
      console.error(error);
      alert("Erro ao renovar.");
      return;
    }

    await carregar();
    alert(`Licença renovada até ${formatarData(novaValidade)}.`);
  }

  const stats = useMemo(() => {
    const ativo = usuarios.filter((u) => u.status === STATUS.ATIVO).length;
    const disponivel = usuarios.filter((u) => u.status === STATUS.DISPONIVEL).length;
    const vencido = usuarios.filter((u) => u.status === STATUS.VENCIDO).length;
    const bloqueado = usuarios.filter((u) => u.status === STATUS.BLOQUEADO).length;
    const pendente = usuarios.filter((u) => (u.pagamento_status || "Pendente") !== "Pago").length;
    const erros = usuarios.filter((u) => u.ultimo_erro).length;
    const envios = usuarios.reduce((sum, u) => sum + Number(u.envios || 0), 0);

    return { total: usuarios.length, ativo, disponivel, vencido, bloqueado, pendente, erros, envios };
  }, [usuarios]);

  const navMain = [
    { label: "Dashboard", icon: "grid", badge: null },
    { label: "Licenças", icon: "key", badge: String(stats.total) },
    { label: "Clientes", icon: "users", badge: String(usuarios.filter((u) => u.nome).length) },
    { label: "Faturamento", icon: "dollar" },
  ];
  const navSystem = [
    { label: "Documentos", icon: "file" },
    { label: "Erros", icon: "file", badge: String(stats.erros) },
    { label: "Atualizar", icon: "settings" },
  ];

  const filtered = usuarios.filter((r) => {
    const haystack = `${r.codigo || ""} ${r.nome || ""} ${r.email || ""} ${r.telefone || ""} ${r.cpf || ""}`.toLowerCase();
    const match = haystack.includes(search.toLowerCase());

    if (activeNav === "Clientes") return match && r.nome;
    if (activeNav === "Faturamento") return match && r.nome;
    if (activeNav === "Documentos") return match && r.nome;
    if (activeNav === "Erros") return match && r.ultimo_erro;

    return match;
  });

  if (!logado) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: c.bg, fontFamily: "'Inter', sans-serif" }}>
        <form onSubmit={entrar} style={{ width: 360, background: c.white, border: `1px solid ${c.border}`, borderRadius: 12, boxShadow: c.shadow, padding: 28 }}>
          <div style={{ width: 38, height: 38, background: c.blue, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
            <Icon d={Icons.layers} size={17} stroke="#fff" />
          </div>
          <h1 style={{ margin: 0, fontSize: 21 }}>Atestado Fácil</h1>
          <p style={{ margin: "4px 0 22px", color: c.textMuted }}>Painel administrativo</p>
          <input value={login} onChange={(e) => setLogin(e.target.value)} placeholder="Usuário" style={loginInput} />
          <input value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Senha" type="password" style={loginInput} />
          <button style={{ width: "100%", height: 42, border: 0, borderRadius: 7, background: c.blue, color: "#fff", fontWeight: 600, cursor: "pointer" }}>Entrar</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Inter', sans-serif", background: c.bg, fontSize: 14 }}>
      <aside style={{
        width: 220, background: c.sidebar, height: "100vh",
        position: "fixed", top: 0, left: 0, display: "flex",
        flexDirection: "column", zIndex: 100,
      }}>
        <div style={{ height: 64, display: "flex", alignItems: "center", padding: "0 20px", borderBottom: `1px solid #1F2937`, gap: 10, flexShrink: 0 }}>
          <div style={{ width: 30, height: 30, background: c.blue, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon d={Icons.layers} size={15} stroke="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#fff", letterSpacing: "-0.3px" }}>Atestado Fácil</div>
            <div style={{ fontSize: 10, color: c.sidebarText, textTransform: "uppercase", letterSpacing: "0.5px" }}>Painel ADM</div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: "14px 0", overflowY: "auto" }}>
          <NavSection label="Principal" items={navMain} active={activeNav} onSelect={(label) => label === "Atualizar" ? carregar() : setActiveNav(label)} />
          <NavSection label="Sistema" items={navSystem} active={activeNav} onSelect={(label) => label === "Atualizar" ? carregar() : setActiveNav(label)} />
        </nav>

        <div style={{ padding: 12, borderTop: `1px solid #1F2937` }}>
          <div onClick={sair} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 6, cursor: "pointer" }}>
            <div style={{ width: 30, height: 30, borderRadius: 99, background: "linear-gradient(135deg,#1D4ED8,#7C3AED)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff" }}>AD</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 500, color: "#D1D5DB" }}>Admin</div>
              <div style={{ fontSize: 11, color: c.sidebarText }}>Sair</div>
            </div>
            <Icon d={Icons.chevRight} size={14} stroke="#6B7280" />
          </div>
        </div>
      </aside>

      <div style={{ marginLeft: 220, flex: 1, display: "flex", flexDirection: "column" }}>
        <header style={{ height: 64, background: c.white, borderBottom: `1px solid ${c.border}`, display: "flex", alignItems: "center", padding: "0 28px", gap: 16, position: "sticky", top: 0, zIndex: 50 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: c.textPrimary, letterSpacing: "-0.3px" }}>{activeNav} · Visão Geral</div>
            <div style={{ fontSize: 12, color: c.textMuted, marginTop: 1 }}>{new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })} — {carregando ? "atualizando..." : "atualizado"}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: 99, background: "#10B981", boxShadow: "0 0 0 2px #D1FAE5" }} />
            <span style={{ fontSize: 12, color: c.textSecondary }}>Produção</span>
            <div style={{ width: 1, height: 24, background: c.border }} />
            <Btn ghost icon={Icons.download}>Exportar</Btn>
            <Btn icon={Icons.plus} onClick={gerarNovoCodigo}>{gerando ? "Gerando..." : "Nova Licença"}</Btn>
          </div>
        </header>

        <main style={{ padding: 28, display: "flex", flexDirection: "column", gap: 24, flex: 1 }}>
          {(activeNav === "Dashboard" || activeNav === "Licenças") && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
              <KpiCard label="Licenças Ativas" value={stats.ativo} icon="key" color="blue" />
              <KpiCard label="Códigos Livres" value={stats.disponivel} icon="dollar" color="green" />
              <KpiCard label="Bloqueadas/Vencidas" value={stats.bloqueado + stats.vencido} icon="trendDown" color="red" />
              <KpiCard label="Erros Abertos" value={stats.erros} icon="chat" color="yellow" />
            </div>
          )}

          {activeNav === "Licenças" && (
            <div style={{ background: c.white, borderRadius: 10, border: `1px solid ${c.border}`, boxShadow: c.shadow, padding: 16, display: "flex", gap: 10, alignItems: "center" }}>
              <button onClick={gerarNovoCodigo} style={blueButton}>Gerar 1 código</button>
              <input value={lote} type="number" min="1" max="100" onChange={(e) => setLote(e.target.value)} style={{ width: 70, padding: "7px 10px", border: `1px solid ${c.border}`, borderRadius: 6 }} />
              <button onClick={gerarLote} style={ghostButton}>Gerar lote</button>
            </div>
          )}

          {activeNav === "Faturamento" ? (
            <SimpleTable title="Faturamento" rows={filtered} kind="payments" renovar={renovar} />
          ) : activeNav === "Documentos" ? (
            <SimpleTable title="Documentos" rows={filtered} kind="documents" />
          ) : activeNav === "Erros" ? (
            <SimpleTable title="Erros" rows={filtered} kind="errors" />
          ) : (
            <LicenseTable
              title={activeNav === "Clientes" ? "Clientes — Todas as Contas" : "Licenças — Todas as Contas"}
              subtitle={activeNav === "Clientes" ? "Clientes vinculados aos códigos do app" : "Gerencie, filtre e exporte registros de licença"}
              filtered={filtered}
              stats={stats}
              search={search}
              setSearch={setSearch}
              copiarCodigo={copiarCodigo}
              renovar={renovar}
              atualizarStatus={atualizarStatus}
            />
          )}
        </main>
      </div>
    </div>
  );
}

/* ─── SUB-COMPONENTS ─────────────────────────────────────── */
function NavSection({ label, items, active, onSelect }) {
  return (
    <div style={{ padding: "0 12px", marginBottom: 4 }}>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "1px", color: "#374151", padding: "10px 8px 6px", fontWeight: 600 }}>{label}</div>
      {items.map((item) => {
        const isActive = active === item.label;
        return (
          <div key={item.label} onClick={() => onSelect(item.label)}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 6, color: isActive ? "#fff" : "#9CA3AF", cursor: "pointer", background: isActive ? "#1D4ED8" : "transparent", fontWeight: isActive ? 500 : 400, fontSize: 13.5, transition: "all 0.15s", marginBottom: 1 }}>
            <Icon d={Icons[item.icon]} size={15} stroke="currentColor" style={{ opacity: isActive ? 1 : 0.8 }} />
            {item.label}
            {item.badge && (
              <span style={{ marginLeft: "auto", background: isActive ? "rgba(255,255,255,0.2)" : "#374151", color: isActive ? "#fff" : "#9CA3AF", fontSize: 10, padding: "1px 6px", borderRadius: 99, fontWeight: 500 }}>{item.badge}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function KpiCard({ label, icon, color, value }) {
  const kpiColors = {
    blue: { bg: "#EFF6FF", color: "#1D4ED8" },
    green: { bg: "#ECFDF5", color: "#059669" },
    red: { bg: "#FEF2F2", color: "#DC2626" },
    yellow: { bg: "#FFFBEB", color: "#D97706" },
  };
  const { bg, color: iconColor } = kpiColors[color];
  return (
    <div style={{ background: "#fff", borderRadius: 10, border: `1px solid #E5E7EB`, boxShadow: "0 1px 3px rgba(0,0,0,0.07)", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.6px" }}>{label}</span>
        <div style={{ width: 30, height: 30, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", background: bg, color: iconColor }}>
          <Icon d={Icons[icon]} size={15} stroke={iconColor} />
        </div>
      </div>
      <div style={{ fontSize: 26, fontWeight: 500, color: "#111827", letterSpacing: "-0.8px" }}>{value}</div>
      <div style={{ height: 10, borderRadius: 99, background: "#F3F4F6", width: "60%" }} />
    </div>
  );
}

function LicenseTable({ title, subtitle, filtered, stats, search, setSearch, copiarCodigo, renovar, atualizarStatus }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 14.5, fontWeight: 600 }}>{title}</div>
          <div style={{ fontSize: 12, color: c.textMuted, marginTop: 2 }}>{subtitle}</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[["Total: " + stats.total, "#F3F4F6", "#6B7280", c.border], ["Ativas: " + stats.ativo, "#ECFDF5", "#059669", "transparent"], ["Livres: " + stats.disponivel, "#EFF6FF", "#1D4ED8", "transparent"], ["Expiradas: " + stats.vencido, "#FEF2F2", "#DC2626", "transparent"]].map(([label, bg, color, border]) => (
            <span key={label} style={{ padding: "4px 10px", borderRadius: 99, fontSize: 11.5, fontWeight: 500, background: bg, color, border: `1px solid ${border}` }}>{label}</span>
          ))}
        </div>
      </div>

      <div style={{ background: c.white, borderRadius: 10, border: `1px solid ${c.border}`, boxShadow: c.shadow, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${c.border}`, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 6, padding: "7px 12px", maxWidth: 280, flex: 1 }}>
            <Icon d={Icons.search} size={13} stroke={c.textMuted} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por código ou cliente…"
              style={{ border: "none", background: "transparent", outline: "none", fontSize: 13, color: c.textPrimary, fontFamily: "inherit", width: "100%" }} />
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <Btn ghost icon={Icons.filter}>Filtrar</Btn>
            <Btn ghost icon={Icons.download}>Exportar</Btn>
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${c.border}` }}>
              {["Código", "Cliente", "Status", "Validade", "Ações"].map((col, i) => (
                <th key={col} style={{ padding: "11px 16px", textAlign: i === 4 ? "right" : "left", fontSize: 11, fontWeight: 600, color: c.textMuted, textTransform: "uppercase", letterSpacing: "0.7px", whiteSpace: "nowrap" }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => (
              <TableRow key={row.id} row={row} last={i === filtered.length - 1} copiarCodigo={copiarCodigo} renovar={renovar} atualizarStatus={atualizarStatus} />
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} style={{ padding: "32px 16px", textAlign: "center", color: c.textMuted, fontSize: 13 }}>Nenhum resultado encontrado.</td></tr>
            )}
          </tbody>
        </table>

        <div style={{ padding: "12px 20px", borderTop: `1px solid ${c.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: c.textMuted }}>Mostrando {filtered.length} de {stats.total} registros</span>
          <div style={{ display: "flex", gap: 4 }}>
            {["‹", "1", "2", "3", "…", "›"].map((p, i) => (
              <div key={i} style={{ width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 500, cursor: "pointer", border: `1px solid ${p === "1" ? c.blue : c.border}`, background: p === "1" ? c.blue : c.white, color: p === "1" ? "#fff" : c.textSecondary }}>
                {p}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TableRow({ row, last, copiarCodigo, renovar, atualizarStatus }) {
  const status = toStatus(row);
  const statusStyle = {
    active: { bg: "#ECFDF5", color: "#059669", dot: "#059669" },
    trial: { bg: "#EFF6FF", color: "#1D4ED8", dot: "#1D4ED8" },
    expired: { bg: "#FEF2F2", color: "#DC2626", dot: "#DC2626" },
    pending: { bg: "#FFFBEB", color: "#D97706", dot: "#D97706" },
  };
  const s = statusStyle[status.key];
  const name = row.nome || "Aguardando dados";
  return (
    <tr style={{ borderBottom: last ? "none" : `1px solid #F9FAFB` }}>
      <td style={{ padding: "13px 16px" }}>
        <span style={{ fontFamily: "monospace", fontSize: 12.5, color: "#1D4ED8", fontWeight: 500 }}>{row.codigo}</span>
      </td>
      <td style={{ padding: "13px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 99, background: row.nome ? "#1D4ED8" : "#CBD5E1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "#fff", flexShrink: 0 }}>{iniciais(row.nome)}</div>
          <div>
            <div style={{ fontWeight: 500, fontSize: 13.5 }}>{name}</div>
            <div style={{ fontSize: 11.5, color: "#9CA3AF", marginTop: 1 }}>{row.email || row.telefone || "Cliente ainda não vinculado"}</div>
          </div>
        </div>
      </td>
      <td style={{ padding: "13px 16px" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 99, fontSize: 11.5, fontWeight: 500, background: s.bg, color: s.color }}>
          <span style={{ width: 6, height: 6, borderRadius: 99, background: s.dot, display: "inline-block" }} />
          {status.label}
        </span>
      </td>
      <td style={{ padding: "13px 16px", fontSize: 13, color: "#6B7280" }}>{formatarData(row.validade)}</td>
      <td style={{ padding: "13px 16px", textAlign: "right" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
          <ActBtn bg="#EFF6FF" color="#1D4ED8" hoverBg="#DBEAFE" onClick={() => alert(detalhes(row))}>Ver</ActBtn>
          <ActBtn bg="#F3F4F6" color="#6B7280" hoverBg="#EEF0F2" border={`1px solid #E5E7EB`} onClick={() => copiarCodigo(row.codigo)}>Copiar</ActBtn>
          {(row.status === STATUS.ATIVO || row.status === STATUS.VENCIDO) && <ActBtn bg="#F3F4F6" color="#6B7280" hoverBg="#EEF0F2" border={`1px solid #E5E7EB`} onClick={() => renovar(row)}>Renovar</ActBtn>}
          {row.status === STATUS.BLOQUEADO ? (
            <ActBtn bg="#ECFDF5" color="#059669" hoverBg="#D1FAE5" onClick={() => atualizarStatus(row, STATUS.ATIVO)}>Liberar</ActBtn>
          ) : (
            <ActBtn bg="#FEF2F2" color="#DC2626" hoverBg="#FEE2E2" onClick={() => atualizarStatus(row, STATUS.BLOQUEADO)}>Revogar</ActBtn>
          )}
        </div>
      </td>
    </tr>
  );
}

function detalhes(row) {
  return [
    `Código: ${row.codigo}`,
    `Nome: ${row.nome || "-"}`,
    `CPF: ${row.cpf || "-"}`,
    `Telefone: ${row.telefone || "-"}`,
    `E-mail: ${row.email || "-"}`,
    `Status: ${row.status || "-"}`,
    `Validade: ${formatarData(row.validade)}`,
  ].join("\n");
}

function SimpleTable({ title, rows, kind, renovar }) {
  return (
    <div style={{ background: c.white, borderRadius: 10, border: `1px solid ${c.border}`, boxShadow: c.shadow, overflow: "hidden" }}>
      <div style={{ padding: "18px 20px", borderBottom: `1px solid ${c.border}` }}>
        <strong>{title}</strong>
      </div>
      {rows.length === 0 ? (
        <div style={{ padding: 32, color: c.textMuted, textAlign: "center" }}>Nenhum registro encontrado.</div>
      ) : rows.map((r) => (
        <div key={r.id} style={{ display: "grid", gridTemplateColumns: "1fr 120px 1fr 140px", gap: 12, padding: "14px 20px", borderBottom: `1px solid #F9FAFB`, alignItems: "center" }}>
          <span>{r.nome || r.codigo}</span>
          <span style={{ fontFamily: "monospace", color: c.blue }}>{r.codigo}</span>
          <span>{kind === "errors" ? r.ultimo_erro : kind === "documents" ? (r.termos_pdf || "Sem termos PDF") : (r.pagamento_status || "Pendente")}</span>
          {kind === "payments" ? <ActBtn bg="#EFF6FF" color="#1D4ED8" onClick={() => renovar(r)}>Renovar</ActBtn> : <span>{formatarData(r.validade)}</span>}
        </div>
      ))}
    </div>
  );
}

function Btn({ children, ghost, icon, onClick }) {
  return (
    <button onClick={onClick} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: "pointer", border: ghost ? `1px solid #E5E7EB` : "none", background: ghost ? "transparent" : "#1D4ED8", color: ghost ? "#6B7280" : "#fff", fontFamily: "inherit", transition: "all 0.15s" }}>
      {icon && <Icon d={icon} size={13} stroke="currentColor" />}
      {children}
    </button>
  );
}

function ActBtn({ children, bg, color, hoverBg, border, onClick }) {
  return (
    <button onClick={onClick} style={{ padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500, border: border || "none", cursor: "pointer", background: bg, color, fontFamily: "inherit", transition: "all 0.15s" }}
      onMouseEnter={e => hoverBg && (e.currentTarget.style.background = hoverBg)}
      onMouseLeave={e => (e.currentTarget.style.background = bg)}>
      {children}
    </button>
  );
}

const loginInput = {
  width: "100%",
  height: 42,
  border: `1px solid ${c.border}`,
  borderRadius: 7,
  padding: "0 12px",
  marginBottom: 10,
  outline: "none",
};

const blueButton = {
  padding: "7px 14px",
  borderRadius: 6,
  border: 0,
  background: c.blue,
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
};

const ghostButton = {
  padding: "7px 14px",
  borderRadius: 6,
  border: `1px solid ${c.border}`,
  background: "#fff",
  color: c.textSecondary,
  fontWeight: 600,
  cursor: "pointer",
};
