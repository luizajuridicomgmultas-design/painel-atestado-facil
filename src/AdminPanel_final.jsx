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
  const data = new Date();
  data.setDate(data.getDate() + 90);
  return data.toISOString().split("T")[0];
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
  const [loading, setLoading] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [clienteAberto, setClienteAberto] = useState(null);

  useEffect(() => {
    if (logado) carregar();
  }, [logado]);

  async function carregar() {
    setLoading(true);

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
      alert("Erro ao carregar dados do painel.");
    } else {
      setUsuarios(data || []);
    }

    setLoading(false);
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
    setUsuario("");
    setSenha("");
  }

  async function criarCodigo(copiar = true) {
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
        setGerando(false);

        if (copiar) {
          await navigator.clipboard?.writeText(codigo).catch(() => {});
          alert(`Código gerado e copiado: ${codigo}`);
        }

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

  async function criarLote() {
    const qtd = Math.max(1, Math.min(Number(lote) || 1, 100));
    setGerando(true);

    const set = new Set();
    while (set.size < qtd) set.add(gerarCodigo());

    const registros = [...set].map((codigo) => ({
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

  async function copiar(texto) {
    await navigator.clipboard?.writeText(texto).catch(() => {});
    alert(`Copiado: ${texto}`);
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
      const ok = confirm("Liberar este código novamente? Os dados do cliente serão removidos.");
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

    setClienteAberto(null);
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

    setClienteAberto(null);
    await carregar();
    alert(`Acesso renovado até ${formatarData(novaValidade)}.`);
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
      const bateBusca = !termo || texto.includes(termo);
      const bateFiltro = filtro === "Todos" || u.status === filtro;

      return bateBusca && bateFiltro;
    });
  }, [usuarios, busca, filtro]);

  const clientes = useMemo(() => filtrados.filter((u) => u.nome), [filtrados]);

  const stats = useMemo(() => {
    const base = {
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
      if (u.status === STATUS.DISPONIVEL) base.disponivel++;
      if (u.status === STATUS.ATIVO) base.ativo++;
      if (u.status === STATUS.BLOQUEADO) base.bloqueado++;
      if (u.status === STATUS.VENCIDO) base.vencido++;
      if ((u.pagamento_status || "Pendente") !== "Pago") base.pendente++;
      if (u.ultimo_erro) base.erro++;
      base.envios += Number(u.envios || 0);
    });

    return base;
  }, [usuarios]);

  if (!logado) {
    return (
      <div className="af-login">
        <form className="af-login-card" onSubmit={entrar}>
          <div className="af-logo">AF</div>
          <h1>Atestado Fácil</h1>
          <p>Painel administrativo</p>

          <input placeholder="Usuário" value={usuario} onChange={(e) => setUsuario(e.target.value)} />
          <input placeholder="Senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} />

          <button type="submit">Entrar</button>
        </form>

        <Style />
      </div>
    );
  }

  return (
    <div className="af-page">
      <Style />

      <aside className="af-sidebar">
        <div>
          <div className="af-brand">
            <div className="af-logo small">AF</div>
            <div>
              <strong>Atestado Fácil</strong>
              <span>Painel administrativo</span>
            </div>
          </div>

          <nav className="af-nav">
            {[
              ["dashboard", "Dashboard"],
              ["codigos", "Códigos"],
              ["usuarios", "Usuários"],
              ["pagamentos", "Pagamentos"],
              ["documentos", "Documentos"],
              ["erros", "Erros"],
            ].map(([id, label]) => (
              <button key={id} className={aba === id ? "active" : ""} onClick={() => setAba(id)}>
                {label}
              </button>
            ))}
          </nav>
        </div>

        <button className="af-logout" onClick={sair}>Sair</button>
      </aside>

      <main className="af-main">
        <header className="af-header">
          <div>
            <span>Administração</span>
            <h1>{tituloAba(aba)}</h1>
            <p>Controle completo de acessos, usuários, pagamentos e vencimentos.</p>
          </div>

          <button className="btn ghost" onClick={carregar}>
            {loading ? "Atualizando..." : "Atualizar"}
          </button>
        </header>

        {aba === "dashboard" && <Dashboard stats={stats} setAba={setAba} />}

        {aba === "codigos" && (
          <>
            <div className="af-panel">
              <div>
                <h2>Gerar códigos</h2>
                <p>Os códigos têm 5 dígitos e são vinculados quando o cliente se cadastra no app.</p>
              </div>

              <div className="af-actions">
                <button className="btn primary" disabled={gerando} onClick={() => criarCodigo(true)}>
                  {gerando ? "Gerando..." : "Gerar código"}
                </button>

                <input className="small-input" type="number" min="1" max="100" value={lote} onChange={(e) => setLote(e.target.value)} />

                <button className="btn dark" disabled={gerando} onClick={criarLote}>
                  Gerar lote
                </button>
              </div>
            </div>

            <Filtro busca={busca} setBusca={setBusca} filtro={filtro} setFiltro={setFiltro} />

            <ListaCodigos
              lista={filtrados}
              copiar={copiar}
              atualizarStatus={atualizarStatus}
              abrir={setClienteAberto}
            />
          </>
        )}

        {aba === "usuarios" && (
          <>
            <Filtro busca={busca} setBusca={setBusca} filtro={filtro} setFiltro={setFiltro} />
            <ListaUsuarios
              lista={clientes}
              abrir={setClienteAberto}
              renovar={renovar}
              bloquear={(item) => atualizarStatus(item, STATUS.BLOQUEADO)}
              salvarObs={salvarObs}
            />
          </>
        )}

        {aba === "pagamentos" && <ListaPagamentos lista={usuarios.filter((u) => u.nome)} renovar={renovar} />}

        {aba === "documentos" && <ListaDocumentos lista={usuarios.filter((u) => u.nome)} />}

        {aba === "erros" && <ListaErros lista={usuarios.filter((u) => u.ultimo_erro)} />}

        {clienteAberto && (
          <ClienteModal
            item={clienteAberto}
            fechar={() => setClienteAberto(null)}
            renovar={renovar}
            atualizarStatus={atualizarStatus}
          />
        )}
      </main>
    </div>
  );
}

