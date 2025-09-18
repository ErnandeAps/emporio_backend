const express = require("express");
const router = express.Router();
const { dbPromise } = require("../db");

// Lista todas as cidades do CNPJ, incluindo o valor do frete
router.get("/", async (req, res) => {
  try {
    const { cnpj } = req.query;

    if (!cnpj) {
      return res.status(400).json({ erro: "CNPJ não informado" });
    }

    const [results] = await dbPromise.query(
      "SELECT idcidade, nome, valor_frete, obs FROM cidade WHERE cnpj = ? ORDER BY nome ASC",
      [cnpj]
    );

    res.json(results);
  } catch (err) {
    console.error("Erro ao listar as cidades:", err);
    res.status(500).send("Erro ao listar cidades");
  }
});

// Retorna apenas o frete de uma cidade específica
router.get("/frete", async (req, res) => {
  try {
    const { cnpj, cidade } = req.query;

    if (!cnpj || !cidade) {
      return res.status(400).json({ erro: "CNPJ e cidade são obrigatórios" });
    }

    const [rows] = await dbPromise.query(
      "SELECT valor_frete FROM cidade WHERE cnpj = ? AND nome = ? LIMIT 1",
      [cnpj, cidade]
    );

    if (rows.length === 0) {
      return res.status(404).json({ erro: "Cidade não encontrada" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Erro ao buscar frete:", err);
    res.status(500).send("Erro ao buscar frete");
  }
});

module.exports = router;
