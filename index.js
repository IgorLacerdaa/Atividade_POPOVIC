"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var readline = require("readline");
var path = require("path");
var CSV_FILE = path.resolve(__dirname, 'agendamentos.csv');
// Função para salvar agendamento no arquivo CSV
function salvarAgendamento(nome, horario) {
    var linha = "\"".concat(nome, "\",\"").concat(horario, "\"\n");
    fs.appendFileSync(CSV_FILE, linha, 'utf8');
    console.log('Agendamento salvo com sucesso!');
}
// Função para mostrar todos os agendamentos
function mostrarAgendamentos() {
    if (!fs.existsSync(CSV_FILE)) {
        console.log('Nenhum agendamento encontrado.');
        return;
    }
    var dados = fs.readFileSync(CSV_FILE, 'utf8');
    var linhas = dados.trim().split('\n');
    if (linhas.length === 0) {
        console.log('Nenhum agendamento encontrado.');
        return;
    }
    console.log('Agendamentos:');
    linhas.forEach(function (linha, idx) {
        var _a = linha.split('","').map(function (item) { return item.replace(/"/g, ''); }), nome = _a[0], horario = _a[1];
        console.log("".concat(idx + 1, ". Cliente: ").concat(nome, " | Hor\u00E1rio: ").concat(horario));
    });
}
var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
function menu() {
    console.log('\n=== Barbearia Agendamentos ===');
    console.log('1. Agendar horário');
    console.log('2. Listar agendamentos');
    console.log('3. Sair');
    rl.question('Escolha uma opção: ', function (opcao) {
        switch (opcao.trim()) {
            case '1':
                rl.question('Nome do cliente: ', function (nome) {
                    rl.question('Horário do serviço (ex: 2025-09-10 14:00): ', function (horario) {
                        salvarAgendamento(nome, horario);
                        menu();
                    });
                });
                break;
            case '2':
                mostrarAgendamentos();
                menu();
                break;
            case '3':
                rl.close();
                break;
            default:
                console.log('Opção inválida!');
                menu();
        }
    });
}
menu();
