const express = require("express");
const router = express.Router();
const { dbPromise } = require("../db");

router.get("/:device_id", async (req, res) => {
  const device_id = req.params.device_id.trim();
  const { cnpj } = req.params;

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
    const { cnpj } = req.query;
    //console.log("CNPJ recebido na query:", cnpj);

    if (!cnpj) {
      return res.status(400).json({ erro: "CNPJ não informado" });
    }

    const [results] = await dbPromise.query(
      "SELECT * FROM clientes WHERE cnpj = ?",
      [cnpj]
    );

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
  const { cnpj } = req.query;
  const cliente = req.body;

  console.log("Atualizando cliente:", { device_id, cnpj, cliente });

  try {
    const [result] = await dbPromise.query(
      "UPDATE clientes SET ? WHERE device_id = ? AND cnpj = ?",
      [cliente, device_id, cnpj]
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ erro: "Cliente não encontrado para este CNPJ" });
    }

    res.json({ device_id, cnpj, ...cliente });
  } catch (err) {
    console.error("Erro ao atualizar cliente:", err);
    res.status(500).send("Erro ao atualizar cliente");
  }
});

// 🔹 Excluir cliente
router.delete("/", async (req, res) => {
  const { device_id } = req.query;
  const { cnpj } = req.query;
  try {
    await dbPromise.query(
      "DELETE FROM clientes WHERE device_id = ? and cnpj = ?",
      [device_id, cnpj]
    );
    res.send("Cliente excluido com sucesso");
  } catch (err) {
    console.error("Erro ao deletar cliente:", err);
    res.status(500).send("Erro ao deletar cliente");
  }
});

module.exports = router;
