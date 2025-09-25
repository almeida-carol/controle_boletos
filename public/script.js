// script.js (Versão definitiva para correção de valores decimais)
document.addEventListener('DOMContentLoaded', () => {
  const boletoForm = document.getElementById('boletoForm');
  const boletosList = document.getElementById('boletosList');
  const boletosPagosList = document.getElementById('boletosPagosList');
  const noBoletosMessage = document.getElementById('noBoletosMessage');
  const noBoletosPagosMessage = document.getElementById('noBoletosPagosMessage');

  const API_URL = `${window.location.origin}/api/boletos`;

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
      const boletosPagos = boletos.filter(b => b.status === 'Pago');

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

  function createBoletoListItem(boleto) {
    const li = document.createElement('li');
    li.className = `boleto-item ${boleto.status === 'Pago' ? 'pago' : ''}`;
    li.dataset.id = boleto.id;

    const dataVencimentoFormatada = new Date(boleto.vencimento).toLocaleDateString('pt-BR');
    const valorFormatado = `R$ ${parseFloat(boleto.valor).toFixed(2).replace('.', ',')}`;

    li.innerHTML = `
        <div class="boleto-info">
            <p class="fornecedor-nome">${boleto.fornecedor}</p>
            <p class="valor-data">Valor: ${valorFormatado} | Vencimento: ${dataVencimentoFormatada}</p>
        </div>
    `;

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

    if (boleto.status === 'Pago') {
      const removerButton = document.createElement('button');
      removerButton.textContent = 'Remover';
      removerButton.className = 'action-button';
      removerButton.style.backgroundColor = '#dc3545';
      removerButton.style.marginLeft = '10px';
      removerButton.addEventListener('click', () => removerBoleto(boleto.id));
      li.appendChild(removerButton);
    }

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

  boletoForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const fornecedor = document.getElementById('fornecedor').value;
    const valorInput = document.getElementById('valor').value;

    // --- AQUI ESTÁ A ÚLTIMA CORREÇÃO ---
    const valorLimpo = valorInput.replace(/\./g, '').replace(/,/g, '.');
    const valor = parseFloat(valorLimpo);
    // --- FIM DA CORREÇÃO ---

    console.log("Valor numérico final para envio:", valor);
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
      fetchAndRenderBoletos();
    } catch (error) {
      console.error('Erro:', error);
      alert('Não foi possível adicionar o boleto.');
    }
  });

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
      fetchAndRenderBoletos();
    } catch (error) {
      console.error('Erro:', error);
      alert('Não foi possível marcar o boleto como pago.');
    }
  }

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
        fetchAndRenderBoletos();
      } catch (error) {
        console.error('Erro:', error);
        alert('Não foi possível remover o boleto.');
      }
    }
  }

  fetchAndRenderBoletos();
});