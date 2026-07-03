// Sistema de Notificações
function showNotification(message, isError = false) {
    const notif = document.getElementById('notification');
    if (!notif) return;
    notif.textContent = message;
    if (isError) notif.classList.add('error');
    else notif.classList.remove('error');
    
    notif.classList.add('show');
    setTimeout(() => {
        notif.classList.remove('show');
    }, 3000);
}

// Helpers de Token
const getToken = () => localStorage.getItem('token');
const setToken = (token) => localStorage.setItem('token', token);
const removeToken = () => localStorage.removeItem('token');

// ==========================================
// TELA: LOGIN
// ==========================================
if (document.getElementById('form-login')) {
    document.getElementById('form-login').addEventListener('submit', async (e) => {
        e.preventDefault();
        const login = document.getElementById('login-user').value;
        const senha = document.getElementById('login-senha').value;

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login, senha })
            });

            const data = await res.json();
            
            if (res.ok) {
                setToken(data.token);
                window.location.href = 'admin.html';
            } else {
                showNotification(data.error || "Erro de login", true);
            }
        } catch (error) {
            console.error(error);
            showNotification("Erro ao conectar no servidor", true);
        }
    });
}

// ==========================================
// TELA: ORAÇÃO (Formulário)
// ==========================================
if (document.getElementById('form-oracao')) {
    document.getElementById('form-oracao').addEventListener('submit', async (e) => {
        e.preventDefault();
        const nome = document.getElementById('nome-oracao').value;
        const pedido = document.getElementById('texto-oracao').value;

        try {
            const res = await fetch('/api/pedidos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, pedido })
            });

            if (res.ok) {
                document.getElementById('modal-sucesso-oracao').classList.add('active');
                document.getElementById('form-oracao').reset();
            } else {
                showNotification("Erro ao enviar pedido.", true);
            }
        } catch (error) {
            console.error("Erro:", error);
        }
    });
}

// ==========================================
// TELA: EVENTO ÚNICO (Detalhes)
// ==========================================
if (document.getElementById('evento-container')) {
    const carregarEvento = async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('id');
        const container = document.getElementById('evento-container');

        if (!id) {
            container.innerHTML = '<div class="card text-center">Evento não encontrado. <br><br><a href="eventos.html">Voltar para Agenda</a></div>';
            return;
        }

        try {
            const response = await fetch('/api/avisos/' + id);
            
            if (!response.ok) {
                container.innerHTML = '<div class="card text-center">Evento não encontrado ou indisponível. <br><br><a href="eventos.html">Voltar para Agenda</a></div>';
                return;
            }
            
            const aviso = await response.json();
            
            const imgTag = aviso.imagem ? `<img src="${aviso.imagem}" style="width: 100%; height: 350px; object-fit: cover; border-radius: 8px; margin-bottom: 2rem;" alt="Capa do evento">` : '';
            
            document.title = aviso.titulo + " - Maanaim";
            
            container.innerHTML = `
                ${imgTag}
                <div style="background-color: var(--bg-main); padding: 3rem; border-radius: 8px; border: 1px solid var(--border-color); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem;">
                        <h2 style="font-size: 2.2rem; color: var(--cf-blue); font-weight: 800;">${aviso.titulo}</h2>
                        <span style="font-size: 1rem; color: white; background-color: var(--cf-orange); padding: 0.5rem 1rem; border-radius: 20px; font-weight: 600;">${aviso.data}</span>
                    </div>
                    <p style="font-size: 1.15rem; line-height: 1.8; color: var(--text-muted); white-space: pre-wrap;">${aviso.descricao}</p>
                    
                    <hr style="margin: 3rem 0; border: none; border-top: 1px solid var(--border-color);">
                    
                    <div style="background-color: var(--bg-secondary); padding: 2rem; border-radius: 8px;">
                        <h3 style="margin-bottom: 1.5rem; text-align: center; color: var(--cf-blue);">Confirme sua Presença</h3>
                        <form id="form-inscricao">
                            <input type="hidden" id="inscricao-evento-id" value="${aviso.id}">
                            <div style="display: grid; grid-template-columns: 1fr; gap: 1rem;">
                                <div>
                                    <label for="inscricao-nome">Nome Completo</label>
                                    <input type="text" id="inscricao-nome" style="width: 100%; margin-top: 0.5rem;" required>
                                </div>
                                <div>
                                    <label for="inscricao-email">E-mail</label>
                                    <input type="email" id="inscricao-email" style="width: 100%; margin-top: 0.5rem;" required>
                                </div>
                                <div>
                                    <label for="inscricao-telefone">WhatsApp</label>
                                    <input type="text" id="inscricao-telefone" style="width: 100%; margin-top: 0.5rem;" required>
                                </div>
                            </div>
                            <button type="submit" style="width: 100%; margin-top: 1.5rem; background-color: var(--cf-orange); color: white;">Confirmar Presença</button>
                        </form>
                    </div>

                    <div style="margin-top: 3rem; text-align: center;">
                        <a href="eventos.html"><button style="background-color: transparent; border: 1px solid var(--text-muted); color: var(--text-muted);">← Voltar para Agenda</button></a>
                    </div>
                </div>
            `;

            // Lógica de envio do formulário de inscrição
            document.getElementById('form-inscricao').addEventListener('submit', async (e) => {
                e.preventDefault();
                const btn = e.target.querySelector('button');
                const textOriginal = btn.innerText;
                btn.innerText = 'Enviando...';
                btn.disabled = true;

                const payload = {
                    evento_id: document.getElementById('inscricao-evento-id').value,
                    nome: document.getElementById('inscricao-nome').value,
                    email: document.getElementById('inscricao-email').value,
                    telefone: document.getElementById('inscricao-telefone').value
                };

                try {
                    const resInscricao = await fetch('/api/inscricoes', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    if (resInscricao.ok) {
                        alert('Inscrição confirmada com sucesso! Te esperamos no evento.');
                        e.target.reset();
                    } else {
                        alert('Erro ao confirmar inscrição.');
                    }
                } catch (err) {
                    alert('Erro de conexão ao enviar inscrição.');
                } finally {
                    btn.innerText = textOriginal;
                    btn.disabled = false;
                }
            });
        } catch (error) {
            console.error("Erro:", error);
            container.innerHTML = '<div class="card text-center">Erro ao carregar os detalhes do evento.</div>';
        }
    };
    carregarEvento();
}

