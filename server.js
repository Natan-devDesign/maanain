const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'segredo_super_seguro_maanaim'; 

// Garantir que o diretório de uploads existe
fs.mkdirSync(path.join(__dirname, 'public', 'uploads'), { recursive: true });

// Configuração do Multer (Upload de Imagens)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, uniqueSuffix + path.extname(file.originalname))
    }
});
const upload = multer({ storage: storage });

// Configuração do PostgreSQL
const pool = new Pool({
    user: process.env.PGUSER || 'postgres',
    host: process.env.PGHOST || 'localhost',
    database: process.env.PGDATABASE || 'maanaim',
    password: process.env.PGPASSWORD || '99354882',
    port: parseInt(process.env.PGPORT || '5432'),
});

// Middleware de Autenticação JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token == null) return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token inválido ou expirado.' });
        req.user = user;
        next();
    });
};

// Testar conexão e criar/atualizar tabelas
pool.connect(async (err, client, release) => {
    if (err) {
        console.error('Erro ao conectar ao PostgreSQL. Verifique sua senha.', err.stack);
    } else {
        console.log('Conectado ao PostgreSQL com sucesso!');
        
        const criarTabelas = `
            CREATE TABLE IF NOT EXISTS avisos (
                id SERIAL PRIMARY KEY,
                titulo VARCHAR(255) NOT NULL,
                data VARCHAR(50) NOT NULL,
                descricao TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS pedidos_oracao (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(255) NOT NULL,
                pedido TEXT NOT NULL,
                data VARCHAR(50) NOT NULL
            );

            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                login VARCHAR(50) UNIQUE NOT NULL,
                senha VARCHAR(255) NOT NULL
            );

            CREATE TABLE IF NOT EXISTS inscricoes (
                id SERIAL PRIMARY KEY,
                evento_id INTEGER NOT NULL,
                nome VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                telefone VARCHAR(50) NOT NULL,
                data_inscricao VARCHAR(50) NOT NULL
            );
        `;
        
        try {
            await client.query(criarTabelas);
            // Atualizar tabela avisos para suportar imagem (se a coluna não existir)
            await client.query(`ALTER TABLE avisos ADD COLUMN IF NOT EXISTS imagem TEXT;`);
            console.log('Tabelas verificadas/criadas no banco.');

            // Criar usuário admin padrão
            const userCheck = await client.query('SELECT * FROM usuarios WHERE login = $1', ['admin']);
            if (userCheck.rows.length === 0) {
                const salt = await bcrypt.genSalt(10);
                const hash = await bcrypt.hash('123456', salt);
                await client.query('INSERT INTO usuarios (login, senha) VALUES ($1, $2)', ['admin', hash]);
                console.log('Usuário admin padrão criado! Login: admin | Senha: 123456');
            }

            // Seed de avisos se a tabela estiver vazia
            const avisosCount = await client.query('SELECT COUNT(*) FROM avisos');
            if (parseInt(avisosCount.rows[0].count) === 0) {
                await client.query(`
                    INSERT INTO avisos (titulo, data, descricao, imagem) VALUES
                    ('Culto de Celebração e Ceia', '2026-07-05', 'Venha participar do nosso culto principal de domingo. Neste dia teremos a Santa Ceia do Senhor, um momento de muita comunhão e reflexão espiritual.', '/uploads/ceia.png'),
                    ('Encontro de Jovens (Geração Eleita)', '2026-07-11', 'Uma noite especial para a juventude com muito louvor, dinâmicas e uma palavra direcionada para os desafios dessa geração. Traga um amigo!', '/uploads/jovens.png'),
                    ('Reunião de Oração e Intercessão', '2026-07-08', 'Culto dedicado inteiramente à oração pelos pedidos da igreja, pelas famílias e pela nação. Venha clamar conosco pelo mover de Deus.', '/uploads/oracao.png'),
                    ('Escola Bíblica Dominical (EBD)', '2026-07-12', 'Estudo aprofundado das escrituras para todas as idades. Classes divididas por faixa etária com professores preparados para tirar suas dúvidas.', '/uploads/ebd.png'),
                    ('Culto das Mulheres (Chá de Comunhão)', '2026-07-18', 'Um momento exclusivo para as mulheres da nossa congregação. Teremos uma palavra encorajadora, louvor e, em seguida, um delicioso chá de comunhão.', '/uploads/mulheres.png'),
                    ('Mutirão Solidário - Entrega de Cestas', '2026-07-25', 'Ação social organizada pela igreja para montagem e distribuição de cestas básicas para famílias carentes da nossa comunidade.', '/uploads/social.png');
                `);
                console.log('Seed de avisos inserido (6 eventos).');
            }

            // Seed de pedidos de oração se a tabela estiver vazia
            const pedidosCount = await client.query('SELECT COUNT(*) FROM pedidos_oracao');
            if (parseInt(pedidosCount.rows[0].count) === 0) {
                await client.query(`
                    INSERT INTO pedidos_oracao (nome, pedido, data) VALUES
                    ('tese', 'asdasd', '01/07/2026, 16:12:23'),
                    ('Jose da silva', 'Portas de emprego', '01/07/2026, 16:58:47'),
                    ('Jose da silva', 'sfsf', '01/07/2026, 16:58:58'),
                    ('asd', 'adasd', '01/07/2026, 17:01:01'),
                    ('Carmelina', 'Preciso de libertação', '03/07/2026, 09:10:25');
                `);
                console.log('Seed de pedidos de oração inserido (5 registros).');
            }

        } catch (tableErr) {
            console.error('Erro ao criar/atualizar tabelas', tableErr.stack);
        } finally {
            release();
        }
    }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// ROTAS DE AUTENTICAÇÃO
// ==========================================
app.post('/api/login', async (req, res) => {
    const { login, senha } = req.body;
    try {
        const result = await pool.query('SELECT * FROM usuarios WHERE login = $1', [login]);
        if (result.rows.length === 0) return res.status(401).json({ error: 'Usuário não encontrado.' });
        
        const user = result.rows[0];
        const senhaValida = await bcrypt.compare(senha, user.senha);
        if (!senhaValida) return res.status(401).json({ error: 'Senha incorreta.' });

        const token = jwt.sign({ id: user.id, login: user.login }, JWT_SECRET, { expiresIn: '2h' });
        res.json({ token, message: 'Login bem-sucedido!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno.' });
    }
});

// ==========================================
// ROTAS PÚBLICAS
// ==========================================
app.get('/api/avisos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM avisos ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar avisos.' });
    }
});

