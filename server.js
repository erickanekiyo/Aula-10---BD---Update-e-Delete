const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const fs = require('fs');

const app = express();
const PORT = 80;

// Configurar EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Model do Post
const postSchema = new mongoose.Schema({
    titulo: { type: String, required: true },
    resumo: { type: String, required: true },
    conteudo: { type: String, required: true },
    dataCriacao: { type: Date, default: Date.now }
});

const Post = mongoose.model('Post', postSchema);

//MIDDLEWARE DE AUTENTICAÇÃO SIMPLES
const verificarAutenticacao = (req, res, next) => {
    // Simulação simples de autenticação - em produção usar sessions/JWT
    if (req.path === '/carros/login' || req.path === '/carros/cadastrar-usuario') {
        return next();
    }
    next();
};

app.use(verificarAutenticacao);

// Model do Usuário
const usuarioSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    login: { type: String, required: true, unique: true },
    senha: { type: String, required: true }
});

// Model do Carro
const carroSchema = new mongoose.Schema({
    marca: { type: String, required: true },
    modelo: { type: String, required: true },
    ano: { type: Number, required: true },
    qtde_disponivel: { type: Number, required: true, min: 0 }
});

const Usuario = mongoose.model('Usuario', usuarioSchema);
const Carro = mongoose.model('Carro', carroSchema);

// Conectar ao MongoDB Atlas
const MONGODB_URI = 'mongodb+srv://userFei:passfei20@serverfei.y5vof3e.mongodb.net/?appName=serverFei';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('Conectado ao MongoDB Atlas'))
    .catch(err => {
        console.log('Erro ao conectar MongoDB Atlas:', err.message);
        console.log('Verifique:');
        console.log('   1. Se a senha está correta');
        console.log('   2. Se o IP está na whitelist do MongoDB Atlas');
        console.log('   3. Se a conexão de internet está estável');
    });

// ===== ROTAS PRINCIPAIS =====

// Rota padrão direciona para projetos
app.get('/', (req, res) => {
    res.redirect('/Projects.html');
});

// ===== ROTAS DO BLOG =====

// Página de login
app.get('/carros/login', (req, res) => {
    res.render('carros/login', { erro: null });
});

// Processar login
app.post('/carros/login', async (req, res) => {
    try {
        const { login, senha } = req.body;
        const usuario = await Usuario.findOne({ login, senha });
        
        if (usuario) {
            // Login bem-sucedido - redirecionar para gestão
            res.redirect('/carros/gestao');
        } else {
            res.render('carros/login', { 
                erro: 'Login ou senha incorretos' 
            });
        }
    } catch (error) {
        res.render('carros/login', { 
            erro: 'Erro no servidor' 
        });
    }
});

// Página de cadastro de usuário
app.get('/carros/cadastrar-usuario', (req, res) => {
    res.render('carros/cadastrar-usuario', { erro: null, sucesso: null });
});

// Processar cadastro de usuário
app.post('/carros/cadastrar-usuario', async (req, res) => {
    try {
        const { nome, login, senha } = req.body;
        
        const usuarioExistente = await Usuario.findOne({ login });
        if (usuarioExistente) {
            return res.render('carros/cadastrar-usuario', { 
                erro: 'Login já está em uso',
                sucesso: null
            });
        }
        
        const novoUsuario = new Usuario({ nome, login, senha });
        await novoUsuario.save();
        
        res.render('carros/cadastrar-usuario', { 
            erro: null,
            sucesso: 'Usuário cadastrado com sucesso!'
        });
    } catch (error) {
        res.render('carros/cadastrar-usuario', { 
            erro: 'Erro ao cadastrar usuário',
            sucesso: null
        });
    }
});

// Página de gestão de carros
app.get('/carros/gestao', async (req, res) => {
    try {
        const carros = await Carro.find().sort({ marca: 1, modelo: 1 });
        res.render('carros/gestao', { 
            carros,
            sucesso: req.query.sucesso,
            erro: req.query.erro
        });
    } catch (error) {
        res.render('carros/gestao', { 
            carros: [],
            erro: 'Erro ao carregar carros'
        });
    }
});

