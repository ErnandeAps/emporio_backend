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
      "SELECT * FROM promocoes WHERE cnpj = ?",
      [cnpj]
    );
    res.json(results);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
