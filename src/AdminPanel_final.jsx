import React, { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function AdminPanel() {
  const [logado, setLogado] = useState(false);
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");

  const [users, setUsers] = useState([]);

  const [novo, setNovo] = useState({
    nome: "",
    cpf: "",
    telefone: "",
    email: "",
    codigo: "",
    status: "Ativo",
    validade: "",
    sistema: "Android",
  });

  useEffect(() => {
    if (logado) carregarUsuarios();
  }, [logado]);

  async function carregarUsuarios() {
    const { data, error } = await supabase
      .from("usuarios")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) setUsers(data || []);
  }

  function entrar() {
    if (usuario === "admin" && senha === "1234") {
      setLogado(true);
    } else {
      alert("Login inválido");
    }
  }

  async function cadastrar() {
    if (!novo.nome || !novo.codigo) {
      alert("Preencha nome e código");
      return;
    }

    const { error } = await supabase.from("usuarios").insert([novo]);

    if (error) {
      alert("Erro ao cadastrar");
      return;
    }

    setNovo({
      nome: "",
      cpf: "",
      telefone: "",
      email: "",
      codigo: "",
      status: "Ativo",
      validade: "",
      sistema: "Android",
    });

    carregarUsuarios();
  }

  async function alterarStatus(id, statusAtual) {
    const novoStatus = statusAtual === "Ativo" ? "Bloqueado" : "Ativo";

    await supabase
      .from("usuarios")
      .update({ status: novoStatus })
      .eq("id", id);

    carregarUsuarios();
  }

  if (!logado) {
    return (
      <div style={styles.loginBg}>
        <div style={styles.card}>
          <h1>Painel ADM</h1>
          <p>Atestado Fácil</p>

          <input
            placeholder="Usuário"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            style={styles.input}
          />

          <input
            placeholder="Senha"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            style={styles.input}
          />

          <button onClick={entrar} style={styles.button}>
            Entrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <h1>Painel ADM</h1>

      <div style={styles.card}>
        <h2>Novo Usuário</h2>

        <input placeholder="Nome" style={styles.input}
          value={novo.nome}
          onChange={(e)=>setNovo({...novo,nome:e.target.value})}
        />

        <input placeholder="CPF" style={styles.input}
          value={novo.cpf}
          onChange={(e)=>setNovo({...novo,cpf:e.target.value})}
        />

        <input placeholder="Telefone" style={styles.input}
          value={novo.telefone}
          onChange={(e)=>setNovo({...novo,telefone:e.target.value})}
        />

        <input placeholder="Email" style={styles.input}
          value={novo.email}
          onChange={(e)=>setNovo({...novo,email:e.target.value})}
        />

        <input placeholder="Código de acesso" style={styles.input}
          value={novo.codigo}
          onChange={(e)=>setNovo({...novo,codigo:e.target.value})}
        />

        <input type="date" style={styles.input}
          value={novo.validade}
          onChange={(e)=>setNovo({...novo,validade:e.target.value})}
        />

        <button onClick={cadastrar} style={styles.button}>
          Cadastrar
        </button>
      </div>

      <div style={styles.card}>
        <h2>Usuários</h2>

        {users.map((u) => (
          <div key={u.id} style={styles.userCard}>
            <b>{u.nome}</b>
            <p>{u.codigo}</p>
            <p>Status: {u.status}</p>
            <p>Validade: {u.validade || "-"}</p>

            <button
              onClick={() => alterarStatus(u.id, u.status)}
              style={styles.smallBtn}
            >
              {u.status === "Ativo" ? "Bloquear" : "Ativar"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  loginBg: {
    minHeight: "100vh",
    background: "#0f172a",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },

  page: {
    minHeight: "100vh",
    background: "#0f172a",
    color: "white",
    padding: 30,
    fontFamily: "Arial",
  },

  card: {
    background: "#111827",
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },

  input: {
    width: "100%",
    padding: 10,
    marginBottom: 10,
    borderRadius: 8,
    border: "none",
  },

  button: {
    width: "100%",
    padding: 12,
    background: "#22c55e",
    color: "white",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  },

  smallBtn: {
    padding: 8,
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    marginTop: 8,
  },

  userCard: {
    background: "#1f2937",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
};