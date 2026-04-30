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

const Icon = ({ type }) => {
  const props = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  const icons = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    key: <><circle cx="7.5" cy="15.5" r="5.5" /><path d="m21 2-9.6 9.6" /><path d="m15 8 2 2" /><path d="m18 5 2 2" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
    billing: <><path d="M12 1v22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6" /></>,
    analytics: <><path d="M3 3v18h18" /><path d="M7 16v-5" /><path d="M12 16V8" /><path d="M17 16v-9" /></>,
    settings: <><path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.32.4.7.6 1.1.6H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z" /></>,
    logs: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /><path d="M16 13H8" /><path d="M16 17H8" /><path d="M10 9H8" /></>,
    export: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></>,
    plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>,
    filter: <><path d="M22 3H2l8 9.46V19l4 2v-8.54Z" /></>,
    eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></>,
    revoke: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
    copy: <><rect x="9" y="9" width="13" height="13" rx="2" /><rect x="2" y="2" width="13" height="13" rx="2" /></>,
    renew: <><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M3 21v-5h5" /><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /></>,
  };
  return <svg {...props}>{icons[type] || icons.dashboard}</svg>;
};

export default function AdminPanel() {
  const [logado, setLogado] = useState(() => localStorage.getItem("painel_atestado_logado") === "sim");
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [aba, setAba] = useState("dashboard");
  const [usuarios, setUsuarios] = useState([]);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("Todos");
  const [lote, setLote] = useState(5);
  const [carregando, setCarregando] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [selecionado, setSelecionado] = useState(null);

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
  }

  async function gerarCodigoUnico() {
    setGerando(true);

    for (let i = 0; i < 12; i++) {
      const codigo = gerarCodigo();

      const { error } = await supabase.from("usuarios").insert([
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
    alert("Não foi possível gerar um código único.");
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

  async function atualizarStatus(item, status) {
    const update = { status };

    if (status === STATUS.BLOQUEADO) {
      update.bloqueado_motivo = prompt("Motivo do bloqueio:", item.bloqueado_motivo || "") || "Bloqueio manual";
    }

    if (status === STATUS.ATIVO) {
      update.validade = item.validade && item.validade >= hojeISO() ? item.validade : validade90Dias();
      update.pagamento_status = "Pago";
      update.pago_em = new Date().toISOString();
      update.renovado_em = new Date().toISOString();
      update.bloqueado_motivo = null;
    }

    if (status === STATUS.DISPONIVEL) {
      const ok = confirm("Liberar esta licença? Os dados do cliente serão removidos.");
      if (!ok) return;

      Object.assign(update, {
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
        pagamento_status: "Pendente",
        pago_em: null,
        renovado_em: null,
        vencido_em: null,
      });
    }

    const { error } = await supabase.from("usuarios").update(update).eq("id", item.id);

    if (error) {
      console.error(error);
      alert("Erro ao atualizar.");
      return;
    }

    setSelecionado(null);
    await carregar();
  }

  async function renovar(item) {
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
      .eq("id", item.id);

    if (error) {
      console.error(error);
      alert("Erro ao renovar.");
      return;
    }

    setSelecionado(null);
    await carregar();
    alert(`Licença renovada até ${formatarData(novaValidade)}.`);
  }

  async function salvarObs(item) {
    const observacoes = prompt("Observação:", item.observacoes || "");
    if (observacoes === null) return;

    const { error } = await supabase.from("usuarios").update({ observacoes }).eq("id", item.id);

    if (error) {
      console.error(error);
      alert("Erro ao salvar observação.");
      return;
    }

    await carregar();
  }

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return usuarios.filter((u) => {
      const texto = `${u.codigo || ""} ${u.nome || ""} ${u.cpf || ""} ${u.telefone || ""} ${u.email || ""}`.toLowerCase();
      const buscaOk = !termo || texto.includes(termo);
      const filtroOk = filtro === "Todos" || u.status === filtro;
      return buscaOk && filtroOk;
    });
  }, [usuarios, busca, filtro]);

  const clientes = useMemo(() => filtrados.filter((u) => u.nome), [filtrados]);

  const stats = useMemo(() => {
    const s = {
      total: usuarios.length,
      disponivel: 0,
      ativo: 0,
      bloqueado: 0,
      vencido: 0,
      pendente: 0,
      erro: 0,
      envios: 0,
    };

    usuarios.forEach((u) => {
      if (u.status === STATUS.DISPONIVEL) s.disponivel++;
      if (u.status === STATUS.ATIVO) s.ativo++;
      if (u.status === STATUS.BLOQUEADO) s.bloqueado++;
      if (u.status === STATUS.VENCIDO) s.vencido++;
      if ((u.pagamento_status || "Pendente") !== "Pago") s.pendente++;
      if (u.ultimo_erro) s.erro++;
      s.envios += Number(u.envios || 0);
    });

    return s;
  }, [usuarios]);

  if (!logado) {
    return (
      <>
        <Style />
        <div className="login-page">
          <form className="login-card" onSubmit={entrar}>
            <div className="app-mark">AF</div>
            <h1>Atestado Fácil</h1>
            <p>Painel administrativo</p>
            <input placeholder="Usuário" value={usuario} onChange={(e) => setUsuario(e.target.value)} />
            <input placeholder="Senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} />
            <button type="submit">Entrar</button>
          </form>
        </div>
      </>
    );
  }

  const listaPrincipal = aba === "usuarios" ? clientes : filtrados;

  return (
    <>
      <Style />
      <div className="layout">
        <aside className="sidebar">
          <div>
            <div className="brand">
              <div className="app-mark">AF</div>
              <div>
                <strong>Atestado Fácil</strong>
                <span>v1.0.0</span>
              </div>
            </div>

            <NavGroup title="Principal">
              <NavItem active={aba === "dashboard"} onClick={() => setAba("dashboard")} icon="dashboard" label="Dashboard" />
              <NavItem active={aba === "codigos"} onClick={() => setAba("codigos")} icon="key" label="Licenças" badge={stats.total} />
              <NavItem active={aba === "usuarios"} onClick={() => setAba("usuarios")} icon="users" label="Clientes" badge={clientes.length} />
              <NavItem active={aba === "pagamentos"} onClick={() => setAba("pagamentos")} icon="billing" label="Faturamento" />
            </NavGroup>

            <NavGroup title="Sistema">
              <NavItem active={aba === "documentos"} onClick={() => setAba("documentos")} icon="logs" label="Documentos" />
              <NavItem active={aba === "erros"} onClick={() => setAba("erros")} icon="logs" label="Logs" badge={stats.erro} />
              <NavItem active={false} onClick={carregar} icon="settings" label={carregando ? "Atualizando" : "Configurações"} />
            </NavGroup>
          </div>

          <button className="user-card" onClick={sair}>
            <div>AD</div>
            <span>
              <strong>Admin</strong>
              <small>Sair do painel</small>
            </span>
          </button>
        </aside>

        <main className="main">
          <header className="topbar">
            <div>
              <h1>{tituloAba(aba)} <span>·</span> Visão Geral</h1>
              <p>{new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })} — atualizado agora</p>
            </div>

            <div className="top-actions">
              <span className="prod"><i></i> Produção</span>
              <button className="outline"><Icon type="export" /> Exportar</button>
              <button className="primary" onClick={gerarCodigoUnico} disabled={gerando}><Icon type="plus" /> Nova Licença</button>
            </div>
          </header>

          {(aba === "dashboard" || aba === "codigos") && (
            <section className="metrics">
              <Metric label="Licenças ativas" value={stats.ativo} icon="key" tint="blue" />
              <Metric label="Códigos livres" value={stats.disponivel} icon="billing" tint="green" />
              <Metric label="Pendentes" value={stats.pendente} icon="analytics" tint="red" />
              <Metric label="Erros abertos" value={stats.erro} icon="logs" tint="yellow" />
            </section>
          )}

          {aba === "codigos" && (
            <section className="generator">
              <div>
                <h2>Gerar licenças</h2>
                <p>Licenças com 5 dígitos, liberadas para cadastro no app.</p>
              </div>
              <div>
                <button className="primary" onClick={gerarCodigoUnico} disabled={gerando}><Icon type="plus" /> Gerar 1</button>
                <input type="number" min="1" max="100" value={lote} onChange={(e) => setLote(e.target.value)} />
                <button className="outline" onClick={gerarLote} disabled={gerando}>Gerar lote</button>
              </div>
            </section>
          )}

          {aba === "dashboard" || aba === "codigos" || aba === "usuarios" ? (
            <Licencas
              titulo={aba === "usuarios" ? "Clientes — Todas as Contas" : "Licenças — Todas as Contas"}
              subtitulo={aba === "usuarios" ? "Gerencie clientes já vinculados" : "Gerencie, filtre e exporte registros de licença"}
              lista={listaPrincipal}
              busca={busca}
              setBusca={setBusca}
              filtro={filtro}
              setFiltro={setFiltro}
              copiarCodigo={copiarCodigo}
              abrir={setSelecionado}
              renovar={renovar}
              atualizarStatus={atualizarStatus}
              stats={stats}
            />
          ) : null}

          {aba === "pagamentos" && <Pagamentos lista={usuarios.filter((u) => u.nome)} renovar={renovar} />}
          {aba === "documentos" && <Documentos lista={usuarios.filter((u) => u.nome)} />}
          {aba === "erros" && <Erros lista={usuarios.filter((u) => u.ultimo_erro)} />}

          {selecionado && (
            <Modal item={selecionado} fechar={() => setSelecionado(null)} renovar={renovar} atualizarStatus={atualizarStatus} salvarObs={salvarObs} />
          )}
        </main>
      </div>
    </>
  );
}

