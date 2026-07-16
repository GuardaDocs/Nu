# Saimuel Nuvio Repo — recuperação legível

Este pacote reorganiza o repositório no formato esperado por repositórios de providers do Nuvio.

## O que foi corrigido

- `manifest.json` agora é um **array de providers**, sem o wrapper `scrapers` e sem campos de addon Stremio.
- Os caminhos apontam para `providers/*.js`.
- FSHD foi reconstruído em código legível a partir da antiga pasta `src/fshd` encontrada em forks públicos.
- MegaEmbed foi reconstruído a partir da antiga fonte `src/fembed`, mantendo a identificação atual `megaembed`.
- O código usa Promises em vez de `async/await`, por compatibilidade com o Hermes do Nuvio.
- Nenhum provider recuperado usa `javascript-obfuscator`.

## Limitação importante

A fonte original de **Peachify** e **RedeFlix** não aparece no histórico público do repositório. O GitHub conserva apenas os bundles já ofuscados, em uma única linha. Por isso, eles foram mantidos como placeholders seguros e estão com `enabled: false` no manifest. Isso evita que o Nuvio tente carregar providers incompletos.

## Preparar para publicar

```bash
npm install
npm run build
npm run check
```

Depois, envie a pasta inteira ao GitHub e use o endereço RAW do `manifest.json` no Nuvio.

## Observação sobre funcionamento

Os domínios, cookies e endpoints pertencem a serviços externos e podem mudar. A recuperação deixa o código legível, mas não garante que cada serviço externo ainda responda hoje.
