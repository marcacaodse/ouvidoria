let allData = [];
let filteredData = [];
let charts = {};
let dataTable;

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1IiHmkvOeJRIWbR80E74L9wVRPkUdEo1N/export?format=csv&gid=953483319';

async function loadData( ) {
    try {
        document.getElementById('connectionStatus').className = 'status-indicator status-online';
        document.getElementById('connectionText').textContent = 'Carregando...';
        
        const response = await fetch(SHEET_URL);
        const csvText = await response.text();
        
        const lines = csvText.split('\n');
        const headers = lines[0].split(',');
        
        allData = [];
        for (let i = 2; i < lines.length; i++) { // Começar da linha 2 (após cabeçalho)
            const line = lines[i].trim();
            if (line) {
                const values = parseCSVLine(line);
                if (values.length >= 15 && values[0]) { // Verificar se tem dados válidos
                    allData.push({
                        nome: values[0] || '',
                        ubs: values[1] || '',
                        numeroOuvidoria: values[2] || '',
                        status: values[3] || '',
                        dataChegada: values[4] || '',
                        envioUbs: values[5] || '',
                        cobranca1: values[6] || '',
                        cobranca2: values[7] || '',
                        cobranca3: values[8] || '',
                        cobranca4: values[9] || '',
                        prazoConc: values[10] || '',
                        prazoResposta: values[11] || '',
                        dataResposta: values[12] || '',
                        motivo: values[13] || '',
                        observacao: values[14] || ''
                    });
                }
            }
        }
        
        filteredData = [...allData];
        updateFilters();
        updateDashboard();
        
        document.getElementById('connectionStatus').className = 'status-indicator status-online';
        document.getElementById('connectionText').textContent = 'Conectado';
        document.getElementById('lastUpdate').textContent = `Última atualização: ${new Date().toLocaleString('pt-BR')}`;
        
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        document.getElementById('connectionStatus').className = 'status-indicator status-offline';
        document.getElementById('connectionText').textContent = 'Erro de conexão';
    }
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

function updateFilters() {
    const ubsSet = new Set();
    const motivoSet = new Set();
    
    allData.forEach(item => {
        if (item.ubs) ubsSet.add(item.ubs);
        if (item.motivo) motivoSet.add(item.motivo);
    });
    
    updateSelectOptions('ubsFilter', Array.from(ubsSet).sort());
    updateSelectOptions('motivoFilter', Array.from(motivoSet).sort());
}

function updateSelectOptions(selectId, options) {
    const select = document.getElementById(selectId);
    const currentValue = select.value;
    
    select.innerHTML = select.children[0].outerHTML;
    
    options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        select.appendChild(optionElement);
    });
    
    if (options.includes(currentValue)) {
        select.value = currentValue;
    }
}

function applyFilters() {
    const statusFilter = document.getElementById('statusFilter').value;
    const ubsFilter = document.getElementById('ubsFilter').value;
    const motivoFilter = document.getElementById('motivoFilter').value;
    const dataInicio = document.getElementById('dataInicioFilter').value;
    const dataFim = document.getElementById('dataFimFilter').value;
    
    filteredData = allData.filter(item => {
        if (statusFilter && item.status !== statusFilter) return false;
        if (ubsFilter && item.ubs !== ubsFilter) return false;
        if (motivoFilter && item.motivo !== motivoFilter) return false;
        
        if (dataInicio || dataFim) {
            const itemDate = parseDate(item.dataChegada);
            if (itemDate) {
                if (dataInicio && itemDate < new Date(dataInicio)) return false;
                if (dataFim && itemDate > new Date(dataFim)) return false;
            }
        }
        
        return true;
    });
    
    updateDashboard();
}

function parseDate(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        return new Date(parts[2], parts[0] - 1, parts[1]);
    }
    return null;
}

function updateDashboard() {
    updateKPIs();
    updateCharts();
    updateTable();
}

