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

const PAGAMENTO = {
  PENDENTE: "Pendente",
  PAGO: "Pago",
};

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: "📊" },
  { id: "codigos", label: "Códigos", icon: "🔑" },
  { id: "usuarios", label: "Usuários", icon: "👥" },
  { id: "pagamentos", label: "Pagamentos", icon: "💰" },
  { id: "documentos", label: "Documentos", icon: "📄" },
  { id: "erros", label: "Erros", icon: "⚠️" },
];

function gerarCodigo() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bloco = (qtd) =>
    Array.from({ length: qtd }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `AF-${bloco(4)}-${bloco(4)}`;
}

function hojeISO() {
  return new Date().toISOString().split("T")[0];
}

function addDiasISO(dias = 90) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().split("T")[0];
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

function isVencido(u) {
  if (!u?.validade) return false;
  return new Date(`${u.validade}T23:59:59`) < new Date(new Date().toDateString());
}

function statusReal(u) {
  if (u.status === STATUS.ATIVO && isVencido(u)) return STATUS.VENCIDO;
  return u.status || STATUS.DISPONIVEL;
}

function badgeStyle(status) {
  if (status === STATUS.ATIVO) return { background: "#dcfce7", color: "#166534" };
  if (status === STATUS.BLOQUEADO) return { background: "#fee2e2", color: "#991b1b" };
  if (status === STATUS.VENCIDO) return { background: "#fef3c7", color: "#92400e" };
  return { background: "#dbeafe", color: "#1d4ed8" };
}

function termoResponsabilidadeHTML(usuario) {
  const nome = usuario.nome || "Cliente";
  const cpf = usuario.cpf || "não informado";
  const codigo = usuario.codigo || "-";
  return `
    <html>
      <head>
        <title>Termo de Responsabilidade - ${nome}</title>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; padding: 42px; color: #111827; line-height: 1.55; }
          h1 { text-align:center; font-size: 24px; margin-bottom: 28px; }
          p { font-size: 14px; }
          .box { border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px; margin: 20px 0; }
          .assinatura { margin-top: 70px; text-align:center; }
          @media print { button { display:none; } }
        </style>
      </head>
      <body>
        <button onclick="window.print()">Salvar como PDF</button>
        <h1>Termo de Uso e Responsabilidade</h1>
        <div class="box">
          <p><b>Cliente:</b> ${nome}</p>
          <p><b>CPF:</b> ${cpf}</p>
          <p><b>Código de acesso:</b> ${codigo}</p>
          <p><b>Data:</b> ${new Date().toLocaleDateString("pt-BR")}</p>
        </div>
        <p>O usuário declara que todas as informações e documentos enviados pelo aplicativo são verdadeiros e de sua inteira responsabilidade.</p>
        <p>O Atestado Fácil é uma ferramenta independente, sem vínculo oficial com Prefeitura, Secretaria, órgão público ou sistema governamental.</p>
        <p>O sistema auxilia no preenchimento, organização e envio de documentos, mas não garante deferimento, aceitação, prazo de resposta ou resultado perante qualquer órgão.</p>
        <p>O usuário reconhece que falhas externas, instabilidades de e-mail, mudanças no formulário oficial ou alteração de procedimentos do órgão podem impactar o funcionamento do serviço.</p>
        <p>O acesso é individual, vinculado ao código informado, com prazo determinado. Após o vencimento, o acesso poderá ser bloqueado até renovação ou confirmação de novo pagamento.</p>
        <div class="assinatura">
          <p>__________________________________________</p>
          <p>${nome}</p>
        </div>
      </body>
    </html>`;
}

