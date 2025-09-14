const express = require("express");
const router = express.Router();
const { dbPromise } = require("../db");

// 🔸 Listar todos os itens do carrinho por celular
router.get("/:dispositivos/:param", async (req, res) => {
  try {
    const { param } = req.params;
    //console.log("Requisição", { param });
    const [rows] = await dbPromise.query(
      "SELECT * FROM carrinho WHERE device_id = ?",
      [param]
    );
    //console.log("lista produtos", res.json(rows));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// 🔸 Inserir item no carrinho
router.post("/", async (req, res) => {
  const { id_produto, device_id, qtd = 1, valor } = req.body;
  //console.log("Requisição:", req.body);
  if (!id_produto || !device_id) {
    return res
      .status(400)
      .json({ error: "id_produto e device_id são obrigatórios" });
  }

  try {
    const [produtoResult] = await dbPromise.query(
      "SELECT * FROM produtos WHERE id = ?",
      [id_produto]
    );

    if (produtoResult.length === 0) {
      return res.status(404).send("Produto não encontrado");
    }

    const produto = produtoResult[0];
    const itemCarrinho = {
      id_produto: produto.id,
      produto: produto.produto,
      valor: valor,
      qtd,
      total: (valor * qtd).toFixed(2),
      device_id,
    };

    const [result] = await dbPromise.query(
      "INSERT INTO carrinho SET ?",
      itemCarrinho
    );

    res.json({ id: result.insertId, ...itemCarrinho });
  } catch (err) {
    res.status(500).json({ error: "Erro ao adicionar item ao carrinho" });
  }
});

// 🔸 Atualizar quantidade de um item no carrinho
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { qtd } = req.body;

  if (typeof qtd !== "number" || qtd < 1) {
    return res.status(400).json({ error: "Quantidade inválida" });
  }

  try {
    await dbPromise.query(
      "UPDATE carrinho SET qtd = ?, total = valor * ? WHERE id = ?",
      [qtd, qtd, id]
    );
    res.json({ msg: "Quantidade atualizada com sucesso" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar quantidade" });
  }
});

// 🔸 Deletar item do carrinho
router.delete("/:id", async (req, res) => {
  try {
    await dbPromise.query("DELETE FROM carrinho WHERE id = ?", [req.params.id]);
    res.json({ msg: "Item excluído com sucesso" });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// 🔸 Finalizar pedido: move carrinho para vendas e vendasitens
router.post("/finalizar", async (req, res) => {
  const { celular, formaPagamento, tipoEntrega } = req.body;

  const conn = await dbPromise.getConnection();
  await conn.beginTransaction();

  try {
    const [itensCarrinho] = await conn.query(
      "SELECT * FROM carrinho WHERE celular = ?",
      [celular]
    );

    if (itensCarrinho.length === 0) {
      await conn.rollback();
      return res.status(400).json({ error: "Carrinho vazio" });
    }

    const total = itensCarrinho.reduce(
      (soma, item) => soma + item.valor * item.qtd,
      0
    );

    const [vendaResult] = await conn.query(
      `INSERT INTO vendas (celular, forma_pagamento, tipo_entrega, total, data)
       VALUES (?, ?, ?, ?, NOW())`,
      [celular, formaPagamento, tipoEntrega, total]
    );

    const idVenda = vendaResult.insertId;

    for (const item of itensCarrinho) {
      await conn.query(
        `INSERT INTO vendasitens (id_venda, id_produto, produto, valor, qtd, total)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          idVenda,
          item.id_produto,
          item.produto,
          item.valor,
          item.qtd,
          item.total,
        ]
      );
    }

    await conn.query("DELETE FROM carrinho WHERE celular = ?", [celular]);

    await conn.commit();
    res
      .status(201)
      .json({ mensagem: "Pedido finalizado com sucesso", idVenda });
  } catch (err) {
    await conn.rollback();
    res
      .status(500)
      .json({ erro: "Erro ao finalizar pedido", detalhes: err.message });
    console.log("Erro ao finalizar pedido", "detalhes :" + err.message);
  } finally {
    conn.release();
  }
});

module.exports = router;
