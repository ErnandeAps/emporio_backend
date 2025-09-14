const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const mercadopago = require("mercadopago");
const { dbPromise } = require("./db");

// Rotas do projeto
const clientesRoutes = require("./routes/clientes");
const vendasRoutes = require("./routes/vendas");
const produtosRoutes = require("./routes/produtos");
const categoriasRoutes = require("./routes/categorias");
const carrinhoRoutes = require("./routes/carrinho");
const promocoesRoutes = require("./routes/promocoes");
const lojasRoutes = require("./routes/lojas");
const pixRoutes = require("./routes/pix");
const checkoutRoutes = require("./routes/checkout");
const imgprodutosRoutes = require("./routes/imgprodutos");
const imgcategoriasRoutes = require("./routes/imgcategorias");

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

app.use("/imagens", express.static(path.join(__dirname, "imagens")));

// Rotas do app
app.use("/clientes", clientesRoutes);
app.use("/vendas", vendasRoutes);
app.use("/produtos", produtosRoutes);
app.use("/categorias", categoriasRoutes);
app.use("/carrinho", carrinhoRoutes);
app.use("/promocoes", promocoesRoutes);
app.use("/lojas", lojasRoutes);
app.use("/checkout", checkoutRoutes);
app.use("/pix", pixRoutes);
app.use("/imgprodutos", imgprodutosRoutes);
app.use("/imgcategorias", imgcategoriasRoutes);

// ✅ Webhook do Mercado Pago (notificações automáticas)
app.post("/webhooks", async (req, res) => {
  //Atualiza o Id_pagamento no pedido
  if (req.body?.data?.id) {
    const paymentId = req.body.data.id;
    const pagamento = await mercadopago.payment.findById(paymentId);
    const status = pagamento.body.status;
    const id = pagamento.body.external_reference;
    const bandeira = pagamento.body.payment_method_id;
    const tipo_id = pagamento.body.payment_type_id;
    const motivo = pagamento.body.status_detail;

    console.log("Pagamento:", {
      paymentId,
      status,
      id,
      motivo,
    });

    const [rows] = await dbPromise.query(
      "UPDATE vendas SET id_pagamento = ?, tipo_pagamento = ?, bandeira = ?, status = ?, st_pagamento = ? WHERE id_venda = ?",
      [paymentId, tipo_id, bandeira, status, "Pago", id]
    );
  }
  res.sendStatus(200);
});

// ✅ Rotas de retorno visual para testes via navegador
app.get("/pagamento/sucesso", (req, res) => {
  res.send("✅ Pagamento aprovado com sucesso!");
});

app.get("/pagamento/falha", (req, res) => {
  res.send("❌ Ocorreu um erro no pagamento.");
});

app.get("/pagamento/pendente", (req, res) => {
  res.send("⏳ Seu pagamento está pendente de aprovação.");
});

// Iniciar servidor
/*
app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Servidor rodando em http://192.168.0.26:${port}`);
});
*/
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