// Página para cadastrar novo carro
app.get('/carros/novo', (req, res) => {
    res.render('carros/novo-carro', { erro: null });
});

// Processar cadastro de novo carro
app.post('/carros/novo', async (req, res) => {
    try {
        const { marca, modelo, ano, qtde_disponivel } = req.body;
        
        const novoCarro = new Carro({
            marca: marca.trim(),
            modelo: modelo.trim(),
            ano: parseInt(ano),
            qtde_disponivel: parseInt(qtde_disponivel)
        });
        
        await novoCarro.save();
        res.redirect('/carros/gestao?sucesso=Carro cadastrado com sucesso');
        
    } catch (error) {
        res.render('carros/novo-carro', { 
            erro: 'Erro ao cadastrar carro. Verifique os dados.'
        });
    }
});

// Página para editar carro
app.get('/carros/editar/:id', async (req, res) => {
    try {
        const carro = await Carro.findById(req.params.id);
        if (!carro) {
            return res.redirect('/carros/gestao?erro=Carro não encontrado');
        }
        res.render('carros/editar-carro', { carro, erro: null });
    } catch (error) {
        res.redirect('/carros/gestao?erro=Erro ao carregar carro');
    }
});

// Processar edição de carro
app.post('/carros/editar/:id', async (req, res) => {
    try {
        const { marca, modelo, ano, qtde_disponivel } = req.body;
        
        await Carro.findByIdAndUpdate(req.params.id, {
            marca: marca.trim(),
            modelo: modelo.trim(),
            ano: parseInt(ano),
            qtde_disponivel: parseInt(qtde_disponivel)
        });
        
        res.redirect('/carros/gestao?sucesso=Carro atualizado com sucesso');
        
    } catch (error) {
        res.render('carros/editar-carro', { 
            carro: req.body,
            erro: 'Erro ao atualizar carro'
        });
    }
});

// Processar venda de carro
app.post('/carros/vender/:id', async (req, res) => {
    try {
        const carro = await Carro.findById(req.params.id);
        
        if (!carro) {
            return res.redirect('/carros/gestao?erro=Carro não encontrado');
        }
        
        if (carro.qtde_disponivel <= 0) {
            return res.redirect('/carros/gestao?erro=Carro esgotado');
        }
        
        carro.qtde_disponivel -= 1;
        await carro.save();
        
        res.redirect('/carros/gestao?sucesso=Carro vendido com sucesso');
        
    } catch (error) {
        res.redirect('/carros/gestao?erro=Erro ao processar venda');
    }
});

// Processar remoção de carro
app.post('/carros/remover/:id', async (req, res) => {
    try {
        await Carro.findByIdAndDelete(req.params.id);
        res.redirect('/carros/gestao?sucesso=Carro removido com sucesso');
    } catch (error) {
        res.redirect('/carros/gestao?erro=Erro ao remover carro');
    }
});

// Página do blog - lista todos os posts
app.get('/blog', async (req, res) => {
    try {
        const posts = await Post.find().sort({ dataCriacao: -1 });
        console.log(`📝 Encontrados ${posts.length} posts`);
        res.render('blog', { posts });
    } catch (error) {
        console.error('❌ Erro ao buscar posts:', error);
        res.render('blog', { 
            posts: [],
            erro: 'Erro ao carregar posts. Tente novamente.'
        });
    }
});

// Página para cadastrar novo post
app.get('/cadastrar_post', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/html/cadastrar_post.html'));
});

// Processar cadastro de novo post
app.post('/cadastrar-post', async (req, res) => {
    try {
        const { titulo, resumo, conteudo } = req.body;
        
        console.log('📝 Tentativa de criar post:', { titulo, resumo });
        
        // Validar dados
        if (!titulo || !resumo || !conteudo) {
            return res.status(400).render('erro', { 
                mensagem: 'Todos os campos são obrigatórios!' 
            });
        }
        
        // Criar novo post
        const novoPost = new Post({
            titulo: titulo.trim(),
            resumo: resumo.trim(),
            conteudo: conteudo.trim()
        });
        
        await novoPost.save();
        console.log('✅ Novo post criado no MongoDB Atlas:', titulo);
        res.redirect('/blog');
        
    } catch (error) {
        console.error('❌ Erro ao criar post:', error);
        res.status(500).render('erro', { 
            mensagem: 'Erro interno do servidor. Tente novamente.' 
        });
    }
});

