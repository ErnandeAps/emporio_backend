const express = require("express");
const router = express.Router();
const { dbPromise } = require("../db");

router.get("/", async (req, res) => {
  try {
    const { cnpj } = req.query;

    if (!cnpj) {
      return res.status(400).json({ erro: "CNPJ não informado" });
    }

    const [results] = await dbPromise.query(
      "SELECT idcidade, nome, uf FROM cidade WHERE cnpj = ? ORDER BY nome ASC",
      [cnpj]
    );

    res.json(results);
  } catch (err) {
    console.error("Erro ao lista as cidades:", err);
    res.status(500).send("Erro ao listar cidades");
  }
});

module.exports = router;
