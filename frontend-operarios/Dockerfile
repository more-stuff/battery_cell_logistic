# frontend-operarios/Dockerfile

# Etapa 1: Construir con Node
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
# NOTA: Vite por defecto crea una carpeta "dist". Si lo cambiaste, ajusta abajo.

# Etapa 2: Servir con Nginx
FROM nginx:alpine
# Copiamos la carpeta "dist" de Vite al servidor Nginx
COPY --from=build /app/dist /usr/share/nginx/html
# Copiamos nuestra configuración personalizada
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]