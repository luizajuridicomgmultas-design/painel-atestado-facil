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
  if (status === STATUS.BLOQUEADO)
    return { label: "Bloqueado", cls: "blocked" };
  if (status === STATUS.VENCIDO) return { label: "Vencido", cls: "expired" };
  return { label: "Disponível", cls: "available" };
}

const Icon = ({ children, size = 18 }) => (
  <svg
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);

const I = {
  dashboard: (
    <Icon>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </Icon>
  ),
  key: (
    <Icon>
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="m21 2-9.6 9.6" />
      <path d="m15 8 2 2" />
      <path d="m18 5 2 2" />
    </Icon>
  ),
  users: (
    <Icon>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    </Icon>
  ),
  card: (
    <Icon>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </Icon>
  ),
  file: (
    <Icon>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
    </Icon>
  ),
  settings: (
    <Icon>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.32.4.7.6 1.1.6H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z" />
    </Icon>
  ),
  download: (
    <Icon>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </Icon>
  ),
  plus: (
    <Icon>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </Icon>
  ),
  search: (
    <Icon size={16}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </Icon>
  ),
  filter: (
    <Icon size={16}>
      <path d="M4 6h16" />
      <path d="M8 12h8" />
      <path d="M11 18h2" />
    </Icon>
  ),
  edit: (
    <Icon size={16}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </Icon>
  ),
  copy: (
    <Icon size={16}>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <rect x="2" y="2" width="13" height="13" rx="2" />
    </Icon>
  ),
  renew: (
    <Icon size={16}>
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
    </Icon>
  ),
  lock: (
    <Icon size={16}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </Icon>
  ),
};