export default function AdminPanel() {
  const [logado, setLogado] = useState(() => localStorage.getItem("painel_atestado_logado") === "sim");
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [tab, setTab] = useState("dashboard");
  const [usuarios, setUsuarios] = useState([]);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("Todos");
  const [carregando, setCarregando] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [selecionado, setSelecionado] = useState(null);
  const [editando, setEditando] = useState(null);
  const [quantidade, setQuantidade] = useState(1);

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
      alert(`Erro ao carregar painel: ${error.message}`);
    } else {
      const lista = data || [];
      setUsuarios(lista);
      await marcarVencidos(lista);
    }
    setCarregando(false);
  }

  async function marcarVencidos(lista) {
    const vencidos = lista.filter((u) => u.status === STATUS.ATIVO && isVencido(u));
    if (!vencidos.length) return;

    await supabase
      .from("usuarios")
      .update({ status: STATUS.VENCIDO, vencido_em: new Date().toISOString(), pagamento_status: PAGAMENTO.PENDENTE })
      .in("id", vencidos.map((u) => u.id));
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
  }

  async function gerarCodigos(qtd = 1) {
    setGerando(true);
    const novos = [];
    for (let i = 0; i < Number(qtd || 1); i += 1) {
      novos.push({ codigo: gerarCodigo(), status: STATUS.DISPONIVEL, sistema: "", pagamento_status: PAGAMENTO.PENDENTE });
    }

    const { error } = await supabase.from("usuarios").insert(novos);
    setGerando(false);

    if (error) {
      console.error(error);
      alert(`Erro ao gerar código: ${error.message}`);
      return;
    }

    await carregarUsuarios();
    if (novos.length === 1) {
      await navigator.clipboard?.writeText(novos[0].codigo).catch(() => {});
      alert(`Código gerado e copiado: ${novos[0].codigo}`);
    } else {
      alert(`${novos.length} códigos gerados com sucesso.`);
    }
  }

  async function atualizarUsuario(id, updates, msg = "Atualizado com sucesso.") {
    const { error } = await supabase.from("usuarios").update(updates).eq("id", id);
    if (error) {
      console.error(error);
      alert(`Erro: ${error.message}`);
      return false;
    }
    await carregarUsuarios();
    alert(msg);
    return true;
  }

  async function bloquear(u) {
    const motivo = prompt("Motivo do bloqueio:") || "Bloqueio manual";
    await atualizarUsuario(u.id, { status: STATUS.BLOQUEADO, bloqueado_motivo: motivo }, "Usuário bloqueado.");
  }

  async function liberar(u) {
    await atualizarUsuario(u.id, { status: STATUS.ATIVO, bloqueado_motivo: null }, "Usuário liberado.");
  }

  async function renovar(u) {
    const confirmar = confirm("Confirmar pagamento e renovar acesso por mais 90 dias?");
    if (!confirmar) return;
    await atualizarUsuario(
      u.id,
      {
        status: STATUS.ATIVO,
        validade: addDiasISO(90),
        pagamento_status: PAGAMENTO.PAGO,
        pago_em: new Date().toISOString(),
        renovado_em: new Date().toISOString(),
        bloqueado_motivo: null,
      },
      "Pagamento confirmado e acesso renovado por 90 dias."
    );
  }

  async function liberarDeNovo(u) {
    const confirmar = confirm("Isso apaga os dados do cliente e deixa o código livre de novo. Confirmar?");
    if (!confirmar) return;
    await atualizarUsuario(
      u.id,
      {
        status: STATUS.DISPONIVEL,
        nome: null,
        cpf: null,
        telefone: null,
        email: null,
        sistema: null,
        validade: null,
        cargo: null,
        orgao: null,
        mat1: null,
        mat2: null,
        unid1: null,
        unid2: null,
        sit: null,
        usado_em: null,
        bloqueado_motivo: null,
        pagamento_status: PAGAMENTO.PENDENTE,
        pago_em: null,
        renovado_em: null,
        vencido_em: null,
        ultimo_erro: null,
        ultimo_erro_em: null,
        envios: 0,
        alteracoes: 0,
      },
      "Código liberado novamente."
    );
  }

  async function salvarEdicao() {
    if (!editando?.id) return;
    const ok = await atualizarUsuario(editando.id, {
      nome: editando.nome || null,
      cpf: editando.cpf || null,
      telefone: editando.telefone || null,
      email: editando.email || null,
      sistema: editando.sistema || null,
      cargo: editando.cargo || null,
      orgao: editando.orgao || null,
      mat1: editando.mat1 || null,
      mat2: editando.mat2 || null,
      unid1: editando.unid1 || null,
      unid2: editando.unid2 || null,
      sit: editando.sit || null,
      validade: editando.validade || null,
      observacoes: editando.observacoes || null,
      pagamento_status: editando.pagamento_status || PAGAMENTO.PENDENTE,
    }, "Dados salvos.");
    if (ok) setEditando(null);
  }

  function abrirTermo(u) {
    const html = termoResponsabilidadeHTML(u);
    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
  }

  async function registrarErroTeste(u) {
    const erro = prompt("Descreva o erro:") || "Erro manual registrado no painel";
    await atualizarUsuario(u.id, { ultimo_erro: erro, ultimo_erro_em: new Date().toISOString() }, "Erro registrado.");
  }

  async function copiarCodigo(codigo) {
    await navigator.clipboard?.writeText(codigo).catch(() => {});
    alert(`Código copiado: ${codigo}`);
  }

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return usuarios.filter((u) => {
      const st = statusReal(u);
      const bateFiltro = filtro === "Todos" || st === filtro;
      const texto = `${u.codigo || ""} ${u.nome || ""} ${u.cpf || ""} ${u.email || ""} ${u.telefone || ""}`.toLowerCase();
      return bateFiltro && (!termo || texto.includes(termo));
    });
  }, [usuarios, busca, filtro]);

  const dados = useMemo(() => {
    const base = {
      total: usuarios.length,
      disponiveis: 0,
      ativos: 0,
      bloqueados: 0,
      vencidos: 0,
      pagamentosPendentes: 0,
      erros: 0,
      envios: 0,
      alteracoes: 0,
    };
    usuarios.forEach((u) => {
      const st = statusReal(u);
      if (st === STATUS.DISPONIVEL) base.disponiveis += 1;
      if (st === STATUS.ATIVO) base.ativos += 1;
      if (st === STATUS.BLOQUEADO) base.bloqueados += 1;
      if (st === STATUS.VENCIDO) base.vencidos += 1;
      if ((u.pagamento_status || PAGAMENTO.PENDENTE) === PAGAMENTO.PENDENTE) base.pagamentosPendentes += 1;
      if (u.ultimo_erro) base.erros += 1;
      base.envios += Number(u.envios || 0);
      base.alteracoes += Number(u.alteracoes || 0);
    });
    return base;
  }, [usuarios]);

  const ativos = usuarios.filter((u) => statusReal(u) === STATUS.ATIVO);
  const pagamentos = usuarios.filter((u) => statusReal(u) === STATUS.VENCIDO || (u.pagamento_status || PAGAMENTO.PENDENTE) === PAGAMENTO.PENDENTE);
  const docs = usuarios.filter((u) => u.nome || u.termos_pdf || u.comprovante_pdf);
  const erros = usuarios.filter((u) => u.ultimo_erro);

  if (!logado) {
    return (
      <div style={styles.loginPage}>
        <form style={styles.loginCard} onSubmit={entrar}>
          <div style={styles.logo}>AF</div>
          <h1 style={styles.loginTitle}>Painel PRO</h1>
          <p style={styles.loginText}>Controle completo do Atestado Fácil.</p>
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
              <span style={styles.mutedBlock}>Painel PRO</span>
            </div>
          </div>
          {TABS.map((item) => (
            <button key={item.id} onClick={() => setTab(item.id)} style={tab === item.id ? styles.menuActive : styles.menuButton}>
              <span>{item.icon}</span> {item.label}
            </button>
          ))}
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          <button style={styles.menuButton} onClick={carregarUsuarios}>{carregando ? "Atualizando..." : "🔄 Atualizar"}</button>
          <button style={styles.logoutButton} onClick={sair}>Sair</button>
        </div>
      </aside>

      <main style={styles.main}>
        <header style={styles.header}>
          <div>
            <span style={styles.eyebrow}>Central de controle</span>
            <h1 style={styles.title}>{TABS.find((x) => x.id === tab)?.label}</h1>
            <p style={styles.subtitle}>Códigos, usuários, pagamentos, documentos, vencimentos e erros em um só lugar.</p>
          </div>
          <button onClick={() => gerarCodigos(1)} disabled={gerando} style={styles.generateButton}>{gerando ? "Gerando..." : "+ Gerar código"}</button>
        </header>

        {tab === "dashboard" && <Dashboard dados={dados} ativos={ativos} pagamentos={pagamentos} setTab={setTab} />}
        {tab === "codigos" && <Codigos usuarios={filtrados} busca={busca} setBusca={setBusca} filtro={filtro} setFiltro={setFiltro} quantidade={quantidade} setQuantidade={setQuantidade} gerarCodigos={gerarCodigos} gerando={gerando} copiarCodigo={copiarCodigo} bloquear={bloquear} liberar={liberar} liberarDeNovo={liberarDeNovo} setSelecionado={setSelecionado} />}
        {tab === "usuarios" && <Usuarios usuarios={filtrados} busca={busca} setBusca={setBusca} setEditando={setEditando} bloquear={bloquear} liberar={liberar} renovar={renovar} abrirTermo={abrirTermo} />}
        {tab === "pagamentos" && <Pagamentos usuarios={pagamentos} renovar={renovar} bloquear={bloquear} />}
        {tab === "documentos" && <Documentos usuarios={docs} abrirTermo={abrirTermo} setEditando={setEditando} />}
        {tab === "erros" && <Erros usuarios={erros} registrarErroTeste={registrarErroTeste} />}
      </main>

      {selecionado && <Detalhes usuario={selecionado} fechar={() => setSelecionado(null)} copiarCodigo={copiarCodigo} renovar={renovar} bloquear={bloquear} liberar={liberar} abrirTermo={abrirTermo} registrarErroTeste={registrarErroTeste} />}
      {editando && <Editor usuario={editando} setUsuario={setEditando} salvar={salvarEdicao} fechar={() => setEditando(null)} />}
    </div>
  );
}

