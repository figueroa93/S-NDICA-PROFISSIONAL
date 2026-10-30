# Portaria · Prestadores

App da web (Google Apps Script) para a portaria registrar a entrada e a saída de
prestadores de serviço. Os dados vão para a aba **Entradas** da planilha
[ENTRADA DE PRESTADORES](https://docs.google.com/spreadsheets/d/1_QWQO6oltKYhnVEzoSoIPfEPBogOSuQQJEfgRkp8-d8)
e as fotos para a pasta **Fotos - Entrada de Prestadores** no Drive da conta
`domduartecondominio@gmail.com`.

**Link do app:** https://script.google.com/macros/s/AKfycbx2Ipu0L9auCZQ3zF5X1sACAR0UAAeiss_EC7xXtH7qJOPY1KRmGJE7EEXdyUHywfTb/exec
**deploymentId:** `AKfycbx2Ipu0L9auCZQ3zF5X1sACAR0UAAeiss_EC7xXtH7qJOPY1KRmGJE7EEXdyUHywfTb`
**Editor do script:** https://script.google.com/d/1MtoFmuN-3Aqbmj_EZJ_9KVJ9hBth0ajhGYBzLE6u_loFHuVp-zL5_jei/edit
(também em Planilha → Extensões → Apps Script)

| Arquivo | O que é |
|---|---|
| `Code.gs` | Servidor: `doGet`, `verificarPin`, `registrarEntrada`, `registrarSaida`, `listarEntradas`, `obterFoto`, `configurarPlanilha` |
| `Index.html` | Página única (formulário, tabela, CSS e JS) |
| `appsscript.json` | Fuso `America/Sao_Paulo`, V8, app da web executando como quem implantou, acesso "Qualquer pessoa" |

## Atualizar o app SEM mudar o link

O link `/exec` pertence à **implantação**. Para manter o mesmo link, publique uma
nova *versão* na implantação existente — nunca crie uma "Nova implantação".

**Pelo editor (script.google.com):**
1. Edite e salve o código.
2. **Implantar → Gerenciar implantações**.
3. Clique no lápis (✏️ Editar) da implantação "App da Web".
4. Em **Versão**, escolha **Nova versão** → **Implantar**.

**Pelo terminal (clasp):**
```bash
clasp push
clasp deploy -i AKfycbx2Ipu0L9auCZQ3zF5X1sACAR0UAAeiss_EC7xXtH7qJOPY1KRmGJE7EEXdyUHywfTb -d "descrição da mudança"
```

## Ativar o PIN

1. No `Code.gs`, troque a primeira linha útil: `var PIN = '';` → `var PIN = '4821';` (use o PIN desejado).
2. Publique uma nova versão como explicado acima.
3. Cada aparelho pedirá o PIN uma única vez (fica salvo no navegador). O botão
   **Trocar PIN** no topo apaga o PIN salvo no aparelho.

Para desativar, volte para `var PIN = '';` e publique nova versão.

## Observações

- "Abrir foto" abre o arquivo no Drive e só funciona para quem tem acesso à pasta
  (a conta do condomínio). No app, a foto grande e as miniaturas aparecem para
  qualquer porteiro, pois são lidas pelo servidor.
- As miniaturas ficam na aba oculta `_miniaturas` (não apague).
- A tabela mostra as 500 entradas mais recentes; o filtro de data busca na planilha inteira.
- Para dar "Saída" manualmente na planilha, preencha a coluna **Saída** e troque **Status** para `Saiu`.
