const express = require("express");
const router = express.Router();
const { dbPromise } = require("../db");
const mercadopago = require("mercadopago");
//const fetch = require("node-fetch"); // necessário para o webhook

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

let empresa_acces_token = String;
let empresa_nome = String;

const end_point = "https://forca-vendas-backend-production.up.railway.app";

router.post("/", async (req, res) => {
  try {
    const device_id = req.body.device_id;
    const tipo_entrega = req.body.tipo_entrega;
    const valor_frete = parseFloat(req.body.valor_frete) || 0;
    const st_pagamento = "Pendente";
    const { cnpj } = req.query;

    // Pega os dados da empresa
    const [empresaRows] = await dbPromise.query(
      "SELECT * FROM empresas WHERE cnpj = ?",
      [cnpj]
    );
    if (!empresaRows[0]) {
      return res.status(404).json({ error: "Empresa não encontrada." });
    }

    empresa_nome = empresaRows[0].nome;
    empresa_acces_token = empresaRows[0].access_token;

    // ⚠️ Aqui mantemos o token de teste para ambiente sandbox
    mercadopago.configure({ access_token: empresa_acces_token });

    // Pega os dados do cliente
    const [Cliente] = await dbPromise.query(
      "SELECT * FROM clientes WHERE cnpj = ? and device_id = ?",
      [cnpj, device_id]
    );
    if (!Cliente[0]) {
      return res.status(404).json({ error: "Cliente não encontrado." });
    }
    const cliente = Cliente[0];

    // Pega os itens do carrinho
    const [itensCarrinho] = await dbPromise.query(
      "SELECT * FROM carrinho WHERE cnpj = ? and device_id = ?",
      [cnpj, device_id]
    );
    if (!itensCarrinho[0]) {
      return res.status(404).json({ error: "Itens não encontrado." });
    }

    // Totaliza os valores do carrinho
    const [somaTotal] = await dbPromise.query(
      `SELECT 
         SUM(qtd) AS totalItens, 
         SUM(qtd * valor) AS totalValor 
       FROM carrinho 
       WHERE cnpj = ? and device_id = ?`,
      [cnpj, device_id]
    );
    const totalItens = somaTotal[0].totalItens;
    const totalValor = Number(somaTotal[0].totalValor) || 0;
    let valorTotal =
      tipo_entrega === "Entrega" ? totalValor + valor_frete : totalValor;

    // Próximo ID de venda
    const [rows] = await dbPromise.query(
      "SELECT COALESCE(MAX(id_venda), 0) + 1 AS proximo_id FROM vendas WHERE cnpj = ?",
      [cnpj]
    );
    const idVenda = rows[0].proximo_id;

    // Insere a venda
    await dbPromise.query(
      `INSERT INTO vendas (cnpj,id_venda, device_id, telefone, id_cliente, cpf, nome, tipo_entrega,st_entrega, st_pagamento, total, status,frete,valorTotal, data)
       VALUES (?,?,?,?,?, ?, ?, ?, ?, ?, ?, ?,?,?, NOW())`,
      [
        cnpj,
        idVenda,
        device_id,
        cliente.telefone,
        cliente.id,
        cliente.cpf,
        cliente.nome,
        tipo_entrega,
        "Aguardando",
        st_pagamento,
        somaTotal[0].totalValor,
        "Novo",
        valor_frete,
        valorTotal,
      ]
    );

    // Insere itens da venda
    for (const item of itensCarrinho) {
      await dbPromise.query(
        `INSERT INTO vendasitens (cnpj, id_venda, device_id, id_produto, produto, valor, qtd, total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cnpj,
          idVenda,
          device_id,
          item.id_produto,
          item.produto,
          item.valor,
          item.qtd,
          item.total,
        ]
      );
    }

    // Limpa carrinho
    await dbPromise.query(
      "DELETE FROM carrinho WHERE cnpj = ? and device_id = ?",
      [cnpj, device_id]
    );

    // =======================
    // ✅ Cria preferência de pagamento
    // =======================
    const preference = {
      external_reference: idVenda.toString(),
      items: [
        {
          title: `Pedido nº ${idVenda} - ${empresa_nome}`,
          quantity: 1,
          unit_price: parseFloat(valorTotal),
          currency_id: "BRL",
        },
      ],
      payer: {
        name: cliente.nome || "Cliente App",
      },

      notification_url: end_point + "/webhooks",
      back_urls: {
        success: end_point + "/pagamento/sucesso",
        failure: end_point + "/pagamento/falha",
        pending: end_point + "/pagamento/pendente",
      },
      auto_return: "approved",
    };

    const result = await mercadopago.preferences.create(preference);

    // Retorna init_point e id para Checkout Pro
    res.json({
      init_point: result.body.init_point,
      idPreferencia: result.body.id,
    });
  } catch (error) {
    console.error("Erro ao criar preferência:", error);
    res.status(500).json({ error: "Erro ao criar preferência de pagamento." });
  }
});

router.post("/pagamento/:id_venda", async (req, res) => {
  try {
    const { id_venda } = req.params;
    const { cnpj } = req.query;

    const [empresaRows] = await dbPromise.query(
      "SELECT * FROM empresas WHERE cnpj = ?",
      [cnpj]
    );
    if (!empresaRows[0]) {
      return res.status(404).json({ error: "Empresa não encontrada." });
    }

    empresa_nome = empresaRows[0].nome;
    empresa_acces_token = empresaRows[0].access_token;

    const [vendas] = await dbPromise.query(
      "SELECT * FROM vendas WHERE cnpj = ? and id_venda = ?",
      [cnpj, id_venda]
    );
    if (!vendas[0]) {
      return res.status(404).json({ error: "Itens não encontrado." });
    }
    const venda = vendas[0];
    const valorTotal = parseFloat(venda.valorTotal) || 0;

    mercadopago.configure({ access_token: empresa_acces_token });
    const preference = {
      external_reference: id_venda.toString(),
      items: [
        {
          title: `Pedido nº ${id_venda} - ${empresa_nome}`,
          quantity: 1,
          unit_price: parseFloat(valorTotal),
          currency_id: "BRL",
        },
      ],
      payer: {
        name: venda.nome || "Cliente App",
      },

      notification_url: end_point + "/webhooks",
      back_urls: {
        success: end_point + "/pagamento/sucesso",
        failure: end_point + "/pagamento/falha",
        pending: end_point + "/pagamento/pendente",
      },
      auto_return: "approved",
    };

    const result = await mercadopago.preferences.create(preference);

    // Retorna init_point e id para Checkout Pro
    res.json({
      init_point: result.body.init_point,
      idPreferencia: result.body.id,
    });
  } catch (error) {
    console.error("Erro ao criar preferência:", error);
    res.status(500).json({ error: "Erro ao criar preferência de pagamento." });
  }
});

// =======================
// ✅ Páginas de retorno
// =======================

router.get("/pagamento/falha", (req, res) => {
  res.send("❌ Ocorreu um erro no pagamento.");
});
router.get("/pagamento/pendente", (req, res) => {
  res.send("⏳ Seu pagamento está pendente de aprovação.");
});
router.get("/pagamento/sucesso", (req, res) => {
  res.send("✅ Pagamento aprovado com sucesso! no checkout");
});

module.exports = router;
