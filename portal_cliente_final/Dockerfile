# Etapa 1: Construcción
FROM node:20-slim AS build
WORKDIR /app
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN echo "🔨 CONSTRUYENDO FRONTEND CON API_URL: $VITE_API_URL"
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

# Etapa 2: Servidor de producción ligero
FROM nginx:stable-alpine
# Copiamos los archivos construidos a la carpeta de Nginx
COPY --from=build /app/dist /usr/share/nginx/html
# Exponemos el puerto 80 interno del contenedor
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]