function Dashboard({ dados, ativos, pagamentos, setTab }) {
  return (
    <div>
      <div style={styles.statsGrid}>
        <Stat label="Total" value={dados.total} />
        <Stat label="Ativos" value={dados.ativos} />
        <Stat label="Disponíveis" value={dados.disponiveis} />
        <Stat label="Vencidos" value={dados.vencidos} danger />
        <Stat label="Bloqueados" value={dados.bloqueados} danger />
        <Stat label="Pag. pendentes" value={dados.pagamentosPendentes} warn />
        <Stat label="Envios" value={dados.envios} />
        <Stat label="Erros" value={dados.erros} danger />
      </div>
      <div style={styles.twoCols}>
        <section style={styles.panel}>
          <h2>Clientes ativos</h2>
          {ativos.slice(0, 6).map((u) => <MiniRow key={u.id} u={u} />)}
          {!ativos.length && <Empty text="Nenhum cliente ativo." />}
          <button style={styles.secondaryButton} onClick={() => setTab("usuarios")}>Ver usuários</button>
        </section>
        <section style={styles.panel}>
          <h2>Pendências de pagamento</h2>
          {pagamentos.slice(0, 6).map((u) => <MiniRow key={u.id} u={u} extra={u.pagamento_status || PAGAMENTO.PENDENTE} />)}
          {!pagamentos.length && <Empty text="Nenhuma pendência." />}
          <button style={styles.secondaryButton} onClick={() => setTab("pagamentos")}>Ver pagamentos</button>
        </section>
      </div>
    </div>
  );
}

