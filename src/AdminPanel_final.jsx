import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

const ADMIN_USER = "admin";
const ADMIN_PASS = "1234";

const STATUS = {
  DISPONIVEL: "DisponÃ­vel",
  ATIVO: "Ativo",
  BLOQUEADO: "Bloqueado",
  VENCIDO: "Vencido",
};

function gerarCodigo() {
  return String(Math.floor(10000 + Math.random() * 90000)); // 5 dÃ­gitos, sem hÃ­fen
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

function hojeISO() {
  return new Date().toISOString().split("T")[0];
}

function validade90Dias() {
  const d = new Date();
  d.setDate(d.getDate() + 90);
  return d.toISOString().split("T")[0];
}

export default function AdminPanel() {
  const [logado, setLogado] = useState(() => localStorage.getItem("painel_atestado_logado") === "sim");
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [aba, setAba] = useState("dashboard");
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("Todos");
  const [usuarios, setUsuarios] = useState([]);
  const [selecionado, setSelecionado] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [lote, setLote] = useState(5);

  useEffect(() => {
    if (logado) carregarUsuarios();
  }, [logado]);

  async function carregarUsuarios() {
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
      alert("Erro ao carregar dados do painel. Confira as colunas do Supabase e as variÃ¡veis da Vercel.");
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
      alert("Login invÃ¡lido");
    }
  }

  function sair() {
    localStorage.removeItem("painel_atestado_logado");
    setLogado(false);
    setUsuario("");
    setSenha("");
  }

  async function gerarNovoCodigo(copiar = true) {
    setGerando(true);
    let codigo = gerarCodigo();

    for (let i = 0; i < 7; i += 1) {
      const { error } = await supabase.from("usuarios").insert([
        { codigo, status: STATUS.DISPONIVEL, sistema: "", pagamento_status: "Pendente" },
      ]);

      if (!error) {
        setGerando(false);
        await carregarUsuarios();
        if (copiar) {
          await navigator.clipboard?.writeText(codigo).catch(() => {});
          alert(`CÃ³digo gerado e copiado: ${codigo}`);
        }
        return codigo;
      }

      if (String(error.message || "").toLowerCase().includes("duplicate")) {
        codigo = gerarCodigo();
      } else {
        console.error(error);
        alert("Erro ao gerar cÃ³digo.");
        setGerando(false);
        return null;
      }
    }

    setGerando(false);
    alert("NÃ£o foi possÃ­vel gerar um cÃ³digo Ãºnico. Tente novamente.");
    return null;
  }

  async function gerarLote() {
    const qtd = Math.max(1, Math.min(Number(lote) || 1, 100));
    setGerando(true);
    const registros = Array.from({ length: qtd }, () => ({
      codigo: gerarCodigo(),
      status: STATUS.DISPONIVEL,
      sistema: "",
      pagamento_status: "Pendente",
    }));

    const { error } = await supabase.from("usuarios").insert(registros);
    setGerando(false);

    if (error) {
      console.error(error);
      alert("Erro ao gerar lote. Tente novamente.");
      return;
    }

    await carregarUsuarios();
    alert(`${qtd} cÃ³digos gerados.`);
  }

  async function alterarStatus(item, novoStatus) {
    const updates = { status: novoStatus };

    if (novoStatus === STATUS.BLOQUEADO) {
      updates.bloqueado_motivo = prompt("Motivo do bloqueio (opcional):") || "Bloqueio manual";
    }

    if (novoStatus === STATUS.ATIVO) {
      updates.validade = item.validade && item.validade >= hojeISO() ? item.validade : validade90Dias();
      updates.bloqueado_motivo = null;
      updates.pagamento_status = "Pago";
      updates.pago_em = new Date().toISOString();
      updates.renovado_em = new Date().toISOString();
    }

    if (novoStatus === STATUS.DISPONIVEL) {
      const ok = confirm("Liberar este cÃ³digo novamente? Isso apaga os dados do cliente vinculados a ele.");
      if (!ok) return;
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
        pagamento_status: "Pendente",
        pago_em: null,
        renovado_em: null,
        vencido_em: null,
      });
    }

    const { error } = await supabase.from("usuarios").update(updates).eq("id", item.id);
    if (error) {
      console.error(error);
      alert("Erro ao alterar status.");
      return;
    }
    await carregarUsuarios();
    setSelecionado(null);
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
      alert("Erro ao renovar acesso.");
      return;
    }

    await carregarUsuarios();
    alert(`Acesso renovado atÃ© ${formatarData(novaValidade)}.`);
  }

  async function salvarObservacao(item) {
    const obs = prompt("ObservaÃ§Ã£o do cliente:", item.observacoes || "");
    if (obs === null) return;
    const { error } = await supabase.from("usuarios").update({ observacoes: obs }).eq("id", item.id);
    if (error) alert("Erro ao salvar observaÃ§Ã£o.");
    await carregarUsuarios();
  }

  async function copiarCodigo(codigo) {
    await navigator.clipboard?.writeText(codigo).catch(() => {});
    alert(`CÃ³digo copiado: ${codigo}`);
  }

  const listaFiltrada = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return usuarios.filter((u) => {
      const bateFiltro = filtro === "Todos" || u.status === filtro;
      const texto = `${u.codigo || ""} ${u.nome || ""} ${u.cpf || ""} ${u.email || ""} ${u.telefone || ""}`.toLowerCase();
      return bateFiltro && (!termo || texto.includes(termo));
    });
  }, [usuarios, busca, filtro]);

  const stats = useMemo(() => {
    const s = {
      total: usuarios.length,
      disponivel: 0,
      ativo: 0,
      bloqueado: 0,
      vencido: 0,
      pendentePagamento: 0,
      erros: 0,
      envios: 0,
      alteracoes: 0,
    };
    usuarios.forEach((u) => {
      if (u.status === STATUS.DISPONIVEL) s.disponivel += 1;
      if (u.status === STATUS.ATIVO) s.ativo += 1;
      if (u.status === STATUS.BLOQUEADO) s.bloqueado += 1;
      if (u.status === STATUS.VENCIDO) s.vencido += 1;
      if ((u.pagamento_status || "Pendente") !== "Pago") s.pendentePagamento += 1;
      if (u.ultimo_erro) s.erros += 1;
      s.envios += Number(u.envios || 0);
      s.alteracoes += Number(u.alteracoes || 0);
    });
    return s;
  }, [usuarios]);

  if (!logado) {
    return (
      <div style={styles.loginPage}>
        <form style={styles.loginCard} onSubmit={entrar}>
          <div style={styles.logo}>AF</div>
          <h1 style={styles.loginTitle}>Painel Atestado FÃ¡cil</h1>
          <p style={styles.loginText}>Gerencie acessos, pagamentos, vencimentos e erros.</p>
          <input placeholder="UsuÃ¡rio" value={usuario} onChange={(e) => setUsuario(e.target.value)} style={styles.input} />
          <input placeholder="Senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} style={styles.input} />
          <button type="submit" style={styles.primaryButton}>Entrar</button>
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
              <strong>Atestado FÃ¡cil</strong>
              <span style={styles.mutedBlock}>Painel ADM</span>
            </div>
          </div>

          {[
            ["dashboard", "Dashboard"],
            ["codigos", "CÃ³digos"],
            ["usuarios", "UsuÃ¡rios"],
            ["pagamentos", "Pagamentos"],
            ["documentos", "Documentos"],
            ["erros", "Erros"],
          ].map(([id, label]) => (
            <button key={id} onClick={() => setAba(id)} style={aba === id ? styles.menuActive : styles.menuButton}>
              {label}
            </button>
          ))}
        </div>
        <button style={styles.logoutButton} onClick={sair}>Sair</button>
      </aside>

      <main style={styles.main}>
        <header style={styles.header}>
          <div>
            <span style={styles.eyebrow}>AdministraÃ§Ã£o</span>
            <h1 style={styles.title}>{tituloAba(aba)}</h1>
            <p style={styles.subtitle}>Sistema de controle do Atestado FÃ¡cil.</p>
          </div>
          <button style={styles.secondaryButton} onClick={carregarUsuarios}>{carregando ? "Atualizando..." : "Atualizar"}</button>
        </header>

        {aba === "dashboard" && <Dashboard stats={stats} setAba={setAba} />}
        {aba === "codigos" && <Codigos gerando={gerando} gerarNovoCodigo={gerarNovoCodigo} gerarLote={gerarLote} lote={lote} setLote={setLote} lista={listaFiltrada} busca={busca} setBusca={setBusca} filtro={filtro} setFiltro={setFiltro} copiarCodigo={copiarCodigo} alterarStatus={alterarStatus} />}
        {aba === "usuarios" && <Usuarios lista={listaFiltrada.filter((u) => u.nome)} busca={busca} setBusca={setBusca} setSelecionado={setSelecionado} renovar={renovar} alterarStatus={alterarStatus} salvarObservacao={salvarObservacao} />}
        {aba === "pagamentos" && <Pagamentos lista={usuarios.filter((u) => u.nome)} renovar={renovar} alterarStatus={alterarStatus} />}
        {aba === "documentos" && <Documentos lista={usuarios.filter((u) => u.nome)} />}
        {aba === "erros" && <Erros lista={usuarios.filter((u) => u.ultimo_erro)} />}

        {selecionado && <ModalCliente item={selecionado} fechar={() => setSelecionado(null)} renovar={renovar} alterarStatus={alterarStatus} />}
      </main>
    </div>
  );
}

