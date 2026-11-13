# Crypto Cards Database — redesign

A static redesign of [crypto-cards.io](https://crypto-cards.io). No build step and no dependencies: open `index.html` or serve the folder.

```
python3 -m http.server 8000
```

## What is here

| Path | Purpose |
| --- | --- |
| `index.html` | Page shell: header, finder, card page, compare, footer |
| `assets/styles.css` | All styles, light and dark themes |
| `assets/app.js` | Filtering, ranking, card pages, compare, hash routing |
| `assets/data.js` | Generated card data (36 cards, 97 plans) |
| `data/cards.csv` | Export of the site's card sheet |
| `data/profiles.json` | Per-card questions and answers from the live site |
| `tools/build_data.py` | Rebuilds `assets/data.js` from the two files in `data/` |
| `images/cards/` | Card art from the live site |

## Updating the data

Replace `data/cards.csv` with a fresh sheet export, then run:

```
python3 tools/build_data.py
```

## Not included

Blog, team and privacy pages link to the live site. User reviews, the newsletter form and analytics are not wired up. Views are routed on the URL hash (`#card-wirex`, `#compare`); a production version should give each card a real URL for search engines.
