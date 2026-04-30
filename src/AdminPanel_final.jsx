import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

const ADMIN_USER = "admin";
const ADMIN_PASS = "1234";

const STATUS = {
  DISPONIVEL: "Disponível",
  ATIVO: "Ativo",
  BLOQUEADO: "Bloqueado",
  VENCIDO: "Vencido",
};

const colors = {
  bg: "#f3f4f6",
  sidebar: "#111827",
  sidebarLine: "#1f2937",
  blue: "#1d4ed8",
  green: "#059669",
  red: "#dc2626",
  yellow: "#d97706",
  text: "#111827",
  muted: "#9ca3af",
  soft: "#6b7280",
  border: "#e5e7eb",
  white: "#ffffff",
};

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
    return new Date(`${data}T12:00:00`).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
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
  const partes = nome.trim().split(" ").filter(Boolean);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

function statusView(status) {
  if (status === STATUS.ATIVO) return { label: "Ativa", cls: "active" };
  if (status === STATUS.BLOQUEADO) return { label: "Bloqueada", cls: "expired" };
  if (status === STATUS.VENCIDO) return { label: "Expirada", cls: "expired" };
  return { label: "Livre", cls: "trial" };
}

const Icon = ({ children, size = 16 }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

const I = {
  dashboard: <Icon><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></Icon>,
  key: <Icon><circle cx="7.5" cy="15.5" r="5.5" /><path d="m21 2-9.6 9.6" /><path d="m15 8 2 2" /><path d="m18 5 2 2" /></Icon>,
  users: <Icon><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /></Icon>,
  dollar: <Icon><path d="M12 1v22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6" /></Icon>,
  file: <Icon><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /></Icon>,
  settings: <Icon><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.32.4.7.6 1.1.6H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z" /></Icon>,
  download: <Icon><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></Icon>,
  plus: <Icon><path d="M12 5v14" /><path d="M5 12h14" /></Icon>,
  search: <Icon><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></Icon>,
  filter: <Icon><path d="M4 6h16" /><path d="M8 12h8" /><path d="M11 18h2" /></Icon>,
};

export default function AdminPanel() {
  const [logado, setLogado] = useState(() => localStorage.getItem("painel_atestado_logado") === "sim");
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [aba, setAba] = useState("Dashboard");
  const [usuarios, setUsuarios] = useState([]);
  const [busca, setBusca] = useState("");
  const [lote, setLote] = useState(5);
  const [carregando, setCarregando] = useState(false);
  const [gerando, setGerando] = useState(false);

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
      alert("Erro ao carregar dados.");
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

  async function bloquear(row) {
    const motivo = prompt("Motivo do bloqueio:", row.bloqueado_motivo || "") || "Bloqueio manual";
    const { error } = await supabase.from("usuarios").update({ status: STATUS.BLOQUEADO, bloqueado_motivo: motivo }).eq("id", row.id);
    if (error) {
      alert("Erro ao bloquear.");
      return;
    }
    carregar();
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
      alert("Erro ao renovar.");
      return;
    }

    carregar();
    alert(`Renovado até ${formatarData(novaValidade)}.`);
  }

  const stats = useMemo(() => {
    const ativo = usuarios.filter((u) => u.status === STATUS.ATIVO).length;
    const livre = usuarios.filter((u) => u.status === STATUS.DISPONIVEL).length;
    const vencido = usuarios.filter((u) => u.status === STATUS.VENCIDO).length;
    const bloqueado = usuarios.filter((u) => u.status === STATUS.BLOQUEADO).length;
    const clientes = usuarios.filter((u) => u.nome).length;
    const erros = usuarios.filter((u) => u.ultimo_erro).length;
    const pendente = usuarios.filter((u) => (u.pagamento_status || "Pendente") !== "Pago").length;
    return { total: usuarios.length, ativo, livre, vencido, bloqueado, clientes, erros, pendente };
  }, [usuarios]);

  const lista = useMemo(() => {
    const termo = busca.toLowerCase().trim();
    return usuarios.filter((u) => {
      const texto = `${u.codigo || ""} ${u.nome || ""} ${u.email || ""} ${u.telefone || ""} ${u.cpf || ""}`.toLowerCase();
      const match = !termo || texto.includes(termo);

      if (aba === "Clientes") return match && u.nome;
      if (aba === "Faturamento") return match && u.nome;
      if (aba === "Documentos") return match && u.nome;
      if (aba === "Erros") return match && u.ultimo_erro;
      return match;
    });
  }, [usuarios, busca, aba]);

  if (!logado) {
    return (
      <>
        <GlobalStyle />
        <div className="login-page">
          <form className="login-card" onSubmit={entrar}>
            <div className="brand-icon">AF</div>
            <h1>Atestado Fácil</h1>
            <p>Painel administrativo</p>
            <input placeholder="Usuário" value={login} onChange={(e) => setLogin(e.target.value)} />
            <input placeholder="Senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} />
            <button type="submit">Entrar</button>
          </form>
        </div>
      </>
    );
  }

  return (
    <>
      <GlobalStyle />
      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-icon small">AF</div>
            <div>
              <strong>Atestado Fácil</strong>
              <span>Painel ADM</span>
            </div>
          </div>

          <nav>
            <MenuTitle>Principal</MenuTitle>
            <MenuItem active={aba === "Dashboard"} onClick={() => setAba("Dashboard")} icon={I.dashboard} label="Dashboard" />
            <MenuItem active={aba === "Licenças"} onClick={() => setAba("Licenças")} icon={I.key} label="Licenças" badge={stats.total} />
            <MenuItem active={aba === "Clientes"} onClick={() => setAba("Clientes")} icon={I.users} label="Clientes" badge={stats.clientes} />
            <MenuItem active={aba === "Faturamento"} onClick={() => setAba("Faturamento")} icon={I.dollar} label="Faturamento" />

            <MenuTitle>Sistema</MenuTitle>
            <MenuItem active={aba === "Documentos"} onClick={() => setAba("Documentos")} icon={I.file} label="Documentos" />
            <MenuItem active={aba === "Erros"} onClick={() => setAba("Erros")} icon={I.file} label="Erros" badge={stats.erros} />
            <MenuItem onClick={carregar} icon={I.settings} label={carregando ? "Atualizando..." : "Atualizar"} />
          </nav>

          <button className="admin-card" onClick={sair}>
            <div>AD</div>
            <span>
              <strong>Admin</strong>
              <small>Sair</small>
            </span>
          </button>
        </aside>

        <main className="main">
          <header className="topbar">
            <div>
              <h1>{aba} <span>·</span> Visão Geral</h1>
              <p>{new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })} — {carregando ? "atualizando" : "atualizado"}</p>
            </div>

            <div className="top-actions">
              <span className="production"><i /> Produção</span>
              <button className="btn ghost">{I.download} Exportar</button>
              <button className="btn primary" onClick={gerarNovoCodigo}>{I.plus} {gerando ? "Gerando..." : "Nova Licença"}</button>
            </div>
          </header>

          {(aba === "Dashboard" || aba === "Licenças") && (
            <section className="kpis">
              <Kpi label="Licenças Ativas" value={stats.ativo} icon={I.key} color="blue" />
              <Kpi label="Códigos Livres" value={stats.livre} icon={I.dollar} color="green" />
              <Kpi label="Bloqueadas/Vencidas" value={stats.bloqueado + stats.vencido} icon={I.file} color="red" />
              <Kpi label="Erros Abertos" value={stats.erros} icon={I.file} color="yellow" />
            </section>
          )}

          {aba === "Licenças" && (
            <section className="generator">
              <div>
                <h2>Gerar licenças</h2>
                <p>Código de 5 dígitos, sem hífen, vinculado pelo app.</p>
              </div>
              <div>
                <button className="btn primary" onClick={gerarNovoCodigo}>Gerar 1</button>
                <input type="number" min="1" max="100" value={lote} onChange={(e) => setLote(e.target.value)} />
                <button className="btn ghost" onClick={gerarLote}>Gerar lote</button>
              </div>
            </section>
          )}

          {aba === "Faturamento" ? (
            <SimpleTable title="Faturamento" rows={lista} type="pay" renovar={renovar} />
          ) : aba === "Documentos" ? (
            <SimpleTable title="Documentos" rows={lista} type="docs" />
          ) : aba === "Erros" ? (
            <SimpleTable title="Erros" rows={lista} type="errors" />
          ) : (
            <LicenseTable
              title={aba === "Clientes" ? "Clientes — Todas as Contas" : "Licenças — Todas as Contas"}
              subtitle={aba === "Clientes" ? "Clientes que já se cadastraram pelo app" : "Gerencie, filtre e exporte registros de licença"}
              rows={lista}
              stats={stats}
              search={busca}
              setSearch={setBusca}
              copiarCodigo={copiarCodigo}
              renovar={renovar}
              bloquear={bloquear}
            />
          )}
        </main>
      </div>
    </>
  );
}

