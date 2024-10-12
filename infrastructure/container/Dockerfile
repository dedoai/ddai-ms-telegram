# Define custom function directory
ARG APP_DIR="/app"

# First stage: Build stage
FROM public.ecr.aws/eks-distro-build-tooling/nodejs:16.18.1-gcc-al23 as build-image

# Install dependencies required for compiling libvips
RUN yum update -y && \
    yum groupinstall -y "Development Tools" && \
    yum install -y glib2 glib2-devel libjpeg-turbo libjpeg-turbo-devel libpng libpng-devel \
    libtiff libtiff-devel libwebp libwebp-devel git

# Install libvips from source
RUN git clone https://github.com/libvips/libvips.git && \
    cd libvips && \
    git checkout v8.10.6 && \
    ./autogen.sh && \
    make && \
    make install && \
    ldconfig

# Copy function code
COPY . .

WORKDIR $APP_DIR

# Install Node.js dependencies, including Sharp
RUN npm install

# Second stage: Production stage (Alpine or your final image)
FROM node:16

# Install libvips runtime libraries
COPY --from=build-image /usr/local/lib /usr/local/lib
COPY --from=build-image /usr/local/include /usr/local/include

# Copy application code and dependencies
COPY --from=build-image /app /app

WORKDIR /app

# Expose the port the app runs on
EXPOSE 80

# Start the application
CMD ["node", "index.js"]