export default function AdminPanel() {
  const [logado, setLogado] = useState(
    () => localStorage.getItem("painel_atestado_logado") === "sim",
  );
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
      const { error } = await supabase
        .from("usuarios")
        .insert([
          {
            codigo,
            status: STATUS.DISPONIVEL,
            sistema: "",
            pagamento_status: "Pendente",
          },
        ]);

      if (!error) {
        await carregar();
        await navigator.clipboard?.writeText(codigo).catch(() => {});
        setGerando(false);
        aviso(`Código ${codigo} gerado e copiado.`);
        return;
      }

      if (
        !String(error.message || "")
          .toLowerCase()
          .includes("duplicate")
      ) {
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
      .update({
        status: STATUS.BLOQUEADO,
        bloqueado_motivo: motivo || "Bloqueio manual",
      })
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
    const bloqueado = usuarios.filter(
      (u) => u.status === STATUS.BLOQUEADO,
    ).length;
    const clientes = usuarios.filter((u) => u.nome).length;
    const erros = usuarios.filter((u) => u.ultimo_erro).length;
    const pendente = usuarios.filter(
      (u) => (u.pagamento_status || "Pendente") !== "Pago",
    ).length;
    return {
      total: usuarios.length,
      ativo,
      livre,
      vencido,
      bloqueado,
      clientes,
      erros,
      pendente,
    };
  }, [usuarios]);

  const lista = useMemo(() => {
    const termo = busca.toLowerCase().trim();
    return usuarios.filter((u) => {
      const texto =
        `${u.codigo || ""} ${u.nome || ""} ${u.email || ""} ${u.telefone || ""} ${u.cpf || ""}`.toLowerCase();
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
            <input
              placeholder="Usuário"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
            />
            <input
              placeholder="Senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
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
            <MenuItem
              active={aba === "Dashboard"}
              onClick={() => setAba("Dashboard")}
              icon={I.dashboard}
              label="Dashboard"
            />
            <MenuItem
              active={aba === "Licenças"}
              onClick={() => setAba("Licenças")}
              icon={I.key}
              label="Licenças"
              badge={stats.total}
            />
            <MenuItem
              active={aba === "Clientes"}
              onClick={() => setAba("Clientes")}
              icon={I.users}
              label="Clientes"
              badge={stats.clientes}
            />
            <MenuItem
              active={aba === "Faturamento"}
              onClick={() => setAba("Faturamento")}
              icon={I.card}
              label="Faturamento"
            />

            <MenuTitle>Sistema</MenuTitle>
            <MenuItem
              active={aba === "Documentos"}
              onClick={() => setAba("Documentos")}
              icon={I.file}
              label="Documentos"
            />
            <MenuItem
              active={aba === "Erros"}
              onClick={() => setAba("Erros")}
              icon={I.file}
              label="Erros"
              badge={stats.erros}
            />
            <MenuItem
              onClick={carregar}
              icon={I.settings}
              label={carregando ? "Atualizando..." : "Atualizar"}
            />
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
              <h1>
                {aba} <span>·</span> Visão Geral
              </h1>
              <p>
                {new Date().toLocaleDateString("pt-BR", {
                  month: "long",
                  year: "numeric",
                })}{" "}
                — {carregando ? "atualizando" : "atualizado"}
              </p>
            </div>

            <div className="top-actions">
              <span className="production">
                <i /> Produção
              </span>
              <button className="btn ghost">{I.download} Exportar</button>
              <button className="btn primary" onClick={gerarNovoCodigo}>
                {I.plus} {gerando ? "Gerando..." : "Novo código"}
              </button>
            </div>
          </header>

          {aba === "Dashboard" && (
            <>
              <section className="kpis">
                <Kpi
                  label="Total de códigos"
                  value={stats.total}
                  small={`${stats.livre} disponíveis`}
                  icon={I.key}
                  color="blue"
                />
                <Kpi
                  label="Ativos"
                  value={stats.ativo}
                  small="em uso"
                  icon={I.users}
                  color="green"
                />
                <Kpi
                  label="Pendentes de pagamento"
                  value={stats.pendente}
                  small="aguardando"
                  icon={I.card}
                  color="yellow"
                />
                <Kpi
                  label="Bloqueados / Vencidos"
                  value={stats.bloqueado + stats.vencido}
                  small="requer atenção"
                  icon={I.lock}
                  color="red"
                />
              </section>

              <section className="dashboard-only">
                <h2>Resumo do sistema</h2>
                <p>
                  Use a aba Licenças para visualizar, copiar, renovar ou
                  bloquear códigos.
                </p>
                <div>
                  <button
                    className="btn primary"
                    onClick={() => setAba("Licenças")}
                  >
                    Ir para licenças
                  </button>
                  <button className="btn ghost" onClick={gerarNovoCodigo}>
                    Gerar novo código
                  </button>
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
                  <button className="btn primary" onClick={gerarNovoCodigo}>
                    Gerar 1
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={lote}
                    onChange={(e) => setLote(e.target.value)}
                  />
                  <button className="btn ghost" onClick={gerarLote}>
                    Gerar lote
                  </button>
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

          {aba === "Faturamento" && (
            <SimpleTable
              title="Faturamento"
              rows={lista}
              type="pay"
              renovar={renovar}
            />
          )}
          {aba === "Documentos" && (
            <SimpleTable title="Documentos" rows={lista} type="docs" />
          )}
          {aba === "Erros" && (
            <SimpleTable title="Erros" rows={lista} type="errors" />
          )}

          {toast && <Toast toast={toast} />}
          {modalDetalhes && (
            <DetailsModal
              row={modalDetalhes}
              onClose={() => setModalDetalhes(null)}
              onRenovar={renovar}
              onBloquear={setModalBloqueio}
            />
          )}
          {modalBloqueio && (
            <BlockModal
              row={modalBloqueio}
              onClose={() => setModalBloqueio(null)}
              onConfirm={bloquear}
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
    <button
      className={active ? "menu-item active" : "menu-item"}
      onClick={onClick}
    >
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
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <b key={n} style={{ height: 8 + n * 4 }} />
        ))}
      </div>
    </article>
  );
}

function LicenseTable({
  title,
  subtitle,
  rows,
  stats,
  search,
  setSearch,
  copiarCodigo,
  renovar,
  abrirDetalhes,
  abrirBloqueio,
}) {
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
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código ou cliente..."
          />
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
              <tr>
                <td colSpan="5" className="empty">
                  Nenhum registro encontrado.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <span className="code">{row.codigo}</span>
                  </td>
                  <td>
                    <div className="client">
                      <div>{iniciais(row.nome)}</div>
                      <span>
                        <strong>{row.nome || "Aguardando dados"}</strong>
                        <small>
                          {row.email ||
                            row.telefone ||
                            "Cliente ainda não vinculado"}
                        </small>
                      </span>
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={row.status} />
                  </td>
                  <td>{formatarData(row.validade)}</td>
                  <td>
                    <div className="actions">
                      <button
                        className="view"
                        onClick={() => abrirDetalhes(row)}
                      >
                        {I.edit} Editar
                      </button>
                      <button onClick={() => copiarCodigo(row.codigo)}>
                        {I.copy} Copiar
                      </button>
                      {(row.status === STATUS.ATIVO ||
                        row.status === STATUS.VENCIDO) && (
                        <button onClick={() => renovar(row)}>
                          {I.renew} Renovar
                        </button>
                      )}
                      <button
                        className="danger"
                        onClick={() => abrirBloqueio(row)}
                      >
                        {I.lock} Bloquear
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="footer">
        <span>
          Mostrando {rows.length} de {stats.total} registros
        </span>
        <div>
          <button>‹</button>
          <button className="active">1</button>
          <button>2</button>
          <button>3</button>
          <button>…</button>
          <button>›</button>
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
              <tr>
                <td colSpan="5" className="empty">
                  Nenhum registro encontrado.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.nome || row.codigo}</td>
                  <td>
                    <span className="code">{row.codigo}</span>
                  </td>
                  <td>
                    {type === "errors"
                      ? row.ultimo_erro
                      : type === "docs"
                        ? row.termos_pdf || "Sem termos PDF"
                        : row.pagamento_status || "Pendente"}
                  </td>
                  <td>{formatarData(row.validade)}</td>
                  {type === "pay" && (
                    <td>
                      <div className="actions">
                        <button className="view" onClick={() => renovar(row)}>
                          Renovar
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StatusBadge({ status }) {
  const view = statusView(status);
  return (
    <span className={`status ${view.cls}`}>
      <i />
      {view.label}
    </span>
  );
}

function Toast({ toast }) {
  return (
    <div className={toast.tipo === "erro" ? "toast erro" : "toast"}>
      {toast.texto}
    </div>
  );
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
          <button className="btn primary" onClick={() => onRenovar(row)}>
            Renovar 90 dias
          </button>
          <button className="btn ghost" onClick={() => onBloquear(row)}>
            Bloquear
          </button>
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
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Exemplo: pagamento vencido"
          />
        </label>

        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn primary"
            onClick={() => onConfirm(row, motivo)}
          >
            Confirmar bloqueio
          </button>
        </div>
      </div>
    </div>
  );
}

function GlobalStyle() {
  return (
    <style>{`
      * { box-sizing: border-box; }
      html, body, #root { margin: 0; min-height: 100%; width: 100%; background: ${colors.bg}; }
      body { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: ${colors.text}; }
      button, input, textarea { font: inherit; }

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
        box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
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
        width: 88px;
        min-height: 100vh;
        background: ${colors.sidebar};
        color: #cbd5e1;
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
      }

      .brand {
        height: 92px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .brand > div:last-child {
        display: none;
      }

      .brand-icon {
        width: 48px;
        height: 48px;
        background: ${colors.blue};
        color: #fff;
        border-radius: 11px;
        display: grid;
        place-items: center;
        font-weight: 700;
      }

      .brand-icon.small {
        width: 48px;
        height: 48px;
        border-radius: 11px;
        font-size: 15px;
      }

      nav {
        flex: 1;
        padding: 8px 14px;
      }

      .menu-title {
        display: none;
      }

      .menu-item {
        width: 60px;
        height: 60px;
        border: 0;
        border-radius: 12px;
        background: transparent;
        color: #9ca3af;
        display: grid;
        place-items: center;
        cursor: pointer;
        margin-bottom: 8px;
        position: relative;
      }

      .menu-item span {
        display: none;
      }

      .menu-item small {
        position: absolute;
        top: 6px;
        right: 6px;
        min-width: 18px;
        height: 18px;
        border-radius: 99px;
        background: #344054;
        color: #fff;
        display: grid;
        place-items: center;
        font-size: 10px;
      }

      .menu-item.active {
        background: #2b303b;
        color: #fff;
      }

      .admin-card {
        border: 0;
        background: transparent;
        padding: 18px 0 26px;
        color: #cbd5e1;
        display: grid;
        place-items: center;
        cursor: pointer;
      }

      .admin-card div {
        width: 44px;
        height: 44px;
        border-radius: 99px;
        display: grid;
        place-items: center;
        background: #344054;
        color: #dce4f2;
        font-size: 14px;
      }

      .admin-card span {
        display: none;
      }

      .main {
        flex: 1;
        min-width: 0;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
      }

      .topbar {
        height: 90px;
        background: ${colors.white};
        border-bottom: 1px solid ${colors.border};
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 36px;
        gap: 16px;
        position: sticky;
        top: 0;
        z-index: 10;
      }

      .topbar h1 {
        margin: 0;
        font-size: 24px;
        font-weight: 500;
        color: #0f172a;
      }

      .topbar h1 span {
        color: #9ca3af;
      }

      .topbar p {
        margin: 3px 0 0;
        font-size: 15px;
        color: #8a93a5;
      }

      .top-actions {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .production {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
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
        min-height: 44px;
        border-radius: 9px;
        border: 1px solid ${colors.border};
        background: transparent;
        color: ${colors.soft};
        padding: 0 16px;
        display: inline-flex;
        align-items: center;
        gap: 7px;
        cursor: pointer;
        font-size: 15px;
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
        padding: 30px 36px 0;
      }

      .kpi {
        min-height: 210px;
        background: ${colors.white};
        border: 1px solid ${colors.border};
        border-radius: 13px;
        box-shadow: 0 2px 7px rgba(15,23,42,.08);
        padding: 24px;
      }

      .kpi-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
      }

      .kpi-top span {
        color: #8a93a5;
        font-size: 16px;
        line-height: 1.2;
      }

      .kpi-top i {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        display: grid;
        place-items: center;
        font-style: normal;
      }

      .kpi.blue .kpi-top i { background: #edf4ff; color: ${colors.blue}; }
      .kpi.green .kpi-top i { background: #e9fbf2; color: ${colors.green}; }
      .kpi.red .kpi-top i { background: #fff0f0; color: ${colors.red}; }
      .kpi.yellow .kpi-top i { background: #fff8e8; color: ${colors.yellow}; }

      .kpi strong {
        display: block;
        margin-top: 14px;
        font-size: 30px;
        font-weight: 600;
        color: #111827;
      }

      .kpi p {
        margin: 8px 0 0;
        color: #8a93a5;
        font-size: 16px;
      }

      .fake-chart {
        display: flex;
        align-items: end;
        gap: 5px;
        height: 48px;
        margin-top: 16px;
      }

      .fake-chart b {
        width: 8px;
        border-radius: 4px 4px 0 0;
        display: block;
      }

      .kpi.blue .fake-chart b { background: #8cb8ff; }
      .kpi.green .fake-chart b { background: #54d6ad; }
      .kpi.yellow .fake-chart b { background: #ffc04d; }
      .kpi.red .fake-chart b { background: #f87171; }

      .dashboard-only {
        margin: 24px 36px;
        background: #fff;
        border: 1px solid ${colors.border};
        border-radius: 13px;
        padding: 24px;
        box-shadow: 0 2px 7px rgba(15,23,42,.08);
      }

      .dashboard-only h2 {
        margin: 0 0 6px;
        font-size: 20px;
        font-weight: 500;
      }

      .dashboard-only p {
        margin: 0 0 18px;
        color: #8a93a5;
      }

      .dashboard-only div {
        display: flex;
        gap: 10px;
      }

      .generator {
        margin: 30px 36px 0;
        background: ${colors.white};
        border: 1px solid ${colors.border};
        border-radius: 13px;
        box-shadow: 0 2px 7px rgba(15,23,42,.08);
        padding: 18px 22px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }

      .generator h2 {
        margin: 0;
        font-size: 20px;
        font-weight: 500;
      }

      .generator p {
        margin: 3px 0 0;
        color: #8a93a5;
        font-size: 14px;
      }

      .generator div:last-child {
        display: flex;
        gap: 10px;
        align-items: center;
      }

      .generator input {
        width: 70px;
        height: 44px;
        border: 1px solid ${colors.border};
        border-radius: 9px;
        text-align: center;
      }

      .table-card {
        margin: 30px 36px;
        background: ${colors.white};
        border: 1px solid ${colors.border};
        border-radius: 13px;
        box-shadow: 0 2px 7px rgba(15,23,42,.08);
        overflow: hidden;
      }

      .table-card.simple {
        margin-top: 30px;
      }

      .table-title {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 16px;
        padding: 22px 24px;
      }

      .table-title h2 {
        margin: 0;
        font-size: 20px;
        font-weight: 500;
        color: #111827;
      }

      .table-title p {
        margin: 3px 0 0;
        color: #8a93a5;
        font-size: 16px;
      }

      .chips {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }

      .chips span {
        border-radius: 99px;
        padding: 4px 10px;
        font-size: 12px;
        background: #f3f4f6;
        color: ${colors.soft};
      }

      .chips .ok { background: #ecfdf5; color: ${colors.green}; }
      .chips .trial { background: #eff6ff; color: ${colors.blue}; }
      .chips .bad { background: #fef2f2; color: ${colors.red}; }

      .table-tools {
        display: flex;
        gap: 12px;
        align-items: center;
        padding: 14px 24px;
        border-top: 1px solid ${colors.border};
        border-bottom: 1px solid ${colors.border};
      }

      .table-tools label {
        width: 360px;
        max-width: 100%;
        height: 40px;
        border: 1px solid ${colors.border};
        border-radius: 7px;
        background: ${colors.bg};
        display: flex;
        align-items: center;
        gap: 9px;
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
        height: 40px;
        border: 1px solid ${colors.border};
        border-radius: 7px;
        background: ${colors.white};
        color: ${colors.soft};
        padding: 0 14px;
        display: inline-flex;
        align-items: center;
        gap: 7px;
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
        min-width: 860px;
      }

      th {
        padding: 13px 20px;
        text-align: left;
        color: #8a93a5;
        background: #f8f9fb;
        font-size: 15px;
        font-weight: 500;
        white-space: nowrap;
      }

      th.right {
        text-align: right;
      }

      td {
        padding: 16px 20px;
        border-top: 1px solid #eef1f5;
        color: ${colors.soft};
        font-size: 15px;
      }

      .code {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        color: ${colors.blue};
        font-weight: 600;
      }

      .client {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .client > div {
        width: 36px;
        height: 36px;
        border-radius: 99px;
        display: grid;
        place-items: center;
        background: #edf4ff;
        color: ${colors.blue};
        font-size: 14px;
        font-weight: 700;
        flex-shrink: 0;
      }

      .client strong {
        display: block;
        color: ${colors.text};
        font-weight: 500;
      }

      .client small {
        display: block;
        color: #8a93a5;
        font-size: 13px;
      }

      .status {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        border-radius: 99px;
        padding: 4px 10px;
        font-size: 13px;
        font-weight: 500;
      }

      .status i {
        width: 6px;
        height: 6px;
        border-radius: 99px;
      }

      .status.active { background: #ecfdf5; color: ${colors.green}; }
      .status.active i { background: ${colors.green}; }
      .status.available { background: #eff6ff; color: ${colors.blue}; }
      .status.available i { background: ${colors.blue}; }
      .status.expired, .status.blocked { background: #fef2f2; color: ${colors.red}; }
      .status.expired i, .status.blocked i { background: ${colors.red}; }

      .actions {
        display: flex;
        gap: 7px;
        justify-content: flex-end;
        flex-wrap: wrap;
      }

      .actions button {
        border: 1px solid ${colors.border};
        border-radius: 7px;
        padding: 7px 11px;
        font-size: 14px;
        cursor: pointer;
        font-weight: 500;
        color: ${colors.soft};
        background: #fff;
        display: inline-flex;
        align-items: center;
        gap: 5px;
      }

      .actions .view {
        background: ${colors.blue};
        color: #fff;
        border-color: ${colors.blue};
      }

      .actions .danger {
        background: #fef2f2;
        color: ${colors.red};
        border-color: #fee2e2;
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
        font-size: 14px;
        padding: 0 20px;
      }

      .footer div {
        display: flex;
        gap: 4px;
      }

      .footer button {
        width: 32px;
        height: 32px;
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

      .toast {
        position: fixed;
        right: 22px;
        top: 22px;
        z-index: 100;
        background: #111827;
        color: #fff;
        padding: 13px 16px;
        border-radius: 10px;
        box-shadow: 0 18px 50px rgba(15,23,42,.22);
        font-size: 14px;
      }

      .toast.erro {
        background: ${colors.red};
      }

      .modal-bg {
        position: fixed;
        inset: 0;
        z-index: 80;
        background: rgba(17,24,39,.45);
        display: grid;
        place-items: center;
        padding: 22px;
      }

      .modal-card {
        width: min(850px, 100%);
        background: #fff;
        border-radius: 14px;
        box-shadow: 0 24px 90px rgba(15,23,42,.24);
        padding: 24px;
      }

      .small-modal {
        width: min(520px, 100%);
      }

      .modal-top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        border-bottom: 1px solid ${colors.border};
        padding-bottom: 16px;
        margin-bottom: 18px;
      }

      .modal-top span {
        display: block;
        color: ${colors.blue};
        text-transform: uppercase;
        font-size: 12px;
        letter-spacing: 1px;
        font-weight: 700;
      }

      .modal-top h2 {
        margin: 4px 0 0;
        font-size: 22px;
        font-weight: 500;
      }

      .modal-top button {
        border: 1px solid ${colors.border};
        background: #fff;
        border-radius: 7px;
        padding: 8px 12px;
        cursor: pointer;
      }

      .details-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
      }

      .details-grid div {
        background: #f8f9fb;
        border: 1px solid ${colors.border};
        border-radius: 10px;
        padding: 12px;
      }

      .details-grid span {
        display: block;
        color: ${colors.muted};
        font-size: 12px;
        margin-bottom: 4px;
      }

      .details-grid strong {
        display: block;
        color: ${colors.text};
        word-break: break-word;
      }

      .modal-actions {
        display: flex;
        gap: 10px;
        margin-top: 18px;
      }

      .modal-label {
        display: grid;
        gap: 8px;
        color: ${colors.soft};
        font-size: 14px;
      }

      .modal-label textarea {
        width: 100%;
        min-height: 110px;
        resize: vertical;
        border: 1px solid ${colors.border};
        border-radius: 9px;
        padding: 12px;
        outline: none;
      }

      @media (max-width: 1100px) {
        .kpis { grid-template-columns: repeat(2, 1fr); }
        .topbar { align-items: flex-start; height: auto; padding: 18px; flex-direction: column; }
        .top-actions { width: 100%; flex-wrap: wrap; }
        .details-grid { grid-template-columns: repeat(2, 1fr); }
      }
    `}</style>
  );
}
