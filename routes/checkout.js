const express = require("express");
const router = express.Router();
const { dbPromise } = require("../db");
const mercadopago = require("mercadopago");

// ✅ Configuração do Mercado Pago (modo teste)
mercadopago.configure({
  access_token:
    "TEST-4319705132328627-061002-0c2c998902e04c43a5e012f0da050111-525676884",
});

// ✅ Rota para criar preferência de pagamento
router.post("/", async (req, res) => {
  const device_id = req.body.device_id.trim();
  const tipo_entrega = req.body.tipo_entrega.trim();
  const st_pagamento = "Pendente";
  const { cnpj } = req.query;

  //Pega os dados do cliente
  const [Cliente] = await dbPromise.query(
    "SELECT * FROM clientes WHERE cnpj = ? and device_id = ?",
    [cnpj, device_id]
  );

  if (!Cliente[0]) {
    return res.status(404).json({ error: "Cliente não encontrado." });
  }

  const cliente = Cliente[0]; // ← Aqui você define a variável

  //Pega os itens do carrinho
  const [itensCarrinho] = await dbPromise.query(
    "SELECT * FROM carrinho WHERE cnpj = ? and device_id = ?",
    [cnpj, device_id]
  );

  if (!itensCarrinho[0]) {
    return res.status(404).json({ error: "Itens não encontrado." });
  }
  //totaliza os valores do carrinho
  const [somaTotal] = await dbPromise.query(
    `SELECT 
     SUM(qtd) AS totalItens, 
     SUM(qtd * valor) AS totalValor 
   FROM carrinho 
   WHERE cnpj = ? and device_id = ?`,
    [cnpj, device_id]
  );
  const totalItens = somaTotal[0].totalItens;
  const totalValor = somaTotal[0].totalValor;

  const [rows] = await dbPromise.query(
    "SELECT COALESCE(MAX(id_venda), 0) + 1 AS proximo_id FROM vendas WHERE cnpj = ?",
    [cnpj]
  );

  const [vendaResult] = await dbPromise.query(
    `INSERT INTO vendas (cnpj,id_venda, device_id, telefone, id_cliente, cpf, nome, tipo_entrega,st_entrega, st_pagamento, total, status, data)
   VALUES (?,?,?,?,?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      cnpj,
      (id_venda = rows[0].proximo_id),
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
    ]
  );

  const idVenda = rows[0].proximo_id;
  console.log("ID da venda criada:", idVenda);

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

  await dbPromise.query(
    "DELETE FROM carrinho WHERE cnpj = ? and device_id = ?",
    [cnpj, device_id]
  );

  const preference = {
    external_reference: idVenda.toString(),
    items: [
      {
        title: `Pedido nº ${idVenda} - New Word Pets`,
        quantity: 1,
        unit_price: parseFloat(totalValor),
        currency_id: "BRL",
      },
    ],
    payer: {
      name: cliente.nome || "Cliente App",
    },
    notification_url:
      "https://forca-vendas-backend-production.up.railway.app/webhooks",
    back_urls: {
      success:
        "https://forca-vendas-backend-production.up.railway.app/pagamento/sucesso",
      failure:
        "https://forca-vendas-backend-production.up.railway.app/pagamento/falha",
      pending:
        "https://forca-vendas-backend-production.up.railway.app/pagamento/pendente",
    },
    auto_return: "approved",
  };

  const result = await mercadopago.preferences.create(preference);

  // 🔁 Retorna init_point e id para usar no Checkout Bricks
  res.json({
    init_point: result.body.init_point,
    idPreferencia: result.body.id,
  });
});
//**************************************************************************************************** */
router.post("/pagamento/:id_venda", async (req, res) => {
  const id_venda = req.params.id_venda;
  const { cnpj } = req.query;
  // Verifica se o ID da venda foi fornecido
  const [Pedido] = await dbPromise.query(
    "SELECT * FROM vendas WHERE cnpj = ? and id_venda = ?",
    [cnpj, id_venda]
  );

  const pedido = Pedido[0];
  if (!pedido) {
    return res.status(404).json({ error: "Pedido não encontrado." });
  }

  const totalValor = pedido.total;

  const preference = {
    external_reference: id_venda.toString(),
    items: [
      {
        title: `Pedido nº ${id_venda} - New Word Pets`,
        quantity: 1,
        unit_price: parseFloat(totalValor),
        currency_id: "BRL",
      },
    ],
    payer: {
      name: pedido.nome || "Cliente App",
    },
    notification_url:
      "https://forca-vendas-backend-production.up.railway.app/webhooks",
    back_urls: {
      success:
        "https://forca-vendas-backend-production.up.railway.app/pagamento/sucesso",
      failure:
        "https://forca-vendas-backend-production.up.railway.app/pagamento/falha",
      pending:
        "https://forca-vendas-backend-production.up.railway.app/pagamento/pendente",
    },
    auto_return: "approved",
  };

  const result = await mercadopago.preferences.create(preference);

  // 🔁 Retorna init_point e id para usar no Checkout Bricks
  res.json({
    init_point: result.body.init_point,
    idPreferencia: result.body.id,
  });
});

// ✅ Rota para exibir o Checkout Bricks via WebView no app
router.get("/pagamento/:id", (req, res) => {
  const { id } = req.params;
  const { cnpj } = req.query;
  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <title>Pagamento</title>
      <script src="https://sdk.mercadopago.com/js/v2"></script>
      <style>
        body { display: flex; justify-content: center; padding: 40px; }
      </style>
    </head>
    <body>
      <div id="wallet_container"></div>
      <script>
        const mp = new MercadoPago("TEST-cd30747f-0c1a-43e6-9761-6df98b0c78a2", {
          locale: "pt-BR"
        });

        mp.bricks().create("wallet", "wallet_container", {
          initialization: {
            preferenceId: "${id}"
          }
        });
      </script>
    </body>
    </html>
  `);
});

// ✅ Webhook do Mercado Pago
router.post("/webhooks", (req, res) => {
  res.sendStatus(200);
});

// ✅ Páginas de retorno (testes)
router.get("/pagamento/sucesso", (req, res) => {
  res.send("✅ Pagamento aprovado com sucesso!");
});
router.get("/pagamento/falha", (req, res) => {
  res.send("❌ Ocorreu um erro no pagamento.");
});
router.get("/pagamento/pendente", (req, res) => {
  res.send("⏳ Seu pagamento está pendente de aprovação.");
});

module.exports = router;
