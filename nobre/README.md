# Nobre Gestão de Condomínios — site

Site em HTML, CSS e JavaScript puros (sem bibliotecas). Publique o conteúdo desta pasta em qualquer hospedagem estática (Netlify, Vercel, Hostinger, GitHub Pages…).

Para ver no computador: dentro desta pasta rode `python3 -m http.server` e abra `http://localhost:8000`.

## Páginas
| Arquivo | Conteúdo |
|---|---|
| `index.html` | Início: hero, busca de imóveis, serviços, **Área do condômino**, destaques, anunciar, sobre, conteúdos, contato |
| `imoveis.html` | Lista de imóveis com filtros (comprar/alugar, bairro, tipo, quartos, preço) e ordenação |
| `imovel.html?id=...` | Detalhe do imóvel com galeria, valores e botão de WhatsApp |
| `privacidade.html` | Política de Privacidade, Termos de Uso e LGPD (revisar com o jurídico) |

## O que editar — tudo em `assets/js/config.js`

### 1. Contatos
`whatsapp`, `telefone`, `email`, `cidade`. Todos os botões e o rodapé são atualizados sozinhos.

### 2. Área do condômino (Superlógica)
Troque `SUALICENCA` pelo nome da licença da administradora na Superlógica:

```js
areaCondomino: 'https://SUALICENCA.superlogica.net/clients/areadocondomino',
```

O botão **Área do condômino** (topo, hero, seção própria e rodapé) abre essa página em nova aba, onde o condômino faz login e acessa boletos, balancetes, documentos e reservas. Para confirmar o endereço exato, entre na Superlógica e copie o link da página de login da área do condômino.

### 3. Imóveis
A lista `IMOVEIS` traz **exemplos** — substitua pelos imóveis reais. Cada imóvel tem finalidade (`venda`/`aluguel`), tipo, bairro, preço, quartos, área, vagas, fotos etc. Os marcados com `destaque: true` aparecem na página inicial (até 4). Bairros e tipos dos filtros são montados automaticamente a partir da lista.

### 4. Fotos
As fotos atuais são do Unsplash (uso gratuito) apenas como modelo. Para usar fotos próprias, coloque os arquivos em `assets/img/` e troque os endereços (`src` no HTML e `fotos` em `config.js`). Se uma foto não carregar, aparece um fundo azul no lugar.

## Formulário de contato
O formulário monta a mensagem e abre o WhatsApp da administradora com tudo preenchido — funciona em qualquer hospedagem, sem servidor. Links como `index.html?assunto=anunciar#contato` já deixam o assunto selecionado.

## Cabeçalho e rodapé
São iguais em todas as páginas. Ao alterar o menu ou o rodapé em `index.html`, replique a mudança em `imoveis.html`, `imovel.html` e `privacidade.html`.
