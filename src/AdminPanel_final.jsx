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

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

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

function mesISO(data) {
  if (!data) return "";
  try {
    return new Date(data).toISOString().slice(0, 7);
  } catch {
    return "";
  }
}

function mesLabel(iso) {
  if (!iso) return "Todos os meses";
  const [ano, mes] = iso.split("-");
  return new Date(Number(ano), Number(mes) - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

function iniciais(nome) {
  if (!nome) return "?";
  const partes = String(nome).trim().split(" ").filter(Boolean);
  if (!partes.length) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

function statusView(status) {
  if (status === STATUS.ATIVO) return { label: "Ativo", cls: "active" };
  if (status === STATUS.BLOQUEADO) return { label: "Bloqueado", cls: "blocked" };
  if (status === STATUS.VENCIDO) return { label: "Vencido", cls: "expired" };
  return { label: "Disponível", cls: "available" };
}

function baixarCSV(nomeArquivo, linhas) {
  const clean = (valor) => {
    if (valor === null || valor === undefined) return "";
    return String(valor).replace(/\r?\n|\r/g, " ").replace(/"/g, '""');
  };

  if (!linhas.length) {
    linhas = [{ aviso: "Nenhum registro encontrado" }];
  }

  const colunas = Object.keys(linhas[0]);
  const conteudo = [
    colunas.join(";"),
    ...linhas.map((linha) => colunas.map((coluna) => `"${clean(linha[coluna])}"`).join(";")),
  ].join("\n");

  const blob = new Blob(["\ufeff" + conteudo], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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
  warning: <Icon><path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></Icon>,
  refresh: <Icon><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M3 21v-5h5" /><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /></Icon>,
  plus: <Icon><path d="M12 5v14" /><path d="M5 12h14" /></Icon>,
  download: <Icon><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></Icon>,
  search: <Icon size={16}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></Icon>,
  edit: <Icon size={15}><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></Icon>,
  copy: <Icon size={15}><rect x="9" y="9" width="13" height="13" rx="2" /><rect x="2" y="2" width="13" height="13" rx="2" /></Icon>,
  lock: <Icon size={15}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></Icon>,
  logout: <Icon><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></Icon>,
};

export default function AdminPanel() {
  const [logado, setLogado] = useState(() => localStorage.getItem("painel_atestado_logado") === "sim");
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [aba, setAba] = useState("Dashboard");
  const [usuarios, setUsuarios] = useState([]);
  const [busca, setBusca] = useState("");
  const [lote, setLote] = useState(5);
  const [filtroMes, setFiltroMes] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [toast, setToast] = useState(null);
  const [modalDetalhes, setModalDetalhes] = useState(null);
  const [modalBloqueio, setModalBloqueio] = useState(null);

  function aviso(texto, tipo = "ok") {
    setToast({ texto, tipo });
    setTimeout(() => setToast(null), 2800);
  }

  useEffect(() => {
    if (logado) carregar();
  }, [logado]);

  useEffect(() => {
    setBusca("");
    setFiltroMes("");
    setFiltroStatus("");
  }, [aba]);

  async function carregar() {
    setCarregando(true);
    await supabase.from("usuarios").update({ status: STATUS.VENCIDO, vencido_em: new Date().toISOString() }).lt("validade", hojeISO()).eq("status", STATUS.ATIVO);
    const { data, error } = await supabase.from("usuarios").select("*").order("created_at", { ascending: false });
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
      const { error } = await supabase.from("usuarios").insert([{ codigo, status: STATUS.DISPONIVEL, sistema: "", pagamento_status: "Pendente" }]);
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
    const registros = [...codigos].map((codigo) => ({ codigo, status: STATUS.DISPONIVEL, sistema: "", pagamento_status: "Pendente" }));
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
    const { error } = await supabase.from("usuarios").update({ status: STATUS.BLOQUEADO, bloqueado_motivo: motivo || "Bloqueio manual" }).eq("id", row.id);
    if (error) {
      aviso("Erro ao bloquear.", "erro");
      return;
    }
    setModalBloqueio(null);
    await carregar();
    aviso("Licença bloqueada.");
  }

  async function desbloquear(row) {
    const novoStatus = row.nome ? STATUS.ATIVO : STATUS.DISPONIVEL;
    const { error } = await supabase.from("usuarios").update({ status: novoStatus, bloqueado_motivo: null }).eq("id", row.id);
    if (error) {
      aviso("Erro ao desbloquear.", "erro");
      return;
    }
    await carregar();
    aviso("Licença desbloqueada.");
  }

  async function renovar(row) {
    const novaValidade = validade90Dias();
    const { error } = await supabase.from("usuarios").update({ status: STATUS.ATIVO, validade: novaValidade, pagamento_status: "Pago", pago_em: new Date().toISOString(), renovado_em: new Date().toISOString(), bloqueado_motivo: null }).eq("id", row.id);
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
    const receita = usuarios.filter((u) => u.nome && (u.pagamento_status || "") === "Pago").length * 29.9;
    const aReceber = usuarios.filter((u) => u.nome && (u.pagamento_status || "Pendente") !== "Pago").length * 29.9;
    return { total: usuarios.length, ativo, livre, vencido, bloqueado, clientes, erros, pendente, receita, aReceber };
  }, [usuarios]);

  const meses = useMemo(() => {
    return [...new Set(usuarios.map((u) => mesISO(u.created_at)).filter(Boolean))].sort().reverse();
  }, [usuarios]);

  const lista = useMemo(() => {
    const termo = busca.toLowerCase().trim();
    return usuarios.filter((u) => {
      const texto = `${u.codigo || ""} ${u.nome || ""} ${u.email || ""} ${u.telefone || ""} ${u.cpf || ""}`.toLowerCase();
      const matchBusca = !termo || texto.includes(termo);
      const matchMes = !filtroMes || mesISO(u.created_at) === filtroMes;
      const matchStatus = !filtroStatus || u.status === filtroStatus;
      if (aba === "Clientes") return matchBusca && matchMes && !!u.nome;
      if (aba === "Faturamento") return matchBusca && matchMes && !!u.nome;
      if (aba === "Documentos") return matchBusca && matchMes && !!u.nome;
      if (aba === "Erros") return matchBusca && matchMes && !!u.ultimo_erro;
      return matchBusca && matchMes && matchStatus;
    });
  }, [usuarios, busca, aba, filtroMes, filtroStatus]);

  function linhasExportacao(rows = lista) {
    return rows.map((u) => ({
      Codigo: u.codigo || "",
      Nome: u.nome || "",
      Status: u.status || "",
      Email: u.email || "",
      Telefone: u.telefone || "",
      CPF: u.cpf || "",
      Cargo: u.cargo || "",
      Orgao: u.orgao || "",
      Sistema: u.sistema || "",
      Pagamento: u.pagamento_status || "",
      Validade: formatarData(u.validade),
      Criado_em: formatarDataHora(u.created_at),
      Usado_em: formatarDataHora(u.usado_em),
      Renovado_em: formatarDataHora(u.renovado_em),
      Bloqueado_motivo: u.bloqueado_motivo || "",
      Ultimo_erro: u.ultimo_erro || "",
      Envios: u.envios || 0,
      Alteracoes: u.alteracoes || 0,
    }));
  }

  function exportarAtual() {
    const nome = aba.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    baixarCSV(`${nome}_${filtroMes || "todos"}_${new Date().toISOString().slice(0, 10)}.csv`, linhasExportacao(lista));
    aviso("CSV exportado com sucesso.");
  }

  function exportarTudo() {
    baixarCSV(`usuarios_todos_${new Date().toISOString().slice(0, 10)}.csv`, linhasExportacao(usuarios));
    aviso("Base completa exportada.");
  }

  function exportarFaturamento() {
    const rows = lista.map((u) => ({
      Tipo: (u.pagamento_status || "Pendente") === "Pago" ? "Recebido" : "A receber",
      Cliente: u.nome || "",
      Codigo: u.codigo || "",
      Valor: "29,90",
      Status_pagamento: u.pagamento_status || "Pendente",
      Validade: formatarData(u.validade),
      Data_cadastro: formatarDataHora(u.created_at),
      Pago_em: formatarDataHora(u.pago_em),
    }));
    baixarCSV(`faturamento_${filtroMes || "todos"}_${new Date().toISOString().slice(0, 10)}.csv`, rows);
    aviso("Faturamento exportado.");
  }

  if (!logado) {
    return <><GlobalStyle /><div className="login-page"><form className="login-card" onSubmit={entrar}><div className="brand-icon">AF</div><h1>Atestado Fácil</h1><p>Painel administrativo</p><input placeholder="Usuário" value={login} onChange={(e) => setLogin(e.target.value)} /><input placeholder="Senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} /><button type="submit">Entrar</button></form>{toast && <Toast toast={toast} />}</div></>;
  }

  return (
    <>
      <GlobalStyle />
      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand"><div className="brand-icon small">AF</div><div><strong>Atestado Fácil</strong><span>Painel ADM</span></div></div>
          <nav>
            <MenuTitle>Principal</MenuTitle>
            <MenuItem active={aba === "Dashboard"} onClick={() => setAba("Dashboard")} icon={I.dashboard} label="Dashboard" />
            <MenuItem active={aba === "Licenças"} onClick={() => setAba("Licenças")} icon={I.key} label="Licenças" badge={stats.total} />
            <MenuItem active={aba === "Clientes"} onClick={() => setAba("Clientes")} icon={I.users} label="Clientes" badge={stats.clientes} />
            <MenuItem active={aba === "Faturamento"} onClick={() => setAba("Faturamento")} icon={I.card} label="Faturamento" />
            <MenuTitle>Sistema</MenuTitle>
            <MenuItem active={aba === "Documentos"} onClick={() => setAba("Documentos")} icon={I.file} label="Documentos" />
            <MenuItem active={aba === "Erros"} onClick={() => setAba("Erros")} icon={I.warning} label="Erros" badge={stats.erros} />
            <MenuItem onClick={carregar} icon={I.refresh} label={carregando ? "Atualizando..." : "Atualizar"} />
          </nav>
          <button className="admin-card" onClick={sair}><div>AD</div><span><strong>Administrador</strong><small>Sair do painel</small></span>{I.logout}</button>
        </aside>

        <main className="main">
          <header className="topbar">
            <div><h1>{titleIcon(aba)} {aba}</h1><p>seg., 4 de mai. · {carregando ? "atualizando" : "atualizado"}</p></div>
            <div className="top-actions"><span className="online"><i /> Online</span><button className="btn dark" onClick={exportarTudo}>{I.download} Exportar tudo</button><button className="btn primary" onClick={gerarNovoCodigo}>{I.plus} {gerando ? "Gerando..." : "Novo código"}</button></div>
          </header>

          <section className="content">
            {aba === "Dashboard" && <Dashboard stats={stats} setAba={setAba} onGerar={gerarNovoCodigo} />}

            {aba === "Licenças" && <>
              <section className="generator"><div className="generator-icon">#</div><div><h2>Gerar licenças</h2><p>Código de 5 dígitos, vinculado pelo app</p></div><div className="generator-actions"><button className="btn primary" onClick={gerarNovoCodigo}>+ Gerar 1 código</button><span>Qtd:</span><input type="number" min="1" max="100" value={lote} onChange={(e) => setLote(e.target.value)} /><button className="btn dark" onClick={gerarLote}>Gerar lote</button></div></section>
              <LicenseTable title="Todas as licenças" subtitle="Todos os códigos de acesso cadastrados no sistema" rows={lista} stats={stats} search={busca} setSearch={setBusca} meses={meses} filtroMes={filtroMes} setFiltroMes={setFiltroMes} filtroStatus={filtroStatus} setFiltroStatus={setFiltroStatus} copiarCodigo={copiarCodigo} renovar={renovar} abrirDetalhes={setModalDetalhes} abrirBloqueio={setModalBloqueio} desbloquear={desbloquear} onExportar={exportarAtual} />
            </>}

            {aba === "Clientes" && <LicenseTable title="Clientes" subtitle="Clientes cadastrados pelo app" rows={lista} stats={stats} search={busca} setSearch={setBusca} meses={meses} filtroMes={filtroMes} setFiltroMes={setFiltroMes} filtroStatus="" setFiltroStatus={() => {}} copiarCodigo={copiarCodigo} renovar={renovar} abrirDetalhes={setModalDetalhes} abrirBloqueio={setModalBloqueio} desbloquear={desbloquear} onExportar={exportarAtual} />}

            {aba === "Faturamento" && <Faturamento rows={lista} stats={stats} meses={meses} filtroMes={filtroMes} setFiltroMes={setFiltroMes} onExportar={exportarFaturamento} />}
            {aba === "Documentos" && <SimpleTable title="Documentos" rows={lista} type="docs" onExportar={exportarAtual} />}
            {aba === "Erros" && <SimpleTable title="Log de erros" rows={lista} type="errors" onExportar={exportarAtual} />}
          </section>

          {toast && <Toast toast={toast} />}
          {modalDetalhes && <DetailsModal row={modalDetalhes} onClose={() => setModalDetalhes(null)} onRenovar={renovar} onBloquear={setModalBloqueio} onDesbloquear={desbloquear} />}
          {modalBloqueio && <BlockModal row={modalBloqueio} onClose={() => setModalBloqueio(null)} onConfirm={bloquear} />}
        </main>
      </div>
    </>
  );
}

function titleIcon(aba) {
  if (aba === "Dashboard") return "📊";
  if (aba === "Licenças") return "🔑";
  if (aba === "Faturamento") return "💳";
  if (aba === "Clientes") return "👥";
  if (aba === "Documentos") return "📄";
  return "⚠️";
}

function MenuTitle({ children }) { return <div className="menu-title">{children}</div>; }
function MenuItem({ active, onClick, icon, label, badge }) { return <button className={active ? "menu-item active" : "menu-item"} onClick={onClick}>{icon}<span>{label}</span>{badge !== undefined ? <small>{badge}</small> : null}</button>; }

function Dashboard({ stats, setAba, onGerar }) {
  return <>
    <section className="kpis"><Kpi label="Total de códigos" value={stats.total} small={`${stats.livre} disponíveis`} icon={I.key} color="blue" /><Kpi label="Licenças ativas" value={stats.ativo} small="em uso agora" icon={I.users} color="green" /><Kpi label="Pendentes pagamento" value={stats.pendente} small="aguardando" icon={I.card} color="yellow" /><Kpi label="Bloqueados / Vencidos" value={stats.bloqueado + stats.vencido} small="requer atenção" icon={I.lock} color="red" /></section>
    <div className="dashboard-grid"><section className="panel-card"><div className="panel-head"><div><h2>Visão geral do sistema</h2><p>Navegue pelas seções do painel</p></div><span className="bolt">⚡</span></div><div className="quick-grid"><button className="quick blue" onClick={() => setAba("Licenças")}><strong>Gerenciar licenças</strong><span>Ver, copiar, renovar e bloquear</span><b>→</b></button><button className="quick green" onClick={() => setAba("Clientes")}><strong>Ver clientes</strong><span>Clientes cadastrados no app</span><b>→</b></button><button className="quick yellow" onClick={() => setAba("Faturamento")}><strong>Faturamento</strong><span>Status de pagamentos</span><b>→</b></button><button className="quick red" onClick={() => setAba("Erros")}><strong>Log de erros</strong><span>Verificar erros do sistema</span><b>→</b></button></div></section><section className="panel-card summary"><h2>Resumo rápido</h2><Progress label="Total cadastrados" value={stats.total} total={Math.max(stats.total, 1)} /><Progress label="Ativos" value={stats.ativo} total={Math.max(stats.total, 1)} /><Progress label="Disponíveis" value={stats.livre} total={Math.max(stats.total, 1)} /><Progress label="Vencidos" value={stats.vencido} total={Math.max(stats.total, 1)} /><Progress label="Bloqueados" value={stats.bloqueado} total={Math.max(stats.total, 1)} /><Progress label="Clientes" value={stats.clientes} total={Math.max(stats.total, 1)} /><button className="btn primary wide" onClick={onGerar}>+ Gerar novo código</button></section></div>
  </>;
}

function Kpi({ label, value, small, icon, color }) { return <article className={`kpi ${color}`}><div className="kpi-top"><i>{icon}</i><span>{label}</span></div><strong>{value}</strong><p>{small}</p><div className="bars">{[1,2,3,4,5,6,7].map((n) => <b key={n} style={{ height: 8 + n * 5 }} />)}</div></article>; }
function Progress({ label, value, total }) { return <div className="progress"><div><span>{label}</span><b>{value}</b></div><i><em style={{ width: `${Math.min(100, (value / total) * 100)}%` }} /></i></div>; }

function LicenseTable({ title, subtitle, rows, stats, search, setSearch, meses, filtroMes, setFiltroMes, filtroStatus, setFiltroStatus, copiarCodigo, renovar, abrirDetalhes, abrirBloqueio, desbloquear, onExportar }) {
  return <section className="table-card"><div className="table-title"><div><h2>{title}</h2><p>{subtitle}</p></div><div className="chips"><span>{rows.length} registros</span><span className="ok">{stats.ativo} ativas</span><span className="trial">{stats.livre} livres</span><span className="bad">{stats.vencido} vencidas</span></div></div><div className="filter-row"><select value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)}><option value="">Todos os meses</option>{meses.map((m) => <option key={m} value={m}>{mesLabel(m)}</option>)}</select>{setFiltroStatus && <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}><option value="">Status: todos</option><option value={STATUS.DISPONIVEL}>Disponível</option><option value={STATUS.ATIVO}>Ativo</option><option value={STATUS.BLOQUEADO}>Bloqueado</option><option value={STATUS.VENCIDO}>Vencido</option></select>}<button className="btn dark export-btn" onClick={onExportar}>{I.download} Exportar CSV</button></div><div className="searchbar">{I.search}<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar código, nome, e-mail, CPF..." /></div><div className="table-wrap"><table><thead><tr><th>Código</th><th>Cliente</th><th>Status</th><th>Validade</th><th className="right">Ações</th></tr></thead><tbody>{rows.length === 0 ? <tr><td colSpan="5" className="empty">Nenhum registro encontrado.</td></tr> : rows.map((row) => <tr key={row.id}><td><span className="code">{row.codigo}</span></td><td><div className="client"><div>{iniciais(row.nome)}</div><span><strong>{row.nome || "Aguardando dados"}</strong><small>{row.email || row.telefone || "Não vinculado"}</small></span></div></td><td><StatusBadge status={row.status} /></td><td>{formatarData(row.validade)}</td><td><div className="actions"><button className="icon-btn primary-mini" onClick={() => abrirDetalhes(row)} title="Ver detalhes">{I.edit}</button><button className="icon-btn" onClick={() => copiarCodigo(row.codigo)} title="Copiar">{I.copy}</button>{row.status === STATUS.BLOQUEADO ? <button className="icon-btn success" onClick={() => desbloquear(row)} title="Desbloquear">✓</button> : <button className="icon-btn danger" onClick={() => abrirBloqueio(row)} title="Bloquear">{I.lock}</button>}{(row.status === STATUS.ATIVO || row.status === STATUS.VENCIDO) && <button className="mini-text" onClick={() => renovar(row)}>Renovar</button>}</div></td></tr>)}</tbody></table></div><div className="table-footer"><span>{rows.length} registros</span></div></section>;
}

function Faturamento({ rows, stats, meses, filtroMes, setFiltroMes, onExportar }) {
  const pagos = rows.filter((u) => (u.pagamento_status || "") === "Pago");
  const pendentes = rows.filter((u) => (u.pagamento_status || "Pendente") !== "Pago");
  return <><section className="finance-kpis"><FinanceCard title="ASSINATURAS" value={money.format(pagos.length * 29.9)} sub={`${pagos.length} registros`} cls="blue" /><FinanceCard title="RENOVAÇÕES" value={money.format(0)} sub="0 registros" cls="green" /><FinanceCard title="ALTERAÇÕES" value={money.format(0)} sub="0 registros" cls="yellow" /><FinanceCard title="A RECEBER" value={money.format(pendentes.length * 29.9)} sub={`${pendentes.length} potencial`} cls="red" /></section><section className="revenue-card"><span>Receita total recebida</span><strong>{money.format(stats.receita)}</strong><p>{pagos.length} transações</p></section><section className="table-card"><div className="table-title"><div><h2>Histórico de transações</h2><p>Todas as cobranças registradas — use os filtros para analisar períodos</p></div></div><div className="filter-row"><select value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)}><option value="">Todos os meses</option>{meses.map((m) => <option key={m} value={m}>{mesLabel(m)}</option>)}</select><button className="btn dark export-btn" onClick={onExportar}>{I.download} Exportar CSV</button></div><div className="table-wrap"><table><thead><tr><th>Tipo</th><th>Cliente</th><th>Código</th><th>Valor</th><th>Data</th><th>Pagamento</th></tr></thead><tbody>{rows.length === 0 ? <tr><td colSpan="6" className="empty">Nenhuma transação registrada</td></tr> : rows.map((row) => <tr key={row.id}><td>{(row.pagamento_status || "") === "Pago" ? "Assinatura" : "A receber"}</td><td>{row.nome}</td><td><span className="code">{row.codigo}</span></td><td>{money.format(29.9)}</td><td>{formatarDataHora(row.pago_em || row.created_at)}</td><td>{row.pagamento_status || "Pendente"}</td></tr>)}</tbody></table></div></section></>;
}
function FinanceCard({ title, value, sub, cls }) { return <article className={`finance-card ${cls}`}><span>{title}</span><strong>{value}</strong><p>{sub}</p></article>; }

