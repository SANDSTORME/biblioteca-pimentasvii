# Guia em vídeo para alunos

Este projeto agora conta com um gerador de vídeo guiado para apresentar as principais funcionalidades do ambiente do aluno.

## Objetivo

Mostrar, de forma simples e visual, como o aluno usa a plataforma no dia a dia:

- entrar na plataforma
- entender o cadastro com seleção de turma
- navegar pelo painel inicial
- usar o catálogo com filtros
- abrir o detalhe de um livro
- salvar favoritos
- solicitar empréstimo
- acompanhar empréstimos e histórico
- responder ao questionário de recomendações
- acessar documentos
- usar o suporte por e-mail

## Arquivo gerado

Ao rodar o comando abaixo, o sistema salva um vídeo em:

`artifacts/videos/guia-do-aluno.webm`

## Como gerar

```bash
npm run video:aluno
```

O processo:

1. faz o build da aplicação
2. sobe um servidor local controlado para gravação
3. entra no ambiente do aluno
4. percorre as telas principais com legendas na própria interface
5. salva o vídeo final automaticamente

## Estrutura sugerida da narração

### 1. Boas-vindas

"Este é o ambiente do aluno na Biblioteca Pimentas VII. Aqui você encontra livros, pedidos de empréstimo, recomendações, documentos e suporte."

### 2. Cadastro

"No primeiro acesso, o aluno cria a conta usando nome, Gmail institucional, turma em lista e senha."

### 3. Painel inicial

"Na página inicial, o aluno acompanha avisos, favoritos, leituras recentes e atalhos para as áreas principais."

### 4. Catálogo

"No catálogo, é possível pesquisar por título, autor e tombo, além de filtrar por categoria, disponibilidade e faixa escolar."

### 5. Detalhe do livro

"Ao abrir um livro, o aluno vê capa, descrição, faixa escolar, disponibilidade, resenhas e ações como favoritar e solicitar empréstimo."

### 6. Empréstimos

"Depois do pedido, o sistema gera um token. Na área de empréstimos, o aluno acompanha se o pedido está pendente, aprovado, devolvido ou atrasado."

### 7. Histórico

"O histórico mostra a trajetória de leitura e as movimentações registradas dentro da biblioteca."

### 8. Recomendações

"O questionário de recomendações ajuda o aluno a descobrir leituras com base no perfil e no momento de estudo."

### 9. Documentos

"Na central de documentos, ficam materiais, listas de leitura, orientações e arquivos publicados pela biblioteca."

### 10. Suporte

"Se surgir qualquer dúvida, o aluno pode abrir o suporte e enviar uma mensagem direto para o e-mail oficial da biblioteca."

## Observação

O vídeo é gerado em ambiente controlado de demonstração para fins de gravação do guia. Isso não altera o ambiente real de publicação.
