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
      "SELECT * FROM categorias WHERE cnpj = ?",
      [cnpj]
    );

    res.json(results);
  } catch (err) {
    console.error("Erro ao lista as categorias:", err);
    res.status(500).send("Erro ao listar categorias");
  }
});

module.exports = router;
