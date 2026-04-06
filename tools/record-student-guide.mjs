import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const port = Number(process.env.VIDEO_PORT || 4173);
const baseUrl = process.env.VIDEO_BASE_URL || `http://127.0.0.1:${port}`;
const outputDir = path.join(rootDir, 'artifacts', 'videos');
const tempVideoDir = path.join(outputDir, 'tmp');
const finalVideoPath = path.join(outputDir, 'guia-do-aluno.webm');

const studentCredentials = {
  email: 'aluna.teste.1@aluno.educacao.sp.gov.br',
  senha: 'Aluno@Teste123',
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const ensureBuildExists = () => {
  if (!existsSync(path.join(rootDir, 'dist-server', 'index.js')) || !existsSync(path.join(rootDir, 'dist', 'index.html'))) {
    throw new Error('Build não encontrado. Execute "npm run build" antes de gravar o vídeo.');
  }
};

const waitForServer = async (url, timeoutMs = 60_000) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { redirect: 'manual' });
      if (response.ok || response.status >= 300) {
        return;
      }
    } catch {
      // Continua tentando até o tempo limite.
    }

    await wait(1_000);
  }

  throw new Error(`O servidor não respondeu em ${url} dentro de ${timeoutMs / 1000}s.`);
};

const startServer = () => {
  const env = {
    ...process.env,
    PORT: String(port),
    NODE_ENV: 'production',
    ALLOW_IN_MEMORY_DATABASE: 'true',
    SEED_DEMO_DATA: 'true',
  };

  if (process.platform === 'win32') {
    return spawn('cmd.exe', ['/c', 'npm.cmd run start:test'], {
      cwd: rootDir,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
  }

  return spawn('npm', ['run', 'start:test'], {
    cwd: rootDir,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
};

const stopServer = async (serverProcess) => {
  if (!serverProcess || serverProcess.killed) {
    return;
  }

  if (process.platform === 'win32') {
    await new Promise((resolve) => {
      const killer = spawn('taskkill', ['/pid', String(serverProcess.pid), '/t', '/f'], { stdio: 'ignore' });
      killer.on('exit', () => resolve());
      killer.on('error', () => resolve());
    });
    return;
  }

  serverProcess.kill('SIGTERM');
  await new Promise((resolve) => {
    serverProcess.once('exit', () => resolve());
    setTimeout(resolve, 5_000);
  });
};

const showOverlay = async (page, { step, total, title, body }) => {
  await page.evaluate(
    ({ step, total, title, body }) => {
      let root = document.getElementById('codex-student-guide-overlay');

      if (!root) {
        root = document.createElement('div');
        root.id = 'codex-student-guide-overlay';
        root.style.position = 'fixed';
        root.style.right = '24px';
        root.style.bottom = '24px';
        root.style.width = 'min(420px, calc(100vw - 32px))';
        root.style.zIndex = '2147483647';
        root.style.pointerEvents = 'none';
        document.body.appendChild(root);
      }

      root.innerHTML = `
        <div style="
          border: 1px solid rgba(230, 185, 77, 0.45);
          background: linear-gradient(180deg, rgba(22, 19, 14, 0.92), rgba(17, 15, 12, 0.94));
          color: #f8f2e8;
          border-radius: 24px;
          padding: 18px 18px 16px;
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.38);
          backdrop-filter: blur(18px);
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        ">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;">
            <span style="
              display:inline-flex;
              align-items:center;
              border-radius:999px;
              border:1px solid rgba(230, 185, 77, 0.32);
              background:rgba(230, 185, 77, 0.10);
              color:#ffd880;
              font-size:11px;
              font-weight:700;
              letter-spacing:0.18em;
              text-transform:uppercase;
              padding:6px 10px;
            ">Guia do aluno</span>
            <span style="font-size:12px;color:rgba(248, 242, 232, 0.72);">${step}/${total}</span>
          </div>
          <div style="font-size:24px;font-weight:700;line-height:1.1;margin-bottom:8px;">${title}</div>
          <div style="font-size:14px;line-height:1.7;color:rgba(248, 242, 232, 0.86);">${body}</div>
        </div>
      `;
    },
    { step, total, title, body },
  );
};

const clearOverlay = async (page) => {
  await page.evaluate(() => {
    document.getElementById('codex-student-guide-overlay')?.remove();
  });
};

const typeSlow = async (locator, value) => {
  await locator.click();
  await locator.fill('');
  if ('pressSequentially' in locator) {
    await locator.pressSequentially(value, { delay: 45 });
    return;
  }
  await locator.type(value, { delay: 45 });
};

const loginAsStudent = async (page) => {
  const response = await page.request.post(`${baseUrl}/api/auth/login`, {
    data: studentCredentials,
  });

  if (!response.ok()) {
    throw new Error('Não foi possível autenticar o aluno de gravação.');
  }

  const payload = await response.json();
  if (!payload?.token) {
    throw new Error('A resposta de login não trouxe token válido.');
  }

  await page.evaluate((token) => {
    window.localStorage.setItem('biblioteca-pimentasvii:session-token', token);
  }, payload.token);
};

const goToStudentPage = async (page, label, routePattern) => {
  await page.getByRole('button', { name: label, exact: true }).click();
  await page.waitForURL(routePattern);
  await page.waitForLoadState('networkidle');
};

const recordGuide = async () => {
  ensureBuildExists();

  await fs.mkdir(tempVideoDir, { recursive: true });
  await fs.mkdir(outputDir, { recursive: true });
  await fs.rm(finalVideoPath, { force: true });

  const serverProcess = startServer();
  serverProcess.stdout.on('data', () => {});
  serverProcess.stderr.on('data', () => {});

  let browser;
  let context;
  let page;

  try {
    await waitForServer(baseUrl);

    browser = await chromium.launch({
      headless: true,
    });

    context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      screen: { width: 1440, height: 900 },
      colorScheme: 'light',
      recordVideo: {
        dir: tempVideoDir,
        size: { width: 1440, height: 900 },
      },
    });

    page = await context.newPage();
    const totalScenes = 11;

    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /Entrar na plataforma/i }).waitFor({ state: 'visible' });

    await showOverlay(page, {
      step: 1,
      total: totalScenes,
      title: 'Boas-vindas à plataforma',
      body: 'Esta é a entrada da Biblioteca Pimentas VII. Aqui o aluno pode conhecer o projeto, entrar no sistema e acessar os recursos de leitura da escola.',
    });
    await wait(3_000);

    await page.getByRole('button', { name: /^Criar conta$/i }).first().click();
    await page.getByRole('heading', { name: /Novo leitor no sistema/i }).waitFor();
    await showOverlay(page, {
      step: 2,
      total: totalScenes,
      title: 'Cadastro com turma em lista',
      body: 'No primeiro acesso, o aluno informa nome, Gmail institucional, escolhe a turma em uma lista pronta e cria a senha sem precisar digitar a sala manualmente.',
    });
    await typeSlow(page.locator('input[type="text"]').first(), 'Seu nome completo');
    await typeSlow(page.locator('input[placeholder="seu.usuario"]'), 'seu.usuario');
    await page.getByRole('combobox').selectOption('8º A');
    await typeSlow(page.locator('input[type="password"]').first(), 'SuaSenhaForte123');
    await wait(3_200);
    await page.getByRole('button', { name: /Fechar janela/i }).click();
    await wait(900);

    await showOverlay(page, {
      step: 3,
      total: totalScenes,
      title: 'Entrada do aluno no sistema',
      body: 'Depois do cadastro, o aluno entra com a conta institucional e acessa diretamente o ambiente dele, com navegação própria para estudar, favoritar e acompanhar leituras.',
    });
    await wait(1_800);
    await loginAsStudent(page);
    await page.goto(`${baseUrl}/aluno`, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: /Olá/i }).waitFor();
    await wait(2_600);

    await showOverlay(page, {
      step: 4,
      total: totalScenes,
      title: 'Painel inicial do aluno',
      body: 'A página inicial reúne avisos da biblioteca, favoritos, histórico recente e atalhos rápidos para o restante do sistema.',
    });
    await wait(3_000);

    await goToStudentPage(page, 'Catálogo', /\/aluno\/catalogo$/);
    await showOverlay(page, {
      step: 5,
      total: totalScenes,
      title: 'Catálogo com filtros',
      body: 'No catálogo, o aluno pode pesquisar por título, autor e tombo, além de filtrar livros por categoria, disponibilidade, faixa escolar e classificação.',
    });
    await typeSlow(page.getByRole('textbox', { name: 'Buscar título' }), 'Viagem');
    await wait(800);
    await page.locator('select').first().selectOption({ index: 1 });
    await wait(1_100);
    await page.getByRole('button', { name: /Limpar filtros/i }).click();
    await wait(900);
    await page.getByRole('button', { name: /Abrir detalhes do livro Viagem ao Centro da Terra/i }).click();
    await page.waitForURL(/\/aluno\/catalogo\/.+/);
    await page.waitForLoadState('networkidle');

    await showOverlay(page, {
      step: 6,
      total: totalScenes,
      title: 'Detalhe do livro, favorito e empréstimo',
      body: 'Nesta tela o aluno vê capa, descrição, autor, faixa escolar, resenhas e disponibilidade. Também pode salvar nos favoritos e solicitar um empréstimo.',
    });
    await wait(1_200);
    const favoriteButton = page.getByRole('button', { name: /Salvar nos favoritos|Favorito salvo/i });
    await favoriteButton.click();
    await wait(1_400);
    await page.getByRole('button', { name: /Solicitar empréstimo/i }).click();
    await page.getByText(/Token gerado com sucesso/i).waitFor();
    await wait(2_800);

    await goToStudentPage(page, 'Empréstimos', /\/aluno\/emprestimos$/);
    await showOverlay(page, {
      step: 7,
      total: totalScenes,
      title: 'Acompanhamento dos empréstimos',
      body: 'Aqui aparecem os pedidos do aluno com status como pendente, aprovado, devolvido ou atrasado, além do token e das datas importantes do processo.',
    });
    await wait(3_000);

    await goToStudentPage(page, 'Favoritos', /\/aluno\/favoritos$/);
    await showOverlay(page, {
      step: 8,
      total: totalScenes,
      title: 'Estante de favoritos e histórico',
      body: 'Os favoritos guardam livros para ler depois. O histórico registra a trajetória do aluno com leituras, empréstimos e resenhas.',
    });
    await wait(2_200);
    await goToStudentPage(page, 'Histórico', /\/aluno\/historico$/);
    await wait(2_200);

    await goToStudentPage(page, 'Recomendações', /\/aluno\/recomendacoes$/);
    await showOverlay(page, {
      step: 9,
      total: totalScenes,
      title: 'Recomendações personalizadas',
      body: 'O questionário ajuda o aluno a descobrir leituras de acordo com interesse, ritmo e objetivo de leitura.',
    });
    await page.getByRole('button', { name: /Aventura/i }).click();
    await wait(500);
    await page.getByRole('button', { name: /Animado/i }).click();
    await wait(500);
    await page.getByRole('button', { name: /Rápido e empolgante/i }).click();
    await wait(500);
    await page.getByRole('button', { name: /Diversão/i }).click();
    await page.getByRole('heading', { name: /Recomendações para você/i }).waitFor();
    await wait(2_800);

    await goToStudentPage(page, 'Documentos', /\/aluno\/documentos$/);
    await showOverlay(page, {
      step: 10,
      total: totalScenes,
      title: 'Central de documentos',
      body: 'Nesta área ficam regulamentos, listas de leitura, orientações e outros materiais disponibilizados pela biblioteca para consulta e download.',
    });
    await wait(3_000);

    await goToStudentPage(page, 'Suporte', /\/aluno\/suporte$/);
    await showOverlay(page, {
      step: 11,
      total: totalScenes,
      title: 'Suporte por e-mail institucional',
      body: 'Se surgir alguma dúvida, o aluno pode escrever o assunto, descrever a necessidade e abrir a mensagem direto no Gmail oficial da biblioteca.',
    });
    await typeSlow(page.getByPlaceholder(/Ex\.: Dúvida sobre empréstimo/i), 'Dúvida sobre empréstimo');
    await typeSlow(
      page.getByPlaceholder(/Descreva aqui a sua dúvida ou necessidade/i),
      'Olá! Gostaria de saber como acompanhar a aprovação do meu pedido de leitura.',
    );
    await wait(3_200);

    await clearOverlay(page);
    await wait(1_000);

    const video = page.video();
    await context.close();
    await browser.close();

    const recordedVideoPath = await video.path();
    await fs.copyFile(recordedVideoPath, finalVideoPath);
    await fs.rm(tempVideoDir, { recursive: true, force: true });

    process.stdout.write(`Vídeo gerado em: ${finalVideoPath}\n`);
  } finally {
    if (context) {
      await context.close().catch(() => {});
    }
    if (browser) {
      await browser.close().catch(() => {});
    }
    await stopServer(serverProcess);
  }
};

recordGuide().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
