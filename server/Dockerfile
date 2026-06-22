FROM node:22-slim
RUN apt-get update && apt-get install -y curl tar && rm -rf /var/lib/apt/lists/*
RUN curl -fsSL https://github.com/higgsfield-ai/cli/releases/download/v0.2.3/hf_0.2.3_linux_amd64.tar.gz \
    | tar -xz -C /usr/local/bin hf \
    && chmod +x /usr/local/bin/hf
WORKDIR /app
COPY package.json .
RUN npm install
COPY index.js .
ENV PORT=3001
EXPOSE 3001
CMD ["node", "index.js"]
