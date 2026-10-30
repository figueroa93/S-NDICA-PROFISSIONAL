# Reserva do Salão de Festas — Condomínio Dom Duarte

Manual do síndico. Não é preciso saber programação.

## Endereços importantes

| O quê | Onde |
|---|---|
| **Link para os moradores** | https://script.google.com/macros/s/AKfycbxa4KGiitIVf-iGLpx0Ix2qKeIcLLsn45UVx-A_lbZ0onYjwlq12_zuhbNb58pPwspe/exec |
| QR Code para o mural | arquivo `qrcode-do-link.png` (nesta pasta) |
| Editor do sistema | https://script.google.com/d/1zEDdzEEyPrOuDgyVVT90GzowqGRnM90zxyBjoNRnsAN8vgobrnv_UKfz/edit |
| Agenda das reservas | https://calendar.google.com (conta domduartecondominio@gmail.com) |
| PDF do regulamento (anexado aos e-mails) | Google Drive da conta, arquivo "Regulamento do Salão de Festas - Dom Duarte" |

Tudo funciona na conta **domduartecondominio@gmail.com**. Entre sempre com ela.

---

## Como funciona uma reserva

1. O morador abre o link, escolhe a data, preenche os dados, marca "Li e concordo com o regulamento" e clica em **Solicitar reserva**.
2. Aparece na Agenda Google um evento **amarelo** chamado "PRÉ-RESERVA — Salão — …".
3. O morador recebe por e-mail o protocolo, o PIX (copia e cola) e os lembretes das regras. O PDF do regulamento vai anexado.
4. A administração (domduartecondominio@gmail.com) recebe um e-mail **[PRÉ-RESERVA]** com dois botões: **Confirmar pagamento** e **Cancelar**.

---

## Como confirmar um pagamento

1. Confira se o comprovante do PIX chegou (por e-mail ou pelo telefone (21) 2454-7602).
2. Abra o e-mail **[PRÉ-RESERVA]** daquela reserva. Para achar mais rápido, procure o protocolo (ex.: `DD20261114-AB12`) na busca do Gmail.
3. Clique no botão verde **Confirmar pagamento**.
4. Vai abrir uma página com os dados da reserva. Clique em **Sim, confirmar pagamento**.
5. Pronto: o evento fica **verde** na agenda e o morador recebe o e-mail **"Reserva confirmada"**.

**Para cancelar** uma reserva, faça o mesmo, mas clique no botão vermelho **Cancelar** e depois em **Sim, cancelar reserva**. A data fica livre de novo e o morador é avisado por e-mail.

> Os botões pedem esse segundo clique de propósito, para que nada seja confirmado ou cancelado por engano.
> Não encaminhe o e-mail [PRÉ-RESERVA] para moradores: quem tiver os botões consegue confirmar ou cancelar a reserva.

---

## Como bloquear uma data

Basta **criar qualquer evento** na Agenda Google da conta domduartecondominio@gmail.com naquele dia. Por exemplo: "Manutenção do salão", "Dedetização", "Assembleia".

- Pode ser um evento de dia inteiro ou só de algumas horas: **qualquer evento bloqueia o dia inteiro**.
- A data aparece como **Ocupada** (em vermelho) na página assim que o morador recarrega.
- Para liberar a data, apague o evento.

---

## Como mudar a chave PIX, o telefone ou o e-mail

1. Abra o editor: https://script.google.com/d/1zEDdzEEyPrOuDgyVVT90GzowqGRnM90zxyBjoNRnsAN8vgobrnv_UKfz/edit
2. Na lista da esquerda, clique em **Codigo.gs**.
3. Logo no começo há um bloco chamado `CONFIG`. Altere **só o texto entre aspas simples**. Exemplos:
   - Chave PIX: `PIX_CHAVE: '68681279000150',` (só números, sem pontos)
   - Nome do favorecido: `PIX_FAVORECIDO: 'Cond Dom Duarte',` (até 25 letras, sem acento)
   - Banco: `PIX_BANCO: 'C6 Bank',`
   - Telefone: `TELEFONE_ADMIN: '(21) 2454-7602',`