function tituloAba(aba) {
  const nomes = { dashboard: "Dashboard", codigos: "CÃ³digos de acesso", usuarios: "Gerenciar usuÃ¡rios", pagamentos: "Pagamentos", documentos: "Documentos", erros: "Erros de envio" };
  return nomes[aba] || "Painel";
}

function Dashboard({ stats, setAba }) {
  const cards = [
    ["Clientes ativos", stats.ativo, "usuarios"],
    ["CÃ³digos livres", stats.disponivel, "codigos"],
    ["Vencidos", stats.vencido, "pagamentos"],
    ["Bloqueados", stats.bloqueado, "usuarios"],
    ["Pendentes", stats.pendentePagamento, "pagamentos"],
    ["Erros", stats.erros, "erros"],
    ["Envios", stats.envios, "usuarios"],
    ["AlteraÃ§Ãµes", stats.alteracoes, "usuarios"],
  ];
  return <section style={styles.statsGrid}>{cards.map(([label, value, aba]) => <button key={label} onClick={() => setAba(aba)} style={styles.statCard}><span style={styles.statNumber}>{value}</span><span style={styles.statLabel}>{label}</span></button>)}</section>;
}

function Codigos({ gerando, gerarNovoCodigo, gerarLote, lote, setLote, lista, busca, setBusca, filtro, setFiltro, copiarCodigo, alterarStatus }) {
  return (
    <>
      <section style={styles.panelCard}>
        <div>
          <h2 style={styles.sectionTitle}>Gerar cÃ³digos</h2>
          <p style={styles.sectionText}>Gere cÃ³digos simples de 5 dÃ­gitos. O cliente se cadastra pelo app.</p>
        </div>
        <div style={styles.inlineActions}>
          <button style={styles.primarySmall} onClick={() => gerarNovoCodigo(true)} disabled={gerando}>{gerando ? "Gerando..." : "Gerar cÃ³digo"}</button>
          <input type="number" min="1" max="100" value={lote} onChange={(e) => setLote(e.target.value)} style={styles.smallInput} />
          <button style={styles.darkButton} onClick={gerarLote} disabled={gerando}>Gerar lote</button>
        </div>
      </section>
      <Toolbar busca={busca} setBusca={setBusca} filtro={filtro} setFiltro={setFiltro} />
      <section style={styles.cardList}>
        {lista.length === 0 ? <Empty text="Nenhum cÃ³digo encontrado." /> : lista.map((item) => <CardCodigo key={item.id} item={item} copiarCodigo={copiarCodigo} alterarStatus={alterarStatus} />)}
      </section>
    </>
  );
}

