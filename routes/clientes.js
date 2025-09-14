const express = require("express");
const router = express.Router();
const { dbPromise } = require("../db");

router.get("/:device_id", async (req, res) => {
  const device_id = req.params.device_id.trim();

  try {
    const [results] = await dbPromise.query(
      "SELECT * FROM clientes WHERE device_id = ?",
      [device_id]
    );
    res.json(results);
  } catch (err) {
    console.error("Erro ao listar clientes:", err);
    res.status(500).send("Erro ao listar clientes");
  }
});

// 🔹 Listar todos os clientes
router.get("/", async (req, res) => {
  try {
    const [results] = await dbPromise.query("SELECT * FROM clientes");
    res.json(results);
  } catch (err) {
    console.error("Erro ao listar clientes:", err);
    res.status(500).send("Erro ao listar clientes");
  }
});

// 🔹 Adicionar novo cliente
router.post("/", async (req, res) => {
  const cliente = req.body;
  try {
    const [result] = await dbPromise.query(
      "INSERT INTO clientes SET ?",
      cliente
    );
    res.json({ id: result.insertId, ...cliente });
  } catch (err) {
    console.error("Erro ao adicionar cliente:", err);
    res.status(500).send("Erro ao adicionar cliente");
  }
});

// 🔹 Atualizar cliente
router.put("/:device_id", async (req, res) => {
  const { device_id } = req.params;

  const cliente = req.body;
  try {
    await dbPromise.query("UPDATE clientes SET ? WHERE device_Id = ?", [
      cliente,
      device_id,
    ]);
    res.json({ device_id, ...cliente });
  } catch (err) {
    console.error("Erro ao atualizar cliente:", err);
    res.status(500).send("Erro ao atualizar cliente");
  }
});

// 🔹 Excluir cliente
router.delete("/:device_id", async (req, res) => {
  const { device_id } = req.params;
  try {
    await dbPromise.query("DELETE FROM clientes WHERE device_id = ?", [
      device_id,
    ]);
    res.send("Cliente deletado com sucesso");
  } catch (err) {
    console.error("Erro ao deletar cliente:", err);
    res.status(500).send("Erro ao deletar cliente");
  }
});

module.exports = router;