// ==========================================
// TELA: INDEX (Cards de Eventos na Home)
// ==========================================
if (document.getElementById('lista-avisos-home')) {
    const carregarAvisosHome = async () => {
        try {
            const response = await fetch('/api/avisos');
            const avisos = await response.json();
            const grid = document.getElementById('lista-avisos-home');
            grid.innerHTML = '';
            
            if(avisos.length === 0) {
                grid.innerHTML = '<div class="card text-center" style="grid-column: 1 / -1;">Nenhum evento no momento.</div>';
                return;
            }

            // Exibir apenas os últimos 3 na Home
            const ultimosAvisos = avisos.slice(0, 3);

            ultimosAvisos.forEach(aviso => {
                const div = document.createElement('div');
                div.className = 'card';
                div.style.padding = '0'; 
                div.style.overflow = 'hidden';
                div.style.display = 'flex';
                div.style.flexDirection = 'column';
                
                const imgTag = aviso.imagem ? `<img src="${aviso.imagem}" class="card-image" alt="Capa do evento">` : '';
                
                div.innerHTML = `
                    ${imgTag}
                    <div style="padding: 1.5rem; display: flex; flex-direction: column; flex: 1;">
                        <span class="aviso-date">${aviso.data}</span>
                        <h3 style="margin-bottom: 0.5rem;">${aviso.titulo}</h3>
                        <p style="margin-bottom: 1.5rem; flex: 1; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;">${aviso.descricao}</p>
                        <a href="evento.html?id=${aviso.id}" style="text-decoration: none;"><button class="btn-secondary" style="width: 100%;">Saiba Mais →</button></a>
                    </div>
                `;
                grid.appendChild(div);
            });
        } catch (error) {
            console.error("Erro ao carregar avisos da home:", error);
            document.getElementById('lista-avisos-home').innerHTML = '<div class="card text-center" style="grid-column: 1 / -1;">Erro ao carregar a agenda.</div>';
        }
    };
    carregarAvisosHome();
}