function tituloAba(aba) {
  return {
    dashboard: "Dashboard",
    codigos: "Licenças",
    usuarios: "Clientes",
    pagamentos: "Faturamento",
    documentos: "Documentos",
    erros: "Logs",
  }[aba] || "Dashboard";
}

function NavGroup({ title, children }) {
  return (
    <div className="nav-group">
      <p>{title}</p>
      {children}
    </div>
  );
}

function NavItem({ active, onClick, icon, label, badge }) {
  return (
    <button className={active ? "nav-item active" : "nav-item"} onClick={onClick}>
      <Icon type={icon} />
      <span>{label}</span>
      {badge !== undefined ? <small>{badge}</small> : null}
    </button>
  );
}

function Metric({ label, value, icon, tint }) {
  return (
    <article className={`metric ${tint}`}>
      <div>
        <span>{label}</span>
        <b>{value || "—"}</b>
        <em></em>
      </div>
      <i><Icon type={icon} /></i>
    </article>
  );
}

function Licencas({ titulo, subtitulo, lista, busca, setBusca, filtro, setFiltro, copiarCodigo, abrir, renovar, atualizarStatus, stats }) {
  return (
    <section className="table-card">
      <div className="table-title">
        <div>
          <h2>{titulo}</h2>
          <p>{subtitulo}</p>
        </div>
        <div className="chips">
          <span>Total: {stats.total}</span>
          <span className="ok">Ativas: {stats.ativo}</span>
          <span className="trial">Livres: {stats.disponivel}</span>
          <span className="bad">Expiradas: {stats.vencido}</span>
        </div>
      </div>

      <div className="table-tools">
        <label>
          <Icon type="search" />
          <input placeholder="Buscar por código ou cliente..." value={busca} onChange={(e) => setBusca(e.target.value)} />
        </label>

        <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option>Todos</option>
          <option>Disponível</option>
          <option>Ativo</option>
          <option>Bloqueado</option>
          <option>Vencido</option>
        </select>

        <button><Icon type="filter" /> Filtrar</button>
        <button><Icon type="export" /> Exportar</button>
      </div>

      <div className="table">
        <div className="thead">
          <span>Código</span>
          <span>Cliente</span>
          <span>Status</span>
          <span>Validade</span>
          <span>Ações</span>
        </div>

        {lista.length === 0 ? (
          <div className="empty">Nenhum registro encontrado.</div>
        ) : (
          lista.map((item, index) => (
            <div className="trow" key={item.id}>
              <span className="code">{item.codigo || "—"}</span>

              <span className="client-cell">
                <i className={`avatar-color color-${index % 5}`}>{iniciais(item.nome)}</i>
                <span>
                  <strong>{item.nome || "Aguardando dados"}</strong>
                  <small>{item.email || item.telefone || "Cliente ainda não vinculado"}</small>
                </span>
              </span>

              <Badge status={item.status} />
              <span>{formatarData(item.validade)}</span>

              <span className="actions">
                <button className="view" onClick={() => abrir(item)}><Icon type="eye" /> Ver</button>
                <button onClick={() => abrir(item)}><Icon type="edit" /> Editar</button>
                <button onClick={() => copiarCodigo(item.codigo)}><Icon type="copy" /> Copiar</button>
                {item.status === STATUS.ATIVO || item.status === STATUS.VENCIDO ? (
                  <button onClick={() => renovar(item)}><Icon type="renew" /> Renovar</button>
                ) : null}
                {item.status === STATUS.BLOQUEADO ? (
                  <button onClick={() => atualizarStatus(item, STATUS.ATIVO)}>Liberar</button>
                ) : (
                  <button className="revoke" onClick={() => atualizarStatus(item, STATUS.BLOQUEADO)}><Icon type="revoke" /> Revogar</button>
                )}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="table-footer">
        <span>Mostrando {lista.length} de {stats.total} registros</span>
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

function Pagamentos({ lista, renovar }) {
  return (
    <section className="table-card simple">
      <div className="table-title"><div><h2>Faturamento</h2><p>Pagamentos, renovações e validade de acesso</p></div></div>
      <div className="table pay">
        <div className="thead"><span>Cliente</span><span>Código</span><span>Status pagamento</span><span>Pago em</span><span>Validade</span><span>Ação</span></div>
        {lista.length === 0 ? <div className="empty">Nenhum pagamento encontrado.</div> : lista.map((item) => (
          <div className="trow" key={item.id}>
            <span>{item.nome}</span><span className="code">{item.codigo}</span><span>{item.pagamento_status || "Pendente"}</span><span>{formatarDataHora(item.pago_em)}</span><span>{formatarData(item.validade)}</span>
            <button className="view" onClick={() => renovar(item)}>Renovar</button>
          </div>
        ))}
      </div>
    </section>
  );
}

function Documentos({ lista }) {
  return (
    <section className="table-card simple">
      <div className="table-title"><div><h2>Documentos</h2><p>Termos de responsabilidade, comprovantes e anexos</p></div></div>
      <div className="table docs">
        <div className="thead"><span>Cliente</span><span>Código</span><span>Termos</span><span>Comprovante</span><span>Alterações</span></div>
        {lista.length === 0 ? <div className="empty">Nenhum documento encontrado.</div> : lista.map((item) => (
          <div className="trow" key={item.id}>
            <span>{item.nome}</span><span className="code">{item.codigo}</span>
            <span>{item.termos_pdf ? <a href={item.termos_pdf} target="_blank" rel="noreferrer">Abrir</a> : "Não anexado"}</span>
            <span>{item.comprovante_pdf ? <a href={item.comprovante_pdf} target="_blank" rel="noreferrer">Abrir</a> : "Não anexado"}</span>
            <span>{item.alteracoes || 0}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Erros({ lista }) {
  return (
    <section className="table-card simple">
      <div className="table-title"><div><h2>Logs</h2><p>Falhas de envio registradas pelo aplicativo</p></div></div>
      <div className="table logs">
        <div className="thead"><span>Cliente/código</span><span>Data</span><span>Erro</span></div>
        {lista.length === 0 ? <div className="empty">Nenhum erro registrado.</div> : lista.map((item) => (
          <div className="trow" key={item.id}><span>{item.nome || item.codigo}</span><span>{formatarDataHora(item.ultimo_erro_em)}</span><span>{item.ultimo_erro}</span></div>
        ))}
      </div>
    </section>
  );
}

function Modal({ item, fechar, renovar, atualizarStatus, salvarObs }) {
  return (
    <div className="modal-bg">
      <div className="modal">
        <div className="modal-top">
          <div>
            <span>Licença</span>
            <h2>{item.nome || item.codigo}</h2>
          </div>
          <button onClick={fechar}>Fechar</button>
        </div>

        <div className="details">
          <Detail label="Código" value={item.codigo} />
          <Detail label="Status" value={item.status} />
          <Detail label="CPF" value={item.cpf || "—"} />
          <Detail label="Telefone" value={item.telefone || "—"} />
          <Detail label="E-mail" value={item.email || "—"} />
          <Detail label="Cargo" value={item.cargo || "—"} />
          <Detail label="Órgão" value={item.orgao || "—"} />
          <Detail label="Validade" value={formatarData(item.validade)} />
          <Detail label="Envios" value={item.envios || 0} />
          <Detail label="Alterações" value={item.alteracoes || 0} />
          <Detail label="Pagamento" value={item.pagamento_status || "Pendente"} />
          <Detail label="Usado em" value={formatarDataHora(item.usado_em)} />
        </div>

        {item.observacoes && <div className="note">{item.observacoes}</div>}

        <div className="modal-actions">
          <button className="primary" onClick={() => renovar(item)}>Renovar 90 dias</button>
          <button onClick={() => salvarObs(item)}>Observação</button>
          <button onClick={() => atualizarStatus(item, STATUS.BLOQUEADO)}>Bloquear</button>
          <button onClick={() => atualizarStatus(item, STATUS.DISPONIVEL)}>Liberar licença</button>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return <div className="detail"><span>{label}</span><b>{value}</b></div>;
}

function Badge({ status }) {
  const cls = status === STATUS.ATIVO ? "active" : status === STATUS.BLOQUEADO ? "blocked" : status === STATUS.VENCIDO ? "expired" : "trial";
  const text = status === STATUS.DISPONIVEL ? "Livre" : status || STATUS.DISPONIVEL;
  return <span className={`badge ${cls}`}><i></i>{text}</span>;
}

function Style() {
  return (
    <style>{`
      * { box-sizing: border-box; }
      body { margin: 0; background: #f3f4f8; color: #0f172a; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      button, input, select { font: inherit; }

      .login-page { min-height: 100vh; display: grid; place-items: center; background: #f3f4f8; }
      .login-card { width: 370px; padding: 30px; border-radius: 18px; border: 1px solid #e5e7eb; background: #fff; box-shadow: 0 22px 70px rgba(15,23,42,.12); }
      .login-card h1 { margin: 22px 0 4px; font-size: 24px; }
      .login-card p { margin: 0 0 24px; color: #667085; }
      .login-card input { width: 100%; height: 44px; border: 1px solid #d7dce5; border-radius: 9px; padding: 0 12px; margin-bottom: 10px; outline: none; }
      .login-card button { width: 100%; height: 44px; border: 0; border-radius: 9px; background: #2558d8; color: #fff; font-weight: 700; cursor: pointer; }

      .layout { width: 100vw; min-height: 100vh; display: flex; background: #f3f4f8; }
      .sidebar { width: 280px; min-height: 100vh; background: #111827; color: #d6deeb; display: flex; flex-direction: column; justify-content: space-between; border-right: 1px solid #202b3b; }
      .brand { height: 68px; display: flex; align-items: center; gap: 14px; padding: 0 24px; border-bottom: 1px solid #202b3b; }
      .app-mark { width: 38px; height: 38px; display: grid; place-items: center; border-radius: 9px; background: linear-gradient(135deg, #2f6df6, #1744c4); color: #fff; font-weight: 800; }
      .brand strong { display: block; color: #fff; font-size: 16px; line-height: 1; }
      .brand span { display: block; margin-top: 3px; font-size: 12px; color: #8ea0b8; }
      .nav-group { padding: 24px 14px 4px; }
      .nav-group p { margin: 0 0 9px 10px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #56657a; }
      .nav-item { width: 100%; height: 44px; border: 0; background: transparent; color: #bec8d8; border-radius: 7px; display: flex; align-items: center; gap: 13px; padding: 0 12px; cursor: pointer; margin-bottom: 5px; }
      .nav-item span { flex: 1; text-align: left; font-size: 15px; font-weight: 500; }
      .nav-item small { min-width: 30px; height: 22px; display: grid; place-items: center; border-radius: 999px; background: #334155; color: #cbd5e1; font-size: 12px; font-weight: 700; }
      .nav-item.active { background: #2558d8; color: #fff; }
      .nav-item.active small { background: rgba(255,255,255,.18); color: #fff; }
      .user-card { margin: 18px; padding: 14px 12px; border: 0; border-top: 1px solid #202b3b; background: transparent; color: #d6deeb; display: flex; align-items: center; gap: 12px; cursor: pointer; }
      .user-card div { width: 38px; height: 38px; display: grid; place-items: center; border-radius: 50%; background: #6847e8; color: #fff; font-weight: 800; }
      .user-card span { display: block; text-align: left; }
      .user-card strong { display: block; color: #fff; font-size: 14px; }
      .user-card small { color: #9aa8bd; }

      .main { flex: 1; min-width: 0; }
      .topbar { height: 68px; background: #fff; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; padding: 0 36px; }
      .topbar h1 { margin: 0; font-size: 19px; font-weight: 800; letter-spacing: -.2px; }
      .topbar h1 span { margin: 0 8px; color: #94a3b8; }
      .topbar p { margin: 2px 0 0; color: #94a3b8; font-size: 14px; }
      .top-actions { display: flex; align-items: center; gap: 12px; }
      .prod { display: inline-flex; align-items: center; gap: 8px; color: #667085; font-size: 14px; }
      .prod i { width: 10px; height: 10px; border-radius: 50%; background: #12b76a; box-shadow: 0 0 0 3px #dcfae6; }
      .outline, .primary { height: 40px; display: inline-flex; align-items: center; gap: 8px; border-radius: 7px; padding: 0 16px; cursor: pointer; font-weight: 600; }
      .outline { background: #fff; border: 1px solid #dde3ec; color: #4b5565; }
      .primary { border: 1px solid #2558d8; background: #2558d8; color: #fff; box-shadow: 0 2px 6px rgba(37,88,216,.2); }

      .metrics { display: grid; grid-template-columns: repeat(4, minmax(200px, 1fr)); gap: 20px; padding: 36px 36px 24px; }
      .metric { min-height: 154px; border: 1px solid #dde3ec; border-radius: 12px; background: #fff; padding: 26px; display: flex; justify-content: space-between; box-shadow: 0 2px 6px rgba(15,23,42,.08); }
      .metric span { display: block; color: #8992a3; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: .8px; margin-bottom: 24px; }
      .metric b { display: block; font-size: 28px; font-weight: 700; color: #111827; }
      .metric em { display: block; width: 170px; height: 12px; border-radius: 999px; background: #f1f2f6; margin-top: 20px; }
      .metric i { width: 36px; height: 36px; border-radius: 8px; display: grid; place-items: center; font-style: normal; }
      .metric.blue i { background: #edf4ff; color: #2558d8; }
      .metric.green i { background: #e9fbf2; color: #039855; }
      .metric.red i { background: #fff0f0; color: #f04438; }
      .metric.yellow i { background: #fff8e8; color: #f79009; }

      .generator { margin: 0 36px 20px; border: 1px solid #dde3ec; border-radius: 12px; background: #fff; padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; }
      .generator h2 { margin: 0 0 4px; font-size: 18px; }
      .generator p { margin: 0; color: #8992a3; }
      .generator div:last-child { display: flex; gap: 10px; align-items: center; }
      .generator input { width: 72px; height: 40px; border: 1px solid #dde3ec; border-radius: 7px; text-align: center; }

      .table-card { margin: 0 36px 36px; border: 1px solid #dde3ec; border-radius: 12px; background: #fff; overflow: hidden; box-shadow: 0 2px 6px rgba(15,23,42,.08); }
      .table-card.simple { margin-top: 36px; }
      .table-title { display: flex; align-items: flex-end; justify-content: space-between; padding: 26px 24px 14px; }
      .table-title h2 { margin: 0; font-size: 18px; font-weight: 800; }
      .table-title p { margin: 2px 0 0; color: #98a2b3; font-size: 14px; }
      .chips { display: flex; gap: 10px; flex-wrap: wrap; }
      .chips span { min-height: 28px; padding: 5px 13px; border-radius: 999px; background: #f8fafc; color: #475467; font-size: 13px; }
      .chips .ok { background: #ecfdf3; color: #027a48; }
      .chips .trial { background: #eff4ff; color: #1d4ed8; }
      .chips .bad { background: #fef3f2; color: #d92d20; }

      .table-tools { min-height: 76px; padding: 16px 24px; border-top: 1px solid #eef1f5; display: flex; align-items: center; gap: 12px; }
      .table-tools label { width: 360px; height: 40px; display: flex; align-items: center; gap: 10px; background: #f8f9fb; border: 1px solid #dde3ec; border-radius: 7px; padding: 0 13px; color: #98a2b3; }
      .table-tools input { flex: 1; border: 0; outline: none; background: transparent; color: #111827; }
      .table-tools select, .table-tools button { height: 40px; border: 1px solid #dde3ec; background: #fff; color: #4b5565; border-radius: 7px; padding: 0 14px; display: inline-flex; align-items: center; gap: 8px; cursor: pointer; }
      .table-tools select { margin-left: auto; }

      .table { width: 100%; }
      .thead, .trow { display: grid; grid-template-columns: 160px 1.5fr 240px 180px 300px; align-items: center; }
      .table.pay .thead, .table.pay .trow { grid-template-columns: 1.2fr 150px 180px 180px 160px 180px; }
      .table.docs .thead, .table.docs .trow { grid-template-columns: 1.4fr 150px 170px 170px 160px; }
      .table.logs .thead, .table.logs .trow { grid-template-columns: 240px 200px 1fr; }
      .thead { background: #fbfcfe; border-top: 1px solid #eef1f5; border-bottom: 1px solid #eef1f5; color: #98a2b3; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .8px; }
      .thead span, .trow > span, .trow > button { padding: 14px 20px; }
      .trow { min-height: 66px; border-bottom: 1px solid #f0f2f5; color: #556070; font-size: 14px; }
      .trow:last-child { border-bottom: 0; }
      .code { color: #1d4ed8; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-weight: 700; letter-spacing: .6px; }

      .client-cell { display: flex; align-items: center; gap: 12px; }
      .client-cell i { width: 36px; height: 36px; flex: 0 0 auto; border-radius: 50%; display: grid; place-items: center; font-style: normal; color: #fff; font-weight: 800; font-size: 13px; }
      .client-cell strong { display: block; color: #111827; font-weight: 700; }
      .client-cell small { color: #98a2b3; }
      .color-0 { background: #2558d8; } .color-1 { background: #7047eb; } .color-2 { background: #e07b00; } .color-3 { background: #009a6e; } .color-4 { background: #e92929; }

      .badge { width: fit-content; min-height: 26px; padding: 4px 12px; border-radius: 999px; display: inline-flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 700; }
      .badge i { width: 7px; height: 7px; border-radius: 50%; }
      .badge.active { background: #ecfdf3; color: #027a48; } .badge.active i { background: #12b76a; }
      .badge.trial { background: #eff4ff; color: #1d4ed8; } .badge.trial i { background: #2e6bff; }
      .badge.blocked { background: #fef3f2; color: #d92d20; } .badge.blocked i { background: #f04438; }
      .badge.expired { background: #fff7ed; color: #c2410c; } .badge.expired i { background: #f79009; }

      .actions { display: flex; gap: 8px; flex-wrap: wrap; padding-right: 14px; }
      .actions button, .modal-actions button, .modal-top button { min-height: 34px; border: 1px solid #dde3ec; background: #f8fafc; color: #475467; border-radius: 7px; padding: 0 10px; display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; cursor: pointer; }
      .actions .view { background: #eff4ff; color: #1d4ed8; border-color: #eff4ff; }
      .actions .revoke { background: #fef3f2; color: #d92d20; border-color: #fef3f2; }
      .blue-btn { min-height: 34px; border: 0; border-radius: 7px; background: #2558d8; color: #fff; padding: 0 12px; cursor: pointer; font-weight: 700; }

      .table-footer { height: 54px; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; border-top: 1px solid #eef1f5; color: #98a2b3; font-size: 14px; }
      .table-footer div { display: flex; gap: 6px; }
      .table-footer button { width: 34px; height: 34px; border: 1px solid #dde3ec; border-radius: 7px; background: #fff; color: #475467; cursor: pointer; }
      .table-footer button.active { background: #2558d8; color: #fff; border-color: #2558d8; }

      .empty { padding: 34px; color: #98a2b3; text-align: center; }
      a { color: #2558d8; font-weight: 700; text-decoration: none; }

      .modal-bg { position: fixed; inset: 0; display: grid; place-items: center; background: rgba(15,23,42,.45); z-index: 50; padding: 24px; }
      .modal { width: min(940px, 100%); background: #fff; border-radius: 16px; padding: 24px; box-shadow: 0 24px 90px rgba(15,23,42,.25); }
      .modal-top { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #eef1f5; padding-bottom: 16px; margin-bottom: 18px; }
      .modal-top span { color: #2558d8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 800; }
      .modal-top h2 { margin: 4px 0 0; font-size: 24px; }
      .details { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
      .detail { background: #f8fafc; border: 1px solid #eef1f5; border-radius: 10px; padding: 13px; }
      .detail span { display: block; color: #98a2b3; font-size: 12px; margin-bottom: 4px; }
      .detail b { display: block; color: #111827; word-break: break-word; }
      .note { margin-top: 14px; background: #eff4ff; color: #1d4ed8; border-radius: 10px; padding: 13px; }
      .modal-actions { display: flex; gap: 10px; margin-top: 18px; }

      @media (max-width: 1250px) {
        .metrics { grid-template-columns: repeat(2, 1fr); }
        .table-card { overflow-x: auto; }
        .table { min-width: 1180px; }
      }
    `}</style>
  );
}