function updateKPIs() {
    const total = filteredData.length;
    const respondidas = filteredData.filter(item => item.status === 'RESPONDIDA').length;
    const pendentes = filteredData.filter(item => item.status === 'PENDENTE').length;
    const taxa = total > 0 ? ((respondidas / total) * 100).toFixed(1) : 0;
    
    let tempoMedio = 0;
    const respondidasComData = filteredData.filter(item => 
        item.status === 'RESPONDIDA' && item.dataChegada && item.dataResposta
    );
    
    if (respondidasComData.length > 0) {
        const tempoTotal = respondidasComData.reduce((acc, item) => {
            const chegada = parseDate(item.dataChegada);
            const resposta = parseDate(item.dataResposta);
            if (chegada && resposta) {
                return acc + (resposta - chegada);
            }
            return acc;
        }, 0);
        
        tempoMedio = Math.round(tempoTotal / (respondidasComData.length * 24 * 60 * 60 * 1000));
    }
    
    const kpis = [
        { title: 'Total de Demandas', value: total, icon: 'fa-list', color: 'blue' },
        { title: 'Respondidas', value: respondidas, icon: 'fa-check-circle', color: 'green' },
        { title: 'Pendentes', value: pendentes, icon: 'fa-clock', color: 'orange' },
        { title: 'Taxa de Resolução', value: `${taxa}%`, icon: 'fa-chart-pie', color: 'purple' },
        { title: 'Tempo Médio (dias)', value: tempoMedio, icon: 'fa-calendar-alt', color: 'red' }
    ];
    
    const kpiContainer = document.getElementById('kpiContainer');
    kpiContainer.innerHTML = kpis.map(kpi => `
        <div class="kpi-card card p-4">
            <div class="flex items-center">
                <div class="bg-${kpi.color}-100 p-3 rounded-lg mr-3">
                    <i class="fas ${kpi.icon} text-${kpi.color}-500 text-xl"></i>
                </div>
                <div>
                    <p class="text-sm text-gray-600">${kpi.title}</p>
                    <p class="text-2xl font-bold text-gray-800">${kpi.value}</p>
                </div>
            </div>
        </div>
    `).join('');
}

function updateCharts() {
    updateStatusChart();
    updateUBSChart();
    updateMotivoChart();
    updateTimeChart();
    updateUBSRespondidasChart();
    updateUBSPendentesChart();
}

function updateStatusChart() {
    const respondidas = filteredData.filter(item => item.status === 'RESPONDIDA').length;
    const pendentes = filteredData.filter(item => item.status === 'PENDENTE').length;
    const ctx = document.getElementById('statusChart').getContext('2d');
    if (charts.status) charts.status.destroy();
    charts.status = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Respondidas', 'Pendentes'],
            datasets: [{ data: [respondidas, pendentes], backgroundColor: ['#10b981', '#f59e0b'], borderWidth: 2, borderColor: '#fff' }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
}

function updateUBSChart() {
    const ubsCount = {};
    filteredData.forEach(item => { if (item.ubs) ubsCount[item.ubs] = (ubsCount[item.ubs] || 0) + 1; });
    const sortedUBS = Object.entries(ubsCount).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const ctx = document.getElementById('ubsChart').getContext('2d');
    if (charts.ubs) charts.ubs.destroy();
    charts.ubs = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedUBS.map(item => item[0]),
            datasets: [{ label: 'Demandas', data: sortedUBS.map(item => item[1]), backgroundColor: '#2563eb', borderColor: '#1d4ed8', borderWidth: 1 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true }, x: { ticks: { maxRotation: 45 } } } }
    });
}

function updateMotivoChart() {
    const motivoCount = {};
    filteredData.forEach(item => { if (item.motivo) motivoCount[item.motivo] = (motivoCount[item.motivo] || 0) + 1; });
    const ctx = document.getElementById('motivoChart').getContext('2d');
    if (charts.motivo) charts.motivo.destroy();
    charts.motivo = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(motivoCount),
            datasets: [{ label: 'Demandas', data: Object.values(motivoCount), backgroundColor: ['#8b5cf6', '#06b6d4', '#10b981'], borderWidth: 1 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });
}

