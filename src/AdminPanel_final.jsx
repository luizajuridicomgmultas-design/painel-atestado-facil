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
  sidebar: "#171b24",
  sidebarLine: "#272d38",
  blue: "#3b7bf3",
  green: "#10b981",
  red: "#ef4444",
  yellow: "#f59e0b",
  text: "#111827",
  muted: "#7b8496",
  soft: "#5f697a",
  border: "#dfe4ec",
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
  if (status === STATUS.ATIVO) return { label: "Ativo", cls: "active" };
  if (status === STATUS.BLOQUEADO) return { label: "Bloqueado", cls: "blocked" };
  if (status === STATUS.VENCIDO) return { label: "Vencido", cls: "expired" };
  return { label: "Disponível", cls: "available" };
}

const Icon = ({ children, size = 18 }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

const I = {
  dashboard: <Icon><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></Icon>,
  key: <Icon><circle cx="7.5" cy="15.5" r="5.5" /><path d="m21 2-9.6 9.6" /><path d="m15 8 2 2" /><path d="m18 5 2 2" /></Icon>,
  users: <Icon><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /></Icon>,
  card: <Icon><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></Icon>,
  file: <Icon><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /></Icon>,
  settings: <Icon><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.32.4.7.6 1.1.6H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z" /></Icon>,
  download: <Icon><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></Icon>,
  plus: <Icon><path d="M12 5v14" /><path d="M5 12h14" /></Icon>,
  search: <Icon size={16}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></Icon>,
  filter: <Icon size={16}><path d="M4 6h16" /><path d="M8 12h8" /><path d="M11 18h2" /></Icon>,
  edit: <Icon size={16}><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></Icon>,
  copy: <Icon size={16}><rect x="9" y="9" width="13" height="13" rx="2" /><rect x="2" y="2" width="13" height="13" rx="2" /></Icon>,
  renew: <Icon size={16}><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M3 21v-5h5" /><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /></Icon>,
  lock: <Icon size={16}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></Icon>,
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
  const [toast, setToast] = useState(null);
  const [modalDetalhes, setModalDetalhes] = useState(null);
  const [modalBloqueio, setModalBloqueio] = useState(null);

  function aviso(texto, tipo = "ok") {
    setToast({ texto, tipo });
    setTimeout(() => setToast(null), 2600);
  }

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
      aviso("Erro ao carregar dados.", "erro");
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
      aviso("Login inválido.", "erro");
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
        aviso(`Código ${codigo} gerado e copiado.`);
        return;
      }

      if (!String(error.message || "").toLowerCase().includes("duplicate")) {
        console.error(error);
        setGerando(false);
        aviso("Erro ao gerar código.", "erro");
        return;
      }
    }

    setGerando(false);
    aviso("Não foi possível gerar código único.", "erro");
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
      aviso("Erro ao gerar lote.", "erro");
      return;
    }

    await carregar();
    aviso(`${qtd} códigos gerados.`);
  }

  async function copiarCodigo(codigo) {
    await navigator.clipboard?.writeText(codigo).catch(() => {});
    aviso(`Código ${codigo} copiado.`);
  }

  async function bloquear(row, motivo) {
    const { error } = await supabase
      .from("usuarios")
      .update({ status: STATUS.BLOQUEADO, bloqueado_motivo: motivo || "Bloqueio manual" })
      .eq("id", row.id);

    if (error) {
      aviso("Erro ao bloquear.", "erro");
      return;
    }

    setModalBloqueio(null);
    await carregar();
    aviso("Licença bloqueada.");
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
      aviso("Erro ao renovar.", "erro");
      return;
    }

    await carregar();
    aviso(`Renovado até ${formatarData(novaValidade)}.`);
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
          {toast && <Toast toast={toast} />}
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
            <MenuItem active={aba === "Faturamento"} onClick={() => setAba("Faturamento")} icon={I.card} label="Faturamento" />

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
              <button className="btn primary" onClick={gerarNovoCodigo}>{I.plus} {gerando ? "Gerando..." : "Novo código"}</button>
            </div>
          </header>

          {aba === "Dashboard" && (
            <>
              <section className="kpis">
                <Kpi label="Total de códigos" value={stats.total} small={`${stats.livre} disponíveis`} icon={I.key} color="blue" />
                <Kpi label="Ativos" value={stats.ativo} small="em uso" icon={I.users} color="green" />
                <Kpi label="Pendentes de pagamento" value={stats.pendente} small="aguardando" icon={I.card} color="yellow" />
                <Kpi label="Bloqueados / Vencidos" value={stats.bloqueado + stats.vencido} small="requer atenção" icon={I.lock} color="red" />
              </section>

              <section className="dashboard-only">
                <h2>Resumo do sistema</h2>
                <p>Use a aba Licenças para visualizar, copiar, renovar ou bloquear códigos.</p>
                <div>
                  <button className="btn primary" onClick={() => setAba("Licenças")}>Ir para licenças</button>
                  <button className="btn ghost" onClick={gerarNovoCodigo}>Gerar novo código</button>
                </div>
              </section>
            </>
          )}

          {aba === "Licenças" && (
            <>
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

              <LicenseTable
                title="Licenças"
                subtitle="Todos os códigos de acesso cadastrados"
                rows={lista}
                stats={stats}
                search={busca}
                setSearch={setBusca}
                copiarCodigo={copiarCodigo}
                renovar={renovar}
                abrirDetalhes={setModalDetalhes}
                abrirBloqueio={setModalBloqueio}
              />
            </>
          )}

          {aba === "Clientes" && (
            <LicenseTable
              title="Clientes"
              subtitle="Clientes que já se cadastraram pelo app"
              rows={lista}
              stats={stats}
              search={busca}
              setSearch={setBusca}
              copiarCodigo={copiarCodigo}
              renovar={renovar}
              abrirDetalhes={setModalDetalhes}
              abrirBloqueio={setModalBloqueio}
            />
          )}

          {aba === "Faturamento" && <SimpleTable title="Faturamento" rows={lista} type="pay" renovar={renovar} />}
          {aba === "Documentos" && <SimpleTable title="Documentos" rows={lista} type="docs" />}
          {aba === "Erros" && <SimpleTable title="Erros" rows={lista} type="errors" />}

          {toast && <Toast toast={toast} />}
          {modalDetalhes && <DetailsModal row={modalDetalhes} onClose={() => setModalDetalhes(null)} onRenovar={renovar} onBloquear={setModalBloqueio} />}
          {modalBloqueio && <BlockModal row={modalBloqueio} onClose={() => setModalBloqueio(null)} onConfirm={bloquear} />}
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

