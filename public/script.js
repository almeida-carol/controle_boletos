// script.js (versão corrigida para o valor)

document.addEventListener('DOMContentLoaded', () => {
    const boletoForm = document.getElementById('boletoForm');
    const boletosList = document.getElementById('boletosList');
    const boletosPagosList = document.getElementById('boletosPagosList');
    const noBoletosMessage = document.getElementById('noBoletosMessage');
    const noBoletosPagosMessage = document.getElementById('noBoletosPagosMessage');

    // A URL base da nossa API
    const API_URL = '/api/boletos';

    // Função para buscar e renderizar os boletos
    async function fetchAndRenderBoletos() {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) {
                throw new Error('Erro ao buscar os boletos.');
            }
            const data = await response.json();
            const boletos = data.boletos;
            console.log("Boletos carregados do servidor:", boletos);

            boletosList.innerHTML = '';
            boletosPagosList.innerHTML = '';

            const boletosPendentes = boletos.filter(b => b.status === 'Pendente');
            const boletosPagos = boletos.filter(b.status === 'Pago');

            if (boletosPendentes.length === 0) {
                noBoletosMessage.style.display = 'block';
            } else {
                noBoletosMessage.style.display = 'none';
                boletosPendentes.forEach(boleto => {
                    const li = createBoletoListItem(boleto);
                    boletosList.appendChild(li);
                });
            }

            if (boletosPagos.length === 0) {
                noBoletosPagosMessage.style.display = 'block';
            } else {
                noBoletosPagosMessage.style.display = 'none';
                boletosPagos.forEach(boleto => {
                    const li = createBoletoListItem(boleto);
                    boletosPagosList.appendChild(li);
                });
            }
        } catch (error) {
            console.error('Falha ao carregar os boletos:', error);
            alert('Não foi possível carregar os boletos. Verifique se o servidor está rodando.');
        }
    }

    // Função auxiliar para criar um item de lista de boleto
    function createBoletoListItem(boleto) {
        const li = document.createElement('li');
        li.className = `boleto-item ${boleto.status === 'Pago' ? 'pago' : ''}`;
        li.dataset.id = boleto.id; // Adiciona o ID do banco de dados

        const dataVencimentoFormatada = new Date(boleto.vencimento).toLocaleDateString('pt-BR');
        // Formata o valor corretamente para exibição
        const valorFormatado = `R$ ${parseFloat(boleto.valor).toFixed(2).replace('.', ',')}`;

        li.innerHTML = `
            <div class="boleto-info">
                <p class="fornecedor-nome">${boleto.fornecedor}</p>
                <p class="valor-data">Valor: ${valorFormatado} | Vencimento: ${dataVencimentoFormatada}</p>
            </div>
        `;

        // Adiciona botão "Confirmar Pagamento" se o boleto estiver pendente
        if (boleto.status === 'Pendente') {
            const pagarButton = document.createElement('button');
            pagarButton.textContent = 'Confirmar Pagamento';
            pagarButton.className = 'action-button';
            pagarButton.addEventListener('click', () => marcarComoPago(boleto.id));
            li.appendChild(pagarButton);
        } else if (boleto.status === 'Pago') {
            const dataPagamentoFormatada = boleto.dataPagamento ? new Date(boleto.dataPagamento).toLocaleDateString('pt-BR') : 'Não informada';
            const pagoInfo = document.createElement('span');
            pagoInfo.textContent = `Pago em: ${dataPagamentoFormatada}`;
            pagoInfo.style.fontSize = '0.9em';
            pagoInfo.style.color = '#4CAF50';
            li.appendChild(pagoInfo);
        }

        // Adiciona botão "Remover" APENAS se o boleto estiver pago
        if (boleto.status === 'Pago') {
            const removerButton = document.createElement('button');
            removerButton.textContent = 'Remover';
            removerButton.className = 'action-button';
            removerButton.style.backgroundColor = '#dc3545'; // Cor de remoção
            removerButton.style.marginLeft = '10px';
            removerButton.addEventListener('click', () => removerBoleto(boleto.id));
            li.appendChild(removerButton);
        }

        // Adiciona link para anexo se houver
        if (boleto.anexo) {
            const anexoLink = document.createElement('a');
            anexoLink.href = '#';
            anexoLink.textContent = `Ver Anexo (${boleto.anexo})`;
            anexoLink.className = 'anexo-link';
            anexoLink.addEventListener('click', (e) => {
                e.preventDefault();
                alert(`Simulando abertura do anexo: ${boleto.anexo}`);
            });
            li.querySelector('.boleto-info').appendChild(anexoLink);
        }

        return li;
    }

    // Função para adicionar um novo boleto
    boletoForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const fornecedor = document.getElementById('fornecedor').value;
        // --- AQUI ESTÁ A CORREÇÃO ---
        const valorInput = document.getElementById('valor').value;
        const valorLimpo = valorInput.replace(/\./g, '').replace(',', '.'); // Remove pontos e troca vírgula por ponto
        const valor = parseFloat(valorLimpo);
        // --- FIM DA CORREÇÃO ---
        const vencimento = document.getElementById('vencimento').value;
        const anexoInput = document.getElementById('anexo');
        const anexo = anexoInput.files.length > 0 ? anexoInput.files[0].name : null;

        if (!fornecedor || isNaN(valor) || !vencimento) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        const novoBoleto = { fornecedor, valor, vencimento, anexo, status: 'Pendente' };

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(novoBoleto)
            });

            if (!response.ok) {
                throw new Error('Falha ao adicionar boleto.');
            }

            const data = await response.json();
            console.log("Boleto adicionado com sucesso:", data);
            boletoForm.reset();
            fetchAndRenderBoletos(); // Re-renderiza a lista
        } catch (error) {
            console.error('Erro:', error);
            alert('Não foi possível adicionar o boleto.');
        }
    });

    // Função para marcar um boleto como pago
    async function marcarComoPago(boletoId) {
        try {
            const response = await fetch(`${API_URL}/${boletoId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: 'Pago',
                    dataPagamento: new Date().toISOString().split('T')[0]
                })
            });

            if (!response.ok) {
                throw new Error('Falha ao marcar boleto como pago.');
            }

            const data = await response.json();
            console.log(data.message);
            fetchAndRenderBoletos(); // Re-renderiza a lista
        } catch (error) {
            console.error('Erro:', error);
            alert('Não foi possível marcar o boleto como pago.');
        }
    }

    // Função para remover um boleto permanentemente
    async function removerBoleto(boletoId) {
        if (confirm('Tem certeza que deseja remover este boleto?')) {
            try {
                const response = await fetch(`${API_URL}/${boletoId}`, {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    throw new Error('Falha ao remover boleto.');
                }

                console.log('Boleto removido com sucesso.');
                fetchAndRenderBoletos(); // Re-renderiza a lista para refletir a mudança
            } catch (error) {
                console.error('Erro:', error);
                alert('Não foi possível remover o boleto.');
            }
        }
    }

    // Renderiza os boletos ao carregar a página pela primeira vez
    fetchAndRenderBoletos();
});