function Codigos({ usuarios, busca, setBusca, filtro, setFiltro, quantidade, setQuantidade, gerarCodigos, gerando, copiarCodigo, bloquear, liberar, liberarDeNovo, setSelecionado }) {
  return (
    <div>
      <section style={styles.toolbar}>
        <input placeholder="Buscar por código, nome, CPF, telefone ou e-mail..." value={busca} onChange={(e) => setBusca(e.target.value)} style={styles.searchInput} />
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)} style={styles.select}>
          <option>Todos</option><option>{STATUS.DISPONIVEL}</option><option>{STATUS.ATIVO}</option><option>{STATUS.BLOQUEADO}</option><option>{STATUS.VENCIDO}</option>
        </select>
      </section>
      <section style={styles.panelInline}>
        <strong>Gerar lote de códigos</strong>
        <input type="number" min="1" max="100" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} style={styles.numberInput} />
        <button style={styles.generateButtonSmall} disabled={gerando} onClick={() => gerarCodigos(Number(quantidade || 1))}>Gerar</button>
      </section>
      <CardList usuarios={usuarios} copiarCodigo={copiarCodigo} bloquear={bloquear} liberar={liberar} liberarDeNovo={liberarDeNovo} setSelecionado={setSelecionado} />
    </div>
  );
}

function Usuarios({ usuarios, busca, setBusca, setEditando, bloquear, liberar, renovar, abrirTermo }) {
  const vinculados = usuarios.filter((u) => u.nome || statusReal(u) !== STATUS.DISPONIVEL);
  return (
    <div>
      <section style={styles.toolbar}>
        <input placeholder="Buscar cliente..." value={busca} onChange={(e) => setBusca(e.target.value)} style={styles.searchInput} />
      </section>
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead><tr><th>Cliente</th><th>Código</th><th>Status</th><th>Validade</th><th>Pagamento</th><th>Ações</th></tr></thead>
          <tbody>
            {vinculados.map((u) => <tr key={u.id}><td><b>{u.nome || "Sem nome"}</b><small>{u.cpf || "CPF não informado"}</small></td><td>{u.codigo}</td><td><Badge status={statusReal(u)} /></td><td>{formatarData(u.validade)}</td><td>{u.pagamento_status || PAGAMENTO.PENDENTE}</td><td><ActionGroup u={u} setEditando={setEditando} bloquear={bloquear} liberar={liberar} renovar={renovar} abrirTermo={abrirTermo} /></td></tr>)}
          </tbody>
        </table>
        {!vinculados.length && <Empty text="Nenhum usuário vinculado ainda." />}
      </div>
    </div>
  );
}

