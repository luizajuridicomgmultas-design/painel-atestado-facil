import React, { useEffect, useMemo, useState, useRef } from "react";
import { 
  LayoutDashboard, KeyRound, Users, CreditCard, FileText, AlertTriangle, 
  RefreshCw, Plus, Download, Search, Edit2, Copy, Lock, Unlock, LogOut, 
  Trash2, X, Check, TrendingUp, ShieldAlert, ShieldCheck, UploadCloud, 
  ExternalLink, Paperclip, Filter, History, AlignLeft, Calendar, Menu, Smartphone
} from "lucide-react";

import { supabase } from "./supabase";

const ADMIN_USER = "atestadofacil";
const ADMIN_PASS = "Admin@2026";

const STATUS = {
  DISPONIVEL: "Disponível",
  ATIVO: "Ativo",
  BLOQUEADO: "Bloqueado",
  VENCIDO: "Vencido",
};

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const VALORES_FATURAMENTO = {
  Assinatura: 29.90,
  Renovação: 29.90,
  Alteração: 5.00,
};

const getRegraRepasse = (clientesAtivos) => {
  const total = Number(clientesAtivos || 0);

  // Regras do repasse:
  // Até 24 clientes ativos: R$10 por assinatura nova.
  // A partir de 25 clientes ativos: R$12 por assinatura nova + R$5 por alteração.
  // A partir de 50 clientes ativos: mantém assinatura/alteração e adiciona R$8 por renovação.
  if (total >= 50) {
    return { assinatura: 12, alteracao: 5, renovacao: 8, faixa: "50+ ativos: assinatura, alteração e renovação" };
  }

  if (total >= 25) {
    return { assinatura: 12, alteracao: 5, renovacao: 0, faixa: "25+ ativos: assinatura e alteração" };
  }

  return { assinatura: 10, alteracao: 0, renovacao: 0, faixa: "Até 24 ativos: R$10 por assinatura" };
};

const isGratuito = (row) => String(row?.pagamento_status || row?.pagamento || "").trim().toLowerCase() === "gratuito";
const isTransacaoPaga = (row) => row?.pago === true || String(row?.pagamento_status || row?.status_pagamento || "").trim().toLowerCase() === "pago";

// Utilitários
const gerarCodigo = () => String(Math.floor(10000 + Math.random() * 90000));
const hojeISO = () => new Date().toISOString().split("T")[0];
const validade90Dias = () => { const d = new Date(); d.setDate(d.getDate() + 90); return d.toISOString().split("T")[0]; };