function tituloAba(aba) {
  return {
    dashboard: "Dashboard",
    codigos: "Códigos de acesso",
    usuarios: "Usuários",
    pagamentos: "Pagamentos",
    documentos: "Documentos",
    erros: "Erros de envio",
  }[aba] || "Painel";
}

function Dashboard({ stats, setAba }) {
  const cards = [
    ["Clientes ativos", stats.ativo, "usuarios"],
    ["Códigos livres", stats.disponivel, "codigos"],
    ["Vencidos", stats.vencido, "pagamentos"],
    ["Bloqueados", stats.bloqueado, "usuarios"],
    ["Pagamentos pendentes", stats.pendente, "pagamentos"],
    ["Erros", stats.erro, "erros"],
    ["Envios totais", stats.envios, "usuarios"],
    ["Total de códigos", stats.total, "codigos"],
  ];

  return (
    <section className="stats">
      {cards.map(([label, value, target]) => (
        <button key={label} onClick={() => setAba(target)} className="stat-card">
          <strong>{value}</strong>
          <span>{label}</span>
        </button>
      ))}
    </section>
  );
}

function Filtro({ busca, setBusca, filtro, setFiltro }) {
  return (
    <div className="filter">
      <input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar por código, nome, CPF, telefone ou e-mail"
      />

      <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
        <option>Todos</option>
        <option>Disponível</option>
        <option>Ativo</option>
        <option>Bloqueado</option>
        <option>Vencido</option>
      </select>
    </div>
  );
}

