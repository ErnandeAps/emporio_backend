const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const router = express.Router();

// Pasta base das imagens de categorias
const pastaBase = path.join(__dirname, "..", "/imagens/categorias");

// Configuração do multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const cnpj = req.query.cnpj; // cnpj enviado na query
    if (!cnpj) return cb(new Error("CNPJ não informado"));

    const dir = path.join(pastaBase, cnpj);

    // cria a pasta do CNPJ se não existir
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const nome = req.query.nome; // nome do arquivo enviado
    if (!nome) return cb(new Error("Nome do arquivo não informado"));

    cb(null, nome); // salva com o nome enviado, ex: 2.png
  },
});

const upload = multer({ storage });

// ▶️ ROTA DE UPLOAD
// POST /api/categorias?cnpj=55529387000160&nome=2.png
router.post("/", upload.single("imagem"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ erro: "Nenhum arquivo enviado" });
  }

  res.status(201).json({
    mensagem: "Imagem enviada com sucesso",
    nome: req.file.filename,
    caminho: req.file.path.replace(/\\/g, "/"),
  });
});

// ❌ DELETE de uma imagem específica
// DELETE /api/categorias/:cnpj/:nome
router.delete("/:cnpj/:nome", (req, res) => {
  const { cnpj, nome } = req.params;
  const caminhoImagem = path.join(pastaBase, cnpj, nome);

  fs.access(caminhoImagem, fs.constants.F_OK, (err) => {
    if (err) return res.status(404).json({ erro: "Imagem não encontrada" });

    fs.unlink(caminhoImagem, (err) => {
      if (err)
        return res
          .status(500)
          .json({ erro: "Erro ao excluir imagem", detalhes: err.message });

      res.json({ mensagem: "Imagem excluída com sucesso" });
    });
  });
});

// ❌ DELETE de todas as imagens de um CNPJ
// DELETE /api/categorias/:cnpj
router.delete("/:cnpj", (req, res) => {
  const { cnpj } = req.params;
  const pastaCnpj = path.join(pastaBase, cnpj);

  fs.readdir(pastaCnpj, (err, arquivos) => {
    if (err) return res.status(404).json({ erro: "CNPJ não encontrado" });

    if (arquivos.length === 0) {
      return res.json({ mensagem: "Nenhum arquivo para excluir" });
    }

    let erros = [];
    arquivos.forEach((arquivo) => {
      const caminho = path.join(pastaCnpj, arquivo);
      try {
        fs.unlinkSync(caminho);
      } catch (e) {
        erros.push(arquivo);
      }
    });

    res.json({
      mensagem: "Arquivos excluídos (ou tentativa concluída)",
      erros: erros.length > 0 ? erros : undefined,
    });
  });
});

module.exports = router;