function formatarData(data) {
  if (!data) return "—";
  try { return new Date(`${data}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }); } catch { return data; }
}

function formatarDataHora(data) {
  if (!data) return "—";
  try { return new Date(data).toLocaleString("pt-BR"); } catch { return data; }
}

const mesISO = (data) => data ? new Date(data).toISOString().slice(0, 7) : "";
const mesLabel = (iso) => {
  if (!iso) return "Todos os meses";
  const [ano, mes] = iso.split("-");
  return new Date(Number(ano), Number(mes) - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
};

const iniciais = (nome) => {
  if (!nome) return "?";
  const partes = String(nome).trim().split(" ").filter(Boolean);
  if (!partes.length) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
};

const statusConfig = {
  [STATUS.ATIVO]: { color: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  [STATUS.BLOQUEADO]: { color: "bg-red-100 text-red-700 border-red-200", dot: "bg-red-500" },
  [STATUS.VENCIDO]: { color: "bg-orange-100 text-orange-700 border-orange-200", dot: "bg-orange-500" },
  [STATUS.DISPONIVEL]: { color: "bg-blue-100 text-blue-700 border-blue-200", dot: "bg-blue-500" },
};

function baixarCSV(nomeArquivo, linhas) {
  const clean = (v) => v === null || v === undefined ? "" : String(v).replace(/\r?\n|\r/g, " ").replace(/"/g, '""');
  if (!linhas.length) linhas = [{ aviso: "Nenhum registro encontrado" }];
  const colunas = Object.keys(linhas[0]);
  const conteudo = [colunas.join(";"), ...linhas.map(l => colunas.map(c => `"${clean(l[c])}"`).join(";"))].join("\n");
  const blob = new Blob(["\ufeff" + conteudo], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a"); link.href = url; link.download = nomeArquivo;
  document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
export default function AdminPanel() {
  const [logado, setLogado] = useState(() => localStorage.getItem("painel_atestado_logado") === "sim");
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [aba, setAba] = useState("Dashboard");
  
  const [usuarios, setUsuarios] = useState([]);
  const [transacoes, setTransacoes] = useState([]);
  const [historicoGlobal, setHistoricoGlobal] = useState([]);
  
  const [busca, setBusca] = useState("");
  const [lote, setLote] = useState(5);
  const [filtroMes, setFiltroMes] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [toast, setToast] = useState(null);
  const [modalDetalhes, setModalDetalhes] = useState(null);
  const [modalBloqueio, setModalBloqueio] = useState(null);
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);

  const aviso = (texto, tipo = "ok") => {
    setToast({ texto, tipo });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => { if (logado) carregar(); }, [logado]);
  useEffect(() => { setBusca(""); setFiltroMes(""); setFiltroStatus(""); setFiltroTipo(""); setMenuMobileAberto(false); }, [aba]);

  useEffect(() => {
    const handler = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function instalarPWA() {
    if (!installPrompt) {
      aviso("No celular, abra pelo navegador e toque em Compartilhar/Adicionar à tela inicial.");
      return;
    }
    installPrompt.prompt();
    await installPrompt.userChoice.catch(() => null);
    setInstallPrompt(null);
  }

  async function carregar() {
    setCarregando(true);
    
    // --- SISTEMA AUTOMÁTICO DE BLOQUEIO POR VENCIMENTO ---
    // Bloqueia contas ativas cuja validade já expirou (passou de 90 dias)
    await supabase.from("usuarios")
      .update({ status: STATUS.BLOQUEADO, bloqueado_motivo: "Vencimento Automático (90 dias excedidos sem renovação)" })
      .lt("validade", hojeISO())
      .eq("status", STATUS.ATIVO);
    
    // Carrega Usuários
    const resUsr = await supabase.from("usuarios").select("*").order("created_at", { ascending: false });
    const listaUsuarios = resUsr.data || [];
    if (resUsr.error) aviso("Erro ao carregar usuários.", "erro");
    else setUsuarios(listaUsuarios);

    // Carrega Faturamento e sincroniza assinaturas novas automaticamente
    const resFat = await supabase.from("faturamento").select("*").order("data", { ascending: false });
    if (!resFat.error) {
      const faturamentoSincronizado = await sincronizarAssinaturasAutomaticas(listaUsuarios, resFat.data || []);
      setTransacoes(faturamentoSincronizado.sort((a, b) => new Date(b.data || b.created_at || 0) - new Date(a.data || a.created_at || 0)));
    }

    // Carrega Histórico
    const resHist = await supabase.from("historico").select("*").order("data", { ascending: false });
    if (!resHist.error) setHistoricoGlobal(resHist.data || []);

    setCarregando(false);
  }

  // --- FUNÇÕES DE REGISTRO DE HISTÓRICO E FATURAMENTO ---
  async function registrarHistorico(usuarioIdentificador, acao, detalhes) {
    // A coluna usuario_id da tabela historico está como bigint no Supabase,
    // mas o id da tabela usuarios é UUID. Para não quebrar o painel, não enviamos usuario_id.
    // O vínculo fica registrado no texto do histórico.
    const detalhesComReferencia = usuarioIdentificador
      ? `${detalhes} | Ref: ${usuarioIdentificador}`
      : detalhes;

    const { error } = await supabase
      .from("historico")
      .insert([{ acao, detalhes: detalhesComReferencia, data: new Date().toISOString() }]);

    if (error) console.warn("Histórico não registrado:", error);
  }

  async function registrarFaturamento(row, tipo, valor, data = new Date().toISOString()) {
    const { error } = await supabase.from("faturamento").insert([{
      codigo: row.codigo,
      nome: row.nome || "Cliente sem nome",
      tipo,
      valor,
      data,
      pago: false,
    }]);

    if (error) {
      console.error(`Erro ao lançar faturamento (${tipo}):`, error);
      aviso(`Erro ao lançar ${tipo} no faturamento.`, "erro");
      return false;
    }

    return true;
  }

  async function sincronizarAssinaturasAutomaticas(listaUsuarios, listaTransacoes) {
    const transacoesAtuais = listaTransacoes || [];

    const jaFaturadosPorCodigo = new Set(
      transacoesAtuais
        .filter(t => t.tipo === "Assinatura" && t.codigo)
        .map(t => String(t.codigo))
    );

    const usuariosParaFaturar = (listaUsuarios || []).filter(u =>
      u.id &&
      u.codigo &&
      u.nome &&
      u.status === STATUS.ATIVO &&
      !isGratuito(u) &&
      !jaFaturadosPorCodigo.has(String(u.codigo))
    );

    if (!usuariosParaFaturar.length) return transacoesAtuais;

    const novosLancamentos = [];
    const erros = [];

    for (const u of usuariosParaFaturar) {
      const lancamento = {
        codigo: u.codigo,
        nome: u.nome,
        tipo: "Assinatura",
        valor: VALORES_FATURAMENTO.Assinatura,
        data: u.usado_em || u.created_at || new Date().toISOString(),
        pago: false,
      };

      // Sem usuario_id: na sua tabela faturamento esse campo está como bigint,
      // mas o id de usuarios é UUID. Por isso o Supabase retornava erro 22P02.
      // Usamos o codigo como vínculo para evitar quebrar o insert.
      const { error } = await supabase.from("faturamento").insert([lancamento]);

      if (error) {
        console.error("Erro ao sincronizar assinatura:", { usuario: u, lancamento, error });
        erros.push({ usuario: u, error });
      } else {
        novosLancamentos.push({ ...lancamento, id: `local-${u.id}-${Date.now()}` });
        await registrarHistorico(u.id, "Assinatura", "Cliente ativo sincronizado no faturamento. Faturado R$ 29,90.");
      }
    }

    if (erros.length) {
      aviso(`${erros.length} assinatura(s) não foram lançadas. Veja o console.`, "erro");
    }

    if (novosLancamentos.length) {
      aviso(`${novosLancamentos.length} assinatura(s) sincronizada(s) no faturamento.`);
    }

    return [...novosLancamentos, ...transacoesAtuais];
  }

  const entrar = (e) => {
    e.preventDefault();
    if (login === ADMIN_USER && senha === ADMIN_PASS) {
      localStorage.setItem("painel_atestado_logado", "sim");
      setLogado(true);
    } else aviso("Login inválido.", "erro");
  };

  const sair = () => { localStorage.removeItem("painel_atestado_logado"); setLogado(false); };

  async function gerarNovoCodigo() {
    setGerando(true);
    for (let i = 0; i < 12; i++) {
      const codigo = gerarCodigo();
      const { error } = await supabase.from("usuarios").insert([{ codigo, status: STATUS.DISPONIVEL, sistema: "" }]);
      if (!error) {
        await carregar();
        await navigator.clipboard?.writeText(codigo).catch(() => {});
        setGerando(false);
        aviso(`Código ${codigo} gerado e copiado.`);
        return;
      }
      if (!String(error.message || "").toLowerCase().includes("duplicate")) break;
    }
    setGerando(false);
    aviso("Erro ao gerar código.", "erro");
  }

  async function gerarLote() {
    const qtd = Math.max(1, Math.min(Number(lote) || 1, 100));
    setGerando(true);
    const codigos = new Set();
    while (codigos.size < qtd) codigos.add(gerarCodigo());
    const registros = [...codigos].map(codigo => ({ codigo, status: STATUS.DISPONIVEL, sistema: "" }));
    const { error } = await supabase.from("usuarios").insert(registros);
    setGerando(false);
    if (error) return aviso("Erro ao gerar lote.", "erro");
    await carregar();
    aviso(`${qtd} códigos gerados.`);
  }

  const copiarCodigo = async (codigo) => { await navigator.clipboard?.writeText(codigo).catch(() => {}); aviso(`Código ${codigo} copiado.`); };

  async function bloquear(row, motivo) {
    const motivoFinal = motivo || "Bloqueio manual";
    const { error } = await supabase.from("usuarios").update({ status: STATUS.BLOQUEADO, bloqueado_motivo: motivoFinal }).eq("id", row.id);
    if (error) return aviso("Erro ao bloquear.", "erro");
    
    await registrarHistorico(row.id, "Bloqueio de Acesso", `Motivo: ${motivoFinal}`);
    
    setModalBloqueio(null); await carregar(); aviso("Licença bloqueada.");
    if(modalDetalhes && modalDetalhes.id === row.id) setModalDetalhes({...row, status: STATUS.BLOQUEADO, bloqueado_motivo: motivoFinal});
  }

  async function desbloquear(row) {
    const novoStatus = row.nome ? STATUS.ATIVO : STATUS.DISPONIVEL;
    const { error } = await supabase.from("usuarios").update({ status: novoStatus, bloqueado_motivo: null }).eq("id", row.id);
    if (error) return aviso("Erro ao desbloquear.", "erro");

    await registrarHistorico(row.id, "Desbloqueio de Acesso", `Status alterado para ${novoStatus}`);

    await carregar(); aviso("Licença desbloqueada.");
    if(modalDetalhes && modalDetalhes.id === row.id) setModalDetalhes({...row, status: novoStatus, bloqueado_motivo: null});
  }

  async function alternarGratuito(row) {
    const tornarGratuito = !isGratuito(row);
    const novoPagamentoStatus = tornarGratuito ? "Gratuito" : "Pendente";

    const { error } = await supabase
      .from("usuarios")
      .update({ pagamento_status: novoPagamentoStatus })
      .eq("id", row.id);

    if (error) {
      console.error("Erro ao atualizar gratuidade:", error);
      return aviso("Erro ao atualizar gratuidade.", "erro");
    }

    if (tornarGratuito && row.codigo) {
      const { error: deleteError } = await supabase
        .from("faturamento")
        .delete()
        .eq("codigo", row.codigo);

      if (deleteError) {
        console.warn("Não foi possível remover faturamento do cliente gratuito:", deleteError);
        aviso("Cliente marcado como gratuito, mas confira o faturamento.", "erro");
      }
    }

    await registrarHistorico(row.id, "Gratuidade", tornarGratuito ? "Cliente marcado como gratuito. Cobranças removidas e novos lançamentos não serão faturados." : "Cliente voltou para cobrança normal.");
    await carregar();

    const rowAtualizada = { ...row, pagamento_status: novoPagamentoStatus };
    if (modalDetalhes && modalDetalhes.id === row.id) setModalDetalhes(rowAtualizada);

    aviso(tornarGratuito ? "Cliente marcado como de graça. Não entrará no faturamento." : "Cliente voltou para cobrança normal.");
  }

  async function alternarPagamentoLancamento(row) {
    const novoStatusPago = !isTransacaoPaga(row);
    const { error } = await supabase
      .from("faturamento")
      .update({ pago: novoStatusPago })
      .eq("id", row.id);

    if (error) {
      console.error("Erro ao atualizar pagamento:", error);
      return aviso("Erro ao atualizar pagamento. Confira se a coluna 'pago' existe no Supabase.", "erro");
    }

    await carregar();
    aviso(novoStatusPago ? "Pagamento marcado como pago." : "Pagamento marcado como pendente.");
  }

  async function renovar(row) {
    const novaValidade = validade90Dias();
    const { error } = await supabase.from("usuarios").update({ status: STATUS.ATIVO, validade: novaValidade, renovado_em: new Date().toISOString(), bloqueado_motivo: null }).eq("id", row.id);
    if (error) return aviso("Erro ao renovar.", "erro");
    
    const faturado = await registrarFaturamento(row, "Renovação", VALORES_FATURAMENTO.Renovação);

    await registrarHistorico(row.id, "Renovação", `Validade estendida para ${formatarData(novaValidade)}. ${faturado ? "Lançado no faturamento como pendente." : "Faturamento não registrado."}`);

    await carregar(); aviso(faturado ? `Renovado! Lançado no faturamento como pendente.` : `Renovado, mas confira o faturamento.`);
    if(modalDetalhes && modalDetalhes.id === row.id) setModalDetalhes({...row, status: STATUS.ATIVO, validade: novaValidade});
  }

  async function salvarEdicao(row, dados) {
    const isObservacaoOnly = (dados.observacoes !== row.observacoes) && (dados.nome === row.nome && dados.email === row.email && dados.telefone === row.telefone && dados.cpf === row.cpf);
    
    const { error } = await supabase.from("usuarios").update(dados).eq("id", row.id);
    if (error) return aviso("Erro ao salvar dados.", "erro");
    
    // Só cobra R$ 5,00 se alterar dados cadastrais (nome, doc, etc). Apenas mudar observação não cobra.
    if (!isObservacaoOnly) {
      const faturado = await registrarFaturamento({ ...row, nome: dados.nome || row.nome }, "Alteração", VALORES_FATURAMENTO.Alteração);
      await registrarHistorico(row.id, "Edição de Cadastro", `Dados atualizados. ${faturado ? "Lançado no faturamento como pendente." : "Faturamento não registrado."}`);
      aviso(faturado ? "Dados atualizados! Cobrança lançada como pendente." : "Dados atualizados, mas confira o faturamento.");
    } else {
      await registrarHistorico(row.id, "Edição de Observação", `Observações atualizadas.`);
      aviso("Observações salvas com sucesso!");
    }

    await carregar();
    setModalDetalhes(null);
  }

  async function deletarRegistro(id) {
    if(!window.confirm("Tem certeza que deseja excluir esta licença permanentemente?")) return;
    const { error } = await supabase.from("usuarios").delete().eq("id", id);
    if (error) return aviso("Erro ao deletar.", "erro");
    await carregar(); aviso("Registro excluído.");
  }

  async function anexarComprovante(transacaoId, file) {
    aviso("Anexando comprovante...");
    setTimeout(async () => {
      const fakeUrl = URL.createObjectURL(file);
      await supabase.from("faturamento").update({ comprovante_url: fakeUrl }).eq("id", transacaoId);
      await carregar();
      aviso("Comprovante anexado com sucesso!");
    }, 1000);
  }

  const stats = useMemo(() => {
    const ativo = usuarios.filter(u => u.status === STATUS.ATIVO).length;
    const livre = usuarios.filter(u => u.status === STATUS.DISPONIVEL).length;
    const vencido = usuarios.filter(u => u.status === STATUS.VENCIDO).length;
    const bloqueado = usuarios.filter(u => u.status === STATUS.BLOQUEADO).length;
    const clientes = usuarios.filter(u => u.nome).length;
    const erros = usuarios.filter(u => u.ultimo_erro).length;
    const totalEnvios = usuarios.reduce((acc, u) => acc + Number(u.total_envios || 0), 0);
    
    let totalReceita = 0, valAssinaturas = 0, valRenovacoes = 0, valAlteracoes = 0;
    let qtdAssinaturas = 0, qtdRenovacoes = 0, qtdAlteracoes = 0;
    const transacoesPagas = transacoes.filter(isTransacaoPaga);
    transacoesPagas.forEach(t => {
      totalReceita += Number(t.valor || 0);
      if (t.tipo === "Assinatura") { valAssinaturas += Number(t.valor || 0); qtdAssinaturas += 1; }
      if (t.tipo === "Renovação") { valRenovacoes += Number(t.valor || 0); qtdRenovacoes += 1; }
      if (t.tipo === "Alteração") { valAlteracoes += Number(t.valor || 0); qtdAlteracoes += 1; }
    });

    const regraRepasse = getRegraRepasse(ativo);
    const repasseAssinaturas = qtdAssinaturas * regraRepasse.assinatura;
    const repasseAlteracoes = qtdAlteracoes * regraRepasse.alteracao;
    const repasseRenovacoes = qtdRenovacoes * regraRepasse.renovacao;
    const totalRepasse = repasseAssinaturas + repasseAlteracoes + repasseRenovacoes;

    return {
      total: usuarios.length,
      ativo,
      livre,
      vencido,
      bloqueado,
      clientes,
      erros,
      totalEnvios,
      totalReceita,
      valAssinaturas,
      valRenovacoes,
      valAlteracoes,
      qtdAssinaturas,
      qtdRenovacoes,
      qtdAlteracoes,
      regraRepasse,
      repasseAssinaturas,
      repasseAlteracoes,
      repasseRenovacoes,
      totalRepasse,
      receitaLiquida: totalReceita - totalRepasse,
    };
  }, [usuarios, transacoes]);

  const meses = useMemo(() => {
    const list = aba === "Faturamento" ? transacoes.map(t => mesISO(t.data)) : usuarios.map(u => mesISO(u.created_at));
    return [...new Set(list.filter(Boolean))].sort().reverse();
  }, [usuarios, transacoes, aba]);

  const listaTabela = useMemo(() => {
    const termo = busca.toLowerCase().trim();
    
    if (aba === "Faturamento") {
      return transacoes.filter(t => {
        const texto = `${t.codigo || ""} ${t.nome || ""} ${t.tipo || ""}`.toLowerCase();
        const matchBusca = !termo || texto.includes(termo);
        const matchMes = !filtroMes || mesISO(t.data) === filtroMes;
        const matchTipo = !filtroTipo || t.tipo === filtroTipo;
        return matchBusca && matchMes && matchTipo;
      });
    }

    return usuarios.filter((u) => {
      const texto = `${u.codigo || ""} ${u.nome || ""} ${u.email || ""} ${u.telefone || ""} ${u.cpf || ""}`.toLowerCase();
      const matchBusca = !termo || texto.includes(termo);
      const matchMes = !filtroMes || mesISO(u.created_at) === filtroMes;
      const matchStatus = !filtroStatus || u.status === filtroStatus;
      
      if (aba === "Clientes" || aba === "Documentos") return matchBusca && matchMes && !!u.nome;
      if (aba === "Erros") return matchBusca && matchMes && !!u.ultimo_erro;
      return matchBusca && matchMes && matchStatus;
    });
  }, [usuarios, transacoes, busca, aba, filtroMes, filtroStatus, filtroTipo]);

  const exportarAtual = () => {
    const nome = aba.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    baixarCSV(`${nome}_${filtroMes || "todos"}_${new Date().toISOString().slice(0, 10)}.csv`, listaTabela);
    aviso("CSV exportado com sucesso.");
  };

  if (!logado) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <form className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-8" onSubmit={entrar}>
          <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-blue-600/20">
            <ShieldCheck className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Atestado Fácil</h1>
          <p className="text-slate-500 mb-8">Acesse o painel administrativo</p>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1">Usuário</label>
              <input className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={login} onChange={e => setLogin(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1">Senha</label>
              <input type="password" className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={senha} onChange={e => setSenha(e.target.value)} />
            </div>
            <button type="submit" className="w-full h-11 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors shadow-md">
              Entrar no sistema
            </button>
          </div>
        </form>
        {toast && <Toast toast={toast} />}
      </div>
    );
  }

  const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, id: "Dashboard" },
    { label: "Licenças", icon: KeyRound, id: "Licenças", badge: stats.total },
    { label: "Clientes", icon: Users, id: "Clientes", badge: stats.clientes },
    { label: "Faturamento", icon: CreditCard, id: "Faturamento" },
    { type: "divider", label: "Sistema" },
    { label: "Documentos", icon: FileText, id: "Documentos" },
    { label: "Log de Erros", icon: AlertTriangle, id: "Erros", badge: stats.erros },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-800 font-sans">
      {menuMobileAberto && <div className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden" onClick={() => setMenuMobileAberto(false)} />}
      <aside className={`${menuMobileAberto ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 fixed lg:sticky z-40 top-0 left-0 w-72 sm:w-64 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 h-screen border-r border-slate-800 transition-transform duration-300`}>
        <div className="h-20 flex items-center gap-3 px-6 border-b border-slate-800/50">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-blue-600/20">
            <ShieldCheck size={22} />
          </div>
          <div>
            <strong className="block text-white font-bold tracking-wide">Atestado Fácil</strong>
            <span className="text-xs text-slate-500 font-medium">Painel Admin</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          {navItems.map((item, i) => {
            if (item.type === "divider") return <div key={i} className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-6 mb-2 px-3">{item.label}</div>;
            const active = aba === item.id;
            return (
              <button key={item.id} onClick={() => setAba(item.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${active ? "bg-blue-600 text-white shadow-md shadow-blue-600/10" : "hover:bg-slate-800 hover:text-white"}`}>
                <item.icon size={18} className={active ? "text-white" : "text-slate-400"} />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] ${active ? "bg-blue-500 text-white" : "bg-slate-800 text-slate-300"}`}>{item.badge}</span>
                )}
              </button>
            );
          })}
          <button onClick={carregar} className="w-full flex items-center gap-3 px-3 py-2.5 mt-2 rounded-lg text-sm font-semibold text-slate-400 hover:bg-slate-800 hover:text-white transition-all">
            <RefreshCw size={18} className={carregando ? "animate-spin" : ""} /> {carregando ? "Sincronizando..." : "Sincronizar Dados"}
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800/50">
          <button onClick={sair} className="w-full flex items-center gap-3 px-4 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors text-left group">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white text-xs font-bold">AD</div>
            <div className="flex-1">
              <strong className="block text-white text-sm">Administrador</strong>
              <span className="text-xs text-slate-400">Encerrar sessão</span>
            </div>
            <LogOut size={16} className="text-slate-500 group-hover:text-white" />
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden lg:ml-0">
        <header className="min-h-16 lg:h-20 bg-white border-b border-slate-200 flex items-center justify-between gap-3 px-4 lg:px-8 sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setMenuMobileAberto(true)} className="lg:hidden w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Menu size={22} />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl lg:text-2xl font-bold text-slate-800 flex items-center gap-2 truncate">{aba}</h1>
              <p className="hidden sm:block text-sm text-slate-500 font-medium truncate">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })} · {carregando ? "Sincronizando..." : "Atualizado agora"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 lg:gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-100">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Sistema Online
            </div>
            <button onClick={instalarPWA} className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-3 lg:px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all">
              <Smartphone size={16} /> <span className="hidden sm:inline">Instalar</span>
            </button>
            <button onClick={gerarNovoCodigo} disabled={gerando} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 lg:px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all">
              <Plus size={16} /> <span className="hidden sm:inline">{gerando ? "Gerando..." : "Nova Licença"}</span><span className="sm:hidden">Nova</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {aba === "Dashboard" && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Kpi title="Total de Licenças" value={stats.total} sub={`${stats.livre} disponíveis`} icon={KeyRound} color="blue" />
                  <Kpi title="Licenças Ativas" value={stats.ativo} sub="Em uso no momento" icon={Users} color="emerald" />
                  <Kpi title="Receita (Pago)" value={money.format(stats.totalReceita)} sub="Faturamento total" icon={CreditCard} color="amber" />
                  <Kpi title="Repasse Calculado" value={money.format(stats.totalRepasse)} sub={stats.regraRepasse.faixa} icon={TrendingUp} color="emerald" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h2 className="text-lg font-bold text-slate-800">Acesso Rápido</h2>
                        <p className="text-sm text-slate-500">Navegue pelas principais funções do sistema</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <ActionCard title="Gerenciar Licenças" desc="Copiar, renovar e bloquear" icon={KeyRound} color="blue" onClick={() => setAba("Licenças")} />
                      <ActionCard title="Ver Clientes" desc="Dados de contato e notas" icon={Users} color="emerald" onClick={() => setAba("Clientes")} />
                      <ActionCard title="Faturamento" desc="Comprovantes e receitas" icon={CreditCard} color="amber" onClick={() => setAba("Faturamento")} />
                      <ActionCard title="Documentos & Erros" desc="Termos e logs" icon={FileText} color="red" onClick={() => setAba("Documentos")} />
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-800 mb-6">Resumo Geral</h2>
                    <div className="space-y-4">
                      <ProgressBar label="Ativos" value={stats.ativo} total={stats.total} color="bg-emerald-500" />
                      <ProgressBar label="Disponíveis" value={stats.livre} total={stats.total} color="bg-blue-500" />
                      <ProgressBar label="Vencidos" value={stats.vencido} total={stats.total} color="bg-orange-500" />
                      <ProgressBar label="Bloqueados" value={stats.bloqueado} total={stats.total} color="bg-red-500" />
                    </div>
                  </div>
                </div>
              </>
            )}

            {aba === "Licenças" && (
              <>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 lg:p-6 shadow-sm flex flex-col md:flex-row md:items-center gap-6 justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600"><KeyRound size={24} /></div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-800">Geração em Lote</h2>
                      <p className="text-sm text-slate-500">Crie múltiplos códigos de acesso de uma só vez</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-semibold text-slate-600">Quantidade:</span>
                    <input type="number" min="1" max="100" value={lote} onChange={(e) => setLote(e.target.value)} className="w-20 h-10 border border-slate-200 rounded-lg text-center font-bold outline-none focus:border-blue-500" />
                    <button onClick={gerarLote} disabled={gerando} className="h-10 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-sm transition-colors">
                      Gerar Lote
                    </button>
                  </div>
                </div>
                <TableCard 
                  title="Todas as Licenças" 
                  rows={listaTabela} search={busca} setSearch={setBusca} meses={meses} filtroMes={filtroMes} setFiltroMes={setFiltroMes} filtroStatus={filtroStatus} setFiltroStatus={setFiltroStatus} 
                  actions={{ copiarCodigo, renovar, abrirDetalhes: setModalDetalhes, abrirBloqueio: setModalBloqueio, desbloquear, deletar: deletarRegistro }} 
                  onExportar={exportarAtual} mode="licencas"
                />
              </>
            )}

            {aba === "Clientes" && (
              <TableCard title="Clientes Cadastrados" subtitle="Visualização focada nos usuários do app" rows={listaTabela} search={busca} setSearch={setBusca} meses={meses} filtroMes={filtroMes} setFiltroMes={setFiltroMes} filtroStatus={filtroStatus} setFiltroStatus={setFiltroStatus}
                actions={{ copiarCodigo, renovar, abrirDetalhes: setModalDetalhes, abrirBloqueio: setModalBloqueio, desbloquear, deletar: deletarRegistro }} 
                onExportar={exportarAtual} mode="clientes"
              />
            )}

            {aba === "Faturamento" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-5 text-white shadow-md col-span-1 md:col-span-2">
                    <span className="text-blue-100 text-sm font-bold uppercase tracking-wider">Receita Total Confirmada</span>
                    <strong className="block text-4xl font-black mt-2">{money.format(stats.totalReceita)}</strong>
                    <p className="text-blue-200 text-sm mt-1">Somente pagamentos marcados como ON entram na receita.</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-center">
                    <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Repasse calculado</span>
                    <strong className="block text-2xl font-black text-slate-800 mt-1">{money.format(stats.totalRepasse)}</strong>
                    <span className="text-xs font-bold text-slate-400 mt-1">{stats.regraRepasse.faixa}</span>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-center">
                    <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Receita líquida</span>
                    <strong className="block text-2xl font-black text-slate-800 mt-1">{money.format(stats.receitaLiquida)}</strong>
                    <span className="text-xs font-bold text-slate-400 mt-1">Após repasse</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Assinaturas novas</span>
                    <strong className="block text-2xl font-black text-slate-800 mt-1">{money.format(stats.valAssinaturas)}</strong>
                    <p className="text-xs font-bold text-slate-400 mt-1">{stats.qtdAssinaturas} x repasse {money.format(stats.regraRepasse.assinatura)}</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Alterações</span>
                    <strong className="block text-2xl font-black text-slate-800 mt-1">{money.format(stats.valAlteracoes)}</strong>
                    <p className="text-xs font-bold text-slate-400 mt-1">{stats.qtdAlteracoes} x repasse {money.format(stats.regraRepasse.alteracao)}</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Renovações</span>
                    <strong className="block text-2xl font-black text-slate-800 mt-1">{money.format(stats.valRenovacoes)}</strong>
                    <p className="text-xs font-bold text-slate-400 mt-1">{stats.qtdRenovacoes} x repasse {money.format(stats.regraRepasse.renovacao)}</p>
                  </div>
                </div>
                <TableCard 
                  title="Histórico de Cobranças" subtitle="Registros de pagamentos, com opção de anexo de comprovante." simple mode="faturamento" 
                  rows={listaTabela} meses={meses} filtroMes={filtroMes} setFiltroMes={setFiltroMes} filtroTipo={filtroTipo} setFiltroTipo={setFiltroTipo} 
                  search={busca} setSearch={setBusca} onExportar={exportarAtual} actions={{ anexarComprovante, alternarPagamentoLancamento }} 
                />
              </div>
            )}

            {(aba === "Documentos" || aba === "Erros") && (
              <TableCard title={aba} subtitle={aba === "Documentos" ? "Acesse os PDFs de termos gerados pelo app." : "Log de problemas."} simple mode={aba.toLowerCase()} rows={listaTabela} meses={meses} filtroMes={filtroMes} setFiltroMes={setFiltroMes} search={busca} setSearch={setBusca} onExportar={exportarAtual} />
            )}

          </div>
        </div>
      </main>

      {toast && <Toast toast={toast} />}
      {modalDetalhes && <DetailsModal row={modalDetalhes} historico={historicoGlobal.filter(h => h.usuario_id === modalDetalhes.id || String(h.detalhes || "").includes(String(modalDetalhes.id)))} onClose={() => setModalDetalhes(null)} onRenovar={renovar} onBloquear={setModalBloqueio} onDesbloquear={desbloquear} onSalvar={salvarEdicao} />}
      {modalBloqueio && <BlockModal row={modalBloqueio} onClose={() => setModalBloqueio(null)} onConfirm={bloquear} />}
    </div>
  );
}

// ============================================================================
// COMPONENTES SECUNDÁRIOS & UI
// ============================================================================

function Kpi({ title, value, sub, icon: Icon, color }) {
  const colors = { blue: "bg-blue-50 text-blue-600 border-blue-100", emerald: "bg-emerald-50 text-emerald-600 border-emerald-100", amber: "bg-amber-50 text-amber-600 border-amber-100", red: "bg-red-50 text-red-600 border-red-100" };
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group hover:border-slate-300 transition-all">
      <div className="flex justify-between items-start"><span className="text-slate-500 font-semibold text-sm">{title}</span><div className={`p-2 rounded-lg ${colors[color]}`}><Icon size={20} /></div></div>
      <strong className="block text-3xl font-black text-slate-800 mt-4 mb-1">{value}</strong><p className="text-xs font-semibold text-slate-400">{sub}</p>
    </div>
  );
}

function ActionCard({ title, desc, icon: Icon, color, onClick }) {
  const colors = { blue: "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white", emerald: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white", amber: "bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white", red: "bg-red-50 text-red-600 group-hover:bg-red-600 group-hover:text-white" };
  return (
    <button onClick={onClick} className="text-left p-4 rounded-xl border border-slate-100 hover:border-slate-300 bg-slate-50/50 hover:bg-white transition-all group shadow-sm hover:shadow">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-colors ${colors[color]}`}><Icon size={20} /></div>
      <strong className="block text-slate-800 font-bold">{title}</strong><span className="block text-slate-500 text-xs mt-1">{desc}</span>
    </button>
  );
}

