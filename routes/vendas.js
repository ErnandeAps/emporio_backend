const express = require("express");
const router = express.Router();
const { dbPromise } = require("../db");

// 🔸 Listar todas as vendas
router.get("/", async (req, res) => {
  try {
    const { cnpj } = req.query;

    const [results] = await dbPromise.query("SELECT * FROM vendas cnpj = ?", [
      cnpj,
    ]);

    res.json(results);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// 🔸 Buscar uma venda por ID

router.get("/:device_id", async (req, res) => {
  const params = req.params.device_id.trim();
  const { cnpj } = req.query;
  try {
    const [results] = await dbPromise.query(
      "SELECT * FROM vendas WHERE cnpj = ? and device_id = ? AND status = 'Finalizado'",
      [cnpj, params]
    );
    if (results.length === 0)
      return res.status(404).json({ msg: "Venda não encontrada" });
    res.json(results);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.get("/pendentes/:device_id", async (req, res) => {
  const params = req.params.device_id.trim();
  const { cnpj } = req.query;

  try {
    const [results] = await dbPromise.query(
      "SELECT * FROM vendas WHERE cnpj = ? and device_id = ? AND st_pagamento = 'Pendente' and status <> 'Cancelado'",
      [cnpj, params]
    );
    if (results.length === 0)
      return res.status(404).json({ msg: "Venda não encontrada" });
    res.json(results);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.get("/itens/:id_venda", async (req, res) => {
  const { id_venda } = req.params;
  const { cnpj } = req.query;

  console.log("ID da venda:", id_venda, cnpj);
  try {
    const [itens] = await dbPromise.query(
      "SELECT * FROM vendasitens WHERE cnpj = ? and id_venda = ?",
      [cnpj, id_venda]
    );
    res.json(itens);
  } catch (err) {
    console.error("Erro ao buscar itens da venda:", err);
    res.status(500).send("Erro ao buscar itens");
  }
});
// 🔸 Criar nova venda
router.post("/", async (req, res) => {
  try {
    const { cnpj, id_cliente, nome, data, total, formapag, tipo, st } =
      req.body;
    const sql =
      "INSERT INTO vendas (cnpj, id_cliente, nome, data, total, formapag, tipo, st) VALUES (?, ?, ?, ?, ?, ?, ?)";
    const [result] = await dbPromise.query(sql, [
      cnpj,
      id_cliente,
      nome,
      data,
      total,
      formapag,
      tipo,
      st,
    ]);
    res.status(201).json({
      id: result.insertId,
      cnpj,
      id_cliente,
      nome,
      data,
      total,
      formapag,
      tipo,
      st,
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// 🔸 Criar novo item de venda
router.post("/itens", async (req, res) => {
  try {
    const { cnpj, id_pedido, id_produto, produto, qtd, valor_unit, total } =
      req.body;
    const sql =
      "INSERT INTO vendasitens (id_pedido, id_produto, produto, qtd, valor_unit, total) VALUES (?, ?, ?, ?, ?, ?)";
    const [result] = await dbPromise.query(sql, [
      cnpj,
      id_pedido,
      id_produto,
      produto,
      qtd,
      valor_unit,
      total,
    ]);
    res.status(201).json({
      id: result.insertId,
      id_pedido,
      id_produto,
      produto,
      qtd,
      valor_unit,
      total,
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// 🔸 Atualizar venda
router.put("/:id", async (req, res) => {
  try {
    const { cnpj, cliente, valor, data } = req.body;
    const sql =
      "UPDATE vendas SET cliente = ?, valor = ?, data = ? WHERE cnpj = ? and id = ?";
    await dbPromise.query(sql, [cnpj, cliente, valor, data, req.params.id]);
    res.json({ msg: "Venda atualizada com sucesso" });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// 🔸 Deletar venda
router.delete("/:id", async (req, res) => {
  try {
    await dbPromise.query("DELETE FROM vendas WHERE cnpj = ? and id = ?", [
      req.params.id,
    ]);
    res.json({ msg: "Venda excluída com sucesso" });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.post("/recompra/:id_venda", async (req, res) => {
  const { id_venda } = req.params;
  const { cnpj } = req.query;
  console.log("Recomprar pedido ID:", id_venda, "CNPJ:", cnpj);

  //console.log("ID da venda:", id_venda);
  try {
    const [vendaRows] = await dbPromise.query(
      "SELECT * FROM vendas WHERE cnpj = ? and id_venda = ?",
      [cnpj, id_venda]
    );

    if (vendaRows.length === 0) {
      return res.status(404).json({ msg: "Venda não encontrada" });
    }

    const venda = vendaRows[0]; // uma única venda

    const [itens] = await dbPromise.query(
      "SELECT * FROM vendasitens WHERE cnpj = ? and id_venda = ?",
      [cnpj, id_venda]
    );

    const carrinhoItens = [];

    for (const item of itens) {
      const itemCarrinho = {
        cnpj: cnpj,
        device_id: venda.device_id,
        id_produto: item.id_produto,
        produto: item.produto,
        valor: item.valor,
        qtd: item.qtd,
        total: (item.valor * item.qtd).toFixed(2),
      };

      await dbPromise.query("INSERT INTO carrinho SET ?", itemCarrinho);
      carrinhoItens.push(itemCarrinho);
    }
    res.json({ message: "Produto adicionado ao carrinho com sucesso!" });
  } catch (err) {
    console.error("Erro ao buscar itens da venda:", err);
    res.status(500).send("Erro ao buscar itens");
  }
});

module.exports = router;