function Pagamentos({ usuarios, renovar, bloquear }) {
  return <div style={styles.cardList}>{usuarios.map((u) => <article key={u.id} style={styles.codeCard}><CardHeader u={u} /><div style={styles.infoGrid}><Info label="Pagamento" value={u.pagamento_status || PAGAMENTO.PENDENTE} /><Info label="Pago em" value={formatarDataHora(u.pago_em)} /><Info label="Renovado em" value={formatarDataHora(u.renovado_em)} /><Info label="Validade" value={formatarData(u.validade)} /></div><div style={styles.actions}><button style={styles.successButton} onClick={() => renovar(u)}>Marcar pago e renovar 90 dias</button><button style={styles.dangerButton} onClick={() => bloquear(u)}>Bloquear</button></div></article>)}{!usuarios.length && <Empty text="Nenhum pagamento pendente." />}</div>;
}

function Documentos({ usuarios, abrirTermo, setEditando }) {
  return <div style={styles.cardList}>{usuarios.map((u) => <article key={u.id} style={styles.codeCard}><CardHeader u={u} /><div style={styles.infoGrid}><Info label="Termo" value={u.termos_pdf ? "Registrado" : "Gerar PDF"} /><Info label="Comprovante" value={u.comprovante_pdf ? "Registrado" : "Não anexado"} /><Info label="Envios" value={u.envios ?? 0} /><Info label="Alterações" value={u.alteracoes ?? 0} /></div><div style={styles.actions}><button style={styles.actionButton} onClick={() => abrirTermo(u)}>Gerar termo PDF</button>{u.comprovante_pdf && <a style={styles.successLink} href={u.comprovante_pdf} target="_blank" rel="noreferrer">Abrir comprovante</a>}<button style={styles.neutralButton} onClick={() => setEditando(u)}>Editar links/docs</button></div></article>)}{!usuarios.length && <Empty text="Nenhum documento ainda." />}</div>;
}

function Erros({ usuarios, registrarErroTeste }) {
  return <div style={styles.cardList}>{usuarios.map((u) => <article key={u.id} style={styles.codeCard}><CardHeader u={u} /><p style={styles.warning}><b>Último erro:</b> {u.ultimo_erro}</p><p style={styles.muted}>Data: {formatarDataHora(u.ultimo_erro_em)}</p><button style={styles.dangerButton} onClick={() => registrarErroTeste(u)}>Atualizar erro</button></article>)}{!usuarios.length && <Empty text="Nenhum erro registrado." />}</div>;
}

function CardList({ usuarios, copiarCodigo, bloquear, liberar, liberarDeNovo, setSelecionado }) {
  return <section style={styles.cardList}>{usuarios.map((u) => <article key={u.id} style={styles.codeCard}><CardHeader u={u} /><div style={styles.infoGrid}><Info label="Nome" value={u.nome || "Ainda não vinculado"} /><Info label="CPF" value={u.cpf || "-"} /><Info label="Telefone" value={u.telefone || "-"} /><Info label="E-mail" value={u.email || "-"} /><Info label="Validade" value={formatarData(u.validade)} /><Info label="Usado em" value={formatarDataHora(u.usado_em)} /><Info label="Envios" value={u.envios ?? 0} /><Info label="Alterações" value={u.alteracoes ?? 0} /></div><div style={styles.actions}><button style={styles.actionButton} onClick={() => copiarCodigo(u.codigo)}>Copiar</button><button style={styles.neutralButton} onClick={() => setSelecionado(u)}>Detalhes</button>{statusReal(u) !== STATUS.BLOQUEADO ? <button style={styles.dangerButton} onClick={() => bloquear(u)}>Bloquear</button> : <button style={styles.successButton} onClick={() => liberar(u)}>Liberar</button>}{statusReal(u) !== STATUS.DISPONIVEL && <button style={styles.neutralButton} onClick={() => liberarDeNovo(u)}>Liberar de novo</button>}</div></article>)}{!usuarios.length && <Empty text="Nenhum código encontrado." />}</section>;
}