function ProgressBar({ label, value, total, color }) {
  const pct = Math.min(100, (value / Math.max(total, 1)) * 100);
  return (
    <div>
      <div className="flex justify-between text-xs font-bold mb-1.5"><span className="text-slate-600">{label}</span><span className="text-slate-800">{value}</span></div>
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden"><div className={`h-full ${color} rounded-full transition-all duration-1000`} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

function FileUploader({ transacaoId, comprovanteUrl, onUpload }) {
  const fileRef = useRef(null);
  if (comprovanteUrl) {
    return (
      <a href={comprovanteUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg transition-colors">
        <ExternalLink size={14} /> Ver Comprovante
      </a>
    );
  }
  return (
    <>
      <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 hover:border-slate-400 text-slate-600 text-xs font-bold rounded-lg transition-colors">
        <Paperclip size={14} /> Anexar
      </button>
      <input type="file" ref={fileRef} className="hidden" accept="image/*,application/pdf" onChange={(e) => {
        if (e.target.files?.[0]) onUpload(transacaoId, e.target.files[0]);
      }} />
    </>
  );
}

function TableCard({ title, subtitle, rows, search, setSearch, meses, filtroMes, setFiltroMes, filtroStatus, setFiltroStatus, filtroTipo, setFiltroTipo, actions, simple, mode, onExportar }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
      <div className="p-4 lg:p-6 border-b border-slate-100 flex flex-col lg:flex-row justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
        </div>
        
        {/* Nova Área de Filtros Aprimorada */}
        <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-stretch sm:items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-100 w-full lg:w-auto">
          <div className="flex items-center gap-2 px-2 text-slate-400">
            <Filter size={16} />
          </div>
          
          <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)} className="h-10 sm:h-9 px-3 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 outline-none focus:border-blue-500 bg-white shadow-sm cursor-pointer w-full sm:w-auto">
            <option value="">Todos os meses</option>
            {meses?.map(m => <option key={m} value={m}>{mesLabel(m)}</option>)}
          </select>
          
          {setFiltroStatus && (
            <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="h-10 sm:h-9 px-3 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 outline-none focus:border-blue-500 bg-white shadow-sm cursor-pointer w-full sm:w-auto">
              <option value="">Status: Todos</option>
              {Object.values(STATUS).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}

          {mode === 'faturamento' && setFiltroTipo && (
            <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="h-10 sm:h-9 px-3 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 outline-none focus:border-blue-500 bg-white shadow-sm cursor-pointer w-full sm:w-auto">
              <option value="">Tipo: Todos</option>
              <option value="Assinatura">Assinatura</option>
              <option value="Alteração">Alteração</option>
              <option value="Renovação">Renovação</option>
            </select>
          )}

          <div className="w-px h-6 bg-slate-200 mx-1"></div>

          <button onClick={onExportar} className="h-10 sm:h-9 px-4 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-sm w-full sm:w-auto">
            <Download size={14} /> Exportar CSV
          </button>
        </div>
      </div>

      <div className="px-4 lg:px-6 py-4 bg-slate-50/50 border-b border-slate-100">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por código, nome, e-mail..." className="w-full h-11 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-sm" />
        </div>
      </div>

      <div className="overflow-x-auto -mx-1 sm:mx-0">
        <table className="w-full min-w-[760px] text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-xs uppercase tracking-wider font-bold text-slate-500 border-b border-slate-200">
              {simple ? (
                <>
                  <th className="px-6 py-4">Cliente / Info</th>
                  <th className="px-6 py-4">Código</th>
                  {mode === 'faturamento' && <th className="px-6 py-4">Tipo & Valor</th>}
                  <th className="px-6 py-4">Data</th>
                  {(mode === 'faturamento' || mode === 'documentos') && <th className="px-6 py-4">Ação / Arquivo</th>}
                </>
              ) : (
                <>
                  <th className="px-6 py-4">Código</th>
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Usos</th>
                  <th className="px-6 py-4">Validade</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400 font-medium">Nenhum registro encontrado.</td></tr>
            ) : rows.map(row => (
              <tr key={row.id} className="hover:bg-slate-50/80 transition-colors group">
                {simple ? (
                  <>
                    <td className="px-6 py-4">
                      <strong className="block text-slate-800 text-sm">{row.nome || "Não vinculado"}</strong>
                      <span className="text-xs text-slate-500 truncate block max-w-[250px]">
                        {mode === "erros" ? row.ultimo_erro : mode === "documentos" ? (row.email || row.telefone) : (row.email || row.telefone || "Lançamento Faturamento")}
                      </span>
                    </td>
                    <td className="px-6 py-4"><span className="font-mono text-sm font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">{row.codigo}</span></td>
                    
                    {mode === 'faturamento' && (
                      <td className="px-6 py-4">
                        <strong className="block text-sm text-slate-800">{money.format(row.valor)}</strong>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${row.tipo === 'Alteração' ? 'bg-amber-100 text-amber-700' : row.tipo === 'Renovação' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{row.tipo}</span>
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${isTransacaoPaga(row) ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{isTransacaoPaga(row) ? 'Pago' : 'Pendente'}</span>
                        </div>
                      </td>
                    )}
                    
                    <td className="px-6 py-4 text-sm text-slate-600">{formatarDataHora(row.created_at || row.data)}</td>
                    
                    {mode === 'faturamento' && (
                      <td className="px-6 py-4">
                        {(() => {
                          const pago = isTransacaoPaga(row);
                          return (
                            <div className="flex flex-wrap items-center justify-end gap-3">
                              <FileUploader transacaoId={row.id} comprovanteUrl={row.comprovante_url} onUpload={actions.anexarComprovante} />
                              <button
                                type="button"
                                onClick={() => actions.alternarPagamentoLancamento?.(row)}
                                className="rounded-xl transition-all hover:scale-[1.01]"
                                title={pago ? "Pago" : "Pendente"}
                              >
                                <span className={`relative inline-flex h-8 w-16 items-center rounded-full p-1 transition-all duration-300 shadow-inner ${pago ? "bg-gradient-to-r from-lime-500 to-green-500" : "bg-slate-300"}`}>
                                  <span className={`absolute left-3 text-[10px] font-black text-white transition-opacity ${pago ? "opacity-100" : "opacity-0"}`}>ON</span>
                                  <span className={`absolute right-2 text-[9px] font-black text-slate-500 transition-opacity ${pago ? "opacity-0" : "opacity-100"}`}>OFF</span>
                                  <span className={`inline-block h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-300 ${pago ? "translate-x-8" : "translate-x-0"}`} />
                                </span>
                              </button>
                            </div>
                          );
                        })()}
                      </td>
                    )}

                    {mode === 'documentos' && (
                      <td className="px-6 py-4">
                        {row.termos_pdf ? (
                          <button onClick={() => window.open(row.termos_pdf, "_blank")} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg transition-colors">
                            <FileText size={14} /> Abrir PDF
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Sem documento</span>
                        )}
                      </td>
                    )}
                  </>
                ) : (
                  <>
                    <td className="px-6 py-4">
                      <span className="font-mono text-[15px] tracking-wide font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">{row.codigo}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm border border-slate-200 flex-shrink-0">
                          {iniciais(row.nome)}
                        </div>
                        <div>
                          <strong className="block text-slate-800 text-sm">{row.nome || "Aguardando vínculo"}</strong>
                          <span className="block text-slate-500 text-xs mt-0.5">{row.email || row.telefone || "—"}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${statusConfig[row.status]?.color || "bg-slate-100"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusConfig[row.status]?.dot || "bg-slate-400"}`}></span>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center justify-center min-w-10 px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-black border border-indigo-100">
                        {Number(row.total_envios || 0)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-600">{formatarData(row.validade)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-50 md:group-hover:opacity-100 transition-opacity">
                        <button onClick={() => actions.abrirDetalhes(row)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors" title="Ver / Editar Detalhes">
                          <Edit2 size={15} />
                        </button>
                        <button onClick={() => actions.copiarCodigo(row.codigo)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors" title="Copiar Código">
                          <Copy size={15} />
                        </button>
                        {row.status === STATUS.BLOQUEADO ? (
                          <button onClick={() => actions.desbloquear(row)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-colors" title="Desbloquear">
                            <Unlock size={15} />
                          </button>
                        ) : (
                          <button onClick={() => actions.abrirBloqueio(row)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-colors" title="Bloquear">
                            <Lock size={15} />
                          </button>
                        )}
                        <button onClick={() => actions.deletar(row.id)} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors" title="Excluir Permanentemente">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-4 border-t border-slate-100 bg-slate-50 text-xs font-bold text-slate-500">
        Total: {rows.length} registros listados.
      </div>
    </div>
  );
}

function DetailsModal({ row, historico, onClose, onRenovar, onBloquear, onDesbloquear, onSalvar }) {
  const [abaModal, setAbaModal] = useState("dados"); // 'dados' ou 'historico'
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ 
    nome: row.nome || "", 
    email: row.email || "", 
    telefone: row.telefone || "", 
    cpf: row.cpf || "",
    observacoes: row.observacoes || ""
  });

  const statsList = [
    { label: "Status", value: row.status },
    { label: "Pagamento", value: row.pagamento_status || "Normal" },
    { label: "Validade", value: formatarData(row.validade) },
    { label: "Criado em", value: formatarDataHora(row.created_at) },
    { label: "Usado em", value: formatarDataHora(row.usado_em) },
    { label: "Formulários enviados", value: Number(row.total_envios || 0) },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Cabeçalho */}
        <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-start bg-slate-50">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-xs font-black text-blue-600 uppercase tracking-wider bg-blue-100 px-2 py-0.5 rounded-md">Licença</span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusConfig[row.status]?.color || "bg-slate-100"}`}>
                {row.status}
              </span>
            </div>
            <h2 className="text-2xl font-black text-slate-800 font-mono tracking-wide">{row.codigo}</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
        </div>
        
        {/* Navegação Interna do Modal */}
        <div className="flex px-6 border-b border-slate-200 bg-white">
          <button onClick={() => setAbaModal('dados')} className={`py-3 px-4 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${abaModal === 'dados' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            <AlignLeft size={16} /> Dados Cadastrais
          </button>
          <button onClick={() => setAbaModal('historico')} className={`py-3 px-4 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${abaModal === 'historico' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            <History size={16} /> Histórico de Ações
          </button>
        </div>

        {/* Conteúdo Dinâmico */}
        <div className="p-6 overflow-y-auto flex-1 bg-white">
          
          {abaModal === 'dados' && (
            <div className="animate-in fade-in duration-200">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Informações do Cliente</h3>
                  {isEditing && <p className="text-xs text-amber-600 font-bold">Aviso: Salvar mudanças cadastrais gera cobrança de R$ 5,00.</p>}
                </div>
                <button onClick={() => setIsEditing(!isEditing)} className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline px-3 py-1.5 bg-blue-50 rounded-lg">
                  {isEditing ? "Cancelar Edição" : <><Edit2 size={14}/> Editar Cliente</>}
                </button>
              </div>

              {isEditing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 bg-blue-50/30 p-4 rounded-xl border border-blue-100">
                  <div><label className="block text-xs font-bold text-slate-600 mb-1">Nome Completo</label><input value={formData.nome} onChange={e=>setFormData({...formData, nome: e.target.value})} className="w-full h-9 px-3 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500" /></div>
                  <div><label className="block text-xs font-bold text-slate-600 mb-1">E-mail</label><input value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} className="w-full h-9 px-3 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500" /></div>
                  <div><label className="block text-xs font-bold text-slate-600 mb-1">Telefone</label><input value={formData.telefone} onChange={e=>setFormData({...formData, telefone: e.target.value})} className="w-full h-9 px-3 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500" /></div>
                  <div><label className="block text-xs font-bold text-slate-600 mb-1">CPF</label><input value={formData.cpf} onChange={e=>setFormData({...formData, cpf: e.target.value})} className="w-full h-9 px-3 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500" /></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100"><span className="block text-xs font-bold text-slate-500 mb-0.5">Nome</span><strong className="text-sm text-slate-800">{row.nome || "—"}</strong></div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100"><span className="block text-xs font-bold text-slate-500 mb-0.5">E-mail</span><strong className="text-sm text-slate-800">{row.email || "—"}</strong></div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100"><span className="block text-xs font-bold text-slate-500 mb-0.5">Telefone</span><strong className="text-sm text-slate-800">{row.telefone || "—"}</strong></div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100"><span className="block text-xs font-bold text-slate-500 mb-0.5">CPF</span><strong className="text-sm text-slate-800">{row.cpf || "—"}</strong></div>
                </div>
              )}

              {/* Seção de Observações Rápidas */}
              <div className="mb-8">
                <h3 className="text-sm font-bold text-slate-800 mb-3">Observações Rápidas</h3>
                {isEditing ? (
                  <textarea 
                    value={formData.observacoes} 
                    onChange={e => setFormData({...formData, observacoes: e.target.value})} 
                    placeholder="Adicione notas sobre o cliente, particularidades, avisos..."
                    className="w-full h-24 p-3 text-sm border border-slate-300 rounded-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none bg-yellow-50" 
                  />
                ) : (
                  <div className="w-full min-h-[60px] p-4 text-sm bg-yellow-50/50 border border-yellow-200 rounded-xl text-slate-700 whitespace-pre-wrap">
                    {row.observacoes ? row.observacoes : <span className="text-slate-400 italic">Nenhuma observação registrada. Clique em "Editar Cliente" para adicionar.</span>}
                  </div>
                )}
                {isEditing && (
                  <div className="flex justify-end mt-3">
                    <button onClick={() => onSalvar(row, formData)} className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm">
                      Salvar Alterações
                    </button>
                  </div>
                )}
              </div>

              <h3 className="text-sm font-bold text-slate-800 mb-4 border-t border-slate-100 pt-6">Dados Técnicos da Licença</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statsList.map((s, i) => (
                  <div key={i} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="block text-xs font-bold text-slate-500 mb-0.5">{s.label}</span>
                    <strong className="text-sm text-slate-800">{s.value}</strong>
                  </div>
                ))}
              </div>
              
              {(row.ultimo_erro || row.bloqueado_motivo) && (
                <div className="mt-4 p-4 rounded-xl border border-red-200 bg-red-50 text-sm">
                  {row.bloqueado_motivo && <p><strong className="text-red-800">Motivo Bloqueio:</strong> <span className="text-red-700">{row.bloqueado_motivo}</span></p>}
                  {row.ultimo_erro && <p className="mt-2"><strong className="text-red-800">Último Erro:</strong> <span className="text-red-700">{row.ultimo_erro}</span></p>}
                </div>
              )}
            </div>
          )}

          {abaModal === 'historico' && (
            <div className="animate-in fade-in duration-200 relative pl-4 border-l-2 border-slate-100 space-y-6 py-2">
              {historico && historico.length > 0 ? (
                historico.map((log) => (
                  <div key={log.id} className="relative">
                    <div className="absolute -left-[23px] top-1 w-3 h-3 bg-blue-500 rounded-full border-4 border-white shadow-sm"></div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <div className="flex justify-between items-start mb-1">
                        <strong className="text-sm text-slate-800">{log.acao}</strong>
                        <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1 bg-white px-2 py-1 rounded-md border border-slate-200"><Calendar size={10} /> {formatarDataHora(log.data)}</span>
                      </div>
                      <p className="text-sm text-slate-600">{log.detalhes}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500 text-sm">
                  <History size={32} className="mx-auto mb-3 opacity-20" />
                  Nenhum histórico registrado para esta licença.
                </div>
              )}
            </div>
          )}

        </div>
        
        {/* Rodapé de Ações Rápidas */}
        <div className="p-4 lg:p-5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div className="text-xs text-slate-500 font-semibold">Ações Administrativas:</div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            {row.status === STATUS.BLOQUEADO ? (
              <button onClick={() => onDesbloquear(row)} className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-bold transition-colors">Desbloquear Acesso</button>
            ) : (
              <button onClick={() => onBloquear(row)} className="px-4 py-2 border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-bold transition-colors">Bloquear Licença</button>
            )}
            <button onClick={() => onRenovar(row)} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors flex flex-col items-center justify-center">
              <span>Renovar +90 Dias</span>
              <span className="text-[10px] font-normal opacity-90 mt-0.5">(Lançar R$ 29,90)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BlockModal({ row, onClose, onConfirm }) {
  const [motivo, setMotivo] = useState(row.bloqueado_motivo || "");
  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4"><Lock size={24} /></div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Bloquear Licença</h2>
          <p className="text-sm text-slate-500 mb-6">Ao bloquear, o usuário não poderá mais utilizar o app com o código <strong className="font-mono text-slate-800">{row.codigo}</strong>.</p>
          <label className="block text-sm font-bold text-slate-700 mb-2">Motivo do bloqueio (opcional)</label>
          <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex: Pagamento pendente..." className="w-full h-24 p-3 border border-slate-300 rounded-xl text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 resize-none"></textarea>
        </div>
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 font-bold text-sm hover:bg-slate-200 rounded-lg transition-colors">Cancelar</button>
          <button onClick={() => onConfirm(row, motivo)} className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-lg shadow-sm transition-colors">Confirmar Bloqueio</button>
        </div>
      </div>
    </div>
  );
}

function Toast({ toast }) {
  const isError = toast.tipo === "erro";
  return (
    <div className={`fixed bottom-6 right-6 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl transform transition-all duration-300 animate-in slide-in-from-bottom-5 ${isError ? 'bg-red-600 text-white' : 'bg-slate-900 text-white'}`}>
      {isError ? <AlertTriangle size={18} /> : <Check size={18} className="text-emerald-400" />}
      <span className="text-sm font-bold">{toast.texto}</span>
    </div>
  );
}
