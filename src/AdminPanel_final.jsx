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
      alert("Erro ao carregar dados do painel. Confira as colunas do Supabase e as variáveis da Vercel.");
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
          alert(`Código gerado e copiado: ${codigo}`);
        }
        return codigo;
      }

      if (String(error.message || "").toLowerCase().includes("duplicate")) {
        codigo = gerarCodigo();
      } else {
        console.error(error);
        alert("Erro ao gerar código.");
        setGerando(false);
        return null;
      }
    }

    setGerando(false);
    alert("Não foi possível gerar um código único. Tente novamente.");
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
    alert(`${qtd} códigos gerados.`);
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
      const ok = confirm("Liberar este código novamente? Isso apaga os dados do cliente vinculados a ele.");
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
    alert(`Acesso renovado até ${formatarData(novaValidade)}.`);
  }

  async function salvarObservacao(item) {
    const obs = prompt("Observação do cliente:", item.observacoes || "");
    if (obs === null) return;
    const { error } = await supabase.from("usuarios").update({ observacoes: obs }).eq("id", item.id);
    if (error) alert("Erro ao salvar observação.");
    await carregarUsuarios();
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
          <h1 style={styles.loginTitle}>Painel Atestado Fácil</h1>
          <p style={styles.loginText}>Gerencie acessos, pagamentos, vencimentos e erros.</p>
          <input placeholder="Usuário" value={usuario} onChange={(e) => setUsuario(e.target.value)} style={styles.input} />
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
              <strong>Atestado Fácil</strong>
              <span style={styles.mutedBlock}>Painel ADM</span>
            </div>
          </div>

          {[
            ["dashboard", "Dashboard"],
            ["codigos", "Códigos"],
            ["usuarios", "Usuários"],
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
            <span style={styles.eyebrow}>Administração</span>
            <h1 style={styles.title}>{tituloAba(aba)}</h1>
            <p style={styles.subtitle}>Sistema de controle do Atestado Fácil.</p>
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
  const nomes = { dashboard: "Dashboard", codigos: "Códigos de acesso", usuarios: "Gerenciar usuários", pagamentos: "Pagamentos", documentos: "Documentos", erros: "Erros de envio" };
  return nomes[aba] || "Painel";
}

function Dashboard({ stats, setAba }) {
  const cards = [
    ["Clientes ativos", stats.ativo, "usuarios"],
    ["Códigos livres", stats.disponivel, "codigos"],
    ["Vencidos", stats.vencido, "pagamentos"],
    ["Bloqueados", stats.bloqueado, "usuarios"],
    ["Pendentes", stats.pendentePagamento, "pagamentos"],
    ["Erros", stats.erros, "erros"],
    ["Envios", stats.envios, "usuarios"],
    ["Alterações", stats.alteracoes, "usuarios"],
  ];
  return <section style={styles.statsGrid}>{cards.map(([label, value, aba]) => <button key={label} onClick={() => setAba(aba)} style={styles.statCard}><span style={styles.statNumber}>{value}</span><span style={styles.statLabel}>{label}</span></button>)}</section>;
}

function Codigos({ gerando, gerarNovoCodigo, gerarLote, lote, setLote, lista, busca, setBusca, filtro, setFiltro, copiarCodigo, alterarStatus }) {
  return (
    <>
      <section style={styles.panelCard}>
        <div>
          <h2 style={styles.sectionTitle}>Gerar códigos</h2>
          <p style={styles.sectionText}>Gere códigos livres para entregar ao cliente após o pagamento.</p>
        </div>
        <div style={styles.inlineActions}>
          <button style={styles.primarySmall} onClick={() => gerarNovoCodigo(true)} disabled={gerando}>{gerando ? "Gerando..." : "Gerar 1 código"}</button>
          <input type="number" min="1" max="100" value={lote} onChange={(e) => setLote(e.target.value)} style={styles.smallInput} />
          <button style={styles.darkButton} onClick={gerarLote} disabled={gerando}>Gerar lote</button>
        </div>
      </section>
      <Toolbar busca={busca} setBusca={setBusca} filtro={filtro} setFiltro={setFiltro} />
      <section style={styles.cardList}>
        {lista.length === 0 ? <Empty text="Nenhum código encontrado." /> : lista.map((item) => <CardCodigo key={item.id} item={item} copiarCodigo={copiarCodigo} alterarStatus={alterarStatus} />)}
      </section>
    </>
  );
}

function Toolbar({ busca, setBusca, filtro, setFiltro }) {
  return <section style={styles.toolbar}><input placeholder="Buscar por código, nome, CPF, telefone ou e-mail..." value={busca} onChange={(e) => setBusca(e.target.value)} style={styles.searchInput} /><select value={filtro} onChange={(e) => setFiltro(e.target.value)} style={styles.select}><option>Todos</option><option>Disponível</option><option>Ativo</option><option>Bloqueado</option><option>Vencido</option></select></section>;
}

function CardCodigo({ item, copiarCodigo, alterarStatus }) {
  return <article style={styles.codeCard}><div style={styles.codeHeader}><div><span style={styles.codeLabel}>Código</span><h2 style={styles.code}>{item.codigo}</h2></div><span style={{ ...styles.badge, ...badgeStyle(item.status) }}>{item.status || STATUS.DISPONIVEL}</span></div><div style={styles.infoGrid}><Info label="Cliente" value={item.nome || "Ainda não vinculado"} /><Info label="CPF" value={item.cpf || "-"} /><Info label="Validade" value={formatarData(item.validade)} /><Info label="Usado em" value={formatarDataHora(item.usado_em)} /></div><div style={styles.actions}><button style={styles.actionButton} onClick={() => copiarCodigo(item.codigo)}>Copiar</button>{item.status !== STATUS.BLOQUEADO ? <button style={styles.dangerButton} onClick={() => alterarStatus(item, STATUS.BLOQUEADO)}>Bloquear</button> : <button style={styles.successButton} onClick={() => alterarStatus(item, STATUS.ATIVO)}>Ativar</button>}{item.status !== STATUS.DISPONIVEL && <button style={styles.neutralButton} onClick={() => alterarStatus(item, STATUS.DISPONIVEL)}>Liberar código</button>}</div></article>;
}

function Usuarios({ lista, busca, setBusca, setSelecionado, renovar, alterarStatus, salvarObservacao }) {
  return <><section style={styles.toolbar}><input placeholder="Buscar cliente..." value={busca} onChange={(e) => setBusca(e.target.value)} style={styles.searchInput} /></section><section style={styles.tableCard}>{lista.length === 0 ? <Empty text="Nenhum usuário cadastrado." /> : lista.map((u) => <div key={u.id} style={styles.row}><div><strong>{u.nome}</strong><span>{u.email || "-"}</span></div><div><b>{u.codigo}</b><span>{u.cpf || "-"}</span></div><div><Badge status={u.status} /><span>Validade: {formatarData(u.validade)}</span></div><div style={styles.rowActions}><button style={styles.actionButton} onClick={() => setSelecionado(u)}>Detalhes</button><button style={styles.successButton} onClick={() => renovar(u)}>Renovar</button><button style={styles.neutralButton} onClick={() => salvarObservacao(u)}>Obs.</button><button style={styles.dangerButton} onClick={() => alterarStatus(u, STATUS.BLOQUEADO)}>Bloquear</button></div></div>)}</section></>;
}

function Pagamentos({ lista, renovar }) {
  return <section style={styles.tableCard}>{lista.length === 0 ? <Empty text="Nenhum pagamento para exibir." /> : lista.map((u) => <div key={u.id} style={styles.row}><div><strong>{u.nome}</strong><span>{u.codigo}</span></div><div><b>{u.pagamento_status || "Pendente"}</b><span>Pago em: {formatarDataHora(u.pago_em)}</span></div><div><b>Validade</b><span>{formatarData(u.validade)}</span></div><button style={styles.successButton} onClick={() => renovar(u)}>Marcar pago e renovar 90 dias</button></div>)}</section>;
}

function Documentos({ lista }) {
  return <section style={styles.tableCard}>{lista.length === 0 ? <Empty text="Nenhum documento registrado." /> : lista.map((u) => <div key={u.id} style={styles.row}><div><strong>{u.nome}</strong><span>{u.codigo}</span></div><DocLink label="Termos" url={u.termos_pdf} /><DocLink label="Comprovante" url={u.comprovante_pdf} /><div><b>Alterações</b><span>{u.alteracoes || 0}</span></div></div>)}</section>;
}

function Erros({ lista }) {
  return <section style={styles.tableCard}>{lista.length === 0 ? <Empty text="Nenhum erro registrado." /> : lista.map((u) => <div key={u.id} style={styles.row}><div><strong>{u.nome || u.codigo}</strong><span>{formatarDataHora(u.ultimo_erro_em)}</span></div><div style={{ flex: 2 }}><b>Erro</b><span>{u.ultimo_erro}</span></div></div>)}</section>;
}

function ModalCliente({ item, fechar, renovar, alterarStatus }) {
  return <div style={styles.modalBg}><div style={styles.modal}><div style={styles.modalHeader}><div><span style={styles.eyebrow}>Cliente</span><h2 style={styles.modalTitle}>{item.nome || item.codigo}</h2></div><button style={styles.closeButton} onClick={fechar}>Fechar</button></div><div style={styles.infoGrid}><Info label="Código" value={item.codigo} /><Info label="Status" value={item.status} /><Info label="CPF" value={item.cpf || "-"} /><Info label="Telefone" value={item.telefone || "-"} /><Info label="E-mail" value={item.email || "-"} /><Info label="Cargo" value={item.cargo || "-"} /><Info label="Órgão" value={item.orgao || "-"} /><Info label="Validade" value={formatarData(item.validade)} /><Info label="Envios" value={item.envios || 0} /><Info label="Alterações" value={item.alteracoes || 0} /><Info label="Pagamento" value={item.pagamento_status || "Pendente"} /><Info label="Usado em" value={formatarDataHora(item.usado_em)} /></div>{item.observacoes && <p style={styles.note}>{item.observacoes}</p>}<div style={styles.actions}><button style={styles.successButton} onClick={() => renovar(item)}>Renovar 90 dias</button><button style={styles.dangerButton} onClick={() => alterarStatus(item, STATUS.BLOQUEADO)}>Bloquear</button><button style={styles.neutralButton} onClick={() => alterarStatus(item, STATUS.DISPONIVEL)}>Liberar código</button></div></div></div>;
}

function DocLink({ label, url }) {
  return <div><b>{label}</b><span>{url ? <a href={url} target="_blank" rel="noreferrer">Abrir arquivo</a> : "Não anexado"}</span></div>;
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
  // ===== Login =====
  loginPage: { minHeight: "100vh", background: "linear-gradient(180deg,#f6f9ff 0%,#eef3fb 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "Inter, system-ui, -apple-system, Arial, sans-serif", color: "#0f1e3d" },
  loginCard: { width: "100%", maxWidth: 380, background: "white", borderRadius: 16, padding: 32, boxShadow: "0 8px 28px rgba(15,30,80,.08)", border: "1px solid #e3eaf5" },
  logo: { width: 44, height: 44, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "#1e40af", color: "white", fontWeight: 700, fontSize: 15, letterSpacing: 0.5, marginBottom: 20 },
  loginTitle: { margin: 0, color: "#0f1e3d", fontSize: 20, fontWeight: 600, letterSpacing: -0.2 },
  loginText: { color: "#5a6b85", fontSize: 13.5, fontWeight: 400, margin: "6px 0 22px", lineHeight: 1.5 },
  hint: { display: "block", marginTop: 14, color: "#94a3b8", fontWeight: 400, fontSize: 12 },

  // ===== Layout =====
  page: { minHeight: "100vh", background: "#f4f7fb", color: "#0f1e3d", display: "flex", fontFamily: "Inter, system-ui, -apple-system, Arial, sans-serif", fontSize: 14 },
  sidebar: { width: 220, background: "#0b1830", color: "#cbd5e1", padding: "22px 16px", display: "flex", flexDirection: "column", justifyContent: "space-between", position: "sticky", top: 0, height: "100vh", boxSizing: "border-box", borderRight: "1px solid #0a1428" },
  brandBox: { display: "flex", gap: 10, alignItems: "center", marginBottom: 26, padding: "0 4px" },
  logoSmall: { width: 34, height: 34, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "#1e40af", color: "white", fontWeight: 700, fontSize: 12, letterSpacing: 0.5 },
  mutedBlock: { display: "block", color: "#7e8da6", fontSize: 11.5, fontWeight: 400, marginTop: 1 },
  menuActive: { width: "100%", padding: "9px 12px", borderRadius: 8, border: 0, background: "#1e40af", color: "white", fontWeight: 500, fontSize: 13.5, textAlign: "left", marginBottom: 4, cursor: "pointer" },
  menuButton: { width: "100%", padding: "9px 12px", borderRadius: 8, border: 0, background: "transparent", color: "#cbd5e1", fontWeight: 400, fontSize: 13.5, textAlign: "left", cursor: "pointer", marginBottom: 4 },
  logoutButton: { padding: "9px 12px", borderRadius: 8, border: "1px solid #1e2b46", background: "transparent", color: "#cbd5e1", fontWeight: 500, fontSize: 13, cursor: "pointer" },

  main: { flex: 1, padding: "28px 32px", maxWidth: 1240, margin: "0 auto", boxSizing: "border-box" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 20, marginBottom: 22, paddingBottom: 16, borderBottom: "1px solid #e3eaf5" },
  eyebrow: { color: "#1e40af", fontWeight: 600, textTransform: "uppercase", fontSize: 10.5, letterSpacing: 1.2 },
  title: { fontSize: 22, margin: "4px 0 2px", letterSpacing: -0.3, lineHeight: 1.2, fontWeight: 600, color: "#0f1e3d" },
  subtitle: { color: "#6b7a93", margin: 0, fontWeight: 400, fontSize: 13 },

  // ===== Dashboard =====
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(4, minmax(150px, 1fr))", gap: 12 },
  statCard: { background: "white", border: "1px solid #e3eaf5", borderRadius: 10, padding: "16px 18px", textAlign: "left", cursor: "pointer", boxShadow: "0 1px 2px rgba(15,30,80,.03)", transition: "border-color .15s, box-shadow .15s" },
  statNumber: { display: "block", fontSize: 22, fontWeight: 600, color: "#1e40af", letterSpacing: -0.3 },
  statLabel: { display: "block", color: "#6b7a93", fontWeight: 500, marginTop: 3, fontSize: 12.5 },

  // ===== Painel / Toolbar =====
  panelCard: { background: "white", border: "1px solid #e3eaf5", borderRadius: 10, padding: "16px 18px", display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", marginBottom: 14, flexWrap: "wrap" },
  sectionTitle: { margin: 0, fontSize: 15, fontWeight: 600, color: "#0f1e3d" },
  sectionText: { margin: "3px 0 0", color: "#6b7a93", fontWeight: 400, fontSize: 12.5 },
  toolbar: { background: "white", borderRadius: 10, padding: 10, display: "flex", gap: 8, border: "1px solid #e3eaf5", marginBottom: 14 },
  searchInput: { flex: 1, border: "1px solid #d9e1ee", background: "white", borderRadius: 8, padding: "9px 12px", fontSize: 13.5, outline: "none", fontWeight: 400, boxSizing: "border-box", color: "#0f1e3d" },
  select: { border: "1px solid #d9e1ee", background: "white", borderRadius: 8, padding: "9px 12px", fontWeight: 500, fontSize: 13, color: "#0f1e3d" },
  input: { width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 8, border: "1px solid #d9e1ee", marginBottom: 10, fontSize: 13.5, outline: "none", background: "white", color: "#0f1e3d", fontWeight: 400 },
  smallInput: { width: 64, padding: "8px 10px", borderRadius: 8, border: "1px solid #d9e1ee", fontWeight: 500, fontSize: 13, textAlign: "center" },

  // ===== Botões =====
  primaryButton: { width: "100%", padding: "11px 14px", border: 0, borderRadius: 8, background: "#1e40af", color: "white", fontWeight: 600, fontSize: 14, cursor: "pointer", letterSpacing: 0.2 },
  primarySmall: { border: 0, borderRadius: 8, background: "#1e40af", color: "white", padding: "9px 14px", fontWeight: 500, fontSize: 13, cursor: "pointer" },
  secondaryButton: { border: "1px solid #d9e1ee", borderRadius: 8, background: "white", color: "#1e40af", padding: "8px 14px", fontWeight: 500, fontSize: 13, cursor: "pointer" },
  darkButton: { border: 0, borderRadius: 8, background: "#0f1e3d", color: "white", padding: "9px 14px", fontWeight: 500, fontSize: 13, cursor: "pointer" },
  inlineActions: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },

  // ===== Cards de código =====
  cardList: { display: "grid", gap: 10 },
  codeCard: { background: "white", borderRadius: 10, padding: "16px 18px", border: "1px solid #e3eaf5" },
  codeHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, borderBottom: "1px solid #eef2f8", paddingBottom: 12, marginBottom: 12 },
  codeLabel: { color: "#6b7a93", fontWeight: 500, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6 },
  code: { margin: "2px 0 0", fontSize: 17, letterSpacing: 0.8, fontWeight: 600, color: "#0f1e3d", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" },

  badge: { padding: "4px 9px", borderRadius: 6, fontWeight: 600, fontSize: 11, whiteSpace: "nowrap", display: "inline-block", letterSpacing: 0.2 },

  infoGrid: { display: "grid", gridTemplateColumns: "repeat(4, minmax(140px, 1fr))", gap: 8 },
  infoItem: { background: "#f6f9ff", borderRadius: 8, padding: "9px 11px", border: "1px solid #eaf0fa", display: "flex", flexDirection: "column", gap: 2 },

  actions: { display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 },
  actionButton: { border: 0, borderRadius: 7, background: "#1e40af", color: "white", padding: "7px 12px", fontWeight: 500, fontSize: 12.5, cursor: "pointer" },
  dangerButton: { border: 0, borderRadius: 7, background: "#b91c1c", color: "white", padding: "7px 12px", fontWeight: 500, fontSize: 12.5, cursor: "pointer" },
  successButton: { border: 0, borderRadius: 7, background: "#15803d", color: "white", padding: "7px 12px", fontWeight: 500, fontSize: 12.5, cursor: "pointer" },
  neutralButton: { border: "1px solid #d9e1ee", borderRadius: 7, background: "white", color: "#0f1e3d", padding: "7px 12px", fontWeight: 500, fontSize: 12.5, cursor: "pointer" },

  // ===== Tabela =====
  tableCard: { background: "white", borderRadius: 10, border: "1px solid #e3eaf5", overflow: "hidden" },
  row: { display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr 1.4fr", gap: 12, alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #eef2f8", fontSize: 13 },
  rowActions: { display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" },

  empty: { textAlign: "center", background: "white", borderRadius: 10, padding: 32, color: "#6b7a93", border: "1px dashed #d9e1ee", fontSize: 13 },

  // ===== Modal =====
  modalBg: { position: "fixed", inset: 0, background: "rgba(11,24,48,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50 },
  modal: { width: "100%", maxWidth: 820, background: "white", borderRadius: 12, padding: 24, boxShadow: "0 20px 60px rgba(11,24,48,.25)" },
  modalHeader: { display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", marginBottom: 18, paddingBottom: 14, borderBottom: "1px solid #eef2f8" },
  modalTitle: { margin: "2px 0 0", fontSize: 18, fontWeight: 600, color: "#0f1e3d" },
  closeButton: { border: "1px solid #d9e1ee", borderRadius: 7, background: "white", padding: "7px 12px", fontWeight: 500, fontSize: 12.5, cursor: "pointer", color: "#0f1e3d" },
  note: { background: "#eff4ff", border: "1px solid #d4e0f7", padding: "10px 12px", borderRadius: 8, color: "#1e3a8a", fontWeight: 400, fontSize: 13, marginTop: 12 },
};