function CardHeader({ u }) {
  return <div style={styles.codeHeader}><div><span style={styles.codeLabel}>Código de acesso</span><h2 style={styles.code}>{u.codigo}</h2><p style={styles.muted}>{u.nome || "Ainda não vinculado"}</p></div><Badge status={statusReal(u)} /></div>;
}

function ActionGroup({ u, setEditando, bloquear, liberar, renovar, abrirTermo }) {
  return <div style={styles.inlineActions}><button style={styles.actionButton} onClick={() => setEditando(u)}>Editar</button><button style={styles.successButton} onClick={() => renovar(u)}>Renovar</button>{statusReal(u) === STATUS.BLOQUEADO ? <button style={styles.successButton} onClick={() => liberar(u)}>Liberar</button> : <button style={styles.dangerButton} onClick={() => bloquear(u)}>Bloquear</button>}<button style={styles.neutralButton} onClick={() => abrirTermo(u)}>Termo</button></div>;
}

function Detalhes({ usuario, fechar, copiarCodigo, renovar, bloquear, liberar, abrirTermo, registrarErroTeste }) {
  return <div style={styles.modalBg}><div style={styles.modal}><button style={styles.close} onClick={fechar}>×</button><CardHeader u={usuario} /><div style={styles.infoGrid}><Info label="CPF" value={usuario.cpf || "-"} /><Info label="Telefone" value={usuario.telefone || "-"} /><Info label="E-mail" value={usuario.email || "-"} /><Info label="Sistema" value={usuario.sistema || "-"} /><Info label="Cargo" value={usuario.cargo || "-"} /><Info label="Órgão" value={usuario.orgao || "-"} /><Info label="Matrícula" value={usuario.mat1 || "-"} /><Info label="Unidade" value={usuario.unid1 || "-"} /><Info label="Validade" value={formatarData(usuario.validade)} /><Info label="Usado em" value={formatarDataHora(usuario.usado_em)} /><Info label="Envios" value={usuario.envios ?? 0} /><Info label="Alterações" value={usuario.alteracoes ?? 0} /></div>{usuario.observacoes && <p style={styles.warning}>{usuario.observacoes}</p>}<div style={styles.actions}><button style={styles.actionButton} onClick={() => copiarCodigo(usuario.codigo)}>Copiar código</button><button style={styles.successButton} onClick={() => renovar(usuario)}>Renovar 90 dias</button><button style={styles.neutralButton} onClick={() => abrirTermo(usuario)}>Gerar termo</button><button style={styles.dangerButton} onClick={() => registrarErroTeste(usuario)}>Registrar erro</button>{statusReal(usuario) === STATUS.BLOQUEADO ? <button style={styles.successButton} onClick={() => liberar(usuario)}>Liberar</button> : <button style={styles.dangerButton} onClick={() => bloquear(usuario)}>Bloquear</button>}</div></div></div>;
}

function Editor({ usuario, setUsuario, salvar, fechar }) {
  const fields = [["nome","Nome"],["cpf","CPF"],["telefone","Telefone"],["email","E-mail"],["sistema","Sistema"],["cargo","Cargo"],["orgao","Órgão"],["mat1","Matrícula 1"],["mat2","Matrícula 2"],["unid1","Unidade 1"],["unid2","Unidade 2"],["sit","Situação"],["validade","Validade"],["comprovante_pdf","Link comprovante"],["termos_pdf","Link termo"],["observacoes","Observações"]];
  return <div style={styles.modalBg}><div style={styles.modal}><button style={styles.close} onClick={fechar}>×</button><h2>Editar cliente</h2><div style={styles.formGrid}>{fields.map(([key,label]) => <label key={key} style={styles.label}><span>{label}</span><input type={key === "validade" ? "date" : "text"} value={usuario[key] || ""} onChange={(e) => setUsuario({ ...usuario, [key]: e.target.value })} style={styles.input} /></label>)}</div><button style={styles.primaryButton} onClick={salvar}>Salvar alterações</button></div></div>;
}

function Stat({ label, value, danger, warn }) {
  return <div style={{ ...styles.statCard, ...(danger ? styles.statDanger : {}), ...(warn ? styles.statWarn : {}) }}><span style={styles.statNumber}>{value}</span><span style={styles.statLabel}>{label}</span></div>;
}

function MiniRow({ u, extra }) {
  return <div style={styles.miniRow}><div><b>{u.nome || u.codigo}</b><small>{u.codigo}</small></div><span>{extra || formatarData(u.validade)}</span></div>;
}

