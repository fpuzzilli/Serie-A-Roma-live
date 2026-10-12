# Serie A Roma Live

Dashboard personale della Serie A: classifica live, giornata in corso e prossime giornate, con la Roma in evidenza.

**Sito:** https://fpuzzilli.github.io/Serie-A-Roma-live/

## Come funziona

- **Calendario, risultati e classifica ufficiale** da [football-data.org](https://www.football-data.org), letti tramite un Worker Cloudflare che custodisce il token.
- **Punteggi in diretta** da ESPN (fonte non ufficiale, disattivabile nelle impostazioni).
- Durante le partite la classifica viene ricalcolata nel browser con i criteri della Serie A (punti, scontri diretti, differenza reti, gol fatti).

## File

| File | Contenuto |
|---|---|
| `index.html` | l'intera pagina (HTML, CSS e JavaScript, nessuna dipendenza) |
| `favicon.svg`, `apple-touch-icon.png` | icone |
| `worker/` | il Worker Cloudflare (`football-data-proxy.js`, `wrangler.jsonc`) |

## Worker

Si pubblica da solo a ogni push su `main` (Cloudflare Workers Builds, percorso `/worker`).
Il token di football-data.org è il secret `FD_TOKEN` su Cloudflare e non va mai nel repository.