app.get('/api/avisos/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM avisos WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Evento não encontrado.' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar o evento.' });
    }
});

app.post('/api/pedidos', async (req, res) => {
    const nome = req.body.nome || "Anônimo";
    const pedido = req.body.pedido;
    const dataAtual = new Date().toLocaleString('pt-BR');

    try {
        const query = 'INSERT INTO pedidos_oracao (nome, pedido, data) VALUES ($1, $2, $3) RETURNING *';
        await pool.query(query, [nome, pedido, dataAtual]);
        res.status(201).json({ message: "Pedido salvo!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao salvar pedido.' });
    }
});

app.post('/api/inscricoes', async (req, res) => {
    const { evento_id, nome, email, telefone } = req.body;
    const dataAtual = new Date().toLocaleString('pt-BR');

    try {
        const query = 'INSERT INTO inscricoes (evento_id, nome, email, telefone, data_inscricao) VALUES ($1, $2, $3, $4, $5)';
        await pool.query(query, [evento_id, nome, email, telefone, dataAtual]);
        res.status(201).json({ message: "Inscrição confirmada!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao salvar inscrição.' });
    }
});

// ==========================================
// ROTAS PROTEGIDAS (Admin)
// ==========================================
app.get('/api/inscricoes/:evento_id', authenticateToken, async (req, res) => {
    const { evento_id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM inscricoes WHERE evento_id = $1 ORDER BY id DESC', [evento_id]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar inscrições.' });
    }
});
app.get('/api/pedidos', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM pedidos_oracao ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar pedidos.' });
    }
});

// Cadastrar aviso com Upload de Imagem
app.post('/api/avisos', authenticateToken, upload.single('imagem'), async (req, res) => {
    const { titulo, data, descricao } = req.body;
    let imagemPath = null;
    
    if (req.file) {
        imagemPath = '/uploads/' + req.file.filename;
    }

    try {
        const query = 'INSERT INTO avisos (titulo, data, descricao, imagem) VALUES ($1, $2, $3, $4) RETURNING *';
        const values = [titulo, data, descricao, imagemPath];
        const result = await pool.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao salvar aviso com imagem.' });
    }
});

// Atualizar aviso com Upload de Imagem opcional
app.put('/api/avisos/:id', authenticateToken, upload.single('imagem'), async (req, res) => {
    const { id } = req.params;
    const { titulo, data, descricao } = req.body;
    
    try {
        if (req.file) {
            const imagemPath = '/uploads/' + req.file.filename;
            const query = 'UPDATE avisos SET titulo = $1, data = $2, descricao = $3, imagem = $4 WHERE id = $5 RETURNING *';
            const values = [titulo, data, descricao, imagemPath, id];
            const result = await pool.query(query, values);
            res.json(result.rows[0]);
        } else {
            const query = 'UPDATE avisos SET titulo = $1, data = $2, descricao = $3 WHERE id = $4 RETURNING *';
            const values = [titulo, data, descricao, id];
            const result = await pool.query(query, values);
            res.json(result.rows[0]);
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao atualizar aviso.' });
    }
});

// Excluir aviso
app.delete('/api/avisos/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM avisos WHERE id = $1', [id]);
        res.json({ message: 'Aviso excluído com sucesso.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao excluir aviso.' });
    }
});

// Fallback Route
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`[Servidor Cloudflare Style com Imagens] Protótipo rodando em http://localhost:${PORT}`);
});
