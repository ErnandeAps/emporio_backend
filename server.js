const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const mercadopago = require("mercadopago");
const { dbPromise } = require("./db");
/*
const MP_TEST_ACCESS_TOKEN =
  "APP_USR-245728391973401-092913-5ca32a74083291fdc65f03a29efb6d88-2490530038";
  */

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
const cidadesRoutes = require("./routes/cidades");

const app = express();
const port = 3000;

let cnpj = String;

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
app.use("/cidades", cidadesRoutes);

// ✅ Webhook do Mercado Pago (notificações automáticas)
app.post("/webhooks", async (req, res) => {
  //Atualiza o Id_pagamento no pedido
  //console.log("Webhook recebido:", req.body);
  if (req.body?.data?.id) {
    const paymentId = req.body.data.id;
    const pagamento = await mercadopago.payment.findById(paymentId);
    const status = pagamento.body.status;
    const id = pagamento.body.external_reference;
    const bandeira = pagamento.body.payment_method_id;
    const tipo_id = pagamento.body.payment_type_id;
    const motivo = pagamento.body.status_detail;
    const collector_id = pagamento.body.collector_id;

    const [empresaRows] = await dbPromise.query(
      "SELECT * FROM empresas WHERE collector_id = ?",
      [collector_id]
    );
    if (!empresaRows[0]) {
      return res.status(404).json({ error: "Empresa não encontrada." });
    }

    cnpj = empresaRows[0].cnpj;

    const [rows] = await dbPromise.query(
      "UPDATE vendas SET id_pagamento = ?, tipo_pagamento = ?, bandeira = ?, status = ?, st_pagamento = ? WHERE id_venda = ? and cnpj = ?",
      [paymentId, tipo_id, bandeira, status, "Pago", id, cnpj]
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
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
