# Dev Dockerfile pro Next.js 16 — hot-reload vývoj přes docker compose.
# Pro produkci na Vercelu se nepoužívá (Vercel buildí sám).
FROM node:22-alpine

WORKDIR /app

# tzdata, aby named časová zóna (TZ=Europe/Prague) fungovala i na alpine
RUN apk add --no-cache tzdata
ENV TZ=Europe/Prague

# Nejdřív jen manifesty kvůli cache vrstvě závislostí
COPY package.json package-lock.json ./
RUN npm ci

# Zbytek zdrojáků (při vývoji stejně přepíše bind-mount z compose)
COPY . .

EXPOSE 3000

# next dev musí naslouchat na 0.0.0.0, jinak není dostupné mimo kontejner
CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0"]