function Toolbar({ busca, setBusca, filtro, setFiltro }) {
  return <section style={styles.toolbar}><input placeholder="Buscar por cÃ³digo, nome, CPF, telefone ou e-mail..." value={busca} onChange={(e) => setBusca(e.target.value)} style={styles.searchInput} /><select value={filtro} onChange={(e) => setFiltro(e.target.value)} style={styles.select}><option>Todos</option><option>DisponÃ­vel</option><option>Ativo</option><option>Bloqueado</option><option>Vencido</option></select></section>;
}

function CardCodigo({ item, copiarCodigo, alterarStatus }) {
  return <article style={styles.codeCard}><div style={styles.codeHeader}><div><span style={styles.codeLabel}>CÃ³digo</span><h2 style={styles.code}>{item.codigo}</h2></div><span style={{ ...styles.badge, ...badgeStyle(item.status) }}>{item.status || STATUS.DISPONIVEL}</span></div><div style={styles.infoGrid}><Info label="Cliente" value={item.nome || "Ainda nÃ£o vinculado"} /><Info label="CPF" value={item.cpf || "-"} /><Info label="Validade" value={formatarData(item.validade)} /><Info label="Usado em" value={formatarDataHora(item.usado_em)} /></div><div style={styles.actions}><button style={styles.actionButton} onClick={() => copiarCodigo(item.codigo)}>Copiar</button>{item.status !== STATUS.BLOQUEADO ? <button style={styles.dangerButton} onClick={() => alterarStatus(item, STATUS.BLOQUEADO)}>Bloquear</button> : <button style={styles.successButton} onClick={() => alterarStatus(item, STATUS.ATIVO)}>Ativar</button>}{item.status !== STATUS.DISPONIVEL && <button style={styles.neutralButton} onClick={() => alterarStatus(item, STATUS.DISPONIVEL)}>Liberar cÃ³digo</button>}</div></article>;
}