function SimpleTable({ title, rows, type, onExportar }) { return <section className="table-card"><div className="table-title"><div><h2>{title}</h2><p>Registros do sistema</p></div><button className="btn dark" onClick={onExportar}>{I.download} Exportar CSV</button></div><div className="table-wrap"><table><thead><tr><th>Cliente</th><th>Código</th><th>Informação</th><th>Data</th></tr></thead><tbody>{rows.length === 0 ? <tr><td colSpan="4" className="empty">Nenhum registro encontrado.</td></tr> : rows.map((row) => <tr key={row.id}><td>{row.nome || row.codigo}</td><td><span className="code">{row.codigo}</span></td><td>{type === "errors" ? row.ultimo_erro : row.termos_pdf || "Sem documento registrado"}</td><td>{formatarDataHora(row.created_at)}</td></tr>)}</tbody></table></div></section>; }
function StatusBadge({ status }) { const view = statusView(status); return <span className={`status ${view.cls}`}><i />{view.label}</span>; }
function Toast({ toast }) { return <div className={toast.tipo === "erro" ? "toast erro" : "toast"}>{toast.texto}</div>; }

function DetailsModal({ row, onClose, onRenovar, onBloquear, onDesbloquear }) {
  const items = [["Código", row.codigo], ["Status", row.status || "—"], ["Nome", row.nome || "—"], ["CPF", row.cpf || "—"], ["Telefone", row.telefone || "—"], ["E-mail", row.email || "—"], ["Cargo", row.cargo || "—"], ["Órgão", row.orgao || "—"], ["Validade", formatarData(row.validade)], ["Criado em", formatarDataHora(row.created_at)], ["Usado em", formatarDataHora(row.usado_em)], ["Envios", row.envios || 0], ["Alterações", row.alteracoes || 0], ["Último erro", row.ultimo_erro || "—"]];
  return <div className="modal-bg"><div className="modal-card"><div className="modal-top"><div><span>Licença</span><h2>{row.codigo}</h2></div><button onClick={onClose}>Fechar</button></div><div className="details-grid">{items.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><div className="modal-actions"><button className="btn primary" onClick={() => onRenovar(row)}>Renovar 90 dias</button>{row.status === STATUS.BLOQUEADO ? <button className="btn ghost" onClick={() => onDesbloquear(row)}>Desbloquear</button> : <button className="btn ghost" onClick={() => onBloquear(row)}>Bloquear</button>}</div></div></div>;
}

function BlockModal({ row, onClose, onConfirm }) { const [motivo, setMotivo] = useState(row.bloqueado_motivo || ""); return <div className="modal-bg"><div className="modal-card small-modal"><div className="modal-top"><div><span>Bloqueio</span><h2>Bloquear licença {row.codigo}</h2></div><button onClick={onClose}>Fechar</button></div><label className="modal-label">Motivo do bloqueio<textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Exemplo: pagamento vencido" /></label><div className="modal-actions"><button className="btn ghost" onClick={onClose}>Cancelar</button><button className="btn primary" onClick={() => onConfirm(row, motivo)}>Confirmar bloqueio</button></div></div></div>; }

function GlobalStyle() {
  return <style>{`
    :root { --blue:#2f7df6; --green:#10b981; --red:#ff2f45; --yellow:#ffb300; --dark:#0f141c; --muted:#8d96aa; --text:#0f172a; --bg:#f6f7fb; --border:#e6ebf2; }
    * { box-sizing:border-box; } html,body,#root{margin:0;min-height:100%;width:100%;background:var(--bg);} body{font-family:Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;color:var(--text);} button,input,select,textarea{font:inherit;} button{cursor:pointer;}
    .login-page{min-height:100vh;display:grid;place-items:center;background:linear-gradient(135deg,#edf4ff,#f7fbff);} .login-card{width:360px;background:#fff;border:1px solid var(--border);border-radius:22px;box-shadow:0 24px 70px rgba(15,23,42,.12);padding:30px;} .login-card h1{margin:18px 0 4px;font-size:25px;} .login-card p{margin:0 0 22px;color:var(--muted);} .login-card input{width:100%;height:46px;border:1px solid var(--border);border-radius:12px;padding:0 14px;margin-bottom:10px;outline:none;} .login-card button{width:100%;height:46px;border:0;border-radius:12px;background:var(--blue);color:#fff;font-weight:800;}
    .app-shell{width:100vw;min-height:100vh;display:flex;background:var(--bg);overflow-x:hidden;} .sidebar{width:288px;min-height:100vh;background:#10151d;color:#bfcee3;flex-shrink:0;display:flex;flex-direction:column;position:sticky;top:0;} .brand{height:76px;display:flex;align-items:center;gap:12px;padding:0 18px;border-bottom:1px solid rgba(255,255,255,.06);} .brand strong{display:block;color:#fff;font-size:16px;} .brand span{display:block;color:#7f8ca3;font-size:13px;margin-top:2px;} .brand-icon{width:54px;height:54px;background:var(--blue);color:#fff;border-radius:14px;display:grid;place-items:center;font-weight:900;box-shadow:0 14px 25px rgba(47,125,246,.25);} .brand-icon.small{width:40px;height:40px;border-radius:11px;font-size:14px;} nav{flex:1;padding:18px 14px;} .menu-title{font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:3px;color:#3e5170;margin:18px 14px 10px;} .menu-item{width:100%;height:46px;border:0;border-radius:14px;background:transparent;color:#9eb0ca;display:flex;align-items:center;gap:14px;padding:0 14px;margin-bottom:4px;font-weight:700;text-align:left;} .menu-item span{flex:1;} .menu-item small{min-width:23px;height:23px;border-radius:99px;background:#293341;color:#fff;display:grid;place-items:center;font-size:12px;} .menu-item.active{background:var(--blue);color:#fff;box-shadow:0 12px 22px rgba(47,125,246,.24);} .admin-card{border:0;background:transparent;border-top:1px solid rgba(255,255,255,.07);padding:20px 22px 24px;color:#9eb0ca;display:flex;align-items:center;gap:12px;text-align:left;} .admin-card div{width:38px;height:38px;border-radius:99px;display:grid;place-items:center;background:var(--blue);color:#fff;font-weight:900;} .admin-card span{flex:1;display:block;} .admin-card strong{display:block;color:#fff;} .admin-card small{display:block;color:#7f8ca3;}
    .main{flex:1;min-width:0;min-height:100vh;display:flex;flex-direction:column;} .topbar{height:76px;background:#fff;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 28px;gap:16px;position:sticky;top:0;z-index:10;box-shadow:0 2px 9px rgba(15,23,42,.05);} .topbar h1{margin:0;font-size:20px;font-weight:900;} .topbar p{margin:3px 0 0;font-size:13px;color:var(--muted);} .top-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;} .online{display:inline-flex;align-items:center;gap:8px;border-radius:99px;background:#effdf6;color:#7d8ba0;padding:9px 14px;font-weight:700;} .online i{width:8px;height:8px;border-radius:99px;background:var(--green);} .btn{min-height:42px;border-radius:13px;border:1px solid var(--border);background:#fff;color:#536176;padding:0 16px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font-weight:800;} .btn.primary{background:var(--blue);border-color:var(--blue);color:#fff;box-shadow:0 8px 18px rgba(47,125,246,.22);} .btn.dark{background:#101827;border-color:#101827;color:#fff;} .btn.ghost{background:#fff;} .btn.wide{width:100%;margin-top:14px;}
    .content{padding:28px;} .kpis{display:grid;grid-template-columns:repeat(4,minmax(210px,1fr));gap:18px;} .kpi{height:255px;background:#fff;border:1px solid var(--border);border-radius:20px;padding:24px;box-shadow:0 2px 8px rgba(15,23,42,.06);position:relative;overflow:hidden;} .kpi.blue{border-color:#cfe2ff}.kpi.green{border-color:#c7f3df}.kpi.yellow{border-color:#ffe6a5}.kpi.red{border-color:#ffd1d6}.kpi-top{display:flex;justify-content:space-between;align-items:flex-start;flex-direction:row-reverse;} .kpi-top span{color:#939bb0;font-weight:800;} .kpi-top i{width:48px;height:48px;border-radius:13px;display:grid;place-items:center;font-style:normal;color:#fff;box-shadow:0 13px 24px rgba(15,23,42,.16);} .kpi.blue .kpi-top i{background:var(--blue)}.kpi.green .kpi-top i{background:var(--green)}.kpi.yellow .kpi-top i{background:var(--yellow)}.kpi.red .kpi-top i{background:var(--red)} .kpi strong{display:block;margin-top:28px;font-size:48px;line-height:1;font-weight:900;} .kpi.blue strong,.kpi.blue p{color:#1d63f0}.kpi.green strong,.kpi.green p{color:#009c69}.kpi.yellow strong,.kpi.yellow p{color:#e87900}.kpi.red strong,.kpi.red p{color:#e60019}.kpi p{margin:8px 0 0;font-size:17px;font-weight:700;} .bars{position:absolute;left:24px;right:24px;bottom:24px;height:38px;display:flex;align-items:end;gap:5px;} .bars b{flex:1;border-radius:5px 5px 0 0;display:block;opacity:.42}.kpi.blue .bars b{background:var(--blue)}.kpi.green .bars b{background:var(--green)}.kpi.yellow .bars b{background:var(--yellow)}.kpi.red .bars b{background:var(--red)}.bars b:last-child{opacity:1;}
    .dashboard-grid{display:grid;grid-template-columns:minmax(0,2fr) minmax(320px,1fr);gap:20px;margin-top:24px;} .panel-card,.table-card,.generator,.revenue-card{background:#fff;border:1px solid var(--border);border-radius:20px;box-shadow:0 2px 8px rgba(15,23,42,.06);} .panel-card{padding:26px;} .panel-head{display:flex;justify-content:space-between;align-items:flex-start;} h2{margin:0;font-size:20px;} .panel-card p,.table-title p,.generator p{margin:6px 0 0;color:#8993a8;} .bolt{width:40px;height:40px;border-radius:12px;background:#eef5ff;display:grid;place-items:center;} .quick-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:22px;} .quick{border:0;border-radius:14px;padding:18px;text-align:left;position:relative;} .quick strong{display:block;font-size:16px}.quick span{display:block;margin-top:6px;font-size:13px;opacity:.7}.quick b{position:absolute;right:18px;top:22px}.quick.blue{background:#eef5ff;color:#1d63f0}.quick.green{background:#eafbf3;color:#009c69}.quick.yellow{background:#fff8e5;color:#d97706}.quick.red{background:#fff0f2;color:#ef334b}.progress{margin:13px 0}.progress div{display:flex;justify-content:space-between;font-size:14px;color:#59667a}.progress i{height:7px;background:#edf0f5;border-radius:999px;display:block;margin-top:8px;overflow:hidden}.progress em{height:100%;background:var(--blue);border-radius:999px;display:block;}
    .generator{padding:24px;display:flex;align-items:center;gap:16px;margin-bottom:18px;} .generator-icon{width:44px;height:44px;border-radius:14px;background:#eef5ff;color:var(--blue);display:grid;place-items:center;font-weight:900;font-size:22px;} .generator h2{font-size:18px}.generator-actions{margin-left:auto;display:flex;align-items:center;gap:10px;flex-wrap:wrap}.generator input{width:60px;height:38px;border:1px solid var(--border);border-radius:10px;text-align:center;outline:none;}
    .table-card{overflow:hidden;margin-top:18px;} .table-title{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;padding:24px;} .chips{display:flex;gap:8px;flex-wrap:wrap}.chips span{border-radius:999px;padding:6px 12px;font-size:12px;background:#f3f4f6;color:#536176;font-weight:800}.chips .ok{background:#e9fbf2;color:#008f61}.chips .trial{background:#eef5ff;color:#1d63f0}.chips .bad{background:#fff0f2;color:#e60019}.filter-row{display:flex;align-items:center;gap:10px;padding:14px 24px;border-top:1px solid var(--border);background:#fafbfc}.filter-row select{height:40px;border:1px solid var(--border);border-radius:12px;background:#fff;color:#536176;padding:0 14px;outline:none}.export-btn{margin-left:auto}.searchbar{height:44px;margin:16px 24px 0;border:1px solid var(--border);border-radius:13px;background:#fafbfc;display:flex;align-items:center;gap:10px;padding:0 14px;color:#8b95a6}.searchbar input{border:0;background:transparent;outline:none;flex:1;min-width:0;color:var(--text);} .table-wrap{overflow-x:auto;} table{width:100%;border-collapse:collapse;min-width:860px;} th{padding:14px 24px;text-align:left;color:#98a1b4;background:#fff;font-size:12px;font-weight:900;text-transform:uppercase;} th.right{text-align:right;} td{padding:16px 24px;border-top:1px solid #f0f2f6;color:#58657a;font-size:14px;vertical-align:middle}.code{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;color:#0c5cff;font-weight:900;letter-spacing:.6px}.client{display:flex;align-items:center;gap:12px}.client>div{width:36px;height:36px;border-radius:99px;display:grid;place-items:center;background:var(--blue);color:#fff;font-size:13px;font-weight:900;box-shadow:0 8px 15px rgba(47,125,246,.2);flex-shrink:0}.client strong{display:block;color:#1e293b}.client small{display:block;color:#8a93a5;margin-top:2px}.status{display:inline-flex;align-items:center;gap:6px;border-radius:99px;padding:6px 11px;font-size:12px;font-weight:900}.status i{width:7px;height:7px;border-radius:99px}.status.active{background:#e9fbf2;color:#008f61}.status.active i{background:var(--green)}.status.available{background:#eef5ff;color:#1d63f0}.status.available i{background:var(--blue)}.status.expired,.status.blocked{background:#fff0f2;color:#e60019}.status.expired i,.status.blocked i{background:var(--red)}.actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}.icon-btn{width:34px;height:34px;border:1px solid var(--border);border-radius:10px;background:#fff;color:#64748b;display:grid;place-items:center}.primary-mini{background:#6aa2ff!important;color:#fff!important;border-color:#6aa2ff!important}.danger{background:#fff0f2!important;color:var(--red)!important;border-color:#ffd7dc!important}.success{background:#e9fbf2!important;color:#009c69!important;border-color:#c9f3df!important}.mini-text{height:34px;border:1px solid #cfe2ff;background:#eef5ff;color:#1d63f0;border-radius:10px;font-weight:800;padding:0 10px}.empty{text-align:center;color:#98a1b4;padding:42px!important}.table-footer{border-top:1px solid var(--border);padding:14px 24px;color:#7f8ca3;font-size:14px;}
    .finance-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}.finance-card{background:#fff;border:1px solid var(--border);border-radius:18px;padding:24px}.finance-card span{font-size:12px;font-weight:900;color:#65738a}.finance-card strong{display:block;margin-top:12px;font-size:26px}.finance-card p{margin:5px 0 0;color:#8993a8}.finance-card.blue{border-color:#cfe2ff}.finance-card.green{border-color:#c7f3df}.finance-card.yellow{border-color:#ffe6a5}.finance-card.red{border-color:#ffd1d6}.finance-card.blue strong{color:#1d63f0}.finance-card.green strong{color:#008f61}.finance-card.yellow strong{color:#d97706}.finance-card.red strong{color:#e60019}.revenue-card{margin-top:18px;padding:26px;background:linear-gradient(135deg,#2f8bff,#1d5eff);color:#fff}.revenue-card span{font-weight:800;opacity:.9}.revenue-card strong{display:block;font-size:44px;margin-top:12px}.revenue-card p{margin:0;opacity:.8}
    .toast{position:fixed;right:24px;top:90px;z-index:100;background:#101827;color:#fff;padding:14px 16px;border-radius:14px;box-shadow:0 18px 50px rgba(15,23,42,.22);font-weight:800}.toast.erro{background:var(--red)} .modal-bg{position:fixed;inset:0;z-index:80;background:rgba(15,23,42,.46);display:grid;place-items:center;padding:22px}.modal-card{width:min(850px,100%);background:#fff;border-radius:22px;box-shadow:0 24px 90px rgba(15,23,42,.24);padding:26px}.small-modal{width:min(520px,100%)}.modal-top{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;border-bottom:1px solid var(--border);padding-bottom:16px;margin-bottom:18px}.modal-top span{display:block;color:var(--blue);text-transform:uppercase;font-size:12px;letter-spacing:1px;font-weight:900}.modal-top h2{margin:4px 0 0;font-size:22px}.modal-top button{border:1px solid var(--border);background:#fff;border-radius:10px;padding:9px 13px}.details-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.details-grid div{background:#f8f9fb;border:1px solid var(--border);border-radius:14px;padding:13px}.details-grid span{display:block;color:#8a93a5;font-size:12px;margin-bottom:5px}.details-grid strong{display:block;color:#101827;word-break:break-word}.modal-actions{display:flex;gap:10px;margin-top:18px}.modal-label{display:grid;gap:8px;color:#536176;font-size:14px;font-weight:800}.modal-label textarea{width:100%;min-height:110px;resize:vertical;border:1px solid var(--border);border-radius:14px;padding:12px;outline:none;}
    @media (max-width:1100px){.sidebar{width:88px}.brand{justify-content:center;padding:0}.brand>div:last-child,.menu-title,.menu-item span,.admin-card span,.admin-card svg{display:none}.menu-item{width:60px;height:60px;justify-content:center;padding:0;margin:0 auto 8px}.menu-item small{position:absolute;top:6px;right:6px}.admin-card{justify-content:center;padding:18px 0}.content{padding:18px}.kpis,.finance-kpis{grid-template-columns:repeat(2,1fr)}.dashboard-grid{grid-template-columns:1fr}.topbar{height:auto;align-items:flex-start;flex-direction:column;padding:18px}.top-actions{width:100%}.details-grid{grid-template-columns:repeat(2,1fr)}} @media(max-width:720px){.kpis,.finance-kpis,.quick-grid{grid-template-columns:1fr}.generator{align-items:flex-start;flex-direction:column}.generator-actions{margin-left:0}.table-title,.filter-row{align-items:flex-start;flex-direction:column}.export-btn{margin-left:0}.details-grid{grid-template-columns:1fr}}
  `}</style>;
}