function updateTimeChart() {
    const dateCount = {};
    filteredData.forEach(item => { if (item.dataChegada) dateCount[item.dataChegada] = (dateCount[item.dataChegada] || 0) + 1; });
    const sortedDates = Object.entries(dateCount).sort((a, b) => new Date(a[0]) - new Date(b[0]));
    const ctx = document.getElementById('timeChart').getContext('2d');
    if (charts.time) charts.time.destroy();
    charts.time = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedDates.map(item => item[0]),
            datasets: [{ label: 'Demandas por Data', data: sortedDates.map(item => item[1]), borderColor: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.1)', tension: 0.4, fill: true }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true }, x: { ticks: { maxRotation: 45 } } } }
    });
}

function updateUBSRespondidasChart() {
    const ubsCount = {};
    filteredData.filter(item => item.status === 'RESPONDIDA').forEach(item => { if (item.ubs) ubsCount[item.ubs] = (ubsCount[item.ubs] || 0) + 1; });
    const sortedUBS = Object.entries(ubsCount).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const ctx = document.getElementById('ubsRespondidasChart').getContext('2d');
    if (charts.ubsRespondidas) charts.ubsRespondidas.destroy();
    charts.ubsRespondidas = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedUBS.map(item => item[0]),
            datasets: [{ label: 'Respondidas', data: sortedUBS.map(item => item[1]), backgroundColor: '#10b981', borderColor: '#059669', borderWidth: 1 }]
        },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } }
    });
}

function updateUBSPendentesChart() {
    const ubsCount = {};
    filteredData.filter(item => item.status === 'PENDENTE').forEach(item => { if (item.ubs) ubsCount[item.ubs] = (ubsCount[item.ubs] || 0) + 1; });
    const sortedUBS = Object.entries(ubsCount).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const ctx = document.getElementById('ubsPendentesChart').getContext('2d');
    if (charts.ubsPendentes) charts.ubsPendentes.destroy();
    charts.ubsPendentes = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedUBS.map(item => item[0]),
            datasets: [{ label: 'Pendentes', data: sortedUBS.map(item => item[1]), backgroundColor: '#ef4444', borderColor: '#dc2626', borderWidth: 1 }]
        },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } }
    });
}

function updateTable() {
    if (dataTable) dataTable.destroy();
    const tableBody = document.querySelector('#demandasTable tbody');
    tableBody.innerHTML = filteredData.map(item => `
        <tr>
            <td>${item.ubs}</td>
            <td>${item.numeroOuvidoria}</td>
            <td><span class="px-2 py-1 rounded-full text-xs font-semibold ${item.status === 'RESPONDIDA' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}">${item.status}</span></td>
            <td>${item.dataChegada}</td>
            <td>${item.envioUbs}</td>
            <td>${item.dataResposta}</td>
            <td>${item.observacao}</td>
        </tr>
    `).join('');
    dataTable = $('#demandasTable').DataTable({
        language: { url: '//cdn.datatables.net/plug-ins/1.13.4/i18n/pt-BR.json' },
        pageLength: 15,
        responsive: true,
        order: [[3, 'desc']]
    });
}

function exportToExcel() {
    const ws = XLSX.utils.json_to_sheet(filteredData.map(item => ({
        'UBS': item.ubs,
        'Número Ouvidoria': item.numeroOuvidoria,
        'Status': item.status,
        'Data de Chegada': item.dataChegada,
        'Envio UBS': item.envioUbs,
        'Data da Resposta': item.dataResposta,
        'Observação': item.observacao
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Demandas');
    XLSX.writeFile(wb, `ouvidoria_eldorado_${new Date().toISOString().split('T')[0]}.xlsx`);
}

document.addEventListener('DOMContentLoaded', function() {
    loadData();
    setInterval(loadData, 30000);
});
