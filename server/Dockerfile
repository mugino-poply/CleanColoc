FROM node:18-alpine
WORKDIR /usr/src/app
COPY package*.json ./
# On installe TOUT (y compris devDeps) pour pouvoir compiler TypeScript
RUN npm install
COPY . .
# On compile le TypeScript en JavaScript
RUN npm run build
# On supprime les devDependencies après le build
RUN npm prune --omit=dev
ENV PORT=3001
EXPOSE 3001
CMD ["npm", "start"]