function Usuarios({ lista, busca, setBusca, setSelecionado, renovar, alterarStatus, salvarObservacao }) {
  return <><section style={styles.toolbar}><input placeholder="Buscar cliente..." value={busca} onChange={(e) => setBusca(e.target.value)} style={styles.searchInput} /></section><section style={styles.tableCard}>{lista.length === 0 ? <Empty text="Nenhum usuÃ¡rio cadastrado." /> : lista.map((u) => <div key={u.id} style={styles.row}><div><strong>{u.nome}</strong><span>{u.email || "-"}</span></div><div><b>{u.codigo}</b><span>{u.cpf || "-"}</span></div><div><Badge status={u.status} /><span>Validade: {formatarData(u.validade)}</span></div><div style={styles.rowActions}><button style={styles.actionButton} onClick={() => setSelecionado(u)}>Detalhes</button><button style={styles.successButton} onClick={() => renovar(u)}>Renovar</button><button style={styles.neutralButton} onClick={() => salvarObservacao(u)}>Obs.</button><button style={styles.dangerButton} onClick={() => alterarStatus(u, STATUS.BLOQUEADO)}>Bloquear</button></div></div>)}</section></>;
}

function Pagamentos({ lista, renovar }) {
  return <section style={styles.tableCard}>{lista.length === 0 ? <Empty text="Nenhum pagamento para exibir." /> : lista.map((u) => <div key={u.id} style={styles.row}><div><strong>{u.nome}</strong><span>{u.codigo}</span></div><div><b>{u.pagamento_status || "Pendente"}</b><span>Pago em: {formatarDataHora(u.pago_em)}</span></div><div><b>Validade</b><span>{formatarData(u.validade)}</span></div><button style={styles.successButton} onClick={() => renovar(u)}>Marcar pago e renovar 90 dias</button></div>)}</section>;
}

function Documentos({ lista }) {
  return <section style={styles.tableCard}>{lista.length === 0 ? <Empty text="Nenhum documento registrado." /> : lista.map((u) => <div key={u.id} style={styles.row}><div><strong>{u.nome}</strong><span>{u.codigo}</span></div><DocLink label="Termos" url={u.termos_pdf} /><DocLink label="Comprovante" url={u.comprovante_pdf} /><div><b>AlteraÃ§Ãµes</b><span>{u.alteracoes || 0}</span></div></div>)}</section>;
}

