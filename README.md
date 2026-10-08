# Natália Figueroa — Síndica Profissional

Site institucional one-page (HTML, CSS e JavaScript puros, sem bibliotecas). Basta publicar os arquivos em qualquer hospedagem estática (Netlify, Vercel, GitHub Pages, Hostinger etc.).

Para visualizar localmente: `python3 -m http.server` e abra `http://localhost:8000`.

## Estrutura

```
index.html                 página completa (todas as seções)
assets/css/styles.css      estilos (mobile first)
assets/js/main.js          contatos, menu, animações, contadores e carrossel
assets/img/                imagens, favicon e imagem de compartilhamento
obrigado.html             página exibida após o envio do formulário
robots.txt, sitemap.xml, site.webmanifest
```

## O que editar antes de publicar

### 1. Contatos (WhatsApp, e-mail, Instagram)
Edite **apenas** o objeto `SITE` no topo de `assets/js/main.js`:

```js
const SITE = {
  whatsapp: '5521999999999',          // DDI + DDD + número, só dígitos
  email: 'contato@seudominio.com.br',
  instagram: 'usuario',               // sem @
  mensagemWhatsapp: 'Olá, Natália! ...',
};
```

Todos os botões de WhatsApp (topo, hero, CTA, rodapé e botão flutuante), o botão "Entrar em contato" e os dados do rodapé são atualizados automaticamente.

### 2. Domínio
O domínio oficial é `https://gestaofacilfigueroa.com.br/`. Se mudar, atualize em `index.html` (canonical, Open Graph, JSON-LD), `robots.txt` e `sitemap.xml`.

### 3. Fotografias
As imagens atuais são ilustrações provisórias. Substitua por fotografias reais, de preferência em **WebP**:

| Arquivo atual | Onde aparece | Sugestão |
|---|---|---|
| `assets/img/hero-condominio.svg` | Fundo do topo e do CTA final (`styles.css`: `.hero__media`, `.cta__media`) | Condomínio residencial moderno no RJ, 2400×1500 px |
| `assets/img/natalia-figueroa.webp` e `.jpg` | Seção "Sobre mim" (`index.html`) | Já é a foto real da Natália (960×1200, 4:5). Para trocar, substitua os dois arquivos mantendo os nomes |
| `assets/img/textura-arquitetura.svg` | Fundo de "Meu jeito de administrar" (`.manifesto__media`) | Detalhe arquitetônico/área comum; o overlay escuro já é aplicado |
| `assets/img/og-image.jpg` | Pré-visualização ao compartilhar o link | 1200×630 px |

Ao trocar a foto da Natália, atualize também o `src` e mantenha o texto `alt`.

### 4. Experiência
A seção `#experiencia` apresenta a experiência de forma qualitativa (texto, indicadores de competência e pilares), **sem contadores de quantidade de condomínios**. A menção à estrutura profissional em que a trajetória também foi construída é propositalmente secundária e sem números.

### 5. Casos reais (Experiência na prática)
A seção `#na-pratica` mostra o método (Antes → Ação → Resultado). Há um modelo comentado no HTML para publicar casos reais com fotos. Insira somente resultados reais.

### 6. Depoimentos
A seção `#depoimentos` está visível com textos provisórios entre colchetes. Para ocultá-la, acrescente `hidden` na tag `<section>`. Na seção, substitua os textos entre colchetes por depoimentos reais (com autorização) e remova a classe `placeholder`. Para adicionar mais, duplique um `<li class="slide">` e ajuste o `aria-label` ("1 de 3" etc.).

### 7. Formulário "Solicite uma proposta"
O formulário da seção `#contato` usa o **Netlify Forms** (gratuito até 100 envios/mês). Após o envio, o visitante vê a página `obrigado.html`.
No painel do Netlify: **Forms → Enable form detection** (uma única vez) e, em **Forms → Form notifications**, adicione um aviso por e-mail para receber cada mensagem.

### 8. Perguntas frequentes
As perguntas ficam na seção `#duvidas` do `index.html` e também no bloco `FAQPage` (dados para o Google) no `<head>`. Ao alterar uma pergunta, atualize os dois lugares.

## Acessibilidade e desempenho
- Estrutura semântica (um H1, H2 por seção, H3 nos itens), `alt` e `aria-label` em imagens e ícones.
- Navegação por teclado, link "Pular para o conteúdo", foco visível, menu fecha com `Esc`.
- Respeita `prefers-reduced-motion` (animações desativadas).
- Sem dependências externas além das fontes Google (Manrope e Inter); imagens fora da primeira tela com `loading="lazy"`.
