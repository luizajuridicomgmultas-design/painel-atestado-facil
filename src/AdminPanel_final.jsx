import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

const ADMIN_USER = "admin";
const ADMIN_PASS = "1234";

const STATUS = {
  DISPONIVEL: "Disponível",
  ATIVO: "Ativo",
  BLOQUEADO: "Bloqueado",
  VENCIDO: "Vencido",
};

function gerarCodigo() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bloco = (qtd) =>
    Array.from({ length: qtd }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `AF-${bloco(4)}-${bloco(4)}`;
}

function formatarData(data) {
  if (!data) return "-";
  try {
    return new Date(`${data}T12:00:00`).toLocaleDateString("pt-BR");
  } catch {
    return data;
  }
}

function formatarDataHora(data) {
  if (!data) return "-";
  try {
    return new Date(data).toLocaleString("pt-BR");
  } catch {
    return data;
  }
}

export default function AdminPanel() {
  const [logado, setLogado] = useState(() => localStorage.getItem("painel_atestado_logado") === "sim");
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("Todos");
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [gerando, setGerando] = useState(false);

  useEffect(() => {
    if (logado) carregarUsuarios();
  }, [logado]);

  async function carregarUsuarios() {
    setCarregando(true);
    const { data, error } = await supabase
      .from("usuarios")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      alert("Erro ao carregar códigos.");
    } else {
      setUsuarios(data || []);
    }
    setCarregando(false);
  }

  function entrar(e) {
    e?.preventDefault();
    if (usuario === ADMIN_USER && senha === ADMIN_PASS) {
      localStorage.setItem("painel_atestado_logado", "sim");
      setLogado(true);
    } else {
      alert("Login inválido");
    }
  }

  function sair() {
    localStorage.removeItem("painel_atestado_logado");
    setLogado(false);
    setUsuario("");
    setSenha("");
  }

  async function gerarNovoCodigo() {
    setGerando(true);

    let codigo = gerarCodigo();
    let tentativas = 0;
    let sucesso = false;

    while (!sucesso && tentativas < 5) {
      tentativas += 1;

      const { error } = await supabase.from("usuarios").insert([
        {
          codigo,
          status: STATUS.DISPONIVEL,
          sistema: "",
        },
      ]);

      if (!error) {
        sucesso = true;
        break;
      }

      if (String(error.message || "").toLowerCase().includes("duplicate")) {
        codigo = gerarCodigo();
      } else {
        console.error(error);
        alert("Erro ao gerar código.");
        setGerando(false);
        return;
      }
    }

    setGerando(false);

    if (!sucesso) {
      alert("Não foi possível gerar um código único. Tente novamente.");
      return;
    }

    await carregarUsuarios();
    await navigator.clipboard?.writeText(codigo).catch(() => {});
    alert(`Código gerado e copiado: ${codigo}`);
  }

  async function alterarStatus(item, novoStatus) {
    const updates = { status: novoStatus };

    if (novoStatus === STATUS.BLOQUEADO) {
      const motivo = prompt("Motivo do bloqueio (opcional):") || "";
      updates.bloqueado_motivo = motivo;
    }

    if (novoStatus === STATUS.DISPONIVEL) {
      const confirmar = confirm("Isso libera o código novamente e apaga os dados vinculados. Tem certeza?");
      if (!confirmar) return;

      Object.assign(updates, {
        nome: null,
        cpf: null,
        telefone: null,
        email: null,
        cargo: null,
        orgao: null,
        mat1: null,
        mat2: null,
        unid1: null,
        unid2: null,
        sit: null,
        validade: null,
        usado_em: null,
        bloqueado_motivo: null,
        envios: 0,
        alteracoes: 0,
      });
    }

    const { error } = await supabase.from("usuarios").update(updates).eq("id", item.id);

    if (error) {
      console.error(error);
      alert("Erro ao alterar status.");
      return;
    }

    carregarUsuarios();
  }

  async function copiarCodigo(codigo) {
    await navigator.clipboard?.writeText(codigo).catch(() => {});
    alert(`Código copiado: ${codigo}`);
  }

  const listaFiltrada = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return usuarios.filter((u) => {
      const bateFiltro = filtro === "Todos" || u.status === filtro;
      const texto = `${u.codigo || ""} ${u.nome || ""} ${u.cpf || ""} ${u.email || ""} ${u.telefone || ""}`.toLowerCase();
      const bateBusca = !termo || texto.includes(termo);
      return bateFiltro && bateBusca;
    });
  }, [usuarios, busca, filtro]);

  const contadores = useMemo(() => {
    const base = {
      Todos: usuarios.length,
      [STATUS.DISPONIVEL]: 0,
      [STATUS.ATIVO]: 0,
      [STATUS.BLOQUEADO]: 0,
      [STATUS.VENCIDO]: 0,
    };

    usuarios.forEach((u) => {
      if (base[u.status] !== undefined) base[u.status] += 1;
    });

    return base;
  }, [usuarios]);

  if (!logado) {
    return (
      <div style={styles.loginPage}>
        <form style={styles.loginCard} onSubmit={entrar}>
          <div style={styles.logo}>AF</div>
          <h1 style={styles.loginTitle}>Painel Atestado Fácil</h1>
          <p style={styles.loginText}>Acesse para gerar e controlar códigos.</p>

          <input
            placeholder="Usuário"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            style={styles.input}
          />

          <input
            placeholder="Senha"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            style={styles.input}
          />

          <button type="submit" style={styles.primaryButton}>
            Entrar
          </button>

          <small style={styles.hint}>Login atual: admin / 1234</small>
        </form>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <aside style={styles.sidebar}>
        <div>
          <div style={styles.brandBox}>
            <div style={styles.logoSmall}>AF</div>
            <div>
              <strong>Atestado Fácil</strong>
              <span style={styles.mutedBlock}>Painel ADM</span>
            </div>
          </div>

          <button style={styles.menuActive}>Códigos</button>
          <button style={styles.menuButton} onClick={carregarUsuarios}>Atualizar</button>
        </div>

        <button style={styles.logoutButton} onClick={sair}>Sair</button>
      </aside>

      <main style={styles.main}>
        <header style={styles.header}>
          <div>
            <span style={styles.eyebrow}>Controle de acesso</span>
            <h1 style={styles.title}>Códigos do app</h1>
            <p style={styles.subtitle}>
              Gere códigos livres. O cliente se cadastra sozinho no app após receber o código.
            </p>
          </div>

          <button onClick={gerarNovoCodigo} disabled={gerando} style={styles.generateButton}>
            {gerando ? "Gerando..." : "+ Gerar código"}
          </button>
        </header>

        <section style={styles.statsGrid}>
          {["Todos", STATUS.DISPONIVEL, STATUS.ATIVO, STATUS.BLOQUEADO, STATUS.VENCIDO].map((item) => (
            <button
              key={item}
              onClick={() => setFiltro(item)}
              style={{
                ...styles.statCard,
                ...(filtro === item ? styles.statCardActive : {}),
              }}
            >
              <span style={styles.statNumber}>{contadores[item] || 0}</span>
              <span style={styles.statLabel}>{item}</span>
            </button>
          ))}
        </section>

        <section style={styles.toolbar}>
          <input
            placeholder="Buscar por código, nome, CPF, telefone ou e-mail..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={styles.searchInput}
          />

          <button onClick={carregarUsuarios} style={styles.secondaryButton}>
            {carregando ? "Carregando..." : "Recarregar"}
          </button>
        </section>

        <section style={styles.cardList}>
          {listaFiltrada.length === 0 ? (
            <div style={styles.empty}>
              <h3>Nenhum código encontrado</h3>
              <p>Gere um novo código para começar.</p>
            </div>
          ) : (
            listaFiltrada.map((item) => (
              <article key={item.id} style={styles.codeCard}>
                <div style={styles.codeHeader}>
                  <div>
                    <span style={styles.codeLabel}>Código de acesso</span>
                    <h2 style={styles.code}>{item.codigo}</h2>
                  </div>

                  <span style={{ ...styles.badge, ...badgeStyle(item.status) }}>
                    {item.status || STATUS.DISPONIVEL}
                  </span>
                </div>

                <div style={styles.infoGrid}>
                  <Info label="Nome" value={item.nome || "Ainda não vinculado"} />
                  <Info label="CPF" value={item.cpf || "-"} />
                  <Info label="Telefone" value={item.telefone || "-"} />
                  <Info label="E-mail" value={item.email || "-"} />
                  <Info label="Cargo" value={item.cargo || "-"} />
                  <Info label="Órgão" value={item.orgao || "-"} />
                  <Info label="Validade" value={formatarData(item.validade)} />
                  <Info label="Usado em" value={formatarDataHora(item.usado_em)} />
                  <Info label="Envios" value={item.envios ?? 0} />
                  <Info label="Alterações" value={item.alteracoes ?? 0} />
                </div>

                {item.bloqueado_motivo && (
                  <p style={styles.warning}>Motivo do bloqueio: {item.bloqueado_motivo}</p>
                )}

                <div style={styles.actions}>
                  <button style={styles.actionButton} onClick={() => copiarCodigo(item.codigo)}>
                    Copiar código
                  </button>

                  {item.status !== STATUS.BLOQUEADO ? (
                    <button style={styles.dangerButton} onClick={() => alterarStatus(item, STATUS.BLOQUEADO)}>
                      Bloquear
                    </button>
                  ) : (
                    <button style={styles.successButton} onClick={() => alterarStatus(item, STATUS.ATIVO)}>
                      Ativar
                    </button>
                  )}

                  {item.status !== STATUS.DISPONIVEL && (
                    <button style={styles.neutralButton} onClick={() => alterarStatus(item, STATUS.DISPONIVEL)}>
                      Liberar de novo
                    </button>
                  )}
                </div>
              </article>
            ))
          )}
        </section>
      </main>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div style={styles.infoItem}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function badgeStyle(status) {
  if (status === STATUS.ATIVO) return { background: "#dcfce7", color: "#166534" };
  if (status === STATUS.BLOQUEADO) return { background: "#fee2e2", color: "#991b1b" };
  if (status === STATUS.VENCIDO) return { background: "#fef3c7", color: "#92400e" };
  return { background: "#dbeafe", color: "#1d4ed8" };
}

const styles = {
  loginPage: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #06111f 0%, #0f172a 55%, #172554 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    fontFamily: "Inter, Arial, sans-serif",
  },
  loginCard: {
    width: "100%",
    maxWidth: 420,
    background: "rgba(255,255,255,0.96)",
    borderRadius: 28,
    padding: 32,
    boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#2563eb",
    color: "white",
    fontWeight: 900,
    fontSize: 24,
    marginBottom: 18,
  },
  loginTitle: { margin: 0, color: "#0f172a", fontSize: 30 },
  loginText: { color: "#64748b", fontWeight: 700, marginBottom: 22 },
  hint: { display: "block", marginTop: 14, color: "#94a3b8", fontWeight: 700 },

  page: {
    minHeight: "100vh",
    background: "#eef2f7",
    color: "#0f172a",
    display: "flex",
    fontFamily: "Inter, Arial, sans-serif",
  },
  sidebar: {
    width: 260,
    background: "#0f172a",
    color: "white",
    padding: 24,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    position: "sticky",
    top: 0,
    height: "100vh",
  },
  brandBox: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    marginBottom: 32,
  },
  logoSmall: {
    width: 46,
    height: 46,
    borderRadius: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#2563eb",
    color: "white",
    fontWeight: 900,
  },
  mutedBlock: {
    display: "block",
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: 700,
    marginTop: 3,
  },
  menuActive: {
    width: "100%",
    padding: 14,
    borderRadius: 14,
    border: 0,
    background: "#2563eb",
    color: "white",
    fontWeight: 900,
    textAlign: "left",
    marginBottom: 10,
    cursor: "pointer",
  },
  menuButton: {
    width: "100%",
    padding: 14,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "transparent",
    color: "#cbd5e1",
    fontWeight: 900,
    textAlign: "left",
    cursor: "pointer",
  },
  logoutButton: {
    padding: 14,
    borderRadius: 14,
    border: 0,
    background: "#1e293b",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
  },
  main: {
    flex: 1,
    padding: 34,
    maxWidth: 1300,
    margin: "0 auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 20,
    marginBottom: 24,
  },
  eyebrow: {
    color: "#2563eb",
    fontWeight: 900,
    textTransform: "uppercase",
    fontSize: 13,
    letterSpacing: 1,
  },
  title: {
    fontSize: 42,
    margin: "6px 0 8px",
    letterSpacing: -1.2,
  },
  subtitle: {
    color: "#64748b",
    margin: 0,
    fontWeight: 700,
    maxWidth: 650,
  },
  generateButton: {
    border: 0,
    borderRadius: 18,
    padding: "16px 22px",
    background: "#16a34a",
    color: "white",
    fontSize: 16,
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 14px 30px rgba(22,163,74,0.25)",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(120px, 1fr))",
    gap: 14,
    marginBottom: 18,
  },
  statCard: {
    background: "white",
    border: "2px solid transparent",
    borderRadius: 22,
    padding: 18,
    textAlign: "left",
    cursor: "pointer",
    boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
  },
  statCardActive: {
    borderColor: "#2563eb",
    boxShadow: "0 12px 32px rgba(37,99,235,0.14)",
  },
  statNumber: {
    display: "block",
    fontSize: 30,
    fontWeight: 950,
  },
  statLabel: {
    display: "block",
    color: "#64748b",
    fontWeight: 900,
    marginTop: 4,
  },
  toolbar: {
    background: "white",
    borderRadius: 22,
    padding: 14,
    display: "flex",
    gap: 12,
    boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
    marginBottom: 18,
  },
  searchInput: {
    flex: 1,
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    borderRadius: 16,
    padding: "14px 16px",
    fontSize: 15,
    outline: "none",
    fontWeight: 700,
  },
  secondaryButton: {
    border: 0,
    borderRadius: 16,
    background: "#0f172a",
    color: "white",
    padding: "0 18px",
    fontWeight: 900,
    cursor: "pointer",
  },
  cardList: {
    display: "grid",
    gap: 16,
  },
  codeCard: {
    background: "white",
    borderRadius: 26,
    padding: 22,
    boxShadow: "0 12px 32px rgba(15,23,42,0.07)",
    border: "1px solid #e2e8f0",
  },
  codeHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    borderBottom: "1px solid #e2e8f0",
    paddingBottom: 16,
    marginBottom: 16,
  },
  codeLabel: {
    color: "#64748b",
    fontWeight: 900,
    fontSize: 13,
    textTransform: "uppercase",
  },
  code: {
    margin: "5px 0 0",
    fontSize: 30,
    letterSpacing: 1,
  },
  badge: {
    padding: "8px 12px",
    borderRadius: 999,
    fontWeight: 950,
    fontSize: 13,
    whiteSpace: "nowrap",
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(150px, 1fr))",
    gap: 10,
  },
  infoItem: {
    background: "#f8fafc",
    borderRadius: 16,
    padding: 13,
    border: "1px solid #e2e8f0",
  },
  actions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 16,
  },
  actionButton: {
    border: 0,
    borderRadius: 14,
    background: "#2563eb",
    color: "white",
    padding: "11px 14px",
    fontWeight: 900,
    cursor: "pointer",
  },
  dangerButton: {
    border: 0,
    borderRadius: 14,
    background: "#dc2626",
    color: "white",
    padding: "11px 14px",
    fontWeight: 900,
    cursor: "pointer",
  },
  successButton: {
    border: 0,
    borderRadius: 14,
    background: "#16a34a",
    color: "white",
    padding: "11px 14px",
    fontWeight: 900,
    cursor: "pointer",
  },
  neutralButton: {
    border: 0,
    borderRadius: 14,
    background: "#e2e8f0",
    color: "#0f172a",
    padding: "11px 14px",
    fontWeight: 900,
    cursor: "pointer",
  },
  warning: {
    margin: "14px 0 0",
    background: "#fff7ed",
    color: "#9a3412",
    border: "1px solid #fed7aa",
    padding: 12,
    borderRadius: 14,
    fontWeight: 800,
  },
  empty: {
    textAlign: "center",
    background: "white",
    borderRadius: 24,
    padding: 42,
    color: "#64748b",
    boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "15px 16px",
    borderRadius: 16,
    border: "1px solid #dbe3ef",
    marginBottom: 12,
    fontSize: 16,
    outline: "none",
    background: "#f8fafc",
    color: "#0f172a",
    fontWeight: 700,
  },
  primaryButton: {
    width: "100%",
    padding: 15,
    border: 0,
    borderRadius: 16,
    background: "#2563eb",
    color: "white",
    fontWeight: 950,
    fontSize: 16,
    cursor: "pointer",
  },
};