// API para buscar todos os posts (para testes)
app.get('/api/posts', async (req, res) => {
    try {
        const posts = await Post.find().sort({ dataCriacao: -1 });
        res.json({
            sucesso: true,
            total: posts.length,
            posts: posts
        });
    } catch (error) {
        res.status(500).json({ 
            sucesso: false,
            error: 'Erro ao buscar posts' 
        });
    }
});

// Rota para limpar posts (apenas para desenvolvimento)
app.delete('/api/posts', async (req, res) => {
    try {
        await Post.deleteMany({});
        res.json({ sucesso: true, mensagem: 'Todos os posts foram removidos' });
    } catch (error) {
        res.status(500).json({ sucesso: false, error: error.message });
    }
});

//ROTAS ESTÁTICAS EXISTENTES

app.get('/Home.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/html/index.html'));
});

app.get('/Projects.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/html/projects.html'));
});

app.get('/Animation.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/html/animation.html'));
});

app.get('/cadastra', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/html/cadastro.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/html/login.html'));
});

//ROTAS PARA ARQUIVOS ESTÁTICOS

app.get('/style.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/style/style.css'));
});

app.get('/img/:imageName', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/img', req.params.imageName));
});

//PÁGINA DE ERRO
app.get('/erro', (req, res) => {
    res.render('erro', { mensagem: 'Erro desconhecido' });
});

//ROTA DE FALLBACK
app.get('*', (req, res) => {
    res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Página Não Encontrada</title>
            <style>
                body { 
                    font-family: "Inter", sans-serif;
                    background: linear-gradient(180deg, #0f111a, #181b25);
                    color: #e4e6eb;
                    text-align: center;
                    padding: 50px;
                }
                h1 { color: #6ab7ff; }
                a { color: #6ab7ff; text-decoration: none; }
                a:hover { text-decoration: underline; }
            </style>
        </head>
        <body>
            <h1>Página Não Encontrada</h1>
            <p><a href="/">Voltar para a página inicial</a></p>
        </body>
        </html>
    `);
});

//INICIAR SERVIDOR
app.listen(PORT, '0.0.0.0', () => {
    const localIP = getLocalIP();
    console.log('='.repeat(60));
    console.log('🚀 BLOG COM MONGODB ATLAS RODANDO!');
    console.log('🚀 SISTEMA DE CARROS RODANDO!');
    console.log('='.repeat(60));
    console.log(`📍 Porta: ${PORT}`);
    console.log(`📍 Local: http://localhost:${PORT}`);
    console.log(`📍 Rede:  http://${localIP}:${PORT}`);
    console.log('='.repeat(60));
    console.log('📁 PÁGINAS DO BLOG:');
    console.log(`   • http://localhost:${PORT}/blog`);
    console.log(`   • http://localhost:${PORT}/cadastrar_post`);
    console.log(`   • http://localhost:${PORT}/api/posts (API)`);
    console.log(`   • http://localhost:${PORT}/carros`);
    console.log(`   • http://localhost:${PORT}/carros/login`);
    console.log(`   • http://localhost:${PORT}/carros/gestao`);
    console.log('='.repeat(60));
    console.log('🔗 MongoDB Atlas: Conectado ao cluster serverFei');
    console.log('='.repeat(60));
});

function getLocalIP() {
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return 'SEU_IP_LOCAL';
}

// Tratamento gracioso de desligamento
process.on('SIGINT', async () => {
    console.log('\n🔄 Desconectando do MongoDB...');
    await mongoose.connection.close();
    console.log('✅ Conexão fechada. Servidor encerrado.');
    process.exit(0);
});