function Badge({ status }) {
  return <span style={{ ...styles.badge, ...badgeStyle(status) }}>{status}</span>;
}

function Info({ label, value }) {
  return <div style={styles.infoItem}><span>{label}</span><strong>{value}</strong></div>;
}

function Empty({ text }) {
  return <div style={styles.empty}>{text}</div>;
}

const styles = {
  loginPage: { minHeight: "100vh", background: "linear-gradient(135deg,#06111f,#172554)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "Inter, Arial, sans-serif" },
  loginCard: { width: "100%", maxWidth: 420, background: "white", borderRadius: 28, padding: 32, boxShadow: "0 30px 80px rgba(0,0,0,.35)" },
  logo: { width: 64, height: 64, borderRadius: 20, background: "#2563eb", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 24, marginBottom: 18 },
  loginTitle: { margin: 0, color: "#0f172a", fontSize: 32 },
  loginText: { color: "#64748b", fontWeight: 700 },
  hint: { display: "block", marginTop: 12, color: "#94a3b8", fontWeight: 700 },
  page: { minHeight: "100vh", background: "#eef2f7", display: "flex", fontFamily: "Inter, Arial, sans-serif", color: "#0f172a" },
  sidebar: { width: 272, background: "#0f172a", color: "white", padding: 24, display: "flex", flexDirection: "column", justifyContent: "space-between", position: "sticky", top: 0, height: "100vh", boxSizing: "border-box" },
  brandBox: { display: "flex", gap: 12, alignItems: "center", marginBottom: 28 },
  logoSmall: { width: 48, height: 48, borderRadius: 16, background: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 },
  mutedBlock: { display: "block", color: "#94a3b8", fontSize: 13, fontWeight: 700, marginTop: 3 },
  menuActive: { width: "100%", padding: 14, borderRadius: 14, border: 0, background: "#2563eb", color: "white", fontWeight: 900, textAlign: "left", marginBottom: 9, cursor: "pointer" },
  menuButton: { width: "100%", padding: 14, borderRadius: 14, border: "1px solid rgba(255,255,255,.12)", background: "transparent", color: "#cbd5e1", fontWeight: 900, textAlign: "left", marginBottom: 9, cursor: "pointer" },
  logoutButton: { padding: 14, borderRadius: 14, border: 0, background: "#dc2626", color: "white", fontWeight: 900, cursor: "pointer" },
  main: { flex: 1, padding: 34, maxWidth: 1420, margin: "0 auto", boxSizing: "border-box", overflow: "hidden" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, marginBottom: 24 },
  eyebrow: { color: "#2563eb", fontWeight: 900, textTransform: "uppercase", fontSize: 13, letterSpacing: 1 },
  title: { fontSize: 42, margin: "6px 0 8px", letterSpacing: -1.2 },
  subtitle: { color: "#64748b", margin: 0, fontWeight: 700 },
  generateButton: { border: 0, borderRadius: 18, padding: "16px 22px", background: "#16a34a", color: "white", fontSize: 16, fontWeight: 900, cursor: "pointer", boxShadow: "0 14px 30px rgba(22,163,74,.25)" },
  generateButtonSmall: { border: 0, borderRadius: 14, padding: "12px 18px", background: "#16a34a", color: "white", fontWeight: 900, cursor: "pointer" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(4,minmax(160px,1fr))", gap: 14, marginBottom: 18 },
  statCard: { background: "white", borderRadius: 22, padding: 18, boxShadow: "0 10px 30px rgba(15,23,42,.06)", border: "1px solid #e2e8f0" },
  statDanger: { borderColor: "#fecaca", background: "#fff7f7" },
  statWarn: { borderColor: "#fde68a", background: "#fffbeb" },
  statNumber: { display: "block", fontSize: 32, fontWeight: 950 },
  statLabel: { display: "block", color: "#64748b", fontWeight: 900, marginTop: 4 },
  twoCols: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  panel: { background: "white", borderRadius: 24, padding: 22, boxShadow: "0 10px 30px rgba(15,23,42,.06)", border: "1px solid #e2e8f0" },
  panelInline: { background: "white", borderRadius: 22, padding: 14, display: "flex", alignItems: "center", gap: 12, boxShadow: "0 10px 30px rgba(15,23,42,.06)", marginBottom: 18 },
  toolbar: { background: "white", borderRadius: 22, padding: 14, display: "flex", gap: 12, boxShadow: "0 10px 30px rgba(15,23,42,.06)", marginBottom: 18 },
  searchInput: { flex: 1, border: "1px solid #dbe3ef", background: "#f8fafc", borderRadius: 16, padding: "14px 16px", fontSize: 15, outline: "none", fontWeight: 700 },
  select: { border: "1px solid #dbe3ef", background: "#f8fafc", borderRadius: 16, padding: "0 14px", fontWeight: 800 },
  numberInput: { width: 80, border: "1px solid #dbe3ef", background: "#f8fafc", borderRadius: 14, padding: "12px", fontWeight: 900 },
  cardList: { display: "grid", gap: 16 },
  codeCard: { background: "white", borderRadius: 26, padding: 22, boxShadow: "0 12px 32px rgba(15,23,42,.07)", border: "1px solid #e2e8f0" },
  codeHeader: { display: "flex", justifyContent: "space-between", gap: 16, borderBottom: "1px solid #e2e8f0", paddingBottom: 16, marginBottom: 16 },
  codeLabel: { color: "#64748b", fontWeight: 900, fontSize: 13, textTransform: "uppercase" },
  code: { margin: "5px 0 0", fontSize: 30, letterSpacing: 1 },
  muted: { color: "#64748b", fontWeight: 700, margin: "6px 0 0" },
  badge: { padding: "8px 12px", borderRadius: 999, fontWeight: 950, fontSize: 13, whiteSpace: "nowrap", height: "fit-content" },
  infoGrid: { display: "grid", gridTemplateColumns: "repeat(4,minmax(150px,1fr))", gap: 10 },
  infoItem: { background: "#f8fafc", borderRadius: 16, padding: 13, border: "1px solid #e2e8f0", overflow: "hidden" },
  actions: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 },
  inlineActions: { display: "flex", gap: 8, flexWrap: "wrap" },
  actionButton: { border: 0, borderRadius: 14, background: "#2563eb", color: "white", padding: "10px 13px", fontWeight: 900, cursor: "pointer", textDecoration: "none" },
  dangerButton: { border: 0, borderRadius: 14, background: "#dc2626", color: "white", padding: "10px 13px", fontWeight: 900, cursor: "pointer" },
  successButton: { border: 0, borderRadius: 14, background: "#16a34a", color: "white", padding: "10px 13px", fontWeight: 900, cursor: "pointer" },
  neutralButton: { border: 0, borderRadius: 14, background: "#e2e8f0", color: "#0f172a", padding: "10px 13px", fontWeight: 900, cursor: "pointer" },
  successLink: { borderRadius: 14, background: "#16a34a", color: "white", padding: "10px 13px", fontWeight: 900, textDecoration: "none" },
  warning: { margin: "14px 0", background: "#fff7ed", color: "#9a3412", border: "1px solid #fed7aa", padding: 12, borderRadius: 14, fontWeight: 800 },
  empty: { textAlign: "center", background: "white", borderRadius: 24, padding: 28, color: "#64748b", boxShadow: "0 10px 30px rgba(15,23,42,.06)", fontWeight: 800 },
  input: { width: "100%", boxSizing: "border-box", padding: "14px 16px", borderRadius: 16, border: "1px solid #dbe3ef", marginBottom: 12, fontSize: 15, outline: "none", background: "#f8fafc", color: "#0f172a", fontWeight: 700 },
  primaryButton: { width: "100%", padding: 15, border: 0, borderRadius: 16, background: "#2563eb", color: "white", fontWeight: 950, fontSize: 16, cursor: "pointer" },
  tableWrap: { background: "white", borderRadius: 24, overflow: "auto", boxShadow: "0 10px 30px rgba(15,23,42,.06)" },
  table: { width: "100%", borderCollapse: "collapse" },
  miniRow: { display: "flex", justifyContent: "space-between", gap: 12, padding: "12px 0", borderBottom: "1px solid #e2e8f0" },
  modalBg: { position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 99, padding: 20 },
  modal: { width: "min(980px, 96vw)", maxHeight: "88vh", overflow: "auto", background: "white", borderRadius: 28, padding: 26, position: "relative", boxShadow: "0 30px 80px rgba(0,0,0,.35)" },
  close: { position: "absolute", right: 18, top: 14, border: 0, background: "#e2e8f0", borderRadius: 12, width: 36, height: 36, fontWeight: 900, cursor: "pointer" },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 },
  label: { display: "grid", fontWeight: 900, color: "#475569" },
};