4. Clique no ícone de **disquete (Salvar)**.
5. Publique a nova versão, como explicado abaixo. **Sem isso, os moradores continuam vendo a versão antiga.**

> Cuidado para não apagar as aspas `'` nem a vírgula do final da linha.

---

## Como publicar uma nova versão (sem mudar o link)

O link dos moradores **não muda** se você sempre atualizar a mesma implantação.

### Jeito 1 — pelo editor do Google (mais fácil)
1. No editor, clique no botão azul **Implantar** (canto superior direito) → **Gerenciar implantações**.
2. Selecione a implantação **"v1"** e clique no **lápis (Editar)**.
3. Em **Versão**, escolha **Nova versão**. Se quiser, escreva uma descrição (ex.: "troca do telefone").
4. Clique em **Implantar**.

> Não use "Nova implantação": isso cria um link **diferente**.

### Jeito 2 — pelo computador, com o clasp (para quem ajuda com a parte técnica)
Dentro da pasta `salao-dom-duarte`:

```
clasp push
clasp deploy -i AKfycbxa4KGiitIVf-iGLpx0Ix2qKeIcLLsn45UVx-A_lbZ0onYjwlq12_zuhbNb58pPwspe --description "descrição da mudança"
```

O `-i` com esse código (o *deploymentId*) reaproveita a mesma implantação, por isso o link continua igual.

> Atenção: o `clasp push` **substitui** o que está no editor do Google pelos arquivos desta pasta. Se alguém mudou algo direto no editor, rode antes `clasp pull` para trazer essas mudanças.

---

## Mudanças no regulamento

- **Texto que aparece na página:** arquivo `Regulamento.html`.
- **PDF anexado aos e-mails:** suba o PDF novo no Google Drive da conta, abra o arquivo e copie o código que aparece no endereço, entre `/d/` e `/view`. Depois cole esse código em `REGULAMENTO_PDF_ID` no `CONFIG`.

Depois de qualquer mudança, publique uma nova versão.

---

## Verificar se está tudo funcionando

No editor, escolha a função **testarConfiguracao** na lista do topo e clique em **Executar**. Em **Registro de execução** aparece uma lista com **OK** ou **AVISO** para cada item: agenda, Banco Central, valor, cota de e-mails, PDF e PIX.

## Regras automáticas do sistema

- Valor: 10% do salário mínimo vigente, consultado no Banco Central (série 1619). Se a consulta falhar, ou se o Banco Central ainda não tiver publicado o reajuste, o sistema usa R$ 1.621,00, o que dá R$ 162,10.
- Antecedência: mínimo de 5 dias e máximo de 180 dias.
- Uma reserva por dia. Qualquer evento na agenda bloqueia o dia.
- Horários: uso a partir das 08h. De domingo a quinta, som reduzido às 21h e encerramento às 22h. Sexta e sábado, som reduzido às 22h e encerramento à 00h. Os horários incluem montagem e desmontagem.
- O Gmail gratuito permite cerca de **100 e-mails por dia**, e cada reserva usa 2. Isso é bem mais do que o salão precisa.

## Arquivos desta pasta

| Arquivo | Para que serve |
|---|---|
| `Codigo.gs` | O "motor" do sistema (configurações no topo) |
| `Index.html` | A página de reserva |
| `Admin.html` | A página que abre pelos botões Confirmar/Cancelar |
| `Regulamento.html` | Texto integral do regulamento exibido na página |
| `appsscript.json` | Configuração do Google (fuso, permissões, quem pode acessar) |
| `regulamento-oficial-salao.pdf` | Cópia do regulamento oficial |
| `qrcode-do-link.png` | QR Code para imprimir no mural |
| `testes/` | Testes automáticos (não vão para o Google) |
