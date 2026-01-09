FROM nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy initial nginx config (will be overridden by volume mount)
COPY nginx-init.conf /etc/nginx/conf.d/default.conf

# Create directories for certbot
RUN mkdir -p /var/www/certbot

# Expose ports
EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