// ==========================================
// TELA: EVENTOS (Listagem Pública Completa)
// ==========================================
if (document.getElementById('lista-avisos')) {
    const carregarAvisos = async () => {
        try {
            const response = await fetch('/api/avisos');
            const avisos = await response.json();
            const ul = document.getElementById('lista-avisos');
            ul.innerHTML = '';
            
            if(avisos.length === 0) {
                ul.innerHTML = '<li class="card text-center" style="grid-column: 1 / -1;">Nenhum evento agendado.</li>';
                return;
            }

            ul.classList.remove('avisos-list');
            ul.classList.add('events-grid');

            avisos.forEach(aviso => {
                const li = document.createElement('li');
                li.className = 'card';
                li.style.padding = '0';
                li.style.overflow = 'hidden';
                li.style.listStyle = 'none';
                li.style.display = 'flex';
                li.style.flexDirection = 'column';

                const imgTag = aviso.imagem ? `<img src="${aviso.imagem}" class="card-image" alt="Capa do evento">` : '';
                
                li.innerHTML = `
                    ${imgTag}
                    <div style="padding: 1.5rem; display: flex; flex-direction: column; flex: 1;">
                        <span class="aviso-date">${aviso.data}</span>
                        <h3 style="margin-bottom: 0.5rem;">${aviso.titulo}</h3>
                        <p style="margin-bottom: 1.5rem; flex: 1; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;">${aviso.descricao}</p>
                        <a href="evento.html?id=${aviso.id}" style="text-decoration: none;"><button class="btn-secondary" style="width: 100%;">Saiba Mais →</button></a>
                    </div>
                `;
                ul.appendChild(li);
            });
        } catch (error) {
            console.error("Erro:", error);
            document.getElementById('lista-avisos').innerHTML = '<li class="card text-center" style="grid-column: 1 / -1;">Erro ao carregar agenda.</li>';
        }
    };
    carregarAvisos();
}

// ==========================================
// TELA: ADMIN (Painel de Orações)
// ==========================================
if (document.getElementById('btn-logout')) {
    document.getElementById('btn-logout').addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    });
}

