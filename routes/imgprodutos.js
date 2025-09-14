const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const router = express.Router();

// Diretório onde as imagens serão salvas
const pastaImagens = path.join(__dirname, "..", "/imagens/produtos");

// Configuração do multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, pastaImagens);
  },
  filename: (req, file, cb) => {
    // Salva com o nome original
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

// ▶️ ROTA DE UPLOAD
// POST /api/imagens
router.post("/", upload.single("imagem"), (req, res) => {
  console.log("req: ", req);
  if (!req.file) {
    return res.status(400).json({ erro: "Nenhum arquivo enviado" });
  }

  res.status(201).json({
    mensagem: "Imagem enviada com sucesso",
    nome: req.file.filename,
    caminho: `/imagens/produtos/${req.file.filename}`,
  });
});

// ❌ ROTA DE EXCLUSÃO
// DELETE /api/imagens/:nome
router.delete("/:nome", (req, res) => {
  const nomeImagem = req.params.nome;
  const caminhoImagem = path.join(pastaImagens, nomeImagem);

  fs.access(caminhoImagem, fs.constants.F_OK, (err) => {
    if (err) {
      return res.status(404).json({ erro: "Imagem não encontrada" });
    }

    fs.unlink(caminhoImagem, (err) => {
      if (err) {
        return res
          .status(500)
          .json({ erro: "Erro ao excluir imagem", detalhes: err.message });
      }

      res.json({ mensagem: "Imagem excluída com sucesso" });
    });
  });
});

// DELETE /api/imagens (deleta todas)
router.delete("/", (req, res) => {
  fs.readdir(pastaImagens, (err, arquivos) => {
    if (err) {
      return res
        .status(500)
        .json({ erro: "Erro ao listar arquivos", detalhes: err.message });
    }

    if (arquivos.length === 0) {
      return res.json({ mensagem: "Nenhum arquivo para excluir" });
    }

    let erros = [];
    arquivos.forEach((arquivo) => {
      const caminho = path.join(pastaImagens, arquivo);
      fs.unlink(caminho, (erro) => {
        if (erro) erros.push(arquivo);
      });
    });

    res.json({
      mensagem: "Arquivos excluídos (ou tentativa iniciada)",
      erros: erros.length > 0 ? erros : undefined,
    });
  });
});
module.exports = router;
