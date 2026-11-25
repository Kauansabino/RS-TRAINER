# RS Personal Trainer

Projeto pessoal para praticar desenvolvimento web e apoio com IA. O site apresenta o trabalho de um personal trainer e inclui áreas para alunos e para o personal.

## O que dá para fazer

- Ver as informações e os treinos de exemplo.
- Criar uma conta de aluno ou entrar com uma conta existente.
- Pedir um horário de avaliação.
- No painel do personal, cadastrar alunos, montar treinos e atualizar agendamentos.
- Na área do aluno, consultar o próprio treino e registrar exercícios concluídos.

## Tecnologias

- HTML, CSS e JavaScript no site.
- Node.js e Express no servidor.
- bcrypt para proteger as senhas.
- Um arquivo JSON local para guardar os dados durante o desenvolvimento.

## Como iniciar

Instale o [Node.js 20 ou mais recente](https://nodejs.org/). No terminal, dentro da pasta do projeto, rode:

```bash
cd backend
npm install
npm run setup:personal
npm start
```

O comando de configuração pede os dados para criar a conta do personal. Depois, abra [http://localhost:3000](http://localhost:3000). A tela inicial permite entrar ou criar uma conta de aluno.

Para parar o servidor, pressione `Ctrl + C` no terminal.

O arquivo `.env.example` mostra configurações opcionais. Copie-o para `.env` na raiz do projeto somente se quiser mudar a porta ou criar a conta do personal automaticamente; para o uso normal, o comando `npm run setup:personal` já é suficiente.

## Organização dos arquivos

- `index.html` e `style.css` montam a parte visual do site.
- `script.js` inicia as funções do navegador que ficam na pasta `js`.
- `js/account.js` cuida de login, cadastro e conversa com o servidor.
- `js/bookings.js` cuida dos agendamentos.
- `js/personal-dashboard.js` cuida do painel do personal e do aluno.
- `js/site.js` cuida do menu, das animações e dos treinos de exemplo.
- `backend/server.js` inicia o servidor e conecta as partes do sistema.
- `backend/src/routes` guarda as rotas: os caminhos que o site usa para pedir dados.
- `backend/src/security.js` reúne senhas, sessões e regras de acesso.
- `backend/src/database.js` lê e salva os dados em um arquivo local.
- `backend/create-personal.js` cria o primeiro acesso do personal.

## O que ainda falta

A pasta `assets` está sem imagens e vídeos, e os links de WhatsApp e Instagram precisam ser configurados. Os dados ficam em arquivos neste computador. Esta versão serve para estudo e ainda precisa de ajustes antes de ser usada com clientes.
