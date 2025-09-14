const express = require("express");
const router = express.Router();
const { dbPromise } = require("../db");

// Listar todos produtos
router.get("/", async (req, res) => {
  try {
    const [results] = await dbPromise.query("SELECT * FROM produtos");
    res.json(results);
  } catch (err) {
    console.error("Erro ao listar produtos:", err);
    res.status(500).send("Erro ao listar produtos");
  }
});

// GET /produtos/busca?nome=ração
router.get("/busca", async (req, res) => {
  const nome = req.query.nome;

  try {
    const [rows] = await dbPromise.query(
      "SELECT * FROM produtos WHERE produto LIKE ?",
      [`%${nome}%`]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro ao buscar produtos");
  }
});

// Buscar produto por ID
router.get("/id/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [results] = await dbPromise.query(
      "SELECT * FROM produtos WHERE id = ?",
      [id]
    );
    if (results.length === 0) {
      return res.status(404).send("Produto não encontrado");
    }
    res.json(results[0]);
  } catch (err) {
    console.error("Erro ao buscar produto:", err);
    res.status(500).send("Erro ao buscar produto");
  }
});

// Buscar produtos por grupo
router.get("/grupo/:grupo", async (req, res) => {
  const { grupo } = req.params;
  try {
    const [results] = await dbPromise.query(
      "SELECT * FROM produtos WHERE grupo = ?",
      [grupo]
    );
    if (results.length === 0) {
      return res.status(404).send("Produto não encontrado");
    }
    res.json(results);
  } catch (err) {
    console.error("Erro ao buscar produto:", err);
    res.status(500).send("Erro ao buscar produto");
  }
});

// Adicionar novo produto
router.post("/", async (req, res) => {
  const produto = req.body;
  try {
    const [result] = await dbPromise.query(
      "INSERT INTO produtos SET ?",
      produto
    );
    res.json({ id: result.insertId, ...produto });
  } catch (err) {
    console.error("Erro ao adicionar produto:", err);
    res.status(500).send("Erro ao adicionar produto");
  }
});

// Atualizar produto
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const produto = req.body;
  try {
    await dbPromise.query("UPDATE produtos SET ? WHERE id = ?", [produto, id]);
    res.json({ id, ...produto });
  } catch (err) {
    console.error("Erro ao atualizar produto:", err);
    res.status(500).send("Erro ao atualizar produto");
  }
});

// Excluir produto
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await dbPromise.query("DELETE FROM produtos WHERE id = ?", [id]);
    res.send("Produto deletado com sucesso");
  } catch (err) {
    console.error("Erro ao deletar produto:", err);
    res.status(500).send("Erro ao deletar produto");
  }
});

module.exports = router;