if (document.getElementById('tabela-pedidos')) {
    const carregarPedidos = async () => {
        const token = localStorage.getItem('token');
        try {
            const response = await fetch('/api/pedidos', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('token');
                window.location.href = 'login.html';
                return;
            }

            const pedidos = await response.json();
            const tbody = document.getElementById('tabela-pedidos');
            tbody.innerHTML = '';
            
            if(pedidos.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" class="text-center">Nenhum pedido de oração no momento.</td></tr>';
                return;
            }

            pedidos.forEach(p => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${p.data}</td>
                    <td><strong>${p.nome}</strong></td>
                    <td>${p.pedido}</td>
                `;
                tbody.appendChild(tr);
            });
        } catch (error) {
            console.error("Erro:", error);
        }
    };
    carregarPedidos();
}

// ==========================================
// TELA: GERENCIAR EVENTOS (Admin CRUD)
// ==========================================
if (document.getElementById('tabela-eventos-admin')) {
    
    let eventosGlobais = [];

    // Função para renderizar tabela
    const carregarTabelaEventos = async () => {
        try {
            const response = await fetch('/api/avisos');
            eventosGlobais = await response.json();
            const tbody = document.getElementById('tabela-eventos-admin');
            tbody.innerHTML = '';
            
            if(eventosGlobais.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" class="text-center">Nenhum evento cadastrado.</td></tr>';
                return;
            }

            eventosGlobais.forEach(ev => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${ev.data}</td>
                    <td><strong>${ev.titulo}</strong></td>
                    <td style="text-align: right;">
                        <div style="display:flex; gap:0.5rem; justify-content:flex-end;">
                        <a href="inscritos.html?evento_id=${ev.id}"><button class="btn-sm btn-blue">Ver Inscritos</button></a>
                        <button onclick="editarEvento(${ev.id})" class="btn-sm btn-secondary">Editar</button>
                        <button onclick="excluirEvento(${ev.id})" class="btn-sm btn-danger">Excluir</button>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } catch (error) {
            console.error("Erro ao carregar avisos:", error);
        }
    };
    
    carregarTabelaEventos();

    // Lógica de Submit (Criar ou Editar)
    document.getElementById('form-aviso').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = document.getElementById('evento-id').value;
        const titulo = document.getElementById('titulo-aviso').value;
        const data = document.getElementById('data-aviso').value;
        const descricao = document.getElementById('texto-aviso').value;
        const imagemInput = document.getElementById('imagem-aviso');
        
        const token = localStorage.getItem('token');
        if (!token) return window.location.href = 'login.html';

        const formData = new FormData();
        formData.append('titulo', titulo);
        formData.append('data', data);
        formData.append('descricao', descricao);
        if (imagemInput.files[0]) formData.append('imagem', imagemInput.files[0]);

        try {
            let res;
            if (id) { // Modo de Edição (PUT)
                res = await fetch('/api/avisos/' + id, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });
            } else { // Modo de Criação (POST)
                res = await fetch('/api/avisos', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });
            }

            if (res.ok) {
                showNotification(id ? "Evento atualizado!" : "Aviso publicado com sucesso!");
                fecharModal(); // limpa e fecha o form
                carregarTabelaEventos(); // recarrega a tabela
            } else {
                showNotification("Erro na requisição.", true);
            }
        } catch (error) {
            console.error("Erro:", error);
        }
    });

    // Lógica do Modal
    const modal = document.getElementById('modal-evento');
    
    window.abrirModal = () => {
        modal.classList.add('active');
    };
    
    window.fecharModal = () => {
        modal.classList.remove('active');
        document.getElementById('form-title').innerText = "Agendar Novo Evento";
        document.getElementById('btn-submit-aviso').innerText = "Salvar Evento";
        document.getElementById('form-aviso').reset();
        document.getElementById('evento-id').value = '';
    };

    if(document.getElementById('btn-novo-evento')) {
        document.getElementById('btn-novo-evento').addEventListener('click', abrirModal);
    }
    
    if(document.getElementById('btn-close-modal')) {
        document.getElementById('btn-close-modal').addEventListener('click', fecharModal);
    }
    
    // Fechar modal ao clicar fora
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            fecharModal();
        }
    });

    // Função para preencher o formulário no modo Edição
    window.editarEvento = (id) => {
        const evento = eventosGlobais.find(e => e.id === id);
        if(!evento) return;

        document.getElementById('form-title').innerText = "Editar Evento";
        document.getElementById('btn-submit-aviso').innerText = "Salvar Alterações";
        
        document.getElementById('evento-id').value = evento.id;
        document.getElementById('titulo-aviso').value = evento.titulo;
        
        // Conversão de data caso seja necessário para o formato HTML YYYY-MM-DD
        document.getElementById('data-aviso').value = evento.data; 
        document.getElementById('texto-aviso').value = evento.descricao;
        
        abrirModal();
    };

    // Função de Excluir
    window.excluirEvento = async (id) => {
        if(!confirm("Tem certeza que deseja excluir este evento? Esta ação não tem volta.")) return;
        
        const token = localStorage.getItem('token');
        try {
            const res = await fetch('/api/avisos/' + id, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                showNotification("Evento excluído.");
                carregarTabelaEventos();
            } else {
                showNotification("Erro ao excluir.", true);
            }
        } catch (error) {
            console.error(error);
        }
    };

}

// ==========================================
// TELA: ADMIN INSCRITOS
// ==========================================
if (document.getElementById('tabela-inscritos')) {
    const carregarInscritos = async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const evento_id = urlParams.get('evento_id');
        const token = localStorage.getItem('token');
        const tbody = document.getElementById('tabela-inscritos');

        if (!evento_id || !token) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">Acesso negado ou evento inválido.</td></tr>';
            return;
        }

        try {
            // Tentar buscar o nome do evento
            const resEvento = await fetch('/api/avisos/' + evento_id);
            if(resEvento.ok) {
                const evento = await resEvento.json();
                document.getElementById('titulo-evento-inscritos').innerText = `Inscritos: ${evento.titulo}`;
            }

            // Buscar inscritos
            const response = await fetch('/api/inscricoes/' + evento_id, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            const inscritos = await response.json();
            tbody.innerHTML = '';
            
            if (inscritos.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center">Nenhum inscrito até o momento.</td></tr>';
                return;
            }

            inscritos.forEach(inscrito => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${inscrito.nome}</strong></td>
                    <td>${inscrito.email}</td>
                    <td>${inscrito.telefone}</td>
                    <td>${inscrito.data_inscricao}</td>
                `;
                tbody.appendChild(tr);
            });
        } catch (error) {
            console.error("Erro ao carregar inscritos:", error);
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">Erro ao carregar a lista.</td></tr>';
        }
    };
    carregarInscritos();
}
