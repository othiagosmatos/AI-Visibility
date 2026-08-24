# Lumina — AI Visibility

Lumina é um MVP funcional para analisar como um site está preparado para ser encontrado, compreendido e citado por mecanismos de IA. A aplicação rastreia até 50 páginas internas, aplica regras determinísticas, calcula um score de 0 a 100 e apresenta evidências e recomendações.

> “Crawler permitido” significa que não foi encontrado um bloqueio aplicável. Não comprova que o crawler visitou, indexou ou citou o site.

## Stack

- Vinext/Next.js App Router, React 19 e TypeScript strict
- Tailwind CSS 4 e CSS responsivo
- Netlify Functions e Netlify Blobs
- Zod para validação da API
- Fetch nativo e parser HTML/JSON-LD modular
- Drizzle para declarar e migrar o schema SQLite

## Como instalar e executar

```bash
pnpm install
pnpm --package=netlify-cli dlx netlify dev
```

Acesse `http://localhost:3000`, informe um domínio público e escolha **Analisar site**.

Validações:

```bash
pnpm run test:unit
pnpm run build
pnpm test
```

Para publicar no Netlify pela primeira vez:

```bash
pnpm --package=netlify-cli dlx netlify login
pnpm --package=netlify-cli dlx netlify deploy --build --prod
```

## Variáveis de ambiente

O MVP não depende de chaves externas. O arquivo `.env.example` documenta essa decisão. A persistência usa Netlify Blobs, provisionado automaticamente para o projeto publicado.

## Como funciona o crawler

1. Normaliza a URL e aceita somente HTTP/HTTPS.
2. Bloqueia localhost, IPs privados, redes internas, credenciais na URL e protocolos inseguros.
3. Valida cada redirecionamento para reduzir risco de SSRF.
4. Usa timeout de 10 segundos, no máximo quatro redirecionamentos e respostas de até 2 MB.
5. Lê `robots.txt`, detecta sitemap e avalia user-agents configuráveis.
6. Percorre somente links HTML internos, remove fragments e parâmetros de tracking, evita duplicatas e loops.
7. Processa no máximo cinco requisições simultâneas e 50 páginas.
8. Ignora imagens, vídeos, fontes, scripts, CSS, PDFs e outros arquivos grandes.

## Como funciona o score

Cada ponto é consequência de uma regra mensurável. O score geral é a soma de todos os checks:

| Categoria | Peso |
|---|---:|
| AI Crawlability | 15 |
| Conteúdo | 20 |
| Estrutura Semântica | 10 |
| Structured Data | 15 |
| Entidades | 15 |
| Autoridade | 10 |
| Citation Readiness | 10 |
| SEO Técnico | 5 |

Os checks usam presença, proporção ou cobertura observada: por exemplo, páginas com canonical, tipos JSON-LD, status HTTP válidos, headings coerentes ou perguntas respondidas. Não há números aleatórios.

## Arquitetura

```text
app/
  api/scan/route.ts             valida, executa e persiste scans
  report/[id]/                  relatório e detalhe de página
components/                     interface reutilizável
features/
  ai/                           abstração AIProvider
  ai-crawlers/                  parser e regras de robots.txt
  audits/                       checks e score
  crawler/                      fetch seguro, parser e fila
  entities/                     reconhecimento básico de entidade
  geo/                          Citation Readiness e perguntas
  reports/                      persistência e histórico
  scanner/                      normalização e proteção SSRF
netlify/functions/              adaptador server-side para o Netlify
types/                          contratos de domínio
tests/                          parser, SSRF, schema, crawler e scoring
```

O motor técnico continua independente de qualquer LLM. `AIProvider` permite adicionar uma camada semântica futura sem acoplar robots.txt, schema, status HTTP ou scoring a uma API específica.

## Persistência

Cada relatório é armazenado como um objeto JSON no Netlify Blobs. Um índice fortemente consistente mantém as 30 análises mais recentes, e os detalhes de cada página permanecem dentro do snapshot do relatório.

## Segurança

- allowlist de protocolos HTTP/HTTPS;
- bloqueio de hosts locais, IPs privados e credenciais;
- revalidação de redirects;
- timeout, limite de bytes, páginas e redirects;
- concorrência limitada;
- rate limit básico por origem da requisição;
- mensagens de erro sem stack trace;
- relatórios marcados como `noindex`.

Em produção crítica, recomenda-se complementar a validação de hostname com resolução DNS autoritativa antes de cada fetch e rate limiting distribuído.

## Funcionalidades do MVP

- landing premium e responsiva;
- scan real sem congelar a interface;
- robots.txt e acesso de OAI-SearchBot, GPTBot, ClaudeBot, PerplexityBot, Googlebot e bingbot;
- sitemap, SEO técnico, HTML semântico, JSON-LD, entidades e autoridade on-site;
- AI Visibility Score, Citation Readiness e Question Coverage;
- dashboard, páginas detalhadas, Quick Wins e recomendações com exemplos;
- relatório imprimível;
- persistência de scans e dados por página;
- estados de erro e progresso.

## Roadmap

- **Fase 2:** autenticação, projetos, comparação histórica visual, OpenAIProvider, exportação PDF.
- **Fase 3:** integrações de logs/CDN para detectar visitas reais de crawlers.
- **Fase 4:** monitoramento de menções por prompts, quando tecnicamente e contratualmente permitido.

## Limitações conhecidas

- O MVP usa parsing HTML determinístico e não executa JavaScript; sites totalmente client-rendered podem retornar dados insuficientes.
- Autoridade é analisada somente por sinais presentes no site, sem métricas externas.
- O histórico é persistido, mas a comparação entre scans ainda não é exibida.
- “Pode ser rastreado” nunca é apresentado como “foi rastreado”.
