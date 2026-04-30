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
  if (!data) return "-";
  try {
    return new Date(`${data}T12:00:00`).toLocaleDateString("pt-BR");
  } catch {
    return data || "-";
  }
}

function formatarDataHora(data) {
  if (!data) return "-";
  try {
    return new Date(data).toLocaleString("pt-BR");
  } catch {
    return data || "-";
  }
}

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

  async function gerarUmCodigo() {
    setGerando(true);

    for (let i = 0; i < 10; i += 1) {
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
        await carregarUsuarios();
        await navigator.clipboard?.writeText(codigo).catch(() => {});
        setGerando(false);
        alert(`Código gerado e copiado: ${codigo}`);
        return;
      }

      if (!String(error.message || "").toLowerCase().includes("duplicate")) {
        console.error(error);
        alert("Erro ao gerar código.");
        setGerando(false);
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

    const registros = Array.from(codigos).map((codigo) => ({
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

    await carregarUsuarios();
    alert(`${qtd} códigos gerados.`);
  }

  async function copiarCodigo(codigo) {
    await navigator.clipboard?.writeText(codigo).catch(() => {});
    alert(`Código copiado: ${codigo}`);
  }

  async function alterarStatus(item, novoStatus) {
    const updates = { status: novoStatus };

    if (novoStatus === STATUS.BLOQUEADO) {
      updates.bloqueado_motivo = prompt("Motivo do bloqueio:", item.bloqueado_motivo || "") || "Bloqueio manual";
    }

    if (novoStatus === STATUS.ATIVO) {
      updates.validade = item.validade && item.validade >= hojeISO() ? item.validade : validade90Dias();
      updates.pagamento_status = "Pago";
      updates.pago_em = new Date().toISOString();
      updates.renovado_em = new Date().toISOString();
      updates.bloqueado_motivo = null;
    }

    if (novoStatus === STATUS.DISPONIVEL) {
      const ok = confirm("Liberar este código de novo? Isso apaga os dados do cliente.");
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
      alert("Erro ao renovar.");
      return;
    }

    await carregarUsuarios();
    alert(`Renovado até ${formatarData(novaValidade)}.`);
  }

  async function salvarObservacao(item) {
    const observacoes = prompt("Observação:", item.observacoes || "");
    if (observacoes === null) return;

    const { error } = await supabase.from("usuarios").update({ observacoes }).eq("id", item.id);
    if (error) alert("Erro ao salvar observação.");
    await carregarUsuarios();
  }

  const listaFiltrada = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return usuarios.filter((u) => {
      const texto = `${u.codigo || ""} ${u.nome || ""} ${u.cpf || ""} ${u.telefone || ""} ${u.email || ""}`.toLowerCase();
      const bateBusca = !termo || texto.includes(termo);
      const bateFiltro = filtro === "Todos" || u.status === filtro;
      return bateBusca && bateFiltro;
    });
  }, [usuarios, busca, filtro]);

  const stats = useMemo(() => {
    const s = {
      total: usuarios.length,
      disponivel: 0,
      ativo: 0,
      bloqueado: 0,
      vencido: 0,
      pendente: 0,
      erros: 0,
      envios: 0,
      alteracoes: 0,
    };

    usuarios.forEach((u) => {
      if (u.status === STATUS.DISPONIVEL) s.disponivel += 1;
      if (u.status === STATUS.ATIVO) s.ativo += 1;
      if (u.status === STATUS.BLOQUEADO) s.bloqueado += 1;
      if (u.status === STATUS.VENCIDO) s.vencido += 1;
      if ((u.pagamento_status || "Pendente") !== "Pago") s.pendente += 1;
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
          <p style={styles.loginSub}>Entre para gerenciar acessos e vencimentos.</p>

          <input style={styles.input} placeholder="Usuário" value={usuario} onChange={(e) => setUsuario(e.target.value)} />
          <input style={styles.input} placeholder="Senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} />

          <button style={styles.primaryFull} type="submit">Entrar</button>
        </form>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <aside style={styles.sidebar}>
        <div>
          <div style={styles.brand}>
            <div style={styles.logoSmall}>AF</div>
            <div>
              <strong>Atestado Fácil</strong>
              <span>Painel ADM</span>
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
            <button key={id} style={aba === id ? styles.navActive : styles.navItem} onClick={() => setAba(id)}>
              {label}
            </button>
          ))}
        </div>

        <button style={styles.logout} onClick={sair}>Sair</button>
      </aside>

      <main style={styles.main}>
        <header style={styles.header}>
          <div>
            <span style={styles.kicker}>Administração</span>
            <h1 style={styles.title}>{tituloAba(aba)}</h1>
            <p style={styles.subTitle}>Controle de códigos, usuários, pagamentos e erros.</p>
          </div>

          <button style={styles.softButton} onClick={carregarUsuarios}>
            {carregando ? "Atualizando..." : "Atualizar"}
          </button>
        </header>

        {aba === "dashboard" && <Dashboard stats={stats} setAba={setAba} />}

        {aba === "codigos" && (
          <Codigos
            lista={listaFiltrada}
            busca={busca}
            setBusca={setBusca}
            filtro={filtro}
            setFiltro={setFiltro}
            lote={lote}
            setLote={setLote}
            gerando={gerando}
            gerarUmCodigo={gerarUmCodigo}
            gerarLote={gerarLote}
            copiarCodigo={copiarCodigo}
            alterarStatus={alterarStatus}
          />
        )}

        {aba === "usuarios" && (
          <Usuarios
            lista={listaFiltrada.filter((u) => u.nome)}
            busca={busca}
            setBusca={setBusca}
            setSelecionado={setSelecionado}
            renovar={renovar}
            alterarStatus={alterarStatus}
            salvarObservacao={salvarObservacao}
          />
        )}

        {aba === "pagamentos" && <Pagamentos lista={usuarios.filter((u) => u.nome)} renovar={renovar} />}
        {aba === "documentos" && <Documentos lista={usuarios.filter((u) => u.nome)} />}
        {aba === "erros" && <Erros lista={usuarios.filter((u) => u.ultimo_erro)} />}

        {selecionado && (
          <ModalCliente
            item={selecionado}
            fechar={() => setSelecionado(null)}
            renovar={renovar}
            alterarStatus={alterarStatus}
          />
        )}
      </main>
    </div>
  );
}

function tituloAba(aba) {
  const map = {
    dashboard: "Dashboard",
    codigos: "Códigos de acesso",
    usuarios: "Gerenciar usuários",
    pagamentos: "Pagamentos",
    documentos: "Documentos",
    erros: "Erros de envio",
  };

  return map[aba] || "Painel";
}

function Dashboard({ stats, setAba }) {
  const cards = [
    ["Clientes ativos", stats.ativo, "usuarios"],
    ["Códigos livres", stats.disponivel, "codigos"],
    ["Vencidos", stats.vencido, "pagamentos"],
    ["Bloqueados", stats.bloqueado, "usuarios"],
    ["Pagamentos pendentes", stats.pendente, "pagamentos"],
    ["Erros registrados", stats.erros, "erros"],
    ["Envios totais", stats.envios, "usuarios"],
    ["Alterações", stats.alteracoes, "usuarios"],
  ];

  return (
    <div style={styles.metricGrid}>
      {cards.map(([label, value, target]) => (
        <button key={label} style={styles.metricCard} onClick={() => setAba(target)}>
          <span>{value}</span>
          <p>{label}</p>
        </button>
      ))}
    </div>
  );
}

function Codigos({ lista, busca, setBusca, filtro, setFiltro, lote, setLote, gerando, gerarUmCodigo, gerarLote, copiarCodigo, alterarStatus }) {
  return (
    <>
      <div style={styles.actionBar}>
        <div>
          <h2>Gerar códigos</h2>
          <p>Códigos de 5 dígitos para liberar o primeiro acesso do cliente.</p>
        </div>

        <div style={styles.actionGroup}>
          <button style={styles.primaryBtn} disabled={gerando} onClick={gerarUmCodigo}>
            {gerando ? "Gerando..." : "Gerar código"}
          </button>
          <input style={styles.loteInput} value={lote} type="number" min="1" max="100" onChange={(e) => setLote(e.target.value)} />
          <button style={styles.darkBtn} disabled={gerando} onClick={gerarLote}>Gerar lote</button>
        </div>
      </div>

      <Toolbar busca={busca} setBusca={setBusca} filtro={filtro} setFiltro={setFiltro} />

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Código</th>
              <th>Status</th>
              <th>Cliente</th>
              <th>CPF</th>
              <th>Validade</th>
              <th>Usado em</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 ? (
              <tr>
                <td colSpan="7" style={styles.emptyTd}>Nenhum código encontrado.</td>
              </tr>
            ) : (
              lista.map((item) => (
                <tr key={item.id}>
                  <td><span style={styles.codeMini}>{item.codigo}</span></td>
                  <td><Badge status={item.status} /></td>
                  <td>{item.nome || "Ainda não vinculado"}</td>
                  <td>{item.cpf || "-"}</td>
                  <td>{formatarData(item.validade)}</td>
                  <td>{formatarDataHora(item.usado_em)}</td>
                  <td>
                    <div style={styles.rowButtons}>
                      <button style={styles.linkBtn} onClick={() => copiarCodigo(item.codigo)}>Copiar</button>
                      {item.status !== STATUS.BLOQUEADO ? (
                        <button style={styles.redBtn} onClick={() => alterarStatus(item, STATUS.BLOQUEADO)}>Bloquear</button>
                      ) : (
                        <button style={styles.greenBtn} onClick={() => alterarStatus(item, STATUS.ATIVO)}>Ativar</button>
                      )}
                      {item.status !== STATUS.DISPONIVEL && (
                        <button style={styles.lightBtn} onClick={() => alterarStatus(item, STATUS.DISPONIVEL)}>Liberar</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Toolbar({ busca, setBusca, filtro, setFiltro }) {
  return (
    <div style={styles.toolbar}>
      <input
        style={styles.search}
        placeholder="Buscar por código, nome, CPF, telefone ou e-mail..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />

      <select style={styles.select} value={filtro} onChange={(e) => setFiltro(e.target.value)}>
        <option>Todos</option>
        <option>Disponível</option>
        <option>Ativo</option>
        <option>Bloqueado</option>
        <option>Vencido</option>
      </select>
    </div>
  );
}

function Usuarios({ lista, busca, setBusca, setSelecionado, renovar, alterarStatus, salvarObservacao }) {
  return (
    <>
      <div style={styles.toolbar}>
        <input style={styles.search} placeholder="Buscar cliente..." value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Código</th>
              <th>CPF</th>
              <th>Contato</th>
              <th>Status</th>
              <th>Validade</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 ? (
              <tr><td colSpan="7" style={styles.emptyTd}>Nenhum usuário cadastrado.</td></tr>
            ) : (
              lista.map((u) => (
                <tr key={u.id}>
                  <td>{u.nome}</td>
                  <td><span style={styles.codeMini}>{u.codigo}</span></td>
                  <td>{u.cpf || "-"}</td>
                  <td>{u.telefone || u.email || "-"}</td>
                  <td><Badge status={u.status} /></td>
                  <td>{formatarData(u.validade)}</td>
                  <td>
                    <div style={styles.rowButtons}>
                      <button style={styles.linkBtn} onClick={() => setSelecionado(u)}>Detalhes</button>
                      <button style={styles.greenBtn} onClick={() => renovar(u)}>Renovar</button>
                      <button style={styles.lightBtn} onClick={() => salvarObservacao(u)}>Obs.</button>
                      <button style={styles.redBtn} onClick={() => alterarStatus(u, STATUS.BLOQUEADO)}>Bloquear</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Pagamentos({ lista, renovar }) {
  return (
    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Código</th>
            <th>Status pagamento</th>
            <th>Pago em</th>
            <th>Validade</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {lista.length === 0 ? (
            <tr><td colSpan="6" style={styles.emptyTd}>Nenhum pagamento para exibir.</td></tr>
          ) : (
            lista.map((u) => (
              <tr key={u.id}>
                <td>{u.nome}</td>
                <td><span style={styles.codeMini}>{u.codigo}</span></td>
                <td>{u.pagamento_status || "Pendente"}</td>
                <td>{formatarDataHora(u.pago_em)}</td>
                <td>{formatarData(u.validade)}</td>
                <td><button style={styles.greenBtn} onClick={() => renovar(u)}>Marcar pago e renovar</button></td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function Documentos({ lista }) {
  return (
    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Código</th>
            <th>Termos</th>
            <th>Comprovante</th>
            <th>Alterações</th>
          </tr>
        </thead>
        <tbody>
          {lista.length === 0 ? (
            <tr><td colSpan="5" style={styles.emptyTd}>Nenhum documento registrado.</td></tr>
          ) : (
            lista.map((u) => (
              <tr key={u.id}>
                <td>{u.nome}</td>
                <td><span style={styles.codeMini}>{u.codigo}</span></td>
                <td>{u.termos_pdf ? <a href={u.termos_pdf} target="_blank" rel="noreferrer">Abrir</a> : "Não anexado"}</td>
                <td>{u.comprovante_pdf ? <a href={u.comprovante_pdf} target="_blank" rel="noreferrer">Abrir</a> : "Não anexado"}</td>
                <td>{u.alteracoes || 0}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function Erros({ lista }) {
  return (
    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th>Cliente/código</th>
            <th>Data</th>
            <th>Erro</th>
          </tr>
        </thead>
        <tbody>
          {lista.length === 0 ? (
            <tr><td colSpan="3" style={styles.emptyTd}>Nenhum erro registrado.</td></tr>
          ) : (
            lista.map((u) => (
              <tr key={u.id}>
                <td>{u.nome || u.codigo}</td>
                <td>{formatarDataHora(u.ultimo_erro_em)}</td>
                <td>{u.ultimo_erro}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function ModalCliente({ item, fechar, renovar, alterarStatus }) {
  return (
    <div style={styles.modalBg}>
      <div style={styles.modal}>
        <div style={styles.modalTop}>
          <div>
            <span style={styles.kicker}>Cliente</span>
            <h2>{item.nome || item.codigo}</h2>
          </div>
          <button style={styles.lightBtn} onClick={fechar}>Fechar</button>
        </div>

        <div style={styles.detailGrid}>
          <Detail label="Código" value={item.codigo} />
          <Detail label="Status" value={item.status} />
          <Detail label="CPF" value={item.cpf || "-"} />
          <Detail label="Telefone" value={item.telefone || "-"} />
          <Detail label="E-mail" value={item.email || "-"} />
          <Detail label="Cargo" value={item.cargo || "-"} />
          <Detail label="Órgão" value={item.orgao || "-"} />
          <Detail label="Validade" value={formatarData(item.validade)} />
          <Detail label="Envios" value={item.envios || 0} />
          <Detail label="Alterações" value={item.alteracoes || 0} />
          <Detail label="Pagamento" value={item.pagamento_status || "Pendente"} />
          <Detail label="Usado em" value={formatarDataHora(item.usado_em)} />
        </div>

        {item.observacoes && <div style={styles.note}>{item.observacoes}</div>}

        <div style={styles.modalActions}>
          <button style={styles.greenBtn} onClick={() => renovar(item)}>Renovar 90 dias</button>
          <button style={styles.redBtn} onClick={() => alterarStatus(item, STATUS.BLOQUEADO)}>Bloquear</button>
          <button style={styles.lightBtn} onClick={() => alterarStatus(item, STATUS.DISPONIVEL)}>Liberar código</button>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div style={styles.detail}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Badge({ status }) {
  return <span style={{ ...styles.badge, ...badgeStyle(status) }}>{status || "-"}</span>;
}

function badgeStyle(status) {
  if (status === STATUS.ATIVO) return { color: "#067647", background: "#ecfdf3", borderColor: "#abefc6" };
  if (status === STATUS.BLOQUEADO) return { color: "#b42318", background: "#fef3f2", borderColor: "#fecdca" };
  if (status === STATUS.VENCIDO) return { color: "#b54708", background: "#fffaeb", borderColor: "#fedf89" };
  return { color: "#175cd3", background: "#eff8ff", borderColor: "#b2ddff" };
}

const styles = {
  loginPage: {
    minHeight: "100vh",
    background: "#f6f8fb",
    display: "grid",
    placeItems: "center",
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Arial, sans-serif",
  },
  loginCard: {
    width: 360,
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 18,
    padding: 28,
    boxShadow: "0 18px 50px rgba(15,23,42,.08)",
  },
  logo: {
    width: 42,
    height: 42,
    borderRadius: 12,
    background: "#1d4ed8",
    color: "#fff",
    display: "grid",
    placeItems: "center",
    fontWeight: 700,
    marginBottom: 18,
  },
  loginTitle: { margin: 0, fontSize: 22, fontWeight: 650, color: "#111827" },
  loginSub: { margin: "6px 0 22px", color: "#667085", fontSize: 14 },
  input: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #d0d5dd",
    borderRadius: 10,
    padding: "11px 12px",
    marginBottom: 10,
    fontSize: 14,
    outline: "none",
  },
  primaryFull: {
    width: "100%",
    border: 0,
    borderRadius: 10,
    padding: "12px 14px",
    background: "#1d4ed8",
    color: "#fff",
    fontWeight: 650,
    cursor: "pointer",
  },

  page: {
    minHeight: "100vh",
    width: "100vw",
    display: "flex",
    background: "#f6f8fb",
    color: "#111827",
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Arial, sans-serif",
    overflow: "hidden",
  },
  sidebar: {
    width: 240,
    height: "100vh",
    boxSizing: "border-box",
    padding: "24px 18px",
    background: "#0b1730",
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    flexShrink: 0,
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 32,
  },
  logoSmall: {
    width: 40,
    height: 40,
    borderRadius: 12,
    background: "#1d4ed8",
    display: "grid",
    placeItems: "center",
    fontWeight: 700,
    fontSize: 13,
  },
  navActive: {
    width: "100%",
    border: 0,
    background: "#1d4ed8",
    color: "#fff",
    padding: "11px 13px",
    borderRadius: 10,
    textAlign: "left",
    fontWeight: 600,
    marginBottom: 6,
    cursor: "pointer",
  },
  navItem: {
    width: "100%",
    border: 0,
    background: "transparent",
    color: "#d0d5dd",
    padding: "11px 13px",
    borderRadius: 10,
    textAlign: "left",
    fontWeight: 450,
    marginBottom: 6,
    cursor: "pointer",
  },
  logout: {
    border: "1px solid rgba(255,255,255,.16)",
    color: "#fff",
    background: "transparent",
    borderRadius: 10,
    padding: "11px 13px",
    cursor: "pointer",
  },
  main: {
    flex: 1,
    height: "100vh",
    overflow: "auto",
    padding: "28px 34px",
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingBottom: 18,
    marginBottom: 22,
    borderBottom: "1px solid #e4e7ec",
  },
  kicker: {
    display: "block",
    color: "#1d4ed8",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.4,
    fontWeight: 700,
    marginBottom: 6,
  },
  title: { margin: 0, fontSize: 28, fontWeight: 650, letterSpacing: -0.5 },
  subTitle: { margin: "6px 0 0", color: "#667085", fontSize: 14 },
  softButton: {
    border: "1px solid #d0d5dd",
    background: "#fff",
    color: "#1d4ed8",
    borderRadius: 10,
    padding: "10px 14px",
    fontWeight: 600,
    cursor: "pointer",
  },

  metricGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(170px, 1fr))",
    gap: 14,
  },
  metricCard: {
    background: "#fff",
    border: "1px solid #e4e7ec",
    borderRadius: 16,
    padding: "18px 20px",
    textAlign: "left",
    cursor: "pointer",
    boxShadow: "0 8px 24px rgba(15,23,42,.04)",
  },

  actionBar: {
    background: "#fff",
    border: "1px solid #e4e7ec",
    borderRadius: 16,
    padding: "18px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 14,
    boxShadow: "0 8px 24px rgba(15,23,42,.04)",
  },
  actionGroup: { display: "flex", alignItems: "center", gap: 10 },
  primaryBtn: {
    border: 0,
    background: "#1d4ed8",
    color: "#fff",
    borderRadius: 10,
    padding: "10px 14px",
    fontWeight: 650,
    cursor: "pointer",
  },
  darkBtn: {
    border: 0,
    background: "#111827",
    color: "#fff",
    borderRadius: 10,
    padding: "10px 14px",
    fontWeight: 650,
    cursor: "pointer",
  },
  loteInput: {
    width: 64,
    border: "1px solid #d0d5dd",
    borderRadius: 10,
    padding: "10px",
    textAlign: "center",
    fontWeight: 600,
  },
  toolbar: {
    background: "#fff",
    border: "1px solid #e4e7ec",
    borderRadius: 14,
    padding: 10,
    display: "flex",
    gap: 10,
    marginBottom: 14,
  },
  search: {
    flex: 1,
    border: "1px solid #d0d5dd",
    borderRadius: 10,
    padding: "11px 13px",
    fontSize: 14,
    outline: "none",
  },
  select: {
    width: 150,
    border: "1px solid #d0d5dd",
    borderRadius: 10,
    padding: "11px 13px",
    background: "#fff",
  },
  tableWrap: {
    background: "#fff",
    border: "1px solid #e4e7ec",
    borderRadius: 16,
    overflow: "hidden",
    boxShadow: "0 8px 24px rgba(15,23,42,.04)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13.5,
  },
  codeMini: {
    display: "inline-block",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: 1,
    color: "#111827",
  },
  badge: {
    display: "inline-block",
    border: "1px solid",
    borderRadius: 999,
    padding: "4px 9px",
    fontSize: 12,
    fontWeight: 600,
  },
  rowButtons: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
  },
  linkBtn: {
    border: 0,
    background: "#1d4ed8",
    color: "#fff",
    borderRadius: 8,
    padding: "7px 10px",
    fontWeight: 600,
    cursor: "pointer",
  },
  redBtn: {
    border: 0,
    background: "#b42318",
    color: "#fff",
    borderRadius: 8,
    padding: "7px 10px",
    fontWeight: 600,
    cursor: "pointer",
  },
  greenBtn: {
    border: 0,
    background: "#067647",
    color: "#fff",
    borderRadius: 8,
    padding: "7px 10px",
    fontWeight: 600,
    cursor: "pointer",
  },
  lightBtn: {
    border: "1px solid #d0d5dd",
    background: "#fff",
    color: "#111827",
    borderRadius: 8,
    padding: "7px 10px",
    fontWeight: 600,
    cursor: "pointer",
  },
  emptyTd: {
    padding: 34,
    textAlign: "center",
    color: "#667085",
  },
  modalBg: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,.45)",
    display: "grid",
    placeItems: "center",
    zIndex: 10,
    padding: 20,
  },
  modal: {
    width: "100%",
    maxWidth: 900,
    background: "#fff",
    borderRadius: 18,
    padding: 24,
    boxShadow: "0 24px 80px rgba(15,23,42,.25)",
  },
  modalTop: {
    display: "flex",
    justifyContent: "space-between",
    borderBottom: "1px solid #e4e7ec",
    paddingBottom: 14,
    marginBottom: 18,
  },
  detailGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 10,
  },
  detail: {
    background: "#f9fafb",
    border: "1px solid #eaecf0",
    borderRadius: 12,
    padding: 12,
  },
  modalActions: { display: "flex", gap: 8, marginTop: 16 },
  note: {
    background: "#eff8ff",
    border: "1px solid #b2ddff",
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },
};

// estilos de tabela via CSS injetado
const style = document.createElement("style");
style.textContent = `
  table th {
    text-align: left;
    font-weight: 650;
    color: #475467;
    background: #f9fafb;
    border-bottom: 1px solid #e4e7ec;
    padding: 12px 14px;
    white-space: nowrap;
  }

  table td {
    border-bottom: 1px solid #f0f2f5;
    padding: 12px 14px;
    color: #111827;
    vertical-align: middle;
  }

  table tr:last-child td {
    border-bottom: 0;
  }

  .metricCard span,
  button span:first-child {
    font-size: 28px;
    font-weight: 650;
    color: #1d4ed8;
  }

  .metricCard p {
    margin: 4px 0 0;
    color: #667085;
  }

  @media (max-width: 900px) {
    table {
      min-width: 900px;
    }
  }
`;
document.head.appendChild(style);
