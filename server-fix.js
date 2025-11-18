const express = require('express');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');

const app = express();
const PORT = 80;

console.log('🛠️  INICIANDO CONFIGURAÇÃO DO SERVIDOR...');

// Função para executar comandos como admin
function runCommand(command) {
    return new Promise((resolve) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.log(`❌ Erro: ${error.message}`);
                resolve(false);
            } else {
                console.log(`✅ Comando executado: ${command}`);
                resolve(true);
            }
        });
    });
}

// Liberar porta 80
async function freePort80() {
    console.log('\n🔧 LIBERANDO PORTA 80...');
    
    const commands = [
        'net stop http /y',
        'iisreset /stop',
        'sc stop http',
        'net stop was /y'
    ];
    
    for (const cmd of commands) {
        await runCommand(cmd);
    }
    
    // Aguardar 3 segundos
    await new Promise(resolve => setTimeout(resolve, 3000));
}

// Configurar servidor
app.use(express.static(path.join(__dirname, 'public')));

// Rotas
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/html/index.html'));
});

app.get('/Home.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/html/index.html'));
});

app.get('/Projects.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/html/projects.html'));
});

app.get('/Animation.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/html/animation.html'));
});

app.get('/Copy.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/html/copy.html'));
});

app.get('/Guess.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/html/guess.html'));
});

app.get('/Canvas.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/html/canvas.html'));
});

app.get('/style.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/style/style.css'));
});

app.get('/img/:imageName', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/img', req.params.imageName));
});

app.get('*', (req, res) => {
    res.status(404).send('Página não encontrada');
});

// Iniciar servidor
async function startServer() {
    console.log('🚀 INICIANDO SERVIDOR NA PORTA 80...\n');
    
    // Primeiro libere a porta 80
    await freePort80();
    
    // Verificar se a porta está livre
    exec('netstat -ano | findstr :80', async (error, stdout) => {
        if (stdout) {
            console.log('\n❌ AINDA HÁ PROCESSOS NA PORTA 80:');
            console.log(stdout);
            console.log('\n💡 SOLUÇÃO MANUAL REQUERIDA:');
            console.log('   1. Abra o Gerenciador de Tarefas (Ctrl+Shift+Esc)');
            console.log('   2. Vá em "Detalhes"');
            console.log('   3. Encontre o processo com PID 4');
            console.log('   4. Clique direito e "Finalizar tarefa"');
            console.log('   5. Execute: net stop http /y');
            console.log('\n🔄 Usando porta alternativa 3000 temporariamente...');
            
            // Iniciar na porta 3000 como fallback
            const fallbackApp = express();
            fallbackApp.use(express.static(path.join(__dirname, 'public')));
            
            // Copiar todas as rotas
            const router = express.Router();
            Object.keys(app._router.stack).forEach(key => {
                const layer = app._router.stack[key];
                if (layer.route) {
                    fallbackApp[layer.route.stack[0].method](layer.route.path, layer.route.stack[0].handle);
                }
            });
            
            fallbackApp.listen(3000, '0.0.0.0', () => {
                const localIP = getLocalIP();
                console.log('\n' + '='.repeat(60));
                console.log('🚀 SERVIDOR RODANDO NA PORTA 3000 (MODO EMERGÊNCIA)');
                console.log('='.repeat(60));
                console.log(`📍 ACESSO LOCAL:  http://localhost:3000`);
                console.log(`📍 ACESSO NA REDE: http://${localIP}:3000`);
                console.log('='.repeat(60));
            });
            
        } else {
            // Porta 80 está livre, iniciar servidor
            app.listen(PORT, '0.0.0.0', () => {
                const localIP = getLocalIP();
                console.log('\n' + '='.repeat(60));
                console.log('🎉 SERVIDOR RODANDO NA PORTA 80!');
                console.log('='.repeat(60));
                console.log(`📍 ACESSO LOCAL:  http://localhost`);
                console.log(`📍 ACESSO NA REDE: http://${localIP}`);
                console.log('='.repeat(60));
            });
        }
    });
}

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

// Iniciar
startServer();