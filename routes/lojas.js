const express = require("express");
const router = express.Router();
const { dbPromise } = require("../db");

router.get("/", async (req, res) => {
  try {
    const [results] = await dbPromise.query("SELECT * FROM lojas");
    res.json(results);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