function ListaCodigos({ lista, copiar, atualizarStatus, abrir }) {
  return (
    <div className="list">
      <div className="list-head codes">
        <span>Código</span>
        <span>Status</span>
        <span>Cliente</span>
        <span>Validade</span>
        <span>Ações</span>
      </div>

      {lista.length === 0 ? (
        <Empty text="Nenhum código encontrado." />
      ) : (
        lista.map((item) => (
          <div key={item.id} className="list-row codes">
            <span className="code">{item.codigo}</span>
            <Badge status={item.status} />
            <span>{item.nome || "Ainda não vinculado"}</span>
            <span>{formatarData(item.validade)}</span>

            <div className="row-actions">
              <button onClick={() => copiar(item.codigo)}>Copiar</button>
              <button onClick={() => abrir(item)}>Ver</button>
              {item.status !== STATUS.BLOQUEADO ? (
                <button className="danger" onClick={() => atualizarStatus(item, STATUS.BLOQUEADO)}>Bloquear</button>
              ) : (
                <button className="success" onClick={() => atualizarStatus(item, STATUS.ATIVO)}>Ativar</button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function ListaUsuarios({ lista, abrir, renovar, bloquear, salvarObs }) {
  return (
    <div className="list">
      <div className="list-head users">
        <span>Cliente</span>
        <span>Código</span>
        <span>Contato</span>
        <span>Status</span>
        <span>Validade</span>
        <span>Ações</span>
      </div>

      {lista.length === 0 ? (
        <Empty text="Nenhum usuário cadastrado." />
      ) : (
        lista.map((item) => (
          <div key={item.id} className="list-row users">
            <span>{item.nome}</span>
            <span className="code small-code">{item.codigo}</span>
            <span>{item.telefone || item.email || "-"}</span>
            <Badge status={item.status} />
            <span>{formatarData(item.validade)}</span>

            <div className="row-actions">
              <button onClick={() => abrir(item)}>Detalhes</button>
              <button className="success" onClick={() => renovar(item)}>Renovar</button>
              <button onClick={() => salvarObs(item)}>Obs.</button>
              <button className="danger" onClick={() => bloquear(item)}>Bloquear</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function ListaPagamentos({ lista, renovar }) {
  return (
    <div className="list">
      <div className="list-head payments">
        <span>Cliente</span>
        <span>Código</span>
        <span>Status</span>
        <span>Pago em</span>
        <span>Validade</span>
        <span>Ação</span>
      </div>

      {lista.length === 0 ? (
        <Empty text="Nenhum pagamento para exibir." />
      ) : (
        lista.map((item) => (
          <div key={item.id} className="list-row payments">
            <span>{item.nome}</span>
            <span className="code small-code">{item.codigo}</span>
            <span>{item.pagamento_status || "Pendente"}</span>
            <span>{formatarDataHora(item.pago_em)}</span>
            <span>{formatarData(item.validade)}</span>
            <button className="success solo" onClick={() => renovar(item)}>Marcar pago</button>
          </div>
        ))
      )}
    </div>
  );
}

function ListaDocumentos({ lista }) {
  return (
    <div className="list">
      <div className="list-head docs">
        <span>Cliente</span>
        <span>Código</span>
        <span>Termos</span>
        <span>Comprovante</span>
        <span>Alterações</span>
      </div>

      {lista.length === 0 ? (
        <Empty text="Nenhum documento registrado." />
      ) : (
        lista.map((item) => (
          <div key={item.id} className="list-row docs">
            <span>{item.nome}</span>
            <span className="code small-code">{item.codigo}</span>
            <span>{item.termos_pdf ? <a href={item.termos_pdf} target="_blank" rel="noreferrer">Abrir</a> : "Não anexado"}</span>
            <span>{item.comprovante_pdf ? <a href={item.comprovante_pdf} target="_blank" rel="noreferrer">Abrir</a> : "Não anexado"}</span>
            <span>{item.alteracoes || 0}</span>
          </div>
        ))
      )}
    </div>
  );
}

function ListaErros({ lista }) {
  return (
    <div className="list">
      <div className="list-head errors">
        <span>Cliente/código</span>
        <span>Data</span>
        <span>Erro</span>
      </div>

      {lista.length === 0 ? (
        <Empty text="Nenhum erro registrado." />
      ) : (
        lista.map((item) => (
          <div key={item.id} className="list-row errors">
            <span>{item.nome || item.codigo}</span>
            <span>{formatarDataHora(item.ultimo_erro_em)}</span>
            <span>{item.ultimo_erro}</span>
          </div>
        ))
      )}
    </div>
  );
}

function ClienteModal({ item, fechar, renovar, atualizarStatus }) {
  return (
    <div className="modal-bg">
      <div className="modal">
        <div className="modal-top">
          <div>
            <span>Cliente</span>
            <h2>{item.nome || item.codigo}</h2>
          </div>
          <button onClick={fechar}>Fechar</button>
        </div>

        <div className="detail-grid">
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

        {item.observacoes && <div className="note">{item.observacoes}</div>}

        <div className="modal-actions">
          <button className="success" onClick={() => renovar(item)}>Renovar 90 dias</button>
          <button className="danger" onClick={() => atualizarStatus(item, STATUS.BLOQUEADO)}>Bloquear</button>
          <button onClick={() => atualizarStatus(item, STATUS.DISPONIVEL)}>Liberar código</button>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="detail">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Empty({ text }) {
  return <div className="empty">{text}</div>;
}

function Badge({ status }) {
  const cls = status === STATUS.ATIVO
    ? "ok"
    : status === STATUS.BLOQUEADO
      ? "bad"
      : status === STATUS.VENCIDO
        ? "warn"
        : "info";

  return <span className={`badge ${cls}`}>{status || STATUS.DISPONIVEL}</span>;
}

function Style() {
  return (
    <style>{`
      * { box-sizing: border-box; }

      body {
        margin: 0;
        background: #f6f7fb;
      }

      .af-login {
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #f6f7fb;
        font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #101828;
      }

      .af-login-card {
        width: 360px;
        padding: 30px;
        background: #fff;
        border: 1px solid #e6e8ef;
        border-radius: 20px;
        box-shadow: 0 20px 70px rgba(15, 23, 42, .08);
      }

      .af-logo {
        width: 42px;
        height: 42px;
        border-radius: 12px;
        display: grid;
        place-items: center;
        background: #1d4ed8;
        color: #fff;
        font-weight: 700;
        font-size: 13px;
        letter-spacing: .4px;
      }

      .af-logo.small {
        width: 38px;
        height: 38px;
        border-radius: 11px;
        flex: 0 0 auto;
      }

      .af-login-card h1 {
        margin: 20px 0 4px;
        font-size: 22px;
        font-weight: 650;
      }

      .af-login-card p {
        margin: 0 0 22px;
        color: #667085;
        font-size: 14px;
      }

      .af-login-card input {
        width: 100%;
        height: 44px;
        margin-bottom: 10px;
        padding: 0 12px;
        border: 1px solid #d0d5dd;
        border-radius: 10px;
        outline: none;
        font-size: 14px;
      }

      .af-login-card button {
        width: 100%;
        height: 44px;
        border: 0;
        border-radius: 10px;
        background: #1d4ed8;
        color: #fff;
        font-weight: 650;
        cursor: pointer;
      }

      .af-page {
        min-height: 100vh;
        width: 100vw;
        display: flex;
        background: #f6f7fb;
        color: #101828;
        font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        overflow: hidden;
      }

      .af-sidebar {
        width: 250px;
        height: 100vh;
        padding: 24px 18px;
        background: #0b1730;
        color: #fff;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        flex-shrink: 0;
      }

      .af-brand {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 34px;
      }

      .af-brand strong {
        display: block;
        font-size: 15px;
        font-weight: 650;
      }

      .af-brand span {
        display: block;
        margin-top: 2px;
        color: #98a2b3;
        font-size: 12px;
      }

      .af-nav {
        display: grid;
        gap: 5px;
      }

      .af-nav button,
      .af-logout {
        width: 100%;
        height: 42px;
        padding: 0 13px;
        border: 0;
        border-radius: 10px;
        background: transparent;
        color: #d0d5dd;
        text-align: left;
        font-size: 14px;
        font-weight: 450;
        cursor: pointer;
      }

      .af-nav button.active {
        background: #1d4ed8;
        color: #fff;
        font-weight: 600;
      }

      .af-logout {
        border: 1px solid rgba(255,255,255,.14);
        text-align: center;
      }

      .af-main {
        flex: 1;
        height: 100vh;
        padding: 30px 38px;
        overflow: auto;
      }

      .af-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        gap: 20px;
        padding-bottom: 20px;
        margin-bottom: 22px;
        border-bottom: 1px solid #e4e7ec;
      }

      .af-header span {
        display: block;
        color: #1d4ed8;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 1.7px;
        text-transform: uppercase;
        margin-bottom: 7px;
      }

      .af-header h1 {
        margin: 0;
        font-size: 30px;
        line-height: 1.1;
        letter-spacing: -.7px;
        font-weight: 650;
      }

      .af-header p {
        margin: 7px 0 0;
        color: #667085;
        font-size: 14px;
      }

      .btn {
        height: 40px;
        padding: 0 14px;
        border-radius: 10px;
        border: 1px solid #d0d5dd;
        background: #fff;
        color: #101828;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
      }

      .btn.primary {
        background: #1d4ed8;
        color: #fff;
        border-color: #1d4ed8;
      }

      .btn.dark {
        background: #101828;
        color: #fff;
        border-color: #101828;
      }

      .btn.ghost {
        color: #1d4ed8;
      }

      .stats {
        display: grid;
        grid-template-columns: repeat(4, minmax(180px, 1fr));
        gap: 14px;
      }

      .stat-card {
        border: 1px solid #e4e7ec;
        border-radius: 18px;
        background: #fff;
        padding: 20px;
        text-align: left;
        box-shadow: 0 10px 30px rgba(15, 23, 42, .035);
        cursor: pointer;
      }

      .stat-card strong {
        display: block;
        color: #1d4ed8;
        font-size: 30px;
        font-weight: 650;
        line-height: 1;
      }

      .stat-card span {
        display: block;
        margin-top: 8px;
        color: #667085;
        font-size: 14px;
      }

      .af-panel {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        padding: 20px;
        margin-bottom: 14px;
        border: 1px solid #e4e7ec;
        border-radius: 18px;
        background: #fff;
        box-shadow: 0 10px 30px rgba(15, 23, 42, .035);
      }

      .af-panel h2 {
        margin: 0 0 5px;
        font-size: 17px;
        font-weight: 650;
      }

      .af-panel p {
        margin: 0;
        color: #667085;
        font-size: 14px;
      }

      .af-actions {
        display: flex;
        gap: 10px;
        align-items: center;
        flex-wrap: wrap;
      }

      .small-input {
        width: 68px;
        height: 40px;
        padding: 0 10px;
        border: 1px solid #d0d5dd;
        border-radius: 10px;
        text-align: center;
        font-weight: 600;
      }

      .filter {
        display: flex;
        gap: 10px;
        padding: 10px;
        margin-bottom: 14px;
        background: #fff;
        border: 1px solid #e4e7ec;
        border-radius: 16px;
      }

      .filter input {
        flex: 1;
        height: 42px;
        padding: 0 13px;
        border: 1px solid #d0d5dd;
        border-radius: 10px;
        outline: none;
        font-size: 14px;
      }

      .filter select {
        width: 155px;
        padding: 0 12px;
        border: 1px solid #d0d5dd;
        border-radius: 10px;
        background: #fff;
        font-size: 14px;
      }

      .list {
        background: #fff;
        border: 1px solid #e4e7ec;
        border-radius: 18px;
        overflow: hidden;
        box-shadow: 0 10px 30px rgba(15, 23, 42, .035);
      }

      .list-head,
      .list-row {
        display: grid;
        align-items: center;
        gap: 14px;
        padding: 14px 18px;
      }

      .list-head {
        min-height: 46px;
        background: #f9fafb;
        border-bottom: 1px solid #e4e7ec;
        color: #667085;
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: .4px;
      }

      .list-row {
        min-height: 58px;
        border-bottom: 1px solid #f0f2f5;
        font-size: 14px;
      }

      .list-row:last-child {
        border-bottom: 0;
      }

      .codes {
        grid-template-columns: 130px 130px minmax(180px, 1fr) 120px 270px;
      }

      .users {
        grid-template-columns: minmax(170px, 1.2fr) 100px minmax(150px, 1fr) 120px 120px 330px;
      }

      .payments {
        grid-template-columns: minmax(170px, 1fr) 100px 150px 160px 120px 170px;
      }

      .docs {
        grid-template-columns: minmax(190px, 1fr) 100px 150px 150px 110px;
      }

      .errors {
        grid-template-columns: 220px 180px minmax(250px, 1fr);
      }

      .code {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 18px;
        font-weight: 700;
        letter-spacing: 1.2px;
      }

      .small-code {
        font-size: 14px;
      }

      .badge {
        display: inline-flex;
        width: fit-content;
        align-items: center;
        justify-content: center;
        min-height: 25px;
        padding: 0 10px;
        border: 1px solid;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 650;
      }

      .badge.ok {
        background: #ecfdf3;
        border-color: #abefc6;
        color: #067647;
      }

      .badge.bad {
        background: #fef3f2;
        border-color: #fecdca;
        color: #b42318;
      }

      .badge.warn {
        background: #fffaeb;
        border-color: #fedf89;
        color: #b54708;
      }

      .badge.info {
        background: #eff8ff;
        border-color: #b2ddff;
        color: #175cd3;
      }

      .row-actions {
        display: flex;
        gap: 7px;
        flex-wrap: wrap;
      }

      .row-actions button,
      .solo,
      .modal button {
        min-height: 34px;
        padding: 0 11px;
        border: 1px solid #d0d5dd;
        border-radius: 9px;
        background: #fff;
        color: #101828;
        font-size: 12.5px;
        font-weight: 600;
        cursor: pointer;
      }

      .row-actions button:first-child {
        background: #1d4ed8;
        border-color: #1d4ed8;
        color: #fff;
      }

      .row-actions button.danger,
      button.danger {
        background: #b42318;
        border-color: #b42318;
        color: #fff;
      }

      .row-actions button.success,
      button.success {
        background: #067647;
        border-color: #067647;
        color: #fff;
      }

      .empty {
        padding: 34px;
        text-align: center;
        color: #667085;
        font-size: 14px;
      }

      .modal-bg {
        position: fixed;
        inset: 0;
        z-index: 30;
        display: grid;
        place-items: center;
        padding: 22px;
        background: rgba(15, 23, 42, .45);
      }

      .modal {
        width: min(920px, 100%);
        background: #fff;
        border-radius: 20px;
        padding: 24px;
        box-shadow: 0 30px 90px rgba(15, 23, 42, .24);
      }

      .modal-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding-bottom: 16px;
        margin-bottom: 18px;
        border-bottom: 1px solid #e4e7ec;
      }

      .modal-top span {
        display: block;
        color: #1d4ed8;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 1.3px;
        margin-bottom: 5px;
      }

      .modal-top h2 {
        margin: 0;
        font-size: 22px;
        font-weight: 650;
      }

      .detail-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
      }

      .detail {
        padding: 12px;
        border: 1px solid #e4e7ec;
        border-radius: 12px;
        background: #f9fafb;
      }

      .detail span {
        display: block;
        color: #667085;
        font-size: 12px;
        margin-bottom: 4px;
      }

      .detail strong {
        display: block;
        font-size: 13.5px;
        font-weight: 650;
        word-break: break-word;
      }

      .note {
        margin-top: 14px;
        padding: 12px;
        border: 1px solid #b2ddff;
        border-radius: 12px;
        background: #eff8ff;
        color: #175cd3;
      }

      .modal-actions {
        display: flex;
        gap: 8px;
        margin-top: 16px;
      }

      a {
        color: #1d4ed8;
        font-weight: 600;
        text-decoration: none;
      }

      @media (max-width: 1180px) {
        .af-sidebar {
          width: 220px;
        }

        .stats {
          grid-template-columns: repeat(2, minmax(180px, 1fr));
        }

        .list {
          overflow-x: auto;
        }

        .list-head,
        .list-row {
          min-width: 950px;
        }
      }
    `}</style>
  );
}