function MenuTitle({ children }) {
  return <div className="menu-title">{children}</div>;
}

function MenuItem({ active, onClick, icon, label, badge }) {
  return (
    <button className={active ? "menu-item active" : "menu-item"} onClick={onClick}>
      {icon}
      <span>{label}</span>
      {badge !== undefined ? <small>{badge}</small> : null}
    </button>
  );
}

function Kpi({ label, value, icon, color }) {
  return (
    <article className={`kpi ${color}`}>
      <div className="kpi-top">
        <span>{label}</span>
        <i>{icon}</i>
      </div>
      <strong>{value}</strong>
      <em />
    </article>
  );
}

function LicenseTable({ title, subtitle, rows, stats, search, setSearch, copiarCodigo, renovar, bloquear }) {
  return (
    <section className="table-card">
      <div className="table-title">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>

        <div className="chips">
          <span>Total: {stats.total}</span>
          <span className="ok">Ativas: {stats.ativo}</span>
          <span className="trial">Livres: {stats.livre}</span>
          <span className="bad">Expiradas: {stats.vencido}</span>
        </div>
      </div>

      <div className="table-tools">
        <label>
          {I.search}
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por código ou cliente..." />
        </label>
        <button>{I.filter} Filtrar</button>
        <button>{I.download} Exportar</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Cliente</th>
              <th>Status</th>
              <th>Validade</th>
              <th className="right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan="5" className="empty">Nenhum registro encontrado.</td></tr>
            ) : rows.map((row) => (
              <tr key={row.id}>
                <td><span className="code">{row.codigo}</span></td>
                <td>
                  <div className="client">
                    <div>{iniciais(row.nome)}</div>
                    <span>
                      <strong>{row.nome || "Aguardando dados"}</strong>
                      <small>{row.email || row.telefone || "Cliente ainda não vinculado"}</small>
                    </span>
                  </div>
                </td>
                <td><StatusBadge status={row.status} /></td>
                <td>{formatarData(row.validade)}</td>
                <td>
                  <div className="actions">
                    <button className="view" onClick={() => alert(detalhes(row))}>Ver</button>
                    <button onClick={() => copiarCodigo(row.codigo)}>Copiar</button>
                    {(row.status === STATUS.ATIVO || row.status === STATUS.VENCIDO) && <button onClick={() => renovar(row)}>Renovar</button>}
                    <button className="danger" onClick={() => bloquear(row)}>Revogar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="footer">
        <span>Mostrando {rows.length} de {stats.total} registros</span>
        <div>
          <button>‹</button><button className="active">1</button><button>2</button><button>3</button><button>…</button><button>›</button>
        </div>
      </div>
    </section>
  );
}

function SimpleTable({ title, rows, type, renovar }) {
  return (
    <section className="table-card simple">
      <div className="table-title">
        <div>
          <h2>{title}</h2>
          <p>Registros do sistema</p>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Código</th>
              <th>Informação</th>
              <th>Validade</th>
              {type === "pay" && <th className="right">Ação</th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan="5" className="empty">Nenhum registro encontrado.</td></tr>
            ) : rows.map((row) => (
              <tr key={row.id}>
                <td>{row.nome || row.codigo}</td>
                <td><span className="code">{row.codigo}</span></td>
                <td>{type === "errors" ? row.ultimo_erro : type === "docs" ? (row.termos_pdf || "Sem termos PDF") : (row.pagamento_status || "Pendente")}</td>
                <td>{formatarData(row.validade)}</td>
                {type === "pay" && <td><div className="actions"><button className="view" onClick={() => renovar(row)}>Renovar</button></div></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StatusBadge({ status }) {
  const view = statusView(status);
  return <span className={`status ${view.cls}`}><i />{view.label}</span>;
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

function GlobalStyle() {
  return (
    <style>{`
      * { box-sizing: border-box; }
      html, body, #root { margin: 0; min-height: 100%; width: 100%; background: ${colors.bg}; }
      body { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: ${colors.text}; }
      button, input { font: inherit; }

      .login-page {
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: ${colors.bg};
      }

      .login-card {
        width: 360px;
        background: ${colors.white};
        border: 1px solid ${colors.border};
        border-radius: 12px;
        box-shadow: ${"0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)"};
        padding: 28px;
      }

      .login-card h1 { margin: 18px 0 4px; font-size: 22px; }
      .login-card p { margin: 0 0 22px; color: ${colors.muted}; }
      .login-card input {
        width: 100%;
        height: 42px;
        border: 1px solid ${colors.border};
        border-radius: 7px;
        padding: 0 12px;
        margin-bottom: 10px;
        outline: none;
      }
      .login-card button {
        width: 100%;
        height: 42px;
        border: 0;
        border-radius: 7px;
        background: ${colors.blue};
        color: white;
        font-weight: 600;
        cursor: pointer;
      }

      .app-shell {
        width: 100vw;
        min-height: 100vh;
        display: flex;
        background: ${colors.bg};
        overflow-x: hidden;
      }

      .sidebar {
        width: 220px;
        min-height: 100vh;
        background: ${colors.sidebar};
        color: ${colors.sidebarText};
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
      }

      .brand {
        height: 64px;
        border-bottom: 1px solid ${colors.sidebarLine};
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 0 20px;
      }

      .brand-icon {
        width: 38px;
        height: 38px;
        background: ${colors.blue};
        color: #fff;
        border-radius: 8px;
        display: grid;
        place-items: center;
        font-weight: 700;
      }

      .brand-icon.small {
        width: 30px;
        height: 30px;
        border-radius: 7px;
        font-size: 12px;
      }

      .brand strong {
        display: block;
        color: #fff;
        font-size: 15px;
      }

      .brand span {
        display: block;
        margin-top: 2px;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: .5px;
      }

      nav {
        flex: 1;
        padding: 14px 12px;
      }

      .menu-title {
        padding: 14px 8px 7px;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #374151;
        font-weight: 700;
      }

      .menu-item {
        width: 100%;
        min-height: 40px;
        border: 0;
        border-radius: 6px;
        background: transparent;
        color: ${colors.sidebarText};
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 0 10px;
        cursor: pointer;
        margin-bottom: 2px;
      }

      .menu-item span {
        flex: 1;
        text-align: left;
        font-size: 13.5px;
      }

      .menu-item small {
        min-width: 25px;
        height: 20px;
        border-radius: 99px;
        background: #374151;
        color: #9ca3af;
        display: grid;
        place-items: center;
        font-size: 10px;
      }

      .menu-item.active {
        background: ${colors.blue};
        color: #fff;
      }

      .menu-item.active small {
        background: rgba(255,255,255,.2);
        color: #fff;
      }

      .admin-card {
        border: 0;
        background: transparent;
        border-top: 1px solid ${colors.sidebarLine};
        padding: 14px 20px;
        color: ${colors.sidebarText};
        display: flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
        text-align: left;
      }

      .admin-card div {
        width: 30px;
        height: 30px;
        border-radius: 99px;
        display: grid;
        place-items: center;
        background: linear-gradient(135deg,#1D4ED8,#7C3AED);
        color: #fff;
        font-size: 11px;
        font-weight: 700;
      }

      .admin-card strong {
        display: block;
        color: #d1d5db;
        font-size: 12.5px;
      }

      .admin-card small {
        display: block;
        color: ${colors.sidebarText};
        font-size: 11px;
      }

      .main {
        flex: 1;
        min-width: 0;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
      }

      .topbar {
        height: 64px;
        background: ${colors.white};
        border-bottom: 1px solid ${colors.border};
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 28px;
        gap: 16px;
        position: sticky;
        top: 0;
        z-index: 10;
      }

      .topbar h1 {
        margin: 0;
        font-size: 16px;
        font-weight: 700;
      }

      .topbar p {
        margin: 2px 0 0;
        font-size: 12px;
        color: ${colors.muted};
      }

      .top-actions {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .production {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: ${colors.soft};
      }

      .production i {
        width: 8px;
        height: 8px;
        border-radius: 99px;
        background: #10b981;
        box-shadow: 0 0 0 2px #d1fae5;
      }

      .btn {
        height: 36px;
        border-radius: 6px;
        border: 1px solid ${colors.border};
        background: transparent;
        color: ${colors.soft};
        padding: 0 14px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
      }

      .btn.primary {
        background: ${colors.blue};
        border-color: ${colors.blue};
        color: #fff;
      }

      .btn.ghost {
        background: ${colors.white};
      }

      .kpis {
        display: grid;
        grid-template-columns: repeat(4, minmax(180px, 1fr));
        gap: 16px;
        padding: 28px 28px 0;
      }

      .kpi {
        min-height: 145px;
        background: ${colors.white};
        border: 1px solid ${colors.border};
        border-radius: 10px;
        box-shadow: ${"0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)"};
        padding: 20px 22px;
      }

      .kpi-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .kpi-top span {
        color: ${colors.muted};
        text-transform: uppercase;
        font-size: 12px;
        font-weight: 600;
        letter-spacing: .6px;
      }

      .kpi-top i {
        width: 30px;
        height: 30px;
        border-radius: 6px;
        display: grid;
        place-items: center;
        font-style: normal;
      }

      .kpi.blue .kpi-top i { background: ${colors.blueLight}; color: ${colors.blue}; }
      .kpi.green .kpi-top i { background: ${colors.greenLight}; color: ${colors.green}; }
      .kpi.red .kpi-top i { background: ${colors.redLight}; color: ${colors.red}; }
      .kpi.yellow .kpi-top i { background: ${colors.yellowLight}; color: ${colors.yellow}; }

      .kpi strong {
        display: block;
        margin-top: 22px;
        font-size: 26px;
        font-weight: 400;
      }

      .kpi em {
        display: block;
        width: 58%;
        height: 10px;
        border-radius: 99px;
        background: #f3f4f6;
        margin-top: 20px;
      }

      .generator {
        margin: 28px 28px 0;
        background: ${colors.white};
        border: 1px solid ${colors.border};
        border-radius: 10px;
        box-shadow: ${"0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)"};
        padding: 16px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }

      .generator h2 {
        margin: 0;
        font-size: 16px;
      }

      .generator p {
        margin: 3px 0 0;
        color: ${colors.muted};
        font-size: 13px;
      }

      .generator div:last-child {
        display: flex;
        gap: 10px;
        align-items: center;
      }

      .generator input {
        width: 70px;
        height: 36px;
        border: 1px solid ${colors.border};
        border-radius: 6px;
        text-align: center;
      }

      .table-card {
        margin: 28px;
        background: ${colors.white};
        border: 1px solid ${colors.border};
        border-radius: 10px;
        box-shadow: ${"0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)"};
        overflow: hidden;
      }

      .table-card.simple {
        margin-top: 28px;
      }

      .table-title {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 16px;
        padding: 20px;
      }

      .table-title h2 {
        margin: 0;
        font-size: 15px;
      }

      .table-title p {
        margin: 3px 0 0;
        color: ${colors.muted};
        font-size: 12px;
      }

      .chips {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }

      .chips span {
        border-radius: 99px;
        padding: 4px 10px;
        font-size: 11.5px;
        background: #f3f4f6;
        color: ${colors.soft};
      }

      .chips .ok { background: ${colors.greenLight}; color: ${colors.green}; }
      .chips .trial { background: ${colors.blueLight}; color: ${colors.blue}; }
      .chips .bad { background: ${colors.redLight}; color: ${colors.red}; }

      .table-tools {
        display: flex;
        gap: 8px;
        align-items: center;
        padding: 14px 20px;
        border-top: 1px solid ${colors.border};
        border-bottom: 1px solid ${colors.border};
      }

      .table-tools label {
        width: 320px;
        max-width: 100%;
        height: 38px;
        border: 1px solid ${colors.border};
        border-radius: 6px;
        background: ${colors.bg};
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 0 12px;
        color: ${colors.muted};
      }

      .table-tools input {
        flex: 1;
        border: 0;
        background: transparent;
        outline: none;
        color: ${colors.text};
        min-width: 0;
      }

      .table-tools button {
        height: 38px;
        border: 1px solid ${colors.border};
        border-radius: 6px;
        background: ${colors.white};
        color: ${colors.soft};
        padding: 0 12px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
      }

      .table-tools button:first-of-type {
        margin-left: auto;
      }

      .table-wrap {
        overflow-x: auto;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        min-width: 850px;
      }

      th {
        padding: 11px 16px;
        text-align: left;
        color: ${colors.muted};
        font-size: 11px;
        font-weight: 700;
        letter-spacing: .7px;
        text-transform: uppercase;
        white-space: nowrap;
      }

      th.right {
        text-align: right;
      }

      td {
        padding: 13px 16px;
        border-top: 1px solid #f3f4f6;
        color: ${colors.soft};
        font-size: 13px;
      }

      .code {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        color: ${colors.blue};
        font-weight: 600;
      }

      .client {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .client > div {
        width: 28px;
        height: 28px;
        border-radius: 99px;
        display: grid;
        place-items: center;
        background: ${colors.blue};
        color: #fff;
        font-size: 11px;
        font-weight: 700;
        flex-shrink: 0;
      }

      .client strong {
        display: block;
        color: ${colors.text};
        font-weight: 600;
      }

      .client small {
        display: block;
        color: ${colors.muted};
        font-size: 11.5px;
      }

      .status {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        border-radius: 99px;
        padding: 3px 9px;
        font-size: 11.5px;
        font-weight: 600;
      }

      .status i {
        width: 6px;
        height: 6px;
        border-radius: 99px;
      }

      .status.active { background: ${colors.greenLight}; color: ${colors.green}; }
      .status.active i { background: ${colors.green}; }
      .status.trial { background: ${colors.blueLight}; color: ${colors.blue}; }
      .status.trial i { background: ${colors.blue}; }
      .status.expired { background: ${colors.redLight}; color: ${colors.red}; }
      .status.expired i { background: ${colors.red}; }

      .actions {
        display: flex;
        gap: 4px;
        justify-content: flex-end;
        flex-wrap: wrap;
      }

      .actions button {
        border: 0;
        border-radius: 6px;
        padding: 5px 10px;
        font-size: 12px;
        cursor: pointer;
        font-weight: 600;
        color: ${colors.soft};
        background: #f3f4f6;
      }

      .actions .view {
        background: ${colors.blueLight};
        color: ${colors.blue};
      }

      .actions .danger {
        background: ${colors.redLight};
        color: ${colors.red};
      }

      .empty {
        text-align: center;
        color: ${colors.muted};
        padding: 32px;
      }

      .footer {
        border-top: 1px solid ${colors.border};
        min-height: 52px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        color: ${colors.muted};
        font-size: 12px;
        padding: 0 20px;
      }

      .footer div {
        display: flex;
        gap: 4px;
      }

      .footer button {
        width: 28px;
        height: 28px;
        border-radius: 6px;
        border: 1px solid ${colors.border};
        background: ${colors.white};
        cursor: pointer;
        color: ${colors.soft};
      }

      .footer button.active {
        background: ${colors.blue};
        border-color: ${colors.blue};
        color: #fff;
      }

      @media (max-width: 1100px) {
        .sidebar { width: 210px; }
        .kpis { grid-template-columns: repeat(2, 1fr); }
        .topbar { align-items: flex-start; height: auto; padding: 18px; flex-direction: column; }
        .top-actions { width: 100%; flex-wrap: wrap; }
      }
    `}</style>
  );
}