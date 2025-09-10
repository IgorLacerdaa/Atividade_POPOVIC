import * as fs from 'fs';
import * as readline from 'readline';
import { promisify } from 'util';

interface Appointment {
    id: number;
    clientName: string;
    serviceTime: string;
    date: string;
    createdAt: string;
}

class BarbershopScheduler {
    private csvFilePath: string = 'agendamentos.csv';
    private rl: readline.Interface;

    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        this.initializeCsvFile();
    }

    private initializeCsvFile(): void {
        if (!fs.existsSync(this.csvFilePath)) {
            const header = 'ID,Nome do Cliente,Horário,Data,Criado em\n';
            fs.writeFileSync(this.csvFilePath, header);
            console.log('📄 Arquivo CSV criado: agendamentos.csv');
        }
    }

    private question(query: string): Promise<string> {
        return new Promise((resolve) => {
            this.rl.question(query, resolve);
        });
    }

    private generateId(): number {
        const appointments = this.loadAppointments();
        return appointments.length > 0 ? Math.max(...appointments.map(a => a.id)) + 1 : 1;
    }

    private loadAppointments(): Appointment[] {
        try {
            const csvContent = fs.readFileSync(this.csvFilePath, 'utf-8');
            const lines = csvContent.trim().split('\n').slice(1); // Remove header
            
            return lines.filter(line => line.trim()).map(line => {
                const [id, clientName, serviceTime, date, createdAt] = line.split(',');
                return {
                    id: parseInt(id),
                    clientName,
                    serviceTime,
                    date,
                    createdAt
                };
            });
        } catch (error) {
            return [];
        }
    }

    private saveAppointment(appointment: Appointment): void {
        const csvLine = `${appointment.id},${appointment.clientName},${appointment.serviceTime},${appointment.date},${appointment.createdAt}\n`;
        fs.appendFileSync(this.csvFilePath, csvLine);
    }

    private validateTime(time: string): boolean {
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        return timeRegex.test(time);
    }

    private validateDate(date: string): boolean {
        const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
        if (!dateRegex.test(date)) return false;
        
        const [day, month, year] = date.split('/').map(Number);
        const inputDate = new Date(year, month - 1, day);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        return inputDate >= today;
    }

    private isTimeSlotAvailable(date: string, time: string): boolean {
        const appointments = this.loadAppointments();
        return !appointments.some(apt => apt.date === date && apt.serviceTime === time);
    }

    private async scheduleAppointment(): Promise<void> {
        console.log('\n✂️  === AGENDAR NOVO HORÁRIO ===');
        
        // Solicitar nome do cliente
        let clientName: string;
        do {
            clientName = await this.question('👤 Nome do cliente: ');
            if (!clientName.trim()) {
                console.log('❌ Nome do cliente é obrigatório!');
            }
        } while (!clientName.trim());

        // Solicitar data
        let date: string;
        do {
            date = await this.question('📅 Data do serviço (DD/MM/AAAA): ');
            if (!this.validateDate(date)) {
                console.log('❌ Data inválida! Use o formato DD/MM/AAAA e não pode ser no passado.');
            }
        } while (!this.validateDate(date));

        // Solicitar horário
        let serviceTime: string;
        do {
            serviceTime = await this.question('🕐 Horário do serviço (HH:MM): ');
            if (!this.validateTime(serviceTime)) {
                console.log('❌ Horário inválido! Use o formato HH:MM (ex: 14:30).');
            } else if (!this.isTimeSlotAvailable(date, serviceTime)) {
                console.log('❌ Este horário já está ocupado! Escolha outro horário.');
            }
        } while (!this.validateTime(serviceTime) || !this.isTimeSlotAvailable(date, serviceTime));

        // Criar agendamento
        const appointment: Appointment = {
            id: this.generateId(),
            clientName: clientName.trim(),
            serviceTime,
            date,
            createdAt: new Date().toLocaleString('pt-BR')
        };

        // Salvar no CSV
        this.saveAppointment(appointment);

        console.log('\n✅ Agendamento realizado com sucesso!');
        console.log(`📋 ID: ${appointment.id}`);
        console.log(`👤 Cliente: ${appointment.clientName}`);
        console.log(`📅 Data: ${appointment.date}`);
        console.log(`🕐 Horário: ${appointment.serviceTime}`);
    }

    private viewAppointments(): void {
        console.log('\n📋 === AGENDAMENTOS ===');
        const appointments = this.loadAppointments();

        if (appointments.length === 0) {
            console.log('❌ Nenhum agendamento encontrado.');
            return;
        }

        // Ordenar por data e horário
        appointments.sort((a, b) => {
            const [dayA, monthA, yearA] = a.date.split('/').map(Number);
            const [dayB, monthB, yearB] = b.date.split('/').map(Number);
            const dateA = new Date(yearA, monthA - 1, dayA, ...a.serviceTime.split(':').map(Number));
            const dateB = new Date(yearB, monthB - 1, dayB, ...b.serviceTime.split(':').map(Number));
            return dateA.getTime() - dateB.getTime();
        });

        console.log('\n┌────┬──────────────────────┬────────────┬─────────────────────┐');
        console.log('│ ID │ Cliente              │ Data       │ Horário             │');
        console.log('├────┼──────────────────────┼────────────┼─────────────────────┤');

        appointments.forEach(apt => {
            const clientName = apt.clientName.length > 20 ? apt.clientName.substring(0, 17) + '...' : apt.clientName;
            console.log(`│ ${apt.id.toString().padStart(2)} │ ${clientName.padEnd(20)} │ ${apt.date} │ ${apt.serviceTime.padEnd(19)} │`);
        });

        console.log('└────┴──────────────────────┴────────────┴─────────────────────┘');
        console.log(`\n📊 Total de agendamentos: ${appointments.length}`);
    }

    private async removeAppointment(): Promise<void> {
        console.log('\n🗑️  === CANCELAR AGENDAMENTO ===');
        
        const appointments = this.loadAppointments();
        if (appointments.length === 0) {
            console.log('❌ Nenhum agendamento encontrado para cancelar.');
            return;
        }

        this.viewAppointments();
        
        const idInput = await this.question('\n🔢 Digite o ID do agendamento para cancelar (0 para voltar): ');
        const id = parseInt(idInput);

        if (id === 0) return;

        const appointmentIndex = appointments.findIndex(apt => apt.id === id);
        if (appointmentIndex === -1) {
            console.log('❌ Agendamento não encontrado!');
            return;
        }

        const appointment = appointments[appointmentIndex];
        console.log(`\n📋 Agendamento encontrado:`);
        console.log(`👤 Cliente: ${appointment.clientName}`);
        console.log(`📅 Data: ${appointment.date}`);
        console.log(`🕐 Horário: ${appointment.serviceTime}`);

        const confirm = await this.question('\n❓ Confirma o cancelamento? (s/n): ');
        if (confirm.toLowerCase() === 's' || confirm.toLowerCase() === 'sim') {
            // Remove o agendamento da lista
            appointments.splice(appointmentIndex, 1);
            
            // Reescreve o arquivo CSV
            const header = 'ID,Nome do Cliente,Horário,Data,Criado em\n';
            let csvContent = header;
            appointments.forEach(apt => {
                csvContent += `${apt.id},${apt.clientName},${apt.serviceTime},${apt.date},${apt.createdAt}\n`;
            });
            
            fs.writeFileSync(this.csvFilePath, csvContent);
            console.log('✅ Agendamento cancelado com sucesso!');
        } else {
            console.log('❌ Cancelamento não confirmado.');
        }
    }

    private displayMenu(): void {
        console.log('\n✂️  === SISTEMA DE AGENDAMENTO - BARBEARIA ===');
        console.log('1. 📅 Agendar novo horário');
        console.log('2. 📋 Visualizar agendamentos');
        console.log('3. 🗑️  Cancelar agendamento');
        console.log('4. 🚪 Sair');
        console.log('═'.repeat(45));
    }

    public async start(): Promise<void> {
        console.log('💈 Bem-vindo ao Sistema de Agendamento da Barbearia!');
        
        while (true) {
            this.displayMenu();
            const choice = await this.question('👉 Escolha uma opção: ');

            switch (choice) {
                case '1':
                    await this.scheduleAppointment();
                    break;
                case '2':
                    this.viewAppointments();
                    break;
                case '3':
                    await this.removeAppointment();
                    break;
                case '4':
                    console.log('\n👋 Obrigado por usar o sistema! Até logo!');
                    this.rl.close();
                    return;
                default:
                    console.log('❌ Opção inválida! Por favor, escolha uma opção válida.');
            }

            if (choice !== '4') {
                await this.question('\n⏸️  Pressione Enter para continuar...');
                console.clear();
            }
        }
    }
}

// Inicializar o sistema
const scheduler = new BarbershopScheduler();
scheduler.start().catch(error => {
    console.error('❌ Erro no sistema:', error);
    process.exit(1);
});