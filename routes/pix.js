const express = require("express");
const router = express.Router();

function calcularCRC16(payload) {
  let polinomio = 0x1021;
  let resultado = 0xffff;

  for (let i = 0; i < payload.length; i++) {
    resultado ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((resultado & 0x8000) !== 0) {
        resultado = (resultado << 1) ^ polinomio;
      } else {
        resultado <<= 1;
      }
    }
  }

  return (resultado & 0xffff).toString(16).toUpperCase().padStart(4, "0");
}

function formatarTLV(id, valor) {
  return id + valor.length.toString().padStart(2, "0") + valor;
}

function gerarPayloadPIX({ chave, nome, cidade, valor, descricao }) {
  // Merchant Account Information (26)
  const gui = formatarTLV("00", "BR.GOV.BCB.PIX");
  const chavePix = formatarTLV("01", chave);
  const contaPix = formatarTLV("26", gui + chavePix);

  const payload =
    formatarTLV("00", "01") + // Payload Format Indicator
    // formatarTLV("01", "12") + // Point of Initiation Method (opcional)
    contaPix +
    formatarTLV("52", "0000") +
    formatarTLV("53", "986") +
    (valor ? formatarTLV("54", parseFloat(valor).toFixed(2)) : "") +
    formatarTLV("58", "BR") +
    formatarTLV("59", nome.substring(0, 25)) +
    formatarTLV("60", cidade.substring(0, 15)) +
    formatarTLV("62", formatarTLV("05", descricao || "***")) +
    "6304";

  const crc = calcularCRC16(payload);
  return payload + crc;
}

router.post("/", (req, res) => {
  const { valor, descricao } = req.body;

  if (!valor || !descricao) {
    return res
      .status(400)
      .json({ error: "Valor e descrição são obrigatórios." });
  }

  const payload = gerarPayloadPIX({
    chave: "55.442.480/0001-32", // ou CNPJ, etc.
    nome: "New Word Pest",
    cidade: "NATAL",
    valor,
    descricao,
  });

  console.log("Payload gerado:", payload);
  res.json({ payload });
});

module.exports = router;