function Erros({ lista }) {
  return <section style={styles.tableCard}>{lista.length === 0 ? <Empty text="Nenhum erro registrado." /> : lista.map((u) => <div key={u.id} style={styles.row}><div><strong>{u.nome || u.codigo}</strong><span>{formatarDataHora(u.ultimo_erro_em)}</span></div><div style={{ flex: 2 }}><b>Erro</b><span>{u.ultimo_erro}</span></div></div>)}</section>;
}

function ModalCliente({ item, fechar, renovar, alterarStatus }) {
  return <div style={styles.modalBg}><div style={styles.modal}><div style={styles.modalHeader}><div><span style={styles.eyebrow}>Cliente</span><h2 style={styles.modalTitle}>{item.nome || item.codigo}</h2></div><button style={styles.closeButton} onClick={fechar}>Fechar</button></div><div style={styles.infoGrid}><Info label="CÃ³digo" value={item.codigo} /><Info label="Status" value={item.status} /><Info label="CPF" value={item.cpf || "-"} /><Info label="Telefone" value={item.telefone || "-"} /><Info label="E-mail" value={item.email || "-"} /><Info label="Cargo" value={item.cargo || "-"} /><Info label="Ã“rgÃ£o" value={item.orgao || "-"} /><Info label="Validade" value={formatarData(item.validade)} /><Info label="Envios" value={item.envios || 0} /><Info label="AlteraÃ§Ãµes" value={item.alteracoes || 0} /><Info label="Pagamento" value={item.pagamento_status || "Pendente"} /><Info label="Usado em" value={formatarDataHora(item.usado_em)} /></div>{item.observacoes && <p style={styles.note}>{item.observacoes}</p>}<div style={styles.actions}><button style={styles.successButton} onClick={() => renovar(item)}>Renovar 90 dias</button><button style={styles.dangerButton} onClick={() => alterarStatus(item, STATUS.BLOQUEADO)}>Bloquear</button><button style={styles.neutralButton} onClick={() => alterarStatus(item, STATUS.DISPONIVEL)}>Liberar cÃ³digo</button></div></div></div>;
}

function DocLink({ label, url }) {
  return <div><b>{label}</b><span>{url ? <a href={url} target="_blank" rel="noreferrer">Abrir arquivo</a> : "NÃ£o anexado"}</span></div>;
}

function Info({ label, value }) {
  return <div style={styles.infoItem}><span>{label}</span><strong>{value}</strong></div>;
}

function Badge({ status }) {
  return <span style={{ ...styles.badge, ...badgeStyle(status) }}>{status || "-"}</span>;
}

function Empty({ text }) {
  return <div style={styles.empty}><h3>{text}</h3><p>Use o menu lateral para continuar.</p></div>;
}

function badgeStyle(status) {
  if (status === STATUS.ATIVO) return { background: "#e6f4ec", color: "#15803d", border: "1px solid #c8e6d4" };
  if (status === STATUS.BLOQUEADO) return { background: "#fdecec", color: "#b91c1c", border: "1px solid #f5cfcf" };
  if (status === STATUS.VENCIDO) return { background: "#fdf3e0", color: "#a16207", border: "1px solid #f3e1bd" };
  return { background: "#e8efff", color: "#1e40af", border: "1px solid #d4e0f7" };
}

