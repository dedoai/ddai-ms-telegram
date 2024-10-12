# Define custom function directory
ARG APP_DIR="/app"

# First stage: Build stage
FROM public.ecr.aws/eks-distro-build-tooling/nodejs:16.18.1-gcc-al23 as build-image

# Install dependencies required for libvips
RUN yum update -y && \
    yum install -y epel-release && \
    yum install -y vips vips-devel

# Copy function code
COPY . .

WORKDIR $APP_DIR

# Install Node.js dependencies, including Sharp (which depends on libvips)
RUN npm install

# Second stage: Production stage
FROM node:16

# Copy application code and dependencies
COPY --from=build-image /app /app

WORKDIR /app

# Expose the port the app runs on
EXPOSE 80

# Start the application
CMD ["node", "index.js"]
