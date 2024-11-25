const express = require("express");
const app = express();
const handlebars = require("express-handlebars").engine;
const bodyParser = require("body-parser");
const path = require("path");
const multer = require("multer");
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./projeto-firebase.json');

// Inicialização do Firebase
initializeApp({
  credential: cert(serviceAccount)
});
const db = getFirestore();

// Configuração do Handlebars
app.engine("handlebars", handlebars({
    defaultLayout: "main", // Usando o layout main.handlebars
    layoutsDir: path.join(__dirname, "views", "layouts"), // Definindo o diretório de layouts
}));
app.set("view engine", "handlebars");
app.set("views", path.join(__dirname, "views")); // Certificando-se que as views estão apontando para a pasta correta

// Configuração de arquivos estáticos
app.use(express.static(path.join(__dirname, "public"))); // Serve a pasta public corretamente

// Configuração do bodyParser
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "public/uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); 
    },
});
const upload = multer({ storage });

// Rotas
app.get("/", (req, res) => {
    res.render("index"); // Renderiza index.handlebars
});

app.get("/consultar", async (req, res) => {
    const produtosSnapshot = await db.collection('produtos').get();
    const produtos = produtosSnapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }));
    res.render("consultar", { produtos });
});

app.get("/editar/:id", async (req, res) => {
    const produtoRef = db.collection('produtos').doc(req.params.id);
    const produto = await produtoRef.get();
    if (!produto.exists) {
        return res.status(404).send('Produto não encontrado');
    }
    res.render("atualizar", { produto: { id: produto.id, data: produto.data() } });
});

app.post("/cadastrar", upload.single("imagem"), async (req, res) => {
    const { nome, preco, categoria, descricao } = req.body;
    const imagemPath = req.file ? `/uploads/${req.file.filename}` : null;
  
    await db.collection("produtos").add({
      nome,
      preco,
      categoria,
      descricao,
      imagemPath, 
    });
  
    res.redirect("/consultar");
});

app.post("/atualizar", async (req, res) => {
    const { id, nome, preco, categoria, descricao } = req.body;
    await db.collection("produtos").doc(id).update({
        nome, preco, categoria, descricao
    });
    res.redirect("/consultar");
});

app.get("/excluir/:id", async (req, res) => {
    const produtoRef = db.collection('produtos').doc(req.params.id);
    await produtoRef.delete();
    res.redirect("/consultar");
});

app.listen(3000, () => {
    console.log("Servidor rodando na porta 3000");
});