const styles = {
  loginPage: { minHeight: "100vh", background: "#f5f7fb", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif", color: "#0f172a" },
  loginCard: { width: "100%", maxWidth: 360, background: "#ffffff", borderRadius: 18, padding: 28, boxShadow: "0 20px 55px rgba(15, 23, 42, 0.08)", border: "1px solid #e5eaf3" },
  logo: { width: 42, height: 42, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: "#1f4fd6", color: "#fff", fontWeight: 700, fontSize: 14, letterSpacing: 0.4, marginBottom: 18 },
  loginTitle: { margin: 0, color: "#0f172a", fontSize: 22, fontWeight: 700, letterSpacing: -0.3 },
  loginText: { color: "#64748b", fontSize: 14, margin: "6px 0 22px", lineHeight: 1.5 },
  hint: { display: "none" },

  page: { minHeight: "100vh", width: "100vw", background: "#f5f7fb", color: "#0f172a", display: "flex", fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif", fontSize: 14, overflowX: "hidden" },
  sidebar: { width: 236, background: "#0b1730", color: "#d6dfef", padding: "24px 20px", display: "flex", flexDirection: "column", justifyContent: "space-between", position: "sticky", top: 0, height: "100vh", boxSizing: "border-box", flexShrink: 0 },
  brandBox: { display: "flex", gap: 12, alignItems: "center", marginBottom: 30 },
  logoSmall: { width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: "#1f4fd6", color: "#fff", fontWeight: 700, fontSize: 13, letterSpacing: 0.5, flexShrink: 0 },
  mutedBlock: { display: "block", color: "#91a1bd", fontSize: 12, marginTop: 2 },
  menuActive: { width: "100%", padding: "11px 13px", borderRadius: 10, border: 0, background: "#1f4fd6", color: "#fff", fontWeight: 600, fontSize: 14, textAlign: "left", marginBottom: 6, cursor: "pointer" },
  menuButton: { width: "100%", padding: "11px 13px", borderRadius: 10, border: 0, background: "transparent", color: "#d6dfef", fontWeight: 450, fontSize: 14, textAlign: "left", cursor: "pointer", marginBottom: 6 },
  logoutButton: { padding: "11px 13px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "#d6dfef", fontWeight: 500, fontSize: 13, cursor: "pointer" },

  main: { flex: 1, padding: "28px 34px", boxSizing: "border-box", width: "calc(100vw - 236px)", maxWidth: "none", margin: 0 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 20, marginBottom: 24, paddingBottom: 18, borderBottom: "1px solid #dde5f0" },
  eyebrow: { color: "#1f4fd6", fontWeight: 650, textTransform: "uppercase", fontSize: 11, letterSpacing: 1.6 },
  title: { fontSize: 28, margin: "5px 0 4px", letterSpacing: -0.5, lineHeight: 1.15, fontWeight: 650, color: "#0f172a" },
  subtitle: { color: "#64748b", margin: 0, fontSize: 14, lineHeight: 1.45 },

  statsGrid: { display: "grid", gridTemplateColumns: "repeat(4, minmax(170px, 1fr))", gap: 16 },
  statCard: { background: "#ffffff", border: "1px solid #e1e7f0", borderRadius: 16, padding: "20px 22px", textAlign: "left", cursor: "pointer", boxShadow: "0 10px 28px rgba(15, 23, 42, 0.045)" },
  statNumber: { display: "block", fontSize: 30, fontWeight: 650, color: "#1f4fd6", letterSpacing: -0.5 },
  statLabel: { display: "block", color: "#667085", fontWeight: 450, marginTop: 4, fontSize: 14 },

  panelCard: { background: "#ffffff", border: "1px solid #e1e7f0", borderRadius: 16, padding: "18px 20px", display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", marginBottom: 16, flexWrap: "wrap", boxShadow: "0 10px 28px rgba(15, 23, 42, 0.045)" },
  sectionTitle: { margin: 0, fontSize: 17, fontWeight: 650, color: "#0f172a" },
  sectionText: { margin: "4px 0 0", color: "#64748b", fontSize: 13.5 },
  toolbar: { background: "#ffffff", borderRadius: 16, padding: 12, display: "flex", gap: 10, border: "1px solid #e1e7f0", marginBottom: 16, boxShadow: "0 10px 28px rgba(15, 23, 42, 0.04)" },
  searchInput: { flex: 1, border: "1px solid #d8e0ec", background: "#ffffff", borderRadius: 10, padding: "11px 13px", fontSize: 14, outline: "none", color: "#0f172a" },
  select: { border: "1px solid #d8e0ec", background: "#ffffff", borderRadius: 10, padding: "11px 13px", fontWeight: 500, fontSize: 13.5, color: "#0f172a" },
  input: { width: "100%", boxSizing: "border-box", padding: "12px 13px", borderRadius: 10, border: "1px solid #d8e0ec", marginBottom: 10, fontSize: 14, outline: "none", background: "#ffffff", color: "#0f172a" },
  smallInput: { width: 74, padding: "10px 11px", borderRadius: 10, border: "1px solid #d8e0ec", fontSize: 14, textAlign: "center" },

  primaryButton: { width: "100%", padding: "12px 14px", border: 0, borderRadius: 10, background: "#1f4fd6", color: "#fff", fontWeight: 650, fontSize: 14, cursor: "pointer" },
  primarySmall: { border: 0, borderRadius: 10, background: "#1f4fd6", color: "#fff", padding: "10px 14px", fontWeight: 600, fontSize: 13.5, cursor: "pointer" },
  secondaryButton: { border: "1px solid #d8e0ec", borderRadius: 10, background: "#ffffff", color: "#1f4fd6", padding: "10px 14px", fontWeight: 600, fontSize: 13.5, cursor: "pointer" },
  darkButton: { border: 0, borderRadius: 10, background: "#0f172a", color: "#ffffff", padding: "10px 14px", fontWeight: 600, fontSize: 13.5, cursor: "pointer" },
  inlineActions: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },

  cardList: { display: "grid", gap: 14 },
  codeCard: { background: "#ffffff", borderRadius: 18, padding: "20px", border: "1px solid #e1e7f0", boxShadow: "0 10px 28px rgba(15, 23, 42, 0.04)" },
  codeHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, borderBottom: "1px solid #edf1f7", paddingBottom: 14, marginBottom: 14 },
  codeLabel: { color: "#64748b", fontWeight: 550, fontSize: 11.5, textTransform: "uppercase", letterSpacing: 0.8 },
  code: { margin: "3px 0 0", fontSize: 28, letterSpacing: 1.5, fontWeight: 650, color: "#0f172a", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" },
  badge: { padding: "5px 10px", borderRadius: 999, fontWeight: 600, fontSize: 12, whiteSpace: "nowrap", display: "inline-block" },
  infoGrid: { display: "grid", gridTemplateColumns: "repeat(4, minmax(160px, 1fr))", gap: 10 },
  infoItem: { background: "#f7f9fd", borderRadius: 12, padding: "12px 13px", border: "1px solid #edf1f7", display: "flex", flexDirection: "column", gap: 4 },

  actions: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 },
  actionButton: { border: 0, borderRadius: 9, background: "#1f4fd6", color: "#fff", padding: "9px 13px", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  dangerButton: { border: 0, borderRadius: 9, background: "#b42318", color: "#fff", padding: "9px 13px", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  successButton: { border: 0, borderRadius: 9, background: "#16803c", color: "#fff", padding: "9px 13px", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  neutralButton: { border: "1px solid #d8e0ec", borderRadius: 9, background: "#ffffff", color: "#0f172a", padding: "9px 13px", fontWeight: 600, fontSize: 13, cursor: "pointer" },

  tableCard: { background: "#ffffff", borderRadius: 16, border: "1px solid #e1e7f0", overflow: "hidden", boxShadow: "0 10px 28px rgba(15, 23, 42, 0.04)" },
  row: { display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr 1.4fr", gap: 14, alignItems: "center", padding: "15px 18px", borderBottom: "1px solid #edf1f7", fontSize: 13.5 },
  rowActions: { display: "flex", gap: 7, flexWrap: "wrap", justifyContent: "flex-end" },
  empty: { textAlign: "center", background: "#ffffff", borderRadius: 16, padding: 36, color: "#64748b", border: "1px dashed #d8e0ec", fontSize: 14 },

  modalBg: { position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50 },
  modal: { width: "100%", maxWidth: 880, background: "#ffffff", borderRadius: 18, padding: 24, boxShadow: "0 25px 80px rgba(15,23,42,.22)" },
  modalHeader: { display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", marginBottom: 18, paddingBottom: 14, borderBottom: "1px solid #edf1f7" },
  modalTitle: { margin: "2px 0 0", fontSize: 20, fontWeight: 650, color: "#0f172a" },
  closeButton: { border: "1px solid #d8e0ec", borderRadius: 9, background: "#ffffff", padding: "9px 13px", fontWeight: 600, fontSize: 13, cursor: "pointer", color: "#0f172a" },
  note: { background: "#edf3ff", border: "1px solid #d6e4ff", padding: "12px 13px", borderRadius: 12, color: "#1d4ed8", fontSize: 13.5, marginTop: 14 },
};