# Natália Figueroa — Síndica Profissional

Site institucional one-page (HTML, CSS e JavaScript puros, sem bibliotecas). Basta publicar os arquivos em qualquer hospedagem estática (Netlify, Vercel, GitHub Pages, Hostinger etc.).

Para visualizar localmente: `python3 -m http.server` e abra `http://localhost:8000`.

## Estrutura

```
index.html                 página completa (todas as seções)
assets/css/styles.css      estilos (mobile first)
assets/js/main.js          contatos, menu, animações, contadores e carrossel
assets/img/                imagens, favicon e imagem de compartilhamento
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
Substitua `https://www.nataliafigueroa.com.br/` pelo domínio definitivo em `index.html` (canonical, Open Graph, JSON-LD), `robots.txt` e `sitemap.xml`.

### 3. Fotografias
As imagens atuais são ilustrações provisórias. Substitua por fotografias reais, de preferência em **WebP**:

| Arquivo atual | Onde aparece | Sugestão |
|---|---|---|
| `assets/img/hero-condominio.svg` | Fundo do topo e do CTA final (`styles.css`: `.hero__media`, `.cta__media`) | Condomínio residencial moderno no RJ, 2400×1500 px |
| `assets/img/natalia-figueroa.svg` | Seção "Sobre mim" (`index.html`) | Foto profissional da Natália, proporção 4:5 (ex.: 1200×1500) |
| `assets/img/textura-arquitetura.svg` | Fundo de "Meu jeito de administrar" (`.manifesto__media`) | Detalhe arquitetônico/área comum; o overlay escuro já é aplicado |
| `assets/img/og-image.jpg` | Pré-visualização ao compartilhar o link | 1200×630 px |

Ao trocar a foto da Natália, atualize também o `src` e mantenha o texto `alt`.

### 4. Números (Experiência)
Na seção `#experiencia`, altere o atributo `data-count` (e o número dentro do `<span>`). Use apenas dados verdadeiros e comprováveis.

### 5. Casos reais (Experiência na prática)
Na seção `#na-pratica`, cada caso é um `<article class="case">`. Duplique para adicionar novos e troque os espaços de foto por `<img>` (instruções no comentário do HTML). Insira somente resultados reais.

### 6. Depoimentos
Na seção `#depoimentos`, substitua os textos entre colchetes por depoimentos reais (com autorização) e remova a classe `placeholder`. Para adicionar mais, duplique um `<li class="slide">` e ajuste o `aria-label` ("1 de 3" etc.).

## Acessibilidade e desempenho
- Estrutura semântica (um H1, H2 por seção, H3 nos itens), `alt` e `aria-label` em imagens e ícones.
- Navegação por teclado, link "Pular para o conteúdo", foco visível, menu fecha com `Esc`.
- Respeita `prefers-reduced-motion` (animações desativadas).
- Sem dependências externas além das fontes Google (Manrope e Inter); imagens fora da primeira tela com `loading="lazy"`.
