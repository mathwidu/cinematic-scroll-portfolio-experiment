<!-- graphify-standard:start -->
## Graphify neste projeto

Para arquitetura, navegação entre módulos, dependências e impacto de mudanças,
use `$graphify` e consulte o grafo pelo comando abaixo, que verifica os fontes
e atualiza o índice antes de responder:

```bash
"$HOME/.local/bin/graphify-project" query "pergunta ou símbolos" --root .
```

O estado e a cobertura estão em `graphify-project status --root .`.
Confirme relações importantes nos arquivos e linhas indicados; ausência de
aresta não comprova ausência de dependência. Documentos com semântica pendente
devem ser lidos diretamente ou enriquecidos pela skill no escopo da tarefa.
Se a atualização falhar, use os fontes atuais e informe a limitação.
Ao terminar alterações relevantes, execute `graphify-project ensure --root .`.
Configuração: `.graphify/config.json` e `.graphifyignore`. Os artefatos em
`graphify-out/` são locais, regeneráveis e separados por checkout/worktree.
Se este Mac ainda não tiver a ferramenta, seguir o bootstrap documentado no
projeto Mac-M5; não instalar uma versão aleatória ou depender de um grafo antigo.
<!-- graphify-standard:end -->