function Kpi({ label, value, small, icon, color }) {
  return (
    <article className={`kpi ${color}`}>
      <div className="kpi-top">
        <span>{label}</span>
        <i>{icon}</i>
      </div>
      <strong>{value}</strong>
      <p>{small}</p>
      <div className="fake-chart">
        {[1,2,3,4,5,6].map((n) => <b key={n} style={{ height: 8 + n * 4 }} />)}
      </div>
    </article>
  );
}

function LicenseTable({ title, subtitle, rows, stats, search, setSearch, copiarCodigo, renovar, abrirDetalhes, abrirBloqueio }) {
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
                    <button className="view" onClick={() => abrirDetalhes(row)}>{I.edit} Editar</button>
                    <button onClick={() => copiarCodigo(row.codigo)}>{I.copy} Copiar</button>
                    {(row.status === STATUS.ATIVO || row.status === STATUS.VENCIDO) && <button onClick={() => renovar(row)}>{I.renew} Renovar</button>}
                    <button className="danger" onClick={() => abrirBloqueio(row)}>{I.lock} Bloquear</button>
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

function Toast({ toast }) {
  return <div className={toast.tipo === "erro" ? "toast erro" : "toast"}>{toast.texto}</div>;
}

function DetailsModal({ row, onClose, onRenovar, onBloquear }) {
  const items = [
    ["Código", row.codigo],
    ["Status", row.status || "—"],
    ["Nome", row.nome || "—"],
    ["CPF", row.cpf || "—"],
    ["Telefone", row.telefone || "—"],
    ["E-mail", row.email || "—"],
    ["Cargo", row.cargo || "—"],
    ["Órgão", row.orgao || "—"],
    ["Validade", formatarData(row.validade)],
    ["Usado em", formatarDataHora(row.usado_em)],
    ["Envios", row.envios || 0],
    ["Alterações", row.alteracoes || 0],
  ];

  return (
    <div className="modal-bg">
      <div className="modal-card">
        <div className="modal-top">
          <div>
            <span>Licença</span>
            <h2>{row.codigo}</h2>
          </div>
          <button onClick={onClose}>Fechar</button>
        </div>

        <div className="details-grid">
          {items.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>

        <div className="modal-actions">
          <button className="btn primary" onClick={() => onRenovar(row)}>Renovar 90 dias</button>
          <button className="btn ghost" onClick={() => onBloquear(row)}>Bloquear</button>
        </div>
      </div>
    </div>
  );
}

function BlockModal({ row, onClose, onConfirm }) {
  const [motivo, setMotivo] = useState(row.bloqueado_motivo || "");

  return (
    <div className="modal-bg">
      <div className="modal-card small-modal">
        <div className="modal-top">
          <div>
            <span>Bloqueio</span>
            <h2>Bloquear licença {row.codigo}</h2>
          </div>
          <button onClick={onClose}>Fechar</button>
        </div>

        <label className="modal-label">
          Motivo do bloqueio
          <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Exemplo: pagamento vencido" />
        </label>

        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={() => onConfirm(row, motivo)}>Confirmar bloqueio</button>
        </div>
      </div>
    </div>
  );
}

function GlobalStyle() {
  return (
    <style>{`
      :root {
        --bg: #f6f7fb;
        --panel: #ffffff;
        --panel-soft: #f9fafc;
        --sidebar: #0f172a;
        --sidebar-soft: #182235;
        --primary: #2563eb;
        --primary-dark: #1d4ed8;
        --success: #10b981;
        --danger: #ef4444;
        --warning: #f59e0b;
        --text: #0f172a;
        --muted: #64748b;
        --soft: #94a3b8;
        --border: #e5e7eb;
        --shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
        --shadow-soft: 0 8px 22px rgba(15, 23, 42, 0.06);
        --radius: 18px;
      }

      * { box-sizing: border-box; }
      html, body, #root { margin: 0; min-height: 100%; width: 100%; background: var(--bg); }
      body { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: var(--text); }
      button, input, textarea { font: inherit; }
      button { -webkit-tap-highlight-color: transparent; }

      .login-page {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
        background:
          radial-gradient(circle at top left, rgba(37, 99, 235, .16), transparent 32%),
          radial-gradient(circle at bottom right, rgba(16, 185, 129, .12), transparent 32%),
          var(--bg);
      }

      .login-card {
        width: min(390px, 100%);
        background: rgba(255, 255, 255, .92);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(226, 232, 240, .9);
        border-radius: 24px;
        box-shadow: var(--shadow);
        padding: 30px;
      }

      .login-card h1 { margin: 18px 0 4px; font-size: 24px; letter-spacing: -.03em; }
      .login-card p { margin: 0 0 24px; color: var(--muted); }
      .login-card input {
        width: 100%;
        height: 46px;
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 0 14px;
        margin-bottom: 12px;
        outline: none;
        background: #f8fafc;
        transition: .18s ease;
      }
      .login-card input:focus { border-color: rgba(37, 99, 235, .55); background: #fff; box-shadow: 0 0 0 4px rgba(37,99,235,.1); }
      .login-card button {
        width: 100%;
        height: 46px;
        border: 0;
        border-radius: 12px;
        background: linear-gradient(135deg, var(--primary), #4f46e5);
        color: white;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 12px 24px rgba(37, 99, 235, .24);
      }

      .app-shell {
        width: 100%;
        min-height: 100vh;
        display: flex;
        background: var(--bg);
      }

      .sidebar {
        width: 256px;
        min-height: 100vh;
        background: linear-gradient(180deg, #0f172a 0%, #111827 100%);
        color: #cbd5e1;
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
        position: sticky;
        top: 0;
        box-shadow: 14px 0 34px rgba(15, 23, 42, .12);
      }

      .brand {
        height: 92px;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 0 20px;
        border-bottom: 1px solid rgba(148, 163, 184, .12);
      }

      .brand > div:last-child { display: block; min-width: 0; }
      .brand strong { display: block; color: #fff; font-size: 15px; letter-spacing: -.02em; }
      .brand span { display: block; color: #94a3b8; font-size: 12px; margin-top: 2px; }

      .brand-icon {
        width: 48px;
        height: 48px;
        background: linear-gradient(135deg, var(--primary), #7c3aed);
        color: #fff;
        border-radius: 16px;
        display: grid;
        place-items: center;
        font-weight: 800;
        box-shadow: 0 12px 26px rgba(37, 99, 235, .28);
        flex-shrink: 0;
      }

      .brand-icon.small { width: 46px; height: 46px; border-radius: 15px; font-size: 14px; }

      nav { flex: 1; padding: 18px 14px; overflow-y: auto; }
      .menu-title {
        display: block;
        margin: 18px 10px 8px;
        color: #64748b;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: .08em;
        text-transform: uppercase;
      }
      .menu-title:first-child { margin-top: 0; }

      .menu-item {
        width: 100%;
        height: 46px;
        border: 0;
        border-radius: 14px;
        background: transparent;
        color: #94a3b8;
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: pointer;
        margin-bottom: 6px;
        padding: 0 12px;
        position: relative;
        transition: .18s ease;
        text-align: left;
      }
      .menu-item svg { flex-shrink: 0; }
      .menu-item span { display: inline; flex: 1; font-size: 14px; font-weight: 650; }
      .menu-item small {
        min-width: 24px;
        height: 22px;
        padding: 0 7px;
        border-radius: 999px;
        background: rgba(148, 163, 184, .14);
        color: #e2e8f0;
        display: grid;
        place-items: center;
        font-size: 11px;
        font-weight: 800;
      }
      .menu-item:hover { background: rgba(255,255,255,.06); color: #e2e8f0; }
      .menu-item.active {
        background: linear-gradient(135deg, rgba(37, 99, 235, .95), rgba(79, 70, 229, .95));
        color: #fff;
        box-shadow: 0 10px 24px rgba(37, 99, 235, .22);
      }
      .menu-item.active small { background: rgba(255,255,255,.2); color: #fff; }

      .admin-card {
        margin: 14px;
        border: 1px solid rgba(148, 163, 184, .14);
        background: rgba(255,255,255,.06);
        border-radius: 18px;
        padding: 12px;
        color: #cbd5e1;
        display: flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
      }
      .admin-card div {
        width: 38px;
        height: 38px;
        border-radius: 13px;
        display: grid;
        place-items: center;
        background: rgba(255,255,255,.1);
        color: #fff;
        font-size: 13px;
        font-weight: 800;
      }
      .admin-card span { display: block; text-align: left; }
      .admin-card strong { display: block; color: #fff; font-size: 13px; }
      .admin-card small { display: block; color: #94a3b8; font-size: 12px; margin-top: 1px; }

      .main { flex: 1; min-width: 0; min-height: 100vh; display: flex; flex-direction: column; }
      .topbar {
        min-height: 82px;
        background: rgba(255, 255, 255, .86);
        backdrop-filter: blur(14px);
        border-bottom: 1px solid rgba(226, 232, 240, .9);
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 18px 32px;
        gap: 16px;
        position: sticky;
        top: 0;
        z-index: 10;
      }
      .topbar h1 { margin: 0; font-size: 24px; font-weight: 750; letter-spacing: -.04em; color: #0f172a; }
      .topbar h1 span { color: #cbd5e1; font-weight: 500; }
      .topbar p { margin: 4px 0 0; font-size: 14px; color: var(--muted); }
      .top-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
      .production {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        height: 36px;
        padding: 0 12px;
        border-radius: 999px;
        background: #ecfdf5;
        color: #047857;
        font-size: 13px;
        font-weight: 700;
      }
      .production i { width: 8px; height: 8px; border-radius: 99px; background: var(--success); box-shadow: 0 0 0 3px #bbf7d0; }

      .btn {
        min-height: 42px;
        border-radius: 12px;
        border: 1px solid var(--border);
        background: #fff;
        color: #475569;
        padding: 0 15px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 750;
        transition: .18s ease;
        white-space: nowrap;
      }
      .btn:hover { transform: translateY(-1px); box-shadow: var(--shadow-soft); }
      .btn.primary { background: linear-gradient(135deg, var(--primary), #4f46e5); border-color: transparent; color: #fff; box-shadow: 0 12px 24px rgba(37, 99, 235, .2); }
      .btn.ghost { background: #fff; }

      .kpis {
        display: grid;
        grid-template-columns: repeat(4, minmax(170px, 1fr));
        gap: 16px;
        padding: 26px 32px 0;
      }
      .kpi {
        min-height: 150px;
        background: var(--panel);
        border: 1px solid rgba(226,232,240,.9);
        border-radius: var(--radius);
        box-shadow: var(--shadow-soft);
        padding: 18px;
        overflow: hidden;
        position: relative;
      }
      .kpi::after {
        content: "";
        position: absolute;
        right: -38px;
        top: -38px;
        width: 96px;
        height: 96px;
        border-radius: 999px;
        background: rgba(37, 99, 235, .08);
      }
      .kpi-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; position: relative; z-index: 1; }
      .kpi-top span { color: var(--muted); font-size: 13px; line-height: 1.3; font-weight: 750; }
      .kpi-top i {
        width: 42px;
        height: 42px;
        border-radius: 14px;
        display: grid;
        place-items: center;
        font-style: normal;
        flex-shrink: 0;
      }
      .kpi.blue .kpi-top i { background: #eff6ff; color: var(--primary); }
      .kpi.green .kpi-top i { background: #ecfdf5; color: var(--success); }
      .kpi.red .kpi-top i { background: #fef2f2; color: var(--danger); }
      .kpi.yellow .kpi-top i { background: #fffbeb; color: var(--warning); }
      .kpi strong { display: block; margin-top: 12px; font-size: 30px; line-height: 1; font-weight: 800; letter-spacing: -.04em; color: #0f172a; position: relative; z-index: 1; }
      .kpi p { margin: 8px 0 0; color: var(--muted); font-size: 13px; font-weight: 650; position: relative; z-index: 1; }
      .fake-chart { display: flex; align-items: end; gap: 5px; height: 34px; margin-top: 12px; position: relative; z-index: 1; }
      .fake-chart b { width: 7px; border-radius: 99px; display: block; opacity: .9; }
      .kpi.blue .fake-chart b { background: #93c5fd; }
      .kpi.green .fake-chart b { background: #6ee7b7; }
      .kpi.yellow .fake-chart b { background: #fcd34d; }
      .kpi.red .fake-chart b { background: #fca5a5; }

      .dashboard-only, .generator, .table-card {
        background: var(--panel);
        border: 1px solid rgba(226,232,240,.9);
        border-radius: var(--radius);
        box-shadow: var(--shadow-soft);
      }
      .dashboard-only { margin: 22px 32px; padding: 22px; }
      .dashboard-only h2, .generator h2, .table-title h2 { margin: 0; font-size: 19px; font-weight: 800; letter-spacing: -.03em; }
      .dashboard-only p, .generator p, .table-title p { margin: 5px 0 0; color: var(--muted); font-size: 14px; }
      .dashboard-only div { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 18px; }

      .generator {
        margin: 26px 32px 0;
        padding: 18px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }
      .generator > div:last-child { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; justify-content: flex-end; }
      .generator input {
        width: 76px;
        height: 42px;
        border: 1px solid var(--border);
        border-radius: 12px;
        text-align: center;
        outline: none;
        background: #f8fafc;
      }

      .table-card { margin: 26px 32px; overflow: hidden; }
      .table-card.simple { margin-top: 26px; }
      .table-title {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        padding: 22px 22px 16px;
      }
      .chips { display: flex; gap: 7px; flex-wrap: wrap; justify-content: flex-end; }
      .chips span {
        border-radius: 999px;
        padding: 6px 10px;
        font-size: 12px;
        background: #f1f5f9;
        color: #475569;
        font-weight: 750;
      }
      .chips .ok { background: #ecfdf5; color: #047857; }
      .chips .trial { background: #eff6ff; color: #1d4ed8; }
      .chips .bad { background: #fef2f2; color: #dc2626; }

      .table-tools {
        display: flex;
        gap: 10px;
        align-items: center;
        padding: 14px 22px;
        border-top: 1px solid var(--border);
        border-bottom: 1px solid var(--border);
        background: #fbfcfe;
      }
      .table-tools label {
        width: 420px;
        max-width: 100%;
        height: 42px;
        border: 1px solid var(--border);
        border-radius: 12px;
        background: #fff;
        display: flex;
        align-items: center;
        gap: 9px;
        padding: 0 13px;
        color: var(--soft);
      }
      .table-tools input { flex: 1; border: 0; background: transparent; outline: none; color: var(--text); min-width: 0; }
      .table-tools button {
        height: 42px;
        border: 1px solid var(--border);
        border-radius: 12px;
        background: #fff;
        color: #475569;
        padding: 0 14px;
        display: inline-flex;
        align-items: center;
        gap: 7px;
        cursor: pointer;
        font-weight: 750;
      }
      .table-tools button:first-of-type { margin-left: auto; }

      .table-wrap { overflow-x: auto; }
      table { width: 100%; border-collapse: collapse; min-width: 880px; }
      th {
        padding: 13px 18px;
        text-align: left;
        color: #64748b;
        background: #f8fafc;
        font-size: 12px;
        font-weight: 850;
        letter-spacing: .04em;
        text-transform: uppercase;
        white-space: nowrap;
      }
      th.right { text-align: right; }
      td {
        padding: 14px 18px;
        border-top: 1px solid #eef2f7;
        color: #475569;
        font-size: 14px;
        vertical-align: middle;
      }
      tbody tr { transition: .16s ease; }
      tbody tr:hover { background: #f8fafc; }
      .code {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        color: #1d4ed8;
        background: #eff6ff;
        border: 1px solid #dbeafe;
        border-radius: 9px;
        padding: 5px 8px;
        font-weight: 850;
        display: inline-flex;
      }
      .client { display: flex; align-items: center; gap: 12px; min-width: 250px; }
      .client > div {
        width: 38px;
        height: 38px;
        border-radius: 14px;
        display: grid;
        place-items: center;
        background: linear-gradient(135deg, #eff6ff, #eef2ff);
        color: #2563eb;
        font-size: 13px;
        font-weight: 900;
        flex-shrink: 0;
      }
      .client strong { display: block; color: #0f172a; font-weight: 800; }
      .client small { display: block; color: #64748b; font-size: 12px; margin-top: 2px; max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

      .status {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        border-radius: 999px;
        padding: 6px 10px;
        font-size: 12px;
        font-weight: 850;
        white-space: nowrap;
      }
      .status i { width: 7px; height: 7px; border-radius: 99px; }
      .status.active { background: #ecfdf5; color: #047857; }
      .status.active i { background: var(--success); }
      .status.available { background: #eff6ff; color: #1d4ed8; }
      .status.available i { background: var(--primary); }
      .status.expired, .status.blocked { background: #fef2f2; color: #dc2626; }
      .status.expired i, .status.blocked i { background: var(--danger); }

      .actions { display: flex; gap: 7px; justify-content: flex-end; flex-wrap: wrap; min-width: 260px; }
      .actions button {
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 7px 10px;
        font-size: 13px;
        cursor: pointer;
        font-weight: 800;
        color: #475569;
        background: #fff;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        transition: .16s ease;
      }
      .actions button:hover { transform: translateY(-1px); box-shadow: 0 8px 16px rgba(15,23,42,.08); }
      .actions .view { background: #2563eb; color: #fff; border-color: #2563eb; }
      .actions .danger { background: #fff1f2; color: #e11d48; border-color: #ffe4e6; }

      .empty { text-align: center; color: var(--muted); padding: 34px; }
      .footer {
        border-top: 1px solid var(--border);
        min-height: 58px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        color: var(--muted);
        font-size: 13px;
        padding: 0 20px;
        background: #fbfcfe;
      }
      .footer div { display: flex; gap: 5px; }
      .footer button {
        width: 32px;
        height: 32px;
        border-radius: 9px;
        border: 1px solid var(--border);
        background: #fff;
        cursor: pointer;
        color: #475569;
        font-weight: 800;
      }
      .footer button.active { background: #2563eb; border-color: #2563eb; color: #fff; }

      .toast {
        position: fixed;
        right: 22px;
        top: 22px;
        z-index: 100;
        background: #0f172a;
        color: #fff;
        padding: 13px 16px;
        border-radius: 14px;
        box-shadow: 0 18px 50px rgba(15,23,42,.22);
        font-size: 14px;
        font-weight: 750;
      }
      .toast.erro { background: var(--danger); }

      .modal-bg {
        position: fixed;
        inset: 0;
        z-index: 80;
        background: rgba(15,23,42,.52);
        backdrop-filter: blur(5px);
        display: grid;
        place-items: center;
        padding: 22px;
      }
      .modal-card {
        width: min(880px, 100%);
        background: #fff;
        border-radius: 24px;
        box-shadow: 0 30px 100px rgba(15,23,42,.28);
        padding: 24px;
        max-height: calc(100vh - 44px);
        overflow: auto;
      }
      .small-modal { width: min(540px, 100%); }
      .modal-top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        border-bottom: 1px solid var(--border);
        padding-bottom: 16px;
        margin-bottom: 18px;
      }
      .modal-top span { display: block; color: #2563eb; text-transform: uppercase; font-size: 12px; letter-spacing: .08em; font-weight: 900; }
      .modal-top h2 { margin: 4px 0 0; font-size: 22px; font-weight: 850; letter-spacing: -.04em; }
      .modal-top button { border: 1px solid var(--border); background: #fff; border-radius: 11px; padding: 8px 12px; cursor: pointer; font-weight: 800; }
      .details-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
      .details-grid div { background: #f8fafc; border: 1px solid var(--border); border-radius: 14px; padding: 12px; }
      .details-grid span { display: block; color: var(--muted); font-size: 12px; margin-bottom: 4px; font-weight: 750; }
      .details-grid strong { display: block; color: var(--text); word-break: break-word; font-size: 14px; }
      .modal-actions { display: flex; gap: 10px; margin-top: 18px; flex-wrap: wrap; }
      .modal-label { display: grid; gap: 8px; color: #475569; font-size: 14px; font-weight: 750; }
      .modal-label textarea { width: 100%; min-height: 120px; resize: vertical; border: 1px solid var(--border); border-radius: 14px; padding: 12px; outline: none; background: #f8fafc; }
      .modal-label textarea:focus { background: #fff; border-color: rgba(37,99,235,.55); box-shadow: 0 0 0 4px rgba(37,99,235,.1); }

      @media (max-width: 1180px) {
        .sidebar { width: 88px; }
        .brand { justify-content: center; padding: 0; }
        .brand > div:last-child, .menu-title, .menu-item span, .admin-card span { display: none; }
        nav { padding: 14px; }
        .menu-item { width: 60px; height: 54px; justify-content: center; padding: 0; }
        .admin-card { justify-content: center; padding: 10px; }
        .kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .details-grid { grid-template-columns: repeat(2, 1fr); }
      }

      @media (max-width: 760px) {
        .app-shell { display: block; }
        .sidebar {
          width: 100%;
          min-height: auto;
          height: auto;
          position: relative;
          display: block;
          box-shadow: none;
        }
        .brand { height: 72px; justify-content: flex-start; padding: 0 16px; }
        .brand > div:last-child { display: block; }
        nav { display: flex; gap: 8px; overflow-x: auto; padding: 10px 14px 14px; }
        .menu-title { display: none; }
        .menu-item { min-width: 54px; width: 54px; height: 48px; margin: 0; border-radius: 14px; }
        .admin-card { display: none; }
        .topbar { position: relative; min-height: auto; padding: 18px 16px; flex-direction: column; align-items: flex-start; }
        .topbar h1 { font-size: 21px; }
        .top-actions { width: 100%; justify-content: flex-start; }
        .btn, .table-tools button { flex: 1; min-width: 135px; }
        .production { width: 100%; justify-content: center; }
        .kpis { grid-template-columns: 1fr; padding: 18px 16px 0; }
        .dashboard-only, .generator, .table-card { margin-left: 16px; margin-right: 16px; }
        .generator { flex-direction: column; align-items: flex-start; }
        .generator > div:last-child { width: 100%; justify-content: flex-start; }
        .table-title { flex-direction: column; align-items: flex-start; }
        .chips { justify-content: flex-start; }
        .table-tools { flex-wrap: wrap; }
        .table-tools label { width: 100%; }
        .table-tools button:first-of-type { margin-left: 0; }
        table { min-width: 760px; }
        .footer { flex-direction: column; align-items: flex-start; gap: 10px; padding: 14px 16px; }
        .details-grid { grid-template-columns: 1fr; }
      }
    `}</style>
  );
}
