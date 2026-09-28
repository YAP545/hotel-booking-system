# --- Frontend Dockerfile ---
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

ARG VITE_API_URL
ARG VITE_RAZORPAY_KEY_ID
ARG VITE_HOTEL_UPI_VPA

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_RAZORPAY_KEY_ID=$VITE_RAZORPAY_KEY_ID
ENV VITE_HOTEL_UPI_VPA=$VITE_HOTEL_UPI_VPA

COPY . .
RUN npm run build

FROM nginx:alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
